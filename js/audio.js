'use strict';
// =====================================================================
//  Sonido: efectos y música sintetizados con WebAudio (sin archivos).
// =====================================================================
const Sfx = (() => {
  let ac = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  let musicTimer = null, nextNoteTime = 0, step = 0, track = 'game';
  const last = {};

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.8; master.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = Save.data.sound ? 0.7 : 0; sfxBus.connect(master);
    musicBus = ac.createGain(); musicBus.gain.value = Save.data.music ? 0.22 : 0; musicBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    startMusic();
  }
  function setSound(on) { Save.data.sound = on; Save.save(); if (sfxBus) sfxBus.gain.value = on ? 0.7 : 0; }
  function setMusic(on) { Save.data.music = on; Save.save(); if (musicBus) musicBus.gain.value = on ? 0.22 : 0; }

  function tone(f, dur, { type = 'sine', vol = 0.3, slide = 0, delay = 0, bus = sfxBus, attack = 0.005 } = {}) {
    if (!ac) return;
    const t0 = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(bus); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(dur, { vol = 0.3, freq = 1000, q = 1, type = 'lowpass', delay = 0, slide = 0, bus = sfxBus } = {}) {
    if (!ac) return;
    const t0 = ac.currentTime + delay;
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (slide) f.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.05);
  }

  function play(name) {
    if (!ac || !Save.data.sound) return;
    const now = ac.currentTime;
    // limitar repeticiones del mismo sonido
    const minGap = { shoot: 0.04, splat: 0.03, chomp: 0.08, groan: 1.5, clank: 0.05 }[name] || 0;
    if (minGap && last[name] && now - last[name] < minGap) return;
    last[name] = now;
    switch (name) {
      case 'click': tone(660, 0.08, { type: 'triangle', vol: 0.25 }); break;
      case 'select': tone(520, 0.07, { type: 'triangle', vol: 0.25 }); tone(780, 0.08, { type: 'triangle', vol: 0.2, delay: 0.05 }); break;
      case 'buzz': tone(140, 0.25, { type: 'square', vol: 0.12 }); break;
      case 'plant': noise(0.18, { vol: 0.5, freq: 600, slide: 120 }); tone(180, 0.15, { vol: 0.3, slide: 80 }); break;
      case 'shoot': tone(420, 0.09, { type: 'sine', vol: 0.25, slide: 220 }); noise(0.05, { vol: 0.15, freq: 2000 }); break;
      case 'splat': noise(0.1, { vol: 0.3, freq: 900, slide: 300 }); tone(160, 0.07, { vol: 0.12, slide: 90 }); break;
      case 'clank': tone(1400, 0.12, { type: 'square', vol: 0.08, slide: 1100 }); tone(2100, 0.1, { type: 'triangle', vol: 0.1 }); noise(0.06, { vol: 0.15, freq: 4000, type: 'highpass' }); break;
      case 'plastic': tone(700, 0.08, { type: 'triangle', vol: 0.12, slide: 400 }); noise(0.05, { vol: 0.15, freq: 1500 }); break;
      case 'freeze': tone(1800, 0.15, { type: 'sine', vol: 0.08, slide: 2600 }); break;
      case 'sun': tone(880, 0.12, { type: 'sine', vol: 0.22 }); tone(1320, 0.18, { type: 'sine', vol: 0.18, delay: 0.06 }); break;
      case 'chomp': noise(0.08, { vol: 0.35, freq: 500, q: 3, type: 'bandpass' }); tone(90, 0.06, { type: 'square', vol: 0.08 }); break;
      case 'gulp': tone(300, 0.25, { vol: 0.3, slide: 70 }); noise(0.2, { vol: 0.2, freq: 400 }); break;
      case 'groan': {
        const f = 90 + Math.random() * 50;
        tone(f, 1.1, { type: 'sawtooth', vol: 0.05, slide: f * 0.7, attack: 0.25 });
        noise(1.0, { vol: 0.04, freq: 500, q: 4, type: 'bandpass', slide: 300 });
        break;
      }
      case 'explode': noise(1.2, { vol: 0.9, freq: 1800, slide: 60 }); tone(70, 0.8, { type: 'sine', vol: 0.6, slide: 30 }); break;
      case 'fire': noise(1.4, { vol: 0.5, freq: 3000, slide: 200, type: 'bandpass', q: 0.7 }); tone(110, 1.0, { type: 'sawtooth', vol: 0.12, slide: 40 }); break;
      case 'potato': noise(0.6, { vol: 0.7, freq: 1200, slide: 80 }); tone(120, 0.4, { vol: 0.4, slide: 40 }); break;
      case 'squash': tone(220, 0.15, { type: 'triangle', vol: 0.3, slide: 600 }); noise(0.35, { vol: 0.7, freq: 500, slide: 60, delay: 0.1 }); break;
      case 'shovel': noise(0.2, { vol: 0.35, freq: 2500, slide: 600, type: 'bandpass' }); break;
      case 'mower': tone(80, 1.6, { type: 'sawtooth', vol: 0.12, slide: 120 }); noise(1.6, { vol: 0.15, freq: 600 }); break;
      case 'siren':
        for (let i = 0; i < 3; i++) { tone(440, 0.45, { type: 'sawtooth', vol: 0.08, slide: 880, delay: i * 0.5 }); }
        break;
      case 'ready': tone(392, 0.25, { type: 'triangle', vol: 0.25 }); break;
      case 'go': tone(523, 0.12, { type: 'triangle', vol: 0.3 }); tone(784, 0.35, { type: 'triangle', vol: 0.3, delay: 0.1 }); break;
      case 'win': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.25, delay: i * 0.13 })); break;
      case 'lose': [392, 370, 349, 330, 262].forEach((f, i) => tone(f, 0.5, { type: 'sawtooth', vol: 0.12, delay: i * 0.28 })); break;
      case 'reward': [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.4, { type: 'sine', vol: 0.22, delay: i * 0.09 })); break;
      case 'armorfall': tone(500, 0.15, { type: 'triangle', vol: 0.15, slide: 200 }); break;
    }
  }

  // ---------- Música ----------
  // Melodía original, ambiente "misterioso pero alegre" en Mi menor.
  const N = n => 440 * Math.pow(2, (n - 69) / 12);
  const SONGS = {
    game: {
      bpm: 104,
      bass: [40, 0, 47, 0, 40, 0, 47, 0, 36, 0, 43, 0, 38, 0, 45, 0, 40, 0, 47, 0, 40, 0, 47, 0, 43, 0, 38, 0, 35, 0, 42, 0],
      lead: [64, 0, 67, 0, 71, 0, 69, 67, 0, 64, 0, 0, 62, 0, 64, 0, 67, 0, 66, 0, 64, 0, 62, 0, 59, 0, 62, 0, 63, 0, 0, 0,
             64, 0, 67, 0, 71, 0, 74, 72, 0, 71, 0, 0, 69, 0, 67, 0, 69, 0, 71, 0, 67, 0, 64, 0, 66, 0, 63, 0, 64, 0, 0, 0],
    },
    menu: {
      bpm: 92,
      bass: [40, 0, 0, 0, 47, 0, 0, 0, 45, 0, 0, 0, 43, 0, 42, 0],
      lead: [76, 0, 0, 74, 71, 0, 0, 0, 72, 0, 71, 0, 69, 0, 0, 0, 67, 0, 69, 71, 0, 0, 74, 0, 71, 0, 0, 0, 0, 0, 0, 0],
    },
  };
  function setTrack(name) { if (track !== name) { track = name; step = 0; } }
  function startMusic() {
    if (musicTimer) return;
    nextNoteTime = ac.currentTime + 0.1;
    musicTimer = setInterval(() => {
      if (!ac) return;
      const song = SONGS[track];
      const stepDur = 60 / song.bpm / 2;
      while (nextNoteTime < ac.currentTime + 0.25) {
        const d = Math.max(0, nextNoteTime - ac.currentTime);
        const b = song.bass[step % song.bass.length];
        if (b) tone(N(b), stepDur * 1.6, { type: 'triangle', vol: 0.5, delay: d, bus: musicBus });
        const l = song.lead[step % song.lead.length];
        if (l) { tone(N(l), stepDur * 1.4, { type: 'square', vol: 0.09, delay: d, bus: musicBus });
                 tone(N(l + 12), stepDur * 0.8, { type: 'sine', vol: 0.06, delay: d, bus: musicBus }); }
        if (track === 'game' && step % 2 === 0) noise(0.04, { vol: step % 4 === 0 ? 0.12 : 0.06, freq: 7000, type: 'highpass', delay: d, bus: musicBus });
        if (track === 'game' && step % 8 === 4) noise(0.12, { vol: 0.15, freq: 1200, type: 'bandpass', delay: d, bus: musicBus });
        nextNoteTime += stepDur; step++;
      }
    }, 60);
  }

  return { init, play, setSound, setMusic, setTrack };
})();

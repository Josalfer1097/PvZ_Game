'use strict';
// =====================================================================
//  Sonido: secuenciador musical propio + efectos, todo con WebAudio.
//  Instrumentos sintetizados (marimba, campanas, bajo, pad, lead, batería)
//  con reverb y delay. Canciones originales.
// =====================================================================
const Sfx = (() => {
  let ac = null, master, comp, sfxBus, musicBus, revIn, dlyIn, noiseBuf;
  const last = {};
  const MUSIC_VOL = 0.34, SFX_VOL = 0.75;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    master = ac.createGain(); master.gain.value = 0.85;
    comp.connect(master); master.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = Save.data.sound ? SFX_VOL : 0; sfxBus.connect(comp);
    musicBus = ac.createGain(); musicBus.gain.value = Save.data.music ? MUSIC_VOL : 0; musicBus.connect(comp);
    // reverb (respuesta al impulso generada)
    const len = ac.sampleRate * 2.4;
    const ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    const rev = ac.createConvolver(); rev.buffer = ir;
    revIn = ac.createGain(); revIn.gain.value = 0.35;
    revIn.connect(rev); rev.connect(musicBus);
    // delay con realimentación
    dlyIn = ac.createGain(); dlyIn.gain.value = 0.3;
    const dly = ac.createDelay(1); dly.delayTime.value = 0.36;
    const fb = ac.createGain(); fb.gain.value = 0.32;
    const dlf = ac.createBiquadFilter(); dlf.type = 'lowpass'; dlf.frequency.value = 2600;
    dlyIn.connect(dly); dly.connect(dlf); dlf.connect(fb); fb.connect(dly); dlf.connect(musicBus); dlf.connect(revIn);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    startMusic();
  }
  function setSound(on) { Save.data.sound = on; Save.save(); if (sfxBus) sfxBus.gain.value = on ? SFX_VOL : 0; }
  function setMusic(on) { Save.data.music = on; Save.save(); if (musicBus) musicBus.gain.setTargetAtTime(on ? MUSIC_VOL : 0, ac.currentTime, 0.1); }

  // ---------- Primitivas ----------
  function env(g, t0, a, peak, dur, rel = 0.05) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(a + 0.01, dur) + rel);
  }
  function osc(type, f, t0, dur, vol, dest, { a = 0.005, slide = 0, detune = 0, rel = 0.05 } = {}) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); o.detune.value = detune;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    env(g, t0, a, vol, dur, rel);
    o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + rel + 0.05);
    return o;
  }
  function noise(t0, dur, vol, dest, { freq = 1000, q = 1, type = 'lowpass', slide = 0, a = 0.002 } = {}) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (slide) f.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    const g = ac.createGain(); env(g, t0, a, vol, dur, 0.02);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.1);
  }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  // ---------- Instrumentos ----------
  const INST = {
    marimba(t, m, dur, v) {
      const f = mtof(m);
      osc('sine', f, t, 0.5, v, musicBus, { a: 0.003 });
      osc('sine', f * 4, t, 0.06, v * 0.35, musicBus, { a: 0.001 });
      osc('triangle', f * 2, t, 0.18, v * 0.25, revIn);
    },
    bell(t, m, dur, v) {
      const f = mtof(m);
      osc('sine', f, t, 1.4, v, musicBus, { a: 0.002, rel: 0.3 });
      osc('sine', f * 2.76, t, 0.5, v * 0.3, musicBus, { a: 0.001 });
      osc('sine', f * 5.4, t, 0.2, v * 0.12, musicBus, { a: 0.001 });
      osc('sine', f, t, 1.0, v * 0.5, dlyIn); osc('sine', f, t, 1.4, v * 0.6, revIn);
    },
    lead(t, m, dur, v) {
      const f = mtof(m);
      const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 2;
      fl.frequency.setValueAtTime(900, t); fl.frequency.linearRampToValueAtTime(3200, t + 0.04); fl.frequency.exponentialRampToValueAtTime(1400, t + dur);
      fl.connect(musicBus); fl.connect(dlyIn);
      const o1 = osc('square', f, t, dur, v * 0.55, fl, { a: 0.01, rel: 0.08 });
      const o2 = osc('sawtooth', f, t, dur, v * 0.35, fl, { a: 0.01, detune: 8, rel: 0.08 });
      // vibrato
      if (dur > 0.3) {
        const lfo = ac.createOscillator(), lg = ac.createGain();
        lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + dur);
        lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
        lfo.start(t); lfo.stop(t + dur + 0.2);
      }
    },
    whistle(t, m, dur, v) {
      const f = mtof(m);
      const o = osc('sine', f, t, dur, v, musicBus, { a: 0.04, rel: 0.12 });
      osc('sine', f, t, dur, v * 0.4, dlyIn, { a: 0.04 });
      const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 6; lg.gain.value = f * 0.01;
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.2);
    },
    bass(t, m, dur, v) {
      const f = mtof(m);
      const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 6;
      fl.frequency.setValueAtTime(1100, t); fl.frequency.exponentialRampToValueAtTime(180, t + Math.min(0.25, dur));
      fl.connect(musicBus);
      osc('sawtooth', f, t, dur, v, fl, { a: 0.005, rel: 0.04 });
      osc('sine', f / 2, t, dur, v * 0.7, musicBus, { a: 0.005, rel: 0.04 });
    },
    pizz(t, m, dur, v) {
      const f = mtof(m);
      osc('triangle', f, t, 0.22, v, musicBus, { a: 0.002 });
      osc('sine', f / 2, t, 0.3, v * 0.6, musicBus, { a: 0.002 });
    },
    pad(t, notes, dur, v) {
      const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1300; fl.Q.value = 0.7;
      fl.connect(musicBus); fl.connect(revIn);
      for (const m of notes) {
        const f = mtof(m);
        osc('sawtooth', f, t, dur, v, fl, { a: 0.35, detune: -9, rel: 0.4 });
        osc('sawtooth', f, t, dur, v, fl, { a: 0.35, detune: 9, rel: 0.4 });
      }
    },
    kick(t, v) { osc('sine', 150, t, 0.16, v, musicBus, { a: 0.002, slide: 42 }); osc('triangle', 300, t, 0.02, v * 0.4, musicBus, { a: 0.001 }); },
    snare(t, v) { noise(t, 0.16, v, musicBus, { freq: 1900, type: 'bandpass', q: 0.8 }); osc('triangle', 190, t, 0.08, v * 0.5, musicBus, { slide: 140 }); noise(t, 0.12, v * 0.4, revIn, { freq: 2500, type: 'bandpass' }); },
    rim(t, v) { osc('square', 1700, t, 0.02, v * 0.4, musicBus, { a: 0.001 }); noise(t, 0.03, v * 0.6, musicBus, { freq: 3000, type: 'bandpass', q: 3 }); },
    hat(t, v) { noise(t, 0.035, v, musicBus, { freq: 8000, type: 'highpass' }); },
    shaker(t, v) { noise(t, 0.06, v, musicBus, { freq: 6000, type: 'highpass', a: 0.02 }); },
  };

  // ---------- Notación ----------
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function nm(s) { // 'C#5' / 'Bb4' -> midi
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(s);
    if (!m) return null;
    return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  }
  // "E5 - A5 . | ..." → [{m, len}|null] por paso
  function parseMel(str) {
    const toks = str.replace(/\|/g, ' ').trim().split(/\s+/);
    const out = [];
    let lastNote = null;
    for (const tk of toks) {
      if (tk === '-') { if (lastNote) lastNote.len++; out.push(null); }
      else if (tk === '.') { lastNote = null; out.push(null); }
      else { lastNote = { m: nm(tk), len: 1 }; out.push(lastNote); }
    }
    return out;
  }
  const QUAL = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6], sus: [0, 5, 7] };
  function chord(name) {
    const m = /^([A-G][#b]?)(.*)$/.exec(name);
    const root = nm(m[1] + '3');
    return { root, iv: QUAL[m[2]] || QUAL[''] };
  }

  // ---------- Canciones originales ----------
  const SONGS = {
    menu: {
      bpm: 96, swing: 0.16, lead: 'marimba', leadVol: 0.32, bassInst: 'pizz',
      chords: 'Cm Ab Fm G7 Cm Ab Bb G7',
      melody: 'G5 - Eb5 - C5 - Eb5 G5 | Ab5 - - G5 F5 - Eb5 - | F5 - Ab5 - C6 - Ab5 F5 | D5 - G4 - B4 - D5 - |' +
              'G5 - C6 - Bb5 Ab5 G5 - | Ab5 - C6 - Eb6 - C6 - | Bb5 - Ab5 G5 F5 - D5 - | B4 - - - G4 - - .',
      bass: 'R..5..R.', drums: { k: 'x.......', s: '....o...', h: '..x...x.' }, pad: 0.018, arp: false,
    },
    day: {
      bpm: 118, swing: 0.1, lead: 'lead', leadVol: 0.12, bassInst: 'bass',
      chords: 'Am F C E7 Am F E7 Am Dm G C Am Dm E7 Am E7',
      melody: 'E5 - A5 - G5 E5 C5 - | D5 - C5 A4 - - C5 D5 | E5 - G5 - E5 D5 C5 - | B4 - G#4 - B4 - - . |' +
              'E5 - A5 - B5 A5 G5 E5 | F5 - E5 C5 - A4 C5 - | B4 - D5 C5 B4 - G#4 B4 | A4 - - - . . . . |' +
              'F5 - - E5 D5 - A4 - | B4 - D5 - G5 - F5 - | E5 - - D5 C5 - G4 - | A4 - C5 - E5 - A5 - |' +
              'F5 - E5 - D5 - C5 - | B4 - G#4 - E4 - G#4 B4 | C5 - B4 - A4 - E4 - | G#4 - - - B4 - D5 - ',
      bass: 'R..5R.58', drums: { k: 'x...x.x.', s: '..x...x.', h: 'oxoxoxox' }, pad: 0.012, arp: 'marimba', arpVol: 0.11,
    },
    night: {
      bpm: 84, swing: 0.12, lead: 'bell', leadVol: 0.16, bassInst: 'bass',
      chords: 'Dm Bb Gm A7 Dm Bb C A7',
      melody: 'A5 - - - F5 - - - | D5 - - - F5 - E5 D5 | Bb4 - - - D5 - G5 - | E5 - - - C#5 - - - |' +
              'A5 - - G5 F5 - - - | D6 - - - Bb5 - - - | C6 - - Bb5 A5 - G5 - | A5 - - - . . . .',
      bass: 'R...5...', drums: { k: 'x.......', s: '....r...', h: '..o...o.' }, pad: 0.02, arp: 'marimba', arpVol: 0.06, arpEvery: 2,
    },
    intense: {
      bpm: 142, swing: 0, lead: 'lead', leadVol: 0.13, bassInst: 'bass',
      chords: 'Em C D B7 Em C Am B7',
      melody: 'E5 E5 . G5 . E5 B4 . | C5 . E5 . G5 . E5 . | D5 D5 . F#5 . A5 F#5 . | D#5 . F#5 . B5 - A5 F#5 |' +
              'E5 E5 . G5 . B5 . E6 | D6 . C6 . G5 . E5 . | A5 . G5 . F#5 . E5 . | D#5 - - - B4 - D#5 F#5',
      bass: 'RRRRRRRR', drums: { k: 'x.x.x.x.', s: '..x...x.', h: 'xxxxxxxx' }, pad: 0.01, arp: false,
    },
  };
  for (const k in SONGS) {
    const s = SONGS[k];
    s.mel = parseMel(s.melody);
    s.ch = s.chords.split(/\s+/).map(chord);
  }

  // ---------- Secuenciador ----------
  let track = 'menu', wanted = 'menu', step = 0, nextTime = 0, timer = null;
  function setTrack(name) { if (SONGS[name]) wanted = name; }
  function scheduleStep(t, song, st) {
    const bar = Math.floor(st / 8), s8 = st % 8;
    const sp = 60 / song.bpm / 2;
    const ch = song.ch[bar % song.ch.length];
    const tones = ch.iv.map(i => ch.root + i);
    // pad
    if (s8 === 0 && song.pad) INST.pad(t, tones.map(n => n + 12).slice(0, 3), sp * 8, song.pad);
    // bajo
    const b = song.bass[s8];
    if (b && b !== '.') {
      const off = b === 'R' ? 0 : b === '5' ? 7 : b === '8' ? 12 : b === '3' ? ch.iv[1] : 0;
      INST[song.bassInst](t, ch.root - 12 + off, sp * 0.9, song.bassInst === 'pizz' ? 0.3 : 0.2);
    }
    // arpegio
    if (song.arp && st % (song.arpEvery || 1) === 0) {
      const idx = [0, 1, 2, 1, 2, 3, 2, 1][s8] % tones.length;
      INST[song.arp](t, tones[idx] + 24 - (idx > 2 ? 12 : 0), sp, song.arpVol);
    }
    // melodía
    const n = song.mel[st % song.mel.length];
    if (n && n.m) INST[song.lead](t, n.m, sp * n.len * 0.95, song.leadVol);
    // batería
    const d = song.drums;
    const k = d.k[s8], s = d.s[s8], h = d.h[s8];
    if (k === 'x') INST.kick(t, 0.75);
    if (s === 'x') INST.snare(t, 0.32); else if (s === 'o') INST.snare(t, 0.12); else if (s === 'r') INST.rim(t, 0.25);
    if (h === 'x') INST.hat(t, 0.12); else if (h === 'o') INST.hat(t, 0.06);
  }
  function startMusic() {
    if (timer) return;
    nextTime = ac.currentTime + 0.15;
    timer = setInterval(() => {
      if (!ac || ac.state !== 'running') return;
      while (nextTime < ac.currentTime + 0.3) {
        if (step % 8 === 0 && wanted !== track) { track = wanted; step = 0; }
        const song = SONGS[track];
        const sp = 60 / song.bpm / 2;
        const swing = step % 2 === 1 ? sp * song.swing : 0;
        if (Save.data.music) scheduleStep(nextTime + swing, song, step);
        nextTime += sp; step++;
        if (step >= song.mel.length * 4) step = 0;
      }
    }, 50);
  }

  // ---------- Efectos ----------
  function play(name) {
    if (!ac || !Save.data.sound) return;
    const t = ac.currentTime;
    const gap = { shoot: 0.035, splat: 0.03, chomp: 0.08, groan: 1.2, clank: 0.05, plastic: 0.05, freeze: 0.2, lob: 0.05, melon: 0.05, spike: 0.1 }[name] || 0;
    if (gap && last[name] && t - last[name] < gap) return;
    last[name] = t;
    const B = sfxBus;
    const v = 1;
    switch (name) {
      case 'click': osc('triangle', 700, t, 0.06, 0.25, B); osc('sine', 1400, t + 0.02, 0.05, 0.1, B); break;
      case 'select': osc('triangle', 560, t, 0.06, 0.25, B); osc('triangle', 840, t + 0.05, 0.08, 0.2, B); break;
      case 'buzz': osc('square', 130, t, 0.2, 0.1, B, { slide: 110 }); break;
      case 'plant': noise(t, 0.2, 0.5, B, { freq: 700, slide: 120 }); osc('sine', 200, t, 0.16, 0.35, B, { slide: 70 }); osc('triangle', 600, t + 0.06, 0.08, 0.1, B, { slide: 900 }); break;
      case 'shoot': osc('sine', 460, t, 0.08, 0.22 * v, B, { slide: 200 }); noise(t, 0.04, 0.14, B, { freq: 2200 }); break;
      case 'firepea': noise(t, 0.12, 0.25, B, { freq: 3000, type: 'bandpass', slide: 800 }); break;
      case 'splat': noise(t, 0.09, 0.3, B, { freq: 900, slide: 250 }); osc('sine', 170, t, 0.06, 0.12, B, { slide: 80 }); break;
      case 'clank': osc('square', 1450, t, 0.1, 0.07, B, { slide: 1150 }); osc('triangle', 2300, t, 0.12, 0.1, B); noise(t, 0.05, 0.15, B, { freq: 4000, type: 'highpass' }); break;
      case 'plastic': osc('triangle', 720, t, 0.07, 0.12, B, { slide: 380 }); noise(t, 0.04, 0.14, B, { freq: 1500 }); break;
      case 'freeze': osc('sine', 1900, t, 0.14, 0.07, B, { slide: 2800 }); osc('sine', 2600, t + 0.04, 0.1, 0.04, B); break;
      case 'sun': osc('sine', 880, t, 0.1, 0.2, B); osc('sine', 1320, t + 0.06, 0.16, 0.16, B); osc('sine', 1760, t + 0.11, 0.18, 0.08, B); break;
      case 'chomp': noise(t, 0.07, 0.35, B, { freq: 500, q: 3, type: 'bandpass' }); osc('square', 95, t, 0.05, 0.07, B); break;
      case 'gulp': osc('sine', 320, t, 0.25, 0.3, B, { slide: 70 }); noise(t, 0.2, 0.2, B, { freq: 400 }); break;
      case 'groan': {
        const f = 85 + Math.random() * 50;
        const fl = ac.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 600; fl.Q.value = 3; fl.connect(B);
        osc('sawtooth', f, t, 1.2, 0.09, fl, { a: 0.3, slide: f * 0.72 });
        osc('sawtooth', f * 1.5, t + 0.1, 1.0, 0.04, fl, { a: 0.3, slide: f });
        break;
      }
      case 'explode': noise(t, 1.3, 0.9, B, { freq: 1800, slide: 50 }); osc('sine', 75, t, 0.9, 0.7, B, { slide: 28 }); break;
      case 'doom': noise(t, 2.6, 1, B, { freq: 1200, slide: 30 }); osc('sine', 55, t, 2.2, 0.9, B, { slide: 20 }); osc('sawtooth', 110, t, 1.4, 0.15, B, { slide: 30 }); break;
      case 'icefreeze': osc('sine', 2400, t, 0.6, 0.12, B, { slide: 600 }); noise(t, 0.8, 0.3, B, { freq: 6000, type: 'highpass', slide: 2000 }); break;
      case 'fire': noise(t, 1.4, 0.5, B, { freq: 3000, slide: 200, type: 'bandpass', q: 0.7 }); osc('sawtooth', 110, t, 1.0, 0.12, B, { slide: 40 }); break;
      case 'potato': noise(t, 0.6, 0.7, B, { freq: 1200, slide: 80 }); osc('sine', 120, t, 0.4, 0.4, B, { slide: 40 }); break;
      case 'squash': osc('triangle', 220, t, 0.15, 0.3, B, { slide: 600 }); noise(t + 0.1, 0.35, 0.7, B, { freq: 500, slide: 60 }); break;
      case 'shovel': noise(t, 0.2, 0.35, B, { freq: 2500, slide: 600, type: 'bandpass' }); break;
      case 'mower': osc('sawtooth', 80, t, 1.6, 0.12, B, { slide: 120 }); noise(t, 1.6, 0.15, B, { freq: 600 }); break;
      case 'lob': osc('sine', 300, t, 0.2, 0.15, B, { slide: 600 }); noise(t, 0.1, 0.15, B, { freq: 1200 }); break;
      case 'melon': noise(t, 0.2, 0.5, B, { freq: 700, slide: 150 }); osc('sine', 120, t, 0.15, 0.3, B, { slide: 60 }); break;
      case 'spike': osc('triangle', 1600, t, 0.05, 0.08, B, { slide: 900 }); break;
      case 'magnet': osc('sine', 300, t, 0.5, 0.12, B, { slide: 1200 }); osc('square', 600, t, 0.4, 0.04, B, { slide: 2000 }); break;
      case 'garlic': osc('triangle', 300, t, 0.2, 0.2, B, { slide: 180 }); break;
      case 'smash': noise(t, 0.5, 0.9, B, { freq: 600, slide: 40 }); osc('sine', 60, t, 0.4, 0.8, B, { slide: 25 }); break;
      case 'impthrow': osc('triangle', 400, t, 0.5, 0.15, B, { slide: 900 }); osc('square', 900, t + 0.1, 0.2, 0.05, B, { slide: 1400 }); break;
      case 'siren': for (let i = 0; i < 3; i++) osc('sawtooth', 440, t + i * 0.5, 0.45, 0.08, B, { slide: 880 }); break;
      case 'ready': osc('triangle', 392, t, 0.25, 0.25, B); break;
      case 'go': osc('triangle', 523, t, 0.12, 0.3, B); osc('triangle', 784, t + 0.1, 0.35, 0.3, B); osc('sine', 1047, t + 0.1, 0.4, 0.15, B); break;
      case 'win': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => { osc('triangle', f, t + i * 0.12, 0.3, 0.22, B); osc('sine', f * 2, t + i * 0.12, 0.25, 0.06, B); }); break;
      case 'lose': [392, 370, 349, 330, 262].forEach((f, i) => osc('sawtooth', f, t + i * 0.28, 0.5, 0.1, B)); break;
      case 'reward': [784, 988, 1175, 1568, 1976].forEach((f, i) => osc('sine', f, t + i * 0.08, 0.5, 0.2, B)); break;
      case 'armorfall': osc('triangle', 500, t, 0.15, 0.15, B, { slide: 200 }); break;
      case 'thud': osc('sine', 90, t, 0.2, 0.35, B, { slide: 45 }); noise(t, 0.15, 0.25, B, { freq: 400 }); break;
    }
  }

  return { init, play, setSound, setMusic, setTrack };
})();

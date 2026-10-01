'use strict';
// =====================================================================
//  Lógica de una partida: plantas, zombis, soles, oleadas, cortacéspedes
// =====================================================================
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const BAR = { x: 10, y: 6, sunW: 104, pw: 84, ph: 116, gap: 6 };
const MIN_WAVE = { normal: 1, flag: 1, cone: 2, pole: 3, paper: 3, bucket: 4, football: 6 };

class Game {
  constructor(app, levelIdx) {
    this.app = app;
    this.levelIdx = levelIdx;
    this.L = levelIdx === 'endless' ? ENDLESS : LEVELS[levelIdx];
    this.lanes = this.L.lanes;
    this.sun = this.L.sun;
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.plants = []; this.zombies = []; this.peas = []; this.suns = []; this.parts = [];
    this.mowers = ALL_LANES.map(r => this.lanes.includes(r) ? { row: r, x: MOWER_X, state: 'idle' } : null);
    this.time = 0; this.phaseT = 0;
    this.wave = 0; this.waveClock = 0; this.nextWaveAt = this.L.first; this.waveHp = 1;
    this.spawnQueue = []; this.flagPending = 0;
    this.skySunT = 5;
    this.groanT = 4;
    this.selected = null;
    this.shake = 0;
    this.banner = null;
    this.speed = 1;
    this.paused = false;
    this.lastDeath = null;
    this.reward = null;
    this.confirmQuit = false;
    // plantas disponibles y casillas
    const owned = PLANT_ORDER.filter(p => Save.data.plants.includes(p));
    this.slots = levelIdx === 'endless' ? 8 : levelIdx < 6 ? 6 : levelIdx < 9 ? 7 : 8;
    this.owned = owned;
    this.chosen = [];
    this.packets = [];
    // zombis de vista previa en la calle
    this.preview = [];
    const types = this.L.zombies;
    const n = Math.min(10, 3 + Math.floor((typeof levelIdx === 'number' ? levelIdx : 8) / 1.5));
    for (let i = 0; i < n; i++) {
      this.preview.push({ type: types[i % types.length], x: rand(1430, 1570), y: rand(250, 860), animT: rand(0, 10),
        state: 'idle', armor: 1, armorMax: 1, enraged: false, hasPole: true });
    }
    this.preview.sort((a, b) => a.y - b.y);
    if (owned.length <= this.slots) {
      this.chosen = owned.slice();
      this.startReady();
    } else {
      this.phase = 'choose';
    }
  }

  // ------------------------------------------------------------------
  get barW() { return BAR.sunW + 10 + this.slotsShown * (BAR.pw + BAR.gap) + 6; }
  get slotsShown() { return this.phase === 'choose' ? this.slots : this.packets.length; }
  packetRect(i) { return { x: BAR.x + BAR.sunW + 10 + i * (BAR.pw + BAR.gap), y: BAR.y + 4, w: BAR.pw, h: BAR.ph }; }
  shovelRect() { return { x: BAR.x + this.barW + 10, y: BAR.y + 8, w: 96, h: 96 }; }

  startReady() {
    this.phase = 'ready'; this.phaseT = 0;
    this.packets = this.chosen.map(type => ({ type, cdMax: PLANTS[type].cd, cd: PLANTS[type].ready ? 0 : PLANTS[type].cd }));
    Sfx.setTrack('game');
  }

  setBanner(text, dur = 3, color = '#fff', size = 64) { this.banner = { text, t: 0, dur, color, size }; }

  // ------------------------------------------------------------------
  //  Actualización
  // ------------------------------------------------------------------
  update(dt) {
    if (this.paused) return;
    this.phaseT += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    if (this.phase === 'choose') { this.time += dt; for (const z of this.preview) z.animT += dt; return; }
    if (this.phase === 'ready') {
      this.time += dt;
      for (const z of this.preview) z.animT += dt;
      const steps = [[0, '¡Prepárate...', 'ready'], [1.1, '¡Listo...', 'ready'], [2.2, '¡A PLANTAR!', 'go']];
      for (const [tt, txt, snd] of steps) {
        if (this.phaseT - dt < tt && this.phaseT >= tt) { this.setBanner(txt, 1.05, tt > 2 ? '#ff4a2a' : '#fff', tt > 2 ? 96 : 72); Sfx.play(snd); }
      }
      if (this.phaseT > 3.3) {
        this.phase = 'play'; this.phaseT = 0;
        if (this.L.tip) this.tip = { text: this.L.tip, t: 0 };
      }
      return;
    }
    const steps = this.speed;
    for (let i = 0; i < steps; i++) this.step(dt);
  }

  step(dt) {
    this.time += dt;
    if (this.tip) { this.tip.t += dt; if (this.tip.t > 9) this.tip = null; }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    if (this.phase === 'play') {
      this.updateWaves(dt);
      // sol del cielo
      this.skySunT -= dt;
      if (this.skySunT <= 0) {
        this.skySunT = rand(8.5, 11);
        const lane = pick(this.lanes);
        this.suns.push({ x: rand(GRID_X + 50, LAWN_RIGHT - 60), y: -40, ty: rowGroundY(lane) - rand(20, 70),
          vy: 75, vx: 0, value: 25, state: 'fall', life: 0, t: rand(0, 9), sky: true });
      }
      for (const p of this.packets) if (p.cd > 0) p.cd = Math.max(0, p.cd - dt);
      // gemidos ambientales
      this.groanT -= dt;
      if (this.groanT <= 0) { this.groanT = rand(5, 11); if (this.zombies.some(z => z.state !== 'dying')) Sfx.play('groan'); }
    }
    for (const p of this.plants) this.updatePlant(p, dt);
    this.plants = this.plants.filter(p => !p.dead);
    for (const z of this.zombies) this.updateZombie(z, dt);
    this.zombies = this.zombies.filter(z => !z.removed);
    this.updatePeas(dt);
    this.updateSuns(dt);
    this.updateMowers(dt);
    this.updateParts(dt);
    if (this.reward) { this.reward.t += dt; if (this.reward.collected) this.reward.ct += dt; }

    if (this.phase === 'play') this.checkEnd();
  }

  // ---------------- Oleadas ----------------
  isFlagWave(w) { return w % 10 === 0 || w === this.L.waves; }

  updateWaves(dt) {
    // cola de aparición
    for (const s of this.spawnQueue) { s.t -= dt; if (s.t <= 0) { this.spawnZombie(s.type, s.row); s.done = true; } }
    this.spawnQueue = this.spawnQueue.filter(s => !s.done);
    if (this.wave >= this.L.waves) return;
    this.waveClock += dt;
    if (this.flagPending > 0) {
      this.flagPending -= dt;
      if (this.flagPending <= 0) {
        this.flagPending = 0;
        this.spawnWave();
        if (this.wave === this.L.waves) { this.setBanner('¡ÚLTIMA OLEADA!', 2.6, '#ff3a1a', 96); Sfx.play('siren'); }
      }
      return;
    }
    const aliveHp = this.zombies.reduce((s, z) => s + (z.state === 'dying' ? 0 : z.hp + z.armor), 0)
      + this.spawnQueue.reduce((s, q) => s + ZOMBIES[q.type].hp + ZOMBIES[q.type].armor, 0);
    const early = this.wave > 0 && this.waveClock > 6 && aliveHp < this.waveHp * 0.4;
    if (this.waveClock >= this.nextWaveAt || early) {
      if (this.isFlagWave(this.wave + 1)) {
        if (this.waveClock < this.nextWaveAt && aliveHp > 0) return; // en oleadas grandes, esperamos un poco más
        this.flagPending = 5;
        this.setBanner('¡Se acerca una gran oleada de zombis!', 4.2, '#ff3a1a', 58);
        Sfx.play('siren');
      } else this.spawnWave();
    }
  }

  spawnWave() {
    this.wave++;
    const w = this.wave, L = this.L;
    const flag = this.isFlagWave(w);
    let budget = 1 + Math.floor(w * L.growth);
    if (!L.endless) budget = Math.min(budget, 16);
    if (flag) budget = Math.max(Math.round(budget * 1.8), 3) + Math.floor(w / 6);
    const list = flag ? ['flag'] : [];
    const allowed = L.zombies.filter(t => w >= MIN_WAVE[t] || (L.waves <= 6));
    while (budget > 0) {
      const cand = allowed.filter(t => ZOMBIES[t].cost <= budget);
      if (!cand.length) break;
      const weighted = [];
      for (const t of cand) { const wt = t === 'normal' ? 4 : t === 'football' ? 1 : 2; for (let k = 0; k < wt; k++) weighted.push(t); }
      const t = pick(weighted);
      list.push(t); budget -= ZOMBIES[t].cost;
    }
    let hp = 0;
    list.forEach((t, i) => {
      const delay = t === 'flag' ? 0 : flag ? rand(1, 7) : rand(0, 3.5);
      this.spawnQueue.push({ type: t, row: pick(this.lanes), t: delay });
      hp += ZOMBIES[t].hp + ZOMBIES[t].armor;
    });
    this.waveHp = hp;
    this.waveClock = 0;
    this.nextWaveAt = flag ? 32 : 26 - Math.min(8, w * 0.35) + rand(0, 5);
    if (w === 1) Sfx.play('groan');
    if (L.endless && w > (Save.data.best || 0)) { Save.data.best = w; Save.save(); }
  }

  spawnZombie(type, row, x) {
    const d = ZOMBIES[type];
    this.zombies.push({
      type, row, x: x || rand(1440, 1500), y: rowGroundY(row) + 6,
      hp: d.hp, maxHp: d.hp, armor: d.armor, armorMax: d.armor || 1,
      spd: ZOMBIE_BASE_SPEED * rand(0.85, 1.15),
      state: 'walk', animT: rand(0, 10), slow: 0, flash: 0, lostArm: false, headless: false,
      dieT: 0, burnt: false, eatT: 0, hasPole: type === 'pole', jumpT: 0, enraged: false, stunT: 0,
    });
  }

  checkEnd() {
    if (this.L.endless) return;
    if (this.wave >= this.L.waves && !this.flagPending && !this.spawnQueue.length
        && !this.zombies.some(z => z.state !== 'dying')) {
      this.phase = 'won'; this.phaseT = 0;
      const pos = this.lastDeath || { x: 900, y: 500 };
      const type = this.L.reward || 'trophy';
      this.reward = { type, x: clamp(pos.x, GRID_X + 60, LAWN_RIGHT - 60), y: clamp(pos.y - 60, GRID_Y + 60, 820), t: 0, collected: false, ct: 0 };
      this.selected = null;
    }
  }

  // ---------------- Plantas ----------------
  rowZombies(row) { return this.zombies.filter(z => z.row === row && z.state !== 'dying' && !z.removed); }
  zombieAhead(row, x, maxX = ZOMBIE_VISIBLE_X) {
    return this.zombies.some(z => z.row === row && z.state !== 'dying' && z.x > x - 20 && z.x < maxX);
  }

  placePlant(type, row, col) {
    const d = PLANTS[type];
    const p = {
      type, row, col, x: cellCX(col), y: rowGroundY(row), hp: d.hp, maxHp: d.hp,
      t: 0, seed: rand(0, 10), fireT: rand(0.2, 1.2), recoil: 0, glow: 0, queue: [], pop: 0, squish: 0,
      sunT: rand(4, 7), armT: 15, armed: false, fuse: 0, mode: 'idle', biteT: 0, chewT: 0, dead: false, flash: 0,
      plantT: 0,
    };
    this.grid[row][col] = p; this.plants.push(p);
    Sfx.play('plant');
    for (let i = 0; i < 10; i++) this.addPart({ kind: 'dirt', x: p.x + rand(-30, 30), y: p.y, vx: rand(-80, 80), vy: rand(-200, -80), g: 600, life: 0.6, size: rand(3, 6), ground: p.y + 4 });
    return p;
  }
  removePlant(p) {
    p.dead = true;
    if (this.grid[p.row][p.col] === p) this.grid[p.row][p.col] = null;
  }

  updatePlant(p, dt) {
    p.t += dt; p.plantT += dt;
    if (p.recoil > 0) p.recoil = Math.max(0, p.recoil - dt * 5);
    if (p.flash > 0) p.flash -= dt;
    const shooter = p.type === 'peashooter' || p.type === 'snowpea' || p.type === 'repeater' || p.type === 'threepeater';
    if (shooter) {
      for (const q of p.queue) { q.t -= dt; if (q.t <= 0) { this.firePea(p, q.row, q.snow); q.done = true; } }
      p.queue = p.queue.filter(q => !q.done);
      p.fireT -= dt;
      let rows = [p.row];
      if (p.type === 'threepeater') rows = [p.row - 1, p.row, p.row + 1].filter(r => this.lanes.includes(r));
      const target = rows.some(r => this.zombieAhead(r, p.x));
      if (p.fireT <= 0 && target) {
        p.fireT = 1.4;
        p.recoil = 1;
        if (p.type === 'threepeater') rows.forEach(r => this.firePea(p, r, false));
        else {
          this.firePea(p, p.row, p.type === 'snowpea');
          if (p.type === 'repeater') p.queue.push({ t: 0.18, row: p.row, snow: false });
        }
      } else if (p.fireT < 0) p.fireT = 0;
    } else if (p.type === 'sunflower') {
      p.sunT -= dt;
      p.glow = clamp(1 - p.sunT, 0, 1);
      if (p.sunT <= 0) {
        p.sunT = rand(23, 25);
        this.suns.push({ x: p.x + rand(-10, 10), y: p.y - 70, ty: p.y - rand(10, 30), vx: rand(-60, 60), vy: -260, value: 25,
          state: 'pop', life: 0, t: 0 });
      }
    } else if (p.type === 'cherrybomb' || p.type === 'jalapeno') {
      p.fuse = clamp(p.t / 1.1, 0, 1);
      if (p.t >= 1.1) {
        if (p.type === 'cherrybomb') this.explodeCherry(p); else this.explodeJalapeno(p);
        this.removePlant(p);
      }
    } else if (p.type === 'potatomine') {
      if (!p.armed) {
        p.armT -= dt;
        if (p.armT <= 0) { p.armed = true; p.pop = 1; for (let i = 0; i < 8; i++) this.addPart({ kind: 'dirt', x: p.x + rand(-25, 25), y: p.y - 5, vx: rand(-90, 90), vy: rand(-220, -80), g: 600, life: 0.6, size: rand(3, 6), ground: p.y + 4 }); }
      } else {
        p.pop = Math.max(0, p.pop - dt * 3);
        const hit = this.rowZombies(p.row).find(z => z.x - p.x > -30 && z.x - p.x < 60 && z.state !== 'jump');
        if (hit) {
          for (const z of this.rowZombies(p.row)) if (Math.abs(z.x - p.x) < 95) this.burnZombie(z, false);
          for (let i = 0; i < 26; i++) this.addPart({ kind: 'dirt', x: p.x + rand(-20, 20), y: p.y - 10, vx: rand(-260, 260), vy: rand(-420, -120), g: 700, life: 1, size: rand(4, 9), ground: p.y + 4 });
          this.addPart({ kind: 'flash', x: p.x, y: p.y - 30, life: 0.4, size: 110, color: '255,220,120' });
          this.addPart({ kind: 'text', x: p.x, y: p.y - 70, life: 1.3, text: '¡PATAPUM!', size: 40, vy: -30 });
          Sfx.play('potato'); this.shake = 0.25;
          this.removePlant(p);
        }
      }
    } else if (p.type === 'chomper') {
      if (p.mode === 'idle') {
        const cands = this.rowZombies(p.row).filter(z => z.x - p.x > -25 && z.x - p.x < 165 && z.state !== 'jump' && z.x < ZOMBIE_VISIBLE_X);
        if (cands.length) { p.mode = 'bite'; p.biteT = 0; p.target = cands.reduce((a, b) => a.x < b.x ? a : b); }
      } else if (p.mode === 'bite') {
        const prev = p.biteT;
        p.biteT += dt / 0.7;
        if (prev < 0.55 && p.biteT >= 0.55) {
          const z = p.target;
          if (z && !z.removed && z.state !== 'dying' && z.x - p.x < 175) {
            z.removed = true; this.lastDeath = { x: z.x, y: z.y };
            Sfx.play('gulp'); p.mode = 'chew'; p.chewT = 42;
            this.addPart({ kind: 'text', x: p.x + 20, y: p.y - 120, life: 1, text: '¡ÑAM!', size: 34, vy: -40 });
          }
        }
        if (p.biteT >= 1 && p.mode === 'bite') p.mode = 'idle';
      } else if (p.mode === 'chew') {
        p.chewT -= dt;
        if (Math.random() < dt * 2) Sfx.play('chomp');
        if (p.chewT <= 0) p.mode = 'idle';
      }
    } else if (p.type === 'squash') {
      if (p.mode === 'idle') {
        const cands = this.rowZombies(p.row).filter(z => z.x - p.x > -70 && z.x - p.x < 150 && z.state !== 'jump' && z.x < ZOMBIE_VISIBLE_X);
        if (cands.length) {
          const z = cands.reduce((a, b) => Math.abs(a.x - p.x) < Math.abs(b.x - p.x) ? a : b);
          p.mode = 'look'; p.biteT = 0; p.tx = z.x - 10; p.sx = p.x;
          if (this.grid[p.row][p.col] === p) this.grid[p.row][p.col] = null;
          p.untargetable = true;
          this.addPart({ kind: 'text', x: p.x, y: p.y - 120, life: 0.9, text: '¡Hmm!', size: 30, vy: -30 });
        }
      } else if (p.mode === 'look') {
        p.biteT += dt; if (p.biteT > 0.4) { p.mode = 'jump'; p.biteT = 0; }
      } else if (p.mode === 'jump') {
        p.biteT += dt / 0.55;
        const k = clamp(p.biteT, 0, 1);
        p.x = p.sx + (p.tx - p.sx) * Math.min(1, k * 1.6);
        p.lift = k < 0.6 ? Math.sin(k / 0.6 * Math.PI / 2) * 150 : 150 * (1 - (k - 0.6) / 0.4);
        if (p.biteT >= 1) {
          p.lift = 0; p.mode = 'smash'; p.biteT = 0; p.squish = 1;
          for (const z of this.rowZombies(p.row)) if (Math.abs(z.x - p.x) < 75) this.killZombie(z, true);
          for (let i = 0; i < 14; i++) this.addPart({ kind: 'dirt', x: p.x + rand(-40, 40), y: p.y, vx: rand(-200, 200), vy: rand(-250, -60), g: 700, life: 0.7, size: rand(3, 7), ground: p.y + 4 });
          Sfx.play('squash'); this.shake = 0.2;
        }
      } else if (p.mode === 'smash') {
        p.biteT += dt;
        p.squish = Math.max(0, 1 - p.biteT * 1.5) * 0.6 + 0.4;
        if (p.biteT > 0.9) this.removePlant(p);
      }
    }
  }

  firePea(p, row, snow) {
    const fromY = p.type === 'threepeater' ? p.y - 64 : p.y - 64;
    this.peas.push({ x: p.x + 42, y: fromY, ty: rowGroundY(row) - 64, row, snow, dmg: 20, dead: false });
    Sfx.play('shoot');
  }

  explodeCherry(p) {
    for (const z of this.zombies) {
      if (z.state === 'dying' || z.removed) continue;
      if (Math.abs(z.row - p.row) <= 1 && Math.abs(z.x - p.x) < COL_W * 1.5 + 30 && z.x < ZOMBIE_VISIBLE_X + 60) this.burnZombie(z, true);
    }
    this.addPart({ kind: 'flash', x: p.x, y: p.y - 40, life: 0.5, size: 260, color: '255,200,80' });
    for (let i = 0; i < 40; i++) {
      const a = rand(0, Math.PI * 2), s = rand(100, 520);
      this.addPart({ kind: 'fire', x: p.x, y: p.y - 40, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, g: 120, life: rand(0.5, 1), size: rand(14, 30) });
    }
    for (let i = 0; i < 16; i++) this.addPart({ kind: 'smoke', x: p.x + rand(-60, 60), y: p.y - rand(20, 90), vx: rand(-40, 40), vy: rand(-80, -20), life: rand(1, 1.8), size: rand(20, 40) });
    this.addPart({ kind: 'text', x: p.x, y: p.y - 110, life: 1.2, text: '¡BUM!', size: 70, vy: -20, color: '#ffdd33' });
    Sfx.play('explode'); this.shake = 0.5;
  }
  explodeJalapeno(p) {
    for (const z of this.rowZombies(p.row)) if (z.x < ZOMBIE_VISIBLE_X + 60) this.burnZombie(z, true);
    for (let x = GRID_X; x < LAWN_RIGHT + 40; x += 24) {
      for (let k = 0; k < 2; k++)
        this.addPart({ kind: 'fire', x: x + rand(-10, 10), y: p.y - rand(0, 30), vx: rand(-20, 20), vy: rand(-160, -40), g: -40, life: rand(0.6, 1.2), size: rand(16, 34), delay: Math.abs(x - p.x) / 2500 });
    }
    Sfx.play('fire'); this.shake = 0.35;
  }

  // ---------------- Zombis ----------------
  hitZombie(z, dmg, snow) {
    z.flash = 0.1;
    if (z.armor > 0) {
      const t = z.type;
      Sfx.play(t === 'bucket' || t === 'football' ? 'clank' : t === 'cone' ? 'plastic' : 'splat');
      z.armor -= dmg;
      if (z.armor <= 0) {
        dmg = -z.armor; z.armor = 0;
        this.dropArmor(z);
      } else dmg = 0;
    } else Sfx.play('splat');
    if (snow) { if (z.slow <= 0) Sfx.play('freeze'); z.slow = 10; }
    if (dmg > 0) {
      z.hp -= dmg;
      if (!z.lostArm && z.hp < z.maxHp * 0.5) {
        z.lostArm = true;
        this.addPart({ kind: 'arm', x: z.x - 30, y: z.y - 100, vx: rand(-60, 20), vy: -160, g: 700, life: 1.6, rot: 0, vr: rand(-6, 6), ground: z.y - 4 });
      }
      if (z.hp <= 0) this.killZombie(z, false);
    }
  }
  dropArmor(z) {
    if (z.type === 'paper') {
      z.enraged = true; z.stunT = 1.1;
      for (let i = 0; i < 8; i++) this.addPart({ kind: 'paper', x: z.x - 45, y: z.y - 100, vx: rand(-90, 90), vy: rand(-180, -40), g: 300, life: 1.3, rot: rand(0, 6), vr: rand(-8, 8), ground: z.y - 2 });
      this.addPart({ kind: 'text', x: z.x - 10, y: z.y - 190, life: 1.2, text: '¡GRRR!', size: 34, vy: -30, color: '#ff5533' });
      Sfx.play('groan');
    } else {
      this.addPart({ kind: 'armor', type: z.type, x: z.x - 12, y: z.y - 150, vx: rand(20, 80), vy: -220, g: 800, life: 1.6, rot: 0, vr: rand(2, 6), ground: z.y - 6 });
      Sfx.play('armorfall');
    }
  }
  killZombie(z, squash) {
    if (z.state === 'dying') return;
    z.state = 'dying'; z.dieT = 0; z.hp = 0; z.armor = 0; z.squashed = squash;
    this.lastDeath = { x: z.x, y: z.y };
    if (!squash) {
      z.headless = true;
      this.addPart({ kind: 'head', data: { type: z.type, enraged: z.enraged }, x: z.x - 20, y: z.y - 150, vx: rand(20, 90), vy: -200, g: 900, life: 2, rot: 0, vr: rand(3, 7), ground: z.y - 16 });
    }
  }
  burnZombie(z, burnt) {
    if (z.state === 'dying') return;
    this.killZombie(z, true);
    z.burnt = true;
  }

  updateZombie(z, dt) {
    if (z.flash > 0) z.flash -= dt;
    if (z.state === 'dying') {
      z.dieT += dt;
      if (z.burnt && z.dieT > 0.7 && !z.ashed) {
        z.ashed = true;
        for (let i = 0; i < 18; i++) this.addPart({ kind: 'ash', x: z.x + rand(-25, 25), y: z.y - rand(0, 150), vx: rand(-30, 30), vy: rand(-30, 30), g: 300, life: rand(0.6, 1.2), size: rand(3, 7), ground: z.y });
      }
      if (z.dieT > (z.burnt ? 1.4 : 2.6)) z.removed = true;
      return;
    }
    const slowMul = z.slow > 0 ? 0.5 : 1;
    if (z.slow > 0) z.slow -= dt;
    z.animT += dt * slowMul;
    if (z.stunT > 0) { z.stunT -= dt; z.state = 'stun'; return; }

    if (z.state === 'jump') {
      z.jumpT += dt / 1.0;
      const k = clamp(z.jumpT, 0, 1);
      z.x = z.jumpFrom + (z.jumpTo - z.jumpFrom) * k;
      if (z.jumpT >= 1) { z.state = 'walk'; z.hasPole = false; z.stunT = 0.25; }
      return;
    }
    // ¿hay planta para comer?
    let target = null;
    for (const p of this.plants) {
      if (p.row !== z.row || p.dead || p.untargetable) continue;
      const d = z.x - p.x;
      if (d > -20 && d < (z.hasPole ? 90 : 58)) {
        if (!target || p.x > target.x) target = p;
      }
    }
    if (target && target.type === 'potatomine' && target.armed) target = null; // la mina se encarga
    if (target && z.hasPole) {
      if (target.type === 'tallnut') { z.hasPole = false; this.addPart({ kind: 'pole', x: z.x, y: z.y - 80, vx: 60, vy: -100, g: 600, life: 1.2, rot: 0, vr: 3, ground: z.y - 4 }); }
      else {
        z.state = 'jump'; z.jumpT = 0; z.jumpFrom = z.x; z.jumpTo = target.x - 72; Sfx.play('plastic');
        return;
      }
    } else if (target && z.hasPole === false && z.type === 'pole' && z.x - target.x > 58) target = null;
    if (target && z.x - target.x < 58) {
      z.state = 'eat';
      target.hp -= EAT_DPS * slowMul * dt;
      target.flash = 0.05;
      z.eatT -= dt;
      if (z.eatT <= 0) { z.eatT = 0.45 / slowMul; Sfx.play('chomp'); }
      if (target.hp <= 0) { this.removePlant(target); Sfx.play('gulp'); }
    } else {
      z.state = 'walk';
      let mul = ZOMBIES[z.type].speed;
      if (z.type === 'pole' && !z.hasPole) mul = 1;
      if (z.enraged) mul = 2.6;
      z.x -= z.spd * mul * slowMul * dt;
    }
    // casa
    const m = this.mowers[z.row];
    if (m && m.state === 'idle' && z.x < GRID_X - 8) { m.state = 'run'; Sfx.play('mower'); }
    if (z.x < HOUSE_X && (!m || m.state === 'gone') && this.phase === 'play') {
      this.phase = 'lost'; this.phaseT = 0; this.selected = null;
      Sfx.play('lose');
    }
  }

  // ---------------- Guisantes ----------------
  updatePeas(dt) {
    for (const pe of this.peas) {
      pe.x += 560 * dt;
      if (pe.y !== pe.ty) { const d = pe.ty - pe.y; pe.y += Math.sign(d) * Math.min(Math.abs(d), 420 * dt); }
      if (pe.x > W + 40) { pe.dead = true; continue; }
      let best = null;
      for (const z of this.zombies) {
        if (z.row !== pe.row || z.state === 'dying' || z.removed || z.state === 'jump') continue;
        if (z.x > ZOMBIE_VISIBLE_X + 20) continue;
        if (pe.x > z.x - 32 && pe.x < z.x + 40 && (!best || z.x < best.x)) best = z;
      }
      if (best) {
        pe.dead = true;
        this.hitZombie(best, pe.dmg, pe.snow);
        const col = pe.snow ? '160,220,255' : '120,200,40';
        for (let i = 0; i < 6; i++) this.addPart({ kind: 'splat', x: pe.x, y: pe.y, vx: rand(-140, 60), vy: rand(-140, 80), g: 400, life: 0.35, size: rand(3, 6), color: col });
      }
    }
    this.peas = this.peas.filter(p => !p.dead);
  }

  // ---------------- Soles ----------------
  updateSuns(dt) {
    for (const s of this.suns) {
      s.t += dt;
      if (s.state === 'fall') {
        s.y += s.vy * dt;
        if (s.y >= s.ty) { s.y = s.ty; s.state = 'ground'; }
      } else if (s.state === 'pop') {
        s.vy += 700 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.vy > 0 && s.y >= s.ty) { s.y = s.ty; s.state = 'ground'; }
      } else if (s.state === 'ground') {
        s.life += dt;
        if (s.life > 10) s.dead = true;
      } else if (s.state === 'fly') {
        const tx = BAR.x + 52, ty = BAR.y + 46;
        const k = 1 - Math.pow(0.0008, dt);
        s.x += (tx - s.x) * k; s.y += (ty - s.y) * k;
        s.scale = Math.max(0.6, (s.scale || 1) - dt * 0.6);
        if (Math.hypot(tx - s.x, ty - s.y) < 12) { s.dead = true; this.sun = Math.min(9990, this.sun + s.value); this.sunPulse = 0.3; }
      }
    }
    this.suns = this.suns.filter(s => !s.dead);
    if (this.sunPulse > 0) this.sunPulse -= dt;
  }
  collectSun(s) {
    if (s.state === 'fly') return;
    s.state = 'fly'; Sfx.play('sun');
  }

  // ---------------- Cortacéspedes ----------------
  updateMowers(dt) {
    for (const m of this.mowers) {
      if (!m || m.state !== 'run') continue;
      m.x += 480 * dt;
      for (const z of this.zombies) {
        if (z.row === m.row && z.state !== 'dying' && !z.removed && Math.abs(z.x - m.x) < 55 && z.x < ZOMBIE_VISIBLE_X + 40) {
          this.killZombie(z, false);
        }
      }
      if (m.x > W + 80) m.state = 'gone';
    }
  }

  // ---------------- Partículas ----------------
  addPart(p) { this.parts.push(Object.assign({ vx: 0, vy: 0, g: 0, life: 1, t: 0, rot: 0, vr: 0, size: 5, ground: null, delay: 0 }, p)); }
  updateParts(dt) {
    for (const p of this.parts) {
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.t += dt;
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.ground !== null && p.y > p.ground) { p.y = p.ground; p.vy *= -0.3; p.vx *= 0.5; p.vr *= 0.4; }
    }
    this.parts = this.parts.filter(p => p.t < p.life);
  }

  // ------------------------------------------------------------------
  //  Entrada
  // ------------------------------------------------------------------
  cellAt(x, y) {
    const c = Math.floor((x - GRID_X) / COL_W), r = Math.floor((y - GRID_Y) / ROW_H);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
    return { r, c };
  }
  canPlace(type, cell) {
    return cell && this.lanes.includes(cell.r) && !this.grid[cell.r][cell.c];
  }

  onDown(x, y, button) {
    if (this.paused) { UI.hit(x, y); return; }
    if (button === 2) { this.selected = null; return; }
    if (this.phase === 'play') {
      // soles primero (con radio generoso)
      for (let i = this.suns.length - 1; i >= 0; i--) {
        const s = this.suns[i];
        if (s.state !== 'fly' && Math.hypot(s.x - x, s.y - y) < 50) { this.collectSun(s); return; }
      }
    }
    if (this.phase === 'won' && this.reward && !this.reward.collected) {
      if (Math.hypot(this.reward.x - x, this.reward.y - y) < 70) {
        this.reward.collected = true; this.reward.ct = 0; Sfx.play('reward');
        this.suns.forEach(s => { if (s.state !== 'fly') this.collectSun(s); });
        return;
      }
    }
    if (UI.hit(x, y)) return;
    if (this.phase !== 'play') return;
    const cell = this.cellAt(x, y);
    if (this.selected === 'shovel') {
      if (cell) {
        const p = this.grid[cell.r][cell.c];
        if (p) { this.removePlant(p); Sfx.play('shovel'); for (let i = 0; i < 8; i++) this.addPart({ kind: 'dirt', x: p.x + rand(-25, 25), y: p.y - 5, vx: rand(-90, 90), vy: rand(-200, -60), g: 600, life: 0.6, size: rand(3, 6), ground: p.y + 4 }); }
      }
      this.selected = null;
      return;
    }
    if (typeof this.selected === 'number') {
      const pk = this.packets[this.selected];
      if (cell && this.canPlace(pk.type, cell) && this.sun >= PLANTS[pk.type].cost && pk.cd <= 0) {
        this.placePlant(pk.type, cell.r, cell.c);
        this.sun -= PLANTS[pk.type].cost;
        pk.cd = pk.cdMax;
        this.selected = null;
      } else if (!cell) this.selected = null;
      else Sfx.play('buzz');
    }
  }
  selectPacket(i) {
    if (this.phase !== 'play') return;
    const pk = this.packets[i];
    if (!pk) return;
    if (this.selected === i) { this.selected = null; return; }
    if (pk.cd > 0 || this.sun < PLANTS[pk.type].cost) { Sfx.play('buzz'); if (this.sun < PLANTS[pk.type].cost) this.sunFlash = 0.6; return; }
    this.selected = i; Sfx.play('select');
  }
  onKey(k) {
    if (k === 'Escape') {
      if (this.selected !== null) this.selected = null;
      else if (this.phase === 'play' || this.phase === 'ready') this.paused = !this.paused;
      return;
    }
    if (this.paused) return;
    if (/^[1-8]$/.test(k)) this.selectPacket(+k - 1);
    if (k === 's' || k === 'S') { if (this.phase === 'play') this.selected = this.selected === 'shovel' ? null : 'shovel'; }
    if (k === ' ' && (this.phase === 'play')) this.paused = true;
  }

  // ------------------------------------------------------------------
  //  Dibujo
  // ------------------------------------------------------------------
  draw(ctx) {
    const t = this.time;
    ctx.save();
    if (this.shake > 0) ctx.translate(rand(-1, 1) * this.shake * 16, rand(-1, 1) * this.shake * 16);
    ctx.drawImage(this.app.getBg(this.lanes), 0, 0, W, H);

    // vista previa de zombis en la calle
    if (this.phase === 'choose' || this.phase === 'ready') {
      const fade = this.phase === 'ready' ? clamp(1 - this.phaseT / 0.8, 0, 1) : 1;
      if (fade > 0) {
        ctx.save(); ctx.globalAlpha = fade;
        for (const z of this.preview) {
          ctx.save(); ctx.translate(z.x, z.y);
          Art.shadow(ctx, 0, 0, 34, 9); ctx.scale(0.9, 0.9);
          Art.zombie(ctx, z, z.animT);
          ctx.restore();
        }
        ctx.restore();
      }
    }

    // filas: cortacésped, plantas, zombis, guisantes
    for (let r = 0; r < ROWS; r++) {
      const m = this.mowers[r];
      if (m && m.state !== 'gone') Art.mower(ctx, m.x, rowGroundY(r) + 4, t, m.state === 'run');
      for (const p of this.plants) if (p.row === r) this.drawPlant(ctx, p, t);
      const zs = this.zombies.filter(z => z.row === r).sort((a, b) => b.x - a.x);
      for (const z of zs) this.drawZombie(ctx, z, t);
      for (const pe of this.peas) if (pe.row === r) Art.pea(ctx, pe.x, pe.y, pe.snow);
    }
    this.drawParts(ctx);

    // fantasma de planta / pala
    if (this.phase === 'play' && !this.paused) this.drawCursorGhost(ctx, t);

    for (const s of this.suns) {
      let a = 1;
      if (s.state === 'ground' && s.life > 8) a = Math.sin(s.life * 18) > 0 ? 1 : 0.4;
      ctx.save(); ctx.globalAlpha = a; Art.sun(ctx, s.x, s.y, t + s.t, s.scale || 1); ctx.restore();
    }
    ctx.restore();

    this.drawHUD(ctx, t);
    if (this.reward) this.drawReward(ctx, t);

    // banner
    if (this.banner && this.phase !== 'lost') {
      const b = this.banner;
      const k = clamp(b.t / 0.18, 0, 1), out = clamp((b.dur - b.t) / 0.3, 0, 1);
      const sc = 0.6 + 0.4 * (1 - Math.pow(1 - k, 3)) + (b.t < 0.25 ? Math.sin(k * Math.PI) * 0.12 : 0);
      ctx.save(); ctx.globalAlpha = out; ctx.translate(W / 2 + 60, H / 2); ctx.scale(sc, sc);
      UI.text(ctx, b.text, 0, 0, b.size, { fill: b.color, stroke: '#2a0a00', lw: b.size / 6 });
      ctx.restore();
    }
    if (this.tip && this.phase === 'play') {
      const a = clamp(Math.min(this.tip.t, 9 - this.tip.t), 0, 1);
      ctx.save(); ctx.globalAlpha = a;
      ctx.font = `bold 26px ${UI.BODY}`;
      const w = ctx.measureText(this.tip.text).width + 50;
      Art.rrect(ctx, W / 2 + 40 - w / 2, 800, w, 52, 14); ctx.fillStyle = 'rgba(30,20,10,0.75)'; ctx.fill();
      UI.text(ctx, this.tip.text, W / 2 + 40, 827, 26, { font: UI.BODY, stroke: null, weight: 'bold' });
      ctx.restore();
    }

    if (this.phase === 'choose') this.drawChooser(ctx, t);
    if (this.phase === 'lost') this.drawLost(ctx, t);
    if (this.paused) this.drawPause(ctx);
  }

  drawPlant(ctx, p, t) {
    ctx.save();
    ctx.translate(p.x, p.y - (p.lift || 0));
    Art.shadow(ctx, 0, (p.lift || 0) + 2, 38 - (p.lift || 0) * 0.1, 10);
    const grow = Math.min(1, p.plantT / 0.18);
    const sq = 1 + Math.sin(Math.min(1, p.plantT / 0.3) * Math.PI) * 0.12;
    ctx.scale(grow * sq, grow * (2 - sq));
    if (p.flash > 0) Art.setTint([255, 255, 255], 0.25);
    const s = {
      seed: p.seed, recoil: p.recoil, glow: p.glow, fuse: p.fuse, armed: p.armed, pop: p.pop, mode: p.mode,
      biteT: p.biteT, squish: p.squish,
      dmg: p.type === 'wallnut' || p.type === 'tallnut' ? (p.hp < p.maxHp / 3 ? 2 : p.hp < p.maxHp * 2 / 3 ? 1 : 0) : 0,
    };
    if (p.type === 'squash' && p.mode === 'smash') s.squish = p.squish;
    else if (p.type === 'squash') s.squish = 0;
    Art.plant(ctx, p.type, t + p.seed, s);
    Art.setTint(null, 0);
    ctx.restore();
  }

  drawZombie(ctx, z, t) {
    ctx.save();
    let x = z.x, y = z.y;
    if (z.state === 'jump') {
      const k = clamp(z.jumpT, 0, 1);
      const lift = Math.sin(k * Math.PI) * 130;
      Art.shadow(ctx, x, y, 34, 9);
      // pértiga
      ctx.save();
      const px = z.jumpFrom - 70;
      Art.line(ctx, [px, y, x - 10, y - lift - 90], 5, '#c8a050', '#4a3510', 2);
      ctx.restore();
      ctx.translate(x, y - lift);
      ctx.rotate(-k * 0.6 + 0.2);
    } else {
      if (z.state !== 'dying' || z.dieT < 1.5) Art.shadow(ctx, x, y, 34, 9);
      ctx.translate(x, y);
    }
    let alpha = 1;
    if (z.state === 'dying') {
      if (z.burnt) {
        Art.setTint([25, 18, 12], 0.9);
        const k = clamp((z.dieT - 0.7) / 0.6, 0, 1);
        ctx.scale(1 + k * 0.2, 1 - k);
        alpha = 1 - k * 0.6;
      } else if (z.squashed) {
        const k = clamp(z.dieT / 0.15, 0, 1);
        ctx.scale(1 + k * 0.5, 1 - k * 0.8);
        alpha = clamp((2.6 - z.dieT) / 0.6, 0, 1);
      } else {
        const k = clamp(z.dieT / 0.8, 0, 1);
        ctx.rotate(k * k * 1.45);
        ctx.translate(0, -k * 4);
        alpha = clamp((2.6 - z.dieT) / 0.6, 0, 1);
      }
    } else if (z.flash > 0) Art.setTint([255, 255, 255], 0.45);
    else if (z.slow > 0) Art.setTint([80, 150, 255], 0.42);
    ctx.globalAlpha *= alpha;
    const zz = z.state === 'stun' ? Object.assign({}, z, { state: 'idle' }) : z;
    Art.zombie(ctx, zz, t);
    Art.setTint(null, 0);
    ctx.restore();
  }

  drawParts(ctx) {
    for (const p of this.parts) {
      if (p.delay > 0) continue;
      const k = p.t / p.life;
      ctx.save();
      switch (p.kind) {
        case 'dirt':
          ctx.globalAlpha = 1 - k * k; Art.circle(ctx, p.x, p.y, p.size); ctx.fillStyle = '#6b4520'; ctx.fill(); break;
        case 'splat':
          ctx.globalAlpha = 1 - k; Art.circle(ctx, p.x, p.y, p.size * (1 - k * 0.5)); ctx.fillStyle = `rgb(${p.color})`; ctx.fill(); break;
        case 'ash':
          ctx.globalAlpha = 1 - k; ctx.fillStyle = '#2a2420'; ctx.fillRect(p.x, p.y, p.size, p.size); break;
        case 'fire': {
          ctx.globalCompositeOperation = 'lighter';
          const r = p.size * (1 - k * 0.5);
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          g.addColorStop(0, `rgba(255,240,150,${1 - k})`); g.addColorStop(0.4, `rgba(255,120,20,${0.8 * (1 - k)})`); g.addColorStop(1, 'rgba(200,20,0,0)');
          ctx.fillStyle = g; Art.circle(ctx, p.x, p.y, r); ctx.fill(); break;
        }
        case 'smoke':
          ctx.globalAlpha = 0.45 * (1 - k); Art.circle(ctx, p.x, p.y, p.size * (1 + k)); ctx.fillStyle = '#3a3530'; ctx.fill(); break;
        case 'flash': {
          const r = p.size * (0.4 + k);
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          g.addColorStop(0, `rgba(${p.color},${1 - k})`); g.addColorStop(1, `rgba(${p.color},0)`);
          ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; Art.circle(ctx, p.x, p.y, r); ctx.fill(); break;
        }
        case 'text':
          ctx.globalAlpha = clamp((1 - k) * 2, 0, 1);
          UI.text(ctx, p.text, p.x, p.y, p.size * (k < 0.15 ? 0.6 + k / 0.15 * 0.4 : 1), { fill: p.color || '#fff', stroke: '#3a1500', lw: p.size / 6 });
          break;
        case 'head':
          ctx.globalAlpha = clamp((p.life - p.t) / 0.4, 0, 1);
          ctx.translate(p.x, p.y); ctx.rotate(p.rot); Art.zombieHead(ctx, Object.assign({ armor: 0, armorMax: 1 }, p.data)); break;
        case 'arm':
          ctx.globalAlpha = clamp((p.life - p.t) / 0.4, 0, 1);
          ctx.translate(p.x, p.y); ctx.rotate(p.rot); Art.zombieArm(ctx); break;
        case 'armor':
          ctx.globalAlpha = clamp((p.life - p.t) / 0.4, 0, 1);
          ctx.translate(p.x, p.y); ctx.rotate(p.rot); Art.armorPiece(ctx, p.type, 0.2); break;
        case 'pole':
          ctx.globalAlpha = clamp((p.life - p.t) / 0.4, 0, 1);
          ctx.translate(p.x, p.y); ctx.rotate(p.rot); Art.line(ctx, [-80, 0, 80, 0], 5, '#c8a050', '#4a3510', 2); break;
        case 'paper':
          ctx.globalAlpha = clamp((p.life - p.t) / 0.4, 0, 1);
          ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = '#eee9d8'; ctx.fillRect(-8, -6, 16, 12);
          ctx.fillStyle = '#777'; ctx.fillRect(-6, -3, 12, 2); ctx.fillRect(-6, 1, 9, 2); break;
      }
      ctx.restore();
    }
  }

  drawCursorGhost(ctx, t) {
    const mx = this.app.mouse.x, my = this.app.mouse.y;
    const cell = this.cellAt(mx, my);
    if (typeof this.selected === 'number') {
      const type = this.packets[this.selected].type;
      if (this.canPlace(type, cell)) {
        ctx.save(); ctx.globalAlpha = 0.4;
        ctx.translate(cellCX(cell.c), rowGroundY(cell.r));
        Art.plant(ctx, type, 0, { armed: true });
        ctx.restore();
      }
      ctx.save(); ctx.translate(mx, my + 45); ctx.globalAlpha = 0.9;
      Art.plant(ctx, type, t, { armed: true });
      ctx.restore();
    } else if (this.selected === 'shovel') {
      if (cell && this.grid[cell.r][cell.c]) {
        ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff';
        ctx.fillRect(GRID_X + cell.c * COL_W, GRID_Y + cell.r * ROW_H, COL_W, ROW_H); ctx.restore();
      }
      ctx.save(); ctx.translate(mx, my); ctx.rotate(-0.5); UI.shovel(ctx, 0, 0, 1); ctx.restore();
    }
  }

  drawHUD(ctx, t) {
    const n = this.slotsShown;
    // barra de semillas
    const bw = this.barW;
    Art.rrect(ctx, BAR.x, BAR.y, bw, BAR.ph + 10, 14);
    ctx.fillStyle = Art.lg(ctx, 0, BAR.y, 0, BAR.y + BAR.ph, '#8a5a2b', '#5e3a17'); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#2e1a08'; ctx.stroke();
    ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = '#000';
    for (let i = 0; i < 4; i++) ctx.fillRect(BAR.x + 6, BAR.y + 20 + i * 28, bw - 12, 2);
    ctx.restore();
    // contador de soles
    Art.rrect(ctx, BAR.x + 8, BAR.y + 8, BAR.sunW - 6, BAR.ph - 6, 10);
    ctx.fillStyle = '#4a2c10'; ctx.fill();
    const pulse = this.sunPulse > 0 ? 1 + this.sunPulse * 0.6 : 1;
    Art.sun(ctx, BAR.x + 58, BAR.y + 46, t, 0.85 * pulse);
    Art.rrect(ctx, BAR.x + 16, BAR.y + 88, BAR.sunW - 22, 30, 8); ctx.fillStyle = '#f6edc8'; ctx.fill();
    const flashing = this.sunFlash > 0 && Math.sin(this.sunFlash * 30) > 0;
    if (this.sunFlash > 0) this.sunFlash -= 1 / 60;
    UI.text(ctx, String(this.sun), BAR.x + 13 + BAR.sunW / 2 - 6, BAR.y + 104, 28, { fill: flashing ? '#ff2a1a' : '#2a1a08', stroke: null, font: UI.FONT });

    for (let i = 0; i < n; i++) {
      const r = this.packetRect(i);
      if (this.phase === 'choose') {
        const type = this.chosen[i];
        if (type) { UI.packet(ctx, r.x, r.y, type, t, {}); UI.region(r.x, r.y, r.w, r.h, () => { this.chosen.splice(i, 1); Sfx.play('click'); }); }
        else { Art.rrect(ctx, r.x, r.y, r.w, r.h, 8); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill(); }
        continue;
      }
      const pk = this.packets[i];
      const cost = PLANTS[pk.type].cost;
      UI.packet(ctx, r.x, r.y, pk.type, t, {
        cd: pk.cd / pk.cdMax, poor: this.sun < cost, selected: this.selected === i,
        key: i + 1,
      });
      UI.region(r.x, r.y, r.w, r.h, () => this.selectPacket(i));
    }
    // pala
    if (this.phase !== 'choose') {
      const s = this.shovelRect();
      Art.rrect(ctx, s.x, s.y, s.w, s.h, 14);
      ctx.fillStyle = Art.lg(ctx, 0, s.y, 0, s.y + s.h, '#8a5a2b', '#5e3a17'); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = '#2e1a08'; ctx.stroke();
      Art.rrect(ctx, s.x + 8, s.y + 8, s.w - 16, s.h - 16, 10); ctx.fillStyle = '#3e240c'; ctx.fill();
      if (this.selected !== 'shovel') { ctx.save(); ctx.translate(s.x + s.w / 2, s.y + s.h / 2); ctx.rotate(-0.6); UI.shovel(ctx, 0, 0, 0.9); ctx.restore(); }
      UI.region(s.x, s.y, s.w, s.h, () => { if (this.phase === 'play') { this.selected = this.selected === 'shovel' ? null : 'shovel'; Sfx.play('shovel'); } });
    }

    // botones de menú y velocidad
    if (this.phase !== 'choose') {
      UI.button(ctx, 1430, 12, 158, 54, 'Menú', () => { this.paused = true; Sfx.play('click'); }, { size: 30 });
      UI.button(ctx, 1430, 74, 158, 44, this.speed === 2 ? 'Velocidad x2' : 'Velocidad x1', () => { this.speed = this.speed === 2 ? 1 : 2; Sfx.play('click'); }, { size: 20, color: this.speed === 2 ? 'orange' : 'stone' });
    }

    // progreso de nivel
    if (this.phase === 'play' || this.phase === 'won' || this.phase === 'lost') {
      const label = this.levelIdx === 'endless' ? `Infinito · Oleada ${this.wave}` : `Nivel ${this.levelIdx + 1}`;
      UI.text(ctx, label, 1120, 872, 28, { fill: '#fff', stroke: '#2a1a08', lw: 6, align: 'right' });
      if (!this.L.endless) {
        const bx = 1150, by = 860, bw2 = 220, bh = 24;
        Art.rrect(ctx, bx, by, bw2, bh, 10); ctx.fillStyle = '#3a2810'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#1a1005'; ctx.stroke();
        const frac = clamp(this.wave / this.L.waves, 0, 1);
        if (frac > 0) {
          Art.rrect(ctx, bx + bw2 * (1 - frac), by + 4, bw2 * frac - 4, bh - 8, 6);
          ctx.fillStyle = Art.lg(ctx, 0, by, 0, by + bh, '#b8f06a', '#4a9a1c'); ctx.fill();
        }
        for (let w = 10; w <= this.L.waves; w += 10) this.drawFlag(ctx, bx + bw2 * (1 - w / this.L.waves) + 6, by + 6, this.wave >= w);
        if (this.L.waves % 10) this.drawFlag(ctx, bx + 6, by + 6, this.wave >= this.L.waves);
        // cabeza de zombi
        ctx.save(); ctx.translate(bx + bw2 * (1 - frac) + 2, by + 14); ctx.scale(0.55, 0.55);
        Art.zombieHead(ctx, { type: 'normal', armor: 0, armorMax: 1 }); ctx.restore();
      }
    }
  }
  drawFlag(ctx, x, y, raised) {
    ctx.save(); ctx.translate(x, y - (raised ? 14 : 0));
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-1.5, -18, 3, 30);
    ctx.beginPath(); ctx.moveTo(1, -18); ctx.lineTo(-18, -12); ctx.lineTo(1, -4); ctx.closePath();
    ctx.fillStyle = '#d42a1a'; ctx.fill(); ctx.strokeStyle = '#3a0a00'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }

  drawReward(ctx, t) {
    const r = this.reward;
    let x = r.x, y = r.y, sc = 1;
    if (r.collected) {
      const k = clamp(r.ct / 1.2, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      x = r.x + (W / 2 - r.x) * e; y = r.y + (H / 2 - 40 - r.y) * e; sc = 1 + e * 1.4;
      ctx.save(); ctx.globalAlpha = clamp(r.ct / 1.2, 0, 1) * 0.85; ctx.fillStyle = '#fffbe8'; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    // brillo giratorio
    ctx.save(); ctx.translate(x, y);
    ctx.rotate(t * 0.6);
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-14 * sc, 120 * sc); ctx.lineTo(14 * sc, 120 * sc); ctx.closePath();
      ctx.fillStyle = 'rgba(255,240,140,0.6)'; ctx.fill();
    }
    ctx.restore();
    ctx.save(); ctx.translate(x, y + Math.sin(t * 3) * 4); ctx.scale(sc, sc);
    if (r.type === 'trophy') UI.trophy(ctx, 0, 0, 1);
    else UI.packet(ctx, -42, -58, r.type, t, {});
    ctx.restore();
    if (!r.collected) UI.text(ctx, '¡Haz clic!', x, y + 90, 26, { fill: '#fff', stroke: '#2a1a08', lw: 6 });
    if (r.collected && r.ct > 1.3) {
      UI.reset();
      const name = r.type === 'trophy' ? '¡Has salvado tu jardín!' : `¡Nueva planta: ${PLANTS[r.type].name}!`;
      UI.text(ctx, name, W / 2, 150, 54, { fill: '#ffd23a', stroke: '#4a2a00', lw: 9 });
      const desc = r.type === 'trophy' ? 'Has completado la aventura. ¡Modo infinito desbloqueado!' : PLANTS[r.type].desc;
      UI.text(ctx, desc, W / 2, H / 2 + 150, 28, { fill: '#3a2a10', stroke: null, font: UI.BODY, weight: 'bold' });
      UI.button(ctx, W / 2 - 150, H / 2 + 200, 300, 70, 'Continuar', () => { Sfx.play('click'); this.app.completeLevel(this.levelIdx); }, { size: 36 });
    }
  }

  drawChooser(ctx, t) {
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, BAR.y + BAR.ph + 14, LAWN_RIGHT + 60, H); ctx.restore();
    const px = 230, py = 170, pw = 900, ph = 640;
    UI.panel(ctx, px, py, pw, ph);
    UI.text(ctx, 'Elige tus plantas', px + pw / 2, py + 45, 46, { fill: '#ffe48a', stroke: '#3a1e05', lw: 8 });
    UI.text(ctx, `Puedes llevar ${this.slots} plantas`, px + pw / 2, py + 88, 22, { fill: '#f7e9c2', stroke: null, font: UI.BODY, weight: 'bold' });
    const cols = 8;
    this.owned.forEach((type, i) => {
      const x = px + 50 + (i % cols) * 102, y = py + 120 + Math.floor(i / cols) * 132;
      const used = this.chosen.includes(type);
      UI.packet(ctx, x, y, type, t, { poor: used, cd: 0 });
      if (!used) UI.region(x, y, BAR.pw, BAR.ph, () => {
        if (this.chosen.length < this.slots) { this.chosen.push(type); Sfx.play('select'); } else Sfx.play('buzz');
      });
    });
    // info de la planta bajo el ratón
    const m = this.app.mouse;
    this.owned.forEach((type, i) => {
      const x = px + 50 + (i % cols) * 102, y = py + 120 + Math.floor(i / cols) * 132;
      if (m.x >= x && m.x <= x + BAR.pw && m.y >= y && m.y <= y + BAR.ph) {
        UI.text(ctx, `${PLANTS[type].name} (${PLANTS[type].cost} soles)`, px + pw / 2, py + ph - 150, 30, { fill: '#ffe48a', stroke: '#3a1e05', lw: 6 });
        UI.text(ctx, PLANTS[type].desc, px + pw / 2, py + ph - 110, 22, { fill: '#f7e9c2', stroke: null, font: UI.BODY, weight: 'bold' });
      }
    });
    const ready = this.chosen.length === Math.min(this.slots, this.owned.length);
    UI.button(ctx, px + pw / 2 - 170, py + ph - 80, 340, 64, '¡A JUGAR!', () => { Sfx.play('go'); this.startReady(); }, { size: 34, disabled: !ready, color: 'red' });
    UI.button(ctx, px + 20, py + ph - 70, 130, 48, 'Volver', () => { Sfx.play('click'); this.app.go('levels'); }, { size: 22, color: 'stone' });
  }

  drawLost(ctx, t) {
    const k = clamp(this.phaseT / 1.2, 0, 1);
    ctx.save(); ctx.globalAlpha = k * 0.75; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore();
    if (this.phaseT > 0.8) {
      const s = clamp((this.phaseT - 0.8) / 0.5, 0, 1);
      ctx.save(); ctx.translate(W / 2, H / 2 - 90); ctx.scale(0.5 + s * 0.5, 0.5 + s * 0.5); ctx.globalAlpha = s;
      ctx.rotate(Math.sin(t * 2) * 0.02);
      UI.text(ctx, '¡LOS ZOMBIS SE HAN', 0, -50, 76, { fill: '#9fe05a', stroke: '#0e1f05', lw: 12 });
      UI.text(ctx, 'COMIDO TUS CEREBROS!', 0, 40, 76, { fill: '#9fe05a', stroke: '#0e1f05', lw: 12 });
      ctx.restore();
    }
    if (this.phaseT > 1.6) {
      UI.reset();
      UI.button(ctx, W / 2 - 320, H / 2 + 80, 300, 70, 'Reintentar', () => { Sfx.play('click'); this.app.startLevel(this.levelIdx); }, { size: 34 });
      UI.button(ctx, W / 2 + 20, H / 2 + 80, 300, 70, 'Menú principal', () => { Sfx.play('click'); this.app.go('menu'); }, { size: 30, color: 'stone' });
    }
  }

  drawPause(ctx) {
    UI.reset();
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    const pw = 520, ph = 520, px = W / 2 - pw / 2, py = H / 2 - ph / 2;
    UI.panel(ctx, px, py, pw, ph);
    UI.text(ctx, 'Pausa', W / 2, py + 60, 56, { fill: '#ffe48a', stroke: '#3a1e05', lw: 9 });
    let y = py + 115;
    const b = (label, fn, opts = {}) => { UI.button(ctx, px + 70, y, pw - 140, 62, label, fn, Object.assign({ size: 28 }, opts)); y += 76; };
    b('Continuar', () => { this.paused = false; Sfx.play('click'); });
    b('Reiniciar nivel', () => { Sfx.play('click'); this.app.startLevel(this.levelIdx); }, { color: 'orange' });
    b(`Sonido: ${Save.data.sound ? 'Sí' : 'No'}`, () => { Sfx.setSound(!Save.data.sound); Sfx.play('click'); }, { color: 'stone' });
    b(`Música: ${Save.data.music ? 'Sí' : 'No'}`, () => { Sfx.setMusic(!Save.data.music); Sfx.play('click'); }, { color: 'stone' });
    b(this.confirmQuit ? '¿Seguro? Pulsa otra vez' : 'Menú principal', () => {
      Sfx.play('click');
      if (this.confirmQuit) this.app.go('menu'); else this.confirmQuit = true;
    }, { color: 'red' });
  }
}

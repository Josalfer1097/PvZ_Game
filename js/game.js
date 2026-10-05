'use strict';
// =====================================================================
//  Lógica de una partida: plantas, zombis, soles, oleadas, cortacéspedes
// =====================================================================
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const BAR = { x: 10, y: 6, sunW: 104, pw: 84, ph: 116, gap: 6 };
const MIN_WAVE = { normal: 1, flag: 1, cone: 2, pole: 3, paper: 3, imp: 3, bucket: 4, screendoor: 4, football: 6, gargantuar: 8 };
const SHOOTERS = ['peashooter', 'snowpea', 'repeater', 'threepeater', 'gatling'];
const LOBBERS = ['melonpult', 'wintermelon'];
const STAGE_CYCLE = ['day', 'dusk', 'night'];

class Game {
  constructor(app, levelIdx) {
    this.app = app;
    this.levelIdx = levelIdx;
    this.L = levelIdx === 'endless' ? ENDLESS : LEVELS[levelIdx];
    this.stage = this.L.stage;
    this.lanes = ALL_LANES;
    this.sun = STAGES[this.stage].startSun;
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.plants = []; this.zombies = []; this.peas = []; this.lobs = []; this.suns = []; this.parts = []; this.craters = [];
    this.mowers = ALL_LANES.map(r => ({ row: r, x: MOWER_X, state: 'idle' }));
    this.time = 0; this.phaseT = 0;
    this.wave = 0; this.waveClock = 0; this.nextWaveAt = 20; this.waveHp = 1;
    this.spawnQueue = []; this.flagPending = 0; this.intense = false;
    this.skySunT = 5; this.groanT = 4;
    this.selected = null; this.shake = 0; this.flash = null;
    this.banner = null; this.speed = 1; this.paused = false;
    this.lastDeath = null; this.reward = null; this.confirmQuit = false;
    this.stats = { killed: 0, planted: 0, sun: 0 };
    this.slots = SLOTS;
    this.owned = PLANT_ORDER.slice();
    const prev = (Save.data.pick || DEFAULT_PICK).filter(p => PLANTS[p]);
    this.chosen = prev.slice(0, this.slots);
    this.packets = [];
    this.ambient = [];
    this.makeAmbient();
    // zombis de vista previa en la calle
    this.preview = [];
    const types = this.L.zombies;
    for (let i = 0; i < 9; i++) {
      const type = types[i % types.length];
      this.preview.push({ type, x: rand(1440, 1575), y: rand(250, 860), animT: rand(0, 10), state: 'idle', look: Art.zombieLook(type),
        armor: 1, armorMax: 1, hasPole: true, hasImp: true, impLook: Art.zombieLook('imp') });
    }
    this.preview.sort((a, b) => a.y - b.y);
    this.phase = 'choose';
    Sfx.setTrack('menu');
  }

  makeAmbient() {
    this.ambient = [];
    const n = this.stage === 'night' ? 16 : this.stage === 'dusk' ? 10 : 5;
    for (let i = 0; i < n; i++) {
      this.ambient.push({
        kind: this.stage === 'night' ? 'firefly' : this.stage === 'dusk' ? 'leaf' : 'butterfly',
        x: rand(GRID_X, LAWN_RIGHT), y: rand(GRID_Y, H - 40), vx: rand(-20, 20), vy: rand(-10, 10), seed: rand(0, 10),
        col: pick(this.stage === 'dusk' ? ['#d8782a', '#c4501a', '#e8a83a'] : ['#ffd23a', '#ff8ac0', '#9ad0ff', '#fff']),
      });
    }
  }
  setStage(stage) {
    if (this.stage === stage) return;
    this.stage = stage;
    this.makeAmbient();
    this.setBanner(STAGES[stage].name, 2.5, '#fff', 70);
    if (!this.intense) Sfx.setTrack(STAGES[stage].music);
  }

  // ------------------------------------------------------------------
  get barW() { return BAR.sunW + 10 + this.slots * (BAR.pw + BAR.gap) + 6; }
  packetRect(i) { return { x: BAR.x + BAR.sunW + 10 + i * (BAR.pw + BAR.gap), y: BAR.y + 4, w: BAR.pw, h: BAR.ph }; }
  shovelRect() { return { x: BAR.x + this.barW + 10, y: BAR.y + 8, w: 96, h: 96 }; }

  startReady() {
    this.phase = 'ready'; this.phaseT = 0;
    Save.data.pick = this.chosen.slice(); Save.save();
    this.packets = this.chosen.map(type => ({ type, cdMax: PLANTS[type].cd, cd: PLANTS[type].ready ? 0 : PLANTS[type].cd }));
    Sfx.setTrack(STAGES[this.stage].music);
  }

  setBanner(text, dur = 3, color = '#fff', size = 64) { this.banner = { text, t: 0, dur, color, size }; }

  // ------------------------------------------------------------------
  //  Actualización
  // ------------------------------------------------------------------
  update(dt) {
    if (this.paused) return;
    this.phaseT += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    if (this.phase === 'choose' || this.phase === 'ready') {
      this.time += dt;
      for (const z of this.preview) z.animT += dt;
      this.updateAmbient(dt);
      if (this.phase === 'ready') {
        const steps = [[0, '¡Prepárate...', 'ready'], [1.1, '¡Listo...', 'ready'], [2.2, '¡A PLANTAR!', 'go']];
        for (const [tt, txt, snd] of steps) {
          if (this.phaseT - dt < tt && this.phaseT >= tt) { this.setBanner(txt, 1.05, tt > 2 ? '#ff4a2a' : '#fff', tt > 2 ? 96 : 72); Sfx.play(snd); }
        }
        if (this.phaseT > 3.3) { this.phase = 'play'; this.phaseT = 0; if (this.L.tip) this.tip = { text: this.L.tip, t: 0 }; }
      }
      return;
    }
    for (let i = 0; i < this.speed; i++) this.step(dt);
  }

  step(dt) {
    this.time += dt;
    if (this.tip) { this.tip.t += dt; if (this.tip.t > 9) this.tip = null; }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    if (this.flash) { this.flash.t += dt; if (this.flash.t > this.flash.dur) this.flash = null; }
    if (this.phase === 'play') {
      this.updateWaves(dt);
      this.skySunT -= dt;
      if (this.skySunT <= 0) {
        const r = STAGES[this.stage].skySun;
        this.skySunT = rand(r[0], r[1]);
        const lane = pick(this.lanes);
        this.suns.push({ x: rand(GRID_X + 50, LAWN_RIGHT - 60), y: -40, ty: rowGroundY(lane) - rand(20, 70),
          vy: 75, vx: 0, value: 25, state: 'fall', life: 0, t: rand(0, 9) });
      }
      for (const p of this.packets) if (p.cd > 0) p.cd = Math.max(0, p.cd - dt);
      this.groanT -= dt;
      if (this.groanT <= 0) { this.groanT = rand(4, 9); if (this.zombies.some(z => z.state !== 'dying')) Sfx.play('groan'); }
    }
    for (const c of this.craters) c.t -= dt;
    this.craters = this.craters.filter(c => c.t > 0);
    for (const p of this.plants) this.updatePlant(p, dt);
    this.plants = this.plants.filter(p => !p.dead);
    for (const z of this.zombies) this.updateZombie(z, dt);
    this.zombies = this.zombies.filter(z => !z.removed);
    this.updatePeas(dt);
    this.updateLobs(dt);
    this.updateSuns(dt);
    this.updateMowers(dt);
    this.updateParts(dt);
    this.updateAmbient(dt);
    if (this.reward) { this.reward.t += dt; if (this.reward.collected) this.reward.ct += dt; }
    if (this.phase === 'play') this.checkEnd();
  }

  updateAmbient(dt) {
    for (const a of this.ambient) {
      if (a.kind === 'leaf') { a.vx = 25 + Math.sin(this.time + a.seed) * 15; a.vy = 30; }
      else { a.vx += rand(-60, 60) * dt; a.vy += rand(-60, 60) * dt; a.vx = clamp(a.vx, -35, 35); a.vy = clamp(a.vy, -25, 25); }
      a.x += a.vx * dt; a.y += a.vy * dt;
      if (a.x < GRID_X - 40) a.x = LAWN_RIGHT;
      if (a.x > LAWN_RIGHT + 40) a.x = GRID_X;
      if (a.y < GRID_Y - 20) a.vy = Math.abs(a.vy);
      if (a.y > H - 20) { if (a.kind === 'leaf') { a.y = GRID_Y - 20; a.x = rand(GRID_X, LAWN_RIGHT); } else a.vy = -Math.abs(a.vy); }
    }
  }

  // ---------------- Oleadas ----------------
  isFlagWave(w) { return w % 10 === 0 || w === this.L.waves; }

  updateWaves(dt) {
    for (const s of this.spawnQueue) { s.t -= dt; if (s.t <= 0) { this.spawnZombie(s.type, s.row); s.done = true; } }
    this.spawnQueue = this.spawnQueue.filter(s => !s.done);
    const alive = this.zombies.filter(z => z.state !== 'dying');
    if (this.intense && !alive.length && !this.spawnQueue.length && !this.flagPending) {
      this.intense = false; Sfx.setTrack(STAGES[this.stage].music);
    }
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
    const aliveHp = alive.reduce((s, z) => s + z.hp + z.armor, 0)
      + this.spawnQueue.reduce((s, q) => s + ZOMBIES[q.type].hp + ZOMBIES[q.type].armor, 0);
    const early = this.wave > 0 && this.waveClock > 6 && aliveHp < this.waveHp * 0.4;
    if (this.waveClock >= this.nextWaveAt || early) {
      if (this.isFlagWave(this.wave + 1)) {
        if (this.waveClock < this.nextWaveAt && aliveHp > 0) return;
        this.flagPending = 5;
        this.setBanner('¡Se acerca una gran oleada de zombis!', 4.2, '#ff3a1a', 58);
        Sfx.play('siren');
        this.intense = true; Sfx.setTrack('intense');
      } else this.spawnWave();
    }
  }

  spawnWave() {
    this.wave++;
    const w = this.wave, L = this.L;
    if (L.endless) this.setStage(STAGE_CYCLE[Math.floor((w - 1) / 10) % 3]);
    const flag = this.isFlagWave(w);
    let budget = 1 + Math.floor(w * L.growth);
    if (!L.endless) budget = Math.min(budget, 18);
    if (flag) budget = Math.max(Math.round(budget * 1.8), 3) + Math.floor(w / 6);
    const list = flag ? ['flag'] : [];
    const allowed = L.zombies.filter(t => w >= MIN_WAVE[t]);
    while (budget > 0) {
      const cand = allowed.filter(t => ZOMBIES[t].cost <= budget);
      if (!cand.length) break;
      const weighted = [];
      for (const t of cand) { const wt = t === 'normal' ? 4 : t === 'football' || t === 'gargantuar' ? 1 : 2; for (let k = 0; k < wt; k++) weighted.push(t); }
      const t = pick(weighted);
      list.push(t); budget -= ZOMBIES[t].cost;
    }
    let hp = 0;
    for (const t of list) {
      const delay = t === 'flag' ? 0 : flag ? rand(1, 7) : rand(0, 3.5);
      this.spawnQueue.push({ type: t, row: pick(this.lanes), t: delay });
      hp += ZOMBIES[t].hp + ZOMBIES[t].armor;
    }
    this.waveHp = hp;
    this.waveClock = 0;
    this.nextWaveAt = flag ? 32 : 26 - Math.min(8, w * 0.35) + rand(0, 5);
    if (w === 1) Sfx.play('groan');
    if (L.endless && w > (Save.data.best || 0)) { Save.data.best = w; Save.save(); }
  }

  spawnZombie(type, row, x, extra) {
    const d = ZOMBIES[type];
    const z = {
      type, row, x: x || rand(1440, 1500), y: rowGroundY(row) + 6,
      hp: d.hp, maxHp: d.hp, armor: d.armor, armorMax: d.armor || 1,
      spd: ZOMBIE_BASE_SPEED * rand(0.88, 1.12), look: Art.zombieLook(type),
      state: 'walk', animT: rand(0, 10), slow: 0, frozen: 0, flash: 0, hitT: 0, lostArm: false, headless: false,
      dieT: 0, burnt: false, eatT: 0, hasPole: type === 'pole', jumpT: 0, enraged: false, stunT: 0,
      hasImp: type === 'gargantuar', impLook: Art.zombieLook('imp'), smashK: 0, garlicT: 0,
    };
    if (extra) Object.assign(z, extra);
    this.zombies.push(z);
    return z;
  }

  checkEnd() {
    if (this.L.endless) return;
    if (this.wave >= this.L.waves && !this.flagPending && !this.spawnQueue.length
        && !this.zombies.some(z => z.state !== 'dying')) {
      this.phase = 'won'; this.phaseT = 0;
      const pos = this.lastDeath || { x: 900, y: 500 };
      this.reward = { x: clamp(pos.x, GRID_X + 60, LAWN_RIGHT - 60), y: clamp(pos.y - 60, GRID_Y + 60, 820), t: 0, collected: false, ct: 0 };
      this.selected = null;
      Sfx.setTrack(STAGES[this.stage].music);
    }
  }

  // ---------------- Plantas ----------------
  alive(z) { return z.state !== 'dying' && !z.removed && z.state !== 'thrown'; }
  rowZombies(row) { return this.zombies.filter(z => z.row === row && this.alive(z)); }
  zombieAhead(row, x, maxX = ZOMBIE_VISIBLE_X) {
    return this.zombies.some(z => z.row === row && this.alive(z) && z.x > x - 20 && z.x < maxX);
  }
  cellBlocked(r, c) { return !!this.grid[r][c] || this.craters.some(k => k.r === r && k.c === c); }

  placePlant(type, row, col) {
    const d = PLANTS[type];
    const p = {
      type, row, col, x: cellCX(col), y: rowGroundY(row), hp: d.hp, maxHp: d.hp,
      t: 0, seed: rand(0, 10), fireT: rand(0.2, 1.2), recoil: 0, glow: 0, queue: [], pop: 0, squish: 0,
      sunT: rand(4, 7), armT: 15, armed: false, fuse: 0, mode: 'idle', biteT: 0, chewT: 0, dead: false, flash: 0,
      plantT: 0, attack: 0, tickT: 1, throwT: 0, holdT: 0,
    };
    this.grid[row][col] = p; this.plants.push(p);
    this.stats.planted++;
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
    if (p.attack > 0) p.attack = Math.max(0, p.attack - dt * 3);
    const T = p.type;
    if (SHOOTERS.includes(T)) {
      for (const q of p.queue) { q.t -= dt; if (q.t <= 0) { this.firePea(p, q.row, q.snow); q.done = true; } }
      p.queue = p.queue.filter(q => !q.done);
      p.fireT -= dt;
      let rows = [p.row];
      if (T === 'threepeater') rows = [p.row - 1, p.row, p.row + 1].filter(r => this.lanes.includes(r));
      const target = rows.some(r => this.zombieAhead(r, p.x));
      if (p.fireT <= 0 && target) {
        p.fireT = 1.4; p.recoil = 1;
        if (T === 'threepeater') rows.forEach(r => this.firePea(p, r, false));
        else {
          this.firePea(p, p.row, T === 'snowpea');
          if (T === 'repeater') p.queue.push({ t: 0.18, row: p.row, snow: false });
          if (T === 'gatling') for (let k = 1; k < 4; k++) p.queue.push({ t: k * 0.13, row: p.row, snow: false });
        }
      } else if (p.fireT < 0) p.fireT = 0;
    } else if (LOBBERS.includes(T)) {
      p.fireT -= dt;
      if (p.throwT > 0) {
        const prev = p.throwT; p.throwT += dt / 0.7;
        if (prev < 0.35 && p.throwT >= 0.35) this.fireLob(p);
        if (p.throwT >= 1) p.throwT = 0;
      } else if (p.fireT <= 0) {
        const tgt = this.lobTarget(p);
        if (tgt) { p.throwT = 0.001; p.fireT = 3; p.tgt = tgt; }
        else p.fireT = 0;
      }
    } else if (T === 'sunflower' || T === 'twinsunflower') {
      p.sunT -= dt;
      p.glow = clamp(1 - p.sunT, 0, 1);
      if (p.sunT <= 0) {
        p.sunT = rand(23, 25);
        const n = T === 'twinsunflower' ? 2 : 1;
        for (let k = 0; k < n; k++)
          this.suns.push({ x: p.x + rand(-10, 10), y: p.y - 70, ty: p.y - rand(10, 30), vx: rand(-70, 70), vy: -260 - k * 40, value: 25, state: 'pop', life: 0, t: 0 });
      }
    } else if (T === 'cherrybomb' || T === 'jalapeno' || T === 'iceshroom' || T === 'doomshroom') {
      const fuseT = T === 'doomshroom' ? 1.3 : T === 'iceshroom' ? 0.9 : 1.1;
      p.fuse = clamp(p.t / fuseT, 0, 1);
      if (p.t >= fuseT) {
        if (T === 'cherrybomb') this.explodeCherry(p);
        else if (T === 'jalapeno') this.explodeJalapeno(p);
        else if (T === 'iceshroom') this.freezeAll(p);
        else this.explodeDoom(p);
        this.removePlant(p);
      }
    } else if (T === 'potatomine') {
      if (!p.armed) {
        p.armT -= dt;
        if (p.armT <= 0) { p.armed = true; p.pop = 1; for (let i = 0; i < 8; i++) this.addPart({ kind: 'dirt', x: p.x + rand(-25, 25), y: p.y - 5, vx: rand(-90, 90), vy: rand(-220, -80), g: 600, life: 0.6, size: rand(3, 6), ground: p.y + 4 }); }
      } else {
        p.pop = Math.max(0, p.pop - dt * 3);
        const hit = this.rowZombies(p.row).find(z => z.x - p.x > -30 && z.x - p.x < 60 && z.state !== 'jump');
        if (hit) {
          for (const z of this.rowZombies(p.row)) if (Math.abs(z.x - p.x) < 95) this.blast(z, 1800);
          for (let i = 0; i < 26; i++) this.addPart({ kind: 'dirt', x: p.x + rand(-20, 20), y: p.y - 10, vx: rand(-260, 260), vy: rand(-420, -120), g: 700, life: 1, size: rand(4, 9), ground: p.y + 4 });
          this.addPart({ kind: 'flash', x: p.x, y: p.y - 30, life: 0.4, size: 110, color: '255,220,120' });
          this.addPart({ kind: 'text', x: p.x, y: p.y - 70, life: 1.3, text: '¡PATAPUM!', size: 40, vy: -30 });
          Sfx.play('potato'); this.shake = 0.25;
          this.removePlant(p);
        }
      }
    } else if (T === 'chomper') {
      if (p.mode === 'idle') {
        const cands = this.rowZombies(p.row).filter(z => z.x - p.x > -25 && z.x - p.x < 165 && z.state !== 'jump' && z.x < ZOMBIE_VISIBLE_X && z.type !== 'gargantuar');
        if (cands.length) { p.mode = 'bite'; p.biteT = 0; p.target = cands.reduce((a, b) => a.x < b.x ? a : b); }
      } else if (p.mode === 'bite') {
        const prev = p.biteT;
        p.biteT += dt / 0.7;
        if (prev < 0.55 && p.biteT >= 0.55) {
          const z = p.target;
          if (z && this.alive(z) && z.x - p.x < 175) {
            z.removed = true; this.lastDeath = { x: z.x, y: z.y }; this.stats.killed++;
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
    } else if (T === 'squash') {
      this.updateSquash(p, dt);
    } else if (T === 'spikeweed') {
      p.tickT -= dt;
      if (p.tickT <= 0) {
        p.tickT = 1;
        let any = false;
        for (const z of this.rowZombies(p.row)) {
          if (Math.abs(z.x - p.x) < 58 && z.state !== 'jump') { this.hitZombie(z, 20, 'ground'); any = true; }
        }
        if (any) { p.attack = 1; Sfx.play('spike'); }
      }
    } else if (T === 'magnet') {
      if (p.holdT > 0) { p.holdT -= dt; if (p.holdT <= 0) p.holding = null; }
      else {
        let best = null, bd = 1e9;
        for (const z of this.zombies) {
          if (!this.alive(z) || z.armor <= 0 || !ZOMBIES[z.type].metal || z.x > ZOMBIE_VISIBLE_X) continue;
          const dx = z.x - p.x, dr = Math.abs(z.row - p.row);
          if (dr > 2 || dx < -COL_W * 1.5 || dx > COL_W * 3) continue;
          const d = Math.hypot(dx, dr * ROW_H);
          if (d < bd) { bd = d; best = z; }
        }
        if (best) {
          p.holding = best.type; p.holdT = 15;
          best.armor = 0;
          if (best.type === 'football') best.footballBare = true;
          this.addPart({ kind: 'armorfly', type: best.type, x: best.x - 10, y: best.y - 150, tx: p.x, ty: p.y - 70, life: 0.45 });
          Sfx.play('magnet');
        }
      }
    }
  }

  updateSquash(p, dt) {
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
        for (const z of this.rowZombies(p.row)) if (Math.abs(z.x - p.x) < 75) this.blast(z, 1800, true);
        for (let i = 0; i < 14; i++) this.addPart({ kind: 'dirt', x: p.x + rand(-40, 40), y: p.y, vx: rand(-200, 200), vy: rand(-250, -60), g: 700, life: 0.7, size: rand(3, 7), ground: p.y + 4 });
        Sfx.play('squash'); this.shake = 0.2;
      }
    } else if (p.mode === 'smash') {
      p.biteT += dt;
      p.squish = Math.max(0, 1 - p.biteT * 1.5) * 0.6 + 0.4;
      if (p.biteT > 0.9) this.removePlant(p);
    }
  }

  firePea(p, row, snow) {
    this.peas.push({ x: p.x + 42, y: p.y - 64, ty: rowGroundY(row) - 64, row, kind: snow ? 'snow' : 'pea', dmg: 20, dead: false, torched: new Set() });
    Sfx.play('shoot');
  }
  lobTarget(p) {
    let best = null;
    for (const z of this.rowZombies(p.row)) {
      if (z.x > p.x - 10 && z.x < ZOMBIE_VISIBLE_X && (!best || z.x < best.x)) best = z;
    }
    return best;
  }
  fireLob(p) {
    const z = p.tgt && this.alive(p.tgt) ? p.tgt : this.lobTarget(p);
    if (!z) return;
    const T = 1.0;
    const move = z.state === 'walk' ? z.spd * (z.slow > 0 ? 0.5 : 1) * T * 0.9 : 0;
    const tx = z.x - move - 6;
    this.lobs.push({ x0: p.x - 30, y0: p.y - 110, x1: tx, y1: z.y - 70, t: 0, T, row: p.row, winter: p.type === 'wintermelon', rot: 0 });
    Sfx.play('lob');
  }

  explodeCherry(p) {
    for (const z of this.zombies) {
      if (!this.alive(z)) continue;
      if (Math.abs(z.row - p.row) <= 1 && Math.abs(z.x - p.x) < COL_W * 1.5 + 30 && z.x < ZOMBIE_VISIBLE_X + 60) this.blast(z, 1800);
    }
    this.boom(p.x, p.y - 40, 1);
    this.addPart({ kind: 'text', x: p.x, y: p.y - 110, life: 1.2, text: '¡BUM!', size: 70, vy: -20, color: '#ffdd33' });
    Sfx.play('explode'); this.shake = 0.5;
  }
  explodeDoom(p) {
    for (const z of this.zombies) {
      if (!this.alive(z) || z.x > ZOMBIE_VISIBLE_X + 60) continue;
      const d = Math.hypot(z.x - p.x, (z.row - p.row) * ROW_H * 0.85);
      if (d < COL_W * 3.6) this.blast(z, 1800);
    }
    this.boom(p.x, p.y - 40, 2.4);
    for (let i = 0; i < 30; i++) this.addPart({ kind: 'smoke', x: p.x + rand(-40, 40), y: p.y - rand(40, 240), vx: rand(-60, 60), vy: rand(-140, -30), life: rand(1.5, 2.6), size: rand(30, 60), color: '90,40,110' });
    this.craters.push({ r: p.row, c: p.col, t: 45, max: 45 });
    this.flash = { t: 0, dur: 0.8, color: '255,230,255' };
    this.addPart({ kind: 'text', x: p.x, y: p.y - 160, life: 1.6, text: '¡KABUUM!', size: 90, vy: -20, color: '#ff8cff' });
    Sfx.play('doom'); this.shake = 1.1;
  }
  freezeAll(p) {
    for (const z of this.zombies) {
      if (!this.alive(z) || z.x > ZOMBIE_VISIBLE_X + 40) continue;
      z.frozen = 4; z.slow = Math.max(z.slow, 14); this.hitZombie(z, 20, 'explosion');
    }
    for (let i = 0; i < 60; i++) this.addPart({ kind: 'snowflake', x: rand(GRID_X, LAWN_RIGHT), y: rand(GRID_Y - 60, H), vx: rand(-30, 30), vy: rand(20, 80), life: rand(1, 2.2), size: rand(3, 7), rot: rand(0, 6), vr: rand(-3, 3) });
    this.flash = { t: 0, dur: 0.7, color: '200,240,255' };
    Sfx.play('icefreeze');
  }
  explodeJalapeno(p) {
    for (const z of this.rowZombies(p.row)) if (z.x < ZOMBIE_VISIBLE_X + 60) this.blast(z, 1800);
    for (let x = GRID_X; x < LAWN_RIGHT + 40; x += 22) {
      for (let k = 0; k < 2; k++)
        this.addPart({ kind: 'fire', x: x + rand(-10, 10), y: p.y - rand(0, 30), vx: rand(-20, 20), vy: rand(-160, -40), g: -40, life: rand(0.6, 1.2), size: rand(18, 36), delay: Math.abs(x - p.x) / 2500 });
    }
    Sfx.play('fire'); this.shake = 0.35;
  }
  boom(x, y, s) {
    this.addPart({ kind: 'flash', x, y, life: 0.5, size: 260 * s, color: '255,200,80' });
    for (let i = 0; i < 40 * s; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(100, 520) * Math.sqrt(s);
      this.addPart({ kind: 'fire', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 - 60, g: 120, life: rand(0.5, 1), size: rand(14, 30) * Math.sqrt(s) });
    }
    for (let i = 0; i < 16 * s; i++) this.addPart({ kind: 'smoke', x: x + rand(-60, 60) * s, y: y - rand(0, 70), vx: rand(-40, 40), vy: rand(-80, -20), life: rand(1, 1.8), size: rand(20, 40) * Math.sqrt(s) });
  }

  // ---------------- Zombis ----------------
  // kind: 'pea' (frontal), 'lob' (por arriba), 'ground' (desde el suelo), 'explosion'
  hitZombie(z, dmg, kind = 'pea', snow = false) {
    if (!this.alive(z)) return;
    z.flash = 0.1;
    if (kind === 'pea') z.hitT = 0.12;
    const shield = ZOMBIES[z.type].shield;
    const bypass = shield && (kind === 'lob' || kind === 'ground');
    if (z.armor > 0 && !bypass) {
      const t = z.type;
      Sfx.play(ZOMBIES[t].metal ? 'clank' : t === 'cone' ? 'plastic' : 'splat');
      z.armor -= dmg;
      if (z.armor <= 0) { dmg = -z.armor; z.armor = 0; this.dropArmor(z); }
      else dmg = 0;
    } else if (kind === 'pea') Sfx.play('splat');
    if (snow) { if (z.slow <= 0) Sfx.play('freeze'); z.slow = 10; }
    if (dmg > 0) {
      z.hp -= dmg;
      if (!z.lostArm && z.hp < z.maxHp * 0.5) {
        z.lostArm = true;
        this.addPart({ kind: 'arm', data: z, x: z.x - 30, y: z.y - 100, vx: rand(-60, 20), vy: -160, g: 700, life: 1.6, rot: 0, vr: rand(-6, 6), ground: z.y - 4 });
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
      const door = z.type === 'screendoor';
      this.addPart({ kind: 'armor', type: z.type, x: z.x - (door ? 44 : 12), y: z.y - (door ? 90 : 150), vx: rand(20, 80), vy: -220, g: 800, life: 1.6, rot: 0, vr: rand(2, 6), ground: z.y - 6 });
      Sfx.play('armorfall');
    }
  }
  killZombie(z, squash) {
    if (z.state === 'dying') return;
    z.state = 'dying'; z.dieT = 0; z.hp = 0; z.armor = 0; z.squashed = squash; z.frozen = 0;
    this.lastDeath = { x: z.x, y: z.y };
    this.stats.killed++;
    if (!squash) {
      z.headless = true;
      this.addPart({ kind: 'head', data: { type: z.type, look: z.look, enraged: z.enraged }, x: z.x - 20, y: z.y - (z.type === 'gargantuar' ? 230 : z.type === 'imp' ? 100 : 150),
        vx: rand(20, 90), vy: -200, g: 900, life: 2, rot: 0, vr: rand(3, 7), ground: z.y - 16 });
    }
  }
  blast(z, dmg, squash) {
    if (!this.alive(z)) return;
    if (z.hp + z.armor <= dmg) { this.killZombie(z, true); z.burnt = !squash; }
    else { z.hp -= dmg; z.flash = 0.2; z.hitT = 0.12; z.lostArm = true; }
  }

  updateZombie(z, dt) {
    if (z.flash > 0) z.flash -= dt;
    if (z.hitT > 0) z.hitT -= dt;
    if (z.state === 'dying') {
      const prev = z.dieT;
      z.dieT += dt;
      if (z.burnt && z.dieT > 0.7 && !z.ashed) {
        z.ashed = true;
        const s = z.type === 'gargantuar' ? 1.7 : 1;
        for (let i = 0; i < 18 * s; i++) this.addPart({ kind: 'ash', x: z.x + rand(-25, 25) * s, y: z.y - rand(0, 150) * s, vx: rand(-30, 30), vy: rand(-30, 30), g: 300, life: rand(0.6, 1.2), size: rand(3, 7), ground: z.y });
      }
      if (!z.burnt && !z.squashed && prev < 0.85 && z.dieT >= 0.85) {
        for (let i = 0; i < 8; i++) this.addPart({ kind: 'smoke', x: z.x + rand(10, 120), y: z.y - rand(0, 10), vx: rand(-40, 60), vy: rand(-40, -10), life: rand(0.5, 0.9), size: rand(8, 16), color: '140,120,90' });
        Sfx.play('thud');
      }
      if (z.dieT > (z.burnt ? 1.4 : 2.6)) z.removed = true;
      return;
    }
    if (z.state === 'thrown') {
      z.flyT += dt / 1.0;
      const k = clamp(z.flyT, 0, 1);
      z.x = z.fromX + (z.toX - z.fromX) * k;
      z.lift = Math.sin(k * Math.PI) * 260;
      if (z.flyT >= 1) { z.lift = 0; z.state = 'walk'; z.stunT = 0.4; Sfx.play('thud'); }
      return;
    }
    if (z.frozen > 0) { z.frozen -= dt; return; }
    const slowMul = z.slow > 0 ? 0.5 : 1;
    if (z.slow > 0) z.slow -= dt;
    z.animT += dt * slowMul;
    if (z.stunT > 0) { z.stunT -= dt; z.state = 'stun'; return; }
    if (z.state === 'stun') z.state = 'walk';

    if (z.state === 'jump') {
      z.jumpT += dt / 1.0;
      const k = clamp(z.jumpT, 0, 1);
      z.x = z.jumpFrom + (z.jumpTo - z.jumpFrom) * k;
      if (z.jumpT >= 1) { z.state = 'walk'; z.hasPole = false; z.stunT = 0.25; }
      return;
    }
    // Gargantúa: golpe y lanzamiento de diablillo
    if (z.type === 'gargantuar') {
      if (z.state === 'smash') {
        const prev = z.smashK;
        z.smashK += dt * slowMul / 1.4;
        if (prev < 0.68 && z.smashK >= 0.68) {
          const tgt = z.smashTarget;
          if (tgt && !tgt.dead) this.removePlant(tgt);
          this.shake = 0.3; Sfx.play('smash');
          for (let i = 0; i < 14; i++) this.addPart({ kind: 'dirt', x: z.x - 90 + rand(-30, 30), y: z.y, vx: rand(-200, 200), vy: rand(-260, -60), g: 700, life: 0.7, size: rand(4, 8), ground: z.y + 2 });
        }
        if (z.smashK >= 1) { z.state = 'walk'; z.smashK = 0; }
        return;
      }
      if (z.state === 'throw') {
        const prev = z.throwK;
        z.throwK += dt / 0.9;
        if (prev < 0.5 && z.throwK >= 0.5) {
          z.hasImp = false;
          const toX = Math.max(GRID_X + COL_W * 1.5, z.x - rand(380, 480));
          this.spawnZombie('imp', z.row, z.x, { state: 'thrown', fromX: z.x, toX, flyT: 0, lift: 0, look: z.impLook });
          Sfx.play('impthrow');
        }
        if (z.throwK >= 1) z.state = 'walk';
        return;
      }
      if (z.hasImp && z.hp < z.maxHp / 2 && z.x > GRID_X + COL_W * 4 && z.x < ZOMBIE_VISIBLE_X) { z.state = 'throw'; z.throwK = 0; return; }
    }
    // planta delante
    let target = null;
    const reach = z.type === 'gargantuar' ? 95 : z.hasPole ? 90 : 58;
    for (const p of this.plants) {
      if (p.row !== z.row || p.dead || p.untargetable) continue;
      if (p.type === 'spikeweed' && z.type !== 'gargantuar') continue;
      const d = z.x - p.x;
      if (d > -20 && d < reach && (!target || p.x > target.x)) target = p;
    }
    if (target && target.type === 'potatomine' && target.armed && z.type !== 'gargantuar') target = null;
    if (target && z.type === 'gargantuar') { z.state = 'smash'; z.smashK = 0; z.smashTarget = target; return; }
    if (target && z.hasPole) {
      if (target.type === 'tallnut') { z.hasPole = false; this.addPart({ kind: 'pole', x: z.x, y: z.y - 80, vx: 60, vy: -100, g: 600, life: 1.2, rot: 0, vr: 3, ground: z.y - 4 }); }
      else { z.state = 'jump'; z.jumpT = 0; z.jumpFrom = z.x; z.jumpTo = target.x - 72; Sfx.play('plastic'); return; }
    }
    if (target && z.x - target.x < 58) {
      if (z.state !== 'lane') z.state = 'eat';
      target.hp -= EAT_DPS * slowMul * dt;
      target.flash = 0.05;
      z.eatT -= dt;
      if (z.eatT <= 0) { z.eatT = 0.45 / slowMul; Sfx.play('chomp'); }
      if (target.type === 'garlic') {
        z.garlicT += dt;
        if (z.garlicT > 0.45) { z.garlicT = 0; this.divert(z); }
      }
      if (target.hp <= 0) { this.removePlant(target); Sfx.play('gulp'); }
    } else {
      if (z.state !== 'lane') z.state = 'walk';
      let mul = ZOMBIES[z.type].speed;
      if (z.type === 'pole' && !z.hasPole) mul = 1;
      if (z.enraged) mul = 2.6;
      z.x -= z.spd * mul * slowMul * Art.stepPulse(z) * dt;
    }
    if (z.state === 'lane') {
      z.laneT += dt / 1.1;
      const k = clamp(z.laneT, 0, 1);
      z.y = z.laneFrom + (z.laneTo - z.laneFrom) * (k * k * (3 - 2 * k));
      if (z.laneT >= 1) { z.state = 'walk'; z.y = z.laneTo; }
    }
    const m = this.mowers[z.row];
    if (m && m.state === 'idle' && z.x < GRID_X - 8) { m.state = 'run'; Sfx.play('mower'); }
    if (z.x < HOUSE_X && (!m || m.state === 'gone') && this.phase === 'play') {
      this.phase = 'lost'; this.phaseT = 0; this.selected = null;
      Sfx.play('lose'); Sfx.setTrack('night');
    }
  }
  divert(z) {
    const opts = [z.row - 1, z.row + 1].filter(r => this.lanes.includes(r));
    if (!opts.length) return;
    const nr = pick(opts);
    z.state = 'lane'; z.laneT = 0; z.laneFrom = z.y; z.laneTo = rowGroundY(nr) + 6; z.row = nr;
    z.x -= 6;
    Sfx.play('garlic');
    this.addPart({ kind: 'text', x: z.x, y: z.y - 180, life: 0.9, text: '¡Puaj!', size: 28, vy: -30, color: '#e8d8ff' });
  }

  // ---------------- Proyectiles ----------------
  hitbox(z) { return z.type === 'gargantuar' ? [z.x - 55, z.x + 60] : z.type === 'imp' ? [z.x - 20, z.x + 25] : [z.x - 32, z.x + 40]; }
  updatePeas(dt) {
    const torches = this.plants.filter(p => p.type === 'torchwood' && !p.dead);
    for (const pe of this.peas) {
      const ox = pe.x;
      pe.x += 560 * dt;
      if (pe.y !== pe.ty) { const d = pe.ty - pe.y; pe.y += Math.sign(d) * Math.min(Math.abs(d), 420 * dt); }
      if (pe.x > W + 40) { pe.dead = true; continue; }
      for (const tw of torches) {
        if (tw.row === pe.row && ox < tw.x && pe.x >= tw.x && !pe.torched.has(tw)) {
          pe.torched.add(tw);
          if (pe.kind === 'snow') pe.kind = 'pea';
          else if (pe.kind === 'pea') { pe.kind = 'fire'; pe.dmg = 40; Sfx.play('firepea'); }
        }
      }
      let best = null;
      for (const z of this.zombies) {
        if (z.row !== pe.row || !this.alive(z) || z.state === 'jump') continue;
        if (z.x > ZOMBIE_VISIBLE_X + 20) continue;
        const [a, b] = this.hitbox(z);
        if (pe.x > a && pe.x < b && (!best || z.x < best.x)) best = z;
      }
      if (best) {
        pe.dead = true;
        if (pe.kind === 'fire') {
          best.slow = 0;
          this.hitZombie(best, pe.dmg, 'pea');
          for (const z of this.rowZombies(pe.row)) if (z !== best && Math.abs(z.x - best.x) < 60) this.hitZombie(z, 13, 'explosion');
          for (let i = 0; i < 6; i++) this.addPart({ kind: 'fire', x: pe.x, y: pe.y, vx: rand(-80, 40), vy: rand(-90, 30), life: 0.35, size: rand(10, 18) });
        } else {
          this.hitZombie(best, pe.dmg, 'pea', pe.kind === 'snow');
          const col = pe.kind === 'snow' ? '160,220,255' : '120,200,40';
          for (let i = 0; i < 6; i++) this.addPart({ kind: 'splat', x: pe.x, y: pe.y, vx: rand(-140, 60), vy: rand(-140, 80), g: 400, life: 0.35, size: rand(3, 6), color: col });
        }
      }
    }
    this.peas = this.peas.filter(p => !p.dead);
  }
  updateLobs(dt) {
    for (const l of this.lobs) {
      l.t += dt; l.rot += dt * 6;
      if (l.t >= l.T) {
        l.dead = true;
        let main = null, bd = 80;
        for (const z of this.rowZombies(l.row)) { const d = Math.abs(z.x - l.x1); if (d < bd) { bd = d; main = z; } }
        if (main) this.hitZombie(main, 80, 'lob', l.winter);
        for (const z of this.zombies) {
          if (!this.alive(z) || z === main || Math.abs(z.row - l.row) > 1 || z.x > ZOMBIE_VISIBLE_X + 20) continue;
          if (Math.abs(z.x - l.x1) < 100) this.hitZombie(z, 26, 'lob', l.winter);
        }
        Sfx.play('melon');
        const col = l.winter ? '170,230,255' : '120,200,60';
        for (let i = 0; i < 14; i++) this.addPart({ kind: 'splat', x: l.x1, y: l.y1 + 20, vx: rand(-220, 220), vy: rand(-260, 20), g: 600, life: 0.5, size: rand(4, 9), color: col });
        if (l.winter) for (let i = 0; i < 10; i++) this.addPart({ kind: 'snowflake', x: l.x1 + rand(-60, 60), y: l.y1 + rand(-20, 40), vx: rand(-40, 40), vy: rand(-40, 20), life: 0.9, size: rand(3, 6), rot: 0, vr: 2 });
      }
    }
    this.lobs = this.lobs.filter(l => !l.dead);
  }

  // ---------------- Soles ----------------
  updateSuns(dt) {
    for (const s of this.suns) {
      s.t += dt;
      if (s.state === 'fall') { s.y += s.vy * dt; if (s.y >= s.ty) { s.y = s.ty; s.state = 'ground'; } }
      else if (s.state === 'pop') {
        s.vy += 700 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.vy > 0 && s.y >= s.ty) { s.y = s.ty; s.state = 'ground'; }
      } else if (s.state === 'ground') {
        s.life += dt;
        if (Save.data.autoSun && s.life > 0.7) this.collectSun(s);
        if (s.life > 10) s.dead = true;
      } else if (s.state === 'fly') {
        const tx = BAR.x + 52, ty = BAR.y + 46;
        const k = 1 - Math.pow(0.0008, dt);
        s.x += (tx - s.x) * k; s.y += (ty - s.y) * k;
        s.scale = Math.max(0.6, (s.scale || 1) - dt * 0.6);
        if (Math.random() < 0.5) this.addPart({ kind: 'sparkle', x: s.x + rand(-14, 14), y: s.y + rand(-14, 14), life: 0.4, size: rand(2, 4) });
        if (Math.hypot(tx - s.x, ty - s.y) < 12) { s.dead = true; this.sun = Math.min(9990, this.sun + s.value); this.stats.sun += s.value; this.sunPulse = 0.3; }
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
        if (z.row === m.row && this.alive(z) && Math.abs(z.x - m.x) < 60 && z.x < ZOMBIE_VISIBLE_X + 40) this.killZombie(z, false);
      }
      if (Math.random() < 0.6) this.addPart({ kind: 'grass', x: m.x - 30, y: rowGroundY(m.row) - 4, vx: rand(-160, -40), vy: rand(-160, -60), g: 500, life: 0.6, size: rand(2, 4) });
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
    if (this.parts.length > 900) this.parts.splice(0, this.parts.length - 900);
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
  canPlace(type, cell) { return cell && this.lanes.includes(cell.r) && !this.cellBlocked(cell.r, cell.c); }

  onDown(x, y, button) {
    if (this.paused) { UI.hit(x, y); return; }
    if (button === 2) { this.selected = null; return; }
    if (this.phase === 'play') {
      for (let i = this.suns.length - 1; i >= 0; i--) {
        const s = this.suns[i];
        if (s.state !== 'fly' && Math.hypot(s.x - x, s.y - y) < 52) { this.collectSun(s); return; }
      }
    }
    if (this.phase === 'won' && this.reward && !this.reward.collected) {
      if (Math.hypot(this.reward.x - x, this.reward.y - y) < 80) {
        this.reward.collected = true; this.reward.ct = 0; Sfx.play('win');
        this.suns.forEach(s => this.collectSun(s));
        this.app.markDone(this.levelIdx);
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
    if (/^[0-9]$/.test(k)) this.selectPacket(k === '0' ? 9 : +k - 1);
    if (k === 's' || k === 'S') { if (this.phase === 'play') this.selected = this.selected === 'shovel' ? null : 'shovel'; }
    if (k === ' ' && this.phase === 'play') this.paused = true;
  }

  // ------------------------------------------------------------------
  //  Dibujo
  // ------------------------------------------------------------------
  draw(ctx) {
    const t = this.time;
    ctx.save();
    if (this.shake > 0) ctx.translate(rand(-1, 1) * this.shake * 16, rand(-1, 1) * this.shake * 16);
    ctx.drawImage(this.app.getBg(this.stage), 0, 0, W, H);
    for (const c of this.craters) Art.crater(ctx, cellCX(c.c), rowGroundY(c.r), c.t / c.max);

    if (this.phase === 'choose' || this.phase === 'ready') {
      const fade = this.phase === 'ready' ? clamp(1 - this.phaseT / 0.8, 0, 1) : 1;
      if (fade > 0) {
        ctx.save(); ctx.globalAlpha = fade;
        for (const z of this.preview) { ctx.save(); ctx.translate(z.x, z.y); Art.shadow(ctx, 0, 0, 34, 9); ctx.scale(0.9, 0.9); Art.zombie(ctx, z, t); ctx.restore(); }
        ctx.restore();
      }
    }

    if (this.phase === 'play' && typeof this.selected === 'number') {
      const cell = this.cellAt(this.app.mouse.x, this.app.mouse.y);
      if (cell) {
        ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#fff';
        ctx.fillRect(GRID_X, GRID_Y + cell.r * ROW_H, COLS * COL_W, ROW_H);
        ctx.fillRect(GRID_X + cell.c * COL_W, GRID_Y, COL_W, ROWS * ROW_H);
        ctx.restore();
      }
    }

    for (let r = 0; r < ROWS; r++) {
      const m = this.mowers[r];
      if (m && m.state !== 'gone') Art.mower(ctx, m.x, rowGroundY(r) + 4, t, m.state === 'run');
      for (const p of this.plants) if (p.row === r && p.type === 'spikeweed') this.drawPlant(ctx, p, t);
      for (const p of this.plants) if (p.row === r && p.type !== 'spikeweed') this.drawPlant(ctx, p, t);
      const zs = this.zombies.filter(z => z.row === r && z.state !== 'thrown').sort((a, b) => b.x - a.x);
      for (const z of zs) this.drawZombie(ctx, z, t);
      for (const pe of this.peas) if (pe.row === r) Art.pea(ctx, pe.x, pe.y, pe.kind, t);
    }
    for (const z of this.zombies) if (z.state === 'thrown') this.drawZombie(ctx, z, t);
    for (const l of this.lobs) {
      const k = l.t / l.T;
      const x = l.x0 + (l.x1 - l.x0) * k, y = l.y0 + (l.y1 - l.y0) * k - Math.sin(k * Math.PI) * 190;
      Art.shadow(ctx, x, rowGroundY(l.row), 16, 5, 0.2);
      Art.melonFruit(ctx, x, y, l.rot, l.winter);
    }
    this.drawParts(ctx, false);
    for (const a of this.ambient) if (a.kind !== 'firefly') Art.ambient(ctx, a, t);

    // iluminación del escenario
    const tint = STAGES[this.stage].tint;
    if (tint) {
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = tint; ctx.fillRect(-20, -20, W + 40, H + 40); ctx.restore();
      if (this.stage === 'night') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const ly of [230, 690]) Art.lamp(ctx, LAWN_RIGHT + 30, ly, true);
        ctx.restore();
      }
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const a of this.ambient) if (a.kind === 'firefly') Art.ambient(ctx, a, t);
    ctx.restore();
    this.drawParts(ctx, true);

    if (this.phase === 'play' && !this.paused) this.drawCursorGhost(ctx, t);
    for (const s of this.suns) {
      let a = 1;
      if (s.state === 'ground' && s.life > 8) a = Math.sin(s.life * 18) > 0 ? 1 : 0.4;
      ctx.save(); ctx.globalAlpha = a; Art.sun(ctx, s.x, s.y, t + s.t, s.scale || 1); ctx.restore();
    }
    ctx.restore();

    const vg = ctx.createRadialGradient(W / 2 + 60, H / 2 + 40, H * 0.45, W / 2 + 60, H / 2 + 40, W * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, this.stage === 'night' ? 'rgba(0,0,20,0.45)' : 'rgba(0,0,0,0.22)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (this.flash) {
      ctx.save(); ctx.globalAlpha = 0.85 * (1 - this.flash.t / this.flash.dur);
      ctx.fillStyle = `rgb(${this.flash.color})`; ctx.fillRect(0, 0, W, H); ctx.restore();
    }

    this.drawHUD(ctx, t);
    if (this.reward) this.drawReward(ctx, t);

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
      Art.rrect(ctx, W / 2 + 40 - w / 2, 790, w, 52, 14); ctx.fillStyle = 'rgba(30,20,10,0.78)'; ctx.fill();
      UI.text(ctx, this.tip.text, W / 2 + 40, 817, 26, { font: UI.BODY, stroke: null, weight: 'bold' });
      ctx.restore();
    }

    if (this.phase === 'choose') this.drawChooser(ctx, t);
    if (this.phase === 'lost') this.drawLost(ctx, t);
    if (this.paused) this.drawPause(ctx);
  }

  drawPlant(ctx, p, t) {
    ctx.save();
    ctx.translate(p.x, p.y - (p.lift || 0));
    if (p.type !== 'spikeweed') Art.shadow(ctx, 0, (p.lift || 0) + 2, 38 - (p.lift || 0) * 0.1, 10);
    const grow = Math.min(1, p.plantT / 0.18);
    const sq = 1 + Math.sin(Math.min(1, p.plantT / 0.3) * Math.PI) * 0.12;
    ctx.scale(grow * sq, grow * (2 - sq));
    if (p.flash > 0) Art.setTint([255, 255, 255], 0.25);
    const nut = p.type === 'wallnut' || p.type === 'tallnut' || p.type === 'garlic';
    const s = {
      seed: p.seed, recoil: p.recoil, glow: p.glow, fuse: p.fuse, armed: p.armed, pop: p.pop, mode: p.mode,
      biteT: p.biteT, squish: p.type === 'squash' && p.mode === 'smash' ? p.squish : 0, attack: p.attack,
      throwT: p.throwT, loaded: p.fireT < 1.5 || p.throwT > 0, holding: p.holding,
      dmg: nut ? (p.hp < p.maxHp / 3 ? 2 : p.hp < p.maxHp * 2 / 3 ? 1 : 0) : 0,
    };
    Art.plant(ctx, p.type, t + p.seed, s);
    if (p.type === 'magnet' && p.holding) {
      ctx.save(); ctx.translate(0, -88); ctx.scale(0.55, 0.55); ctx.rotate(0.2); Art.armorPiece(ctx, p.holding); ctx.restore();
    }
    Art.setTint(null, 0);
    ctx.restore();
  }

  drawZombie(ctx, z, t) {
    ctx.save();
    const x = z.x, y = z.y;
    const big = z.type === 'gargantuar' ? 1.7 : z.type === 'imp' ? 0.7 : 1;
    if (z.state === 'jump') {
      const k = clamp(z.jumpT, 0, 1);
      const lift = Math.sin(k * Math.PI) * 130;
      Art.shadow(ctx, x, y, 34, 9);
      Art.line(ctx, [z.jumpFrom - 70, y, x - 10, y - lift - 90], 5, '#d8b060', '#4a3510', 2);
      ctx.translate(x, y - lift); ctx.rotate(-k * 0.6 + 0.2);
    } else if (z.state === 'thrown') {
      Art.shadow(ctx, x, y, 20, 6);
      ctx.translate(x, y - (z.lift || 0)); ctx.rotate(-z.flyT * Math.PI * 2);
    } else {
      if (z.state !== 'dying' || z.dieT < 1.5) Art.shadow(ctx, x, y, 34 * big, 9 * big);
      ctx.translate(x, y);
    }
    let alpha = 1;
    if (z.state === 'dying') {
      if (z.burnt) {
        Art.setTint([25, 18, 12], 0.9);
        const k = clamp((z.dieT - 0.7) / 0.6, 0, 1);
        ctx.scale(1 + k * 0.2, 1 - k); alpha = 1 - k * 0.6;
      } else if (z.squashed) {
        const k = clamp(z.dieT / 0.15, 0, 1);
        ctx.scale(1 + k * 0.5, 1 - k * 0.8); alpha = clamp((2.6 - z.dieT) / 0.6, 0, 1);
      } else {
        // se tambalea, se le doblan las rodillas y cae de espaldas con rebote
        const k = clamp((z.dieT - 0.35) / 0.5, 0, 1);
        const bounce = z.dieT > 0.85 ? Math.sin(clamp((z.dieT - 0.85) / 0.25, 0, 1) * Math.PI) * 0.08 : 0;
        ctx.rotate(k * k * 1.45 - bounce - (z.dieT < 0.35 ? Math.sin(z.dieT / 0.35 * Math.PI) * 0.08 : 0));
        alpha = clamp((2.6 - z.dieT) / 0.6, 0, 1);
      }
    } else if (z.flash > 0) Art.setTint([255, 255, 255], 0.45);
    else if (z.frozen > 0) Art.setTint([150, 210, 255], 0.55);
    else if (z.slow > 0) Art.setTint([80, 150, 255], 0.42);
    else if (z.enraged) Art.setTint([255, 60, 30], 0.12);
    ctx.globalAlpha *= alpha;
    const zz = z.state === 'stun' || z.state === 'throw' ? Object.assign({}, z, { state: 'idle' }) : z;
    Art.zombie(ctx, zz, t);
    Art.setTint(null, 0);
    if (z.frozen > 0) Art.iceBlock(ctx, z, t);
    ctx.restore();
    if (Save.data.hpBars && this.alive(z) && z.x < ZOMBIE_VISIBLE_X) {
      const max = z.maxHp + (ZOMBIES[z.type].armor || 0);
      const v = (z.hp + z.armor) / max;
      const bw = 50 * Math.min(1.4, big), by = y - 200 * big - 6;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - bw / 2 - 2, by - 2, bw + 4, 9);
      ctx.fillStyle = v > 0.5 ? '#6ad04a' : v > 0.25 ? '#f0c030' : '#e8402a'; ctx.fillRect(x - bw / 2, by, bw * clamp(v, 0, 1), 5);
    }
  }

  drawParts(ctx, glow) {
    const GLOW = { fire: 1, flash: 1, text: 1, sparkle: 1, snowflake: 1 };
    for (const p of this.parts) {
      if (p.delay > 0 || !!GLOW[p.kind] !== glow) continue;
      const k = p.t / p.life;
      ctx.save();
      switch (p.kind) {
        case 'dirt': ctx.globalAlpha = 1 - k * k; Art.circle(ctx, p.x, p.y, p.size); ctx.fillStyle = '#6b4520'; ctx.fill(); break;
        case 'grass': ctx.globalAlpha = 1 - k; ctx.fillStyle = '#5ab02a'; ctx.fillRect(p.x, p.y, p.size, p.size * 2.5); break;
        case 'splat': ctx.globalAlpha = 1 - k; Art.circle(ctx, p.x, p.y, p.size * (1 - k * 0.5)); ctx.fillStyle = `rgb(${p.color})`; ctx.fill(); break;
        case 'ash': ctx.globalAlpha = 1 - k; ctx.fillStyle = '#2a2420'; ctx.fillRect(p.x, p.y, p.size, p.size); break;
        case 'sparkle': ctx.globalAlpha = 1 - k; ctx.fillStyle = '#fff6b0'; Art.circle(ctx, p.x, p.y, p.size * (1 - k)); ctx.fill(); break;
        case 'snowflake': {
          ctx.globalAlpha = 1 - k; ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.strokeStyle = '#eaf8ff'; ctx.lineWidth = 1.6;
          for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-p.size, 0); ctx.lineTo(p.size, 0); ctx.stroke(); }
          break;
        }
        case 'fire': {
          ctx.globalCompositeOperation = 'lighter';
          const r = p.size * (1 - k * 0.5);
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          g.addColorStop(0, `rgba(255,240,150,${1 - k})`); g.addColorStop(0.4, `rgba(255,120,20,${0.8 * (1 - k)})`); g.addColorStop(1, 'rgba(200,20,0,0)');
          ctx.fillStyle = g; Art.circle(ctx, p.x, p.y, r); ctx.fill(); break;
        }
        case 'smoke': ctx.globalAlpha = 0.45 * (1 - k); Art.circle(ctx, p.x, p.y, p.size * (1 + k)); ctx.fillStyle = p.color ? `rgb(${p.color})` : '#3a3530'; ctx.fill(); break;
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
          ctx.translate(p.x, p.y); ctx.rotate(p.rot); Art.zombieArm(ctx, p.data); break;
        case 'armor':
          ctx.globalAlpha = clamp((p.life - p.t) / 0.4, 0, 1);
          ctx.translate(p.x, p.y); ctx.rotate(p.rot); Art.armorPiece(ctx, p.type); break;
        case 'armorfly': {
          const e = k * k;
          ctx.translate(p.x + (p.tx - p.x) * e, p.y + (p.ty - p.y) * e - Math.sin(k * Math.PI) * 40); ctx.scale(1 - k * 0.45, 1 - k * 0.45);
          Art.armorPiece(ctx, p.type); break;
        }
        case 'pole':
          ctx.globalAlpha = clamp((p.life - p.t) / 0.4, 0, 1);
          ctx.translate(p.x, p.y); ctx.rotate(p.rot); Art.line(ctx, [-80, 0, 80, 0], 5, '#d8b060', '#4a3510', 2); break;
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
    const bw = this.barW;
    Art.rrect(ctx, BAR.x, BAR.y, bw, BAR.ph + 10, 14);
    ctx.fillStyle = Art.lg(ctx, 0, BAR.y, 0, BAR.y + BAR.ph, '#8a5a2b', '#5e3a17'); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#2e1a08'; ctx.stroke();
    ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = '#000';
    for (let i = 0; i < 4; i++) ctx.fillRect(BAR.x + 6, BAR.y + 20 + i * 28, bw - 12, 2);
    ctx.restore();
    Art.rrect(ctx, BAR.x + 8, BAR.y + 8, BAR.sunW - 6, BAR.ph - 6, 10);
    ctx.fillStyle = '#4a2c10'; ctx.fill();
    const pulse = this.sunPulse > 0 ? 1 + this.sunPulse * 0.6 : 1;
    Art.sun(ctx, BAR.x + 58, BAR.y + 46, t, 0.85 * pulse);
    Art.rrect(ctx, BAR.x + 16, BAR.y + 88, BAR.sunW - 22, 30, 8); ctx.fillStyle = '#f6edc8'; ctx.fill();
    const flashing = this.sunFlash > 0 && Math.sin(this.sunFlash * 30) > 0;
    if (this.sunFlash > 0) this.sunFlash -= 1 / 60;
    UI.text(ctx, String(this.sun), BAR.x + 13 + BAR.sunW / 2 - 6, BAR.y + 104, 28, { fill: flashing ? '#ff2a1a' : '#2a1a08', stroke: null, font: UI.FONT });

    let hover = null;
    for (let i = 0; i < this.slots; i++) {
      const r = this.packetRect(i);
      if (this.phase === 'choose') {
        const type = this.chosen[i];
        if (type) { UI.packet(ctx, r.x, r.y, type, t, {}); UI.region(r.x, r.y, r.w, r.h, () => { this.chosen.splice(i, 1); Sfx.play('click'); }); }
        else { Art.rrect(ctx, r.x, r.y, r.w, r.h, 8); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill(); }
        continue;
      }
      const pk = this.packets[i];
      if (!pk) { Art.rrect(ctx, r.x, r.y, r.w, r.h, 8); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill(); continue; }
      const cost = PLANTS[pk.type].cost;
      UI.packet(ctx, r.x, r.y, pk.type, t, { cd: pk.cd / pk.cdMax, poor: this.sun < cost, selected: this.selected === i, key: (i + 1) % 10 });
      UI.region(r.x, r.y, r.w, r.h, () => this.selectPacket(i));
      if (UI.isOver(r.x, r.y, r.w, r.h)) hover = { type: pk.type, x: r.x };
    }
    if (this.phase !== 'choose') {
      const s = this.shovelRect();
      Art.rrect(ctx, s.x, s.y, s.w, s.h, 14);
      ctx.fillStyle = Art.lg(ctx, 0, s.y, 0, s.y + s.h, '#8a5a2b', '#5e3a17'); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = '#2e1a08'; ctx.stroke();
      Art.rrect(ctx, s.x + 8, s.y + 8, s.w - 16, s.h - 16, 10); ctx.fillStyle = '#3e240c'; ctx.fill();
      if (this.selected !== 'shovel') { ctx.save(); ctx.translate(s.x + s.w / 2, s.y + s.h / 2); ctx.rotate(-0.6); UI.shovel(ctx, 0, 0, 0.9); ctx.restore(); }
      UI.region(s.x, s.y, s.w, s.h, () => { if (this.phase === 'play') { this.selected = this.selected === 'shovel' ? null : 'shovel'; Sfx.play('shovel'); } });
      UI.button(ctx, 1430, 12, 158, 54, 'Menú', () => { this.paused = true; Sfx.play('click'); }, { size: 30 });
      UI.button(ctx, 1430, 74, 158, 44, this.speed === 2 ? 'Velocidad x2' : 'Velocidad x1', () => { this.speed = this.speed === 2 ? 1 : 2; Sfx.play('click'); }, { size: 20, color: this.speed === 2 ? 'orange' : 'stone' });
    }
    if (hover && this.phase === 'play' && this.selected === null) {
      const d = PLANTS[hover.type];
      ctx.font = `bold 18px ${UI.BODY}`;
      const w = Math.max(240, ctx.measureText(d.desc).width + 30);
      const x = clamp(hover.x - 20, 10, W - w - 10), y = BAR.y + BAR.ph + 18;
      Art.rrect(ctx, x, y, w, 70, 12); ctx.fillStyle = 'rgba(25,15,5,0.9)'; ctx.fill(); ctx.strokeStyle = '#c8a050'; ctx.lineWidth = 2; ctx.stroke();
      UI.text(ctx, `${d.name} · ${d.cost} soles`, x + 15, y + 22, 22, { align: 'left', fill: '#ffe48a', stroke: null });
      UI.text(ctx, d.desc, x + 15, y + 50, 18, { align: 'left', fill: '#f4ecd0', stroke: null, font: UI.BODY, weight: 'bold' });
    }

    if (this.phase === 'play' || this.phase === 'won' || this.phase === 'lost') {
      const label = this.levelIdx === 'endless' ? `Infinito · Oleada ${this.wave}` : `Nivel ${this.levelIdx + 1} · ${STAGES[this.stage].name}`;
      UI.text(ctx, label, 1135, 872, 26, { fill: '#fff', stroke: '#2a1a08', lw: 6, align: 'right' });
      if (!this.L.endless) {
        const bx = 1150, by = 860, bw2 = 220, bh = 24;
        Art.rrect(ctx, bx, by, bw2, bh, 10); ctx.fillStyle = '#3a2810'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#1a1005'; ctx.stroke();
        const frac = clamp(this.wave / this.L.waves, 0, 1);
        if (frac > 0) { Art.rrect(ctx, bx + bw2 * (1 - frac), by + 4, Math.max(4, bw2 * frac - 4), bh - 8, 6); ctx.fillStyle = Art.lg(ctx, 0, by, 0, by + bh, '#b8f06a', '#4a9a1c'); ctx.fill(); }
        for (let w = 10; w <= this.L.waves; w += 10) this.drawFlag(ctx, bx + bw2 * (1 - w / this.L.waves) + 6, by + 6, this.wave >= w);
        if (this.L.waves % 10) this.drawFlag(ctx, bx + 6, by + 6, this.wave >= this.L.waves);
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
      x = r.x + (W / 2 - r.x) * e; y = r.y + (H / 2 - 80 - r.y) * e; sc = 1 + e * 1.2;
      ctx.save(); ctx.globalAlpha = k * 0.88; ctx.fillStyle = '#fffbe8'; ctx.fillRect(0, 0, W, H); ctx.restore();
      if (r.ct > 0.6) {
        for (let i = 0; i < 70; i++) {
          const fx = (i * 137.5 + Math.sin(i) * 50) % W, fy = ((r.ct - 0.6) * (120 + (i % 7) * 30) + i * 37) % (H + 40) - 20;
          ctx.save(); ctx.translate(fx, fy); ctx.rotate(r.ct * 4 + i);
          ctx.fillStyle = ['#ff5a4a', '#ffd23a', '#5ad06a', '#4aa8ff', '#c87aff'][i % 5]; ctx.fillRect(-5, -3, 10, 6); ctx.restore();
        }
      }
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.6); ctx.globalAlpha = 0.5;
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-14 * sc, 120 * sc); ctx.lineTo(14 * sc, 120 * sc); ctx.closePath();
      ctx.fillStyle = 'rgba(255,240,140,0.6)'; ctx.fill();
    }
    ctx.restore();
    ctx.save(); ctx.translate(x, y + Math.sin(t * 3) * 4); ctx.scale(sc, sc); UI.trophy(ctx, 0, 0, 1); ctx.restore();
    if (!r.collected) UI.text(ctx, '¡Haz clic en el trofeo!', x, y + 90, 26, { fill: '#fff', stroke: '#2a1a08', lw: 6 });
    if (r.collected && r.ct > 1.3) {
      UI.reset();
      UI.text(ctx, `¡Nivel ${this.levelIdx + 1} superado!`, W / 2, 140, 70, { fill: '#ffd23a', stroke: '#4a2a00', lw: 11 });
      const st = this.stats;
      UI.text(ctx, `Zombis derrotados: ${st.killed}   ·   Plantas sembradas: ${st.planted}   ·   Soles recogidos: ${st.sun}`, W / 2, H / 2 + 120, 26, { fill: '#3a2a10', stroke: null, font: UI.BODY, weight: 'bold' });
      const hasNext = this.levelIdx + 1 < LEVELS.length;
      if (hasNext) UI.button(ctx, W / 2 - 330, H / 2 + 180, 320, 74, 'Siguiente nivel', () => { Sfx.play('click'); this.app.startLevel(this.levelIdx + 1); }, { size: 34 });
      UI.button(ctx, hasNext ? W / 2 + 10 : W / 2 - 160, H / 2 + 180, 320, 74, 'Menú principal', () => { Sfx.play('click'); this.app.go('menu'); }, { size: 30, color: 'stone' });
    }
  }

  drawChooser(ctx, t) {
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fillRect(0, BAR.y + BAR.ph + 14, LAWN_RIGHT + 60, H); ctx.restore();
    const px = 210, py = 146, pw = 940, ph = 740;
    UI.panel(ctx, px, py, pw, ph);
    UI.text(ctx, 'Elige tus plantas', px + pw / 2, py + 44, 46, { fill: '#ffe48a', stroke: '#3a1e05', lw: 8 });
    UI.text(ctx, `Lleva hasta ${this.slots} · ¡Todas desbloqueadas y gratis!`, px + pw / 2, py + 86, 22, { fill: '#f7e9c2', stroke: null, font: UI.BODY, weight: 'bold' });
    const cols = 8;
    const pos = i => ({ x: px + 66 + (i % cols) * 104, y: py + 112 + Math.floor(i / cols) * 128 });
    let hovered = null;
    this.owned.forEach((type, i) => {
      const { x, y } = pos(i);
      const used = this.chosen.includes(type);
      UI.packet(ctx, x, y, type, t, { poor: used, cd: 0, premium: PLANTS[type].premium });
      if (!used) UI.region(x, y, BAR.pw, BAR.ph, () => {
        if (this.chosen.length < this.slots) { this.chosen.push(type); Sfx.play('select'); } else Sfx.play('buzz');
      });
      if (UI.isOver(x, y, BAR.pw, BAR.ph)) hovered = type;
    });
    if (hovered) {
      const d = PLANTS[hovered];
      UI.text(ctx, `${d.name} · ${d.cost} soles · recarga ${d.cd}s`, px + pw / 2, py + 520, 30, { fill: '#ffe48a', stroke: '#3a1e05', lw: 6 });
      UI.text(ctx, d.desc, px + pw / 2, py + 560, 22, { fill: '#f7e9c2', stroke: null, font: UI.BODY, weight: 'bold' });
    } else {
      const names = this.L.zombies.map(z => ZOMBIES[z].name);
      const half = Math.ceil(names.length / 2);
      const lines = names.length > 4 ? [names.slice(0, half).join(', ') + ',', names.slice(half).join(', ')] : [names.join(', ')];
      UI.text(ctx, 'Zombis en este nivel:', px + pw / 2, py + 515, 24, { fill: '#ffb8a0', stroke: '#3a1e05', lw: 5 });
      lines.forEach((ln, i) => UI.text(ctx, ln, px + pw / 2, py + 550 + i * 28, 20, { fill: '#f7e9c2', stroke: null, font: UI.BODY, weight: 'bold' }));
    }
    const ready = this.chosen.length > 0;
    UI.button(ctx, px + pw / 2 - 200, py + ph - 100, 300, 70, '¡A JUGAR!', () => { Sfx.play('go'); this.startReady(); }, { size: 36, disabled: !ready, color: 'red' });
    UI.button(ctx, px + 30, py + ph - 92, 150, 54, 'Volver', () => { Sfx.play('click'); this.app.go('levels'); }, { size: 24, color: 'stone' });
    UI.button(ctx, px + pw - 320, py + ph - 92, 140, 54, 'Aleatorio', () => {
      Sfx.play('click'); const pool = PLANT_ORDER.slice().sort(() => Math.random() - 0.5);
      this.chosen = ['sunflower', ...pool.filter(p => p !== 'sunflower')].slice(0, this.slots);
    }, { size: 22, color: 'orange' });
    UI.button(ctx, px + pw - 168, py + ph - 92, 140, 54, 'Vaciar', () => { Sfx.play('click'); this.chosen = []; }, { size: 22, color: 'stone' });
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
      const tx = this.L.endless ? `Has aguantado ${Math.max(0, this.wave - 1)} oleadas` : `Llegaste a la oleada ${this.wave} de ${this.L.waves}`;
      UI.text(ctx, tx, W / 2, H / 2 + 40, 28, { fill: '#fff', stroke: '#000', lw: 5, font: UI.BODY, weight: 'bold' });
      UI.button(ctx, W / 2 - 320, H / 2 + 90, 300, 70, 'Reintentar', () => { Sfx.play('click'); this.app.startLevel(this.levelIdx); }, { size: 34 });
      UI.button(ctx, W / 2 + 20, H / 2 + 90, 300, 70, 'Menú principal', () => { Sfx.play('click'); this.app.go('menu'); }, { size: 30, color: 'stone' });
    }
  }

  drawPause(ctx) {
    UI.reset();
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    const pw = 600, ph = 640, px = W / 2 - pw / 2, py = H / 2 - ph / 2;
    UI.panel(ctx, px, py, pw, ph);
    UI.text(ctx, 'Pausa', W / 2, py + 58, 56, { fill: '#ffe48a', stroke: '#3a1e05', lw: 9 });
    let y = py + 110;
    const b = (label, fn, opts = {}) => { UI.button(ctx, px + 70, y, pw - 140, 60, label, fn, Object.assign({ size: 26 }, opts)); y += 72; };
    b('Continuar', () => { this.paused = false; Sfx.play('click'); });
    b('Reiniciar nivel', () => { Sfx.play('click'); this.app.startLevel(this.levelIdx); }, { color: 'orange' });
    const d = Save.data;
    const half = (label, fn, x) => UI.button(ctx, x, y, (pw - 160) / 2, 56, label, fn, { size: 22, color: 'stone' });
    half(`Sonido: ${d.sound ? 'Sí' : 'No'}`, () => { Sfx.setSound(!d.sound); Sfx.play('click'); }, px + 70);
    half(`Música: ${d.music ? 'Sí' : 'No'}`, () => { Sfx.setMusic(!d.music); Sfx.play('click'); }, px + 90 + (pw - 160) / 2);
    y += 68;
    half(`Auto-soles: ${d.autoSun ? 'Sí' : 'No'}`, () => { d.autoSun = !d.autoSun; Save.save(); Sfx.play('click'); }, px + 70);
    half(`Barras de vida: ${d.hpBars ? 'Sí' : 'No'}`, () => { d.hpBars = !d.hpBars; Save.save(); Sfx.play('click'); }, px + 90 + (pw - 160) / 2);
    y += 80;
    b(this.confirmQuit ? '¿Seguro? Pulsa otra vez' : 'Menú principal', () => {
      Sfx.play('click');
      if (this.confirmQuit) this.app.go('menu'); else this.confirmQuit = true;
    }, { color: 'red' });
  }
}

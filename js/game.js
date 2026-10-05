'use strict';
// =====================================================================
//  Lógica de una partida: plantas, zombis, soles, oleadas, minijuegos
//  (el dibujo está en game_draw.js)
// =====================================================================
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const BAR = { x: 10, y: 6, sunW: 104, pw: 84, ph: 116, gap: 6 };
const MIN_WAVE = { normal: 1, flag: 1, cone: 2, mummy: 1, pole: 3, paper: 3, imp: 3, balloon: 3, bucket: 4, screendoor: 4,
  knight: 5, pharaoh: 5, football: 6, gargantuar: 8,
  skeleton: 1, vampire: 2, witch: 3, ghost: 3, gargoylez: 4, archdemon: 7 };
const STAGE_CYCLE = ['day', 'dusk', 'night', 'egypt', 'gothic'];
const LOB_SPEC = {
  melonpult: { kind: 'melon', dmg: 80, splash: 26 }, wintermelon: { kind: 'winter', dmg: 80, splash: 26, slow: true },
  kernelpult: { kind: 'kernel', dmg: 20, splash: 0 }, cabbagepult: { kind: 'cabbage', dmg: 40, splash: 0 },
};
const BELT_POOL = ['peashooter', 'repeater', 'snowpea', 'wallnut', 'cherrybomb', 'jalapeno', 'squash', 'chomper', 'kernelpult',
  'bonkchoy', 'threepeater', 'potatomine', 'iceberg', 'laserbean', 'melonpult', 'torchwood', 'tallnut', 'gatling', 'snapdragon'];

class Game {
  constructor(app, levelId) {
    this.app = app;
    this.levelId = levelId;
    if (levelId === 'endless') this.L = ENDLESS;
    else if (typeof levelId === 'string' && levelId.startsWith('mg:')) this.L = MINIGAMES[levelId.slice(3)];
    else this.L = LEVELS[levelId];
    this.mode = this.L.mode || 'normal';
    this.stage = this.L.stage;
    this.lanes = ALL_LANES;
    this.sun = this.L.startSun != null ? this.L.startSun : this.mode === 'laststand' ? 5000 : STAGES[this.stage].startSun;
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.plants = []; this.zombies = []; this.peas = []; this.lobs = []; this.shots = []; this.suns = []; this.parts = [];
    this.craters = []; this.tombs = []; this.rollers = []; this.belt = []; this.patches = [];
    this.mowers = ALL_LANES.map(r => ({ row: r, x: MOWER_X, state: 'idle' }));
    this.time = 0; this.phaseT = 0;
    this.wave = 0; this.waveClock = 0; this.nextWaveAt = 20; this.waveHp = 1;
    this.spawnQueue = []; this.flagPending = 0; this.intense = false;
    this.skySunT = 5; this.groanT = 4; this.beltT = 1;
    this.selected = null; this.shake = 0; this.flash = null;
    this.banner = null; this.speed = 1; this.paused = false;
    this.lastDeath = null; this.reward = null; this.confirmQuit = false;
    this.waiting = this.mode === 'laststand';
    this.stats = { killed: 0, planted: 0, sun: 0 };
    this.slots = SLOTS;
    this.owned = PLANT_ORDER.slice();
    this.chosen = ((this.L.stage === 'gothic' ? GOTHIC_PICK : (Save.data.pick || DEFAULT_PICK)).filter(p => PLANTS[p])).slice(0, this.slots);
    this.packets = [];
    // niebla
    this.fogCols = (STAGES[this.stage].fog && !this.L.noFog) ? STAGES[this.stage].fog : 0;
    this.fogD = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.blowT = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) this.fogD[r][c] = c >= COLS - this.fogCols ? 1 : 0;
    // lápidas
    if (this.L.tombs) {
      const used = new Set();
      while (this.tombs.length < this.L.tombs) {
        const r = Math.floor(rand(0, ROWS)), c = Math.floor(rand(4, COLS));
        if (used.has(r + ',' + c)) continue;
        used.add(r + ',' + c);
        this.tombs.push({ r, c, hp: 600, max: 600 });
      }
    }
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
    if (this.usesBelt) this.startReady(); else { this.phase = 'choose'; Sfx.setTrack('menu'); }
  }

  get usesBelt() { return this.mode === 'bowling' || this.mode === 'conveyor'; }
  get noSky() { return this.usesBelt || this.mode === 'laststand'; }

  makeAmbient() {
    this.ambient = [];
    const st = this.stage;
    const kind = st === 'night' || st === 'fog' ? 'firefly' : st === 'dusk' ? 'leaf' : st === 'egypt' ? 'sand' : st === 'gothic' ? 'bat' : 'butterfly';
    const n = kind === 'firefly' ? 16 : kind === 'leaf' ? 10 : kind === 'sand' ? 26 : kind === 'bat' ? 7 : 5;
    // motas de luz flotantes (ambiente de fantasía)
    for (let i = 0; i < 12; i++) this.ambient.push({ kind: 'mote', x: rand(GRID_X, LAWN_RIGHT), y: rand(GRID_Y, H), vx: rand(-8, 8), vy: rand(-18, -6), seed: rand(0, 10) });
    if (kind === 'bat') for (let i = 0; i < 14; i++) this.ambient.push({ kind: 'ember', x: rand(GRID_X, LAWN_RIGHT), y: rand(GRID_Y, H), vx: rand(-10, 10), vy: rand(-30, -10), seed: rand(0, 10) });
    for (let i = 0; i < n; i++) {
      this.ambient.push({
        kind, x: rand(GRID_X, LAWN_RIGHT), y: rand(GRID_Y, H - 40), vx: rand(-20, 20), vy: rand(-10, 10), seed: rand(0, 10),
        col: pick(kind === 'leaf' ? ['#d8782a', '#c4501a', '#e8a83a'] : kind === 'sand' ? ['#e8c890', '#d8b070'] : ['#ffd23a', '#ff8ac0', '#9ad0ff', '#fff']),
      });
    }
  }
  isGiant(z) { return z.type === 'gargantuar' || z.type === 'archdemon'; }
  setStage(stage) {
    if (this.stage === stage) return;
    this.stage = stage;
    this.makeAmbient();
    this.setBanner(STAGES[stage].name, 2.5, '#fff', 70);
    if (!this.intense) Sfx.setTrack(STAGES[stage].music);
  }

  get barW() { return BAR.sunW + 10 + this.slots * (BAR.pw + BAR.gap) + 6; }
  packetRect(i) { return { x: BAR.x + BAR.sunW + 10 + i * (BAR.pw + BAR.gap), y: BAR.y + 4, w: BAR.pw, h: BAR.ph }; }
  shovelRect() { return { x: BAR.x + this.barW + 10, y: BAR.y + 8, w: 96, h: 96 }; }

  startReady() {
    this.phase = 'ready'; this.phaseT = 0;
    if (!this.usesBelt) {
      Save.data.pick = this.chosen.slice(); Save.save();
      this.packets = this.chosen.map(type => ({ type, cdMax: PLANTS[type].cd, cd: PLANTS[type].ready || this.mode === 'laststand' ? 0 : PLANTS[type].cd }));
    }
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
      if (!this.waiting) this.updateWaves(dt);
      if (!this.noSky) {
        this.skySunT -= dt;
        if (this.skySunT <= 0) {
          const r = STAGES[this.stage].skySun;
          this.skySunT = rand(r[0], r[1]);
          const lane = pick(this.lanes);
          this.suns.push({ x: rand(GRID_X + 50, LAWN_RIGHT - 60), y: -40, ty: rowGroundY(lane) - rand(20, 70), vy: 75, vx: 0, value: 25, state: 'fall', life: 0, t: rand(0, 9) });
        }
      }
      for (const p of this.packets) { if (p.cd > 0) { p.cd = Math.max(0, p.cd - dt); if (p.cd === 0) p.ready = 0.6; } else if (p.ready > 0) p.ready -= dt; }
      if (this.usesBelt) this.updateBelt(dt);
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
    this.updateShots(dt);
    this.updateRollers(dt);
    this.updateSuns(dt);
    this.updateMowers(dt);
    this.updateParts(dt);
    this.updateAmbient(dt);
    this.updateFog(dt);
    for (const f of this.patches) {
      f.t -= dt; f.tick -= dt;
      if (f.tick <= 0) { f.tick = 0.5; for (const z of this.rowZombies(f.row)) if (Math.abs(z.x - f.x) < 50) this.hitZombie(z, 8, 'ground'); }
      if (Math.random() < 0.4) this.addPart({ kind: 'fire', x: f.x + rand(-40, 40), y: rowGroundY(f.row) - rand(0, 20), vx: 0, vy: rand(-60, -20), life: 0.5, size: rand(10, 18) });
    }
    this.patches = this.patches.filter(f => f.t > 0);
    if (this.reward) { this.reward.t += dt; if (this.reward.collected) this.reward.ct += dt; }
    if (this.phase === 'play') this.checkEnd();
  }

  updateAmbient(dt) {
    for (const a of this.ambient) {
      if (a.kind === 'mote') { a.vy = -10 - Math.sin(this.time + a.seed) * 6; a.vx = Math.sin(this.time * 0.5 + a.seed) * 10; if (a.y < GRID_Y - 40) a.y = H; }
      else if (a.kind === 'ember') { a.vy = -20 - Math.sin(this.time + a.seed) * 10; a.vx = Math.sin(this.time * 0.7 + a.seed) * 15; if (a.y < GRID_Y - 40) a.y = H; }
      else if (a.kind === 'leaf') { a.vx = 25 + Math.sin(this.time + a.seed) * 15; a.vy = 30; }
      else if (a.kind === 'sand') { a.vx = 90 + Math.sin(this.time * 2 + a.seed) * 30; a.vy = Math.sin(this.time * 3 + a.seed) * 15; }
      else { a.vx += rand(-60, 60) * dt; a.vy += rand(-60, 60) * dt; a.vx = clamp(a.vx, -35, 35); a.vy = clamp(a.vy, -25, 25); }
      a.x += a.vx * dt; a.y += a.vy * dt;
      if (a.x < GRID_X - 40) a.x = LAWN_RIGHT;
      if (a.x > LAWN_RIGHT + 40) a.x = GRID_X;
      if (a.y < GRID_Y - 20) a.vy = Math.abs(a.vy);
      if (a.y > H - 20) { if (a.kind === 'leaf') { a.y = GRID_Y - 20; a.x = rand(GRID_X, LAWN_RIGHT); } else a.vy = -Math.abs(a.vy); }
    }
  }

  // ---------------- Niebla ----------------
  updateFog(dt) {
    if (!this.fogCols) return;
    if (this.blowT > 0) this.blowT -= dt;
    const lights = this.plants.filter(p => p.type === 'plantern' && !p.dead);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      let target = c >= COLS - this.fogCols ? 1 : 0;
      if (this.blowT > 0) target = 0;
      for (const l of lights) if (Math.hypot(l.col - c, (l.row - r) * 1.1) <= 1.6) target = 0;
      const d = this.fogD[r][c];
      this.fogD[r][c] = d + (target - d) * Math.min(1, dt * (target < d ? 4 : 0.8));
    }
  }

  // ---------------- Cinta transportadora ----------------
  updateBelt(dt) {
    this.beltT -= dt;
    for (const it of this.belt) it.x = Math.max(it.slot * 92, it.x - 260 * dt);
    if (this.beltT <= 0 && this.belt.length < 9) {
      this.beltT = this.mode === 'bowling' ? rand(2.6, 3.6) : rand(3.5, 5);
      let type;
      if (this.mode === 'bowling') { const r = Math.random(); type = r < 0.14 ? 'boomnut' : r < 0.22 ? 'bignut' : 'nut'; }
      else type = pick(BELT_POOL);
      this.belt.push({ type, x: 1000, slot: this.belt.length });
    }
  }
  takeBelt(i) {
    this.belt.splice(i, 1);
    this.belt.forEach((it, k) => { it.slot = k; });
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
    if (L.endless) this.setStage(STAGE_CYCLE[Math.floor((w - 1) / 10) % STAGE_CYCLE.length]);
    const flag = this.isFlagWave(w);
    let budget = 1 + Math.floor(w * L.growth);
    if (!L.endless) budget = Math.min(budget, 18);
    if (flag) budget = Math.max(Math.round(budget * 1.8), 3) + Math.floor(w / 6);
    const list = flag ? ['flag'] : [];
    let allowed = L.zombies.filter(t => w >= MIN_WAVE[t] || this.mode === 'giants');
    if (!allowed.length) allowed = [L.zombies[0]];
    while (budget > 0) {
      const cand = allowed.filter(t => ZOMBIES[t].cost <= budget);
      if (!cand.length) break;
      const weighted = [];
      for (const t of cand) { const wt = t === 'normal' || t === 'mummy' ? 4 : t === 'football' || t === 'gargantuar' || t === 'archdemon' ? 1 : 2; for (let k = 0; k < wt; k++) weighted.push(t); }
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
    if (this.mode === 'rush') this.nextWaveAt *= 0.7;
    if (w === 1) Sfx.play('groan');
    if (L.endless && w > (Save.data.best || 0)) { Save.data.best = w; Save.save(); }
  }

  spawnZombie(type, row, x, extra) {
    const d = ZOMBIES[type];
    const z = {
      type, row, x: x || rand(1440, 1500), y: rowGroundY(row) + 6,
      hp: d.hp, maxHp: d.hp, armor: d.armor, armorMax: d.armor || 1,
      spd: ZOMBIE_BASE_SPEED * rand(0.88, 1.12) * (this.mode === 'rush' ? 2 : 1), look: Art.zombieLook(type),
      state: 'walk', animT: rand(0, 10), slow: 0, frozen: 0, flash: 0, hitT: 0, lostArm: false, headless: false,
      dieT: 0, burnt: false, eatT: 0, hasPole: type === 'pole', jumpT: 0, enraged: false, stunT: 0, butterT: 0,
      hasImp: type === 'gargantuar', impLook: Art.zombieLook('imp'), smashK: 0, garlicT: 0, fly: 0,
    };
    if (extra) Object.assign(z, extra);
    else if (this.stage === 'gothic' && this.tombs.some(k => k.c >= 5) && Math.random() < 0.3 && !this.isGiant(z)) {
      const tb = pick(this.tombs.filter(k => k.c >= 5));
      z.row = tb.r; z.y = rowGroundY(tb.r) + 6; z.x = cellCX(tb.c) - 34; z.state = 'rise'; z.riseT = 0;
      this.dirtBurst(z.x, z.y, 12, 1);
    }
    this.zombies.push(z);
    return z;
  }
  isFlying(z) { return z.type === 'balloon' && z.armor > 0; }

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
  alive(z) { return z.state !== 'dying' && !z.removed && z.state !== 'thrown' && z.state !== 'bones' && z.state !== 'rise' && !z.charmed; }
  rowZombies(row) { return this.zombies.filter(z => z.row === row && this.alive(z)); }
  ground(z) { return this.alive(z) && !this.isFlying(z); }
  zombieAhead(row, x, maxX = ZOMBIE_VISIBLE_X) {
    return this.zombies.some(z => z.row === row && this.alive(z) && z.x > x - 20 && z.x < maxX);
  }
  firstAhead(row, x) {
    let best = null;
    for (const z of this.zombies) if (z.row === row && this.alive(z) && z.x > x - 20 && z.x < ZOMBIE_VISIBLE_X && (!best || z.x < best.x)) best = z;
    return best;
  }
  tombAt(r, c) { return this.tombs.find(k => k.r === r && k.c === c); }
  cellBlocked(r, c) { return !!this.grid[r][c] || this.craters.some(k => k.r === r && k.c === c) || !!this.tombAt(r, c); }

  placePlant(type, row, col) {
    const d = PLANTS[type];
    const p = {
      type, kind: d.kind, row, col, x: cellCX(col), y: rowGroundY(row), hp: d.hp, maxHp: d.hp,
      t: 0, seed: rand(0, 10), fireT: rand(0.2, 1.2), recoil: 0, glow: 0, queue: [], pop: 0, squish: 0,
      sunT: rand(4, 7), armT: 15, armed: false, fuse: 0, mode: 'idle', biteT: 0, chewT: 0, dead: false, flash: 0,
      plantT: 0, attack: 0, tickT: 1, throwT: 0, holdT: 0, charge: 0, springT: 0, dir: 1,
    };
    this.grid[row][col] = p; this.plants.push(p);
    this.stats.planted++;
    Sfx.play('plant');
    for (let i = 0; i < 10; i++) this.addPart({ kind: 'dirt', x: p.x + rand(-30, 30), y: p.y, vx: rand(-80, 80), vy: rand(-200, -80), g: 600, life: 0.6, size: rand(3, 6), ground: p.y + 4 });
    return p;
  }
  removePlant(p, anim = true) {
    if (p.dead) return;
    p.dead = true;
    if (this.grid[p.row][p.col] === p) this.grid[p.row][p.col] = null;
    if (anim && p.kind !== 'instant' && p.kind !== 'mine' && p.kind !== 'trap' && p.type !== 'squash') {
      this.addPart({ kind: 'plantdie', type: p.type, x: p.x, y: p.y, life: 0.5, seed: p.seed });
      for (let i = 0; i < 8; i++) this.addPart({ kind: 'splat', x: p.x + rand(-20, 20), y: p.y - rand(20, 70), vx: rand(-120, 120), vy: rand(-200, -40), g: 600, life: 0.6, size: rand(3, 6), color: '90,160,50' });
    }
  }
  // Una planta destruida por un zombi (come o aplasta)
  plantKilled(p) {
    this.removePlant(p);
    if (p.type === 'cursedpumpkin') {
      for (const z of this.zombies) if (this.alive(z) && Math.abs(z.row - p.row) <= 1 && Math.abs(z.x - p.x) < COL_W * 1.5 + 30) this.blast(z, 1800);
      this.boom(p.x, p.y - 40, 1.1);
      this.addPart({ kind: 'text', x: p.x, y: p.y - 120, life: 1.2, text: '¡MALDICIÓN!', size: 46, vy: -20, color: '#ff8a20' });
      Sfx.play('explode'); this.shake = 0.5;
    }
  }

  updatePlant(p, dt) {
    p.t += dt; p.plantT += dt;
    if (p.recoil > 0) p.recoil = Math.max(0, p.recoil - dt * 5);
    if (p.flash > 0) p.flash -= dt;
    if (p.attack > 0) p.attack = Math.max(0, p.attack - dt * 3);
    if (p.springT > 0) p.springT -= dt;
    if (p.soulCD > 0) p.soulCD -= dt;
    if (p.hexed > 0) { p.hexed -= dt; return; }
    const T = p.type;
    switch (p.kind) {
      case 'shooter': {
        for (const q of p.queue) { q.t -= dt; if (q.t <= 0) { this.firePea(p, q.row, q.kind); q.done = true; } }
        p.queue = p.queue.filter(q => !q.done);
        p.fireT -= dt;
        let rows = [p.row];
        if (T === 'threepeater') rows = [p.row - 1, p.row, p.row + 1].filter(r => this.lanes.includes(r));
        const target = rows.some(r => this.zombieAhead(r, p.x));
        if (p.fireT <= 0 && target) {
          p.fireT = T === 'fallenangel' ? 1.5 : T === 'demon' ? 1.5 : 1.4; p.recoil = 1;
          const kind = T === 'snowpea' ? 'snow' : T === 'firepea' ? 'fire' : T === 'thornrose' ? 'thorn' : T === 'demon' ? 'hellfire' : T === 'fallenangel' ? 'feather' : T === 'ghostlily' ? 'wisp' : T === 'wraith' ? 'blackfire' : 'pea';
          if (T === 'threepeater') rows.forEach(r => this.firePea(p, r, 'pea'));
          else {
            this.firePea(p, p.row, kind);
            if (T === 'repeater') p.queue.push({ t: 0.18, row: p.row, kind });
            if (T === 'gatling') for (let k = 1; k < 4; k++) p.queue.push({ t: k * 0.13, row: p.row, kind });
          }
        } else if (p.fireT < 0) p.fireT = 0;
        break;
      }
      case 'lobber': {
        p.fireT -= dt;
        if (p.throwT > 0) {
          const prev = p.throwT; p.throwT += dt / 0.7;
          if (prev < 0.35 && p.throwT >= 0.35) this.fireLob(p);
          if (p.throwT >= 1) p.throwT = 0;
        } else if (p.fireT <= 0) {
          const tgt = this.lobTarget(p);
          if (tgt) { p.throwT = 0.001; p.fireT = 3; p.tgt = tgt; p.butter = T === 'kernelpult' && Math.random() < 0.25; }
          else p.fireT = 0;
        }
        break;
      }
      case 'sun': {
        p.sunT -= dt;
        p.glow = clamp(1 - p.sunT, 0, 1);
        if (p.sunT <= 0) {
          const moon = T === 'moonflower';
          p.sunT = moon ? rand(17, 19) : T === 'bloodrose' ? rand(20, 22) : rand(23, 25);
          const dark = this.stage === 'night' || this.stage === 'fog';
          const n = T === 'twinsunflower' || (moon && dark) ? 2 : 1;
          for (let k = 0; k < n; k++)
            this.suns.push({ x: p.x + rand(-10, 10), y: p.y - 70, ty: p.y - rand(10, 30), vx: rand(-70, 70), vy: -260 - k * 40, value: 25, state: 'pop', life: 0, t: 0 });
        }
        break;
      }
      case 'instant': {
        const fuseT = { doomshroom: 1.3, iceshroom: 0.9, blover: 0.6, hurrikale: 0.6 }[T] || 1.1;
        p.fuse = clamp(p.t / fuseT, 0, 1);
        if (p.t >= fuseT) {
          if (T === 'cherrybomb') this.explodeCherry(p);
          else if (T === 'jalapeno') this.explodeJalapeno(p);
          else if (T === 'iceshroom') this.freezeAll(p);
          else if (T === 'doomshroom') this.explodeDoom(p);
          else if (T === 'blover') this.blowAway(p);
          else if (T === 'hurrikale') this.hurricane(p);
          this.removePlant(p);
        }
        break;
      }
      case 'mine': {
        if (!p.armed) {
          p.armT -= dt;
          if (p.armT <= 0) { p.armed = true; p.pop = 1; this.dirtBurst(p.x, p.y, 8); }
        } else {
          p.pop = Math.max(0, p.pop - dt * 3);
          const hit = this.rowZombies(p.row).find(z => this.ground(z) && z.x - p.x > -30 && z.x - p.x < 60 && z.state !== 'jump');
          if (hit) {
            for (const z of this.rowZombies(p.row)) if (this.ground(z) && Math.abs(z.x - p.x) < 95) this.blast(z, 1800);
            this.dirtBurst(p.x, p.y, 26, 1.6);
            this.addPart({ kind: 'flash', x: p.x, y: p.y - 30, life: 0.4, size: 110, color: '255,220,120' });
            this.addPart({ kind: 'text', x: p.x, y: p.y - 70, life: 1.3, text: '¡PATAPUM!', size: 40, vy: -30 });
            Sfx.play('potato'); this.shake = 0.25;
            this.removePlant(p);
          }
        }
        break;
      }
      case 'trap': {
        const hit = this.rowZombies(p.row).find(z => this.ground(z) && z.x - p.x > -30 && z.x - p.x < 55 && z.state !== 'jump' && !this.isGiant(z));
        if (hit) {
          hit.frozen = 10; hit.slow = Math.max(hit.slow, 18);
          for (let i = 0; i < 16; i++) this.addPart({ kind: 'snowflake', x: hit.x + rand(-40, 40), y: hit.y - rand(0, 150), vx: rand(-40, 40), vy: rand(-60, 20), life: 1, size: rand(3, 6), rot: 0, vr: 2 });
          Sfx.play('icefreeze'); this.removePlant(p);
        }
        break;
      }
      case 'chomper': this.updateChomper(p, dt); break;
      case 'squash': this.updateSquash(p, dt); break;
      case 'spike': {
        p.tickT -= dt;
        if (p.tickT <= 0) {
          p.tickT = 1;
          let any = false;
          for (const z of this.rowZombies(p.row)) if (this.ground(z) && Math.abs(z.x - p.x) < 58 && z.state !== 'jump') { this.hitZombie(z, 20, 'ground'); any = true; }
          if (any) { p.attack = 1; Sfx.play('spike'); }
        }
        break;
      }
      case 'magnet': this.updateMagnet(p, dt); break;
      case 'melee': {
        p.fireT -= dt;
        if (p.fireT <= 0) {
          const near = this.rowZombies(p.row).filter(z => this.ground(z) && Math.abs(z.x - p.x) < COL_W * 1.15);
          if (near.length) {
            const front = near.filter(z => z.x >= p.x - 10);
            const tgt = (front.length ? front : near).reduce((a, b) => Math.abs(a.x - p.x) < Math.abs(b.x - p.x) ? a : b);
            p.dir = tgt.x >= p.x - 10 ? 1 : -1;
            this.hitZombie(tgt, 15, 'pea'); p.attack = 1; p.fireT = 0.33; Sfx.play('chomp');
          } else p.fireT = 0;
        }
        break;
      }
      case 'chain': {
        p.fireT -= dt;
        if (p.fireT <= 0) {
          const first = this.firstAhead(p.row, p.x);
          if (first) { this.lightning(p, first); p.fireT = 1.6; p.attack = 1; } else p.fireT = 0;
        }
        break;
      }
      case 'beam': {
        p.fireT -= dt;
        if (p.fireT <= 0) {
          if (this.zombieAhead(p.row, p.x)) {
            p.fireT = 2; p.recoil = 1;
            for (const z of this.rowZombies(p.row)) if (z.x > p.x && z.x < ZOMBIE_VISIBLE_X) this.hitZombie(z, 40, 'lob');
            this.addPart({ kind: 'beam', x: p.x + 40, y: p.y - 72, x2: W + 20, y2: p.y - 72, life: 0.3, color: '255,80,60' });
            Sfx.play('freeze');
          } else p.fireT = 0;
        }
        break;
      }
      case 'breath': {
        p.fireT -= dt;
        if (p.fireT <= 0) {
          const hits = this.zombies.filter(z => this.alive(z) && Math.abs(z.row - p.row) <= 1 && z.x - p.x > -10 && z.x - p.x < COL_W * 1.8);
          if (hits.length) {
            p.fireT = 1.5; p.attack = 1;
            hits.forEach(z => this.hitZombie(z, 25, 'explosion'));
            for (let i = 0; i < 18; i++) this.addPart({ kind: 'fire', x: p.x + rand(60, 220), y: p.y - rand(20, 70) + (Math.floor(rand(-1, 2))) * ROW_H, vx: rand(20, 80), vy: rand(-60, 0), life: rand(0.3, 0.6), size: rand(16, 28) });
            Sfx.play('fire');
          } else p.fireT = 0;
        }
        break;
      }
      case 'cannon': {
        if (T === 'citron') {
          p.charge = Math.min(1, p.charge + dt / 12);
          if (p.charge >= 1 && this.zombieAhead(p.row, p.x)) {
            p.charge = 0; p.recoil = 1;
            this.shots.push({ kind: 'plasma', x: p.x + 50, y: p.y - 40, row: p.row, vx: 620, dmg: 400 });
            Sfx.play('impthrow');
          }
        } else {
          p.fireT -= dt;
          if (p.fireT <= 0 && this.zombieAhead(p.row, p.x)) {
            p.fireT = 10; p.recoil = 1;
            this.shots.push({ kind: 'coconut', x: p.x + 50, y: p.y - 44, row: p.row, vx: 380, dmg: 300, rot: 0 });
            Sfx.play('explode');
          }
        }
        break;
      }
      case 'boomerang': {
        p.fireT -= dt;
        if (p.fireT <= 0 && this.zombieAhead(p.row, p.x)) {
          p.fireT = 1.6; p.attack = 1;
          this.shots.push({ kind: 'boomerang', x: p.x + 20, y: p.y - 68, row: p.row, vx: 420, home: p.x, back: false, hits: new Set(), count: 0, dmg: 20 });
        }
        break;
      }
      case 'rocket': {
        p.fireT -= dt;
        if (p.fireT <= 0) {
          let best = null;
          for (const z of this.zombies) if (this.alive(z) && z.x < ZOMBIE_VISIBLE_X && (!best || z.hp + z.armor > best.hp + best.armor)) best = z;
          if (best) {
            p.fireT = 6;
            this.shots.push({ kind: 'rocket', x: p.x, y: p.y - 104, row: p.row, vx: 0, vy: -300, target: best, dmg: 120, rot: -Math.PI / 2 });
            Sfx.play('lob');
          } else p.fireT = 0;
        }
        break;
      }
      case 'charm': {
        p.fireT -= dt;
        if (p.fireT <= 0) {
          let best = null;
          for (const z of this.rowZombies(p.row)) if (!this.isGiant(z) && z.x > p.x && z.x < Math.min(ZOMBIE_VISIBLE_X, p.x + COL_W * 5) && (!best || z.x < best.x)) best = z;
          if (best) { p.fireT = 8; p.attack = 1; this.shots.push({ kind: 'heart', x: p.x + 30, y: p.y - 70, row: p.row, vx: 0, vy: 0, target: best }); Sfx.play('reward'); }
          else p.fireT = 0;
        }
        break;
      }
      case 'drain': {
        p.fireT -= dt;
        if (p.fireT <= 0) {
          p.fireT = 1;
          const R = COL_W * 1.7;
          const hits = this.zombies.filter(z => this.alive(z) && Math.hypot(z.x - p.x, (z.row - p.row) * ROW_H) < R);
          if (hits.length) {
            p.attack = 1;
            hits.forEach(z => { this.hitZombie(z, 35, 'lob'); this.addPart({ kind: 'drain', x: z.x, y: z.y - 90, tx: p.x, ty: p.y - 88, life: 0.6 }); });
            for (const q of this.plants) if (!q.dead && Math.hypot(q.x - p.x, (q.row - p.row) * ROW_H) < R) q.hp = Math.min(q.maxHp, q.hp + 25 * hits.length);
          }
        }
        break;
      }
      case 'reaper': {
        p.fireT -= dt;
        if (p.fireT <= 0) {
          const hits = this.zombies.filter(z => this.alive(z) && Math.abs(z.row - p.row) <= 1 && z.x - p.x > -30 && z.x - p.x < COL_W * 1.7);
          if (hits.length) {
            p.fireT = 2.5; p.attack = 1; Sfx.play('smash');
            for (const z of hits) {
              const full = z.maxHp + (ZOMBIES[z.type].armor || 0);
              if (z.hp + z.armor <= full * 0.45 && !this.isGiant(z)) {
                this.killZombie(z, false);
                this.addPart({ kind: 'text', x: z.x, y: z.y - 170, life: 1, text: '¡Cosecha!', size: 30, vy: -40, color: '#d8b0ff' });
                this.soulSun(z.x, z.y - 80);
              } else this.hitZombie(z, 80, 'explosion');
            }
            this.addPart({ kind: 'slash', x: p.x + 40, y: p.y - 60, life: 0.35 });
          } else p.fireT = 0;
        }
        break;
      }
      case 'web': {
        p.fireT -= dt;
        if (p.fireT <= 0) {
          const hits = this.rowZombies(p.row).filter(z => z.x - p.x > -10 && z.x - p.x < COL_W * 3.5 && z.x < ZOMBIE_VISIBLE_X);
          if (hits.length) {
            p.fireT = 2; p.attack = 1;
            hits.forEach(z => { z.webT = 4; z.slow = Math.max(z.slow, 4); this.hitZombie(z, 15, 'ground'); });
            this.addPart({ kind: 'beam', x: p.x + 20, y: p.y - 60, x2: hits[hits.length - 1].x, y2: p.y - 50, life: 0.3, color: '230,230,240' });
          } else p.fireT = 0;
        }
        break;
      }
      case 'aura': {
        p.fireT -= dt;
        if (p.fireT <= 0) {
          let hits;
          if (T === 'phatbeet') hits = this.zombies.filter(z => this.ground(z) && Math.abs(z.row - p.row) <= 1 && Math.abs(z.x - p.x) < COL_W * 1.5);
          else hits = this.zombies.filter(z => this.alive(z) && Math.abs(z.row - p.row) <= 1 && z.x - p.x > COL_W * 0.5 && z.x - p.x < COL_W * 3.5 && z.x < ZOMBIE_VISIBLE_X);
          if (hits.length) {
            p.fireT = T === 'phatbeet' ? 1.5 : 2.5; p.attack = 1;
            hits.forEach(z => { this.hitZombie(z, T === 'phatbeet' ? 40 : 20, 'lob', false); if (T === 'raincloud') z.slow = Math.max(z.slow, 4); });
            if (T === 'raincloud') for (let i = 0; i < 20; i++) this.addPart({ kind: 'rain', x: p.x + rand(COL_W * 0.5, COL_W * 3.5), y: p.y - rand(150, 260) + Math.floor(rand(-1, 2)) * ROW_H, vy: 600, life: 0.35 });
            else Sfx.play('thud');
          } else p.fireT = 0;
        }
        break;
      }
    }
  }

  updateChomper(p, dt) {
    if (p.mode === 'idle') {
      const cands = this.rowZombies(p.row).filter(z => this.ground(z) && z.x - p.x > -25 && z.x - p.x < 165 && z.state !== 'jump' && z.x < ZOMBIE_VISIBLE_X && !this.isGiant(z));
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
  }
  updateMagnet(p, dt) {
    if (p.holdT > 0) { p.holdT -= dt; if (p.holdT <= 0) p.holding = null; return; }
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
      this.addPart({ kind: 'armorfly', type: best.type, x: best.x - 10, y: best.y - 150, tx: p.x, ty: p.y - 70, life: 0.45 });
      Sfx.play('magnet');
    }
  }
  updateSquash(p, dt) {
    if (p.mode === 'idle') {
      const cands = this.rowZombies(p.row).filter(z => this.ground(z) && z.x - p.x > -70 && z.x - p.x < 150 && z.state !== 'jump' && z.x < ZOMBIE_VISIBLE_X);
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
        for (const z of this.rowZombies(p.row)) if (this.ground(z) && Math.abs(z.x - p.x) < 75) this.blast(z, 1800, true);
        this.dirtBurst(p.x, p.y, 14, 1.2);
        Sfx.play('squash'); this.shake = 0.2;
      }
    } else if (p.mode === 'smash') {
      p.biteT += dt;
      p.squish = Math.max(0, 1 - p.biteT * 1.5) * 0.6 + 0.4;
      if (p.biteT > 0.9) this.removePlant(p);
    }
  }
  dirtBurst(x, y, n, f = 1) {
    for (let i = 0; i < n; i++) this.addPart({ kind: 'dirt', x: x + rand(-25, 25), y: y - 5, vx: rand(-120, 120) * f, vy: rand(-240, -80) * f, g: 650, life: 0.7, size: rand(3, 7), ground: y + 4 });
  }

  firePea(p, row, kind) {
    const dmg = { fire: 40, hellfire: 40, feather: 30, wisp: 30, blackfire: 20 }[kind] || 20;
    this.peas.push({ x: p.x + 42, y: p.y - 64 - (kind === 'wisp' ? 10 : 0), ty: rowGroundY(row) - 64, row, kind, dmg, dead: false,
      torched: new Set(), pierce: kind === 'thorn' ? 3 : kind === 'feather' ? 99 : 1, hit: new Set(), trail: [] });
    Sfx.play(kind === 'fire' || kind === 'hellfire' || kind === 'blackfire' ? 'firepea' : kind === 'wisp' ? 'freeze' : 'shoot');
  }
  lobTarget(p) {
    let best = null;
    for (const z of this.rowZombies(p.row)) if (z.x > p.x - 10 && z.x < ZOMBIE_VISIBLE_X && (!best || z.x < best.x)) best = z;
    return best;
  }
  fireLob(p) {
    const z = p.tgt && this.alive(p.tgt) ? p.tgt : this.lobTarget(p);
    if (!z) return;
    const spec = LOB_SPEC[p.type];
    const T = 1.0;
    const move = z.state === 'walk' ? z.spd * (z.slow > 0 ? 0.5 : 1) * T * 0.9 : 0;
    this.lobs.push({ x0: p.x - 30, y0: p.y - 110, x1: z.x - move - 6, y1: z.y - 70 - (this.isFlying(z) ? 60 : 0), t: 0, T, row: p.row,
      kind: p.butter ? 'butter' : spec.kind, dmg: p.butter ? 40 : spec.dmg, splash: spec.splash, slow: spec.slow, butter: p.butter, rot: 0 });
    Sfx.play('lob');
  }
  lightning(p, first) {
    const chain = [first];
    while (chain.length < 3) {
      const last = chain[chain.length - 1];
      let best = null, bd = 230;
      for (const z of this.zombies) {
        if (!this.alive(z) || chain.includes(z) || z.x > ZOMBIE_VISIBLE_X) continue;
        const d = Math.hypot(z.x - last.x, z.y - last.y);
        if (d < bd) { bd = d; best = z; }
      }
      if (!best) break;
      chain.push(best);
    }
    const pts = [[p.x, p.y - 100]];
    chain.forEach(z => { this.hitZombie(z, 20, 'lob'); pts.push([z.x, z.y - 90 - (this.isFlying(z) ? 60 : 0)]); });
    this.addPart({ kind: 'bolt', pts, life: 0.3 });
    Sfx.play('spike');
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
      if (Math.hypot(z.x - p.x, (z.row - p.row) * ROW_H * 0.85) < COL_W * 3.6) this.blast(z, 1800);
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
    for (let x = GRID_X; x < LAWN_RIGHT + 40; x += 22) for (let k = 0; k < 2; k++)
      this.addPart({ kind: 'fire', x: x + rand(-10, 10), y: p.y - rand(0, 30), vx: rand(-20, 20), vy: rand(-160, -40), g: -40, life: rand(0.6, 1.2), size: rand(18, 36), delay: Math.abs(x - p.x) / 2500 });
    Sfx.play('fire'); this.shake = 0.35;
  }
  blowAway(p) {
    this.blowT = 20;
    for (const z of this.zombies) if (this.alive(z) && this.isFlying(z)) {
      z.state = 'blown'; z.vx = 900; this.stats.killed++; this.lastDeath = { x: z.x, y: z.y };
    }
    for (let i = 0; i < 40; i++) this.addPart({ kind: 'wind', x: rand(GRID_X, LAWN_RIGHT), y: rand(GRID_Y, H - 30), vx: rand(500, 900), life: rand(0.4, 0.8), size: rand(30, 70) });
    Sfx.play('mower');
  }
  hurricane(p) {
    for (const z of this.rowZombies(p.row)) {
      if (this.isGiant(z)) { z.x = Math.min(ZOMBIE_VISIBLE_X - 10, z.x + 120); continue; }
      z.x = Math.min(ZOMBIE_VISIBLE_X + 60, z.x + COL_W * 2.2); z.frozen = 0; z.stunT = 0.6;
    }
    for (let i = 0; i < 30; i++) this.addPart({ kind: 'wind', x: p.x + rand(0, 900), y: p.y - rand(10, 120), vx: rand(500, 800), life: rand(0.4, 0.7), size: rand(30, 60) });
    Sfx.play('mower');
  }
  boom(x, y, s) {
    this.addPart({ kind: 'flash', x, y, life: 0.5, size: 260 * s, color: '255,200,80' });
    this.addPart({ kind: 'ring', x, y: y + 30, life: 0.55, size: 200 * s });
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
    const def = ZOMBIES[z.type];
    const bypass = kind === 'true' || (def.shield && (kind === 'lob' || kind === 'ground'));
    if (z.armor > 0 && !bypass) {
      Sfx.play(def.metal ? 'clank' : z.type === 'cone' ? 'plastic' : 'splat');
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
    } else if (z.type === 'balloon') {
      this.addPart({ kind: 'text', x: z.x + 10, y: z.y - 230, life: 0.9, text: '¡PUM!', size: 32, vy: -30, color: '#ff6a5a' });
      this.addPart({ kind: 'armor', type: 'balloon', x: z.x + 14, y: z.y - 260, vx: 0, vy: -60, g: 300, life: 1, rot: 0, vr: 4 });
      z.fallT = 0.35; Sfx.play('plastic');
    } else {
      const door = z.type === 'screendoor' || z.type === 'pharaoh';
      this.addPart({ kind: 'armor', type: z.type, x: z.x - (door ? 44 : 12), y: z.y - (door ? 90 : 150), vx: rand(20, 80), vy: -220, g: 800, life: 1.6, rot: 0, vr: rand(2, 6), ground: z.y - 6 });
      Sfx.play('armorfall');
    }
  }
  killZombie(z, squash) {
    if (z.state === 'dying') return;
    if (z.type === 'skeleton' && !squash && !z.revived && !z.charmed) {
      z.state = 'bones'; z.reviveT = 0; z.revived = true; z.hp = 1; z.armor = 0; z.frozen = 0;
      Sfx.play('thud'); this.addPart({ kind: 'text', x: z.x, y: z.y - 120, life: 0.9, text: '¡Crac!', size: 28, vy: -30, color: '#f0e8d0' });
      return;
    }
    for (const r of this.plants) if (r.type === 'bloodrose' && !r.dead && !(r.soulCD > 0) && Math.hypot(r.x - z.x, (r.row - z.row) * ROW_H) < COL_W * 2.6) { r.soulCD = 1.5; this.soulSun(r.x, r.y - 80); }
    z.state = 'dying'; z.dieT = 0; z.hp = 0; z.armor = 0; z.squashed = squash; z.frozen = 0;
    this.lastDeath = { x: z.x, y: z.y };
    this.stats.killed++;
    if (!squash) {
      z.headless = true;
      this.addPart({ kind: 'head', data: { type: z.type, look: z.look, enraged: z.enraged }, x: z.x - 20, y: z.y - (this.isGiant(z) ? 230 : z.type === 'imp' ? 100 : 150),
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
    if (z.butterT > 0) z.butterT -= dt;
    if (z.fallT > 0) z.fallT -= dt;
    if (z.state === 'dying') {
      const prev = z.dieT;
      z.dieT += dt;
      if (z.burnt && z.dieT > 0.7 && !z.ashed) {
        z.ashed = true;
        const s = this.isGiant(z) ? 1.7 : 1;
        for (let i = 0; i < 18 * s; i++) this.addPart({ kind: 'ash', x: z.x + rand(-25, 25) * s, y: z.y - rand(0, 150) * s, vx: rand(-30, 30), vy: rand(-30, 30), g: 300, life: rand(0.6, 1.2), size: rand(3, 7), ground: z.y });
      }
      if (!z.burnt && !z.squashed && prev < 0.85 && z.dieT >= 0.85) {
        for (let i = 0; i < 8; i++) this.addPart({ kind: 'smoke', x: z.x + rand(10, 120), y: z.y - rand(0, 10), vx: rand(-40, 60), vy: rand(-40, -10), life: rand(0.5, 0.9), size: rand(8, 16), color: '140,120,90' });
        Sfx.play('thud');
      }
      if (z.dieT > (z.burnt ? 1.4 : 2.6)) z.removed = true;
      return;
    }
    if (z.state === 'rise') { z.riseT += dt / 1.3; if (z.riseT >= 1) z.state = 'walk'; return; }
    if (z.state === 'bones') { z.reviveT += dt; if (z.reviveT >= 3) { z.state = 'walk'; z.hp = Math.round(z.maxHp * 0.6); z.headless = false; Sfx.play('groan'); } return; }
    if (z.webT > 0) z.webT -= dt;
    if (z.burnT > 0 && this.alive(z)) {
      z.burnT -= dt; z.burnTick = (z.burnTick || 0) - dt;
      if (z.burnTick <= 0) { z.burnTick = 0.5; this.hitZombie(z, 3, 'true'); }
      if (Math.random() < dt * 8) this.addPart({ kind: 'blackflame', x: z.x + rand(-20, 20), y: z.y - rand(30, 150), vx: rand(-10, 10), vy: rand(-70, -30), life: 0.6, size: rand(10, 18) });
    }
    if (z.castT > 0) z.castT -= dt;
    if (z.type === 'ghost') { z.phaseT = (z.phaseT || 0) + dt; z.ethereal = (z.phaseT % 4.6) > 2.8; }
    if (z.state === 'blown') { z.x += z.vx * dt; z.animT += dt; if (z.x > W + 200) z.removed = true; return; }
    if (z.state === 'thrown') {
      z.flyT += dt / 1.0;
      const k = clamp(z.flyT, 0, 1);
      z.x = z.fromX + (z.toX - z.fromX) * k;
      z.lift = Math.sin(k * Math.PI) * 260;
      if (z.flyT >= 1) { z.lift = 0; z.state = 'walk'; z.stunT = 0.4; Sfx.play('thud'); }
      return;
    }
    if (z.frozen > 0) { z.frozen -= dt; if (z.frozen <= 0) z.stone = 0; return; }
    if (z.charmed) { this.updateCharmed(z, dt); return; }
    const slowMul = z.slow > 0 ? 0.5 : 1;
    if (z.slow > 0) z.slow -= dt;
    z.animT += dt * slowMul * (this.mode === 'rush' ? 1.6 : 1);
    if (z.stunT > 0) { z.stunT -= dt; z.state = 'stun'; return; }
    if (z.state === 'stun') z.state = 'walk';

    // zombi globo: vuela por encima de todo
    if (this.isFlying(z)) {
      z.state = 'fly';
      z.x -= z.spd * ZOMBIES.balloon.speed * slowMul * dt;
      if (z.x < HOUSE_X && this.phase === 'play') this.lose();
      return;
    }
    if (z.state === 'fly') z.state = 'walk';

    if (z.state === 'jump') {
      z.jumpT += dt / 1.0;
      const k = clamp(z.jumpT, 0, 1);
      z.x = z.jumpFrom + (z.jumpTo - z.jumpFrom) * k;
      if (z.jumpT >= 1) { z.state = 'walk'; z.hasPole = false; z.stunT = 0.25; }
      return;
    }
    if (this.isGiant(z)) {
      if (z.state === 'smash') {
        const prev = z.smashK;
        z.smashK += dt * slowMul / 1.4;
        if (prev < 0.68 && z.smashK >= 0.68) {
          const tgt = z.smashTarget;
          if (tgt && !tgt.dead) { this.plantKilled(tgt); if (z.type === 'archdemon') for (let i = 0; i < 12; i++) this.addPart({ kind: 'fire', x: tgt.x + rand(-30, 30), y: tgt.y - rand(0, 60), vx: rand(-40, 40), vy: rand(-140, -40), life: 0.8, size: rand(16, 28) }); }
          this.shake = 0.3; Sfx.play('smash');
          this.dirtBurst(z.x - 90, z.y, 14, 1.2);
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
    if (z.type === 'archdemon' && !z.summoned && z.hp < z.maxHp / 2 && z.x < ZOMBIE_VISIBLE_X) {
      z.summoned = true;
      for (const dr of [-1, 1]) { const r = z.row + dr; if (r >= 0 && r < ROWS) { const s2 = this.spawnZombie('skeleton', r, z.x - 30, { state: 'rise', riseT: 0 }); s2.y = rowGroundY(r) + 6; } }
      this.addPart({ kind: 'flash', x: z.x, y: z.y - 100, life: 0.6, size: 200, color: '255,60,30' }); Sfx.play('siren');
    }
    if (z.type === 'witch') {
      z.spellT = (z.spellT || 3) - dt;
      if (z.spellT <= 0) {
        const vic = this.plants.find(q => !q.dead && q.row === z.row && z.x - q.x > 30 && z.x - q.x < COL_W * 3.2 && !(q.hexed > 0) && z.x < ZOMBIE_VISIBLE_X);
        if (vic) {
          z.spellT = 7; z.castT = 1; vic.hexed = 5;
          for (let i = 0; i < 14; i++) this.addPart({ kind: 'spark', x: vic.x + rand(-30, 30), y: vic.y - rand(10, 100), vx: rand(-40, 40), vy: rand(-80, -10), life: 0.8, size: rand(3, 6), color: '140,255,90' });
          Sfx.play('magnet');
        } else z.spellT = 1;
      }
    }
    const cz = this.zombies.find(c => c.charmed && c.row === z.row && c.state !== 'dying' && z.x - c.x > -20 && z.x - c.x < 58);
    if (cz) {
      z.state = 'eat'; z.eatT -= dt;
      if (z.eatT <= 0) { z.eatT = 0.45; cz.hp -= 45; cz.flash = 0.1; Sfx.play('chomp'); if (cz.hp <= 0) this.killZombie(cz, false); }
      return;
    }
    // planta delante
    let target = null;
    const reach = this.isGiant(z) ? 95 : z.hasPole ? 90 : 58;
    for (const p of this.plants) {
      if (p.row !== z.row || p.dead || p.untargetable) continue;
      if (p.kind === 'spike' && !this.isGiant(z)) continue;
      const d = z.x - p.x;
      if (d > -20 && d < reach && (!target || p.x > target.x)) target = p;
    }
    if (target && (target.kind === 'mine' && target.armed || target.kind === 'trap') && !this.isGiant(z)) target = null;
    if (target && this.isGiant(z)) { z.state = 'smash'; z.smashK = 0; z.smashTarget = target; return; }
    if (target && z.hasPole) {
      if (target.type === 'tallnut') { z.hasPole = false; this.addPart({ kind: 'pole', x: z.x, y: z.y - 80, vx: 60, vy: -100, g: 600, life: 1.2, rot: 0, vr: 3, ground: z.y - 4 }); }
      else { z.state = 'jump'; z.jumpT = 0; z.jumpFrom = z.x; z.jumpTo = target.x - 72; Sfx.play('plastic'); return; }
    }
    if (target && z.x - target.x < 58) {
      if (target.type === 'springnut' && target.springT <= 0) {
        target.springT = 6; target.attack = 1;
        z.x = Math.min(ZOMBIE_VISIBLE_X + 40, z.x + COL_W * 3); z.stunT = 0.5;
        this.addPart({ kind: 'text', x: target.x, y: target.y - 120, life: 0.8, text: '¡BOING!', size: 34, vy: -40, color: '#ffe48a' });
        Sfx.play('impthrow');
        return;
      }
      if (z.state !== 'lane') z.state = 'eat';
      target.hp -= EAT_DPS * slowMul * dt;
      target.flash = 0.05;
      z.eatT -= dt;
      if (z.eatT <= 0) { z.eatT = 0.45 / slowMul; Sfx.play('chomp'); if (target.type === 'endurian') this.hitZombie(z, 10, 'ground'); }
      if (z.type === 'vampire') z.hp = Math.min(z.maxHp, z.hp + EAT_DPS * 0.6 * dt);
      if (target.type === 'gargoyle' && z.eatT === 0.45 / slowMul && Math.random() < 0.15 && !this.isGiant(z)) {
        z.frozen = 3; z.stone = 3; this.addPart({ kind: 'text', x: z.x, y: z.y - 170, life: 0.9, text: '¡Petrificado!', size: 26, vy: -30, color: '#d8d8d0' });
      }
      if (target.type === 'garlic') { z.garlicT += dt; if (z.garlicT > 0.45) { z.garlicT = 0; this.divert(z); } }
      if (target.hp <= 0) { this.plantKilled(target); Sfx.play('gulp'); }
    } else {
      if (z.state !== 'lane') z.state = 'walk';
      let mul = ZOMBIES[z.type].speed;
      if (z.type === 'pole' && !z.hasPole) mul = 1;
      if (z.enraged) mul = 2.6;
      if (z.webT > 0) mul *= 0.55;
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
    if (z.x < HOUSE_X && (!m || m.state === 'gone') && this.phase === 'play') this.lose();
  }
  lose() {
    this.phase = 'lost'; this.phaseT = 0; this.selected = null;
    Sfx.play('lose'); Sfx.setTrack('night');
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
  hitbox(z) { return this.isGiant(z) ? [z.x - 60, z.x + 66] : z.type === 'imp' ? [z.x - 20, z.x + 25] : [z.x - 32, z.x + 40]; }
  hitTomb(row, x0, x1, dmg) {
    for (const tb of this.tombs) {
      const tx = cellCX(tb.c) - 28;
      if (tb.r === row && x0 < tx + 10 && x1 >= tx) {
        tb.hp -= dmg; tb.flash = 0.1;
        Sfx.play('clank');
        if (tb.hp <= 0) {
          this.tombs = this.tombs.filter(k => k !== tb);
          for (let i = 0; i < 14; i++) this.addPart({ kind: 'dirt', x: tx + 28 + rand(-20, 20), y: rowGroundY(row) - rand(10, 80), vx: rand(-160, 160), vy: rand(-260, -60), g: 700, life: 0.8, size: rand(4, 8), ground: rowGroundY(row) + 4, color: '#c8a870' });
          Sfx.play('smash');
        }
        return true;
      }
    }
    return false;
  }
  updatePeas(dt) {
    const torches = this.plants.filter(p => p.type === 'torchwood' && !p.dead);
    for (const pe of this.peas) {
      const ox = pe.x;
      pe.trail.unshift([pe.x, pe.y]); if (pe.trail.length > 5) pe.trail.pop();
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
      if (this.tombs.length && this.hitTomb(pe.row, ox, pe.x, pe.dmg)) { pe.dead = true; this.splat(pe); continue; }
      let best = null;
      for (const z of this.zombies) {
        if (z.row !== pe.row || !this.alive(z) || z.state === 'jump' || pe.hit.has(z) || (z.ethereal && pe.kind !== 'wisp')) continue;
        if (z.x > ZOMBIE_VISIBLE_X + 20) continue;
        const [a, b] = this.hitbox(z);
        if (pe.x > a && pe.x < b && (!best || z.x < best.x)) best = z;
      }
      if (best) {
        pe.hit.add(best);
        if (pe.kind === 'fire') {
          best.slow = 0;
          this.hitZombie(best, pe.dmg, 'pea');
          for (const z of this.rowZombies(pe.row)) if (z !== best && Math.abs(z.x - best.x) < 60) this.hitZombie(z, 13, 'explosion');
        } else if (pe.kind === 'wisp') this.hitZombie(best, pe.dmg, 'true');
        else if (pe.kind === 'blackfire') { this.hitZombie(best, pe.dmg, 'pea'); if (this.alive(best)) best.burnT = 3; }
        else if (pe.kind === 'hellfire') { this.hitZombie(best, pe.dmg, 'pea'); this.patches.push({ row: pe.row, x: best.x - 10, t: 3, tick: 0 }); }
        else this.hitZombie(best, pe.dmg, 'pea', pe.kind === 'snow');
        this.splat(pe);
        if (--pe.pierce <= 0) pe.dead = true;
      }
    }
    this.peas = this.peas.filter(p => !p.dead);
  }
  splat(pe) {
    if (pe.kind === 'fire') { for (let i = 0; i < 6; i++) this.addPart({ kind: 'fire', x: pe.x, y: pe.y, vx: rand(-80, 40), vy: rand(-90, 30), life: 0.35, size: rand(10, 18) }); return; }
    const col = pe.kind === 'snow' ? '160,220,255' : pe.kind === 'thorn' ? '60,120,30' : '120,200,40';
    for (let i = 0; i < 6; i++) this.addPart({ kind: 'splat', x: pe.x, y: pe.y, vx: rand(-140, 60), vy: rand(-140, 80), g: 400, life: 0.35, size: rand(3, 6), color: col });
  }
  updateLobs(dt) {
    for (const l of this.lobs) {
      l.t += dt; l.rot += dt * 6;
      if (l.t >= l.T) {
        l.dead = true;
        let main = null, bd = 80;
        for (const z of this.rowZombies(l.row)) { const d = Math.abs(z.x - l.x1); if (d < bd) { bd = d; main = z; } }
        if (main) {
          this.hitZombie(main, l.dmg, 'lob', l.slow);
          if (l.butter && this.alive(main)) { main.stunT = 4; main.butterT = 4; }
        }
        if (l.splash) for (const z of this.zombies) {
          if (!this.alive(z) || z === main || Math.abs(z.row - l.row) > 1 || z.x > ZOMBIE_VISIBLE_X + 20) continue;
          if (Math.abs(z.x - l.x1) < 100) this.hitZombie(z, l.splash, 'lob', l.slow);
        }
        Sfx.play('melon');
        const col = { winter: '170,230,255', kernel: '255,220,80', butter: '255,240,140', cabbage: '150,220,90' }[l.kind] || '120,200,60';
        for (let i = 0; i < (l.splash ? 14 : 7); i++) this.addPart({ kind: 'splat', x: l.x1, y: l.y1 + 20, vx: rand(-200, 200), vy: rand(-240, 20), g: 600, life: 0.5, size: rand(3, 8), color: col });
      }
    }
    this.lobs = this.lobs.filter(l => !l.dead);
  }
  updateShots(dt) {
    for (const s of this.shots) {
      if (s.kind === 'heart') { this.updateHeart(s, dt); continue; }
      if (s.kind === 'rocket') {
        const tz = s.target && this.alive(s.target) ? s.target : null;
        if (tz) {
          const tx = tz.x, ty = tz.y - 90 - (this.isFlying(tz) ? 60 : 0);
          const ang = Math.atan2(ty - s.y, tx - s.x);
          const sp = 460;
          s.vx += (Math.cos(ang) * sp - s.vx) * Math.min(1, dt * 4);
          s.vy += (Math.sin(ang) * sp - s.vy) * Math.min(1, dt * 4);
          if (Math.hypot(tx - s.x, ty - s.y) < 30) {
            s.dead = true;
            this.hitZombie(tz, s.dmg, 'lob');
            for (const z of this.zombies) if (z !== tz && this.alive(z) && Math.hypot(z.x - tz.x, z.y - tz.y) < 90) this.hitZombie(z, 40, 'explosion');
            this.boom(s.x, s.y, 0.4); Sfx.play('explode');
          }
        } else { s.vy += 200 * dt; }
        s.x += s.vx * dt; s.y += s.vy * dt; s.rot = Math.atan2(s.vy, s.vx);
        if (s.x > W + 60 || s.y > H + 60 || s.y < -200) s.dead = true;
        if (Math.random() < 0.6) this.addPart({ kind: 'smoke', x: s.x, y: s.y, vx: 0, vy: -20, life: 0.5, size: 6, color: '200,200,200' });
        continue;
      }
      if (s.kind === 'boomerang') {
        s.x += (s.back ? -1 : 1) * s.vx * dt;
        if (!s.back && s.x > LAWN_RIGHT + 30) { s.back = true; s.hits = new Set(); s.count = 0; }
        if (s.back && s.x < s.home) { s.dead = true; continue; }
        if (s.count < 3) for (const z of this.rowZombies(s.row)) {
          if (s.hits.has(z) || z.x > ZOMBIE_VISIBLE_X) continue;
          const [a, b] = this.hitbox(z);
          if (s.x > a && s.x < b) { s.hits.add(z); s.count++; this.hitZombie(z, s.dmg, 'pea'); if (s.count >= 3) break; }
        }
        continue;
      }
      // coco y plasma: viajan en línea recta hasta el primer zombi
      s.x += s.vx * dt; if (s.rot !== undefined) s.rot += dt * 8;
      if (s.x > W + 60) { s.dead = true; continue; }
      if (s.kind === 'coconut' && this.tombs.length && this.hitTomb(s.row, s.x - s.vx * dt, s.x, 600)) { this.coconutBoom(s); continue; }
      for (const z of this.rowZombies(s.row)) {
        if (z.x > ZOMBIE_VISIBLE_X + 20) continue;
        const [a, b] = this.hitbox(z);
        if (s.x > a && s.x < b) {
          if (s.kind === 'coconut') { this.hitZombie(z, s.dmg, 'explosion'); this.coconutBoom(s); }
          else { this.hitZombie(z, s.dmg, 'lob'); s.dead = true; this.addPart({ kind: 'flash', x: s.x, y: s.y, life: 0.4, size: 90, color: '120,220,255' }); Sfx.play('icefreeze'); }
          break;
        }
      }
    }
    this.shots = this.shots.filter(s => !s.dead);
  }
  coconutBoom(s) {
    s.dead = true;
    for (const z of this.zombies) if (this.alive(z) && Math.abs(z.row - s.row) <= 1 && Math.abs(z.x - s.x) < COL_W * 1.3) this.hitZombie(z, 150, 'explosion');
    this.boom(s.x, s.y, 0.8); this.shake = 0.3; Sfx.play('explode');
  }

  // ---------------- Bolos ----------------
  updateRollers(dt) {
    for (const r of this.rollers) {
      r.x += 300 * dt; r.rot += dt * 9;
      if (r.dy) {
        r.y += r.dy * 210 * dt;
        if (r.y < rowGroundY(0)) { r.y = rowGroundY(0); r.dy = 1; }
        if (r.y > rowGroundY(ROWS - 1)) { r.y = rowGroundY(ROWS - 1); r.dy = -1; }
      }
      const row = clamp(Math.round((r.y - rowGroundY(0)) / ROW_H), 0, ROWS - 1);
      for (const z of this.rowZombies(row)) {
        if (r.hit.has(z) || this.isFlying(z) || z.x > ZOMBIE_VISIBLE_X) continue;
        const [a, b] = this.hitbox(z);
        if (r.x + 30 * r.size > a && r.x - 30 * r.size < b && Math.abs(z.y - r.y) < 60) {
          r.hit.add(z);
          if (r.type === 'boomnut') {
            for (const q of this.zombies) if (this.alive(q) && Math.abs(q.row - row) <= 1 && Math.abs(q.x - r.x) < COL_W * 1.5) this.blast(q, 1800);
            this.boom(r.x, r.y - 30, 1); this.shake = 0.4; Sfx.play('explode'); r.dead = true;
          } else if (r.type === 'bignut') {
            this.blast(z, 1800, true); Sfx.play('squash'); this.shake = 0.15;
          } else {
            this.hitZombie(z, BOWL.nut.dmg, 'explosion'); Sfx.play('thud');
            r.combo++;
            if (r.combo >= 2) this.addPart({ kind: 'text', x: r.x, y: r.y - 120, life: 1, text: `¡${r.combo} zombis!`, size: 30 + r.combo * 4, vy: -40, color: '#ffe48a' });
            r.dy = r.dy ? -r.dy : (row === 0 ? 1 : row === ROWS - 1 ? -1 : (Math.random() < 0.5 ? -1 : 1));
          }
          break;
        }
      }
      if (r.x > W + 80) r.dead = true;
    }
    this.rollers = this.rollers.filter(r => !r.dead);
  }

  // ---------------- Soles ----------------
  updateSuns(dt) {
    for (const s of this.suns) {
      s.t += dt;
      if (s.state === 'fall') { s.y += s.vy * dt; if (s.y >= s.ty) { s.y = s.ty; s.state = 'ground'; s.bounce = 0.35; } }
      else if (s.state === 'pop') {
        s.vy += 700 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.vy > 0 && s.y >= s.ty) { s.y = s.ty; s.state = 'ground'; s.bounce = 0.35; }
      } else if (s.state === 'ground') {
        s.life += dt; if (s.bounce > 0) s.bounce -= dt;
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
  soulSun(x, y) {
    this.suns.push({ x, y, ty: y + rand(10, 40), vx: rand(-60, 60), vy: -220, value: 15, state: 'pop', life: 0, t: 0, soul: true });
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
        if (z.row === m.row && this.ground(z) && Math.abs(z.x - m.x) < 60 && z.x < ZOMBIE_VISIBLE_X + 40) { z.revived = true; this.killZombie(z, false); }
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
  canPlace(type, cell) {
    if (!cell || !this.lanes.includes(cell.r)) return false;
    if (this.mode === 'bowling') return cell.c <= 2;
    return !this.cellBlocked(cell.r, cell.c);
  }

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
        this.app.markDone(this.levelId);
        return;
      }
    }
    if (UI.hit(x, y)) return;
    if (this.phase !== 'play') return;
    const cell = this.cellAt(x, y);
    if (this.selected === 'shovel') {
      if (cell) {
        const p = this.grid[cell.r][cell.c];
        if (p) { this.removePlant(p); Sfx.play('shovel'); this.dirtBurst(p.x, p.y, 8); }
      }
      this.selected = null;
      return;
    }
    if (this.selected && this.selected.belt !== undefined) {
      const it = this.belt[this.selected.belt];
      if (it && cell && this.canPlace(it.type, cell)) {
        if (this.mode === 'bowling') {
          const big = it.type === 'bignut';
          this.rollers.push({ type: it.type, x: cellCX(cell.c), y: rowGroundY(cell.r), dy: 0, rot: 0, hit: new Set(), combo: 0, size: big ? 2 : 1 });
          Sfx.play('plant');
        } else this.placePlant(it.type, cell.r, cell.c);
        this.takeBelt(this.selected.belt);
        this.selected = null;
      } else if (!cell) this.selected = null;
      else Sfx.play('buzz');
      return;
    }
    if (typeof this.selected === 'number') {
      const pk = this.packets[this.selected];
      if (cell && this.canPlace(pk.type, cell) && this.sun >= PLANTS[pk.type].cost && pk.cd <= 0) {
        this.placePlant(pk.type, cell.r, cell.c);
        this.sun -= PLANTS[pk.type].cost;
        pk.cd = this.mode === 'laststand' && this.waiting ? 0 : pk.cdMax;
        this.selected = null;
      } else if (!cell) this.selected = null;
      else Sfx.play('buzz');
    }
  }
  selectPacket(i) {
    if (this.phase !== 'play') return;
    if (this.usesBelt) {
      if (!this.belt[i]) return;
      this.selected = this.selected && this.selected.belt === i ? null : { belt: i }; Sfx.play('select');
      return;
    }
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
    if ((k === 's' || k === 'S') && this.phase === 'play' && !this.usesBelt) this.selected = this.selected === 'shovel' ? null : 'shovel';
    if (k === ' ' && this.phase === 'play') this.paused = true;
  }
}

// ---------------- Mecánicas góticas ----------------
Object.assign(Game.prototype, {
  updateHeart(s, dt) {
    const z = s.target;
    if (!z || !this.alive(z)) { s.dead = true; return; }
    const tx = z.x - 10, ty = z.y - 110;
    const d = Math.hypot(tx - s.x, ty - s.y);
    if (d < 26) {
      s.dead = true;
      z.charmed = true; z.state = 'walk'; z.slow = 0; z.frozen = 0; z.stunT = 0; z.hasPole = false;
      this.addPart({ kind: 'text', x: z.x, y: z.y - 190, life: 1.1, text: '¡Hechizado!', size: 30, vy: -30, color: '#ff8ac8' });
      for (let i = 0; i < 10; i++) this.addPart({ kind: 'heartp', x: z.x + rand(-30, 30), y: z.y - rand(80, 160), vx: rand(-40, 40), vy: rand(-90, -30), life: 1, size: rand(5, 9) });
      Sfx.play('reward');
      return;
    }
    s.x += (tx - s.x) / d * 520 * dt; s.y += (ty - s.y) / d * 520 * dt;
  },
  // Zombi hechizado por la Demonia: camina hacia la derecha y se come a los demás
  updateCharmed(z, dt) {
    z.animT += dt;
    const foe = this.zombies.find(f => f !== z && this.alive(f) && f.row === z.row && f.x - z.x > -10 && f.x - z.x < 62);
    if (foe) {
      z.state = 'eat'; z.eatT -= dt;
      if (z.eatT <= 0) { z.eatT = 0.4; this.hitZombie(foe, 45, 'explosion'); Sfx.play('chomp'); }
    } else { z.state = 'walk'; z.x += z.spd * 1.1 * Art.stepPulse(z) * dt; }
    if (Math.random() < dt * 1.5) this.addPart({ kind: 'heartp', x: z.x, y: z.y - 170, vx: rand(-10, 10), vy: -40, life: 0.8, size: 5 });
    if (z.x > W + 80) z.removed = true;
  },
});

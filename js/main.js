'use strict';
// =====================================================================
//  Aplicación: escalado HD, bucle principal, menús y navegación
// =====================================================================
const App = {
  canvas: null, ctx: null,
  dpr: 1, scale: 1, ox: 0, oy: 0,
  screen: 'menu', game: null,
  t: 0, last: 0,
  mouse: UI.mouse,
  bgCache: {},
  confirmReset: false,
  renderScale: 1, perf: { acc: 0, n: 0, slow: 0, fast: 0 },
  alm: { tab: 'plants', sel: 'peashooter', z: null },
  menuZombies: null,

  init() {
    Save.load();
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    window.addEventListener('resize', () => this.resize());
    this.resize();
    const c = this.canvas;
    c.addEventListener('pointerdown', e => {
      e.preventDefault();
      Sfx.init();
      const p = this.toLogical(e);
      this.mouse.x = p.x; this.mouse.y = p.y;
      if (this.screen === 'game' && this.game) this.game.onDown(p.x, p.y, e.button);
      else UI.hit(p.x, p.y);
    });
    c.addEventListener('pointermove', e => { const p = this.toLogical(e); this.mouse.x = p.x; this.mouse.y = p.y; });
    c.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => {
      Sfx.init();
      if (this.screen === 'game' && this.game) { this.game.onKey(e.key); if (e.key === ' ') e.preventDefault(); }
      else if (e.key === 'Escape' && this.screen !== 'menu') this.go('menu');
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.game && this.game.phase === 'play') this.game.paused = true;
    });
    // zombis que desfilan por el menú
    this.menuZombies = ['vampire', 'knight', 'skeleton', 'archdemon', 'witch', 'imp', 'pharaoh', 'ghost'].map((type, i) => ({
      type, look: Art.zombieLook(type), animT: i * 1.7, state: 'walk', armor: 1, armorMax: 1, hasPole: true, hasImp: true, impLook: Art.zombieLook('imp'),
      x: 1100 + i * 260, y: 800 + (i % 2) * 40, spd: 26 * Math.min(1.3, ZOMBIES[type].speed),
    }));
    requestAnimationFrame(ts => this.loop(ts));
  },

  resize() {
    const cw = window.innerWidth, ch = window.innerHeight;
    const q = Save.data.quality || 'auto', base = window.devicePixelRatio || 1;
    this.dpr = q === 'ultra' ? Math.min(base * 1.5, 4) : q === 'alta' ? Math.min(base, 3) : q === 'media' ? Math.min(base, 3) * 0.7 : Math.min(base, 3) * this.renderScale;
    this.canvas.width = Math.round(cw * this.dpr);
    this.canvas.height = Math.round(ch * this.dpr);
    this.canvas.style.width = cw + 'px';
    this.canvas.style.height = ch + 'px';
    this.scale = Math.min(cw / W, ch / H);
    this.ox = (cw - W * this.scale) / 2;
    this.oy = (ch - H * this.scale) / 2;
    this.bgCache = {};
  },
  toLogical(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left - this.ox) / this.scale, y: (e.clientY - r.top - this.oy) / this.scale };
  },

  // Fondo pre-renderizado a la resolución física real (nitidez HD)
  getBg(stage) {
    if (this.bgCache[stage]) return this.bgCache[stage];
    const k = this.scale * this.dpr;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W * k)); c.height = Math.max(1, Math.round(H * k));
    const g = c.getContext('2d');
    g.setTransform(k, 0, 0, k, 0, 0);
    Art.background(g, stage);
    this.bgCache[stage] = c;
    return c;
  },

  loop(ts) {
    const dt = Math.min(0.05, (ts - (this.last || ts)) / 1000);
    this.last = ts;
    this.t += dt;
    this.adaptQuality(dt);
    if (this.screen === 'game' && this.game) this.game.update(dt);
    if (this.screen === 'menu') {
      for (const z of this.menuZombies) {
        z.animT += dt;
        z.x -= z.spd * Art.stepPulse(z) * dt;
        if (z.x < -150) z.x = W + 200 + Math.random() * 300;
      }
    }
    this.draw();
    requestAnimationFrame(t => this.loop(t));
  },

  // Resolución adaptativa: si el equipo no llega a ~40 fps, baja un poco la
  // resolución interna; si va sobrado, la vuelve a subir hasta el máximo (HD).
  adaptQuality(dt) {
    if (document.hidden || dt <= 0 || (Save.data.quality && Save.data.quality !== 'auto')) return;
    const P = this.perf;
    P.acc += dt; P.n++;
    if (P.acc < 1) return;
    const avg = P.acc / P.n; P.acc = 0; P.n = 0;
    if (avg > 1 / 40) { P.slow++; P.fast = 0; } else if (avg < 1 / 55) { P.fast++; P.slow = 0; } else { P.slow = 0; P.fast = 0; }
    if (P.slow >= 2 && this.renderScale > 0.5) { this.renderScale = Math.max(0.5, this.renderScale - 0.15); P.slow = 0; this.resize(); }
    else if (P.fast >= 6 && this.renderScale < 1) { this.renderScale = Math.min(1, this.renderScale + 0.1); P.fast = 0; this.resize(); }
  },

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b1408'; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const k = this.scale * this.dpr;
    ctx.setTransform(k, 0, 0, k, this.ox * this.dpr, this.oy * this.dpr);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    UI.reset();
    if (this.screen === 'menu') this.drawMenu(ctx);
    else if (this.screen === 'levels') this.drawLevels(ctx);
    else if (this.screen === 'almanac') this.drawAlmanac(ctx);
    else if (this.screen === 'minigames') this.drawMinigames(ctx);
    else if (this.screen === 'game' && this.game) this.game.draw(ctx);
    if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - 1 / 20);
      ctx.fillStyle = `rgba(5,2,8,${this.fade})`; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
    this.canvas.style.cursor = UI.find(this.mouse.x, this.mouse.y) ? 'pointer' : 'default';
  },

  cycleQuality() {
    const order = ['auto', 'ultra', 'alta', 'media'];
    Save.data.quality = order[(order.indexOf(Save.data.quality || 'auto') + 1) % order.length]; Save.save();
    this.renderScale = 1; this.resize(); UI.packetCache = {};
  },
  qualityLabel() { return { auto: 'Automática', ultra: 'Ultra (4K)', alta: 'Alta', media: 'Media' }[Save.data.quality || 'auto']; },
  go(screen) {
    this.fade = 1;
    this.screen = screen;
    this.confirmReset = false;
    if (screen !== 'game') { this.game = null; Sfx.setTrack('menu'); }
  },
  startLevel(idx) {
    this.fade = 1;
    this.game = new Game(this, idx);
    this.screen = 'game';
  },
  markDone(id) {
    if (id === 'endless') return;
    if (!Save.data.done.includes(id)) { Save.data.done.push(id); Save.save(); }
  },
  nextLevel() {
    for (let i = 0; i < LEVELS.length; i++) if (!Save.data.done.includes(i)) return i;
    return 0;
  },

  dimBg(ctx, stage, a = 0.5) {
    ctx.drawImage(this.getBg(stage), 0, 0, W, H);
    ctx.fillStyle = `rgba(5,10,20,${a})`; ctx.fillRect(0, 0, W, H);
  },
  levelName(i) { const L = LEVELS[i]; return `${WORLDS.find(w => w.id === L.world).name} ${L.num}`; },

  // ---------------- Menú principal ----------------
  drawMenu(ctx) {
    const t = this.t;
    ctx.drawImage(this.getBg('dusk'), 0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(30,10,60,0.55)'); g.addColorStop(1, 'rgba(10,5,5,0.7)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const zs = this.menuZombies.slice().sort((a, b) => a.y - b.y);
    for (const z of zs) {
      ctx.save(); ctx.translate(z.x, z.y); Art.shadow(ctx, 0, 0, 40, 10); ctx.scale(1.15, 1.15);
      Art.zombie(ctx, z, t); ctx.restore();
    }
    const deco = (type, x, y, s, ph) => { ctx.save(); ctx.translate(x, y); Art.shadow(ctx, 0, 2, 40, 10); ctx.scale(s, s); Art.plant(ctx, type, t + ph, { seed: ph, armed: true, loaded: true, attack: Math.max(0, Math.sin(t * 2 + ph)) }); ctx.restore(); };
    deco('twinsunflower', 210, 560, 2.0, 0);
    deco('gatling', 400, 700, 1.8, 1);
    deco('torchwood', 150, 790, 1.4, 2);
    deco('bonkchoy', 1360, 560, 1.6, 3);
    deco('citron', 1200, 690, 1.4, 4);

    ctx.save(); ctx.translate(W / 2, 120); ctx.rotate(Math.sin(t * 1.2) * 0.012);
    ctx.font = `120px ${UI.FONT}`;
    const w1 = ctx.measureText('JARDÍN').width, w3 = ctx.measureText('ZOMBIS').width;
    ctx.font = `60px ${UI.FONT}`;
    const w2 = ctx.measureText('vs').width + 40;
    const x0 = -(w1 + w2 + w3) / 2;
    UI.text(ctx, 'JARDÍN', x0 + w1 / 2, 0, 120, { fill: Art.lg(ctx, 0, -60, 0, 60, '#e2ff9a', '#4aa81c'), stroke: '#10300a', lw: 16 });
    UI.text(ctx, 'vs', x0 + w1 + w2 / 2, 18, 60, { fill: '#ffe24a', stroke: '#4a2a00', lw: 10 });
    UI.text(ctx, 'ZOMBIS', x0 + w1 + w2 + w3 / 2, 0, 120, { fill: Art.lg(ctx, 0, -60, 0, 60, '#dfe8c8', '#7d8c62'), stroke: '#1a1a12', lw: 16 });
    UI.text(ctx, 'EDICIÓN HD · TODO GRATIS', 0, 88, 32, { fill: '#fff', stroke: '#2a1a08', lw: 7 });
    ctx.restore();

    const d = Save.data;
    const bx = W / 2 - 210, bw = 420;
    let y = 248;
    const nxt = this.nextLevel();
    const allDone = LEVELS.every((_, i) => d.done.includes(i));
    UI.button(ctx, bx, y, bw, 80, allDone ? '¡Aventura completada!' : `Aventura · ${this.levelName(nxt)}`, () => { Sfx.play('click'); this.startLevel(nxt); }, { size: allDone ? 32 : 28 });
    y += 94;
    UI.button(ctx, bx, y, bw, 62, `Mundos y niveles (${LEVELS.length})`, () => { Sfx.play('click'); this.go('levels'); }, { size: 28, color: 'orange' });
    y += 76;
    UI.button(ctx, bx, y, bw, 62, 'Minijuegos', () => { Sfx.play('click'); this.go('minigames'); }, { size: 30, color: 'red' });
    y += 76;
    UI.button(ctx, bx, y, bw, 62, `Modo infinito · récord ${d.best || 0}`, () => { Sfx.play('click'); this.startLevel('endless'); }, { size: 26, color: 'red' });
    y += 76;
    UI.button(ctx, bx, y, bw, 62, 'Almanaque', () => { Sfx.play('click'); this.go('almanac'); }, { size: 30, color: 'green' });
    y += 76;
    UI.button(ctx, bx, y, bw / 2 - 8, 54, `Sonido: ${d.sound ? 'Sí' : 'No'}`, () => { Sfx.setSound(!d.sound); Sfx.play('click'); }, { size: 22, color: 'stone' });
    UI.button(ctx, bx + bw / 2 + 8, y, bw / 2 - 8, 54, `Música: ${d.music ? 'Sí' : 'No'}`, () => { Sfx.init(); Sfx.setMusic(!d.music); Sfx.play('click'); }, { size: 22, color: 'stone' });
    UI.button(ctx, W - 290, 20, 270, 50, `Calidad: ${this.qualityLabel()}`, () => { Sfx.play('click'); this.cycleQuality(); }, { size: 20, color: 'stone' });
    UI.text(ctx, 'Teclas: 1-9 y 0 elegir planta · S pala · Esc pausa · Clic derecho cancelar', W / 2, 884, 18, { fill: '#e8dfc0', stroke: '#1a1005', lw: 4, font: UI.BODY, weight: 'bold' });
  },

  // ---------------- Mundos y niveles ----------------
  drawLevels(ctx) {
    const t = this.t, d = Save.data;
    const world = WORLDS.find(w => w.id === d.world) || WORLDS[0];
    this.dimBg(ctx, world.id, 0.45);
    const px = 120, py = 30, pw = 1360, ph = 840;
    UI.panel(ctx, px, py, pw, ph);
    UI.text(ctx, 'Mundos', W / 2, py + 48, 50, { fill: '#f0dcaa', stroke: '#141826', lw: 9 });
    // pestañas de mundos
    const tabW = 200;
    WORLDS.forEach((w, i) => {
      const x = px + 40 + i * (tabW + 16), y = py + 90;
      const doneN = w.levels.filter(l => d.done.includes(LEVELS.indexOf(l))).length;
      UI.button(ctx, x, y, tabW, 58, `${w.name.replace('Jardín de día', 'Día')} ${doneN}/${w.levels.length}`, () => { d.world = w.id; Save.save(); Sfx.play('click'); },
        { size: 19, color: w.id === world.id ? 'green' : 'stone' });
    });
    const stageCol = { day: ['#5f9a34', '#3f7a22'], dusk: ['#c0703a', '#8a4a24'], night: ['#3a4a8a', '#24305a'], fog: ['#5a6a8a', '#343e5a'], egypt: ['#d8a058', '#9a6a2a'], gothic: ['#5a1a3a', '#1a0612'] };
    const cw = 236, chh = 230, gap = 14;
    world.levels.forEach((L, i) => {
      const idx = LEVELS.indexOf(L);
      const cx = px + 58 + (i % 5) * (cw + gap), cy = py + 180 + Math.floor(i / 5) * (chh + gap);
      const over = UI.isOver(cx, cy, cw, chh);
      ctx.save();
      if (over) { ctx.translate(cx + cw / 2, cy + chh / 2); ctx.scale(1.03, 1.03); ctx.translate(-(cx + cw / 2), -(cy + chh / 2)); }
      Art.rrect(ctx, cx, cy, cw, chh, 18);
      const col = stageCol[L.stage];
      ctx.fillStyle = Art.lg(ctx, 0, cy, 0, cy + chh, col[0], col[1]); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = over ? '#ffe48a' : '#1e1408'; ctx.stroke();
      ctx.save(); Art.rrect(ctx, cx, cy, cw, chh, 18); ctx.clip();
      const zt = L.zombies[L.zombies.length - 1];
      ctx.translate(cx + 170, cy + chh - 14);
      const sc = zt === 'gargantuar' ? 0.5 : 0.75;
      ctx.scale(sc, sc);
      Art.zombie(ctx, { type: zt, look: null, animT: t + i, state: over ? 'walk' : 'idle', armor: 1, armorMax: 1, hasPole: true, hasImp: true }, t);
      ctx.restore();
      UI.text(ctx, `${L.num}`, cx + 40, cy + 40, 46, { fill: '#fff', stroke: '#1e1408', lw: 7 });
      UI.text(ctx, `${L.waves} oleadas`, cx + 16, cy + 84, 17, { align: 'left', fill: '#fff', stroke: '#1e1408', lw: 4, font: UI.BODY, weight: 'bold' });
      if (L.tombs) UI.text(ctx, `${L.tombs} lápidas`, cx + 16, cy + 108, 15, { align: 'left', fill: '#f4ecd0', stroke: '#1e1408', lw: 3, font: UI.BODY, weight: 'bold' });
      if (d.done.includes(idx)) UI.text(ctx, '★', cx + 40, cy + chh - 30, 34, { fill: '#ffd23a', stroke: '#4a2a00', lw: 5, font: UI.BODY });
      ctx.restore();
      UI.region(cx, cy, cw, chh, () => { Sfx.play('click'); this.startLevel(idx); });
    });
    UI.button(ctx, px + 40, py + ph - 84, 200, 58, 'Volver', () => { Sfx.play('click'); this.go('menu'); }, { size: 28, color: 'stone' });
    UI.button(ctx, px + pw - 290, py + ph - 84, 250, 58, this.confirmReset ? '¿Seguro?' : 'Borrar estrellas', () => {
      Sfx.play('click');
      if (this.confirmReset) { Save.data.done = []; Save.data.best = 0; Save.save(); this.confirmReset = false; }
      else this.confirmReset = true;
    }, { size: 22, color: 'orange' });
  },

  // ---------------- Minijuegos ----------------
  drawMinigames(ctx) {
    const t = this.t, d = Save.data;
    this.dimBg(ctx, 'night', 0.45);
    const px = 120, py = 30, pw = 1360, ph = 840;
    UI.panel(ctx, px, py, pw, ph);
    UI.text(ctx, 'Minijuegos', W / 2, py + 50, 52, { fill: '#f0dcaa', stroke: '#141826', lw: 9 });
    const keys = Object.keys(MINIGAMES);
    const cw = 400, chh = 205;
    keys.forEach((k, i) => {
      const M = MINIGAMES[k];
      const cx = px + 50 + (i % 3) * (cw + 30), cy = py + 96 + Math.floor(i / 3) * (chh + 18);
      const over = UI.isOver(cx, cy, cw, chh);
      ctx.save();
      if (over) { ctx.translate(cx + cw / 2, cy + chh / 2); ctx.scale(1.03, 1.03); ctx.translate(-(cx + cw / 2), -(cy + chh / 2)); }
      Art.rrect(ctx, cx, cy, cw, chh, 20);
      ctx.save(); ctx.clip();
      ctx.drawImage(this.getBg(M.stage), 400, 330, 640, 460, cx, cy, cw, chh);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(cx, cy, cw, chh);
      // vista previa
      ctx.translate(cx, cy);
      if (k === 'bowling') { for (let j = 0; j < 3; j++) { ctx.save(); ctx.translate(80 + j * 90, 120 - j * 6); ctx.scale(0.7, 0.7); Art.bowlnut(ctx, ['nut', 'boomnut', 'bignut'][j], t * 3 + j, t); ctx.restore(); } }
      else if (k === 'conveyor') { Art.conveyor(ctx, 20, 20, 360, 90, t); for (let j = 0; j < 3; j++) { ctx.save(); ctx.translate(70 + j * 120, 100); ctx.scale(0.62, 0.62); Art.plant(ctx, ['peashooter', 'cherrybomb', 'bonkchoy'][j], t + j, { armed: true }); ctx.restore(); } }
      else {
        const zt = { laststand: 'bucket', invisible: 'normal', giants: 'gargantuar', rush: 'football', vampires: 'vampire' }[k];
        ctx.save(); ctx.translate(250, 150); const s = zt === 'gargantuar' ? 0.45 : 0.75; ctx.scale(s, s);
        if (k === 'invisible') ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 2);
        Art.zombie(ctx, { type: zt, look: null, animT: t, state: 'walk', armor: 1, armorMax: 1, hasImp: true }, t);
        ctx.restore();
        if (k === 'laststand') { ctx.save(); ctx.translate(90, 150); ctx.scale(0.8, 0.8); Art.plant(ctx, 'gatling', t, {}); ctx.restore(); }
        if (k === 'vampires') { ctx.save(); ctx.translate(90, 150); ctx.scale(0.8, 0.8); Art.plant(ctx, 'reaper', t, {}); ctx.restore(); }
      }
      ctx.restore();
      ctx.lineWidth = 4; ctx.strokeStyle = over ? '#ffe48a' : '#1e1408'; Art.rrect(ctx, cx, cy, cw, chh, 20); ctx.stroke();
      Art.rrect(ctx, cx, cy + chh - 70, cw, 70, 0); ctx.fillStyle = 'rgba(20,12,4,0.8)'; ctx.fill();
      UI.text(ctx, M.name, cx + cw / 2, cy + chh - 48, 26, { fill: '#f0dcaa', stroke: '#141826', lw: 6 });
      UI.text(ctx, M.desc, cx + cw / 2, cy + chh - 18, 15, { fill: '#f4ecd0', stroke: null, font: UI.BODY, weight: 'bold' });
      if (d.done.includes('mg:' + k)) UI.text(ctx, '★', cx + 34, cy + 36, 40, { fill: '#ffd23a', stroke: '#4a2a00', lw: 5, font: UI.BODY });
      ctx.restore();
      UI.region(cx, cy, cw, chh, () => { Sfx.play('click'); this.startLevel('mg:' + k); });
    });
    UI.button(ctx, px + 40, py + ph - 76, 200, 56, 'Volver', () => { Sfx.play('click'); this.go('menu'); }, { size: 28, color: 'stone' });
  },

  // ---------------- Almanaque ----------------
  drawAlmanac(ctx) {
    const t = this.t, A = this.alm;
    this.dimBg(ctx, 'night', 0.4);
    const px = 40, py = 20, pw = 1520, ph = 860;
    UI.panel(ctx, px, py, pw, ph);
    UI.text(ctx, 'Almanaque', px + 330, py + 46, 46, { fill: '#f0dcaa', stroke: '#141826', lw: 8 });
    UI.button(ctx, px + 40, py + 82, 280, 50, `Plantas (${PLANT_ORDER.length})`, () => { A.tab = 'plants'; A.sel = 'peashooter'; Sfx.play('click'); }, { size: 22, color: A.tab === 'plants' ? 'green' : 'stone' });
    UI.button(ctx, px + 340, py + 82, 280, 50, `Zombis (${ZOMBIE_ORDER.length})`, () => { A.tab = 'zombies'; A.sel = 'normal'; A.z = null; Sfx.play('click'); }, { size: 22, color: A.tab === 'zombies' ? 'red' : 'stone' });
    if (A.tab === 'plants') {
      const S = 0.6;
      PLANT_ORDER.forEach((type, i) => {
        const x = px + 36 + (i % 9) * 66, y = py + 150 + Math.floor(i / 9) * 80;
        ctx.save(); ctx.translate(x, y); ctx.scale(S, S); UI.packet(ctx, 0, 0, type, t, { premium: PLANTS[type].premium }); ctx.restore();
        if (A.sel === type) { Art.rrect(ctx, x - 3, y - 3, 84 * S + 6, 116 * S + 6, 9); ctx.lineWidth = 4; ctx.strokeStyle = '#ffe48a'; ctx.stroke(); }
        UI.region(x, y, 84 * S, 116 * S, () => { A.sel = type; Sfx.play('select'); });
      });
    } else {
      ZOMBIE_ORDER.forEach((type, i) => {
        const x = px + 36 + (i % 5) * 118, y = py + 150 + Math.floor(i / 5) * 126;
        Art.rrect(ctx, x, y, 110, 118, 14); ctx.fillStyle = A.sel === type ? '#6a8a4a' : '#3e5a2a'; ctx.fill();
        ctx.lineWidth = A.sel === type ? 4 : 3; ctx.strokeStyle = A.sel === type ? '#ffe48a' : '#1e1408'; ctx.stroke();
        ctx.save(); Art.rrect(ctx, x, y, 110, 118, 14); ctx.clip();
        ctx.translate(x + 60, y + 58); const hs = (type === 'gargantuar' || type === 'archdemon') ? 0.6 : 0.78; ctx.scale(hs, hs);
        Art.zombieHead(ctx, { type, armor: 1, armorMax: 1, look: null }, true);
        ctx.restore();
        UI.text(ctx, ZOMBIES[type].name.replace('Zombi ', ''), x + 55, y + 106, 13, { fill: '#fff', stroke: '#1e1408', lw: 4, font: UI.BODY, weight: 'bold' });
        UI.region(x, y, 110, 118, () => { A.sel = type; A.z = null; Sfx.play('select'); });
      });
    }
    const fx = px + 660, fy = py + 30, fw = 820, fh = 780;
    Art.rrect(ctx, fx, fy, fw, fh, 20); ctx.fillStyle = 'rgba(20,12,4,0.55)'; ctx.fill();
    ctx.save(); Art.rrect(ctx, fx + 20, fy + 20, fw - 40, 450, 16); ctx.clip();
    ctx.drawImage(this.getBg(A.tab === 'plants' ? 'day' : 'night'), 300, 300, 600, 380, fx + 20, fy + 20, fw - 40, 450);
    if (A.tab === 'plants') {
      ctx.translate(fx + fw / 2, fy + 420); Art.shadow(ctx, 0, 4, 80, 18); ctx.scale(2.8, 2.8);
      Art.plant(ctx, A.sel, t, { armed: true, seed: 1, recoil: Math.max(0, Math.sin(t * 3)) * 0.6, glow: Math.max(0, Math.sin(t)), loaded: true,
        attack: Math.max(0, Math.sin(t * 2)), charge: (t % 3) / 3, dir: 1 });
    } else {
      if (!A.z || A.z.type !== A.sel) A.z = { type: A.sel, look: Art.zombieLook(A.sel, 0.5), animT: 0, state: 'walk', armor: 1, armorMax: 1, hasPole: true, hasImp: true, impLook: Art.zombieLook('imp') };
      A.z.animT += 1 / 60;
      A.z.state = A.sel === 'balloon' ? 'fly' : 'walk';
      const big = (A.sel === 'gargantuar' || A.sel === 'archdemon') ? 0.95 : A.sel === 'imp' ? 2.6 : A.sel === 'balloon' ? 1.45 : 1.9;
      ctx.translate(fx + fw / 2 + 40, fy + 455 - (A.sel === 'balloon' ? 40 : 0)); Art.shadow(ctx, 0, 0, 70, 16); ctx.scale(big, big);
      Art.zombie(ctx, A.z, t);
    }
    ctx.restore();
    if (A.tab === 'plants') {
      const d = PLANTS[A.sel];
      const tag = d.origin === 'gothic' ? 'Reino Gótico · habilidad única' : d.origin === 'new' ? '¡Nueva! Inventada para este juego' : d.origin === 2 ? 'Planta de la secuela' : 'Planta clásica';
      UI.text(ctx, d.name, fx + fw / 2, fy + 520, 48, { fill: '#f0dcaa', stroke: '#141826', lw: 8 });
      UI.text(ctx, tag, fx + fw / 2, fy + 562, 20, { fill: '#a8e070', stroke: null, font: UI.BODY, weight: 'bold' });
      UI.text(ctx, d.desc, fx + fw / 2, fy + 610, 23, { fill: '#f4ecd0', stroke: null, font: UI.BODY, weight: 'bold' });
      UI.text(ctx, `Coste: ${d.cost} soles   ·   Recarga: ${d.cd} s   ·   Resistencia: ${d.hp}`, fx + fw / 2, fy + 664, 23, { fill: '#c8e8a0', stroke: null, font: UI.BODY, weight: 'bold' });
      if (d.premium) UI.text(ctx, '★ En el original era de pago. ¡Aquí es GRATIS! ★', fx + fw / 2, fy + 720, 24, { fill: '#ffd23a', stroke: '#3a1e05', lw: 5 });
    } else {
      const d = ZOMBIES[A.sel];
      UI.text(ctx, d.name, fx + fw / 2, fy + 520, 48, { fill: '#c8f08a', stroke: '#10200a', lw: 8 });
      UI.text(ctx, d.desc, fx + fw / 2, fy + 590, 23, { fill: '#f4ecd0', stroke: null, font: UI.BODY, weight: 'bold' });
      const speed = d.speed >= 1.8 ? 'Rápida' : d.speed <= 0.85 ? 'Lenta' : 'Normal';
      const tough = d.hp + d.armor;
      const lvl = tough >= 2000 ? 'Altísima' : tough >= 1000 ? 'Alta' : tough >= 500 ? 'Media' : 'Baja';
      UI.text(ctx, `Resistencia: ${lvl} (${tough})   ·   Velocidad: ${speed}`, fx + fw / 2, fy + 650, 23, { fill: '#ffb8a0', stroke: null, font: UI.BODY, weight: 'bold' });
    }
    UI.button(ctx, px + 40, py + ph - 76, 200, 56, 'Volver', () => { Sfx.play('click'); this.go('menu'); }, { size: 28, color: 'stone' });
  },

};

window.addEventListener('load', () => {
  const start = () => App.init();
  if (document.fonts && document.fonts.load) {
    Promise.race([document.fonts.load('40px "Luckiest Guy"'), new Promise(r => setTimeout(r, 2500))]).then(start, start);
  } else start();
});

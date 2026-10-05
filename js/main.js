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
    this.menuZombies = ['cone', 'normal', 'bucket', 'gargantuar', 'football', 'imp', 'screendoor'].map((type, i) => ({
      type, look: Art.zombieLook(type), animT: i * 1.7, state: 'walk', armor: 1, armorMax: 1, hasPole: true, hasImp: true, impLook: Art.zombieLook('imp'),
      x: 1100 + i * 260, y: 800 + (i % 2) * 40, spd: 26 * ZOMBIES[type].speed,
    }));
    requestAnimationFrame(ts => this.loop(ts));
  },

  resize() {
    const cw = window.innerWidth, ch = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 3) * this.renderScale;
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
    if (document.hidden || dt <= 0) return;
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
    else if (this.screen === 'game' && this.game) this.game.draw(ctx);
    ctx.restore();
    this.canvas.style.cursor = UI.find(this.mouse.x, this.mouse.y) ? 'pointer' : 'default';
  },

  go(screen) {
    this.screen = screen;
    this.confirmReset = false;
    if (screen !== 'game') { this.game = null; Sfx.setTrack('menu'); }
  },
  startLevel(idx) {
    this.game = new Game(this, idx);
    this.screen = 'game';
  },
  markDone(idx) {
    if (typeof idx === 'number' && !Save.data.done.includes(idx)) { Save.data.done.push(idx); Save.save(); }
  },
  nextLevel() {
    for (let i = 0; i < LEVELS.length; i++) if (!Save.data.done.includes(i)) return i;
    return 0;
  },

  dimBg(ctx, stage, a = 0.5) {
    ctx.drawImage(this.getBg(stage), 0, 0, W, H);
    ctx.fillStyle = `rgba(5,10,20,${a})`; ctx.fillRect(0, 0, W, H);
  },

  // ---------------- Menú principal ----------------
  drawMenu(ctx) {
    const t = this.t;
    ctx.drawImage(this.getBg('dusk'), 0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(30,10,60,0.55)'); g.addColorStop(1, 'rgba(10,5,5,0.7)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // desfile de zombis por la parte de abajo
    const zs = this.menuZombies.slice().sort((a, b) => a.y - b.y);
    for (const z of zs) {
      ctx.save(); ctx.translate(z.x, z.y); Art.shadow(ctx, 0, 0, 40, 10); ctx.scale(1.15, 1.15);
      Art.zombie(ctx, z, t); ctx.restore();
    }
    const deco = (type, x, y, s, ph) => { ctx.save(); ctx.translate(x, y); Art.shadow(ctx, 0, 2, 40, 10); ctx.scale(s, s); Art.plant(ctx, type, t + ph, { seed: ph, armed: true }); ctx.restore(); };
    deco('twinsunflower', 210, 560, 2.0, 0);
    deco('gatling', 400, 700, 1.8, 1);
    deco('torchwood', 150, 790, 1.4, 2);
    deco('wintermelon', 1360, 560, 1.6, 3);
    deco('chomper', 1200, 690, 1.4, 4);

    // logo
    ctx.save(); ctx.translate(W / 2, 130); ctx.rotate(Math.sin(t * 1.2) * 0.012);
    ctx.font = `120px ${UI.FONT}`;
    const w1 = ctx.measureText('JARDÍN').width, w3 = ctx.measureText('ZOMBIS').width;
    ctx.font = `60px ${UI.FONT}`;
    const w2 = ctx.measureText('vs').width + 40;
    const x0 = -(w1 + w2 + w3) / 2;
    UI.text(ctx, 'JARDÍN', x0 + w1 / 2, 0, 120, { fill: Art.lg(ctx, 0, -60, 0, 60, '#e2ff9a', '#4aa81c'), stroke: '#10300a', lw: 16 });
    UI.text(ctx, 'vs', x0 + w1 + w2 / 2, 18, 60, { fill: '#ffe24a', stroke: '#4a2a00', lw: 10 });
    UI.text(ctx, 'ZOMBIS', x0 + w1 + w2 + w3 / 2, 0, 120, { fill: Art.lg(ctx, 0, -60, 0, 60, '#dfe8c8', '#7d8c62'), stroke: '#1a1a12', lw: 16 });
    UI.text(ctx, 'EDICIÓN HD · TODO GRATIS', 0, 92, 34, { fill: '#fff', stroke: '#2a1a08', lw: 7 });
    ctx.restore();

    const d = Save.data;
    const bx = W / 2 - 210, bw = 420;
    let y = 270;
    const nxt = this.nextLevel();
    const allDone = d.done.length >= LEVELS.length;
    UI.button(ctx, bx, y, bw, 84, allDone ? '¡Todo superado! Jugar' : `Jugar · Nivel ${nxt + 1}`, () => { Sfx.play('click'); this.startLevel(nxt); }, { size: 36 });
    y += 100;
    UI.button(ctx, bx, y, bw, 66, 'Elegir nivel', () => { Sfx.play('click'); this.go('levels'); }, { size: 30, color: 'orange' });
    y += 82;
    UI.button(ctx, bx, y, bw, 66, `Modo infinito · récord ${d.best || 0}`, () => { Sfx.play('click'); this.startLevel('endless'); }, { size: 28, color: 'red' });
    y += 82;
    UI.button(ctx, bx, y, bw, 66, 'Almanaque', () => { Sfx.play('click'); this.go('almanac'); }, { size: 30, color: 'green' });
    y += 82;
    UI.button(ctx, bx, y, bw / 2 - 8, 56, `Sonido: ${d.sound ? 'Sí' : 'No'}`, () => { Sfx.setSound(!d.sound); Sfx.play('click'); }, { size: 22, color: 'stone' });
    UI.button(ctx, bx + bw / 2 + 8, y, bw / 2 - 8, 56, `Música: ${d.music ? 'Sí' : 'No'}`, () => { Sfx.init(); Sfx.setMusic(!d.music); Sfx.play('click'); }, { size: 22, color: 'stone' });

    UI.text(ctx, 'Teclas: 1-9 y 0 elegir planta · S pala · Esc pausa · Clic derecho cancelar', W / 2, 884, 18, { fill: '#e8dfc0', stroke: '#1a1005', lw: 4, font: UI.BODY, weight: 'bold' });
  },

  // ---------------- Selección de nivel ----------------
  drawLevels(ctx) {
    const t = this.t;
    this.dimBg(ctx, 'day', 0.5);
    const px = 150, py = 40, pw = 1300, ph = 820;
    UI.panel(ctx, px, py, pw, ph);
    UI.text(ctx, 'Elige un nivel', W / 2, py + 52, 54, { fill: '#ffe48a', stroke: '#3a1e05', lw: 9 });
    UI.text(ctx, 'Todos los niveles están desbloqueados', W / 2, py + 96, 22, { fill: '#f7e9c2', stroke: null, font: UI.BODY, weight: 'bold' });
    const d = Save.data;
    const stageCol = { day: ['#5f9a34', '#3f7a22'], dusk: ['#c0703a', '#8a4a24'], night: ['#3a4a8a', '#24305a'] };
    const cw = 222, chh = 128, gap = 14;
    LEVELS.forEach((L, i) => {
      const cx = px + 52 + (i % 5) * (cw + gap + 4), cy = py + 120 + Math.floor(i / 5) * (chh + gap);
      const over = UI.isOver(cx, cy, cw, chh);
      ctx.save();
      if (over) { ctx.translate(cx + cw / 2, cy + chh / 2); ctx.scale(1.04, 1.04); ctx.translate(-(cx + cw / 2), -(cy + chh / 2)); }
      Art.rrect(ctx, cx, cy, cw, chh, 18);
      const col = stageCol[L.stage];
      ctx.fillStyle = Art.lg(ctx, 0, cy, 0, cy + chh, col[0], col[1]); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = over ? '#ffe48a' : '#1e1408'; ctx.stroke();
      ctx.save(); Art.rrect(ctx, cx, cy, cw, chh, 18); ctx.clip();
      ctx.translate(cx + 168, cy + 122);
      const zt = L.zombies[L.zombies.length - 1];
      const sc = zt === 'gargantuar' ? 0.36 : 0.52;
      ctx.scale(sc, sc);
      Art.zombie(ctx, { type: zt, look: null, animT: t + i, state: over ? 'walk' : 'idle', armor: 1, armorMax: 1, hasPole: true, hasImp: true }, t);
      ctx.restore();
      UI.text(ctx, `${i + 1}`, cx + 36, cy + 36, 40, { fill: '#fff', stroke: '#1e1408', lw: 7 });
      UI.text(ctx, STAGES[L.stage].name, cx + 16, cy + 76, 18, { align: 'left', fill: '#fff', stroke: '#1e1408', lw: 4, font: UI.BODY, weight: 'bold' });
      UI.text(ctx, `${L.waves} oleadas`, cx + 16, cy + 100, 16, { align: 'left', fill: '#f4ecd0', stroke: '#1e1408', lw: 3, font: UI.BODY, weight: 'bold' });
      if (d.done.includes(i)) UI.text(ctx, '★', cx + 36, cy + 120, 26, { fill: '#ffd23a', stroke: '#4a2a00', lw: 4, font: UI.BODY });
      ctx.restore();
      UI.region(cx, cy, cw, chh, () => { Sfx.play('click'); this.startLevel(i); });
    });
    UI.button(ctx, px + 40, py + ph - 86, 200, 60, 'Volver', () => { Sfx.play('click'); this.go('menu'); }, { size: 28, color: 'stone' });
    UI.button(ctx, W / 2 - 170, py + ph - 90, 340, 66, 'Modo infinito', () => { Sfx.play('click'); this.startLevel('endless'); }, { size: 30, color: 'red' });
    UI.button(ctx, px + pw - 290, py + ph - 86, 250, 60, this.confirmReset ? '¿Seguro?' : 'Borrar estrellas', () => {
      Sfx.play('click');
      if (this.confirmReset) { Save.data.done = []; Save.data.best = 0; Save.save(); this.confirmReset = false; }
      else this.confirmReset = true;
    }, { size: 22, color: 'orange' });
  },

  // ---------------- Almanaque ----------------
  drawAlmanac(ctx) {
    const t = this.t, A = this.alm;
    this.dimBg(ctx, 'night', 0.4);
    const px = 60, py = 30, pw = 1480, ph = 840;
    UI.panel(ctx, px, py, pw, ph);
    UI.text(ctx, 'Almanaque', px + 330, py + 52, 50, { fill: '#ffe48a', stroke: '#3a1e05', lw: 8 });
    UI.button(ctx, px + 40, py + 92, 280, 52, 'Plantas', () => { A.tab = 'plants'; A.sel = 'peashooter'; Sfx.play('click'); }, { size: 24, color: A.tab === 'plants' ? 'green' : 'stone' });
    UI.button(ctx, px + 340, py + 92, 280, 52, 'Zombis', () => { A.tab = 'zombies'; A.sel = 'normal'; A.z = null; Sfx.play('click'); }, { size: 24, color: A.tab === 'zombies' ? 'red' : 'stone' });
    // cuadrícula
    if (A.tab === 'plants') {
      PLANT_ORDER.forEach((type, i) => {
        const x = px + 40 + (i % 6) * 98, y = py + 160 + Math.floor(i / 6) * 126;
        UI.packet(ctx, x, y, type, t, { premium: PLANTS[type].premium });
        if (A.sel === type) { Art.rrect(ctx, x - 3, y - 3, 90, 122, 10); ctx.lineWidth = 4; ctx.strokeStyle = '#ffe48a'; ctx.stroke(); }
        UI.region(x, y, 84, 116, () => { A.sel = type; Sfx.play('select'); });
      });
    } else {
      ZOMBIE_ORDER.forEach((type, i) => {
        const x = px + 40 + (i % 4) * 146, y = py + 160 + Math.floor(i / 4) * 160;
        Art.rrect(ctx, x, y, 134, 148, 14); ctx.fillStyle = A.sel === type ? '#6a8a4a' : '#3e5a2a'; ctx.fill();
        ctx.lineWidth = A.sel === type ? 4 : 3; ctx.strokeStyle = A.sel === type ? '#ffe48a' : '#1e1408'; ctx.stroke();
        ctx.save(); Art.rrect(ctx, x, y, 134, 148, 14); ctx.clip();
        ctx.translate(x + 74, y + 74); ctx.scale(type === 'gargantuar' ? 0.75 : 1, type === 'gargantuar' ? 0.75 : 1);
        Art.zombieHead(ctx, { type, armor: 1, armorMax: 1, look: null }, true);
        ctx.restore();
        UI.text(ctx, ZOMBIES[type].name.replace('Zombi ', ''), x + 67, y + 132, 15, { fill: '#fff', stroke: '#1e1408', lw: 4, font: UI.BODY, weight: 'bold' });
        UI.region(x, y, 134, 148, () => { A.sel = type; A.z = null; Sfx.play('select'); });
      });
    }
    // ficha
    const fx = px + 660, fy = py + 30, fw = 780, fh = 760;
    Art.rrect(ctx, fx, fy, fw, fh, 20);
    ctx.fillStyle = 'rgba(20,12,4,0.55)'; ctx.fill();
    // escenario de muestra
    ctx.save(); Art.rrect(ctx, fx + 20, fy + 20, fw - 40, 430, 16); ctx.clip();
    ctx.drawImage(this.getBg(A.tab === 'plants' ? 'day' : 'night'), 300, 300, 600, 380, fx + 20, fy + 20, fw - 40, 430);
    if (A.tab === 'plants') {
      ctx.translate(fx + fw / 2, fy + 400); Art.shadow(ctx, 0, 4, 80, 18); ctx.scale(2.8, 2.8);
      Art.plant(ctx, A.sel, t, { armed: true, seed: 1, recoil: Math.max(0, Math.sin(t * 3)) * 0.6, glow: Math.max(0, Math.sin(t)), loaded: true });
    } else {
      if (!A.z || A.z.type !== A.sel) A.z = { type: A.sel, look: Art.zombieLook(A.sel, 0.5), animT: 0, state: 'walk', armor: 1, armorMax: 1, hasPole: true, hasImp: true, impLook: Art.zombieLook('imp') };
      A.z.animT += 1 / 60;
      const big = A.sel === 'gargantuar' ? 0.95 : A.sel === 'imp' ? 2.6 : 1.9;
      ctx.translate(fx + fw / 2 + 40, fy + 430); Art.shadow(ctx, 0, 0, 70, 16); ctx.scale(big, big);
      Art.zombie(ctx, A.z, t);
    }
    ctx.restore();
    if (A.tab === 'plants') {
      const d = PLANTS[A.sel];
      UI.text(ctx, d.name, fx + fw / 2, fy + 500, 50, { fill: '#ffe48a', stroke: '#3a1e05', lw: 8 });
      UI.text(ctx, d.desc, fx + fw / 2, fy + 560, 24, { fill: '#f4ecd0', stroke: null, font: UI.BODY, weight: 'bold' });
      UI.text(ctx, `Coste: ${d.cost} soles   ·   Recarga: ${d.cd} s   ·   Resistencia: ${d.hp}`, fx + fw / 2, fy + 620, 24, { fill: '#c8e8a0', stroke: null, font: UI.BODY, weight: 'bold' });
      if (d.premium) UI.text(ctx, '★ En el juego original era de pago. ¡Aquí es GRATIS! ★', fx + fw / 2, fy + 680, 24, { fill: '#ffd23a', stroke: '#3a1e05', lw: 5 });
    } else {
      const d = ZOMBIES[A.sel];
      UI.text(ctx, d.name, fx + fw / 2, fy + 500, 50, { fill: '#c8f08a', stroke: '#10200a', lw: 8 });
      UI.text(ctx, d.desc, fx + fw / 2, fy + 560, 24, { fill: '#f4ecd0', stroke: null, font: UI.BODY, weight: 'bold' });
      const speed = d.speed >= 1.8 ? 'Rápida' : d.speed <= 0.85 ? 'Lenta' : 'Normal';
      const tough = d.hp + d.armor;
      const lvl = tough >= 2000 ? 'Altísima' : tough >= 1000 ? 'Alta' : tough >= 500 ? 'Media' : 'Baja';
      UI.text(ctx, `Resistencia: ${lvl} (${tough})   ·   Velocidad: ${speed}`, fx + fw / 2, fy + 620, 24, { fill: '#ffb8a0', stroke: null, font: UI.BODY, weight: 'bold' });
    }
    UI.button(ctx, px + 40, py + ph - 86, 200, 60, 'Volver', () => { Sfx.play('click'); this.go('menu'); }, { size: 28, color: 'stone' });
  },
};

window.addEventListener('load', () => {
  const start = () => App.init();
  if (document.fonts && document.fonts.load) {
    Promise.race([document.fonts.load('40px "Luckiest Guy"'), new Promise(r => setTimeout(r, 2500))]).then(start, start);
  } else start();
});

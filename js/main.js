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
      else if (e.key === 'Escape' && this.screen === 'levels') this.go('menu');
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.game && this.game.phase === 'play') this.game.paused = true;
    });
    requestAnimationFrame(ts => this.loop(ts));
  },

  resize() {
    const cw = window.innerWidth, ch = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
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
  getBg(lanes) {
    const key = lanes.join(',');
    if (this.bgCache[key]) return this.bgCache[key];
    const k = this.scale * this.dpr;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W * k)); c.height = Math.max(1, Math.round(H * k));
    const g = c.getContext('2d');
    g.setTransform(k, 0, 0, k, 0, 0);
    Art.background(g, lanes);
    this.bgCache[key] = c;
    return c;
  },

  loop(ts) {
    const dt = Math.min(0.05, (ts - (this.last || ts)) / 1000);
    this.last = ts;
    this.t += dt;
    if (this.screen === 'game' && this.game) this.game.update(dt);
    this.draw();
    requestAnimationFrame(t => this.loop(t));
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
  completeLevel(idx) {
    const d = Save.data;
    if (typeof idx === 'number') {
      const L = LEVELS[idx];
      if (L.reward && !d.plants.includes(L.reward)) d.plants.push(L.reward);
      d.level = Math.max(d.level, idx + 1);
      Save.save();
      if (idx + 1 < LEVELS.length) { this.startLevel(idx + 1); return; }
    }
    this.go('menu');
  },

  // ---------------- Menú principal ----------------
  drawMenu(ctx) {
    const t = this.t;
    ctx.drawImage(this.getBg(ALL_LANES), 0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(10,20,40,0.55)'); g.addColorStop(1, 'rgba(10,10,5,0.65)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // decoración
    const deco = (type, x, y, s, ph) => { ctx.save(); ctx.translate(x, y); Art.shadow(ctx, 0, 2, 40, 10); ctx.scale(s, s); Art.plant(ctx, type, t + ph, { seed: ph, armed: true }); ctx.restore(); };
    deco('sunflower', 190, 640, 2.0, 0);
    deco('peashooter', 360, 760, 1.9, 1);
    deco('wallnut', 160, 860, 1.6, 2);
    deco('chomper', 420, 520, 1.3, 3);
    ctx.save(); ctx.translate(1340, 820); Art.shadow(ctx, 0, 0, 60, 14); ctx.scale(2.3, 2.3);
    Art.zombie(ctx, { type: 'cone', animT: t, state: 'walk', armor: 1, armorMax: 1 }, t); ctx.restore();
    ctx.save(); ctx.translate(1500, 650); ctx.scale(1.4, 1.4);
    Art.zombie(ctx, { type: 'normal', animT: t + 1.3, state: 'walk', armor: 0, armorMax: 1 }, t); ctx.restore();

    // logo
    ctx.save(); ctx.translate(W / 2, 150); ctx.rotate(Math.sin(t * 1.2) * 0.012);
    ctx.font = `120px ${UI.FONT}`;
    const w1 = ctx.measureText('JARDÍN').width, w3 = ctx.measureText('ZOMBIS').width;
    ctx.font = `60px ${UI.FONT}`;
    const w2 = ctx.measureText('vs').width + 40;
    const total = w1 + w2 + w3, x0 = -total / 2;
    UI.text(ctx, 'JARDÍN', x0 + w1 / 2, 0, 120, { fill: Art.lg(ctx, 0, -60, 0, 60, '#d6ff8a', '#4aa81c'), stroke: '#10300a', lw: 16 });
    UI.text(ctx, 'vs', x0 + w1 + w2 / 2, 18, 60, { fill: '#ffe24a', stroke: '#4a2a00', lw: 10 });
    UI.text(ctx, 'ZOMBIS', x0 + w1 + w2 + w3 / 2, 0, 120, { fill: Art.lg(ctx, 0, -60, 0, 60, '#d9e3c4', '#7d8c62'), stroke: '#1a1a12', lw: 16 });
    UI.text(ctx, 'EDICIÓN HD', 0, 92, 34, { fill: '#fff', stroke: '#2a1a08', lw: 7 });
    ctx.restore();

    const d = Save.data;
    const lvl = Math.min(d.level, LEVELS.length - 1);
    const bx = W / 2 - 200, bw = 400;
    let y = 300;
    const done = d.level >= LEVELS.length;
    UI.button(ctx, bx, y, bw, 86, done ? 'Aventura completada' : `Aventura · Nivel ${lvl + 1}`, () => { Sfx.play('click'); this.startLevel(lvl); }, { size: 36 });
    y += 106;
    UI.button(ctx, bx, y, bw, 70, 'Elegir nivel', () => { Sfx.play('click'); this.go('levels'); }, { size: 32, color: 'orange' });
    y += 90;
    UI.button(ctx, bx, y, bw, 70, done ? `Modo infinito (récord: ${d.best || 0})` : 'Modo infinito 🔒', () => {
      Sfx.play('click'); this.startLevel('endless');
    }, { size: done ? 26 : 30, color: 'red', disabled: !done });
    y += 90;
    UI.button(ctx, bx, y, bw / 2 - 8, 60, `Sonido: ${d.sound ? 'Sí' : 'No'}`, () => { Sfx.setSound(!d.sound); Sfx.play('click'); }, { size: 24, color: 'stone' });
    UI.button(ctx, bx + bw / 2 + 8, y, bw / 2 - 8, 60, `Música: ${d.music ? 'Sí' : 'No'}`, () => { Sfx.setMusic(!d.music); Sfx.play('click'); }, { size: 24, color: 'stone' });

    UI.text(ctx, 'Recoge soles · Planta defensas · ¡Que no entren en tu casa!', W / 2, 840, 24, { fill: '#f4ecd0', stroke: '#1a1005', lw: 5, font: UI.BODY, weight: 'bold' });
    UI.text(ctx, 'Teclas: 1-8 elegir planta · S pala · Esc pausa · Clic derecho cancelar', W / 2, 872, 18, { fill: '#cfc6a8', stroke: '#1a1005', lw: 4, font: UI.BODY, weight: 'bold' });
  },

  // ---------------- Selección de nivel ----------------
  drawLevels(ctx) {
    const t = this.t;
    ctx.drawImage(this.getBg(ALL_LANES), 0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H);
    const px = 260, py = 70, pw = 1080, ph = 760;
    UI.panel(ctx, px, py, pw, ph);
    UI.text(ctx, 'Elige un nivel', W / 2, py + 60, 56, { fill: '#ffe48a', stroke: '#3a1e05', lw: 9 });
    const d = Save.data;
    LEVELS.forEach((L, i) => {
      const cx = px + 70 + (i % 4) * 240, cy = py + 120 + Math.floor(i / 4) * 170;
      const locked = i > d.level;
      const over = !locked && UI.isOver(cx, cy, 220, 150);
      ctx.save();
      Art.rrect(ctx, cx, cy, 220, 150, 18);
      ctx.fillStyle = locked ? '#3a3328' : over ? '#6a9a3a' : '#4f7a2a'; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = '#1e1408'; ctx.stroke();
      if (!locked) {
        ctx.save(); Art.rrect(ctx, cx, cy, 220, 150, 18); ctx.clip();
        ctx.translate(cx + 170, cy + 140); ctx.scale(0.62, 0.62);
        const zt = L.zombies[L.zombies.length - 1];
        Art.zombie(ctx, { type: zt, animT: t + i, state: over ? 'walk' : 'idle', armor: 1, armorMax: 1, hasPole: true }, t);
        ctx.restore();
        if (L.reward) { ctx.save(); ctx.translate(cx + 50, cy + 132); ctx.scale(0.5, 0.5); Art.plant(ctx, L.reward, t + i, { armed: true }); ctx.restore(); }
      }
      UI.text(ctx, locked ? '🔒' : `${i + 1}`, cx + 40, cy + 36, 40, { fill: '#fff', stroke: '#1e1408', lw: 7 });
      if (i < d.level) UI.text(ctx, '✔', cx + 196, cy + 28, 30, { fill: '#b8ff6a', stroke: '#1e1408', lw: 5, font: UI.BODY });
      ctx.restore();
      if (!locked) UI.region(cx, cy, 220, 150, () => { Sfx.play('click'); this.startLevel(i); });
    });
    UI.button(ctx, px + 40, py + ph - 90, 200, 62, 'Volver', () => { Sfx.play('click'); this.go('menu'); }, { size: 28, color: 'stone' });
    UI.button(ctx, px + pw - 300, py + ph - 90, 260, 62, this.confirmReset ? '¿Seguro?' : 'Borrar progreso', () => {
      Sfx.play('click');
      if (this.confirmReset) { Save.data.level = 0; Save.data.plants = ['peashooter']; Save.data.best = 0; Save.save(); this.confirmReset = false; }
      else this.confirmReset = true;
    }, { size: 24, color: 'red' });
  },
};

window.addEventListener('load', () => {
  const start = () => App.init();
  if (document.fonts && document.fonts.load) {
    Promise.race([document.fonts.load('40px "Luckiest Guy"'), new Promise(r => setTimeout(r, 2500))]).then(start, start);
  } else start();
});

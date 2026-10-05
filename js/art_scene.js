'use strict';
// =====================================================================
//  Escenarios: Día, Atardecer y Noche (se pre-renderizan en HD)
// =====================================================================
(() => {
  const { TAU, circle, rrect } = Art;
  function mulberry(seed) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const PALETTES = {
    day:   { sky: ['#62b6ee', '#cdeefc'], tree: [50, 125, 50], fence: ['#f3e7cf', '#e9dcbf'], hedge: ['#2f7a22', '#3a8c2a'],
             lawn: [['#82d046', '#6cbe35'], ['#68ba31', '#58a828']], house: ['#c9b38f', '#e8d6b4'], window: ['#bfe7ff', '#5c9cc8'] },
    dusk:  { sky: ['#4a3a7a', '#ff9a5a'], tree: [60, 90, 50], fence: ['#f0d6b8', '#e2c6a6'], hedge: ['#2a6a26', '#357a2c'],
             lawn: [['#86c84a', '#70b23a'], ['#6aae34', '#5a9c2c']], house: ['#c4a687', '#e2c6a2'], window: ['#ffd27a', '#e08a3a'] },
    night: { sky: ['#0a0f2a', '#28366a'], tree: [25, 55, 45], fence: ['#c6c8d8', '#b4b6c8'], hedge: ['#1e4a2a', '#265a32'],
             lawn: [['#6fb84a', '#5ca63c'], ['#58a036', '#4a8e2e']], house: ['#9a9aae', '#b8b8c8'], window: ['#ffe9a0', '#ffb84a'] },
  };

  function background(ctx, stage = 'day') {
    const P = PALETTES[stage] || PALETTES.day;
    const rnd = mulberry(1234);
    // cielo
    let g = ctx.createLinearGradient(0, 0, 0, 170);
    g.addColorStop(0, P.sky[0]); g.addColorStop(1, P.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 170);
    if (stage === 'night') {
      for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.7})`; circle(ctx, rnd() * W, rnd() * 120, rnd() * 1.6 + 0.4); ctx.fill(); }
      // luna
      const mg = ctx.createRadialGradient(1180, 52, 10, 1180, 52, 90);
      mg.addColorStop(0, 'rgba(255,250,220,0.55)'); mg.addColorStop(1, 'rgba(255,250,220,0)');
      ctx.fillStyle = mg; circle(ctx, 1180, 52, 90); ctx.fill();
      circle(ctx, 1180, 52, 34); ctx.fillStyle = '#fbf6dc'; ctx.fill();
      ctx.fillStyle = 'rgba(180,175,150,0.45)'; circle(ctx, 1170, 44, 7); ctx.fill(); circle(ctx, 1192, 62, 5); ctx.fill(); circle(ctx, 1186, 38, 3.5); ctx.fill();
    } else if (stage === 'dusk') {
      const sg = ctx.createRadialGradient(1000, 150, 10, 1000, 150, 220);
      sg.addColorStop(0, 'rgba(255,230,140,0.95)'); sg.addColorStop(0.25, 'rgba(255,160,80,0.6)'); sg.addColorStop(1, 'rgba(255,120,60,0)');
      ctx.fillStyle = sg; ctx.fillRect(700, 0, 600, 170);
      circle(ctx, 1000, 150, 46); ctx.fillStyle = '#ffd77a'; ctx.fill();
    } else {
      circle(ctx, 1260, 46, 30); ctx.fillStyle = 'rgba(255,248,200,0.9)'; ctx.fill();
    }
    // nubes
    ctx.fillStyle = stage === 'night' ? 'rgba(120,130,170,0.35)' : stage === 'dusk' ? 'rgba(255,200,180,0.7)' : 'rgba(255,255,255,0.88)';
    for (let i = 0; i < 7; i++) {
      const cx = 160 + i * 230 + rnd() * 80, cy = 22 + rnd() * 30;
      for (let k = 0; k < 4; k++) { circle(ctx, cx + k * 22, cy + Math.sin(k * 2) * 6, 18 + (k % 2) * 6); ctx.fill(); }
    }
    // árboles al fondo
    for (let i = 0; i < 13; i++) {
      const tx = i * 130 + rnd() * 60, ty = 102;
      circle(ctx, tx, ty, 48 + rnd() * 22);
      const [r, gg, b] = P.tree;
      ctx.fillStyle = `rgb(${r + rnd() * 20 | 0},${gg + rnd() * 30 | 0},${b + rnd() * 20 | 0})`; ctx.fill();
    }
    // valla
    for (let x = 140; x < LAWN_RIGHT + 20; x += 34) {
      ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(x, 66); ctx.lineTo(x + 14, 54); ctx.lineTo(x + 28, 66); ctx.lineTo(x + 28, 150); ctx.closePath();
      ctx.fillStyle = (x / 34 | 0) % 2 ? P.fence[0] : P.fence[1]; ctx.fill();
      ctx.strokeStyle = 'rgba(90,70,40,0.55)'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.fillStyle = 'rgba(120,95,60,0.35)'; ctx.fillRect(140, 82, LAWN_RIGHT - 120, 10); ctx.fillRect(140, 124, LAWN_RIGHT - 120, 10);
    // seto
    for (let x = 130; x < LAWN_RIGHT + 30; x += 22) {
      circle(ctx, x, 152 + rnd() * 6, 18 + rnd() * 7);
      ctx.fillStyle = rnd() > 0.5 ? P.hedge[0] : P.hedge[1]; ctx.fill();
    }
    // césped a cuadros
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = GRID_X + c * COL_W, y = GRID_Y + r * ROW_H;
      const pal = (r + c) % 2 === 0 ? P.lawn[0] : P.lawn[1];
      g = ctx.createLinearGradient(x, y, x, y + ROW_H);
      g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]);
      ctx.fillStyle = g; ctx.fillRect(x, y, COL_W + 0.5, ROW_H + 0.5);
    }
    // franjas de corte
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let r = 0; r < ROWS; r++) ctx.fillRect(GRID_X, GRID_Y + r * ROW_H + 8, COLS * COL_W, 18);
    // briznas, flores y piedras
    for (let i = 0; i < 3200; i++) {
      const x = GRID_X + rnd() * COLS * COL_W, y = GRID_Y + rnd() * ROWS * ROW_H;
      ctx.strokeStyle = rnd() > 0.5 ? 'rgba(30,100,15,0.5)' : 'rgba(190,240,120,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + (rnd() - 0.5) * 4, y - 4, x + (rnd() - 0.5) * 7, y - 6 - rnd() * 6); ctx.stroke();
    }
    for (let i = 0; i < 46; i++) {
      const x = GRID_X + rnd() * COLS * COL_W, y = GRID_Y + rnd() * ROWS * ROW_H;
      const col = ['#fff', '#ffe24a', '#ff9ad0', '#c8a8ff'][i % 4];
      ctx.fillStyle = col;
      for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; circle(ctx, x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.4); ctx.fill(); }
      ctx.fillStyle = '#f2a20c'; circle(ctx, x, y, 1.8); ctx.fill();
    }
    for (let i = 0; i < 24; i++) { ctx.fillStyle = 'rgba(120,110,90,0.6)'; circle(ctx, GRID_X + rnd() * COLS * COL_W, GRID_Y + rnd() * ROWS * ROW_H, 2 + rnd() * 3); ctx.fill(); }
    // casa
    g = ctx.createLinearGradient(0, 0, 150, 0);
    g.addColorStop(0, P.house[0]); g.addColorStop(1, P.house[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 150, H);
    for (let y = 0; y < H; y += 26) { ctx.fillStyle = 'rgba(70,50,30,0.25)'; ctx.fillRect(0, y, 150, 3); }
    rrect(ctx, 20, 230, 100, 130, 6); ctx.fillStyle = '#5b3a1f'; ctx.fill();
    g = ctx.createLinearGradient(28, 238, 112, 352); g.addColorStop(0, P.window[0]); g.addColorStop(1, P.window[1]);
    ctx.fillStyle = g; ctx.fillRect(28, 238, 84, 114);
    if (stage !== 'day') { const wg = ctx.createRadialGradient(70, 295, 10, 70, 295, 160); wg.addColorStop(0, 'rgba(255,210,120,0.35)'); wg.addColorStop(1, 'rgba(255,210,120,0)'); ctx.fillStyle = wg; ctx.fillRect(0, 130, 260, 330); }
    ctx.fillStyle = '#5b3a1f'; ctx.fillRect(67, 238, 6, 114); ctx.fillRect(28, 292, 84, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(32, 242); ctx.lineTo(60, 242); ctx.lineTo(32, 280); ctx.fill();
    rrect(ctx, 30, 520, 90, 190, 8); ctx.fillStyle = '#7a4a22'; ctx.fill(); ctx.strokeStyle = '#3a2008'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = 'rgba(40,20,5,0.5)'; ctx.lineWidth = 3; ctx.strokeRect(42, 535, 66, 70); ctx.strokeRect(42, 620, 66, 75);
    circle(ctx, 106, 615, 5); ctx.fillStyle = '#e8c04a'; ctx.fill();
    // porche
    g = ctx.createLinearGradient(150, 0, GRID_X, 0); g.addColorStop(0, '#a87a48'); g.addColorStop(1, '#8a5e33');
    ctx.fillStyle = g; ctx.fillRect(150, 150, GRID_X - 150, H - 150);
    for (let y = 150; y < H; y += 30) { ctx.fillStyle = 'rgba(50,30,10,0.35)'; ctx.fillRect(150, y, GRID_X - 150, 2.5); }
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(GRID_X - 6, 150, 6, H - 150);
    // acera y carretera
    ctx.fillStyle = '#c9c4b8'; ctx.fillRect(LAWN_RIGHT, 0, 60, H);
    for (let y = 0; y < H; y += 90) { ctx.fillStyle = '#a8a397'; ctx.fillRect(LAWN_RIGHT, y, 60, 3); }
    ctx.fillStyle = '#8f8a7e'; ctx.fillRect(LAWN_RIGHT + 56, 0, 8, H);
    g = ctx.createLinearGradient(LAWN_RIGHT + 64, 0, W, 0); g.addColorStop(0, '#4a4a4e'); g.addColorStop(1, '#38383c');
    ctx.fillStyle = g; ctx.fillRect(LAWN_RIGHT + 64, 0, W - LAWN_RIGHT - 64, H);
    for (let i = 0; i < 1000; i++) { ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)'; ctx.fillRect(LAWN_RIGHT + 64 + rnd() * 200, rnd() * H, 2, 2); }
    ctx.fillStyle = '#e8c42a';
    for (let y = 10; y < H; y += 70) ctx.fillRect(1530, y, 8, 40);
    // alcantarilla y grietas
    rrect(ctx, 1440, 600, 50, 24, 4); ctx.fillStyle = '#2a2a2c'; ctx.fill();
    ctx.fillStyle = '#4a4a4e'; for (let i = 0; i < 5; i++) ctx.fillRect(1445 + i * 9, 603, 4, 18);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(1420, 300); ctx.lineTo(1440, 320); ctx.lineTo(1436, 345); ctx.moveTo(1560, 760); ctx.lineTo(1575, 740); ctx.lineTo(1590, 748); ctx.stroke();
    // farolas
    if (stage !== 'day') for (const ly of [230, 690]) lamp(ctx, LAWN_RIGHT + 30, ly, false);
    for (let x = 130; x < LAWN_RIGHT + 30; x += 22) { circle(ctx, x, H + 4, 16); ctx.fillStyle = P.hedge[0]; ctx.fill(); }
  }
  function lamp(ctx, x, y, glowOnly) {
    if (!glowOnly) {
      ctx.fillStyle = '#2a2a30'; ctx.fillRect(x - 3, y - 110, 6, 110);
      rrect(ctx, x - 12, y - 126, 24, 18, 4); ctx.fillStyle = '#3a3a42'; ctx.fill();
      ctx.fillStyle = '#fff2b0'; ctx.fillRect(x - 8, y - 112, 16, 6);
      return;
    }
    const g = ctx.createRadialGradient(x, y - 100, 5, x, y - 40, 170);
    g.addColorStop(0, 'rgba(255,230,150,0.45)'); g.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = g; circle(ctx, x, y - 40, 170); ctx.fill();
  }

  function crater(ctx, x, y, k) {
    ctx.save(); ctx.globalAlpha = Math.min(1, k * 4);
    Art.ell(ctx, x, y - 10, 52, 22); ctx.fillStyle = '#3a2a1a'; ctx.fill();
    Art.ell(ctx, x, y - 8, 40, 15); ctx.fillStyle = '#1e140a'; ctx.fill();
    ctx.fillStyle = '#5a4026';
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; circle(ctx, x + Math.cos(a) * 54, y - 10 + Math.sin(a) * 22, 5); ctx.fill(); }
    ctx.restore();
  }

  // Criaturas ambientales (mariposas, luciérnagas, hojas)
  function ambient(ctx, a, t) {
    if (a.kind === 'butterfly') {
      const f = Math.abs(Math.sin(t * 14 + a.seed));
      ctx.save(); ctx.translate(a.x, a.y);
      ctx.fillStyle = a.col;
      Art.ell(ctx, -5 * f, -3, 6 * f + 1, 5); ctx.fill(); Art.ell(ctx, 5 * f, -3, 6 * f + 1, 5); ctx.fill();
      Art.ell(ctx, -4 * f, 4, 4 * f + 1, 3.5); ctx.fill(); Art.ell(ctx, 4 * f, 4, 4 * f + 1, 3.5); ctx.fill();
      ctx.fillStyle = '#222'; ctx.fillRect(-1, -5, 2, 11);
      ctx.restore();
    } else if (a.kind === 'firefly') {
      const b = 0.4 + 0.6 * Math.max(0, Math.sin(t * 3 + a.seed));
      const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, 14);
      g.addColorStop(0, `rgba(230,255,140,${b})`); g.addColorStop(1, 'rgba(200,255,100,0)');
      ctx.fillStyle = g; circle(ctx, a.x, a.y, 14); ctx.fill();
    } else if (a.kind === 'leaf') {
      ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(t * 2 + a.seed);
      Art.ell(ctx, 0, 0, 7, 3.5); ctx.fillStyle = a.col; ctx.fill();
      ctx.restore();
    }
  }

  Object.assign(Art, { background, crater, ambient, lamp });
})();

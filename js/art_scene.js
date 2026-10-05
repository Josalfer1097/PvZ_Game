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
    egypt: { sky: ['#f29a52', '#ffe4a8'], tree: [60, 110, 40], fence: ['#e8c890', '#d8b478'], hedge: ['#b89058', '#a87c48'],
             lawn: [['#ecd08e', '#e0bf78'], ['#dcb46e', '#cfa25e']], house: ['#d8b888', '#ecd2a6'], window: ['#bfe7ff', '#5c9cc8'] },
  };

  function background(ctx, stage = 'day') {
    const egypt = stage === 'egypt';
    if (stage === 'fog') stage = 'night';
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
    if (egypt) {
      for (const [x, w, h, c] of [[300, 260, 120, '#d89a5a'], [620, 340, 150, '#e0a868'], [1000, 220, 100, '#cc8a4a'], [1250, 300, 130, '#d89a5a']]) {
        ctx.beginPath(); ctx.moveTo(x - w / 2, 150); ctx.lineTo(x, 150 - h); ctx.lineTo(x + w / 2, 150); ctx.closePath(); ctx.fillStyle = c; ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, 150 - h); ctx.lineTo(x + w / 2, 150); ctx.lineTo(x + w * 0.1, 150); ctx.closePath(); ctx.fillStyle = 'rgba(90,40,10,0.25)'; ctx.fill();
        ctx.strokeStyle = 'rgba(90,50,20,0.25)'; ctx.lineWidth = 1;
        for (let y = 150 - h + 12; y < 150; y += 12) { const k = (150 - y) / h; ctx.beginPath(); ctx.moveTo(x - w / 2 * (1 - k), y); ctx.lineTo(x + w / 2 * (1 - k), y); ctx.stroke(); }
      }
      for (const px of [160, 470, 860, 1180]) {
        ctx.strokeStyle = '#7a5a30'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(px, 150); ctx.quadraticCurveTo(px + 12, 110, px + 4, 70); ctx.stroke();
        for (let k = 0; k < 6; k++) { const a = -Math.PI + k * 0.55; ctx.save(); ctx.translate(px + 4, 70); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(22, -12, 44, 6); ctx.quadraticCurveTo(22, -2, 0, 0); ctx.fillStyle = k % 2 ? '#3a8a2a' : '#4aa03a'; ctx.fill(); ctx.restore(); }
      }
    } else
    // árboles al fondo
    for (let i = 0; i < 13; i++) {
      const tx = i * 130 + rnd() * 60, ty = 102;
      circle(ctx, tx, ty, 48 + rnd() * 22);
      const [r, gg, b] = P.tree;
      ctx.fillStyle = `rgb(${r + rnd() * 20 | 0},${gg + rnd() * 30 | 0},${b + rnd() * 20 | 0})`; ctx.fill();
    }
    if (egypt) {
      for (let y = 100; y < 150; y += 16) for (let x = 140 + ((y / 16) % 2) * 20; x < LAWN_RIGHT + 20; x += 40) {
        ctx.fillStyle = ((x + y) / 40 | 0) % 2 ? '#e2c08a' : '#d8b47c'; ctx.fillRect(x, y, 38, 14);
        ctx.strokeStyle = 'rgba(120,80,40,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, 38, 14);
      }
      for (let x = 200; x < LAWN_RIGHT; x += 230) {
        ctx.fillStyle = '#c89a5a'; ctx.fillRect(x, 60, 26, 90); ctx.fillStyle = '#e8c890'; ctx.fillRect(x - 6, 54, 38, 10);
        ctx.fillStyle = 'rgba(90,50,10,0.4)'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 6, 72 + k * 18, 14, 3);
      }
    } else
    for (let x = 140; x < LAWN_RIGHT + 20; x += 34) {
      ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(x, 66); ctx.lineTo(x + 14, 54); ctx.lineTo(x + 28, 66); ctx.lineTo(x + 28, 150); ctx.closePath();
      ctx.fillStyle = (x / 34 | 0) % 2 ? P.fence[0] : P.fence[1]; ctx.fill();
      ctx.strokeStyle = 'rgba(90,70,40,0.55)'; ctx.lineWidth = 2; ctx.stroke();
    }
    if (!egypt) { ctx.fillStyle = 'rgba(120,95,60,0.35)'; ctx.fillRect(140, 82, LAWN_RIGHT - 120, 10); ctx.fillRect(140, 124, LAWN_RIGHT - 120, 10); }
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
    if (egypt) {
      for (let i = 0; i < 3000; i++) { ctx.fillStyle = rnd() > 0.5 ? 'rgba(150,100,40,0.3)' : 'rgba(255,240,200,0.4)'; ctx.fillRect(GRID_X + rnd() * COLS * COL_W, GRID_Y + rnd() * ROWS * ROW_H, 2, 2); }
      ctx.strokeStyle = 'rgba(160,110,50,0.25)'; ctx.lineWidth = 2;
      for (let i = 0; i < 40; i++) { const x = GRID_X + rnd() * COLS * COL_W, y = GRID_Y + rnd() * ROWS * ROW_H; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 20, y - 6, x + 40, y); ctx.stroke(); }
    } else
    for (let i = 0; i < 3200; i++) {
      const x = GRID_X + rnd() * COLS * COL_W, y = GRID_Y + rnd() * ROWS * ROW_H;
      ctx.strokeStyle = rnd() > 0.5 ? 'rgba(30,100,15,0.5)' : 'rgba(190,240,120,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + (rnd() - 0.5) * 4, y - 4, x + (rnd() - 0.5) * 7, y - 6 - rnd() * 6); ctx.stroke();
    }
    if (!egypt) for (let i = 0; i < 46; i++) {
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
    if (stage === 'night' || stage === 'dusk') { const wg = ctx.createRadialGradient(70, 295, 10, 70, 295, 160); wg.addColorStop(0, 'rgba(255,210,120,0.35)'); wg.addColorStop(1, 'rgba(255,210,120,0)'); ctx.fillStyle = wg; ctx.fillRect(0, 130, 260, 330); }
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
    if (stage === 'night' || stage === 'dusk') for (const ly of [230, 690]) lamp(ctx, LAWN_RIGHT + 30, ly, false);
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

  // Lápida egipcia (bloquea guisantes)
  function tomb(ctx, x, y, frac) {
    Art.shadow(ctx, x, y + 2, 40, 9);
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-30, -70); ctx.quadraticCurveTo(-30, -96, 0, -98); ctx.quadraticCurveTo(30, -96, 30, -70); ctx.lineTo(30, 0); ctx.closePath();
    Art.fs(ctx, Art.lg(ctx, -30, 0, 30, 0, '#e8d0a0', '#b89a68', '#7a6040'), '#3a2a14', 3);
    ctx.fillStyle = 'rgba(90,60,30,0.6)';
    // jeroglíficos
    ctx.fillRect(-14, -78, 4, 14); Art.circle(ctx, 4, -74, 5); ctx.fill(); ctx.fillRect(10, -80, 8, 3);
    ctx.beginPath(); ctx.moveTo(-14, -52); ctx.lineTo(-4, -60); ctx.lineTo(6, -52); ctx.closePath(); ctx.fill();
    ctx.fillRect(-16, -40, 30, 3); Art.ell(ctx, 0, -28, 8, 5); ctx.fill(); ctx.fillRect(-2, -22, 4, 12);
    ctx.strokeStyle = 'rgba(60,40,20,0.7)'; ctx.lineWidth = 2;
    if (frac < 0.66) { ctx.beginPath(); ctx.moveTo(-30, -60); ctx.lineTo(-14, -48); ctx.lineTo(-20, -32); ctx.stroke(); }
    if (frac < 0.33) { ctx.beginPath(); ctx.moveTo(30, -84); ctx.lineTo(12, -66); ctx.lineTo(18, -50); ctx.lineTo(4, -38); ctx.stroke(); }
    Art.highlight(ctx, -20, -60, 3, 22, 0, 0.4);
    ctx.restore();
  }
  // Niebla: cada celda tiene una densidad (0..1)
  function fog(ctx, dens, t) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS + 2; c++) {
      const d = dens[r][Math.min(c, COLS - 1)];
      if (d <= 0.02) continue;
      const x = GRID_X + c * COL_W + COL_W / 2, y = GRID_Y + r * ROW_H + ROW_H / 2;
      for (let k = 0; k < 3; k++) {
        const ox = Math.sin(t * 0.4 + r * 1.7 + c * 2.3 + k * 2) * 30, oy = Math.cos(t * 0.3 + c * 1.3 + k) * 22;
        const rr = 95 + k * 18;
        const g = ctx.createRadialGradient(x + ox, y + oy, 10, x + ox, y + oy, rr);
        g.addColorStop(0, `rgba(205,215,235,${0.55 * d})`); g.addColorStop(1, 'rgba(205,215,235,0)');
        ctx.fillStyle = g; ctx.fillRect(x + ox - rr, y + oy - rr, rr * 2, rr * 2);
      }
    }
  }
  // Cinta transportadora (minijuegos)
  function conveyor(ctx, x, y, w, h, t) {
    Art.rrect(ctx, x, y, w, h, 14);
    ctx.fillStyle = Art.lg(ctx, 0, y, 0, y + h, '#5a5f66', '#2c3036'); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#15181c'; ctx.stroke();
    ctx.save(); Art.rrect(ctx, x + 8, y + 10, w - 16, h - 20, 8); ctx.clip();
    ctx.fillStyle = '#23272c'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    const off = (t * 60) % 30;
    for (let i = x - 30; i < x + w + 30; i += 30) ctx.fillRect(i - off, y, 10, h);
    ctx.restore();
    for (const ry of [y + 6, y + h - 10]) for (let i = x + 16; i < x + w - 10; i += 40) { Art.circle(ctx, i, ry + 2, 3); ctx.fillStyle = '#9aa2aa'; ctx.fill(); }
  }
  // Línea roja de los bolos
  function bowlLine(ctx, x) {
    ctx.save(); ctx.fillStyle = 'rgba(200,20,20,0.75)'; ctx.fillRect(x - 3, GRID_Y, 6, ROWS * ROW_H);
    ctx.fillStyle = 'rgba(255,120,120,0.5)'; ctx.fillRect(x - 1, GRID_Y, 2, ROWS * ROW_H); ctx.restore();
  }

  Object.assign(Art, { background, crater, ambient, lamp, tomb, fog, conveyor, bowlLine });
})();

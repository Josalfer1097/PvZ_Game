'use strict';
// =====================================================================
//  Plantas adicionales (de la secuela, del original y las inventadas),
//  objetos de bolos y proyectiles nuevos.
// =====================================================================
(() => {
  const { TAU, OUT, PAL, C, rg, lg, fs, circle, ell, rrect, line, leaf, eye, highlight, flame,
    crescent, rim, speckles, peaHead, sunHead, shroomStem } = Art;

  function angryBrows(ctx, x1, y1, x2, y2, w = 4, col = '#1a1a10') {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1 - 8, y1 - 4); ctx.lineTo(x1 + 5, y1); ctx.moveTo(x2 + 8, y2 - 4); ctx.lineTo(x2 - 5, y2); ctx.stroke();
  }
  function smile(ctx, x, y, r, col = '#1a1a10', w = 2.5) {
    ctx.beginPath(); ctx.arc(x, y, r, 0.15, Math.PI - 0.15); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke();
  }
  function baseLeaves(ctx, c1, c2, len = 36) {
    leaf(ctx, -3, -3, Math.PI + 0.3, len, 11, c1, c2); leaf(ctx, 3, -3, -0.3, len, 11, c1, c2);
  }

  // --- Planterna ---
  function plantern(ctx, t, s) {
    const pulse = 0.8 + Math.sin(t * 3) * 0.2;
    const g = ctx.createRadialGradient(0, -70, 5, 0, -70, 110);
    g.addColorStop(0, `rgba(255,250,170,${0.45 * pulse})`); g.addColorStop(1, 'rgba(255,240,140,0)');
    ctx.fillStyle = g; circle(ctx, 0, -70, 110); ctx.fill();
    baseLeaves(ctx);
    line(ctx, [0, 0, 6, -20, 0, -36], 7, '#4ea323');
    // jaula de hojas
    circle(ctx, 0, -66, 30); fs(ctx, rg(ctx, -4, -70, 30, '#fffde0', '#f0d24a', 0, 0), '#6a5a10', 3);
    crescent(ctx, 0, -66, 30, 30, 0.15, 0.3, 0.3, '120,90,0');
    ctx.strokeStyle = C('#3f8a1c'); ctx.lineWidth = 4;
    for (const a of [-0.7, 0, 0.7]) { ctx.beginPath(); ctx.ellipse(0, -66, 30 * Math.abs(Math.cos(a)) + 2, 30, 0, -Math.PI / 2, Math.PI / 2, a < 0); ctx.stroke(); }
    leaf(ctx, -4, -96, -1.9, 22, 8); leaf(ctx, 4, -96, -1.2, 22, 8);
    ctx.fillStyle = '#5a4a08'; ell(ctx, -8, -68, 3, 4.5); ctx.fill(); ell(ctx, 8, -68, 3, 4.5); ctx.fill();
    smile(ctx, 0, -60, 7, '#5a4a08');
    highlight(ctx, -12, -80, 7, 4, -0.5, 0.7);
  }
  // --- Trébol soplador ---
  function blover(ctx, t, s) {
    const f = s.fuse || 0;
    baseLeaves(ctx);
    line(ctx, [0, 0, -8, -28, 0, -52], 7, '#4ea323');
    ctx.save(); ctx.translate(0, -66); ctx.rotate(f > 0 ? t * 40 : Math.sin(t * 2) * 0.1);
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 2 + Math.PI / 4);
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-26, -10, -24, -36, -6, -32); ctx.bezierCurveTo(0, -30, 0, -26, 0, -24);
      ctx.bezierCurveTo(0, -26, 0, -30, 6, -32); ctx.bezierCurveTo(24, -36, 26, -10, 0, 0); ctx.closePath();
      fs(ctx, lg(ctx, 0, -34, 0, 0, '#a6e86a', '#3f8f1c'));
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, -22); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    circle(ctx, 0, -66, 13); fs(ctx, rg(ctx, 0, -66, 13, '#d8ffa8', '#5aae2a'));
    ctx.fillStyle = '#173a08'; circle(ctx, -4, -68, 2.2); ctx.fill(); circle(ctx, 4, -68, 2.2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -61, 3.5, f > 0 ? 4 : 2.5, 0, 0, TAU); ctx.fill();
  }
  // --- Bok Choy boxeador ---
  function bonkchoy(ctx, t, s) {
    const a = s.attack || 0, dir = s.dir || 1;
    const bob = Math.sin(t * 5) * 1.5;
    for (const [x, ang, l] of [[-10, -2.2, 50], [10, -0.9, 50], [0, -1.57, 58], [-18, -2.6, 38], [18, -0.5, 38]]) {
      leaf(ctx, x, -40 + bob, ang, l, 16, '#4ea34a', '#1d5a1a');
    }
    ctx.beginPath(); ctx.moveTo(-22, 0); ctx.quadraticCurveTo(-26, -30, -12, -48 + bob); ctx.lineTo(12, -48 + bob); ctx.quadraticCurveTo(26, -30, 22, 0); ctx.quadraticCurveTo(0, 6, -22, 0); ctx.closePath();
    fs(ctx, lg(ctx, -22, 0, 22, 0, '#ffffff', '#e8f2dc', '#b8d0a8'), OUT, 3);
    ctx.strokeStyle = 'rgba(120,160,100,0.5)'; ctx.lineWidth = 2;
    for (const x of [-10, 0, 10]) { ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x * 0.6, -44 + bob); ctx.stroke(); }
    eye(ctx, -7, -30 + bob, 5, 6, -5, -29 + bob, 3); eye(ctx, 8, -30 + bob, 5, 6, 10, -29 + bob, 3);
    angryBrows(ctx, -7, -38 + bob, 8, -38 + bob, 3.5);
    ctx.beginPath(); ctx.moveTo(-6, -18 + bob); ctx.lineTo(8, -20 + bob); ctx.strokeStyle = '#1a1a10'; ctx.lineWidth = 2.5; ctx.stroke();
    // puños
    const punch = Math.sin(Math.min(1, a) * Math.PI);
    for (const side of [-1, 1]) {
      const isFront = side === dir;
      const px = side * (28 + (isFront ? punch * 34 : 0)), py = -30 + bob + (isFront ? 0 : 4);
      line(ctx, [side * 14, -30 + bob, px - side * 6, py], 6, '#3f8f1c', OUT, 2);
      circle(ctx, px, py, 11); fs(ctx, rg(ctx, px, py, 11, '#a6e86a', '#2f7d1a'));
      ctx.strokeStyle = 'rgba(0,50,0,0.5)'; ctx.lineWidth = 1.5;
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(px + side * 4, py + k * 4); ctx.lineTo(px + side * 9, py + k * 4); ctx.stroke(); }
    }
    if (punch > 0.6) { ctx.save(); ctx.globalAlpha = punch * 0.8; ctx.fillStyle = '#fff6a0'; for (let i = 0; i < 5; i++) { const an = i * 1.2; ctx.beginPath(); ctx.moveTo(dir * 74, -30 + bob); ctx.lineTo(dir * 74 + Math.cos(an) * 16, -30 + bob + Math.sin(an) * 16); ctx.lineWidth = 3; ctx.strokeStyle = '#fff6a0'; ctx.stroke(); } ctx.restore(); }
  }
  // --- Junco eléctrico ---
  function lightningreed(ctx, t, s) {
    baseLeaves(ctx, '#8ad05a', '#3a7a1a', 30);
    const sway = Math.sin(t * 2) * 3;
    line(ctx, [0, 0, -4, -40, sway, -70], 5, '#5aa82a');
    leaf(ctx, -2, -30, -2.4, 30, 6); leaf(ctx, 2, -44, -0.7, 28, 6);
    ell(ctx, sway, -86, 12, 22); fs(ctx, rg(ctx, sway, -86, 22, '#c08a4a', '#5a3214'), '#2a1606', 3);
    crescent(ctx, sway, -86, 12, 22, 0.2);
    ctx.strokeStyle = 'rgba(40,20,5,0.35)'; ctx.lineWidth = 1;
    for (let y = -102; y < -70; y += 5) { ctx.beginPath(); ctx.moveTo(sway - 10, y); ctx.lineTo(sway + 10, y + 2); ctx.stroke(); }
    eye(ctx, sway - 4, -88, 3.5, 4.5, sway - 2, -87, 2); eye(ctx, sway + 5, -88, 3.5, 4.5, sway + 7, -87, 2);
    line(ctx, [sway, -108, sway + 2, -118], 3, '#5aa82a', OUT, 1.5);
    // chispas
    const k = s.attack || 0;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(150,220,255,${0.35 + k * 0.6 + Math.max(0, Math.sin(t * 17)) * 0.3})`; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a0 = t * 7 + i * 2.1;
      ctx.beginPath(); ctx.moveTo(sway + Math.cos(a0) * 14, -86 + Math.sin(a0) * 24);
      for (let j = 1; j < 4; j++) ctx.lineTo(sway + Math.cos(a0 + j * 0.4) * (20 + j * 4) + (j % 2 ? 4 : -4), -86 + Math.sin(a0 + j * 0.4) * 30);
      ctx.stroke();
    }
    ctx.restore();
  }
  // --- Catapultas genéricas ---
  function pultArm(ctx, s, payload) {
    const thr = s.throwT || 0;
    let ang = -2.55;
    if (thr > 0) ang = thr < 0.35 ? -2.55 + (thr / 0.35) * 2.4 : -0.15 - ((thr - 0.35) / 0.65) * 2.4;
    ctx.save(); ctx.translate(-6, -56); ctx.rotate(ang);
    line(ctx, [0, 0, 26, -4, 50, 0], 7, '#4ea323');
    ctx.translate(54, 0);
    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.quadraticCurveTo(0, 22, 18, 0); ctx.closePath();
    fs(ctx, lg(ctx, -18, 0, 18, 0, '#7fd04a', '#2f7d1a'));
    if (s.loaded !== false && (thr === 0 || thr < 0.3)) payload(ctx, 0, -9);
    ctx.restore();
  }
  function kernelpult(ctx, t, s) {
    pultArm(ctx, s, (c, x, y) => projectile(c, s.butter ? 'butter' : 'kernel', x, y, 0, t, 0.9));
    leaf(ctx, -6, -4, Math.PI + 0.2, 40, 13); leaf(ctx, 6, -4, -0.2, 40, 13);
    const bob = Math.sin(t * 2.4 + (s.seed || 0)) * 1.5;
    // mazorca
    ell(ctx, 0, -38 + bob, 24, 34); fs(ctx, rg(ctx, -4, -44 + bob, 34, '#fff3a0', '#e8a818'), '#6a4a00', 3);
    ctx.save(); ell(ctx, 0, -38 + bob, 24, 34); ctx.clip();
    ctx.fillStyle = 'rgba(160,100,0,0.35)';
    for (let y = -70; y < -6; y += 8) for (let x = -24; x < 26; x += 8) { ell(ctx, x + ((y / 8) % 2 ? 4 : 0), y + bob, 3.2, 3.4); ctx.fill(); }
    ctx.restore();
    crescent(ctx, 0, -38 + bob, 24, 34, 0.18);
    // hojas de la farfolla
    leaf(ctx, -18, -10, -1.9, 44, 12, '#a6e86a', '#4a8a1c'); leaf(ctx, 18, -10, -1.25, 44, 12, '#a6e86a', '#4a8a1c');
    eye(ctx, -8, -46 + bob, 6, 7, -5, -45 + bob, 3.4); eye(ctx, 9, -46 + bob, 6, 7, 12, -45 + bob, 3.4);
    smile(ctx, 1, -36 + bob, 7, '#4a2a00');
    ctx.strokeStyle = C('#d8c070'); ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-4 + i * 2, -72 + bob); ctx.quadraticCurveTo(-10 + i * 4, -84 + bob, -2 + i * 5, -90 + bob); ctx.stroke(); }
  }
  function cabbagepult(ctx, t, s) {
    pultArm(ctx, s, (c, x, y) => projectile(c, 'cabbage', x, y, 0, t, 0.9));
    leaf(ctx, -6, -4, Math.PI + 0.2, 40, 13); leaf(ctx, 6, -4, -0.2, 40, 13);
    const bob = Math.sin(t * 2.4 + (s.seed || 0)) * 1.5;
    circle(ctx, 0, -36 + bob, 30); fs(ctx, rg(ctx, -6, -42 + bob, 32, '#d8f7a8', '#5aa82a'));
    crescent(ctx, 0, -36 + bob, 30, 30, 0.18);
    ctx.strokeStyle = C('#3a7a1a'); ctx.lineWidth = 2.5;
    for (const [a0, a1, r] of [[3.4, 5.6, 26], [3.9, 6.0, 18], [0.3, 2.6, 24], [3.0, 4.2, 30]]) { ctx.beginPath(); ctx.arc(0, -36 + bob, r, a0, a1); ctx.stroke(); }
    eye(ctx, -9, -40 + bob, 6, 7, -6, -39 + bob, 3.4); eye(ctx, 9, -40 + bob, 6, 7, 12, -39 + bob, 3.4);
    smile(ctx, 0, -30 + bob, 7, '#173a08');
  }
  // --- Judía láser ---
  function laserbean(ctx, t, s) {
    baseLeaves(ctx);
    line(ctx, [0, 0, -8, -24, -2, -40], 8, '#4ea323');
    const bob = Math.sin(t * 2.2) * 2, rec = s.recoil || 0;
    ctx.save(); ctx.translate(2 - rec * 4, -66 + bob); ctx.rotate(-0.15);
    ctx.beginPath(); ctx.moveTo(-26, 4); ctx.bezierCurveTo(-34, -30, 10, -40, 24, -20); ctx.bezierCurveTo(34, -6, 30, 22, 8, 22); ctx.bezierCurveTo(-4, 22, 2, 8, -10, 10); ctx.bezierCurveTo(-20, 12, -24, 10, -26, 4); ctx.closePath();
    fs(ctx, rg(ctx, -6, -14, 36, '#e2ffb0', '#68b030'));
    crescent(ctx, 0, -6, 30, 24, 0.18);
    // visor
    rrect(ctx, -6, -20, 30, 12, 6); fs(ctx, lg(ctx, 0, -20, 0, -8, '#ff7a6a', '#a8100a'), '#2a0000', 2);
    highlight(ctx, 4, -17, 9, 2, 0, 0.6);
    circle(ctx, 28, -10, 5); fs(ctx, rec > 0 ? '#fff' : '#ff4a3a', '#2a0000', 2);
    smile(ctx, 4, 0, 6, '#173a08');
    ctx.restore();
  }
  // --- Dragoncillo ---
  function snapdragon(ctx, t, s) {
    const a = s.attack || 0;
    baseLeaves(ctx, '#7fd04a', '#2f7d1a', 40);
    line(ctx, [0, 0, -14, -30, -4, -54], 9, '#4ea323');
    const bob = Math.sin(t * 2) * 2;
    ctx.save(); ctx.translate(4, -70 + bob); ctx.rotate(-a * 0.15);
    // pétalos-cuernos
    for (const [x, y, an] of [[-14, -18, -2.3], [-4, -24, -1.9], [-22, -6, -2.7]]) leaf(ctx, x, y, an, 26, 8, '#ffcf3a', '#e07a10');
    // cabeza
    ctx.beginPath(); ctx.moveTo(-22, 8); ctx.bezierCurveTo(-26, -20, 4, -26, 18, -12); ctx.lineTo(42, -6); ctx.quadraticCurveTo(48, 0, 42, 6 + a * 8);
    ctx.lineTo(16, 10 + a * 8); ctx.quadraticCurveTo(0, 22, -22, 8); ctx.closePath();
    fs(ctx, rg(ctx, -2, -6, 34, '#d8f070', '#6aa81c'));
    crescent(ctx, 6, -2, 30, 18, 0.18);
    ctx.fillStyle = C('#2a4a08'); circle(ctx, 40, -3, 2); ctx.fill();
    eye(ctx, 6, -10, 6, 7, 9, -9, 3.4);
    ctx.strokeStyle = '#1a2a00'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-2, -20); ctx.lineTo(14, -16); ctx.stroke();
    ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(20 + i * 5, 4); ctx.lineTo(22 + i * 5, 9); ctx.lineTo(24 + i * 5, 4); ctx.fill(); }
    if (a > 0) for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(52, 2); ctx.rotate(Math.PI / 2 + (i - 1) * 0.25); flame(ctx, 0, 0, t, 30 * a, i); ctx.restore(); }
    ctx.restore();
  }
  // --- Cañón de coco ---
  function coconut(ctx, t, s) {
    const rec = s.recoil || 0, loaded = s.loaded !== false;
    for (const [x, an] of [[-8, -2.6], [8, -0.55], [-14, -3.0], [14, -0.15]]) leaf(ctx, x, -8, an, 44, 10, '#8ad05a', '#2f7d1a');
    ctx.save(); ctx.translate(-rec * 8, 0);
    // ruedas de raíz
    circle(ctx, -14, -12, 12); fs(ctx, rg(ctx, -14, -12, 12, '#a87a48', '#4a2a10'), '#2a1606', 2.5);
    circle(ctx, 18, -12, 12); fs(ctx, rg(ctx, 18, -12, 12, '#a87a48', '#4a2a10'), '#2a1606', 2.5);
    // cañón
    ctx.save(); ctx.translate(0, -44); ctx.rotate(-0.12);
    rrect(ctx, -30, -24, 74, 48, 22); fs(ctx, lg(ctx, 0, -24, 0, 24, '#c08a50', '#7a4a20', '#4a2a10'), '#24140a', 3);
    ctx.strokeStyle = 'rgba(40,20,5,0.4)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-26 + i * 12, -22); ctx.lineTo(-30 + i * 12, 22); ctx.stroke(); }
    ell(ctx, 44, 0, 10, 22); fs(ctx, '#3a2010', '#1a0a00', 3);
    if (loaded) { ell(ctx, 45, 0, 7, 16); ctx.fillStyle = '#7a4a20'; ctx.fill(); }
    highlight(ctx, 0, -14, 26, 4, 0, 0.35);
    eye(ctx, -10, -4, 6, 7, -7, -3, 3.3); eye(ctx, 6, -4, 6, 7, 9, -3, 3.3);
    angryBrows(ctx, -10, -12, 6, -12, 3);
    ctx.restore();
    ctx.restore();
  }
  // --- Bumerflor ---
  function bloomerang(ctx, t, s) {
    baseLeaves(ctx);
    line(ctx, [0, 0, -10, -28, 0, -50], 8, '#4ea323');
    const bob = Math.sin(t * 2.4) * 2, thrown = (s.attack || 0) > 0.5;
    ctx.save(); ctx.translate(2, -68 + bob);
    for (let i = 0; i < 4; i++) {
      if (thrown && i === 0) continue;
      ctx.save(); ctx.rotate(i * Math.PI / 2 + 0.4);
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.quadraticCurveTo(14, -30, 4, -40); ctx.quadraticCurveTo(-4, -30, -10, -36); ctx.quadraticCurveTo(-14, -20, 0, -8); ctx.closePath();
      fs(ctx, lg(ctx, -10, -40, 10, -8, '#ffd27a', '#e86a2a'), '#5a2400', 2.5);
      ctx.restore();
    }
    circle(ctx, 0, 0, 17); fs(ctx, rg(ctx, 0, 0, 17, '#fff0a0', '#e0a020'), '#5a3a00', 3);
    crescent(ctx, 0, 0, 17, 17, 0.2);
    eye(ctx, -6, -3, 4, 5, -4, -2, 2.4); eye(ctx, 6, -3, 4, 5, 8, -2, 2.4);
    smile(ctx, 1, 4, 5, '#5a3a00');
    ctx.restore();
  }
  // --- Lechuga iceberg ---
  function iceberg(ctx, t, s) {
    const g = ctx.createRadialGradient(0, -20, 4, 0, -20, 50);
    g.addColorStop(0, 'rgba(200,240,255,0.5)'); g.addColorStop(1, 'rgba(200,240,255,0)'); ctx.fillStyle = g; circle(ctx, 0, -20, 50); ctx.fill();
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + i * (Math.PI / 6);
      ctx.save(); ctx.translate(Math.cos(a) * 18, -14 + Math.sin(a) * 10); ctx.rotate(a);
      ell(ctx, 12, 0, 16, 11); fs(ctx, rg(ctx, 12, 0, 16, '#f0fcff', '#7ac8ea'), '#1f5f8f', 2.5);
      ctx.restore();
    }
    circle(ctx, 0, -20, 20); fs(ctx, rg(ctx, -4, -24, 22, '#ffffff', '#9ad8f2'), '#1f5f8f', 2.5);
    eye(ctx, -6, -22, 4.5, 5, -4, -21, 2.5); eye(ctx, 6, -22, 4.5, 5, 8, -21, 2.5);
    angryBrows(ctx, -6, -28, 6, -28, 3, '#123a5c');
    ctx.beginPath(); ctx.moveTo(-5, -12); ctx.quadraticCurveTo(0, -15, 5, -12); ctx.strokeStyle = '#123a5c'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; circle(ctx, -24, -30, 2.5); ctx.fill(); circle(ctx, 22, -34, 2); ctx.fill();
  }
  // --- Lanzallamas (guisante de fuego) ---
  const FIREPAL = { light: '#ffd27a', mid: '#f07a1a', dark: '#a82a0a', leaf1: '#ffb04a', leaf2: '#b8400a' };
  function firepea(ctx, t, s) {
    const bob = Math.sin(t * 2.6 + (s.seed || 0)) * 2.5;
    baseLeaves(ctx, '#7fd04a', '#2f7d1a');
    line(ctx, [0, 0, -12, -26, 0, -50 + bob], 9, lg(ctx, -6, 0, 6, 0, '#69c22f', '#2f8417'));
    flame(ctx, -16 - (s.recoil || 0) * 7, -82 + bob, t, 26, 1);
    peaHead(ctx, 3, -64 + bob, 27, FIREPAL, s.recoil || 0, true, false, t);
  }
  // --- Durián ---
  function endurian(ctx, t, s) {
    const dmg = s.dmg || 0;
    ctx.save();
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * TAU;
      const x = Math.cos(a) * 38, y = -40 + Math.sin(a) * 40;
      ctx.beginPath(); ctx.moveTo(x - Math.sin(a) * 7, y + Math.cos(a) * 7); ctx.lineTo(Math.cos(a) * 52, -40 + Math.sin(a) * 52); ctx.lineTo(x + Math.sin(a) * 7, y - Math.cos(a) * 7); ctx.closePath();
      fs(ctx, '#b8c040', '#3a3a08', 2);
    }
    ell(ctx, 0, -40, 40, 40); fs(ctx, rg(ctx, -8, -50, 44, '#e8f07a', '#7a8a1a'), '#2a3008', 3);
    crescent(ctx, 0, -40, 40, 40, 0.2);
    ctx.fillStyle = 'rgba(80,90,10,0.45)';
    for (let i = 0; i < 18; i++) { const a = i * 2.4, d = 32 * Math.sqrt((i + 0.5) / 18); ctx.beginPath(); ctx.moveTo(Math.cos(a) * d, -40 + Math.sin(a) * d - 3); ctx.lineTo(Math.cos(a) * d + 3, -40 + Math.sin(a) * d + 3); ctx.lineTo(Math.cos(a) * d - 3, -40 + Math.sin(a) * d + 3); ctx.fill(); }
    eye(ctx, -9, -46, 6.5, 7.5, -6, -45, 3.6); eye(ctx, 10, -46, 6.5, 7.5, 13, -45, 3.6);
    angryBrows(ctx, -9, -55, 10, -55, 4, '#2a3008');
    ctx.beginPath(); ctx.moveTo(-8, -28); ctx.quadraticCurveTo(0, dmg > 1 ? -34 : -24, 8, -28); ctx.strokeStyle = '#2a3008'; ctx.lineWidth = 3; ctx.stroke();
    if (dmg > 0) { ctx.strokeStyle = '#2a3008'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-30, -60); ctx.lineTo(-18, -54); ctx.lineTo(-22, -44); ctx.stroke(); }
    ctx.restore();
  }
  // --- Citrón ---
  function citron(ctx, t, s) {
    const ch = s.charge || 0;
    baseLeaves(ctx);
    ctx.save(); ctx.translate(0, -48 + Math.sin(t * 2) * 2);
    circle(ctx, 0, 0, 34); fs(ctx, rg(ctx, -8, -10, 38, '#ffd27a', '#e86a0a'), '#5a2400', 3);
    crescent(ctx, 0, 0, 34, 34, 0.2);
    speckles(ctx, 0, 0, 30, 24, 'rgba(160,60,0,0.3)', 5);
    leaf(ctx, -6, -32, -1.9, 22, 7); leaf(ctx, 2, -32, -1.1, 18, 6);
    // visor metálico
    ctx.beginPath(); ctx.moveTo(-30, -12); ctx.quadraticCurveTo(0, -24, 32, -10); ctx.lineTo(32, 2); ctx.quadraticCurveTo(0, -10, -30, 2); ctx.closePath();
    fs(ctx, lg(ctx, 0, -20, 0, 2, '#e8eef2', '#7a868e'), '#22282c', 2.5);
    ell(ctx, 10, -6, 9, 5); fs(ctx, `rgba(${120 + ch * 135},${220},255,1)`, '#123a5c', 2);
    // cañón de plasma
    circle(ctx, 34, 8, 9); fs(ctx, '#4a5258', '#1a1a1a', 2.5);
    if (ch > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(40, 8, 1, 40, 8, 10 + ch * 16);
      g.addColorStop(0, 'rgba(200,255,255,1)'); g.addColorStop(1, 'rgba(60,180,255,0)');
      ctx.fillStyle = g; circle(ctx, 40, 8, 10 + ch * 16); ctx.fill(); ctx.restore();
    }
    smile(ctx, -2, 12, 7, '#5a2400');
    ctx.restore();
  }
  // --- Col huracán ---
  function hurrikale(ctx, t, s) {
    const f = s.fuse || 0;
    ctx.save(); ctx.translate(0, -42);
    ctx.rotate(f > 0 ? t * 30 : Math.sin(t * 2) * 0.15);
    for (let i = 0; i < 8; i++) {
      ctx.save(); ctx.rotate(i * TAU / 8);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(18, -6, 30, -24, 14, -38); ctx.bezierCurveTo(8, -28, 4, -16, 0, 0);
      fs(ctx, lg(ctx, 0, 0, 14, -38, '#7a8ae8', '#2a3a9a'), '#121a4a', 2);
      ctx.restore();
    }
    ctx.restore();
    circle(ctx, 0, -42, 18); fs(ctx, rg(ctx, 0, -42, 18, '#c8d0ff', '#4a5ac8'), '#121a4a', 2.5);
    eye(ctx, -6, -45, 4, 5, -4, -44, 2.3); eye(ctx, 6, -45, 4, 5, 8, -44, 2.3);
    ctx.beginPath(); ctx.ellipse(0, -36, 4, f > 0 ? 5 : 3, 0, 0, TAU); ctx.fillStyle = '#121a4a'; ctx.fill();
  }
  // --- Remolacha rapera ---
  function phatbeet(ctx, t, s) {
    const a = s.attack || 0;
    const beat = Math.abs(Math.sin(t * 6)) * 2;
    for (const [x, an] of [[-6, -2.1], [6, -1.0], [0, -1.57]]) leaf(ctx, x, -70 + beat, an, 34, 10, '#6cc23c', '#7a1a4a');
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-30, -10, -40, -66 + beat, 0, -70 + beat); ctx.bezierCurveTo(40, -66 + beat, 30, -10, 0, 6); ctx.closePath();
    fs(ctx, rg(ctx, -8, -46, 44, '#e86aa8', '#6a0a3a'), '#2a0218', 3);
    crescent(ctx, 0, -36, 30, 36, 0.22);
    ctx.strokeStyle = 'rgba(255,180,220,0.35)'; ctx.lineWidth = 1.5;
    for (const y of [-50, -36, -22]) { ctx.beginPath(); ctx.moveTo(-18, y); ctx.quadraticCurveTo(0, y + 4, 18, y); ctx.stroke(); }
    // gafas de sol
    rrect(ctx, -22, -50 + beat, 19, 11, 4); fs(ctx, '#141414', '#000', 1.5); rrect(ctx, 2, -50 + beat, 19, 11, 4); fs(ctx, '#141414', '#000', 1.5);
    ctx.fillStyle = '#141414'; ctx.fillRect(-3, -47 + beat, 5, 3);
    highlight(ctx, -16, -47 + beat, 4, 2, 0, 0.6); highlight(ctx, 8, -47 + beat, 4, 2, 0, 0.6);
    smile(ctx, 0, -30 + beat, 8, '#2a0218', 3);
    // auriculares
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -46 + beat, 26, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    circle(ctx, -25, -40 + beat, 7); fs(ctx, '#d42a2a', '#2a0000', 2); circle(ctx, 25, -40 + beat, 7); fs(ctx, '#d42a2a', '#2a0000', 2);
    if (a > 0) { ctx.strokeStyle = `rgba(255,120,220,${a})`; ctx.lineWidth = 3; for (const r of [50, 70, 90]) { circle(ctx, 0, -36, r * (1.2 - a * 0.3)); ctx.stroke(); } }
  }
  // --- Espinarrosa ---
  function thornrose(ctx, t, s) {
    const bob = Math.sin(t * 2.4 + (s.seed || 0)) * 2, rec = s.recoil || 0;
    baseLeaves(ctx);
    line(ctx, [0, 0, -12, -26, 0, -50 + bob], 7, '#3f8a1c');
    ctx.fillStyle = C('#2a5a10');
    for (const [x, y, d] of [[-6, -18, -1], [-3, -34, 1], [-1, -44, -1]]) { ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x + d * 8, y - 6); ctx.lineTo(x, y + 3); ctx.fill(); }
    ctx.save(); ctx.translate(4 - rec * 6, -68 + bob);
    for (let ring = 0; ring < 3; ring++) {
      const n = 6 - ring, rr = 26 - ring * 7;
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU + ring * 0.5;
        ell(ctx, Math.cos(a) * rr * 0.5, Math.sin(a) * rr * 0.45, rr * 0.62, rr * 0.5, a);
        fs(ctx, rg(ctx, Math.cos(a) * rr * 0.5, Math.sin(a) * rr * 0.45, rr * 0.7, ring === 2 ? '#ff8a9a' : '#f0405a', ring === 0 ? '#8a0a20' : '#c01838'), '#4a0010', 2);
      }
    }
    eye(ctx, -5, -2, 4, 4.5, -3, -1, 2.3); eye(ctx, 6, -2, 4, 4.5, 8, -1, 2.3);
    ctx.restore();
  }
  // --- Bambú cohete ---
  function bamboo(ctx, t, s) {
    const loaded = s.loaded !== false;
    leaf(ctx, -10, -60, -2.4, 34, 8, '#9ad05a', '#3a7a1a'); leaf(ctx, 10, -80, -0.6, 34, 8, '#9ad05a', '#3a7a1a');
    for (const [x, h, w] of [[-18, 70, 18], [18, 60, 16], [0, 96, 22]]) {
      rrect(ctx, x - w / 2, -h, w, h, 4); fs(ctx, lg(ctx, x - w / 2, 0, x + w / 2, 0, '#c8e870', '#6aa81c', '#3a6a10'), '#1d3310', 2.5);
      ctx.strokeStyle = C('#3a6a10'); ctx.lineWidth = 3;
      for (let y = -h + 24; y < -4; y += 26) { ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.stroke(); }
      ell(ctx, x, -h, w / 2, 3.5); fs(ctx, '#2a4a08', '#1d3310', 1.5);
    }
    if (loaded) { ctx.save(); ctx.translate(0, -104); ctx.rotate(-Math.PI / 2); projectile(ctx, 'rocket', 0, 0, 0, t, 0.8); ctx.restore(); }
    eye(ctx, -5, -46, 4.5, 5.5, -3, -45, 2.6); eye(ctx, 6, -46, 4.5, 5.5, 8, -45, 2.6);
    angryBrows(ctx, -5, -53, 6, -53, 3);
    smile(ctx, 1, -38, 4);
  }
  // --- Nubecol ---
  function raincloud(ctx, t, s) {
    const a = s.attack || 0;
    // coliflor
    baseLeaves(ctx);
    for (const [x, y, r] of [[-12, -22, 14], [12, -22, 14], [0, -32, 16]]) { circle(ctx, x, y, r); fs(ctx, rg(ctx, x, y, r, '#ffffff', '#d8d2b8'), '#6a6450', 2); }
    eye(ctx, -6, -26, 4, 5, -4, -25, 2.3); eye(ctx, 6, -26, 4, 5, 8, -25, 2.3);
    smile(ctx, 0, -19, 4);
    // nube flotante
    const cy = -88 + Math.sin(t * 1.5) * 4;
    ctx.save(); ctx.translate(24, cy);
    if (a > 0) { ctx.strokeStyle = 'rgba(120,180,255,0.8)'; ctx.lineWidth = 2; for (let i = 0; i < 5; i++) { const x = -20 + i * 10, y = 14 + ((t * 120 + i * 13) % 34); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 8); ctx.stroke(); } }
    for (const [x, y, r] of [[-16, 2, 13], [0, -6, 17], [17, 2, 13], [0, 8, 13]]) { circle(ctx, x, y, r); fs(ctx, rg(ctx, x, y, r, '#ffffff', a > 0 ? '#7a8ab0' : '#c8d4ea'), '#4a5a7a', 2); }
    ctx.fillStyle = '#2a3a5a'; circle(ctx, -6, 0, 2); ctx.fill(); circle(ctx, 6, 0, 2); ctx.fill();
    ctx.restore();
  }
  // --- Cacahuete muelle ---
  function springnut(ctx, t, s) {
    const c = s.attack || 0;
    // muelle
    ctx.strokeStyle = '#8a9298'; ctx.lineWidth = 4; ctx.beginPath();
    const sh = 22 - c * 10;
    for (let i = 0; i <= 6; i++) { const y = -i * sh / 6; ctx.lineTo(i % 2 ? 12 : -12, y); }
    ctx.stroke();
    ctx.save(); ctx.translate(0, -sh); ctx.scale(1 + c * 0.12, 1 - c * 0.12);
    const nutPath = () => { ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-32, 0, -34, -34, -14, -38); ctx.bezierCurveTo(-26, -50, -22, -84, 0, -84); ctx.bezierCurveTo(22, -84, 26, -50, 14, -38); ctx.bezierCurveTo(34, -34, 32, 0, 0, 0); ctx.closePath(); };
    nutPath();
    fs(ctx, rg(ctx, -6, -46, 46, '#f2d8a0', '#a8783a'), '#4a2a0c', 3);
    nutPath(); ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ell(ctx, 14, -30, 26, 40); ctx.fill(); ctx.strokeStyle = 'rgba(120,80,30,0.35)'; ctx.lineWidth = 1.5;
    for (let i = -40; i < 40; i += 8) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 30, -84); ctx.moveTo(i, -84); ctx.lineTo(i + 30, 0); ctx.stroke(); }
    ctx.restore();
    eye(ctx, -6, -60, 5, 6, -4, -59, 3); eye(ctx, 8, -60, 5, 6, 10, -59, 3);
    smile(ctx, 1, -50, 6, '#4a2a0c');
    ctx.restore();
  }
  // --- Girasol lunar ---
  function moonflower(ctx, t, s) {
    const sway = Math.sin(t * 1.6 + (s.seed || 0)) * 0.07;
    leaf(ctx, -3, -4, Math.PI + 0.35, 34, 11, '#8ad0a8', '#2a6a4a'); leaf(ctx, 3, -4, -0.35, 34, 11, '#8ad0a8', '#2a6a4a');
    line(ctx, [0, 0, 8, -30, 0, -56], 8, '#3a8a5a');
    ctx.save(); ctx.translate(0, -70); ctx.rotate(sway);
    const glow = s.glow || 0;
    const g = ctx.createRadialGradient(0, 0, 8, 0, 0, 64);
    g.addColorStop(0, `rgba(200,220,255,${0.35 + glow * 0.5})`); g.addColorStop(1, 'rgba(180,200,255,0)');
    ctx.fillStyle = g; circle(ctx, 0, 0, 64); ctx.fill();
    for (let i = 0; i < 12; i++) {
      ctx.save(); ctx.rotate(i / 12 * TAU); ctx.translate(30, 0);
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.quadraticCurveTo(0, -9, 14, 0); ctx.quadraticCurveTo(0, 9, -10, 0);
      fs(ctx, lg(ctx, -10, 0, 14, 0, '#ffffff', '#a8b8f0'), '#3a4a8a', 2);
      ctx.restore();
    }
    circle(ctx, 0, 0, 22); fs(ctx, rg(ctx, -4, -4, 24, '#f4f0ff', '#8a96d8'), '#2a3070', 3);
    // cara de luna creciente
    ctx.fillStyle = 'rgba(80,90,170,0.35)'; ctx.beginPath(); ctx.arc(0, 0, 22, -1.2, 1.2); ctx.arc(-8, 0, 18, 1.0, -1.0, true); ctx.fill();
    ctx.strokeStyle = '#2a3070'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-7, -4, 4, Math.PI * 1.1, Math.PI * 1.9); ctx.moveTo(4, -4); ctx.arc(8, -4, 4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    smile(ctx, 0, 4, 7, '#2a3070');
    ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { const a = t * 0.8 + i * 1.6; circle(ctx, Math.cos(a) * 46, Math.sin(a) * 46, 1.8); ctx.fill(); }
    ctx.restore();
  }

  // --- Nueces de bolos ---
  function bowlnut(ctx, type, rot, t) {
    const big = type === 'bignut' ? 2 : 1;
    ctx.save(); ctx.scale(big, big); ctx.translate(0, -36); ctx.rotate(rot);
    circle(ctx, 0, 0, 36);
    const red = type === 'boomnut';
    fs(ctx, red ? rg(ctx, 0, 0, 36, '#ff9a7a', '#a81a0a', -0.3, -0.3) : rg(ctx, 0, 0, 36, '#f0c27a', '#8a5420', -0.3, -0.3), red ? '#4a0a00' : '#4a2a0c', 3.5);
    crescent(ctx, 0, 0, 36, 36, 0.2);
    speckles(ctx, 0, 0, 34, 18, red ? 'rgba(90,10,0,0.35)' : 'rgba(110,60,15,0.35)', 2);
    eye(ctx, -2, -8, 7, 9, 1, -7, 4); eye(ctx, 16, -8, 6, 8.5, 18, -7, 3.8);
    ctx.strokeStyle = red ? '#3a0000' : '#3b2208'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-8, -20); ctx.lineTo(6, -16); ctx.moveTo(24, -20); ctx.lineTo(12, -16); ctx.stroke();
    ctx.beginPath(); ctx.arc(8, 8, 7, 0.2, Math.PI - 0.2); ctx.stroke();
    if (red) { line(ctx, [0, -36, 6, -46], 3, '#5a3a1a', '#000', 1); flame(ctx, 7, -46, t, 12); }
    ctx.restore();
  }

  // --- Proyectiles nuevos ---
  function projectile(ctx, kind, x, y, rot, t, sc = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
    switch (kind) {
      case 'kernel':
        ell(ctx, 0, 0, 8, 7); fs(ctx, rg(ctx, 0, 0, 8, '#fff6b0', '#e8b018'), '#6a4a00', 2);
        highlight(ctx, -2, -3, 3, 2, 0, 0.6); break;
      case 'butter':
        rrect(ctx, -12, -8, 24, 16, 3); fs(ctx, lg(ctx, 0, -8, 0, 8, '#fff8b0', '#f0d040'), '#7a5a00', 2);
        highlight(ctx, -4, -4, 7, 2, 0, 0.7); break;
      case 'cabbage':
        circle(ctx, 0, 0, 15); fs(ctx, rg(ctx, 0, 0, 15, '#e0ffb0', '#5aa82a'), '#1d3310', 2.5);
        ctx.strokeStyle = C('#3a7a1a'); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 10, 3.4, 5.8); ctx.moveTo(10, 4); ctx.arc(0, 0, 11, 0.3, 2.4); ctx.stroke(); break;
      case 'thorn':
        ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -5); ctx.lineTo(-6, 0); ctx.lineTo(-10, 5); ctx.closePath();
        fs(ctx, lg(ctx, -10, 0, 16, 0, '#3a7a1a', '#c8f080'), '#123006', 1.5); break;
      case 'rocket': {
        ctx.save(); ctx.translate(-20, 0); ctx.rotate(Math.PI / 2); flame(ctx, 0, 0, t, 18, 2); ctx.restore();
        rrect(ctx, -16, -6, 28, 12, 5); fs(ctx, lg(ctx, 0, -6, 0, 6, '#ff8a6a', '#c01a0a'), '#3a0000', 2);
        ctx.beginPath(); ctx.moveTo(12, -6); ctx.quadraticCurveTo(26, 0, 12, 6); ctx.closePath(); fs(ctx, '#e8eef2', '#3a0000', 2);
        ctx.fillStyle = '#4a8a1a'; ctx.beginPath(); ctx.moveTo(-16, -6); ctx.lineTo(-22, -12); ctx.lineTo(-10, -6); ctx.moveTo(-16, 6); ctx.lineTo(-22, 12); ctx.lineTo(-10, 6); ctx.fill();
        break;
      }
      case 'boomerang':
        ctx.rotate(t * 20);
        ctx.beginPath(); ctx.moveTo(-16, 10); ctx.quadraticCurveTo(0, -18, 16, 10); ctx.quadraticCurveTo(0, -8, -16, 10); ctx.closePath();
        fs(ctx, lg(ctx, -16, 0, 16, 0, '#ffd27a', '#e86a2a'), '#5a2400', 2); break;
      case 'coconut':
        circle(ctx, 0, 0, 20); fs(ctx, rg(ctx, 0, 0, 20, '#a87a48', '#4a2a10'), '#24140a', 3);
        ctx.strokeStyle = 'rgba(30,15,5,0.5)'; ctx.lineWidth = 1.5; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-18 + i * 8, -12); ctx.lineTo(-20 + i * 8, 12); ctx.stroke(); }
        ctx.fillStyle = '#24140a'; circle(ctx, 8, -6, 2.5); ctx.fill(); circle(ctx, 12, 0, 2.5); ctx.fill(); break;
      case 'plasma': {
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 34);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(150,240,255,0.9)'); g.addColorStop(1, 'rgba(40,120,255,0)');
        ctx.fillStyle = g; circle(ctx, 0, 0, 34); ctx.fill();
        ctx.strokeStyle = 'rgba(220,250,255,0.8)'; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { const a = t * 12 + i * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 26, Math.sin(a) * 26); ctx.stroke(); }
        break;
      }
    }
    ctx.restore();
  }

  function extraPlant(ctx, type, t, s) {
    switch (type) {
      case 'plantern': return plantern(ctx, t, s);
      case 'blover': return blover(ctx, t, s);
      case 'bonkchoy': return bonkchoy(ctx, t, s);
      case 'lightningreed': return lightningreed(ctx, t, s);
      case 'kernelpult': return kernelpult(ctx, t, s);
      case 'cabbagepult': return cabbagepult(ctx, t, s);
      case 'laserbean': return laserbean(ctx, t, s);
      case 'snapdragon': return snapdragon(ctx, t, s);
      case 'coconut': return coconut(ctx, t, s);
      case 'bloomerang': return bloomerang(ctx, t, s);
      case 'iceberg': return iceberg(ctx, t, s);
      case 'firepea': return firepea(ctx, t, s);
      case 'endurian': return endurian(ctx, t, s);
      case 'citron': return citron(ctx, t, s);
      case 'hurrikale': return hurrikale(ctx, t, s);
      case 'phatbeet': return phatbeet(ctx, t, s);
      case 'thornrose': return thornrose(ctx, t, s);
      case 'bamboo': return bamboo(ctx, t, s);
      case 'raincloud': return raincloud(ctx, t, s);
      case 'springnut': return springnut(ctx, t, s);
      case 'moonflower': return moonflower(ctx, t, s);
      case 'nut': case 'boomnut': case 'bignut': return bowlnut(ctx, type, 0, t);
    }
  }

  Object.assign(Art, { extraPlant, projectile, bowlnut });
})();

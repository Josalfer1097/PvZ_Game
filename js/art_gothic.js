'use strict';
// =====================================================================
//  REINO GÓTICO: plantas oscuras, zombis góticos, escenario con luna de
//  sangre, catedral, cuervos y murciélagos.
// =====================================================================
(() => {
  const { TAU, C, rg, lg, fs, circle, ell, rrect, line, leaf, eye, highlight, flame, crescent, rim, speckles } = Art;
  const GO = '#140810'; // contorno gótico

  // ---------- utilidades ----------
  function glow(ctx, x, y, r, col, a = 0.5) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function glowEye(ctx, x, y, r, col, pupil = 'slit') {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y, r * 2.6, col, 0.55); ctx.restore();
    ell(ctx, x, y, r, r * 0.8); ctx.fillStyle = `rgb(${col})`; ctx.fill(); ctx.strokeStyle = GO; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#100'; if (pupil === 'slit') { ell(ctx, x + r * 0.15, y, r * 0.22, r * 0.75); ctx.fill(); }
    else { circle(ctx, x + r * 0.15, y, r * 0.4); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; circle(ctx, x - r * 0.35, y - r * 0.3, r * 0.22); ctx.fill();
  }
  function darkLeaves(ctx, c1 = '#4a2a3a', c2 = '#1a0812', len = 38) {
    leaf(ctx, -3, -3, Math.PI + 0.3, len, 11, c1, c2); leaf(ctx, 3, -3, -0.3, len, 11, c1, c2);
  }
  function thornStem(ctx, pts, w, col) {
    line(ctx, pts, w, col, GO, 3);
    ctx.fillStyle = C(GO);
    for (let i = 1; i <= 3; i++) {
      const k = i / 4, x = pts[0] + (pts[pts.length - 2] - pts[0]) * k, y = pts[1] + (pts[pts.length - 1] - pts[1]) * k;
      const d = i % 2 ? -1 : 1;
      ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x + d * 9, y - 6); ctx.lineTo(x, y + 3); ctx.fill();
    }
  }
  function batWing(ctx, x, y, s, flap, dir, c1 = '#3a1a2a', c2 = '#120610') {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s); ctx.rotate(-0.3 - flap * 0.5);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(14, -26, 40, -30); ctx.quadraticCurveTo(36, -18, 42, -10);
    ctx.quadraticCurveTo(32, -8, 32, 2); ctx.quadraticCurveTo(22, -2, 18, 8); ctx.quadraticCurveTo(10, 2, 0, 0); ctx.closePath();
    fs(ctx, lg(ctx, 0, -30, 0, 8, c1, c2), GO, 2);
    ctx.strokeStyle = 'rgba(255,120,160,0.25)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(40, -28); ctx.moveTo(2, 0); ctx.lineTo(40, -10); ctx.moveTo(2, 0); ctx.lineTo(31, 1); ctx.stroke();
    ctx.restore();
  }
  function horn(ctx, x, y, s, dir) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s);
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.bezierCurveTo(-8, -18, 4, -30, 18, -34); ctx.bezierCurveTo(8, -24, 6, -12, 7, 0); ctx.closePath();
    fs(ctx, lg(ctx, -6, 0, 18, -34, '#3a2a30', '#0a0408', '#5a4048'), GO, 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1.2;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-6 + i * 1.5, -i * 7); ctx.lineTo(7 + i * 1.5, -i * 7 - 2); ctx.stroke(); }
    ctx.restore();
  }

  // ==================================================================
  //  PLANTAS
  // ==================================================================
  function demon(ctx, t, s) {
    const rec = s.recoil || 0, bob = Math.sin(t * 2.4 + (s.seed || 0)) * 2.5;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, -64, 70, '255,60,20', 0.18 + rec * 0.25); ctx.restore();
    darkLeaves(ctx, '#7a1a1a', '#2a0404');
    // cola con punta de pica
    const tw = Math.sin(t * 3) * 10;
    ctx.beginPath(); ctx.moveTo(-6, -40); ctx.bezierCurveTo(-40, -30, -36 + tw, -80, -22 + tw, -96);
    ctx.strokeStyle = C(GO); ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = C('#a8140e'); ctx.lineWidth = 4; ctx.stroke();
    ctx.save(); ctx.translate(-22 + tw, -96); ctx.rotate(-0.4);
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(8, 2); ctx.lineTo(0, -2); ctx.lineTo(-8, 2); ctx.closePath(); fs(ctx, '#c8180e', GO, 2); ctx.restore();
    thornStem(ctx, [0, 0, -10, -26, 0, -48 + bob], 9, lg(ctx, -6, 0, 6, 0, '#8a1a14', '#3a0606'));
    const flap = Math.sin(t * 7);
    batWing(ctx, -14, -78 + bob, 0.9, flap, -1, '#5a0a0a', '#1a0202');
    batWing(ctx, 14, -80 + bob, 0.9, flap, 1, '#5a0a0a', '#1a0202');
    ctx.save(); ctx.translate(2 - rec * 6, -66 + bob); ctx.scale(1 + rec * 0.08, 1 - rec * 0.05);
    horn(ctx, -14, -20, 1, -1); horn(ctx, 14, -22, 1, 1);
    ell(ctx, 0, 0, 30, 27); fs(ctx, rg(ctx, -8, -8, 32, '#ff6a40', '#6a0606'), GO, 3);
    crescent(ctx, 0, 0, 30, 27, 0.3, 0.3, 0.34, '40,0,0');
    rim(ctx, 0, 0, 30, 27, 3.5, 4.5, 0.4);
    speckles(ctx, 0, 0, 26, 12, 'rgba(60,0,0,0.3)', 4);
    glowEye(ctx, -10, -6, 7, '255,220,40'); glowEye(ctx, 11, -6, 7, '255,220,40');
    ctx.strokeStyle = GO; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-20, -18); ctx.lineTo(-4, -12); ctx.moveTo(21, -18); ctx.lineTo(5, -12); ctx.stroke();
    // boca con colmillos (se abre al disparar)
    const open = 3 + rec * 10;
    ctx.beginPath(); ctx.moveTo(-14, 9); ctx.quadraticCurveTo(0, 14 + open, 15, 9); ctx.quadraticCurveTo(0, 4, -14, 9); ctx.closePath();
    ctx.fillStyle = rec > 0.2 ? '#ffb030' : '#2a0000'; ctx.fill(); ctx.strokeStyle = GO; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff';
    for (const fx of [-8, 8]) { ctx.beginPath(); ctx.moveTo(fx - 3, 8); ctx.lineTo(fx, 15); ctx.lineTo(fx + 3, 8); ctx.fill(); }
    if (rec > 0.2) flame(ctx, 26, 6, t, 18 * rec, 3);
    ctx.restore();
  }

  function fallenangel(ctx, t, s) {
    const rec = s.recoil || 0, bob = Math.sin(t * 1.8 + (s.seed || 0)) * 3;
    darkLeaves(ctx, '#5a5a66', '#1a1a22');
    line(ctx, [0, 0, 10, -26, 0, -50 + bob], 8, lg(ctx, -5, 0, 5, 0, '#4a4a58', '#14141c'));
    // alas de plumas negras
    const spread = 0.15 + Math.sin(t * 1.5) * 0.12 + rec * 0.3;
    for (const dir of [-1, 1]) {
      ctx.save(); ctx.translate(dir * 6, -74 + bob); ctx.scale(dir, 1); ctx.rotate(-spread);
      for (let row = 0; row < 3; row++) {
        const n = 6 - row, L = 52 - row * 12;
        for (let i = 0; i < n; i++) {
          const a = -0.5 + i * 0.32 + row * 0.15;
          ctx.save(); ctx.rotate(a); ctx.translate(14 + row * 4, 0);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(L * 0.5, -8, L, -2); ctx.quadraticCurveTo(L * 0.5, 7, 0, 0);
          fs(ctx, lg(ctx, 0, -6, 0, 6, row === 2 ? '#4a4258' : '#2a2434', '#06040a'), GO, 1.5);
          ctx.strokeStyle = 'rgba(160,140,200,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(L * 0.9, -1); ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();
    }
    ctx.save(); ctx.translate(2, -70 + bob);
    // pétalos de lirio pálido
    for (let i = 0; i < 6; i++) {
      ctx.save(); ctx.rotate(i * TAU / 6 + 0.2);
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(14, -22, 4, -38); ctx.lineTo(0, -34); ctx.lineTo(-4, -38); ctx.quadraticCurveTo(-14, -22, 0, -6);
      fs(ctx, lg(ctx, 0, -38, 0, -6, '#f4f0ff', '#a8a0c0'), '#3a3448', 1.8);
      ctx.strokeStyle = 'rgba(80,60,110,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, -30); ctx.stroke();
      ctx.restore();
    }
    circle(ctx, 0, 0, 17); fs(ctx, rg(ctx, -4, -4, 18, '#f8f4ff', '#b8b0d0'), '#3a3448', 2.5);
    crescent(ctx, 0, 0, 17, 17, 0.2, 0.3, 0.3, '40,20,60');
    // ojos cerrados con lágrima negra
    ctx.strokeStyle = '#1a1424'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-6, -2, 4, 0.2, Math.PI - 0.2); ctx.moveTo(10, -2); ctx.arc(6, -2, 4, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.strokeStyle = 'rgba(20,10,30,0.8)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-6, 2); ctx.quadraticCurveTo(-7, 8, -6, 12); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 8, 3, Math.PI + 0.3, -0.3); ctx.stroke();
    // halo roto
    ctx.save(); ctx.translate(-2, -36 + Math.sin(t * 2) * 2); ctx.rotate(-0.25);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 0, 34, '255,220,120', 0.35); ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 6, 0, 0.5, TAU - 0.3); ctx.strokeStyle = '#ffd860'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,220,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  function demongirl(ctx, t, s) {
    const a = s.attack || 0, bob = Math.sin(t * 2.2 + (s.seed || 0)) * 2.5;
    darkLeaves(ctx, '#b03a7a', '#4a0a2a');
    // cola de corazón
    const tw = Math.sin(t * 2.6) * 8;
    ctx.beginPath(); ctx.moveTo(4, -36); ctx.bezierCurveTo(36, -30, 30 + tw, -70, 22 + tw, -88);
    ctx.strokeStyle = C(GO); ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = C('#d0306a'); ctx.lineWidth = 3.5; ctx.stroke();
    heart(ctx, 22 + tw, -92, 7, '#ff3a7a');
    line(ctx, [0, 0, -10, -26, 0, -48 + bob], 8, lg(ctx, -5, 0, 5, 0, '#c04a8a', '#4a0a2a'));
    const flap = Math.sin(t * 6);
    batWing(ctx, -16, -82 + bob, 0.75, flap, -1, '#6a1a5a', '#200418');
    batWing(ctx, 16, -84 + bob, 0.75, flap, 1, '#6a1a5a', '#200418');
    ctx.save(); ctx.translate(2, -68 + bob);
    // melena de pétalos
    for (let i = 0; i < 9; i++) {
      const an = Math.PI + 0.2 + i * 0.36, sw = Math.sin(t * 2 + i) * 0.06;
      ctx.save(); ctx.rotate(an + sw);
      ctx.beginPath(); ctx.moveTo(10, -8); ctx.quadraticCurveTo(34, -18, 40, 6); ctx.quadraticCurveTo(28, 2, 10, 8); ctx.closePath();
      fs(ctx, lg(ctx, 10, 0, 40, 0, '#e04aa0', '#5a0a4a'), GO, 1.8);
      ctx.restore();
    }
    horn(ctx, -12, -22, 0.6, -1); horn(ctx, 12, -23, 0.6, 1);
    circle(ctx, 0, 0, 22); fs(ctx, rg(ctx, -5, -6, 24, '#fff0f4', '#f0a8c0'), '#5a1a3a', 2.5);
    crescent(ctx, 0, 0, 22, 22, 0.14, 0.3, 0.3, '120,20,60');
    // flequillo
    ctx.beginPath(); ctx.moveTo(-22, -4); ctx.quadraticCurveTo(-18, -26, 0, -24); ctx.quadraticCurveTo(20, -26, 22, -6); ctx.quadraticCurveTo(10, -16, 4, -10); ctx.quadraticCurveTo(-6, -18, -22, -4);
    fs(ctx, lg(ctx, 0, -26, 0, -4, '#f060b0', '#8a1a6a'), GO, 1.8);
    // ojos (guiño periódico)
    const wink = (t % 4) < 0.25;
    eye(ctx, -8, 0, 5, 6.5, -7, 1, 3.4);
    if (wink) { ctx.strokeStyle = GO; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(9, 1, 4.5, Math.PI + 0.3, -0.3); ctx.stroke(); }
    else eye(ctx, 9, 0, 5, 6.5, 10, 1, 3.4);
    ctx.strokeStyle = GO; ctx.lineWidth = 1.6;
    for (const ex of [-8, 9]) for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(ex + k * 3, -6); ctx.lineTo(ex + k * 4, -10); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,90,140,0.45)'; ell(ctx, -14, 8, 5, 3); ctx.fill(); ell(ctx, 15, 8, 5, 3); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-5, 11); ctx.quadraticCurveTo(0, 15 + a * 3, 5, 11); ctx.quadraticCurveTo(0, 13, -5, 11); ctx.fillStyle = '#c0103a'; ctx.fill();
    if (a > 0) heart(ctx, 30, -10 - a * 20, 8 * a, '#ff4a8a');
    ctx.restore();
  }
  function heart(ctx, x, y, r, col) {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(0, r * 0.9); ctx.bezierCurveTo(-r * 1.6, -r * 0.2, -r * 0.6, -r * 1.4, 0, -r * 0.4);
    ctx.bezierCurveTo(r * 0.6, -r * 1.4, r * 1.6, -r * 0.2, 0, r * 0.9); ctx.closePath();
    fs(ctx, rg(ctx, -r * 0.3, -r * 0.4, r * 1.4, '#ffb0d0', col), '#4a0018', 1.5);
    ctx.restore();
  }

  function lilith(ctx, t, s) {
    const a = s.attack || 0, bob = Math.sin(t * 1.6 + (s.seed || 0)) * 2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, -60, 100, '200,20,60', 0.16 + a * 0.2); ctx.restore();
    darkLeaves(ctx, '#3a4a2a', '#0a1406', 40);
    line(ctx, [0, 0, -6, -30, 0, -56 + bob], 8, '#2a3a1a');
    // serpiente enroscada
    ctx.strokeStyle = C(GO); ctx.lineWidth = 8; ctx.beginPath();
    for (let i = 0; i <= 24; i++) { const y = -i * 2.4, x = Math.sin(i * 0.55 + t * 2) * 10; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.strokeStyle = C('#2a6a2a'); ctx.lineWidth = 5; ctx.stroke();
    ctx.save(); ctx.translate(Math.sin(24 * 0.55 + t * 2) * 10 + 6, -58);
    ell(ctx, 0, 0, 8, 5); fs(ctx, '#2a6a2a', GO, 1.5);
    ctx.fillStyle = '#ff2020'; circle(ctx, 2, -2, 1.6); ctx.fill();
    if (Math.sin(t * 5) > 0.3) { ctx.strokeStyle = '#d02040'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(8, 1); ctx.lineTo(15, 1); ctx.lineTo(18, -1); ctx.moveTo(15, 1); ctx.lineTo(18, 3); ctx.stroke(); }
    ctx.restore();
    // vestido de pétalos
    ctx.save(); ctx.translate(0, -58 + bob);
    for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 5; i++) {
      const x = (i - 2) * (9 - layer), w = 13 - layer * 2;
      ctx.beginPath(); ctx.moveTo(x - w, -layer * 12); ctx.quadraticCurveTo(x, 40 - layer * 14 + Math.sin(t * 2 + i) * 2, x + w, -layer * 12); ctx.closePath();
      fs(ctx, lg(ctx, 0, -layer * 12, 0, 40, layer === 2 ? '#e8304a' : '#a8102a', '#3a0010'), GO, 1.5);
    }
    ctx.restore();
    // cabeza
    ctx.save(); ctx.translate(0, -88 + bob);
    for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i * TAU / 8); ell(ctx, 0, -18, 10, 14); fs(ctx, rg(ctx, 0, -18, 14, '#c8203a', '#3a0010'), GO, 1.5); ctx.restore(); }
    circle(ctx, 0, 0, 18); fs(ctx, rg(ctx, -4, -4, 20, '#f0e8f0', '#9a90a8'), '#2a1a2a', 2.5);
    crescent(ctx, 0, 0, 18, 18, 0.2, 0.3, 0.3, '40,0,30');
    glowEye(ctx, -6, -2, 4.2, '255,30,50', 'round'); glowEye(ctx, 7, -2, 4.2, '255,30,50', 'round');
    ctx.strokeStyle = GO; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-11, -9); ctx.lineTo(-2, -7); ctx.moveTo(12, -9); ctx.lineTo(3, -7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5, 8); ctx.quadraticCurveTo(0, 11, 5, 8); ctx.quadraticCurveTo(0, 9, -5, 8); ctx.fillStyle = '#4a0010'; ctx.fill();
    // corona de espinas
    ctx.strokeStyle = '#1a0a10'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, -18, 16, 5, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#1a0a10';
    for (let i = 0; i < 5; i++) { const x = -12 + i * 6; ctx.beginPath(); ctx.moveTo(x - 3, -18); ctx.lineTo(x, -32 - (i === 2 ? 6 : 0)); ctx.lineTo(x + 3, -18); ctx.fill(); }
    circle(ctx, 0, -26, 3); fs(ctx, '#ff1a3a', '#300', 1);
    ctx.restore();
  }

  function ghostlily(ctx, t, s) {
    const rec = s.recoil || 0, fl = Math.sin(t * 2 + (s.seed || 0)) * 5;
    ctx.save();
    ctx.globalAlpha *= 0.82;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, -60 + fl, 80, '120,230,255', 0.3); ctx.restore();
    // cola fantasmal
    ctx.beginPath(); ctx.moveTo(-14, -50 + fl);
    for (let i = 0; i <= 6; i++) { const y = -50 + fl + i * 7, x = Math.sin(t * 4 + i) * (6 + i); ctx.lineTo(x - 14 + i * 2, y); }
    ctx.lineTo(Math.sin(t * 4 + 7) * 8, -4 + fl);
    for (let i = 6; i >= 0; i--) { const y = -50 + fl + i * 7, x = Math.sin(t * 4 + i + 1) * (6 + i); ctx.lineTo(x + 14 - i * 2, y); }
    ctx.closePath();
    fs(ctx, lg(ctx, 0, -50, 0, 0, 'rgba(200,250,255,0.8)', 'rgba(120,200,255,0)'), null);
    // trompeta de lirio
    ctx.save(); ctx.translate(2 - rec * 5, -72 + fl);
    for (let i = 0; i < 5; i++) {
      ctx.save(); ctx.rotate(-1.2 + i * 0.6);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(16, -16, 6, -36); ctx.quadraticCurveTo(-2, -24, -8, -30); ctx.quadraticCurveTo(-8, -12, 0, 0);
      fs(ctx, lg(ctx, 0, -36, 0, 0, '#ffffff', '#7ad8f8'), '#2a6a8a', 1.6);
      ctx.restore();
    }
    circle(ctx, 0, 0, 18); fs(ctx, rg(ctx, -4, -4, 20, '#f4feff', '#80d0f0'), '#2a6a8a', 2);
    // ojos huecos y boca
    ctx.fillStyle = '#0a1a2a'; ell(ctx, -6, -3, 4, 6); ctx.fill(); ell(ctx, 7, -3, 4, 6); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(160,255,255,0.9)'; circle(ctx, -6, -2, 1.5); ctx.fill(); circle(ctx, 7, -2, 1.5); ctx.fill(); ctx.restore();
    ell(ctx, 0, 8, 3, 4 + rec * 3); ctx.fillStyle = '#0a1a2a'; ctx.fill();
    ctx.restore();
    // almas orbitando
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { const an = t * 2 + i * 2.1; glow(ctx, Math.cos(an) * 34, -70 + fl + Math.sin(an) * 18, 8, '170,240,255', 0.8); }
    ctx.restore();
    ctx.restore();
  }

  function reaper(ctx, t, s) {
    const a = s.attack || 0, bob = Math.sin(t * 1.4 + (s.seed || 0)) * 2;
    // guadaña
    const ang = a > 0 ? -1.3 + (1 - a) * 2.6 : -1.1 + Math.sin(t * 1.4) * 0.05;
    ctx.save(); ctx.translate(16, -64 + bob); ctx.rotate(ang);
    rrect(ctx, -3, -60, 6, 110, 3); fs(ctx, lg(ctx, -3, 0, 3, 0, '#5a3a2a', '#2a160c'), GO, 2);
    ctx.beginPath(); ctx.moveTo(0, -58); ctx.bezierCurveTo(30, -76, 66, -60, 74, -30); ctx.bezierCurveTo(56, -52, 30, -56, 2, -46); ctx.closePath();
    fs(ctx, lg(ctx, 0, -70, 0, -30, '#ffffff', '#9aa4b0', '#3a4048'), '#14181c', 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(8, -56); ctx.bezierCurveTo(32, -70, 60, -58, 70, -34); ctx.stroke();
    ctx.restore();
    if (a > 0.3) { ctx.save(); ctx.globalAlpha = a * 0.6; ctx.strokeStyle = '#d8c8ff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(16, -64, 90, -1.4, 0.8); ctx.stroke(); ctx.restore(); }
    // manto con capucha y bajo deshilachado
    ctx.save(); ctx.translate(0, bob);
    ctx.beginPath(); ctx.moveTo(-30, 0);
    for (let i = 0; i <= 6; i++) ctx.lineTo(-30 + i * 10, (i % 2 ? -10 : 0) + Math.sin(t * 3 + i) * 2);
    ctx.bezierCurveTo(36, -40, 30, -96, 0, -110); ctx.bezierCurveTo(-30, -96, -36, -40, -30, 0); ctx.closePath();
    fs(ctx, lg(ctx, -30, 0, 30, 0, '#3a2a4a', '#140a1e', '#06020a'), GO, 3);
    ctx.strokeStyle = 'rgba(120,90,160,0.3)'; ctx.lineWidth = 2;
    for (const x of [-14, 0, 14]) { ctx.beginPath(); ctx.moveTo(x, -70); ctx.quadraticCurveTo(x * 1.2, -36, x * 1.4, -6); ctx.stroke(); }
    // interior de la capucha
    ell(ctx, 0, -80, 20, 22); ctx.fillStyle = '#05020a'; ctx.fill();
    // calavera
    ell(ctx, 0, -78, 14, 15); fs(ctx, rg(ctx, -4, -82, 16, '#f8f4e8', '#a8a090'), '#2a2418', 2);
    ctx.fillStyle = '#0a0408'; ell(ctx, -5, -80, 4, 5); ctx.fill(); ell(ctx, 5, -80, 4, 5); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, -5, -80, 8, '190,120,255', 0.9); glow(ctx, 5, -80, 8, '190,120,255', 0.9); ctx.restore();
    ctx.beginPath(); ctx.moveTo(0, -75); ctx.lineTo(-2, -71); ctx.lineTo(2, -71); ctx.closePath(); ctx.fillStyle = '#0a0408'; ctx.fill();
    ctx.strokeStyle = '#2a2418'; ctx.lineWidth = 1.2;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 3, -68); ctx.lineTo(i * 3, -64); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-8, -66); ctx.lineTo(8, -66); ctx.stroke();
    // mano huesuda
    ctx.strokeStyle = '#e8e0cc'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(10, -52); ctx.lineTo(16, -62); ctx.moveTo(12, -52); ctx.lineTo(19, -60); ctx.stroke();
    ctx.restore();
  }

  function widow(ctx, t, s) {
    const a = s.attack || 0;
    // telaraña de fondo
    ctx.save(); ctx.translate(0, -60); ctx.strokeStyle = 'rgba(230,230,240,0.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) { const an = i * TAU / 8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an) * 52, Math.sin(an) * 52); ctx.stroke(); }
    for (const r of [16, 30, 44]) { ctx.beginPath(); for (let i = 0; i <= 8; i++) { const an = i * TAU / 8; const p = [Math.cos(an) * r, Math.sin(an) * r]; i ? ctx.lineTo(...p) : ctx.moveTo(...p); } ctx.stroke(); }
    ctx.restore();
    darkLeaves(ctx, '#3a1a1a', '#0a0404');
    line(ctx, [0, 0, -6, -26, 0, -46], 7, '#2a0a0a', GO, 3);
    ctx.save(); ctx.translate(0, -62);
    // pétalos-patas de araña
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1, k = i % 4;
      const an = side * (0.3 + k * 0.35) + Math.sin(t * 3 + i) * 0.06 + a * side * 0.2;
      ctx.save(); ctx.rotate(-Math.PI / 2 + an);
      ctx.beginPath(); ctx.moveTo(4, 0); ctx.quadraticCurveTo(26, -14, 46, 6);
      ctx.strokeStyle = C(GO); ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = C(k % 2 ? '#c0101a' : '#4a0a10'); ctx.lineWidth = 4; ctx.stroke();
      ctx.restore();
    }
    ell(ctx, 0, 6, 17, 20); fs(ctx, rg(ctx, -5, 0, 22, '#4a3a44', '#05020a'), GO, 2.5);
    ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(6, -2); ctx.lineTo(0, 6); ctx.lineTo(6, 14); ctx.lineTo(-6, 14); ctx.lineTo(0, 6); ctx.closePath(); ctx.fillStyle = '#e0101a'; ctx.fill();
    circle(ctx, 0, -14, 11); fs(ctx, rg(ctx, -3, -17, 12, '#3a2a34', '#05020a'), GO, 2);
    for (const [x, y, r] of [[-5, -16, 2.6], [5, -16, 2.6], [-2, -11, 1.8], [2, -11, 1.8], [-8, -12, 1.5], [8, -12, 1.5]]) {
      ctx.fillStyle = '#ff2a2a'; circle(ctx, x, y, r); ctx.fill(); ctx.fillStyle = '#fff'; circle(ctx, x - 0.5, y - 0.6, r * 0.35); ctx.fill();
    }
    ctx.restore();
  }

  function cursedpumpkin(ctx, t, s) {
    const dmg = s.dmg || 0, flick = 0.75 + Math.sin(t * 13) * 0.1 + Math.sin(t * 7) * 0.1;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, -40, 70, '255,140,20', 0.2 * flick); ctx.restore();
    leaf(ctx, -10, -6, Math.PI + 0.25, 40, 13, '#3a4a1a', '#0a1404'); leaf(ctx, 10, -6, -0.25, 40, 13, '#3a4a1a', '#0a1404');
    // cuerpo con gajos
    for (const [x, w] of [[-22, 22], [22, 22], [-10, 24], [10, 24], [0, 26]]) {
      ell(ctx, x, -38, w, 38); fs(ctx, rg(ctx, x - 6, -50, 40, '#ffa040', '#a84a08'), '#3a1400', 2.5);
    }
    crescent(ctx, 0, -38, 44, 38, 0.25, 0.3, 0.3, '60,10,0');
    // tallo retorcido
    line(ctx, [2, -74, 10, -88, 0, -96], 6, '#3a2a10', GO, 2);
    // cara tallada que brilla por dentro
    const glowFill = rg(ctx, 0, -38, 30, '#fff6a0', '#ff8010', 0, 0);
    ctx.fillStyle = glowFill;
    ctx.beginPath(); ctx.moveTo(-20, -48); ctx.lineTo(-8, -50); ctx.lineTo(-13, -38); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(20, -48); ctx.lineTo(8, -50); ctx.lineTo(13, -38); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-2, -36); ctx.lineTo(2, -36); ctx.lineTo(0, -32); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-24, -26);
    for (let i = 0; i <= 8; i++) ctx.lineTo(-24 + i * 6, -26 + (i % 2 ? 6 : 0) + Math.sin(i) * 1);
    ctx.lineTo(24, -26); ctx.quadraticCurveTo(0, -4, -24, -26); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.globalAlpha = flick * 0.6; ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, -30, 30, '255,200,60', 0.6); ctx.restore();
    // llamas malditas
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(-14 + i * 14, -74); ctx.scale(0.5, 0.5); flame(ctx, 0, 0, t, 30, i); ctx.restore(); }
    ctx.restore();
    if (dmg > 0) {
      ctx.strokeStyle = '#2a0a00'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-34, -60); ctx.lineTo(-24, -54); ctx.lineTo(-28, -44);
      if (dmg > 1) { ctx.moveTo(30, -16); ctx.lineTo(22, -22); ctx.lineTo(28, -30); ctx.moveTo(-6, -72); ctx.lineTo(0, -62); }
      ctx.stroke();
    }
  }

  function bloodrose(ctx, t, s) {
    const g = s.glow || 0, bob = Math.sin(t * 1.8 + (s.seed || 0)) * 2;
    if (g > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, -72, 70, '255,30,60', 0.4 * g); ctx.restore(); }
    darkLeaves(ctx, '#2a4a1a', '#061004');
    thornStem(ctx, [0, 0, 8, -28, 0, -54 + bob], 7, '#2a3a14');
    leaf(ctx, 2, -30, -0.6, 26, 9, '#3a5a2a', '#0a1a06');
    ctx.save(); ctx.translate(0, -72 + bob);
    for (let ring = 0; ring < 4; ring++) {
      const n = 7 - ring, rr = 30 - ring * 7;
      for (let i = 0; i < n; i++) {
        const an = i / n * TAU + ring * 0.6 + t * 0.05 * (ring % 2 ? 1 : -1);
        ell(ctx, Math.cos(an) * rr * 0.45, Math.sin(an) * rr * 0.4, rr * 0.6, rr * 0.48, an);
        fs(ctx, rg(ctx, Math.cos(an) * rr * 0.45, Math.sin(an) * rr * 0.4, rr * 0.7, ring >= 2 ? '#ff3a4a' : '#c00a1a', '#3a0008'), '#1a0004', 1.5);
      }
    }
    ctx.restore();
    // gotas de sangre
    for (let i = 0; i < 2; i++) {
      const k = ((t * 0.6 + i * 0.5) % 1);
      const dx = i ? 14 : -12, dy = -58 + bob + k * 40;
      ctx.save(); ctx.globalAlpha = 1 - k;
      ctx.beginPath(); ctx.moveTo(dx, dy - 5); ctx.quadraticCurveTo(dx + 4, dy + 2, dx, dy + 4); ctx.quadraticCurveTo(dx - 4, dy + 2, dx, dy - 5);
      ctx.fillStyle = '#c0081a'; ctx.fill(); ctx.restore();
    }
  }

  function gargoyle(ctx, t, s) {
    const dmg = s.dmg || 0;
    // pedestal
    rrect(ctx, -36, -16, 72, 16, 3); fs(ctx, lg(ctx, 0, -16, 0, 0, '#8a8882', '#4a4844'), '#1a1a18', 2.5);
    // alas plegadas
    for (const dir of [-1, 1]) {
      ctx.save(); ctx.translate(dir * 18, -62); ctx.scale(dir, 1);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(26, -34, 22, -50); ctx.quadraticCurveTo(30, -30, 30, 0); ctx.quadraticCurveTo(20, 10, 0, 20); ctx.closePath();
      fs(ctx, lg(ctx, 0, -50, 30, 20, '#9a9890', '#4a4844'), '#1a1a18', 2.5);
      ctx.strokeStyle = 'rgba(30,30,28,0.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(22, -46); ctx.moveTo(4, 8); ctx.lineTo(28, -10); ctx.stroke();
      ctx.restore();
    }
    // cuerpo agazapado
    ctx.beginPath(); ctx.moveTo(-28, -16); ctx.bezierCurveTo(-36, -50, -24, -76, 0, -78); ctx.bezierCurveTo(24, -76, 36, -50, 28, -16); ctx.closePath();
    fs(ctx, rg(ctx, -6, -54, 44, '#bab8b0', '#5a5852'), '#1a1a18', 3);
    crescent(ctx, 0, -46, 30, 32, 0.25);
    speckles(ctx, 0, -46, 30, 30, 'rgba(40,40,38,0.35)', 7);
    // brazos/garras
    for (const dir of [-1, 1]) { ell(ctx, dir * 14, -20, 9, 6); fs(ctx, '#8a8882', '#1a1a18', 2); ctx.strokeStyle = '#1a1a18'; ctx.lineWidth = 1.5; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(dir * 14 + k * 4, -16); ctx.lineTo(dir * 14 + k * 4, -12); ctx.stroke(); } }
    // cabeza
    ctx.save(); ctx.translate(0, -84);
    horn(ctx, -12, -10, 0.7, -1); horn(ctx, 12, -10, 0.7, 1);
    ctx.beginPath(); ctx.moveTo(-18, -10); ctx.lineTo(-26, -22); ctx.lineTo(-14, -16); ctx.moveTo(18, -10); ctx.lineTo(26, -22); ctx.lineTo(14, -16); ctx.fillStyle = '#7a7872'; ctx.fill();
    ell(ctx, 0, 0, 20, 18); fs(ctx, rg(ctx, -4, -4, 22, '#c4c2ba', '#62605a'), '#1a1a18', 2.5);
    glowEye(ctx, -7, -3, 4, '255,170,40'); glowEye(ctx, 7, -3, 4, '255,170,40');
    ctx.strokeStyle = '#1a1a18'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-13, -10); ctx.lineTo(-2, -7); ctx.moveTo(13, -10); ctx.lineTo(2, -7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-9, 7); ctx.quadraticCurveTo(0, 12, 9, 7); ctx.fillStyle = '#1a1a18'; ctx.fill();
    ctx.fillStyle = '#e8e6de'; for (const fx of [-5, 5]) { ctx.beginPath(); ctx.moveTo(fx - 2, 7); ctx.lineTo(fx, 12); ctx.lineTo(fx + 2, 7); ctx.fill(); }
    ctx.restore();
    if (dmg > 0) { ctx.strokeStyle = '#1a1a18'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-20, -60); ctx.lineTo(-10, -50); ctx.lineTo(-14, -38); if (dmg > 1) { ctx.moveTo(18, -40); ctx.lineTo(8, -30); ctx.lineTo(14, -20); ctx.moveTo(4, -92); ctx.lineTo(-2, -84); } ctx.stroke(); }
  }

  // Espectro: fantasma encapuchado que lanza fuego negro
  function blackFlame(ctx, x, y, t, size, seed = 0) {
    const layers = [['#120018', 1], ['#3a0a5a', 0.74], ['#8a3ad8', 0.46], ['#e8c8ff', 0.2]];
    for (let i = 0; i < layers.length; i++) {
      const [col, k] = layers[i];
      const w = size * 0.55 * k, h = size * (0.9 + 0.14 * Math.sin(t * 13 + i + seed)) * k + size * 0.15;
      const tip = Math.sin(t * 9 + i * 1.7 + seed) * size * 0.16;
      ctx.beginPath(); ctx.moveTo(x - w, y);
      ctx.bezierCurveTo(x - w * 1.1, y - h * 0.5, x + tip - w * 0.3, y - h * 0.8, x + tip, y - h);
      ctx.bezierCurveTo(x + tip + w * 0.3, y - h * 0.75, x + w * 1.1, y - h * 0.45, x + w, y);
      ctx.quadraticCurveTo(x, y + w * 0.4, x - w, y); ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
    }
  }
  function wraith(ctx, t, s) {
    const rec = s.recoil || 0, fl = Math.sin(t * 2.2 + (s.seed || 0)) * 5;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, -70 + fl, 80, '140,60,255', 0.22 + rec * 0.3); ctx.restore();
    // sombra difusa en el suelo
    ctx.save(); ctx.globalAlpha *= 0.35; ell(ctx, 0, -2, 30, 7); ctx.fillStyle = '#1a0030'; ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(0, fl);
    // manto hecho jirones (flota)
    ctx.beginPath(); ctx.moveTo(-26, -96);
    ctx.bezierCurveTo(-40, -60, -34, -34, -30, -16);
    for (let i = 0; i <= 8; i++) ctx.lineTo(-30 + i * 7.5, -16 + (i % 2 ? -12 : 6) + Math.sin(t * 5 + i) * 5);
    ctx.bezierCurveTo(34, -34, 40, -60, 26, -96); ctx.quadraticCurveTo(0, -128, -26, -96); ctx.closePath();
    fs(ctx, lg(ctx, -36, -110, 36, 0, '#3a2a54', '#14081f', '#05020a'), '#000', 2.5);
    // pliegues e interior violeta
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(160,110,230,0.28)'; ctx.lineWidth = 2;
    for (const x of [-16, -4, 10, 22]) { ctx.beginPath(); ctx.moveTo(x * 0.6, -100); ctx.quadraticCurveTo(x * 1.1, -60, x * 1.2, -14); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.moveTo(-26, -96); ctx.quadraticCurveTo(-30, -60, -22, -20); ctx.lineTo(-14, -20); ctx.quadraticCurveTo(-20, -60, -14, -100); ctx.fill();
    ctx.restore();
    // broche de luna plateada
    ctx.save(); ctx.translate(0, -78);
    circle(ctx, 0, 0, 6); fs(ctx, rg(ctx, -2, -2, 7, '#ffffff', '#9aa4c8'), '#2a2a48', 1.5);
    ctx.beginPath(); ctx.arc(1.5, 0, 4.5, 0, TAU); ctx.fillStyle = '#3a2a54'; ctx.fill();
    ctx.restore();
    // capucha y rostro vacío
    ctx.save(); ctx.translate(0, -102);
    ctx.beginPath(); ctx.moveTo(-24, 14); ctx.bezierCurveTo(-30, -16, -12, -36, 4, -34); ctx.bezierCurveTo(22, -32, 30, -10, 24, 16); ctx.quadraticCurveTo(0, 6, -24, 14); ctx.closePath();
    fs(ctx, lg(ctx, -24, -34, 24, 16, '#4a3a68', '#120820'), '#000', 2.5);
    ell(ctx, 2, 0, 15, 15); ctx.fillStyle = '#020005'; ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(ctx, -4, -2, 11, '170,120,255', 0.95); glow(ctx, 9, -2, 10, '170,120,255', 0.95);
    ctx.fillStyle = '#efe4ff'; ell(ctx, -4, -2, 3, 1.8); ctx.fill(); ell(ctx, 9, -2, 2.6, 1.6); ctx.fill();
    ctx.restore();
    ctx.restore();
    // manos esqueléticas que conjuran el fuego negro
    const hx = 30 + rec * 6, hy = -64;
    ctx.strokeStyle = '#d8d0e8'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(18, -72); ctx.quadraticCurveTo(26, -70, hx, hy); ctx.stroke();
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + 7, hy + k * 4 - 2); ctx.stroke(); }
    ctx.save(); ctx.globalCompositeOperation = 'source-over';
    blackFlame(ctx, hx + 8, hy - 2, t, 18 + rec * 14, 2);
    ctx.restore();
    // jirones de sombra que se desprenden
    ctx.save(); ctx.globalAlpha *= 0.5;
    for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; ell(ctx, -20 + i * 18, -10 - k * 60, 6 * (1 - k), 10 * (1 - k)); ctx.fillStyle = '#1a0830'; ctx.fill(); }
    ctx.restore();
    ctx.restore();
  }

  const GOTHIC_PLANTS = { wraith, demon, fallenangel, demongirl, lilith, ghostlily, reaper, widow, cursedpumpkin, bloodrose, gargoyle };
  const baseExtra = Art.extraPlant;
  Art.extraPlant = function (ctx, type, t, s) {
    if (GOTHIC_PLANTS[type]) return GOTHIC_PLANTS[type](ctx, t, s);
    return baseExtra(ctx, type, t, s);
  };

  // ---------- Proyectiles góticos ----------
  const baseProj = Art.projectile;
  Art.projectile = function (ctx, kind, x, y, rot, t, sc = 1) {
    if (kind === 'hellfire') {
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 0, 30, '255,60,20', 0.7); ctx.restore();
      ctx.save(); ctx.rotate(-Math.PI / 2); flame(ctx, 0, 8, t, 26, x * 0.05); ctx.restore();
      circle(ctx, 0, 0, 9); fs(ctx, rg(ctx, 0, 0, 9, '#ffe0a0', '#c01a0a'), '#3a0000', 1.5);
      ctx.restore(); return;
    }
    if (kind === 'blackfire') {
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 0, 30, '150,70,255', 0.55); ctx.restore();
      ctx.save(); ctx.rotate(-Math.PI / 2); blackFlame(ctx, 0, 10, t, 30, x * 0.05); ctx.restore();
      circle(ctx, 0, 0, 8); fs(ctx, rg(ctx, -2, -2, 9, '#c8a0ff', '#14001e'), '#000', 1.2);
      ctx.restore(); return;
    }
    if (kind === 'feather') {
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 20 + x) * 0.1); ctx.scale(sc, sc);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, -6, 0, 20, '160,120,255', 0.4); ctx.restore();
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.quadraticCurveTo(0, -9, -18, -2); ctx.quadraticCurveTo(0, 7, 18, 0); ctx.closePath();
      fs(ctx, lg(ctx, -18, 0, 18, 0, '#4a3a6a', '#0a0612'), '#000', 1.2);
      ctx.strokeStyle = 'rgba(200,180,255,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(16, 0); ctx.stroke();
      ctx.restore(); return;
    }
    if (kind === 'wisp') {
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) glow(ctx, -i * 8, Math.sin(t * 14 + i) * 3, 14 - i * 2, '150,240,255', 0.6 - i * 0.12);
      ctx.fillStyle = 'rgba(230,255,255,0.95)'; circle(ctx, 0, 0, 6); ctx.fill();
      ctx.restore(); return;
    }
    if (kind === 'heart') { ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 0, 24, '255,80,160', 0.5); ctx.restore(); heart(ctx, x, y + Math.sin(t * 12) * 3, 10 * sc, '#ff3a8a'); return; }
    return baseProj(ctx, kind, x, y, rot, t, sc);
  };
  // Sol de alma (morado con calavera)
  Art.soul = function (ctx, x, y, t, scale = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 0, 46, '200,90,255', 0.65); ctx.restore();
    ctx.save(); ctx.rotate(t * 1.4); ctx.strokeStyle = 'rgba(220,170,255,0.6)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.rotate(TAU / 3); ctx.beginPath(); ctx.arc(0, 0, 24, 0, 1.4); ctx.stroke(); }
    ctx.restore();
    circle(ctx, 0, 0, 16); fs(ctx, rg(ctx, -4, -4, 17, '#f4e8ff', '#8a3ad8'), '#3a0a6a', 2);
    ctx.fillStyle = '#2a0a4a'; ell(ctx, -5, -2, 3.5, 4); ctx.fill(); ell(ctx, 5, -2, 3.5, 4); ctx.fill();
    ctx.fillRect(-4, 6, 8, 2);
    ctx.restore();
  };

  // ==================================================================
  //  ZOMBIS GÓTICOS
  // ==================================================================
  const GL = {
    vampire:   { skin: ['#efedf8', '#9c98ba'], coat: ['#24202c', '#0a080e'], tie: '#b0101a', pants: ['#24202c', '#0c0a10'], iris: ['#ffb0b0', '#e0101a', '#4a0000'] },
    witch:     { skin: ['#b8e47e', '#5c8c34'], coat: ['#5a2a7a', '#26103a'], tie: '#6a3a8a', pants: ['#2a1a3a', '#140a20'], iris: ['#e8c0ff', '#9a3ae0', '#2a0050'] },
    gargoylez: { skin: ['#bcbab2', '#62605a'], coat: ['#6e6c66', '#3a3834'], tie: '#4a4844', pants: ['#5a5852', '#34322e'] },
    archdemon: { skin: ['#ea5a3e', '#7a140c'], coat: ['#2a1410', '#140806'], tie: '#000', pants: ['#2a1410', '#120604'], iris: ['#fff6a0', '#ffb020', '#7a3000'] },
    skeleton:  { skin: ['#f0ead6', '#a8a08a'] },
    ghost:     { skin: ['#e8f8ff', '#80b8d8'] },
  };
  const baseLook = Art.zombieLook;
  Art.zombieLook = (type, seed) => { const l = baseLook(type, seed); if (GL[type]) Object.assign(l, GL[type]); return l; };
  const dl = {};
  Art.defaultLook = type => dl[type] || (dl[type] = Art.zombieLook(type, 0.31));

  function bone(ctx, x1, y1, x2, y2, w) {
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = C('#2a241a'); ctx.lineWidth = w + 4; ctx.stroke();
    ctx.strokeStyle = C('#ece4cc'); ctx.lineWidth = w; ctx.stroke();
    for (const [x, y] of [[x1, y1], [x2, y2]]) { circle(ctx, x, y, w * 0.75); ctx.fillStyle = C('#ece4cc'); ctx.fill(); ctx.strokeStyle = C('#2a241a'); ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  function skull(ctx, jaw, dead) {
    // mandíbula
    ctx.save(); ctx.translate(-4, 8); ctx.rotate(jaw);
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-12, 10); ctx.quadraticCurveTo(0, 15, 12, 8); ctx.lineTo(12, 0); ctx.closePath();
    fs(ctx, lg(ctx, 0, 0, 0, 14, '#f0e8d0', '#a8a088'), '#2a241a', 2);
    ctx.strokeStyle = '#2a241a'; ctx.lineWidth = 1; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 4, 0); ctx.lineTo(i * 4, 4); ctx.stroke(); }
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(-22, 2); ctx.bezierCurveTo(-26, -32, 22, -36, 22, -6); ctx.quadraticCurveTo(20, 6, 10, 8); ctx.lineTo(-16, 8); ctx.closePath();
    fs(ctx, rg(ctx, -6, -14, 30, '#fffaea', '#b8b098'), '#2a241a', 2.5);
    crescent(ctx, -2, -10, 22, 18, 0.18, 0.3, 0.3, '60,50,30');
    ctx.fillStyle = '#100808'; ell(ctx, -11, -7, 6, 7); ctx.fill(); ell(ctx, 5, -7, 5, 6); ctx.fill();
    if (!dead) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, -11, -6, 8, '255,60,40', 0.9); glow(ctx, 5, -6, 7, '255,60,40', 0.9); ctx.restore(); }
    ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(-6, 5); ctx.lineTo(0, 5); ctx.closePath(); ctx.fillStyle = '#100808'; ctx.fill();
    ctx.fillStyle = '#f8f0dc'; ctx.strokeStyle = '#2a241a'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.rect(-12 + i * 4.5, 7, 3.8, 4); ctx.fill(); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(60,50,30,0.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(8, -26); ctx.lineTo(4, -18); ctx.lineTo(9, -12); ctx.stroke();
  }
  function skeletonZ(ctx, z, t) {
    const g = Art.gait(z), a = z.animT || 0, ph = a * g.freq;
    const moving = z.state === 'walk' || z.state === 'lane', eating = z.state === 'eat';
    if (z.state === 'bones' || (z.state === 'dying' && z.dieT > 0.5)) {
      // montón de huesos
      const k = z.state === 'bones' ? Math.max(0, z.reviveT - 2.2) / 0.8 : 0; // se levanta al final
      ctx.save(); ctx.translate(0, -k * 40);
      bone(ctx, -30, -4, 6, -10, 5); bone(ctx, -4, -6, 30, 0, 5); bone(ctx, -18, -12, 14, -2, 4); bone(ctx, 10, -14, 34, -8, 4);
      ctx.save(); ctx.translate(-26, -20); ctx.rotate(-0.4); skull(ctx, 0.3, true); ctx.restore();
      ctx.restore(); return;
    }
    const sw = moving ? Math.sin(ph) : 0;
    const hipY = -60 + (moving ? -Math.abs(Math.cos(ph)) * 3 : 0);
    // piernas
    for (const [s, x] of [[-1, 5], [1, -5]]) {
      const a1 = moving ? s * sw * g.stride : 0.1 * s;
      const kx = x - Math.sin(a1) * 28, ky = hipY + Math.cos(a1) * 28;
      const a2 = a1 - (moving ? Math.max(0, Math.cos(ph + (s > 0 ? Math.PI : 0))) * 0.8 : 0.1);
      const fx = kx - Math.sin(a2) * 28, fy = ky + Math.cos(a2) * 28;
      bone(ctx, x, hipY, kx, ky, 5); bone(ctx, kx, ky, fx, fy, 4.5);
      ell(ctx, fx - 6, fy + 1, 9, 3.5); fs(ctx, '#ece4cc', '#2a241a', 1.5);
    }
    // pelvis y harapo
    ctx.beginPath(); ctx.moveTo(-14, hipY - 6); ctx.lineTo(14, hipY - 6); ctx.lineTo(10, hipY + 6); ctx.lineTo(-10, hipY + 6); ctx.closePath(); fs(ctx, '#ece4cc', '#2a241a', 2);
    ctx.beginPath(); ctx.moveTo(-16, hipY - 4); ctx.lineTo(16, hipY - 4); ctx.lineTo(14, hipY + 14); ctx.lineTo(8, hipY + 8); ctx.lineTo(2, hipY + 18); ctx.lineTo(-4, hipY + 8); ctx.lineTo(-12, hipY + 16); ctx.closePath();
    fs(ctx, lg(ctx, 0, hipY, 0, hipY + 18, '#5a3a4a', '#2a1420'), '#14080e', 1.5);
    ctx.save(); ctx.translate(0, hipY); ctx.rotate(g.lean + (eating ? -0.12 : 0));
    // brazo trasero
    const reach = eating ? 1.9 + Math.sin(a * 10) * 0.25 : 1.4 + Math.sin(ph + 1) * 0.12;
    const arm = (sx, sy, an, col) => { const ex = sx - Math.sin(an) * 24, ey = sy + Math.cos(an) * 24, hx = ex - Math.sin(an - 0.2) * 22, hy = ey + Math.cos(an - 0.2) * 22; bone(ctx, sx, sy, ex, ey, 4); bone(ctx, ex, ey, hx, hy, 3.5); ctx.strokeStyle = '#ece4cc'; ctx.lineWidth = 2; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - 8, hy + k * 4 + 2); ctx.stroke(); } };
    arm(6, -50, reach - 0.1);
    // columna y costillas
    bone(ctx, 0, -2, -2, -52, 4);
    for (let i = 0; i < 5; i++) {
      const y = -46 + i * 8, w = 18 - Math.abs(i - 1.5) * 2;
      ctx.beginPath(); ctx.ellipse(-2, y, w, 5, 0, Math.PI * 0.05, Math.PI * 0.95);
      ctx.strokeStyle = C('#2a241a'); ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = C('#ece4cc'); ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-2, y, w, 5, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.strokeStyle = C('#2a241a'); ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = C('#ece4cc'); ctx.lineWidth = 3; ctx.stroke();
    }
    // cabeza
    if (!z.headless) {
      ctx.save(); ctx.translate(-8, -74); ctx.rotate(moving ? Math.sin(ph - 0.9) * 0.1 : 0.05);
      skull(ctx, eating ? 0.1 + Math.max(0, Math.sin(a * 10)) * 0.3 : 0.08 + Math.abs(Math.sin(a * 8)) * 0.12, z.state === 'dying');
      ctx.restore();
    }
    arm(-12, -52, reach);
    ctx.restore();
  }

  function ghostZ(ctx, z, t) {
    const a = z.animT || 0, eth = z.ethereal;
    const fl = Math.sin(a * 2.5) * 6;
    ctx.save();
    ctx.globalAlpha *= eth ? 0.3 : 0.85;
    ctx.translate(0, -20 + fl);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, -70, 90, '150,220,255', eth ? 0.15 : 0.3); ctx.restore();
    // cuerpo-sábana con cola ondulante
    ctx.beginPath(); ctx.moveTo(-26, -100);
    ctx.bezierCurveTo(-30, -60, -26, -20, -18, 0);
    for (let i = 0; i <= 6; i++) ctx.lineTo(-18 + i * 7, (i % 2 ? -10 : 4) + Math.sin(a * 6 + i) * 4);
    ctx.bezierCurveTo(26, -20, 30, -60, 24, -100); ctx.quadraticCurveTo(0, -112, -26, -100); ctx.closePath();
    fs(ctx, lg(ctx, -26, -100, 26, 0, 'rgba(240,252,255,0.95)', 'rgba(150,200,230,0.6)'), 'rgba(40,80,110,0.8)', 2.5);
    // cadenas
    const reach = z.state === 'eat' ? 1.9 + Math.sin(a * 10) * 0.25 : 1.45 + Math.sin(a * 2) * 0.1;
    for (const [sx, d] of [[6, 0.1], [-14, 0]]) {
      const ex = sx - Math.sin(reach - d) * 44, ey = -88 + Math.cos(reach - d) * 44;
      ctx.beginPath(); ctx.moveTo(sx, -88); ctx.quadraticCurveTo((sx + ex) / 2, ey - 10, ex, ey);
      ctx.strokeStyle = 'rgba(40,80,110,0.8)'; ctx.lineWidth = 13; ctx.stroke(); ctx.strokeStyle = 'rgba(225,245,255,0.95)'; ctx.lineWidth = 9; ctx.stroke();
      rrect(ctx, ex - 5, ey - 6, 10, 12, 2); fs(ctx, '#7a8088', '#2a3038', 1.5);
      ctx.strokeStyle = '#6a7078'; ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) { ell(ctx, ex + 6 + k * 7, ey + 6 + k * 5, 4, 2.5, 0.6); ctx.stroke(); }
    }
    // cara hueca
    ctx.fillStyle = '#0a1420';
    ell(ctx, -12, -78, 6, 9); ctx.fill(); ell(ctx, 4, -78, 5, 8); ctx.fill();
    ell(ctx, -4, -58, 5, 8 + Math.sin(a * 3) * 2); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, -12, -78, 7, '140,240,255', 0.9); glow(ctx, 4, -78, 6, '140,240,255', 0.9); ctx.restore();
    ctx.restore();
  }

  const baseZombie = Art.zombie;
  Art.zombie = function (ctx, z, t) {
    if (z.type === 'skeleton') return skeletonZ(ctx, z, t);
    if (z.type === 'ghost') return ghostZ(ctx, z, t);
    if (z.charmed) {
      ctx.save(); ctx.scale(-1, 1); baseZombie(ctx, z, t); ctx.restore();
      return;
    }
    return baseZombie(ctx, z, t);
  };

  // Ganchos sobre el esqueleto de zombi normal
  Art.zHook = function (stage, ctx, z, t, ex) {
    const type = z.type;
    if (stage === 'fullhead') {
      if (type === 'skeleton') { skull(ctx, 0.2, !ex.alive); return true; }
      if (type === 'ghost') { ctx.save(); ctx.translate(0, 70); ctx.scale(0.7, 0.7); ghostZ(ctx, Object.assign({}, z, { animT: 0 }), 0); ctx.restore(); return true; }
      return false;
    }
    if (type === 'vampire') {
      if (stage === 'back') {
        const TH = ex.TH, wave = Math.sin(t * 4 + (z.animT || 0)) * 6;
        ctx.beginPath(); ctx.moveTo(-ex.TW, -TH + 2); ctx.quadraticCurveTo(10, -TH - 6, ex.TW + 4, -TH + 2);
        ctx.bezierCurveTo(ex.TW + 26 + wave, -TH + 40, ex.TW + 34 + wave, 20, ex.TW + 30 + wave * 1.4, 54);
        for (let i = 0; i < 5; i++) ctx.lineTo(ex.TW + 30 - i * 14 + wave, 54 + (i % 2 ? -10 : 0));
        ctx.quadraticCurveTo(-ex.TW - 10, 10, -ex.TW, -TH + 2); ctx.closePath();
        fs(ctx, lg(ctx, -20, 0, 50, 0, '#1a1420', '#06040a'), '#000', 2.5);
        ctx.beginPath(); ctx.moveTo(ex.TW - 2, -TH + 6); ctx.bezierCurveTo(ex.TW + 18 + wave, -TH + 40, ex.TW + 24 + wave, 20, ex.TW + 20 + wave, 46); ctx.lineTo(ex.TW + 6 + wave, 40); ctx.quadraticCurveTo(ex.TW + 6, 0, ex.TW - 6, -TH + 10); ctx.closePath();
        fs(ctx, lg(ctx, 0, -TH, 0, 46, '#c8101a', '#5a0006'), null);
        // cuello alto
        for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 6, -TH + 2); ctx.lineTo(d * 24 + 4, -TH - 34); ctx.lineTo(d * 10 + 2, -TH - 6); ctx.closePath(); fs(ctx, '#140e18', '#000', 2); }
      } else if (stage === 'head') {
        ctx.beginPath(); ctx.moveTo(-26, -6); ctx.bezierCurveTo(-30, -38, 22, -44, 26, -14); ctx.lineTo(18, -18); ctx.lineTo(4, -20); ctx.lineTo(-4, -12); ctx.lineTo(-10, -20); ctx.lineTo(-22, -16); ctx.closePath();
        fs(ctx, lg(ctx, 0, -40, 0, -10, '#3a3048', '#06040a'), '#000', 2);
        highlight(ctx, -4, -32, 10, 3, -0.2, 0.35);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, -14, -9, 9, '255,30,40', 0.7); glow(ctx, 3, -9, 8, '255,30,40', 0.7); ctx.restore();
        ctx.fillStyle = '#fff'; for (const fx of [-14, 2]) { ctx.beginPath(); ctx.moveTo(fx - 2.5, 11); ctx.lineTo(fx, 19 + (ex.jaw || 0) * 6); ctx.lineTo(fx + 2.5, 11); ctx.fill(); }
      }
    } else if (type === 'witch') {
      if (stage === 'back') {
        line(ctx, [30, 20, -20, -ex.TH - 30], 5, '#7a5a30', '#2a1a08', 2);
        ctx.save(); ctx.translate(34, 26); ctx.rotate(0.6);
        ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(6, -4); ctx.lineTo(14, 26); ctx.lineTo(-14, 26); ctx.closePath(); fs(ctx, lg(ctx, -14, 0, 14, 0, '#d8b060', '#8a6a30'), '#3a2a08', 2);
        ctx.strokeStyle = 'rgba(80,50,10,0.6)'; ctx.lineWidth = 1; for (let i = -10; i <= 10; i += 4) { ctx.beginPath(); ctx.moveTo(i * 0.4, 0); ctx.lineTo(i, 26); ctx.stroke(); }
        ctx.restore();
      } else if (stage === 'head') {
        ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 3;
        for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(10 + i * 3, -20); ctx.quadraticCurveTo(26 + i * 2, 0, 18 + i * 3, 28 + i * 2); ctx.stroke(); }
        ctx.fillStyle = '#5a8a3a'; circle(ctx, -12, 3, 2.2); ctx.fill();
        ctx.save(); ctx.translate(0, -24); ctx.rotate(-0.1);
        ell(ctx, 0, 0, 40, 9); fs(ctx, lg(ctx, -40, 0, 40, 0, '#3a2a4a', '#0a0610'), '#000', 2);
        const bend = Math.sin(t * 2 + (z.animT || 0)) * 4;
        ctx.beginPath(); ctx.moveTo(-20, -2); ctx.quadraticCurveTo(-6, -40, 10 + bend, -58); ctx.quadraticCurveTo(22 + bend, -56, 26 + bend, -46); ctx.quadraticCurveTo(10, -36, 20, -2); ctx.closePath();
        fs(ctx, lg(ctx, -20, 0, 20, 0, '#3a2a4a', '#0a0610'), '#000', 2);
        ctx.fillStyle = '#7a3aa8'; ctx.fillRect(-20, -12, 40, 7);
        rrect(ctx, -6, -14, 10, 10, 1); ctx.strokeStyle = '#e8c040'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
      } else if (stage === 'over') {
        const hy = ex.hipY, sw = ex.moving ? Math.sin(ex.ph * 2) * 3 : 0;
        ctx.beginPath(); ctx.moveTo(-18, hy - 6); ctx.lineTo(18, hy - 6); ctx.lineTo(26 + sw, -10);
        for (let i = 0; i <= 8; i++) ctx.lineTo(26 + sw - i * 6.5, -10 + (i % 2 ? 7 : 0));
        ctx.closePath();
        fs(ctx, lg(ctx, -26, 0, 26, 0, '#6a3a8a', '#2a1040'), '#0a0010', 2.5);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5; for (const x of [-10, 2, 14]) { ctx.beginPath(); ctx.moveTo(x * 0.6, hy); ctx.lineTo(x + sw, -12); ctx.stroke(); }
        if (z.castT > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, -60, -110, 40, '120,255,80', z.castT); ctx.restore(); }
      }
    } else if (type === 'gargoylez') {
      if (stage === 'back' && z.armor > 0) {
        const fr = z.armor / z.armorMax;
        for (const d of [1, 0.7]) {
          ctx.save(); ctx.translate(14, -ex.TH + 6); ctx.scale(d, d); ctx.rotate(-0.2);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(20, -60, 64, -70); ctx.quadraticCurveTo(56, -46, 66, -30); ctx.quadraticCurveTo(48, -30, 48, -12); ctx.quadraticCurveTo(30, -16, 26, 6); ctx.closePath();
          fs(ctx, lg(ctx, 0, -70, 0, 6, '#a8a6a0', '#4a4844'), '#1a1a18', 2.5);
          ctx.strokeStyle = 'rgba(30,30,28,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(4, -2); ctx.lineTo(62, -68); ctx.moveTo(4, -2); ctx.lineTo(64, -30); ctx.moveTo(4, -2); ctx.lineTo(46, -12);
          if (fr < 0.6) { ctx.moveTo(30, -40); ctx.lineTo(40, -30); ctx.lineTo(34, -20); }
          ctx.stroke(); ctx.restore();
        }
      } else if (stage === 'head') {
        horn(ctx, -16, -26, 0.75, -1); horn(ctx, 10, -30, 0.75, 1);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, -14, -9, 8, '255,160,40', 0.6); ctx.restore();
      }
    } else if (type === 'archdemon') {
      if (stage === 'back') {
        const flap = Math.sin(t * 3);
        for (const d of [1, 0.75]) {
          ctx.save(); ctx.translate(10, -ex.TH); ctx.scale(d * 1.6, d * 1.6); ctx.rotate(-0.5 - flap * 0.3);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(20, -40, 70, -48); ctx.quadraticCurveTo(60, -30, 72, -18); ctx.quadraticCurveTo(54, -18, 56, 0); ctx.quadraticCurveTo(38, -4, 36, 12); ctx.quadraticCurveTo(20, 4, 0, 0); ctx.closePath();
          fs(ctx, lg(ctx, 0, -48, 0, 12, '#6a0a0a', '#1a0202'), '#000', 2);
          ctx.strokeStyle = 'rgba(255,90,40,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(70, -46); ctx.moveTo(2, 0); ctx.lineTo(70, -18); ctx.moveTo(2, 0); ctx.lineTo(54, 0); ctx.stroke();
          ctx.restore();
        }
      } else if (stage === 'chest') {
        ctx.strokeStyle = 'rgba(60,0,0,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-4, -ex.TH + 6); ctx.lineTo(-4, -8); ctx.moveTo(-22, -40); ctx.quadraticCurveTo(-12, -34, -4, -40); ctx.moveTo(14, -40); ctx.quadraticCurveTo(6, -34, -4, -40); ctx.stroke();
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, -4, -30, 18, '255,140,20', 0.5 + Math.sin(t * 4) * 0.2); ctx.restore();
        ctx.fillStyle = '#2a1410'; ctx.fillRect(-28, -4, 54, 9);
      } else if (stage === 'weapon') {
        rrect(ctx, -5, -160, 10, 180, 4); fs(ctx, lg(ctx, -5, 0, 5, 0, '#4a2a1a', '#1a0a04'), '#000', 2);
        ctx.beginPath(); ctx.moveTo(-28, -150); ctx.quadraticCurveTo(-26, -176, -22, -190); ctx.lineTo(-18, -156); ctx.lineTo(-4, -156); ctx.lineTo(0, -200); ctx.lineTo(4, -156); ctx.lineTo(18, -156); ctx.lineTo(22, -190); ctx.quadraticCurveTo(26, -176, 28, -150); ctx.closePath();
        fs(ctx, lg(ctx, -28, 0, 28, 0, '#6a6a72', '#e8e8f0', '#4a4a52'), '#000', 2);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const x of [-22, 0, 22]) { ctx.save(); ctx.translate(x, -190 - (x ? 0 : 10)); ctx.scale(0.6, 0.6); flame(ctx, 0, 0, t, 34, x); ctx.restore(); }
        ctx.restore();
        return true;
      } else if (stage === 'head') {
        horn(ctx, -20, -26, 1.4, -1); horn(ctx, 12, -30, 1.4, 1);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, -14, -8, 12, '255,200,40', 0.9); glow(ctx, 3, -8, 10, '255,200,40', 0.9); ctx.restore();
        ctx.fillStyle = '#1a0402'; ctx.beginPath(); ctx.moveTo(-14, 14); ctx.lineTo(-4, 30); ctx.lineTo(2, 14); ctx.fill();
      }
    }
    return false;
  };

  // ==================================================================
  //  ESCENARIO GÓTICO
  // ==================================================================
  function rnd(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function gothicBackground(ctx) {
    const R = rnd(777);
    let g = ctx.createLinearGradient(0, 0, 0, 170);
    g.addColorStop(0, '#12061e'); g.addColorStop(0.6, '#3a0a2a'); g.addColorStop(1, '#6a1428');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 170);
    for (let i = 0; i < 70; i++) { ctx.fillStyle = `rgba(255,220,240,${0.3 + R() * 0.6})`; circle(ctx, R() * W, R() * 90, R() * 1.4 + 0.3); ctx.fill(); }
    // luna de sangre
    const mg = ctx.createRadialGradient(1080, 60, 10, 1080, 60, 160);
    mg.addColorStop(0, 'rgba(255,80,60,0.55)'); mg.addColorStop(1, 'rgba(255,40,40,0)');
    ctx.fillStyle = mg; ctx.fillRect(900, 0, 360, 170);
    circle(ctx, 1080, 60, 46); ctx.fillStyle = rg(ctx, 1066, 46, 50, '#ff9a7a', '#a8141a', 0, 0); ctx.fill();
    ctx.fillStyle = 'rgba(90,0,10,0.35)'; circle(ctx, 1066, 52, 9); ctx.fill(); circle(ctx, 1094, 74, 7); ctx.fill(); circle(ctx, 1090, 40, 5); ctx.fill();
    // catedral en silueta
    ctx.fillStyle = '#0c0410';
    const spire = (x, w, h) => { ctx.beginPath(); ctx.moveTo(x - w / 2, 150); ctx.lineTo(x - w / 2, 150 - h); ctx.lineTo(x, 150 - h - w * 1.6); ctx.lineTo(x + w / 2, 150 - h); ctx.lineTo(x + w / 2, 150); ctx.closePath(); ctx.fill(); };
    ctx.fillRect(520, 70, 300, 80); spire(560, 44, 70); spire(780, 44, 70); spire(670, 64, 96); spire(470, 30, 40); spire(870, 30, 40);
    ctx.fillRect(440, 110, 480, 40);
    // rosetón iluminado
    const rw = ctx.createRadialGradient(670, 86, 2, 670, 86, 26);
    rw.addColorStop(0, '#ffd27a'); rw.addColorStop(0.5, '#e05a2a'); rw.addColorStop(1, '#5a0a1a');
    circle(ctx, 670, 86, 20); ctx.fillStyle = rw; ctx.fill();
    ctx.strokeStyle = '#0c0410'; ctx.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.beginPath(); ctx.moveTo(670, 86); ctx.lineTo(670 + Math.cos(a) * 20, 86 + Math.sin(a) * 20); ctx.stroke(); }
    ctx.fillStyle = '#ffb04a'; for (const x of [560, 780]) { rrect(ctx, x - 5, 96, 10, 22, 5); ctx.fill(); }
    // árboles muertos
    const tree = (x, s) => {
      ctx.strokeStyle = '#08020a'; ctx.lineCap = 'round';
      const br = (x0, y0, a, l, w) => { if (l < 6) return; const x1 = x0 + Math.cos(a) * l, y1 = y0 + Math.sin(a) * l; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); br(x1, y1, a - 0.45 - R() * 0.2, l * 0.68, w * 0.65); br(x1, y1, a + 0.4 + R() * 0.2, l * 0.62, w * 0.65); };
      br(x, 152, -Math.PI / 2 + (R() - 0.5) * 0.2, 40 * s, 8 * s);
    };
    tree(200, 1.1); tree(350, 0.8); tree(1000, 0.9); tree(1240, 1.2);
    // reja de hierro con puntas de lanza
    ctx.fillStyle = '#0a060c';
    ctx.fillRect(140, 98, LAWN_RIGHT - 120, 6); ctx.fillRect(140, 132, LAWN_RIGHT - 120, 6);
    for (let x = 146; x < LAWN_RIGHT + 20; x += 20) {
      ctx.fillRect(x, 84, 4, 70);
      ctx.beginPath(); ctx.moveTo(x - 3, 86); ctx.lineTo(x + 2, 74); ctx.lineTo(x + 7, 86); ctx.closePath(); ctx.fill();
    }
    for (let x = 300; x < LAWN_RIGHT; x += 260) { ctx.fillRect(x - 6, 70, 16, 84); circle(ctx, x + 2, 66, 9); ctx.fill(); }
    // seto oscuro
    for (let x = 130; x < LAWN_RIGHT + 30; x += 22) { circle(ctx, x, 152 + R() * 6, 18 + R() * 7); ctx.fillStyle = R() > 0.5 ? '#1a2a1a' : '#24341e'; ctx.fill(); }
    // césped sombrío
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = GRID_X + c * COL_W, y = GRID_Y + r * ROW_H;
      const light = (r + c) % 2 === 0;
      g = ctx.createLinearGradient(x, y, x, y + ROW_H);
      g.addColorStop(0, light ? '#5a7a46' : '#4a6a3a'); g.addColorStop(1, light ? '#4a6a3a' : '#3c5a30');
      ctx.fillStyle = g; ctx.fillRect(x, y, COL_W + 0.5, ROW_H + 0.5);
    }
    for (let i = 0; i < 2600; i++) {
      const x = GRID_X + R() * COLS * COL_W, y = GRID_Y + R() * ROWS * ROW_H;
      ctx.strokeStyle = R() > 0.5 ? 'rgba(20,40,15,0.55)' : 'rgba(150,180,120,0.3)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (R() - 0.5) * 6, y - 5 - R() * 6); ctx.stroke();
    }
    // flores y detalles macabros: rosas negras, huesos, velas
    for (let i = 0; i < 26; i++) {
      const x = GRID_X + R() * COLS * COL_W, y = GRID_Y + R() * ROWS * ROW_H, k = R();
      if (k < 0.45) { ctx.fillStyle = R() > 0.5 ? '#8a0a1a' : '#2a0a2a'; for (let j = 0; j < 5; j++) { const a = j / 5 * TAU; circle(ctx, x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.6); ctx.fill(); } ctx.fillStyle = '#100006'; circle(ctx, x, y, 1.8); ctx.fill(); }
      else if (k < 0.75) { ctx.strokeStyle = '#d8d0b8'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y - 2); ctx.stroke(); }
      else { ctx.fillStyle = '#e8e0c8'; ctx.fillRect(x - 3, y - 12, 6, 12); ctx.fillStyle = 'rgba(255,200,90,0.9)'; ell(ctx, x, y - 16, 2.5, 4); ctx.fill(); }
    }
    // casa de piedra oscura
    g = ctx.createLinearGradient(0, 0, 150, 0); g.addColorStop(0, '#2a2430'); g.addColorStop(1, '#4a4250');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 150, H);
    for (let y = 0; y < H; y += 30) for (let x = ((y / 30) % 2) * 25; x < 150; x += 50) { ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(x, y, 50, 30); }
    // vidriera
    ctx.beginPath(); ctx.moveTo(20, 360); ctx.lineTo(20, 270); ctx.quadraticCurveTo(70, 200, 120, 270); ctx.lineTo(120, 360); ctx.closePath();
    ctx.fillStyle = '#1a0a14'; ctx.fill();
    ctx.save(); ctx.clip();
    const cols = ['#a8102a', '#3a2aa8', '#d8a020', '#2a8a4a', '#8a2aa8'];
    for (let i = 0; i < 18; i++) { ctx.fillStyle = cols[i % 5]; ctx.globalAlpha = 0.85; ctx.fillRect(24 + (i % 3) * 32, 220 + Math.floor(i / 3) * 24, 30, 22); }
    ctx.restore();
    ctx.strokeStyle = '#0a0408'; ctx.lineWidth = 4; ctx.stroke();
    const wg = ctx.createRadialGradient(70, 300, 10, 70, 300, 170); wg.addColorStop(0, 'rgba(255,120,80,0.3)'); wg.addColorStop(1, 'rgba(255,120,80,0)');
    ctx.fillStyle = wg; ctx.fillRect(0, 130, 260, 340);
    // puerta de madera con herrajes
    ctx.beginPath(); ctx.moveTo(30, 710); ctx.lineTo(30, 560); ctx.quadraticCurveTo(75, 500, 120, 560); ctx.lineTo(120, 710); ctx.closePath();
    ctx.fillStyle = '#3a1a10'; ctx.fill(); ctx.strokeStyle = '#0a0404'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(30, 590, 90, 6); ctx.fillRect(30, 660, 90, 6); circle(ctx, 106, 630, 6); ctx.fill();
    // porche de piedra
    g = ctx.createLinearGradient(150, 0, GRID_X, 0); g.addColorStop(0, '#3a3440'); g.addColorStop(1, '#2a2430');
    ctx.fillStyle = g; ctx.fillRect(150, 150, GRID_X - 150, H - 150);
    for (let y = 150; y < H; y += 34) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(150, y, GRID_X - 150, 2.5); }
    // acera y calle empedrada
    ctx.fillStyle = '#4a4450'; ctx.fillRect(LAWN_RIGHT, 0, 60, H);
    ctx.fillStyle = '#2a2430'; ctx.fillRect(LAWN_RIGHT + 56, 0, 8, H);
    ctx.fillStyle = '#1e1a22'; ctx.fillRect(LAWN_RIGHT + 64, 0, W - LAWN_RIGHT - 64, H);
    for (let y = 0; y < H; y += 22) for (let x = LAWN_RIGHT + 64 + ((y / 22) % 2) * 14; x < W; x += 28) { rrect(ctx, x, y, 26, 20, 6); ctx.fillStyle = R() > 0.5 ? '#2c2832' : '#26222c'; ctx.fill(); }
    // farolas góticas
    for (const ly of [230, 690]) {
      ctx.fillStyle = '#0a060c'; ctx.fillRect(LAWN_RIGHT + 27, ly - 110, 6, 110);
      ctx.beginPath(); ctx.moveTo(LAWN_RIGHT + 16, ly - 110); ctx.lineTo(LAWN_RIGHT + 44, ly - 110); ctx.lineTo(LAWN_RIGHT + 38, ly - 136); ctx.lineTo(LAWN_RIGHT + 22, ly - 136); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffb860'; ctx.fillRect(LAWN_RIGHT + 24, ly - 132, 12, 18);
    }
    for (let x = 130; x < LAWN_RIGHT + 30; x += 22) { circle(ctx, x, H + 4, 16); ctx.fillStyle = '#1a2a1a'; ctx.fill(); }
  }
  const baseBg = Art.background;
  Art.background = function (ctx, stage) { if (stage === 'gothic') return gothicBackground(ctx); return baseBg(ctx, stage); };

  // Lápida gótica (con cruz y musgo)
  const baseTomb = Art.tomb;
  Art.tomb = function (ctx, x, y, frac, style) {
    if (style !== 'gothic') return baseTomb(ctx, x, y, frac);
    Art.shadow(ctx, x, y + 2, 40, 9);
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-26, -66); ctx.quadraticCurveTo(-26, -90, 0, -92); ctx.quadraticCurveTo(26, -90, 26, -66); ctx.lineTo(26, 0); ctx.closePath();
    fs(ctx, lg(ctx, -26, 0, 26, 0, '#9a96a2', '#5a5664', '#2e2a36'), '#0a080e', 3);
    // cruz tallada
    ctx.fillStyle = 'rgba(20,16,26,0.7)'; ctx.fillRect(-3, -76, 6, 30); ctx.fillRect(-12, -66, 24, 6);
    ctx.font = 'bold 13px Georgia'; ctx.textAlign = 'center'; ctx.fillText('R.I.P.', 0, -28);
    // musgo
    ctx.fillStyle = 'rgba(70,110,50,0.75)'; for (let i = 0; i < 8; i++) { circle(ctx, -24 + i * 3, -6 - (i % 3) * 3, 4); ctx.fill(); }
    ctx.strokeStyle = '#0a080e'; ctx.lineWidth = 2;
    if (frac < 0.66) { ctx.beginPath(); ctx.moveTo(-26, -50); ctx.lineTo(-12, -40); ctx.lineTo(-16, -24); ctx.stroke(); }
    if (frac < 0.33) { ctx.beginPath(); ctx.moveTo(26, -80); ctx.lineTo(10, -62); ctx.lineTo(16, -46); ctx.stroke(); }
    Art.highlight(ctx, -16, -60, 3, 18, 0, 0.3);
    ctx.restore();
  };

  // Ambiente: murciélagos y ascuas
  const baseAmb = Art.ambient;
  Art.ambient = function (ctx, a, t) {
    if (a.kind === 'bat') {
      const f = Math.sin(t * 16 + a.seed);
      ctx.save(); ctx.translate(a.x, a.y); ctx.scale(a.vx < 0 ? -1 : 1, 1);
      ctx.fillStyle = '#0a040c';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-8, -10 * f, -18, -4 * f); ctx.quadraticCurveTo(-10, 0, -14, 4); ctx.quadraticCurveTo(-6, 2, 0, 4);
      ctx.quadraticCurveTo(6, 2, 14, 4); ctx.quadraticCurveTo(10, 0, 18, -4 * f); ctx.quadraticCurveTo(8, -10 * f, 0, 0); ctx.fill();
      ell(ctx, 0, 1, 4, 5); ctx.fill();
      ctx.fillStyle = '#ff3030'; circle(ctx, -1.5, 0, 0.9); ctx.fill(); circle(ctx, 1.5, 0, 0.9); ctx.fill();
      ctx.restore(); return;
    }
    if (a.kind === 'mote') {
      const b = 0.4 + 0.6 * Math.max(0, Math.sin(t * 1.5 + a.seed));
      glow(ctx, a.x, a.y, 10, '255,245,200', 0.5 * b);
      ctx.fillStyle = `rgba(255,255,240,${0.8 * b})`; ctx.beginPath();
      ctx.moveTo(a.x, a.y - 4); ctx.lineTo(a.x + 1, a.y - 1); ctx.lineTo(a.x + 4, a.y); ctx.lineTo(a.x + 1, a.y + 1); ctx.lineTo(a.x, a.y + 4); ctx.lineTo(a.x - 1, a.y + 1); ctx.lineTo(a.x - 4, a.y); ctx.lineTo(a.x - 1, a.y - 1); ctx.closePath(); ctx.fill();
      return;
    }
    if (a.kind === 'ember') {
      const b = 0.5 + 0.5 * Math.sin(t * 5 + a.seed);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, a.x, a.y, 8, '255,90,40', 0.6 * b); ctx.restore(); return;
    }
    return baseAmb(ctx, a, t);
  };
  Object.assign(Art, { heart, glow, blackFlame });
})();

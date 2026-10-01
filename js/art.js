'use strict';
// =====================================================================
//  Arte vectorial HD: todo se dibuja con Canvas 2D a la resolución real
//  de la pantalla, así que se ve nítido a cualquier tamaño.
// =====================================================================
const Art = (() => {
  const TAU = Math.PI * 2;
  const OUT = '#1d3310';     // contorno de plantas
  const ZOUT = '#26221d';    // contorno de zombis

  // ---------- Tintes (congelado, golpe, quemado) ----------
  const rgbCache = {};
  function rgb(hex) {
    let c = rgbCache[hex];
    if (c) return c;
    let h = hex.slice(1);
    if (h.length === 3) h = h.split('').map(x => x + x).join('');
    c = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    rgbCache[hex] = c;
    return c;
  }
  let tint = null, tintA = 0;
  function setTint(col, a) { tint = col; tintA = a || 0; }
  function C(hex) {
    if (!tintA) return hex;
    const c = rgb(hex);
    return `rgb(${Math.round(c[0] + (tint[0] - c[0]) * tintA)},${Math.round(c[1] + (tint[1] - c[1]) * tintA)},${Math.round(c[2] + (tint[2] - c[2]) * tintA)})`;
  }

  // ---------- Utilidades ----------
  function rg(ctx, x, y, r, c1, c2, ox = -0.35, oy = -0.4) {
    const g = ctx.createRadialGradient(x + r * ox, y + r * oy, r * 0.05, x, y, r * 1.05);
    g.addColorStop(0, C(c1)); g.addColorStop(1, C(c2));
    return g;
  }
  function lg(ctx, x1, y1, x2, y2, ...cols) {
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), C(c)));
    return g;
  }
  function fs(ctx, fill, stroke = OUT, lw = 3) {
    ctx.fillStyle = typeof fill === 'string' && fill[0] === '#' ? C(fill) : fill; ctx.fill();
    if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = C(stroke); ctx.stroke(); }
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
  function ell(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function shadow(ctx, x, y, rx, ry, a = 0.28) {
    ctx.save(); ctx.globalAlpha *= a; ell(ctx, x, y, rx, ry); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
  }
  function line(ctx, pts, w, col, outline = OUT, ow = 3) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    if (pts.length === 4) ctx.lineTo(pts[2], pts[3]);
    else if (pts.length === 6) ctx.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]);
    else ctx.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]);
    if (outline) { ctx.strokeStyle = C(outline); ctx.lineWidth = w + ow * 2; ctx.stroke(); }
    ctx.strokeStyle = typeof col === 'string' ? C(col) : col; ctx.lineWidth = w; ctx.stroke();
  }
  function leaf(ctx, x, y, ang, len, wid, c1 = '#7fd04a', c2 = '#2f7d1a') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.45, -wid * 1.3, len, 0);
    ctx.quadraticCurveTo(len * 0.5, wid * 1.1, 0, 0);
    fs(ctx, lg(ctx, 0, -wid, 0, wid, c1, c2), OUT, 2.5);
    ctx.beginPath(); ctx.moveTo(len * 0.1, 0); ctx.quadraticCurveTo(len * 0.5, -wid * 0.15, len * 0.85, 0);
    ctx.strokeStyle = 'rgba(20,60,10,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }
  function eye(ctx, x, y, rx, ry, px, py, pr) {
    ell(ctx, x, y, rx, ry); fs(ctx, '#fff', '#111', 2);
    circle(ctx, px, py, pr); ctx.fillStyle = '#111'; ctx.fill();
    circle(ctx, px - pr * 0.35, py - pr * 0.4, pr * 0.35); ctx.fillStyle = '#fff'; ctx.fill();
  }
  function highlight(ctx, x, y, rx, ry, rot = -0.5, a = 0.35) {
    ctx.save(); ctx.globalAlpha *= a; ell(ctx, x, y, rx, ry, rot); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
  }

  // ---------- Paletas ----------
  const PAL = {
    green:  { light: '#c4f27a', mid: '#69c22f', dark: '#2f8417', leaf1: '#7fd04a', leaf2: '#2f7d1a' },
    dark:   { light: '#a6e05e', mid: '#4ea323', dark: '#1f6410', leaf1: '#6cc23c', leaf2: '#205f12' },
    ice:    { light: '#e8fbff', mid: '#7fd3f5', dark: '#2f86c2', leaf1: '#9fe3ff', leaf2: '#2b78b5' },
  };

  // ---------- Cabeza de lanzaguisantes ----------
  function peaHead(ctx, x, y, r, p, recoil, angry, ice, t) {
    ctx.save(); ctx.translate(x - recoil * 7, y);
    if (!ice) {
      leaf(ctx, -r * 0.75, -r * 0.55, Math.PI + 0.6, r * 0.9, r * 0.28, p.leaf1, p.leaf2);
      if (angry) leaf(ctx, -r * 0.85, -r * 0.1, Math.PI + 0.15, r * 0.95, r * 0.28, p.leaf1, p.leaf2);
    } else {
      // cristales de hielo
      for (let i = 0; i < 4; i++) {
        const a = -2.4 + i * 0.42;
        ctx.save(); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(r * 0.8, -6); ctx.lineTo(r * 1.45, 0); ctx.lineTo(r * 0.8, 6); ctx.closePath();
        fs(ctx, lg(ctx, r * 0.8, 0, r * 1.45, 0, '#ffffff', '#8fd8ff'), '#1f5f8f', 2);
        ctx.restore();
      }
    }
    // hocico
    const sx = 1 + recoil * 0.12;
    ctx.save(); ctx.scale(sx, 1 + recoil * 0.1);
    rrect(ctx, r * 0.45, -r * 0.42, r * 1.0, r * 0.84, r * 0.32);
    fs(ctx, lg(ctx, 0, -r * 0.42, 0, r * 0.42, p.light, p.mid, p.dark));
    ell(ctx, r * 1.45, 0, r * 0.24 + recoil * 3, r * 0.5 + recoil * 2);
    fs(ctx, rg(ctx, r * 1.45, 0, r * 0.5, p.light, p.mid));
    ell(ctx, r * 1.48, 0, r * 0.13 + recoil * 2, r * 0.3 + recoil * 2);
    ctx.fillStyle = C('#123d08'); ctx.fill();
    ctx.restore();
    // cabeza
    circle(ctx, 0, 0, r); fs(ctx, rg(ctx, 0, 0, r, p.light, p.dark));
    highlight(ctx, -r * 0.35, -r * 0.48, r * 0.35, r * 0.2);
    // ojo
    const blink = Math.sin((t || 0) * 0.9 + x) > 0.985;
    if (blink) {
      ctx.beginPath(); ctx.moveTo(r * 0.05, -r * 0.22); ctx.lineTo(r * 0.5, -r * 0.22);
      ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.stroke();
    } else {
      eye(ctx, r * 0.28, -r * 0.22, r * 0.24, r * 0.3, r * 0.36, -r * 0.2, r * 0.14);
    }
    if (angry) {
      ctx.beginPath(); ctx.moveTo(r * 0.0, -r * 0.62); ctx.lineTo(r * 0.58, -r * 0.42);
      ctx.strokeStyle = C('#123d08'); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
    }
    if (ice) {
      ctx.save(); ctx.globalAlpha *= 0.6;
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) { circle(ctx, -r * 0.5 + i * 8, r * 0.4 - i * 4, 2.5); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------- Plantas ----------
  function peashooter(ctx, t, s, variant) {
    const p = variant === 'snow' ? PAL.ice : variant === 'repeater' ? PAL.dark : PAL.green;
    const bob = Math.sin(t * 2.6 + (s.seed || 0)) * 2.5;
    leaf(ctx, -3, -3, Math.PI + 0.3, 36, 11, p.leaf1, p.leaf2);
    leaf(ctx, 3, -3, -0.3, 36, 11, p.leaf1, p.leaf2);
    line(ctx, [0, 0, -12, -26, 0, -50 + bob], 9, lg(ctx, -6, 0, 6, 0, p.mid, p.dark));
    peaHead(ctx, 3, -64 + bob, 27, p, s.recoil || 0, variant === 'repeater', variant === 'snow', t);
  }
  function threepeater(ctx, t, s) {
    const p = PAL.green;
    const bob = Math.sin(t * 2.6 + (s.seed || 0)) * 2;
    leaf(ctx, -3, -3, Math.PI + 0.3, 34, 11); leaf(ctx, 3, -3, -0.3, 34, 11);
    line(ctx, [0, 0, -10, -30, -16, -58 + bob], 8, p.mid);
    line(ctx, [0, -20, 14, -40, 20, -60 + bob], 8, p.mid);
    line(ctx, [-4, -30, 0, -70, 2, -92 + bob], 8, p.mid);
    peaHead(ctx, 2, -100 + bob * 1.2, 20, p, s.recoil || 0, false, false, t);
    peaHead(ctx, -18, -64 + bob, 20, p, s.recoil || 0, false, false, t + 3);
    peaHead(ctx, 22, -60 + bob, 20, p, s.recoil || 0, false, false, t + 7);
  }

  function sunflower(ctx, t, s) {
    const sway = Math.sin(t * 1.8 + (s.seed || 0)) * 0.07;
    leaf(ctx, -3, -4, Math.PI + 0.35, 34, 11); leaf(ctx, 3, -4, -0.35, 34, 11);
    line(ctx, [0, 0, 8, -30, 0, -56], 8, lg(ctx, -5, 0, 5, 0, '#6cc23c', '#2f7d1a'));
    ctx.save(); ctx.translate(0, -70); ctx.rotate(sway);
    const glow = s.glow || 0;
    if (glow > 0) {
      const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 70);
      g.addColorStop(0, `rgba(255,240,120,${0.8 * glow})`); g.addColorStop(1, 'rgba(255,240,120,0)');
      ctx.fillStyle = g; circle(ctx, 0, 0, 70); ctx.fill();
    }
    for (let ring = 0; ring < 2; ring++) {
      const n = 14, rad = ring ? 26 : 31, rx = ring ? 13 : 15, ry = ring ? 7 : 8;
      for (let i = 0; i < n; i++) {
        const a = (i + ring * 0.5) / n * TAU + t * 0.15 * (ring ? 1 : -1) * 0;
        ctx.save(); ctx.rotate(a); ctx.translate(rad, 0);
        ell(ctx, 0, 0, rx, ry);
        fs(ctx, ring ? lg(ctx, -rx, 0, rx, 0, '#ffe76a', '#ffc21a') : lg(ctx, -rx, 0, rx, 0, '#ffd21f', '#f39a00'), '#9c6200', 2);
        ctx.restore();
      }
    }
    circle(ctx, 0, 0, 23); fs(ctx, rg(ctx, 0, 0, 23, '#b47a35', '#5a3511'), '#3b2208', 3);
    ctx.fillStyle = 'rgba(60,30,5,0.35)';
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; circle(ctx, Math.cos(a) * 17, Math.sin(a) * 17, 2); ctx.fill(); }
    // cara
    ell(ctx, -8, -5, 4, 6.5); ctx.fillStyle = '#111'; ctx.fill();
    ell(ctx, 8, -5, 4, 6.5); ctx.fill();
    ctx.fillStyle = '#fff'; circle(ctx, -9, -8, 1.6); ctx.fill(); circle(ctx, 7, -8, 1.6); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 3, 9, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,110,90,0.35)'; ell(ctx, -14, 5, 5, 3); ctx.fill(); ell(ctx, 14, 5, 5, 3); ctx.fill();
    ctx.restore();
  }

  function wallnut(ctx, t, s, tall) {
    const h = tall ? 118 : 76, w = tall ? 44 : 40;
    const dmg = s.dmg || 0;
    const sq = tall ? 1 : 1 + Math.sin(t * 1.6 + (s.seed || 0)) * 0.015;
    ctx.save(); ctx.scale(1 / sq, sq);
    ell(ctx, 0, -h / 2, w, h / 2);
    fs(ctx, rg(ctx, 0, -h / 2, Math.max(w, h / 2), '#f0c27a', '#8a5420', -0.3, -0.3), '#4a2a0c', 3.5);
    // textura de cáscara
    ctx.strokeStyle = C('#a8702e'); ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.ellipse(-w * 0.45 + i * 6, -h * 0.25 - i * h * 0.15, w * 0.25, h * 0.05, -0.4, 0, Math.PI);
      ctx.stroke();
    }
    highlight(ctx, -w * 0.4, -h * 0.75, w * 0.22, h * 0.12, -0.4, 0.3);
    // cara (mirando a la derecha)
    const look = Math.sin(t * 0.7 + (s.seed || 0)) * 2;
    const ey = -h * (tall ? 0.7 : 0.6);
    eye(ctx, w * 0.05, ey, 8, 10, w * 0.05 + 3 + look, ey + 1, 4.5);
    eye(ctx, w * 0.5, ey, 7, 9.5, w * 0.5 + 2 + look, ey + 1, 4.2);
    if (tall || dmg > 0) {
      ctx.strokeStyle = '#3b2208'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath();
      if (dmg > 1) { ctx.moveTo(-6, ey - 14); ctx.lineTo(8, ey - 18); ctx.moveTo(w * 0.38, ey - 18); ctx.lineTo(w * 0.62, ey - 13); }
      else { ctx.moveTo(-6, ey - 16); ctx.lineTo(8, ey - 14); ctx.moveTo(w * 0.38, ey - 14); ctx.lineTo(w * 0.62, ey - 16); }
      ctx.stroke();
    }
    if (dmg > 0) {
      ctx.strokeStyle = C('#3b2208'); ctx.lineWidth = 2.5; ctx.lineJoin = 'miter';
      ctx.beginPath();
      ctx.moveTo(-w * 0.85, -h * 0.55); ctx.lineTo(-w * 0.55, -h * 0.5); ctx.lineTo(-w * 0.6, -h * 0.4); ctx.lineTo(-w * 0.3, -h * 0.33);
      ctx.moveTo(w * 0.2, -h * 0.98); ctx.lineTo(w * 0.1, -h * 0.85); ctx.lineTo(w * 0.25, -h * 0.8);
      if (dmg > 1) {
        ctx.moveTo(w * 0.9, -h * 0.4); ctx.lineTo(w * 0.6, -h * 0.35); ctx.lineTo(w * 0.65, -h * 0.22); ctx.lineTo(w * 0.35, -h * 0.15);
        ctx.moveTo(-w * 0.7, -h * 0.2); ctx.lineTo(-w * 0.4, -h * 0.18); ctx.lineTo(-w * 0.3, -h * 0.05);
      }
      ctx.stroke();
    }
    // boca
    ctx.beginPath();
    if (dmg > 1) { ctx.moveTo(w * 0.05, -h * 0.38); ctx.quadraticCurveTo(w * 0.3, -h * 0.44, w * 0.5, -h * 0.37); }
    else { ctx.moveTo(w * 0.1, -h * 0.4); ctx.quadraticCurveTo(w * 0.3, -h * 0.36, w * 0.45, -h * 0.41); }
    ctx.strokeStyle = '#3b2208'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
  }

  function cherry(ctx, x, y, r, angryLeft, t) {
    circle(ctx, x, y, r); fs(ctx, rg(ctx, x, y, r, '#ff7b6b', '#9a0710'), '#4a0205', 3);
    highlight(ctx, x - r * 0.35, y - r * 0.45, r * 0.3, r * 0.17, -0.6, 0.55);
    eye(ctx, x - r * 0.3, y - r * 0.1, r * 0.2, r * 0.24, x - r * 0.25, y - r * 0.05, r * 0.12);
    eye(ctx, x + r * 0.25, y - r * 0.1, r * 0.2, r * 0.24, x + r * 0.3, y - r * 0.05, r * 0.12);
    ctx.strokeStyle = '#2a0003'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - r * 0.55, y - r * 0.45); ctx.lineTo(x - r * 0.1, y - r * 0.28);
    ctx.moveTo(x + r * 0.5, y - r * 0.45); ctx.lineTo(x + r * 0.05, y - r * 0.28); ctx.stroke();
    // boca con dientes
    ctx.beginPath(); ctx.moveTo(x - r * 0.35, y + r * 0.35); ctx.quadraticCurveTo(x, y + r * 0.2, x + r * 0.35, y + r * 0.35);
    ctx.quadraticCurveTo(x, y + r * 0.6, x - r * 0.35, y + r * 0.35);
    fs(ctx, '#2a0003', null);
    ctx.fillStyle = '#fff'; ctx.fillRect(x - r * 0.2, y + r * 0.28, r * 0.4, r * 0.08);
  }
  function cherrybomb(ctx, t, s) {
    const f = s.fuse || 0;
    const sc = 1 + f * 0.4 + (f > 0 ? Math.sin(t * 50) * 0.04 : Math.sin(t * 3) * 0.02);
    ctx.save(); ctx.scale(sc, sc);
    line(ctx, [0, -80, -10, -70, -20, -50], 4, '#4a7a1d', OUT, 2);
    line(ctx, [0, -80, 12, -66, 18, -46], 4, '#4a7a1d', OUT, 2);
    leaf(ctx, 0, -80, -0.9, 26, 9);
    cherry(ctx, -21, -28, 23, true, t);
    cherry(ctx, 19, -24, 24, false, t);
    if (f > 0) { ctx.save(); ctx.globalAlpha = f * 0.5; ctx.globalCompositeOperation = 'lighter';
      circle(ctx, -21, -28, 23); ctx.fillStyle = '#ff3010'; ctx.fill(); circle(ctx, 19, -24, 24); ctx.fill(); ctx.restore(); }
    ctx.restore();
  }

  function potatomine(ctx, t, s) {
    if (!s.armed) {
      ell(ctx, 0, -6, 36, 13); fs(ctx, rg(ctx, 0, -6, 36, '#9b6e3c', '#5a3b1a'), '#3a250f', 2.5);
      ell(ctx, 0, -12, 18, 8); fs(ctx, rg(ctx, 0, -12, 18, '#e9cb94', '#a87a3e'), '#5a3b1a', 2);
      line(ctx, [0, -18, 2, -26, 0, -32], 3, '#666', '#222', 1.5);
      circle(ctx, 0, -34, 4); fs(ctx, '#7a2a2a', '#222', 1.5);
      // tierra
      ctx.fillStyle = C('#4a3015');
      for (let i = 0; i < 6; i++) { circle(ctx, -28 + i * 11, -3 + (i % 2) * 3, 3); ctx.fill(); }
      return;
    }
    const pop = s.pop || 0;
    ctx.save(); ctx.translate(0, -pop * 10);
    line(ctx, [0, -44, 4, -56, 0, -66], 3, '#777', '#222', 1.5);
    const on = Math.sin(t * 7) > 0;
    if (on) { const g = ctx.createRadialGradient(0, -68, 2, 0, -68, 22); g.addColorStop(0, 'rgba(255,60,40,0.9)'); g.addColorStop(1, 'rgba(255,60,40,0)'); ctx.fillStyle = g; circle(ctx, 0, -68, 22); ctx.fill(); }
    circle(ctx, 0, -68, 6); fs(ctx, on ? '#ff3b2a' : '#8a1d14', '#222', 2);
    ell(ctx, 0, -24, 34, 26); fs(ctx, rg(ctx, 0, -24, 34, '#f0d6a2', '#a5763a'), '#5a3b1a', 3);
    ctx.fillStyle = C('#b88a4e'); circle(ctx, -18, -30, 2.5); ctx.fill(); circle(ctx, 20, -16, 2.5); ctx.fill(); circle(ctx, -8, -10, 2); ctx.fill();
    eye(ctx, -6, -30, 7, 8, -3, -29, 3.8); eye(ctx, 12, -30, 6, 7.5, 15, -29, 3.5);
    ctx.beginPath(); ctx.arc(4, -20, 6, 0.1 * Math.PI, 0.9 * Math.PI); ctx.strokeStyle = '#3a250f'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
    ell(ctx, 0, -3, 38, 9); fs(ctx, rg(ctx, 0, -3, 38, '#8b6234', '#4f3416'), null);
  }

  function chomper(ctx, t, s) {
    const mode = s.mode || 'idle';
    leaf(ctx, -4, -4, Math.PI + 0.25, 42, 13); leaf(ctx, 4, -4, -0.25, 42, 13);
    leaf(ctx, -2, -6, Math.PI + 0.9, 30, 10);
    const bob = Math.sin(t * 2) * 2;
    line(ctx, [0, 0, -20, -30, 0, -40, -8, -60 + bob], 9, lg(ctx, -6, 0, 6, 0, '#6cc23c', '#2f7d1a'));
    ctx.save(); ctx.translate(2, -84 + bob);
    const purple1 = '#c27be0', purple2 = '#5e1f80';
    if (mode === 'chew') {
      const ch = Math.sin(t * 6);
      ctx.save(); ctx.scale(1 + ch * 0.05, 1 - ch * 0.05);
      ell(ctx, 6, 0, 44, 34); fs(ctx, rg(ctx, 6, 0, 44, purple1, purple2), '#2d0840', 3.5);
      ctx.beginPath(); ctx.moveTo(-36, 4); ctx.quadraticCurveTo(10, 12 + ch * 3, 48, 2);
      ctx.strokeStyle = '#2d0840'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-24 + i * 14, 6); ctx.lineTo(-19 + i * 14, 14); ctx.lineTo(-14 + i * 14, 7); ctx.fill(); }
      ctx.fillStyle = C('#e2a6f5'); ctx.globalAlpha = 0.6;
      circle(ctx, -8, -16, 6); ctx.fill(); circle(ctx, 18, -20, 5); ctx.fill(); circle(ctx, 30, -6, 4); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    } else {
      let open;
      if (mode === 'bite') { const b = s.biteT || 0; open = b < 0.5 ? 0.35 + b * 1.4 : Math.max(0, 1.05 - (b - 0.5) * 6); }
      else open = 0.32 + Math.sin(t * 2.4) * 0.08;
      // mandíbula inferior
      ctx.save(); ctx.rotate(open * 0.55);
      ctx.beginPath(); ctx.moveTo(-34, 0); ctx.quadraticCurveTo(-30, 34, 10, 34); ctx.quadraticCurveTo(46, 32, 52, 0); ctx.closePath();
      fs(ctx, rg(ctx, 8, 14, 44, purple1, purple2), '#2d0840', 3.5);
      ctx.beginPath(); ctx.moveTo(-28, 0); ctx.quadraticCurveTo(10, 14, 46, 0); ctx.closePath(); ctx.fillStyle = C('#b0182e'); ctx.fill();
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-24 + i * 12, 2); ctx.lineTo(-19 + i * 12, -9); ctx.lineTo(-14 + i * 12, 3); ctx.fill(); }
      ctx.restore();
      // mandíbula superior
      ctx.save(); ctx.rotate(-open * 0.75);
      ctx.beginPath(); ctx.moveTo(-36, 0); ctx.quadraticCurveTo(-34, -46, 12, -44); ctx.quadraticCurveTo(54, -40, 58, 0); ctx.closePath();
      fs(ctx, rg(ctx, 6, -20, 50, purple1, purple2), '#2d0840', 3.5);
      ctx.beginPath(); ctx.moveTo(-30, 0); ctx.quadraticCurveTo(12, -12, 52, 0); ctx.closePath(); ctx.fillStyle = C('#8a0f22'); ctx.fill();
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-26 + i * 13, -2); ctx.lineTo(-20 + i * 13, 10); ctx.lineTo(-14 + i * 13, -2); ctx.fill(); }
      ctx.fillStyle = C('#e2a6f5'); ctx.globalAlpha = 0.65;
      circle(ctx, -8, -28, 6); ctx.fill(); circle(ctx, 18, -32, 5); ctx.fill(); circle(ctx, 36, -18, 4); ctx.fill(); circle(ctx, -22, -14, 3.5); ctx.fill();
      ctx.globalAlpha = 1;
      highlight(ctx, -12, -34, 12, 5, -0.4, 0.3);
      ctx.restore();
    }
    ctx.restore();
  }

  function squash(ctx, t, s) {
    const sq = s.squish || 0;
    ctx.save(); ctx.scale(1 + sq * 0.25, 1 - sq * 0.3);
    line(ctx, [2, -84, 8, -96, 0, -102], 6, '#6b5a1d', OUT, 2);
    ctx.beginPath(); ctx.moveTo(0, -84);
    ctx.bezierCurveTo(30, -88, 50, -60, 44, -20); ctx.quadraticCurveTo(40, 2, 0, 2);
    ctx.quadraticCurveTo(-40, 2, -44, -20); ctx.bezierCurveTo(-50, -60, -30, -88, 0, -84); ctx.closePath();
    fs(ctx, rg(ctx, 0, -40, 50, '#c9ef7d', '#3c7d1c'), '#1d3310', 3.5);
    ctx.strokeStyle = C('#4f8f26'); ctx.lineWidth = 2.5;
    for (const dx of [-24, 0, 24]) { ctx.beginPath(); ctx.moveTo(dx * 0.6, -80); ctx.quadraticCurveTo(dx * 1.2, -40, dx * 0.7, 0); ctx.stroke(); }
    highlight(ctx, -18, -62, 9, 16, 0.2, 0.3);
    eye(ctx, -8, -46, 8, 9, -4, -45, 4); eye(ctx, 16, -46, 8, 9, 20, -45, 4);
    ctx.strokeStyle = '#163008'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-18, -62); ctx.lineTo(2, -54); ctx.moveTo(26, -62); ctx.lineTo(8, -54); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, -24); ctx.quadraticCurveTo(6, -32, 18, -24); ctx.lineWidth = 3.5; ctx.stroke();
    ctx.restore();
  }

  function jalapeno(ctx, t, s) {
    const f = s.fuse || 0;
    const sh = f > 0 ? Math.sin(t * 60) * 3 : 0;
    const sc = 1 + f * 0.3;
    ctx.save(); ctx.translate(sh, 0); ctx.scale(sc, sc);
    ctx.beginPath(); ctx.moveTo(-16, -86);
    ctx.bezierCurveTo(-30, -60, -28, -20, 8, -2); ctx.quadraticCurveTo(12, 0, 10, -6);
    ctx.bezierCurveTo(0, -30, 26, -60, 16, -86); ctx.closePath();
    fs(ctx, lg(ctx, -24, 0, 24, 0, '#ff6a4e', '#d0140f', '#8c050a'), '#3d0204', 3.5);
    highlight(ctx, -12, -60, 4, 16, 0.2, 0.45);
    ctx.beginPath(); ctx.ellipse(0, -88, 20, 8, 0, 0, TAU); fs(ctx, rg(ctx, 0, -88, 20, '#8bd955', '#2f7d1a'));
    line(ctx, [0, -92, 4, -104, -4, -110], 5, '#4a8a20', OUT, 2);
    eye(ctx, -8, -64, 6, 7, -5, -63, 3.2); eye(ctx, 8, -64, 6, 7, 11, -63, 3.2);
    ctx.strokeStyle = '#2a0003'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-15, -76); ctx.lineTo(-2, -70); ctx.moveTo(15, -76); ctx.lineTo(4, -70); ctx.stroke();
    rrect(ctx, -9, -52, 18, 8, 3); fs(ctx, '#fff', '#2a0003', 2);
    ctx.beginPath(); ctx.moveTo(-3, -52); ctx.lineTo(-3, -44); ctx.moveTo(3, -52); ctx.lineTo(3, -44); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }

  // Dibuja una planta con origen en el centro del suelo
  function plant(ctx, type, t, s = {}) {
    switch (type) {
      case 'peashooter': return peashooter(ctx, t, s, 'pea');
      case 'snowpea': return peashooter(ctx, t, s, 'snow');
      case 'repeater': return peashooter(ctx, t, s, 'repeater');
      case 'threepeater': return threepeater(ctx, t, s);
      case 'sunflower': return sunflower(ctx, t, s);
      case 'wallnut': return wallnut(ctx, t, s, false);
      case 'tallnut': return wallnut(ctx, t, s, true);
      case 'cherrybomb': return cherrybomb(ctx, t, s);
      case 'potatomine': return potatomine(ctx, t, s);
      case 'chomper': return chomper(ctx, t, s);
      case 'squash': return squash(ctx, t, s);
      case 'jalapeno': return jalapeno(ctx, t, s);
    }
  }

  // ---------- Zombis ----------
  const Z = {
    skin1: '#b9c79c', skin2: '#7d8c62', coat1: '#7b5a3a', coat2: '#4a321d',
    pants1: '#5d5f78', pants2: '#3a3c52', shoe: '#2b1d12',
  };
  function zLeg(ctx, hx, hy, ang, pants, shoe, knee = 0) {
    const kx = hx + Math.sin(ang) * 30, ky = hy + Math.cos(ang) * 30;
    const a2 = ang - Math.abs(knee) * 0.6 - 0.05;
    const fx = kx + Math.sin(a2) * 30, fy = ky + Math.cos(a2) * 30;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy);
    ctx.strokeStyle = C(ZOUT); ctx.lineWidth = 19; ctx.stroke();
    ctx.strokeStyle = C(pants); ctx.lineWidth = 14; ctx.stroke();
    ell(ctx, fx - 7, fy + 2, 14, 6.5); fs(ctx, C(shoe), ZOUT, 2.5);
  }
  function zArm(ctx, sx, sy, ex, ey, hx, hy, sleeve, lost) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (lost) {
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (ex - sx) * 0.55, sy + (ey - sy) * 0.55);
      ctx.strokeStyle = C(ZOUT); ctx.lineWidth = 17; ctx.stroke();
      ctx.strokeStyle = C(sleeve); ctx.lineWidth = 12; ctx.stroke();
      circle(ctx, sx + (ex - sx) * 0.6, sy + (ey - sy) * 0.6, 4); ctx.fillStyle = C('#8a2a20'); ctx.fill();
      return;
    }
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
    ctx.strokeStyle = C(ZOUT); ctx.lineWidth = 17; ctx.stroke();
    ctx.strokeStyle = C(sleeve); ctx.lineWidth = 12; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(hx, hy);
    ctx.strokeStyle = C(ZOUT); ctx.lineWidth = 11; ctx.stroke();
    ctx.strokeStyle = C(Z.skin2); ctx.lineWidth = 7; ctx.stroke();
    // mano
    circle(ctx, hx, hy, 7); fs(ctx, C(Z.skin1), ZOUT, 2.5);
    ctx.strokeStyle = C(ZOUT); ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(hx - 4, hy + i * 3); ctx.lineTo(hx - 11, hy + i * 4 + 1); ctx.stroke(); }
  }

  function zHead(ctx, z, chomp) {
    const angry = z.type === 'paper' && z.enraged;
    // cuello
    ctx.beginPath(); ctx.moveTo(-2, 14); ctx.lineTo(4, 26);
    ctx.strokeStyle = C(ZOUT); ctx.lineWidth = 14; ctx.stroke(); ctx.strokeStyle = C(Z.skin2); ctx.lineWidth = 9; ctx.stroke();
    // oreja trasera
    ell(ctx, 18, 0, 6, 9); fs(ctx, C(Z.skin2), ZOUT, 2.5);
    // cráneo
    ctx.beginPath();
    ctx.moveTo(-24, -6); ctx.bezierCurveTo(-26, -34, 22, -36, 24, -8);
    ctx.bezierCurveTo(26, 10, 14, 20, 0, 22 + chomp * 4);
    ctx.bezierCurveTo(-16, 22 + chomp * 4, -26, 14, -24, -6); ctx.closePath();
    fs(ctx, rg(ctx, -4, -6, 30, Z.skin1, Z.skin2), ZOUT, 3);
    // arrugas
    ctx.strokeStyle = C('#6a7852'); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-14, -22); ctx.quadraticCurveTo(-4, -25, 6, -22); ctx.moveTo(-10, -17); ctx.quadraticCurveTo(-2, -19, 4, -17); ctx.stroke();
    // pelo
    if (z.type !== 'football') {
      ctx.strokeStyle = C('#3a2f22'); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(6, -28); ctx.quadraticCurveTo(12, -40, 4, -42); ctx.moveTo(10, -27); ctx.quadraticCurveTo(20, -36, 16, -42); ctx.stroke();
    }
    // ojos
    const ec = angry ? '#ff5a3a' : '#fff';
    circle(ctx, -14, -8, 8.5); fs(ctx, C(ec), ZOUT, 2);
    circle(ctx, -16, -7, 2.3); ctx.fillStyle = '#111'; ctx.fill();
    circle(ctx, 2, -8, 6.5); fs(ctx, C(ec), ZOUT, 2);
    circle(ctx, 0, -7, 2); ctx.fillStyle = '#111'; ctx.fill();
    ctx.strokeStyle = C('#5a6644'); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-14, -8, 11, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
    if (angry) { ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-24, -20); ctx.lineTo(-8, -15); ctx.moveTo(8, -18); ctx.lineTo(-3, -15); ctx.stroke(); }
    // gafas lector
    if (z.type === 'paper') {
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5;
      circle(ctx, -14, -8, 10); ctx.stroke(); circle(ctx, 2, -8, 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, -9); ctx.lineTo(-6, -9); ctx.moveTo(10, -9); ctx.lineTo(18, -6); ctx.stroke();
    }
    // nariz
    ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(-11, 5); ctx.lineTo(-6, 6); ctx.strokeStyle = C('#5a6644'); ctx.lineWidth = 2; ctx.stroke();
    // boca
    ctx.beginPath(); ctx.moveTo(-18, 10); ctx.quadraticCurveTo(-6, 13 + chomp * 7, 6, 9);
    ctx.quadraticCurveTo(-6, 16 + chomp * 9, -18, 10); ctx.closePath();
    ctx.fillStyle = C('#3a1410'); ctx.fill();
    ctx.fillStyle = C('#e8dfa8');
    ctx.fillRect(-14, 10, 4, 4); ctx.fillRect(-7, 11, 4, 5); ctx.fillRect(0, 10, 3, 3);
  }

  function zArmor(ctx, z) {
    if (z.armor <= 0) return;
    const frac = z.armor / z.armorMax;
    if (z.type === 'cone') {
      ctx.save(); ctx.translate(0, -22); ctx.rotate(-0.12);
      ctx.beginPath(); ctx.moveTo(-26, 0);
      if (frac < 0.34) { ctx.lineTo(-12, -30); ctx.lineTo(-4, -26); ctx.lineTo(4, -34); ctx.lineTo(12, -28); }
      else if (frac < 0.67) { ctx.lineTo(-6, -46); ctx.lineTo(2, -40); ctx.lineTo(8, -46); }
      else ctx.lineTo(-2, -60);
      ctx.lineTo(26, 0); ctx.closePath();
      fs(ctx, lg(ctx, -26, 0, 26, 0, '#ffb04a', '#f2701c', '#b84a0a'), '#5a2400', 3);
      ctx.save(); ctx.clip();
      ctx.fillStyle = C('#fff4e0'); ctx.fillRect(-30, -24, 60, 8);
      ctx.restore();
      ell(ctx, 0, 0, 30, 6); fs(ctx, lg(ctx, -30, 0, 30, 0, '#ff9a3a', '#c4550e'), '#5a2400', 3);
      ctx.restore();
    } else if (z.type === 'bucket') {
      ctx.save(); ctx.translate(0, -22); ctx.rotate(-0.1);
      ctx.beginPath(); ctx.moveTo(-27, 2); ctx.lineTo(-22, -38); ctx.lineTo(22, -38); ctx.lineTo(27, 2); ctx.closePath();
      fs(ctx, lg(ctx, -27, 0, 27, 0, '#e9eef2', '#9aa6ae', '#5d6870'), '#2a3035', 3);
      ell(ctx, 0, -38, 22, 5); fs(ctx, '#7d8890', '#2a3035', 2.5);
      ctx.strokeStyle = C('#4a5258'); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-25, -8); ctx.lineTo(25, -8); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -10, 30, Math.PI * 1.05, Math.PI * 1.95); ctx.lineWidth = 2.5; ctx.stroke();
      if (frac < 0.67) { ctx.fillStyle = 'rgba(40,40,40,0.5)'; ell(ctx, -10, -22, 7, 5); ctx.fill(); }
      if (frac < 0.34) { ell(ctx, 10, -12, 8, 6); ctx.fill(); ctx.beginPath(); ctx.moveTo(-20, -38); ctx.lineTo(-14, -30); ctx.lineTo(-8, -38); ctx.fill(); }
      highlight(ctx, -12, -24, 4, 12, 0.1, 0.5);
      ctx.restore();
    } else if (z.type === 'football') {
      ctx.save(); ctx.translate(0, -4);
      ctx.beginPath(); ctx.arc(0, -6, 30, Math.PI * 0.95, Math.PI * 2.08); ctx.closePath();
      fs(ctx, rg(ctx, -6, -18, 34, '#ff6a5a', '#9e0f12'), '#3a0507', 3);
      ctx.fillStyle = C('#fff'); ctx.fillRect(-4, -36, 7, 30);
      if (frac < 0.5) { ctx.fillStyle = 'rgba(30,0,0,0.45)'; ell(ctx, 12, -18, 7, 5); ctx.fill(); }
      // rejilla
      ctx.strokeStyle = C('#ddd'); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-28, 0); ctx.quadraticCurveTo(-34, 12, -18, 22); ctx.moveTo(-28, 8); ctx.lineTo(-6, 10); ctx.moveTo(-26, 16); ctx.lineTo(-8, 18); ctx.stroke();
      highlight(ctx, -12, -24, 10, 5, -0.3, 0.45);
      ctx.restore();
    }
  }

  // z: {type, animT, state, armor, armorMax, lostArm, headless, hasPole, jumpT, paper, enraged}
  function zombie(ctx, z, t) {
    const a = z.animT;
    const walking = z.state === 'walk' || z.state === 'enter';
    const eating = z.state === 'eat';
    const fast = z.type === 'pole' && z.hasPole || z.type === 'football' || z.enraged;
    const ph = a * (fast ? 7 : 4.2);
    const sw = walking ? Math.sin(ph) : eating ? 0.1 : 0;
    const bob = walking ? Math.abs(Math.cos(ph)) * 3.5 : eating ? Math.abs(Math.sin(a * 10)) * 2 : 0;
    const chomp = eating ? Math.max(0, Math.sin(a * 10)) : 0;
    let coat1 = Z.coat1, coat2 = Z.coat2, pants = Z.pants1, sleeve = Z.coat1;
    if (z.type === 'pole') { coat1 = '#e8e8e8'; coat2 = '#a8a8a8'; pants = '#c8322a'; sleeve = '#b9c79c'; }
    if (z.type === 'football') { coat1 = '#c4161c'; coat2 = '#6a0a0d'; pants = '#e6e6e6'; sleeve = '#c4161c'; }
    if (z.type === 'paper') { coat1 = '#8a8a78'; coat2 = '#55554a'; pants = '#6b5a42'; sleeve = '#8a8a78'; }
    const lean = z.type === 'football' ? -0.28 : -0.1;

    ctx.save();
    ctx.translate(0, -bob);

    // poste del saltador (llevado al correr)
    if (z.type === 'pole' && z.hasPole && z.state !== 'jump') {
      line(ctx, [-70, -86, 110, -70], 5, '#c8a050', '#4a3510', 2);
    }
    // brazo trasero
    const bArmSwing = walking ? -sw * 0.25 : 0;
    let bx = -44, by = -92 + bArmSwing * 30;
    if (eating) { bx = -48; by = -106 + Math.sin(a * 10 + 1) * 6; }
    if (z.type === 'flag') { bx = -20; by = -118; }
    if (z.type === 'paper' && z.armor > 0) { bx = -50; by = -98; }
    zArm(ctx, 4, -112, (bx + 4) / 2 + 2, (by - 112) / 2 + 6, bx, by, coat2, false);
    if (z.type === 'flag') {
      line(ctx, [-20, -40, -20, -205], 4, '#6b4a2a', ZOUT, 2);
      ctx.save(); ctx.translate(-20, -205);
      const wave = Math.sin(t * 5) * 4;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-25, -6 + wave, -52, 2); ctx.lineTo(-52, 40);
      ctx.quadraticCurveTo(-25, 34 - wave, 0, 40); ctx.closePath();
      fs(ctx, lg(ctx, 0, 0, -52, 40, '#f4efe0', '#c9c0a8'), ZOUT, 2.5);
      ctx.save(); ctx.clip();
      ctx.fillStyle = C('#b0201a'); ctx.fillRect(-60, 8, 70, 6); ctx.fillRect(-60, 26, 70, 6);
      ctx.restore();
      ell(ctx, -26, 20, 11, 8); fs(ctx, '#f0a0b0', '#7a2a3a', 2);
      ctx.beginPath(); ctx.moveTo(-26, 13); ctx.lineTo(-26, 27); ctx.stroke();
      ctx.restore();
    }
    // piernas
    zLeg(ctx, 6, -62, -sw * 0.5, Z.pants2 === pants ? pants : shade(pants), Z.shoe, sw);
    zLeg(ctx, -4, -62, sw * 0.5, pants, Z.shoe, -sw);

    // torso
    ctx.save(); ctx.translate(0, -62); ctx.rotate(lean);
    ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-24, -52); ctx.quadraticCurveTo(0, -62, 22, -52); ctx.lineTo(20, 0); ctx.quadraticCurveTo(0, 5, -20, 0); ctx.closePath();
    fs(ctx, lg(ctx, -24, 0, 22, 0, coat1, coat2), ZOUT, 3);
    if (z.type === 'pole') {
      ctx.fillStyle = C('#c8322a'); ctx.fillRect(-22, -36, 42, 7);
      ctx.fillStyle = C('#222'); ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.fillText('7', 0, -12);
    } else if (z.type === 'football') {
      ctx.fillStyle = C('#fff'); ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.fillText('99', 0, -16);
      // hombreras
      if (z.armor > 0) { ell(ctx, 0, -52, 30, 12); fs(ctx, rg(ctx, 0, -52, 30, '#ff5a4a', '#8a0a0e'), '#3a0507', 3); }
    } else {
      ctx.beginPath(); ctx.moveTo(-10, -55); ctx.lineTo(2, -28); ctx.lineTo(12, -54); ctx.closePath();
      fs(ctx, C('#ecebe0'), ZOUT, 2);
      ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(-4, -30); ctx.lineTo(2, -24); ctx.lineTo(6, -32); ctx.lineTo(4, -50); ctx.closePath();
      fs(ctx, C('#c0261c'), '#4a0a05', 1.5);
      // remiendo
      ctx.fillStyle = C('#5c4a6a'); ctx.fillRect(8, -20, 9, 9);
      ctx.strokeStyle = C('#d8cfa8'); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(8, -16); ctx.lineTo(17, -16); ctx.stroke();
    }
    // cabeza
    if (!z.headless) {
      ctx.save(); ctx.translate(-10, -76 + (eating ? Math.sin(a * 10) * 2 : 0)); ctx.rotate(eating ? 0.08 : Math.sin(a * 2) * 0.04);
      zHead(ctx, z, chomp);
      zArmor(ctx, z);
      ctx.restore();
    }
    ctx.restore();

    // periódico
    if (z.type === 'paper' && z.armor > 0) {
      const fr = z.armor / z.armorMax;
      ctx.save(); ctx.translate(-52, -100); ctx.rotate(-0.08);
      rrect(ctx, -10, -34, 34, 62, 3); fs(ctx, lg(ctx, -10, 0, 24, 0, '#f6f3e8', '#cfc9b6'), '#3a3628', 2.5);
      ctx.fillStyle = '#555';
      ctx.fillRect(-6, -28, 26, 6);
      for (let i = 0; i < 6; i++) ctx.fillRect(-6, -16 + i * 7, i % 2 ? 18 : 26, 2.5);
      if (fr < 0.5) { ctx.fillStyle = C('#2a2a2a'); ctx.beginPath(); ctx.moveTo(24, -10); ctx.lineTo(14, 0); ctx.lineTo(24, 10); ctx.fill(); }
      ctx.restore();
    }
    // brazo delantero
    let fx = -54, fy = -96 - sw * 4;
    if (eating) { fx = -54; fy = -112 + Math.sin(a * 10) * 8; }
    if (z.type === 'paper' && z.armor > 0) { fx = -46; fy = -82; }
    zArm(ctx, -14, -114, (fx - 14) / 2 + 2, (fy - 114) / 2 + 8, fx, fy, sleeve, z.lostArm);

    ctx.restore();
  }
  function shade(hex) {
    const c = rgb(hex);
    return '#' + c.map(v => Math.max(0, Math.round(v * 0.75)).toString(16).padStart(2, '0')).join('');
  }

  // cabeza suelta (partícula)
  function zombieHead(ctx, z) {
    zHead(ctx, z, 0.3);
    zArmor(ctx, z);
  }
  function zombieArm(ctx) {
    zArm(ctx, 0, 0, -16, 8, -32, 10, Z.coat1, false);
  }
  function armorPiece(ctx, type, frac) {
    zArmor(ctx, { type, armor: Math.max(1, frac), armorMax: 1 });
  }

  // ---------- Proyectiles, soles, etc ----------
  function pea(ctx, x, y, snow) {
    shadow(ctx, x, y + 52, 10, 4, 0.2);
    circle(ctx, x, y, 11);
    fs(ctx, snow ? rg(ctx, x, y, 11, '#f2feff', '#3aa6e0') : rg(ctx, x, y, 11, '#d6ff8a', '#3c9a14'), snow ? '#14507a' : '#1d4a0a', 2);
    highlight(ctx, x - 3.5, y - 4, 4, 2.5, -0.5, 0.6);
  }
  function sun(ctx, x, y, t, scale = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    const g = ctx.createRadialGradient(0, 0, 8, 0, 0, 56);
    g.addColorStop(0, 'rgba(255,250,170,0.95)'); g.addColorStop(0.45, 'rgba(255,220,60,0.45)'); g.addColorStop(1, 'rgba(255,200,0,0)');
    ctx.fillStyle = g; circle(ctx, 0, 0, 56); ctx.fill();
    ctx.save(); ctx.rotate(t * 0.8);
    ctx.fillStyle = 'rgba(255,214,40,0.85)';
    for (let i = 0; i < 12; i++) {
      ctx.rotate(TAU / 12);
      ctx.beginPath(); ctx.moveTo(-6, 22); ctx.lineTo(0, 40 + (i % 2) * 6); ctx.lineTo(6, 22); ctx.fill();
    }
    ctx.restore();
    circle(ctx, 0, 0, 24);
    const g2 = ctx.createRadialGradient(-7, -8, 2, 0, 0, 24); g2.addColorStop(0, '#fffde0'); g2.addColorStop(0.5, '#ffe14a'); g2.addColorStop(1, '#ffaa00');
    ctx.fillStyle = g2; ctx.fill();
    ctx.strokeStyle = 'rgba(220,130,0,0.8)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  function mower(ctx, x, y, t, running) {
    ctx.save(); ctx.translate(x, y);
    const jig = running ? Math.sin(t * 60) * 1.5 : 0;
    shadow(ctx, 0, 4, 42, 9);
    ctx.translate(0, jig);
    line(ctx, [-24, -30, -48, -66], 5, '#666', '#222', 2);
    line(ctx, [-54, -70, -42, -62], 7, '#222', null);
    rrect(ctx, -34, -34, 66, 26, 9); fs(ctx, lg(ctx, 0, -34, 0, -8, '#ff6a50', '#d1201a', '#7a0c08'), '#3a0504', 3);
    rrect(ctx, -12, -48, 30, 18, 5); fs(ctx, lg(ctx, 0, -48, 0, -30, '#bfc6cc', '#5a6268'), '#22272b', 2.5);
    highlight(ctx, -14, -28, 14, 4, 0, 0.45);
    for (const wx of [-24, 22]) {
      circle(ctx, wx, -6, 10); fs(ctx, '#222', '#000', 2);
      circle(ctx, wx, -6, 4); ctx.fillStyle = '#aaa'; ctx.fill();
    }
    ctx.restore();
  }

  // ---------- Fondo (se pre-renderiza) ----------
  function mulberry(seed) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function background(ctx, sod) {
    const rnd = mulberry(1234);
    // cielo y valla
    let g = ctx.createLinearGradient(0, 0, 0, 170);
    g.addColorStop(0, '#7cc6f2'); g.addColorStop(1, '#cdeefc');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 170);
    // nubes
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 7; i++) {
      const cx = 200 + i * 230 + rnd() * 80, cy = 24 + rnd() * 30;
      for (let k = 0; k < 4; k++) { circle(ctx, cx + k * 22, cy + Math.sin(k * 2) * 6, 18 + (k % 2) * 6); ctx.fill(); }
    }
    // árboles al fondo
    for (let i = 0; i < 12; i++) {
      const tx = i * 140 + rnd() * 60, ty = 100;
      circle(ctx, tx, ty, 50 + rnd() * 20);
      ctx.fillStyle = `rgb(${50 + rnd() * 20 | 0},${120 + rnd() * 30 | 0},${50 + rnd() * 20 | 0})`; ctx.fill();
    }
    // valla de madera
    for (let x = 140; x < LAWN_RIGHT + 20; x += 34) {
      ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(x, 66); ctx.lineTo(x + 14, 54); ctx.lineTo(x + 28, 66); ctx.lineTo(x + 28, 150); ctx.closePath();
      ctx.fillStyle = (x / 34 | 0) % 2 ? '#f3e7cf' : '#e9dcbf'; ctx.fill();
      ctx.strokeStyle = '#a89470'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.fillStyle = '#d9c8a4'; ctx.fillRect(140, 82, LAWN_RIGHT - 120, 10); ctx.fillRect(140, 124, LAWN_RIGHT - 120, 10);
    // seto superior
    for (let x = 130; x < LAWN_RIGHT + 30; x += 26) {
      circle(ctx, x, 152 + rnd() * 6, 18 + rnd() * 6);
      ctx.fillStyle = rnd() > 0.5 ? '#2f7a22' : '#3a8c2a'; ctx.fill();
    }

    // césped
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = GRID_X + c * COL_W, y = GRID_Y + r * ROW_H;
        if (sod.includes(r)) {
          const light = (r + c) % 2 === 0;
          g = ctx.createLinearGradient(x, y, x, y + ROW_H);
          if (light) { g.addColorStop(0, '#7fce45'); g.addColorStop(1, '#6abd34'); }
          else { g.addColorStop(0, '#67b931'); g.addColorStop(1, '#58a828'); }
          ctx.fillStyle = g; ctx.fillRect(x, y, COL_W + 0.5, ROW_H + 0.5);
        } else {
          g = ctx.createLinearGradient(x, y, x, y + ROW_H);
          g.addColorStop(0, '#9a6d3c'); g.addColorStop(1, '#7d5329');
          ctx.fillStyle = g; ctx.fillRect(x, y, COL_W + 0.5, ROW_H + 0.5);
        }
      }
    }
    // texturas: briznas, flores, piedrecitas
    for (let i = 0; i < 2600; i++) {
      const x = GRID_X + rnd() * COLS * COL_W, y = GRID_Y + rnd() * ROWS * ROW_H;
      const r = Math.floor((y - GRID_Y) / ROW_H);
      if (sod.includes(r)) {
        ctx.strokeStyle = rnd() > 0.5 ? 'rgba(40,110,20,0.55)' : 'rgba(170,230,110,0.45)';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 6, y - 5 - rnd() * 6); ctx.stroke();
      } else {
        ctx.fillStyle = rnd() > 0.5 ? 'rgba(60,35,15,0.4)' : 'rgba(190,150,100,0.35)';
        circle(ctx, x, y, 1 + rnd() * 2.5); ctx.fill();
      }
    }
    for (let i = 0; i < 40; i++) {
      const x = GRID_X + rnd() * COLS * COL_W, y = GRID_Y + rnd() * ROWS * ROW_H;
      const r = Math.floor((y - GRID_Y) / ROW_H);
      if (!sod.includes(r)) continue;
      const col = ['#fff', '#ffe24a', '#ff9ad0', '#c8a8ff'][i % 4];
      ctx.fillStyle = col;
      for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; circle(ctx, x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.4); ctx.fill(); }
      ctx.fillStyle = '#f2a20c'; circle(ctx, x, y, 1.8); ctx.fill();
    }
    // sombra de filas sin césped
    for (let r = 0; r < ROWS; r++) {
      if (!sod.includes(r)) {
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(GRID_X, GRID_Y + r * ROW_H, COLS * COL_W, 6);
      }
    }
    // casa
    g = ctx.createLinearGradient(0, 0, 150, 0);
    g.addColorStop(0, '#c9b38f'); g.addColorStop(1, '#e8d6b4');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 150, H);
    for (let y = 0; y < H; y += 26) { ctx.fillStyle = 'rgba(90,60,30,0.25)'; ctx.fillRect(0, y, 150, 3); }
    // ventana
    rrect(ctx, 20, 230, 100, 130, 6); ctx.fillStyle = '#5b3a1f'; ctx.fill();
    g = ctx.createLinearGradient(28, 238, 112, 352); g.addColorStop(0, '#bfe7ff'); g.addColorStop(1, '#5c9cc8');
    ctx.fillStyle = g; ctx.fillRect(28, 238, 84, 114);
    ctx.fillStyle = '#5b3a1f'; ctx.fillRect(67, 238, 6, 114); ctx.fillRect(28, 292, 84, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.moveTo(32, 242); ctx.lineTo(60, 242); ctx.lineTo(32, 280); ctx.fill();
    // puerta
    rrect(ctx, 30, 520, 90, 190, 8); ctx.fillStyle = '#7a4a22'; ctx.fill(); ctx.strokeStyle = '#3a2008'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = 'rgba(40,20,5,0.5)'; ctx.lineWidth = 3;
    ctx.strokeRect(42, 535, 66, 70); ctx.strokeRect(42, 620, 66, 75);
    circle(ctx, 106, 615, 5); ctx.fillStyle = '#e8c04a'; ctx.fill();
    // porche de madera
    g = ctx.createLinearGradient(150, 0, GRID_X, 0); g.addColorStop(0, '#a87a48'); g.addColorStop(1, '#8a5e33');
    ctx.fillStyle = g; ctx.fillRect(150, 150, GRID_X - 150, H - 150);
    for (let y = 150; y < H; y += 30) { ctx.fillStyle = 'rgba(50,30,10,0.35)'; ctx.fillRect(150, y, GRID_X - 150, 2.5); }
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(GRID_X - 6, 150, 6, H - 150);
    // acera y carretera
    ctx.fillStyle = '#c9c4b8'; ctx.fillRect(LAWN_RIGHT, 0, 60, H);
    for (let y = 0; y < H; y += 90) { ctx.fillStyle = '#a8a397'; ctx.fillRect(LAWN_RIGHT, y, 60, 3); }
    ctx.fillStyle = '#8f8a7e'; ctx.fillRect(LAWN_RIGHT + 56, 0, 8, H);
    g = ctx.createLinearGradient(LAWN_RIGHT + 64, 0, W, 0); g.addColorStop(0, '#4a4a4e'); g.addColorStop(1, '#3a3a3e');
    ctx.fillStyle = g; ctx.fillRect(LAWN_RIGHT + 64, 0, W - LAWN_RIGHT - 64, H);
    for (let i = 0; i < 900; i++) { ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)'; ctx.fillRect(LAWN_RIGHT + 64 + rnd() * 200, rnd() * H, 2, 2); }
    ctx.fillStyle = '#e8c42a';
    for (let y = 10; y < H; y += 70) ctx.fillRect(1530, y, 8, 40);
    // borde inferior
    for (let x = 130; x < LAWN_RIGHT + 30; x += 24) { circle(ctx, x, H + 4, 16); ctx.fillStyle = '#2f7a22'; ctx.fill(); }
  }

  return {
    TAU, setTint, C, rg, lg, fs, circle, ell, rrect, shadow, line, leaf, eye, highlight,
    plant, zombie, zombieHead, zombieArm, armorPiece, pea, sun, mower, background,
  };
})();

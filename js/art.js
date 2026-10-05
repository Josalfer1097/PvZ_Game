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
  // Los degradados se definen en coordenadas locales, así que se pueden
  // reutilizar entre fotogramas: se guardan en caché (gran mejora de rendimiento).
  const gcache = new Map();
  function gkey(parts) { return (tintA ? tint.join() + tintA : '') + parts.join('|'); }
  function cacheGet(key, make) {
    let g = gcache.get(key);
    if (!g) { if (gcache.size > 6000) gcache.clear(); g = make(); gcache.set(key, g); }
    return g;
  }
  function rg(ctx, x, y, r, c1, c2, ox = -0.35, oy = -0.4) {
    return cacheGet(gkey(['r', x, y, r, c1, c2, ox, oy]), () => {
      const g = ctx.createRadialGradient(x + r * ox, y + r * oy, r * 0.05, x, y, r * 1.05);
      g.addColorStop(0, C(c1)); g.addColorStop(1, C(c2));
      return g;
    });
  }
  function lg(ctx, x1, y1, x2, y2, ...cols) {
    return cacheGet(gkey(['l', x1, y1, x2, y2, ...cols]), () => {
      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), C(c)));
      return g;
    });
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
    sunHead(ctx, s.glow || 0);
    ctx.restore();
  }
  function sunHead(ctx, glow) {
    if (glow > 0) {
      const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 70);
      g.addColorStop(0, `rgba(255,240,120,${0.8 * glow})`); g.addColorStop(1, 'rgba(255,240,120,0)');
      ctx.fillStyle = g; circle(ctx, 0, 0, 70); ctx.fill();
    }
    for (let ring = 0; ring < 2; ring++) {
      const n = 14, rad = ring ? 26 : 31, rx = ring ? 13 : 15, ry = ring ? 7 : 8;
      for (let i = 0; i < n; i++) {
        const a = (i + ring * 0.5) / n * TAU;
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

  // ---------- Plantas nuevas ----------
  function gatling(ctx, t, s) {
    const p = PAL.dark;
    const bob = Math.sin(t * 2.6 + (s.seed || 0)) * 2.5;
    leaf(ctx, -3, -3, Math.PI + 0.3, 38, 12, p.leaf1, p.leaf2);
    leaf(ctx, 3, -3, -0.3, 38, 12, p.leaf1, p.leaf2);
    leaf(ctx, -2, -6, Math.PI + 0.9, 28, 9, p.leaf1, p.leaf2);
    line(ctx, [0, 0, -12, -26, 0, -50 + bob], 10, lg(ctx, -6, 0, 6, 0, p.mid, p.dark));
    const r = 28, rec = s.recoil || 0;
    ctx.save(); ctx.translate(3 - rec * 5 + Math.sin(t * 60) * rec * 1.5, -64 + bob);
    // cañón múltiple
    rrect(ctx, r * 0.4, -r * 0.5, r * 1.15, r, r * 0.3);
    fs(ctx, lg(ctx, 0, -r * 0.5, 0, r * 0.5, p.light, p.mid, p.dark));
    ell(ctx, r * 1.55, 0, r * 0.26, r * 0.56); fs(ctx, rg(ctx, r * 1.55, 0, r * 0.56, p.light, p.mid));
    ctx.fillStyle = C('#0e2a05');
    const spin = t * (rec > 0 ? 30 : 2);
    for (let i = 0; i < 4; i++) { const a = spin + i * TAU / 4; circle(ctx, r * 1.57, Math.sin(a) * r * 0.3, 4.2 * (0.7 + 0.3 * Math.cos(a))); ctx.fill(); }
    circle(ctx, 0, 0, r); fs(ctx, rg(ctx, 0, 0, r, p.light, p.dark));
    eye(ctx, r * 0.28, -r * 0.12, r * 0.24, r * 0.28, r * 0.36, -r * 0.1, r * 0.14);
    ctx.beginPath(); ctx.moveTo(r * 0.02, -r * 0.45); ctx.lineTo(r * 0.6, -r * 0.32);
    ctx.strokeStyle = C('#0e2a05'); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
    // casco militar
    ctx.beginPath(); ctx.arc(-2, -r * 0.25, r * 1.05, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath();
    fs(ctx, rg(ctx, -6, -r * 0.8, r * 1.1, '#8a9a54', '#3c4a1c'), '#1d2408', 3);
    ctx.fillStyle = C('#2f3a14'); ctx.fillRect(-r * 1.05, -r * 0.32, r * 2.1, 5);
    highlight(ctx, -r * 0.4, -r * 0.85, r * 0.3, r * 0.1, -0.2, 0.35);
    ctx.restore();
  }

  function twinsunflower(ctx, t, s) {
    const sw = Math.sin(t * 1.8 + (s.seed || 0)) * 0.07;
    leaf(ctx, -3, -4, Math.PI + 0.35, 36, 12); leaf(ctx, 3, -4, -0.35, 36, 12);
    line(ctx, [0, 0, -6, -30, -22, -58], 7, '#4ea323');
    line(ctx, [0, -10, 10, -36, 22, -64], 7, '#4ea323');
    ctx.save(); ctx.translate(-24, -66); ctx.rotate(sw - 0.12); ctx.scale(0.78, 0.78); sunHead(ctx, s.glow || 0); ctx.restore();
    ctx.save(); ctx.translate(24, -74); ctx.rotate(-sw + 0.12); ctx.scale(0.78, 0.78); sunHead(ctx, s.glow || 0); ctx.restore();
  }

  function flame(ctx, x, y, t, size, seed = 0) {
    const layers = [['#ff4a08', 1], ['#ff9a16', 0.74], ['#ffe76a', 0.46], ['#fffbe0', 0.22]];
    for (let i = 0; i < layers.length; i++) {
      const [col, k] = layers[i];
      const w = size * 0.55 * k, h = size * (0.9 + 0.12 * Math.sin(t * 13 + i + seed)) * k + size * 0.15;
      const tip = Math.sin(t * 9 + i * 1.7 + seed) * size * 0.14;
      ctx.beginPath(); ctx.moveTo(x - w, y);
      ctx.bezierCurveTo(x - w * 1.1, y - h * 0.5, x + tip - w * 0.3, y - h * 0.8, x + tip, y - h);
      ctx.bezierCurveTo(x + tip + w * 0.3, y - h * 0.75, x + w * 1.1, y - h * 0.45, x + w, y);
      ctx.quadraticCurveTo(x, y + w * 0.4, x - w, y); ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
    }
  }
  function torchwood(ctx, t, s) {
    ctx.save();
    const g = ctx.createRadialGradient(0, -90, 5, 0, -90, 90);
    g.addColorStop(0, 'rgba(255,170,60,0.35)'); g.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = g; circle(ctx, 0, -90, 90); ctx.fill();
    ctx.restore();
    // raíces
    for (const [dx, a] of [[-30, 2.6], [30, 0.5], [-14, 2.0]]) line(ctx, [dx * 0.6, -6, dx * 1.3, 2], 7, '#7a4a20', '#3a1e08', 2.5);
    ctx.beginPath(); ctx.moveTo(-32, 0); ctx.lineTo(-30, -70); ctx.quadraticCurveTo(0, -80, 30, -70); ctx.lineTo(32, 0); ctx.quadraticCurveTo(0, 7, -32, 0); ctx.closePath();
    fs(ctx, lg(ctx, -32, 0, 32, 0, '#b8763a', '#8a5426', '#5a3314'), '#341a06', 3.5);
    ctx.strokeStyle = C('#5a3314'); ctx.lineWidth = 2.5;
    for (const bx of [-20, -6, 10, 22]) { ctx.beginPath(); ctx.moveTo(bx, -66); ctx.bezierCurveTo(bx + 5, -50, bx - 5, -30, bx + 2, -6); ctx.stroke(); }
    ell(ctx, 0, -71, 30, 9); fs(ctx, rg(ctx, 0, -71, 30, '#5a2a08', '#1e0a00', 0, 0), '#341a06', 3);
    flame(ctx, 0, -72, t, 52, s.seed || 0);
    // cara
    eye(ctx, -11, -44, 7, 8, -7, -43, 3.6); eye(ctx, 11, -44, 7, 8, 15, -43, 3.6);
    ctx.strokeStyle = '#1e0a00'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-20, -56); ctx.lineTo(-4, -51); ctx.moveTo(20, -56); ctx.lineTo(4, -51); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10, -26); ctx.quadraticCurveTo(2, -33, 14, -26); ctx.lineWidth = 3.5; ctx.stroke();
  }

  function spikeweed(ctx, t, s) {
    const a = s.attack || 0;
    ell(ctx, 0, -6, 48, 12); fs(ctx, rg(ctx, 0, -6, 48, '#8ad050', '#2f6f18'), OUT, 3);
    for (let i = -4; i <= 4; i++) {
      const x = i * 10.5, h = 16 + (i % 2 ? 0 : 5) + a * 12 + Math.sin(t * 2 + i) * 1;
      const by = -10 + Math.abs(i) * 0.6;
      ctx.beginPath(); ctx.moveTo(x - 5, by); ctx.lineTo(x + i * 0.6, by - h); ctx.lineTo(x + 5, by); ctx.closePath();
      fs(ctx, lg(ctx, x - 5, 0, x + 5, 0, '#f0f2f4', '#9aa2aa', '#5a6068'), '#2a2e33', 2);
    }
    eye(ctx, -9, -8, 5, 5, -7, -8, 2.6); eye(ctx, 9, -8, 5, 5, 11, -8, 2.6);
    ctx.strokeStyle = '#163008'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-15, -15); ctx.lineTo(-4, -12); ctx.moveTo(15, -15); ctx.lineTo(4, -12); ctx.stroke();
  }

  function garlic(ctx, t, s) {
    const dmg = s.dmg || 0;
    const sq = 1 + Math.sin(t * 2 + (s.seed || 0)) * 0.02;
    ctx.save(); ctx.scale(1 / sq, sq);
    for (const [x, a] of [[-6, -0.3], [0, 0], [6, 0.35]]) line(ctx, [x * 0.5, -66, x, -78, x * 1.6, -90 + Math.abs(x)], 3.5, '#6cc23c', OUT, 2);
    ctx.beginPath(); ctx.moveTo(0, -70);
    ctx.bezierCurveTo(22, -60, 44, -42, 40, -18); ctx.quadraticCurveTo(36, 2, 0, 2);
    ctx.quadraticCurveTo(-36, 2, -40, -18); ctx.bezierCurveTo(-44, -42, -22, -60, 0, -70); ctx.closePath();
    fs(ctx, rg(ctx, -6, -30, 44, '#ffffff', '#d8cfe2'), '#5a4a6a', 3);
    ctx.strokeStyle = C('#b89ccf'); ctx.lineWidth = 2.5;
    for (const dx of [-22, -8, 8, 22]) { ctx.beginPath(); ctx.moveTo(dx * 0.3, -66); ctx.quadraticCurveTo(dx * 1.3, -36, dx * 0.9, 0); ctx.stroke(); }
    if (dmg > 0) { ctx.fillStyle = C('#f2ece0'); ctx.beginPath(); ctx.arc(40, -24, 12, 1.6, 4.6); ctx.fill(); }
    if (dmg > 1) { ctx.beginPath(); ctx.arc(-38, -40, 11, -1.4, 1.6); ctx.fill(); }
    eye(ctx, -9, -34, 6, 7, -7, -33, 3.2); eye(ctx, 9, -34, 6, 7, 11, -33, 3.2);
    ctx.strokeStyle = '#3a2a4a'; ctx.lineWidth = 2.5; ctx.beginPath();
    if (dmg > 0) { ctx.moveTo(-8, -18); ctx.quadraticCurveTo(0, -24, 8, -18); }
    else { ctx.moveTo(-8, -20); ctx.quadraticCurveTo(2, -14, 10, -22); }
    ctx.stroke();
    ctx.restore();
  }

  function shroomStem(ctx, h, c1, c2) {
    ctx.beginPath(); ctx.moveTo(-16, 0); ctx.quadraticCurveTo(-20, -h * 0.6, -13, -h); ctx.lineTo(13, -h); ctx.quadraticCurveTo(20, -h * 0.6, 16, 0); ctx.quadraticCurveTo(0, 5, -16, 0); ctx.closePath();
    fs(ctx, lg(ctx, -16, 0, 16, 0, c1, c2), OUT, 3);
  }
  function iceshroom(ctx, t, s) {
    const f = s.fuse || 0;
    const sh = f > 0 ? Math.sin(t * 50) * 2 : 0;
    const sc = 1 + f * 0.3;
    ctx.save(); ctx.translate(sh, 0); ctx.scale(sc, sc);
    shroomStem(ctx, 38, '#f2fbff', '#a8d8ef');
    eye(ctx, -7, -20, 4.5, 5.5, -5, -19, 2.5); eye(ctx, 7, -20, 4.5, 5.5, 9, -19, 2.5);
    ctx.beginPath(); ctx.arc(1, -11, 4, 0.1, Math.PI - 0.1); ctx.strokeStyle = '#1f4a6a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-42, -34); ctx.bezierCurveTo(-42, -86, 42, -86, 42, -34); ctx.quadraticCurveTo(0, -24, -42, -34); ctx.closePath();
    fs(ctx, rg(ctx, -8, -60, 46, '#e8fbff', '#2f8ccf'), '#123a5c', 3);
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + 0.45 + i * 0.55;
      ctx.save(); ctx.translate(Math.cos(a) * 38, -40 + Math.sin(a) * 38); ctx.rotate(a + Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(0, -14); ctx.lineTo(6, 4); ctx.closePath();
      fs(ctx, lg(ctx, 0, -14, 0, 4, '#ffffff', '#9fe3ff'), '#1f5f8f', 2); ctx.restore();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(ctx, -18, -56, 6); ctx.fill(); circle(ctx, 14, -64, 4.5); ctx.fill(); circle(ctx, 24, -46, 3.5); ctx.fill();
    if (f > 0) { ctx.globalAlpha = f * 0.6; ctx.fillStyle = '#fff'; circle(ctx, 0, -40, 50); ctx.fill(); }
    ctx.restore();
  }
  function doomshroom(ctx, t, s) {
    const f = s.fuse || 0;
    const sc = 1 + f * 0.55 + (f > 0 ? Math.sin(t * 40) * 0.03 : Math.sin(t * 2.2) * 0.015);
    ctx.save(); ctx.scale(sc, sc);
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    const g = ctx.createRadialGradient(0, -50, 4, 0, -50, 80);
    g.addColorStop(0, `rgba(190,60,255,${0.25 + pulse * 0.2 + f * 0.5})`); g.addColorStop(1, 'rgba(120,0,200,0)');
    ctx.fillStyle = g; circle(ctx, 0, -50, 80); ctx.fill();
    shroomStem(ctx, 36, '#6a6278', '#2e2838');
    eye(ctx, -7, -19, 4.5, 5, -5, -18, 2.4); eye(ctx, 7, -19, 4.5, 5, 9, -18, 2.4);
    ctx.strokeStyle = '#120a18'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-13, -26); ctx.lineTo(-3, -23); ctx.moveTo(13, -26); ctx.lineTo(3, -23); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-46, -32); ctx.bezierCurveTo(-48, -96, 48, -96, 46, -32); ctx.quadraticCurveTo(0, -20, -46, -32); ctx.closePath();
    fs(ctx, rg(ctx, -10, -62, 52, '#5a3a72', '#14081e'), '#05000a', 3);
    ctx.save(); ctx.clip();
    ctx.fillStyle = `rgba(230,90,255,${0.55 + pulse * 0.45})`;
    for (const [x, y, r] of [[-22, -58, 8], [6, -74, 7], [26, -52, 9], [-4, -46, 5], [-34, -40, 4]]) { circle(ctx, x, y, r); ctx.fill(); }
    ctx.restore();
    if (f > 0) { ctx.globalAlpha = f * 0.7; ctx.fillStyle = '#ff9dff'; circle(ctx, 0, -50, 54); ctx.fill(); }
    ctx.restore();
  }

  function melonFruit(ctx, x, y, rot, winter, sc = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
    if (winter) {
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 30); g.addColorStop(0, 'rgba(200,240,255,0.6)'); g.addColorStop(1, 'rgba(200,240,255,0)');
      ctx.fillStyle = g; circle(ctx, 0, 0, 30); ctx.fill();
    }
    ell(ctx, 0, 0, 19, 15);
    fs(ctx, winter ? rg(ctx, 0, 0, 19, '#e6fbff', '#3f9ccf') : rg(ctx, 0, 0, 19, '#a8e870', '#2c7a18'), winter ? '#123a5c' : '#123a06', 2.5);
    ctx.strokeStyle = winter ? 'rgba(255,255,255,0.75)' : C('#1d5a0c'); ctx.lineWidth = 2.5;
    for (const dy of [-8, 0, 8]) { ctx.beginPath(); ctx.ellipse(0, dy * 0.4, 18, 3 + Math.abs(dy) * 0.2, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); }
    highlight(ctx, -7, -7, 6, 3.5, -0.5, 0.5);
    ctx.restore();
  }
  function melonpult(ctx, t, s, winter) {
    const thr = s.throwT || 0;
    const loaded = s.loaded !== false;
    // brazo lanzador
    let ang = -2.55;
    if (thr > 0) ang = thr < 0.35 ? -2.55 + (thr / 0.35) * 2.4 : -0.15 - ((thr - 0.35) / 0.65) * 2.4;
    ctx.save(); ctx.translate(-6, -56); ctx.rotate(ang);
    line(ctx, [0, 0, 26, -4, 50, 0], 7, '#4ea323');
    ctx.translate(54, 0);
    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.quadraticCurveTo(0, 22, 18, 0); ctx.closePath();
    fs(ctx, lg(ctx, -18, 0, 18, 0, '#7fd04a', '#2f7d1a'));
    if (loaded && (thr === 0 || thr < 0.3)) melonFruit(ctx, 0, -10, 0, winter, 0.9);
    ctx.restore();
    // cuerpo de hojas
    leaf(ctx, -6, -4, Math.PI + 0.2, 40, 13); leaf(ctx, 6, -4, -0.2, 40, 13);
    const bob = Math.sin(t * 2.4 + (s.seed || 0)) * 1.5;
    for (const [x, y, r] of [[-20, -26, 20], [20, -26, 20], [0, -40 + bob, 28]]) {
      circle(ctx, x, y, r); fs(ctx, winter ? rg(ctx, x, y, r, '#d8f6ff', '#4b9cc8') : rg(ctx, x, y, r, '#b6ec78', '#3f8a1c'));
    }
    ctx.strokeStyle = winter ? C('#2a6a9a') : C('#2f6a12'); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-14, -56 + bob); ctx.quadraticCurveTo(0, -42 + bob, 14, -58 + bob); ctx.stroke();
    eye(ctx, -6, -40 + bob, 6, 7, -3, -39 + bob, 3.3); eye(ctx, 12, -40 + bob, 6, 7, 15, -39 + bob, 3.3);
    ctx.beginPath(); ctx.arc(4, -28 + bob, 6, 0.15, Math.PI - 0.15); ctx.strokeStyle = '#173a08'; ctx.lineWidth = 2.5; ctx.stroke();
    if (winter) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; circle(ctx, -18, -36, 3); ctx.fill(); circle(ctx, 22, -30, 2.5); ctx.fill(); }
  }

  function magnet(ctx, t, s) {
    shroomStem(ctx, 34, '#b38ad0', '#5a3278');
    eye(ctx, -7, -18, 4.5, 5.5, -5, -17, 2.5); eye(ctx, 7, -18, 4.5, 5.5, 9, -17, 2.5);
    ctx.beginPath(); ctx.arc(1, -9, 3.5, 0.1, Math.PI - 0.1); ctx.strokeStyle = '#2a1238'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-36, -30); ctx.bezierCurveTo(-38, -60, 38, -60, 36, -30); ctx.quadraticCurveTo(0, -22, -36, -30); ctx.closePath();
    fs(ctx, rg(ctx, -6, -44, 38, '#d6a8f0', '#6a2a92'), '#2a0e3a', 3);
    // imán de herradura
    const wob = s.holding ? 0 : Math.sin(t * 3) * 0.08;
    ctx.save(); ctx.translate(0, -56); ctx.rotate(wob);
    ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.arc(0, -16, 20, Math.PI, 0); ctx.lineTo(20, 4); ctx.moveTo(-20, 4); ctx.lineTo(-20, -16);
    ctx.strokeStyle = '#3a0505'; ctx.lineWidth = 17; ctx.stroke();
    ctx.strokeStyle = C('#e3271c'); ctx.lineWidth = 12; ctx.stroke();
    ctx.fillStyle = '#d9dee2'; ctx.fillRect(-26, -2, 12, 9); ctx.fillRect(14, -2, 12, 9);
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.strokeRect(-26, -2, 12, 9); ctx.strokeRect(14, -2, 12, 9);
    if (!s.holding) {
      ctx.strokeStyle = `rgba(150,220,255,${0.5 + 0.5 * Math.sin(t * 8)})`; ctx.lineWidth = 2;
      for (const k of [1, 2]) { ctx.beginPath(); ctx.arc(0, 12, 8 + k * 7, 0.3, Math.PI - 0.3); ctx.stroke(); }
    }
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
      case 'gatling': return gatling(ctx, t, s);
      case 'twinsunflower': return twinsunflower(ctx, t, s);
      case 'torchwood': return torchwood(ctx, t, s);
      case 'spikeweed': return spikeweed(ctx, t, s);
      case 'garlic': return garlic(ctx, t, s);
      case 'iceshroom': return iceshroom(ctx, t, s);
      case 'doomshroom': return doomshroom(ctx, t, s);
      case 'melonpult': return melonpult(ctx, t, s, false);
      case 'wintermelon': return melonpult(ctx, t, s, true);
      case 'magnet': return magnet(ctx, t, s);
    }
  }

  // ---------- Proyectiles, soles, etc ----------
  function pea(ctx, x, y, kind, t = 0) {
    shadow(ctx, x, y + 52, 10, 4, 0.2);
    if (kind === 'fire') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 2, x, y, 26);
      g.addColorStop(0, 'rgba(255,200,80,0.8)'); g.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.fillStyle = g; circle(ctx, x, y, 26); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 2);
      flame(ctx, 0, 6, t, 30, x * 0.1);
      ctx.restore();
      circle(ctx, x, y, 10); fs(ctx, rg(ctx, x, y, 10, '#fff6b0', '#ff7a10'), '#7a2a00', 2);
      return;
    }
    const snow = kind === 'snow';
    circle(ctx, x, y, 11);
    fs(ctx, snow ? rg(ctx, x, y, 11, '#f2feff', '#3aa6e0') : rg(ctx, x, y, 11, '#d6ff8a', '#3c9a14'), snow ? '#14507a' : '#1d4a0a', 2);
    highlight(ctx, x - 3.5, y - 4, 4, 2.5, -0.5, 0.6);
    if (snow) { ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#e8fbff'; circle(ctx, x - 16, y + 2, 4); ctx.fill(); circle(ctx, x - 26, y - 2, 2.5); ctx.fill(); ctx.restore(); }
  }
  function sun(ctx, x, y, t, scale = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    const g = ctx.createRadialGradient(0, 0, 8, 0, 0, 58);
    g.addColorStop(0, 'rgba(255,250,170,0.95)'); g.addColorStop(0.45, 'rgba(255,220,60,0.45)'); g.addColorStop(1, 'rgba(255,200,0,0)');
    ctx.fillStyle = g; circle(ctx, 0, 0, 58); ctx.fill();
    ctx.save(); ctx.rotate(t * 0.8);
    ctx.fillStyle = 'rgba(255,214,40,0.85)';
    for (let i = 0; i < 12; i++) {
      ctx.rotate(TAU / 12);
      ctx.beginPath(); ctx.moveTo(-6, 22); ctx.lineTo(0, 40 + (i % 2) * 6 + Math.sin(t * 4 + i) * 2); ctx.lineTo(6, 22); ctx.fill();
    }
    ctx.restore();
    circle(ctx, 0, 0, 24);
    const g2 = ctx.createRadialGradient(-7, -8, 2, 0, 0, 24); g2.addColorStop(0, '#fffde0'); g2.addColorStop(0.5, '#ffe14a'); g2.addColorStop(1, '#ffaa00');
    ctx.fillStyle = g2; ctx.fill();
    ctx.strokeStyle = 'rgba(220,130,0,0.8)'; ctx.lineWidth = 2; ctx.stroke();
    // carita
    ctx.fillStyle = 'rgba(160,80,0,0.55)';
    ell(ctx, -7, -3, 2.5, 3.5); ctx.fill(); ell(ctx, 7, -3, 2.5, 3.5); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 3, 6, 0.2, Math.PI - 0.2); ctx.strokeStyle = 'rgba(160,80,0,0.55)'; ctx.lineWidth = 2; ctx.stroke();
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
      ctx.save(); ctx.translate(wx, -6); ctx.rotate(running ? t * 30 : 0);
      ctx.fillStyle = '#aaa'; ctx.fillRect(-1.5, -7, 3, 14); ctx.fillRect(-7, -1.5, 14, 3);
      ctx.restore();
    }
    ctx.restore();
  }

  return {
    TAU, OUT, setTint, C, rgb, rg, lg, fs, circle, ell, rrect, shadow, line, leaf, eye, highlight, flame,
    plant, pea, melonFruit, sun, mower,
  };
})();

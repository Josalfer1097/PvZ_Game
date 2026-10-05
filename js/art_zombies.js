'use strict';
// =====================================================================
//  Zombis: diseño original con esqueleto articulado (cadera, rodillas,
//  hombros, codos, cabeza con retraso y mandíbula móvil).
// =====================================================================
(() => {
  const { TAU, C, rg, lg, fs, circle, ell, rrect, line, highlight, setTint } = Art;
  const ZO = '#221d18'; // contorno
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pickR = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];

  // ---------- Variación de aspecto por zombi ----------
  const SKINS = [['#bccb9e', '#6f8457'], ['#a9c3aa', '#5b7563'], ['#c4c79c', '#7d7f4c'], ['#aabcbd', '#5d7173'], ['#b7b59a', '#6f6c52']];
  const COATS = [['#7b5a3a', '#432c18'], ['#4f5a74', '#262d40'], ['#6d6a3c', '#39371a'], ['#6a4a5a', '#36222e'], ['#5a4030', '#2e1e14']];
  const TIES = ['#c0261c', '#2a6ab0', '#d8a018', '#3a8a3a', '#8a2a8a'];
  const PANTS = [['#5d5f78', '#363849'], ['#5a4a3a', '#33281e'], ['#4a5a5a', '#283636'], ['#6a6250', '#3d382c']];
  function look(type, seed = Math.random()) {
    let s = seed * 9973;
    const r = () => { s = (s * 16807 + 11) % 2147483647; return (s % 10000) / 10000; };
    return {
      skin: pickR(SKINS, r()), coat: pickR(COATS, r()), tie: pickR(TIES, r()), pants: pickR(PANTS, r()),
      hair: Math.floor(r() * 3), eye: 7.5 + r() * 2.5, scale: 0.95 + r() * 0.1, phase: r() * TAU, tooth: Math.floor(r() * 4),
    };
  }
  const DEFAULT_LOOK = look('normal', 0.31);

  // ---------- Parámetros de cuerpo y forma de andar ----------
  function gait(z) {
    const t = z.type;
    if (t === 'imp') return { freq: 10, stride: 0.55, lean: -0.15, hop: 7 };
    if (t === 'gargantuar') return { freq: 2.6, stride: 0.33, lean: -0.1, hop: 0 };
    if ((t === 'pole' && z.hasPole) || t === 'football' || z.enraged) return { freq: 8.5, stride: 0.72, lean: -0.26, hop: 0 };
    if (t === 'flag') return { freq: 4.8, stride: 0.45, lean: -0.08, hop: 0 };
    return { freq: 4, stride: 0.42, lean: -0.07, hop: 0 };
  }
  // Velocidad instantánea relativa: los zombis avanzan a trompicones con cada paso
  function stepPulse(z) {
    const g = gait(z);
    if (g.freq >= 8) return 1;
    const s = Math.abs(Math.sin(z.animT * g.freq + (z.look ? z.look.phase : 0)));
    return (0.35 + 1.25 * s) / 1.146;
  }

  // ---------- Piezas ----------
  function limb(ctx, x1, y1, x2, y2, x3, y3, w, c, outline = ZO) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3);
    ctx.strokeStyle = C(outline); ctx.lineWidth = w + 5; ctx.stroke();
    ctx.strokeStyle = typeof c === 'string' ? C(c) : c; ctx.lineWidth = w; ctx.stroke();
  }
  // a1: ángulo del muslo (positivo = hacia delante, que es -x), bend: flexión de rodilla
  function leg(ctx, hx, hy, a1, bend, L, w, pants, opt) {
    const kx = hx - Math.sin(a1) * L, ky = hy + Math.cos(a1) * L;
    const a2 = a1 - bend;
    const fx = kx - Math.sin(a2) * L, fy = ky + Math.cos(a2) * L;
    const cut = opt.shorts ? 0.15 : 0.8; // dónde termina la tela en la espinilla
    const cx = kx + (fx - kx) * cut, cy = ky + (fy - ky) * cut;
    // piel del tobillo/pierna
    limb(ctx, cx, cy, cx, cy, fx, fy, w * (opt.shorts ? 0.62 : 0.5), opt.skin);
    if (opt.socks) limb(ctx, kx + (fx - kx) * 0.45, ky + (fy - ky) * 0.45, fx, fy, fx, fy, w * 0.66, '#f2f2ec');
    if (opt.shorts) limb(ctx, hx, hy, hx + (kx - hx) * 0.6, hy + (ky - hy) * 0.6, hx + (kx - hx) * 0.6, hy + (ky - hy) * 0.6, w * 1.15, pants);
    else limb(ctx, hx, hy, kx, ky, cx, cy, w, pants);
    if (!opt.shorts) {
      // dobladillo roto
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-a2);
      ctx.beginPath(); ctx.moveTo(-w / 2 - 2, -3); ctx.lineTo(-w / 2, 4); ctx.lineTo(-w / 6, 1); ctx.lineTo(0, 6); ctx.lineTo(w / 5, 1); ctx.lineTo(w / 2 + 2, 5); ctx.lineTo(w / 2 + 2, -3); ctx.closePath();
      ctx.fillStyle = C(pants); ctx.fill(); ctx.strokeStyle = C(ZO); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    }
    // zapato
    if (!opt.barefoot) {
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(-a2 * 0.35);
      ctx.beginPath(); ctx.moveTo(8, -6); ctx.quadraticCurveTo(8, 4, 2, 5); ctx.lineTo(-18, 5);
      ctx.quadraticCurveTo(-24, 4, -22, -2); ctx.quadraticCurveTo(-16, -9, -4, -8); ctx.closePath();
      fs(ctx, lg(ctx, 0, -9, 0, 5, opt.shoe[0], opt.shoe[1]), ZO, 2.5);
      ctx.fillStyle = C(opt.sole || '#1a120c'); ctx.fillRect(-21, 2.5, 28, 3);
      if (opt.laces) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-10, -7); ctx.lineTo(-6, -2); ctx.moveTo(-6, -8); ctx.lineTo(-2, -3); ctx.stroke(); }
      ctx.restore();
    } else {
      ell(ctx, fx - 6, fy + 1, 11, 5, -a2 * 0.3); fs(ctx, opt.skin, ZO, 2);
    }
    return { kx, ky, fx, fy };
  }
  function arm(ctx, sx, sy, a, bend, L, w, sleeve, skin, opt = {}) {
    const ex = sx - Math.sin(a) * L, ey = sy + Math.cos(a) * L;
    const a2 = a + bend;
    const hx = ex - Math.sin(a2) * L * 0.95, hy = ey + Math.cos(a2) * L * 0.95;
    if (opt.lost) {
      const mx = sx + (ex - sx) * 0.7, my = sy + (ey - sy) * 0.7;
      limb(ctx, sx, sy, mx, my, mx, my, w, sleeve);
      circle(ctx, mx - Math.sin(a) * 3, my + Math.cos(a) * 3, w * 0.32); ctx.fillStyle = C('#7a2a22'); ctx.fill();
      return;
    }
    if (opt.bare) limb(ctx, sx, sy, ex, ey, hx, hy, w * 0.8, typeof skin === 'string' ? skin : skin[0]);
    else {
      limb(ctx, sx, sy, ex, ey, ex + (hx - ex) * 0.55, ey + (hy - ey) * 0.55, w, sleeve);
      limb(ctx, ex + (hx - ex) * 0.5, ey + (hy - ey) * 0.5, hx, hy, hx, hy, w * 0.55, typeof skin === 'string' ? skin : skin[0]);
      // puño raído
      const cx = ex + (hx - ex) * 0.55, cy = ey + (hy - ey) * 0.55;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-a2);
      ctx.beginPath(); ctx.moveTo(-w / 2 - 1, -3); ctx.lineTo(-w / 2, 3); ctx.lineTo(-1, 0); ctx.lineTo(1, 5); ctx.lineTo(w / 2 + 1, 2); ctx.lineTo(w / 2 + 1, -3); ctx.closePath();
      ctx.fillStyle = C(sleeve); ctx.fill(); ctx.strokeStyle = C(ZO); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    }
    // mano con dedos colgando
    const hs = opt.hand || 1;
    const sk = typeof skin === 'string' ? skin : skin[0];
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(-a2 + (opt.grab ? -0.6 : 0.25)); ctx.scale(hs, hs);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const fx = -3 + i * 2.6, len = 11 + (i === 1 || i === 2 ? 3 : 0) - (i === 3 ? 3 : 0);
      ctx.moveTo(fx, 2); ctx.quadraticCurveTo(fx - 1, len * 0.7, fx + 2, len);
    }
    ctx.lineWidth = 6; ctx.strokeStyle = C(ZO); ctx.stroke();
    ctx.lineWidth = 3.4; ctx.strokeStyle = C(sk); ctx.stroke();
    ell(ctx, 0, 0, 7.5, 6.5); fs(ctx, sk, ZO, 2.5);
    ctx.restore();
    return { hx, hy };
  }

  // ---------- Cabeza ----------
  function head(ctx, z, L, jaw, opts = {}) {
    const skin = L.skin, type = z.type;
    const angry = (type === 'paper' && z.enraged) || type === 'imp';
    // oreja trasera
    ell(ctx, 19, 1, 6, 9, 0.2); fs(ctx, skin[1], ZO, 2.5);
    ell(ctx, 19, 1, 2.5, 5, 0.2); ctx.fillStyle = C('#4a5a3a'); ctx.fill();
    // mandíbula (detrás del cráneo)
    ctx.save(); ctx.translate(-4, 9); ctx.rotate(jaw);
    ctx.beginPath(); ctx.moveTo(-18, -2); ctx.quadraticCurveTo(-20, 14, -6, 17); ctx.quadraticCurveTo(10, 18, 16, 4); ctx.lineTo(16, -4); ctx.closePath();
    fs(ctx, rg(ctx, -2, 6, 20, skin[0], skin[1]), ZO, 2.5);
    // interior de la boca + lengua + dientes inferiores
    ctx.beginPath(); ctx.moveTo(-16, -1); ctx.quadraticCurveTo(-4, 6 + jaw * 10, 10, -1); ctx.closePath(); ctx.fillStyle = C('#3a0f0c'); ctx.fill();
    ell(ctx, -4, 2 + jaw * 6, 6, 2.5); ctx.fillStyle = C('#b8475a'); ctx.fill();
    ctx.fillStyle = C('#e5dca0');
    ctx.fillRect(-12, -2, 3.5, 3.5); ctx.fillRect(-4, -2, 3, 3); ctx.fillRect(4, -2, 3.5, 3);
    ctx.restore();
    // cráneo
    ctx.beginPath();
    ctx.moveTo(-26, -2);
    ctx.bezierCurveTo(-30, -36, 18, -44, 26, -14);
    ctx.bezierCurveTo(30, 2, 22, 12, 12, 13);
    ctx.lineTo(-18, 12);
    ctx.quadraticCurveTo(-27, 8, -26, -2); ctx.closePath();
    fs(ctx, rg(ctx, -6, -14, 34, skin[0], skin[1]), ZO, 3);
    // labio superior / boca abierta
    ctx.beginPath(); ctx.moveTo(-21, 10); ctx.quadraticCurveTo(-6, 7, 12, 11);
    ctx.lineTo(12, 12 + jaw * 8); ctx.quadraticCurveTo(-4, 14 + jaw * 14, -21, 11 + jaw * 6); ctx.closePath();
    ctx.fillStyle = C('#2a0a08'); ctx.fill();
    // dientes superiores (irregulares, a uno le falta)
    ctx.fillStyle = C('#efe6b0'); ctx.strokeStyle = C('#6a5a30'); ctx.lineWidth = 0.8;
    for (let i = 0; i < 5; i++) {
      if (i === L.tooth) continue;
      const tx = -18 + i * 6, th = 4 + (i % 2) * 1.5;
      ctx.beginPath(); ctx.rect(tx, 9.5, 4.6, th); ctx.fill(); ctx.stroke();
    }
    // cuencas oscuras
    ctx.fillStyle = C(skin[1]); ctx.globalAlpha *= 0.75;
    ell(ctx, -14, -9, L.eye + 4, L.eye + 3); ctx.fill();
    ell(ctx, 3, -9, L.eye * 0.8 + 3, L.eye * 0.8 + 2.5); ctx.fill();
    ctx.globalAlpha /= 0.75;
    // ojos
    const sclera = angry ? '#ffcf9a' : '#f6f1cf';
    const ey = -9 + (opts.blink ? 0 : 0);
    circle(ctx, -14, ey, L.eye); fs(ctx, sclera, ZO, 2);
    circle(ctx, 3, ey, L.eye * 0.8); fs(ctx, sclera, ZO, 2);
    ctx.strokeStyle = 'rgba(200,40,30,0.55)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-14 - L.eye + 1, ey); ctx.lineTo(-17, ey + 1); ctx.moveTo(-14 + L.eye - 1, ey - 2); ctx.lineTo(-11, ey - 1); ctx.stroke();
    const pc = angry ? '#c01a10' : '#141414';
    const look = opts.dead ? 0 : Math.sin((z.animT || 0) * 0.7) * 1.2;
    circle(ctx, -16.5 + look, ey + 0.5, angry ? 3 : 2.2); ctx.fillStyle = pc; ctx.fill();
    circle(ctx, 0.5 + look, ey + 0.5, angry ? 2.5 : 1.9); ctx.fill();
    if (opts.dead) {
      ctx.strokeStyle = '#141414'; ctx.lineWidth = 2;
      for (const [x, r] of [[-14, 4], [3, 3.4]]) { ctx.beginPath(); ctx.moveTo(x - r, ey - r); ctx.lineTo(x + r, ey + r); ctx.moveTo(x + r, ey - r); ctx.lineTo(x - r, ey + r); ctx.stroke(); }
    }
    // cejas
    ctx.strokeStyle = C('#2c241a'); ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    if (angry) { ctx.moveTo(-25, -24); ctx.lineTo(-8, -16); ctx.moveTo(11, -20); ctx.lineTo(0, -16); }
    else { ctx.moveTo(-23, -21); ctx.quadraticCurveTo(-15, -25, -7, -20); ctx.moveTo(-1, -19); ctx.lineTo(9, -21); }
    ctx.stroke();
    // nariz
    ctx.fillStyle = C(skin[1]);
    ctx.beginPath(); ctx.moveTo(-6, -4); ctx.quadraticCurveTo(-13, 3, -9, 5); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C('#2a2a1a'); circle(ctx, -8, 4, 1.2); ctx.fill();
    // costura y arrugas
    ctx.strokeStyle = C('#5a3a2a'); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(8, -2); ctx.lineTo(16, 6); ctx.stroke();
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(9 + i * 3, 2 + i * 2.6); ctx.lineTo(13 + i * 3, -1 + i * 2.6); ctx.stroke(); }
    ctx.strokeStyle = C(skin[1]); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-16, -30); ctx.quadraticCurveTo(-6, -33, 4, -30); ctx.moveTo(-12, -26); ctx.quadraticCurveTo(-5, -28, 2, -26); ctx.stroke();
    // pelo
    if (!opts.noHair) {
      ctx.strokeStyle = C('#2e271c'); ctx.lineWidth = 2.2;
      ctx.beginPath();
      if (L.hair === 0) { ctx.moveTo(-6, -34); ctx.quadraticCurveTo(6, -46, 16, -36); ctx.moveTo(-2, -35); ctx.quadraticCurveTo(10, -44, 20, -32); ctx.moveTo(4, -35); ctx.quadraticCurveTo(14, -40, 22, -28); }
      else if (L.hair === 1) { for (let i = 0; i < 4; i++) { ctx.moveTo(-4 + i * 6, -35 + i); ctx.lineTo(-2 + i * 7, -47 + i * 2); } }
      else { ctx.moveTo(18, -24); ctx.quadraticCurveTo(26, -20, 22, -8); ctx.moveTo(15, -27); ctx.quadraticCurveTo(24, -26, 24, -14); }
      ctx.stroke();
    }
    // gafas del lector
    if (type === 'paper') {
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2.6;
      circle(ctx, -14, ey, L.eye + 3.5); ctx.stroke(); circle(ctx, 3, ey, L.eye * 0.8 + 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-14 + L.eye + 3.5, ey - 1); ctx.lineTo(3 - L.eye * 0.8 - 3, ey - 1); ctx.moveTo(3 + L.eye * 0.8 + 3, ey - 2); ctx.lineTo(19, -4); ctx.stroke();
      ctx.save(); ctx.globalAlpha *= 0.35; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-20, ey - 5); ctx.lineTo(-16, ey - 8); ctx.lineTo(-18, ey + 2); ctx.fill(); ctx.restore();
    }
    // cinta del saltador / pañuelo del diablillo
    if (type === 'pole') { ctx.fillStyle = C('#d42a1f'); ctx.beginPath(); ctx.moveTo(-27, -16); ctx.quadraticCurveTo(0, -26, 27, -18); ctx.lineTo(26, -11); ctx.quadraticCurveTo(0, -19, -26, -9); ctx.closePath(); ctx.fill(); }
    if (type === 'imp') {
      ctx.beginPath(); ctx.moveTo(-27, -12); ctx.bezierCurveTo(-26, -42, 22, -44, 27, -14); ctx.quadraticCurveTo(0, -24, -27, -12); ctx.closePath();
      fs(ctx, '#c42a24', ZO, 2.5);
      ctx.fillStyle = '#fff'; for (const [x, y] of [[-12, -28], [4, -32], [14, -22]]) { circle(ctx, x, y, 2); ctx.fill(); }
      line(ctx, [26, -16, 36, -10 + Math.sin((z.animT || 0) * 12) * 3], 4, '#c42a24', ZO, 2);
    }
  }

  // ---------- Accesorios de cabeza ----------
  function headArmor(ctx, type, frac) {
    if (frac <= 0) return;
    if (type === 'cone') {
      ctx.save(); ctx.translate(-2, -26); ctx.rotate(-0.14);
      ctx.beginPath(); ctx.moveTo(-27, 0);
      if (frac < 0.34) { ctx.lineTo(-13, -30); ctx.lineTo(-5, -25); ctx.lineTo(3, -34); ctx.lineTo(13, -27); }
      else if (frac < 0.67) { ctx.lineTo(-6, -48); ctx.lineTo(2, -41); ctx.lineTo(8, -48); }
      else ctx.lineTo(-1, -64);
      ctx.lineTo(27, 0); ctx.closePath();
      fs(ctx, lg(ctx, -27, 0, 27, 0, '#ffb54f', '#f2701c', '#b0420a'), '#5a2400', 3);
      ctx.save(); ctx.clip();
      ctx.fillStyle = C('#fff4e0'); ctx.fillRect(-30, -26, 60, 8); ctx.fillRect(-30, -46, 60, 5);
      ctx.fillStyle = 'rgba(80,40,0,0.25)'; circle(ctx, 8, -12, 4); ctx.fill();
      ctx.restore();
      ell(ctx, 0, 0, 32, 7); fs(ctx, lg(ctx, -32, 0, 32, 0, '#ff9a3a', '#c4550e'), '#5a2400', 3);
      highlight(ctx, -10, -22, 3, 14, 0.25, 0.4);
      ctx.restore();
    } else if (type === 'bucket') {
      ctx.save(); ctx.translate(-1, -24); ctx.rotate(-0.12);
      ctx.beginPath(); ctx.moveTo(-29, 3); ctx.lineTo(-23, -40); ctx.lineTo(23, -40); ctx.lineTo(29, 3); ctx.closePath();
      fs(ctx, lg(ctx, -29, 0, 29, 0, '#eef2f5', '#a2adb5', '#58636b'), '#22282c', 3);
      ell(ctx, 0, -40, 23, 5); fs(ctx, '#7d8890', '#22282c', 2.5);
      ctx.strokeStyle = C('#4a5258'); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-27, -9); ctx.lineTo(27, -9); ctx.moveTo(-25, -24); ctx.lineTo(25, -24); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -12, 32, Math.PI * 1.05, Math.PI * 1.95); ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = 'rgba(30,30,30,0.5)';
      if (frac < 0.67) { ell(ctx, -10, -18, 7, 5); ctx.fill(); ell(ctx, 14, -30, 4, 3); ctx.fill(); }
      if (frac < 0.34) { ell(ctx, 12, -10, 8, 6); ctx.fill(); ctx.beginPath(); ctx.moveTo(-21, -40); ctx.lineTo(-14, -30); ctx.lineTo(-8, -40); ctx.fill(); }
      highlight(ctx, -14, -24, 4, 13, 0.1, 0.55);
      ctx.restore();
    } else if (type === 'football') {
      ctx.save(); ctx.translate(-1, -4);
      ctx.beginPath(); ctx.arc(0, -8, 32, Math.PI * 0.93, Math.PI * 2.1); ctx.closePath();
      fs(ctx, rg(ctx, -8, -22, 36, '#ff6e5e', '#900c10'), '#3a0507', 3);
      ctx.fillStyle = C('#fff'); ctx.fillRect(-4, -40, 8, 32);
      ctx.fillStyle = C('#1a1a1a'); ctx.fillRect(-3, -40, 1.5, 32); ctx.fillRect(1.5, -40, 1.5, 32);
      if (frac < 0.5) { ctx.fillStyle = 'rgba(30,0,0,0.45)'; ell(ctx, 14, -20, 8, 5); ctx.fill(); ell(ctx, -18, -26, 5, 4); ctx.fill(); }
      ctx.strokeStyle = C('#d6d6d6'); ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-30, -2); ctx.quadraticCurveTo(-38, 12, -20, 24); ctx.moveTo(-31, 7); ctx.lineTo(-6, 9); ctx.moveTo(-27, 16); ctx.lineTo(-8, 18); ctx.stroke();
      highlight(ctx, -14, -28, 11, 5, -0.3, 0.45);
      ctx.restore();
    }
  }

  // ---------- Objetos que sostienen ----------
  function newspaper(ctx, frac) {
    ctx.save(); ctx.rotate(-0.06);
    rrect(ctx, -14, -38, 40, 70, 3); fs(ctx, lg(ctx, -14, 0, 26, 0, '#f8f5ea', '#cfc8b2'), '#3a3628', 2.5);
    ctx.fillStyle = '#4a4a4a'; ctx.fillRect(-9, -32, 30, 7);
    ctx.font = 'bold 6px Arial'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('ZOMBI', 6, -26.5);
    ctx.fillStyle = '#666';
    for (let i = 0; i < 7; i++) ctx.fillRect(-9, -20 + i * 7, i % 2 ? 20 : 30, 2.5);
    ctx.fillStyle = '#9a9a9a'; ctx.fillRect(10, -18, 11, 12);
    if (frac < 0.6) { ctx.fillStyle = C('#2a2a2a'); ctx.beginPath(); ctx.moveTo(26, -12); ctx.lineTo(14, 0); ctx.lineTo(26, 12); ctx.fill(); }
    if (frac < 0.3) { ctx.beginPath(); ctx.moveTo(-14, 20); ctx.lineTo(0, 12); ctx.lineTo(-14, 6); ctx.fill(); }
    ctx.restore();
  }
  function screenDoor(ctx, frac) {
    ctx.save();
    rrect(ctx, -40, -88, 62, 134, 3); fs(ctx, lg(ctx, -40, 0, 22, 0, '#f0f0ea', '#b8b8ae', '#7a7a72'), '#2a2a26', 3);
    // malla
    ctx.save(); ctx.beginPath(); ctx.rect(-33, -80, 48, 118); ctx.clip();
    ctx.fillStyle = 'rgba(70,80,90,0.55)'; ctx.fillRect(-33, -80, 48, 118);
    ctx.strokeStyle = 'rgba(210,220,230,0.5)'; ctx.lineWidth = 1;
    for (let x = -33; x < 16; x += 4) { ctx.beginPath(); ctx.moveTo(x, -80); ctx.lineTo(x, 38); ctx.stroke(); }
    for (let y = -80; y < 40; y += 4) { ctx.beginPath(); ctx.moveTo(-33, y); ctx.lineTo(15, y); ctx.stroke(); }
    if (frac < 0.67) { ctx.fillStyle = 'rgba(20,20,20,0.75)'; ctx.beginPath(); ctx.moveTo(-20, -60); ctx.lineTo(-6, -48); ctx.lineTo(-14, -34); ctx.lineTo(-28, -44); ctx.fill(); }
    if (frac < 0.34) { ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(14, 12); ctx.lineTo(4, 30); ctx.lineTo(-8, 14); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = '#4a4a44'; ctx.lineWidth = 3; ctx.strokeRect(-33, -80, 48, 118);
    ctx.fillStyle = '#4a4a44'; ctx.fillRect(-33, -22, 48, 5);
    circle(ctx, 12, -16, 3.5); fs(ctx, '#c8a030', '#3a2a00', 1.5);
    highlight(ctx, -30, -40, 3, 30, 0, 0.35);
    ctx.restore();
  }
  function telephonePole(ctx) {
    ctx.save();
    rrect(ctx, -9, -150, 18, 170, 6); fs(ctx, lg(ctx, -9, 0, 9, 0, '#9a6a3a', '#6a4220', '#3e2610'), '#24140a', 3);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-26, -140, 52, 8);
    ctx.fillStyle = '#6ab0d8'; for (const x of [-22, 18]) { circle(ctx, x, -144, 4); ctx.fill(); }
    ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 1.5;
    for (let y = -120; y < 10; y += 22) { ctx.beginPath(); ctx.moveTo(-6, y); ctx.lineTo(4, y + 6); ctx.stroke(); }
    ctx.restore();
  }

  // ==================================================================
  //  Zombi completo (origen: entre los pies, en el suelo)
  // ==================================================================
  function zombie(ctx, z, t) {
    const type = z.type;
    const L = z.look || DEFAULT_LOOK;
    const g = gait(z);
    const state = z.state;
    const moving = state === 'walk' || state === 'lane';
    const eating = state === 'eat';
    const dying = state === 'dying';
    const ph = (z.animT || 0) * g.freq + L.phase;
    const isImp = type === 'imp', isGarg = type === 'gargantuar';
    const big = isGarg ? 1.75 : isImp ? 0.66 : 1;

    // dimensiones
    const LEG = 32, legW = isGarg ? 17 : 13, armW = isGarg ? 15 : 11;
    // colores según tipo
    let coat = L.coat, pants = L.pants[0], pants2 = L.pants[1], shoe = ['#4a3424', '#1e140c'];
    let legOpt = { skin: L.skin[0], shoe, laces: false };
    let bareArms = false, sleeve = coat[0], sleeve2 = coat[1];
    if (type === 'pole') { pants = '#d0332a'; pants2 = '#8a1a14'; legOpt = { skin: L.skin[0], shoe: ['#f4f4f0', '#a0a09a'], shorts: true, socks: true, laces: true }; bareArms = true; }
    if (type === 'football') { pants = '#e8e8e2'; pants2 = '#a8a8a0'; legOpt = { skin: L.skin[0], shoe: ['#2a2a2a', '#0a0a0a'], laces: true }; sleeve = '#c4161c'; sleeve2 = '#7a0a0e'; }
    if (type === 'paper') { coat = ['#7f805a', '#4a4b30']; sleeve = coat[0]; sleeve2 = coat[1]; pants = '#6b5a42'; pants2 = '#3e3324'; legOpt = { skin: L.skin[0], shoe: ['#8a3a4a', '#4a1a24'] }; }
    if (isImp) { pants = '#5a4a8a'; pants2 = '#30264a'; legOpt = { skin: L.skin[0], barefoot: true, shorts: true }; bareArms = true; }
    if (isGarg) { pants = '#4a5a72'; pants2 = '#28324a'; legOpt = { skin: L.skin[0], shoe: ['#3a2a1a', '#140c06'] }; bareArms = true; }

    ctx.save();
    ctx.scale(big * L.scale, big * L.scale);

    // ----- piernas -----
    let a1L, a1R, bL, bR;
    if (moving) {
      const sL = Math.sin(ph), sR = Math.sin(ph + Math.PI);
      a1L = g.stride * sL; a1R = g.stride * sR;
      bL = 0.1 + Math.max(0, Math.cos(ph)) * g.stride * 1.7;
      bR = 0.1 + Math.max(0, Math.cos(ph + Math.PI)) * g.stride * 1.7;
    } else if (eating) {
      a1L = 0.28; a1R = -0.22; bL = 0.35; bR = 0.15;
    } else if (state === 'jump') {
      a1L = 0.9; a1R = 0.5; bL = 1.4; bR = 1.0;
    } else if (state === 'smash') {
      a1L = 0.35; a1R = -0.3; bL = 0.5; bR = 0.2;
    } else if (dying) {
      const k = clamp(z.dieT / 0.4, 0, 1);
      a1L = 0.15 + k * 0.5; a1R = -0.1 + k * 0.3; bL = 0.1 + k * 1.2; bR = 0.1 + k * 0.9;
    } else {
      const sway = Math.sin((z.animT || 0) * 1.6 + L.phase) * 0.04;
      a1L = 0.12 + sway; a1R = -0.1 + sway; bL = 0.12; bR = 0.1;
    }
    // altura de cadera para que el pie de apoyo toque el suelo
    const footY = (a, b) => Math.cos(a) * LEG + Math.cos(a - b) * LEG;
    let hipY = -Math.max(footY(a1L, bL), footY(a1R, bR));
    if (g.hop && moving) hipY -= Math.abs(Math.sin(ph)) * g.hop;
    hipY += 2;
    // pierna trasera (más oscura)
    leg(ctx, 5, hipY, a1R, bR, LEG, legW, pants2, Object.assign({}, legOpt, { skin: L.skin[1] }));

    // ----- torso -----
    const hit = z.hitT > 0 ? z.hitT / 0.12 : 0;
    let lean = g.lean + (moving ? Math.sin(ph * 2) * 0.035 : 0) + hit * 0.12;
    if (eating) lean = -0.16 + Math.sin((z.animT || 0) * 10) * 0.05;
    if (state === 'smash') { const k = z.smashK || 0; lean = k < 0.6 ? 0.15 * (k / 0.6) : 0.15 - (k - 0.6) / 0.4 * 0.45; }
    if (dying) lean = -0.05 - clamp(z.dieT / 0.4, 0, 1) * 0.15;
    if (state === 'stun') lean = 0.05;

    ctx.save(); ctx.translate(0, hipY); ctx.rotate(lean);
    const TH = isImp ? 50 : 58, TW = isGarg ? 30 : 23;
    // brazo trasero
    const armPh = moving ? Math.sin(ph + 1.3) * 0.12 : 0;
    let ba = 1.38 + armPh, bb = -0.12;
    if (eating) { ba = 2.0 + Math.sin((z.animT || 0) * 10 + 1) * 0.22; bb = -0.5; }
    if (dying) { ba = 0.4; bb = 0.1; }
    if (type === 'flag') { ba = 2.5; bb = 0.1; }
    if (type === 'paper' && z.armor > 0) { ba = 1.15; bb = -0.75; }
    if (type === 'screendoor' && z.armor > 0) { ba = 1.2; bb = -0.6; }
    if (type === 'football') { ba = moving ? 0.9 + Math.sin(ph + Math.PI) * 0.7 : 1.2; bb = -1.2; }
    if (isGarg) { ba = state === 'smash' ? smashAngle(z) : 2.2 + Math.sin(ph) * 0.06; bb = -0.2; }
    if (type === 'pole' && z.hasPole && state !== 'jump') { ba = 0.9; bb = -1.1; }
    if (type === 'flag') {
      // asta con bandera hecha jirones
      const fx = 4 - Math.sin(ba) * 26 - Math.sin(ba + bb) * 25, fy = -TH + 4 + Math.cos(ba) * 26 + Math.cos(ba + bb) * 25;
      line(ctx, [fx, fy + 70, fx + 2, fy - 120], 4.5, '#6b4a2a', ZO, 2);
      ctx.save(); ctx.translate(fx + 2, fy - 118);
      const w1 = Math.sin(t * 5) * 5, w2 = Math.sin(t * 5 + 1.5) * 5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-26, -8 + w1, -56, 2 + w2); ctx.lineTo(-50, 14); ctx.lineTo(-58, 22); ctx.lineTo(-52, 32);
      ctx.lineTo(-56, 44 + w2); ctx.quadraticCurveTo(-26, 34 + w1, 0, 42); ctx.closePath();
      fs(ctx, lg(ctx, 0, 0, -56, 40, '#f4efe0', '#c2b89e'), ZO, 2.5);
      ctx.save(); ctx.clip();
      ctx.fillStyle = C('#a8201a'); ctx.fillRect(-64, 6, 70, 5); ctx.fillRect(-64, 30, 70, 5);
      ctx.restore();
      // cerebro
      ell(ctx, -28, 21, 12, 9); fs(ctx, '#f2a6b6', '#7a2a3a', 2);
      ctx.strokeStyle = '#a84a5a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-28, 13); ctx.lineTo(-28, 29); ctx.moveTo(-36, 18); ctx.quadraticCurveTo(-32, 22, -36, 26); ctx.moveTo(-20, 18); ctx.quadraticCurveTo(-24, 22, -20, 26); ctx.stroke();
      ctx.restore();
    }
    if (isGarg) {
      // poste en el brazo trasero
      const ex = 8 - Math.sin(ba) * 34, ey = -TH - 6 + Math.cos(ba) * 34;
      const hx = ex - Math.sin(ba + bb) * 32, hy = ey + Math.cos(ba + bb) * 32;
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(-(ba + bb) + Math.PI); telephonePole(ctx); ctx.restore();
    }
    if (type === 'pole' && z.hasPole && state !== 'jump') {
      line(ctx, [-95, -TH + 20, 110, -TH + 34], 5, '#d8b060', '#4a3510', 2);
    }
    arm(ctx, 6, -TH + 4, ba, bb, isGarg ? 34 : 26, armW, sleeve2, L.skin[1], { bare: bareArms, hand: isGarg ? 1.5 : 1, grab: eating });

    // diablillo a la espalda del Gargantúa
    if (isGarg && z.hasImp) {
      ctx.save(); ctx.translate(30, -TH + 30); ctx.rotate(0.2); ctx.scale(0.36, 0.36);
      zombie(ctx, { type: 'imp', look: z.impLook || DEFAULT_LOOK, state: 'idle', animT: z.animT, armor: 0, armorMax: 1 }, t);
      ctx.restore();
    }

    // cuerpo
    if (isImp) {
      ctx.beginPath(); ctx.moveTo(-16, 2); ctx.lineTo(-19, -TH + 6); ctx.quadraticCurveTo(0, -TH - 6, 18, -TH + 6); ctx.lineTo(16, 2); ctx.closePath();
      fs(ctx, rg(ctx, -4, -TH / 2, 30, L.skin[0], L.skin[1]), ZO, 3);
      ctx.strokeStyle = C('#3a5a8a'); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-2, -26, 6, 0, TAU); ctx.moveTo(-6, -22); ctx.lineTo(2, -30); ctx.stroke();
      ctx.fillStyle = C(pants); ctx.fillRect(-17, -6, 34, 10); ctx.strokeStyle = C(ZO); ctx.lineWidth = 2; ctx.strokeRect(-17, -6, 34, 10);
    } else if (isGarg) {
      ctx.beginPath(); ctx.moveTo(-26, 4); ctx.bezierCurveTo(-40, -30, -34, -TH - 4, -6, -TH - 8); ctx.quadraticCurveTo(26, -TH - 6, 30, -TH + 14);
      ctx.bezierCurveTo(34, -30, 30, -6, 24, 4); ctx.closePath();
      fs(ctx, rg(ctx, -10, -30, 50, L.skin[0], L.skin[1]), ZO, 3.5);
      // camiseta rota
      ctx.beginPath(); ctx.moveTo(-28, -10); ctx.lineTo(-30, -TH + 4); ctx.lineTo(-16, -TH - 4); ctx.lineTo(-4, -40); ctx.lineTo(8, -TH - 6); ctx.lineTo(24, -TH + 6);
      ctx.lineTo(28, -12); ctx.lineTo(18, -4); ctx.lineTo(10, -12); ctx.lineTo(0, -2); ctx.lineTo(-10, -12); ctx.lineTo(-18, -4); ctx.closePath();
      fs(ctx, lg(ctx, -30, 0, 28, 0, '#e8e2c8', '#a8a088'), ZO, 2.5);
      ctx.fillStyle = 'rgba(120,80,40,0.35)'; ell(ctx, 6, -26, 6, 4); ctx.fill(); ell(ctx, -14, -18, 4, 3); ctx.fill();
      // cinturón
      ctx.fillStyle = C('#3a2414'); ctx.fillRect(-27, -4, 52, 9); ctx.strokeStyle = C(ZO); ctx.lineWidth = 2; ctx.strokeRect(-27, -4, 52, 9);
      rrect(ctx, -6, -5, 12, 11, 2); fs(ctx, '#c8a030', '#3a2a00', 1.5);
    } else {
      // chaqueta con bajo deshilachado
      const c1 = type === 'pole' ? '#f2f2ec' : type === 'football' ? '#c4161c' : coat[0];
      const c2 = type === 'pole' ? '#b0b0a8' : type === 'football' ? '#6a0a0d' : coat[1];
      ctx.beginPath();
      ctx.moveTo(-TW + 1, 4);
      ctx.lineTo(-TW - 2, -TH + 6); ctx.quadraticCurveTo(0, -TH - 6, TW, -TH + 6); ctx.lineTo(TW - 2, 4);
      ctx.lineTo(TW - 7, 10); ctx.lineTo(TW - 12, 3); ctx.lineTo(4, 11); ctx.lineTo(-2, 3); ctx.lineTo(-8, 9); ctx.lineTo(-14, 2); ctx.lineTo(-19, 8);
      ctx.closePath();
      fs(ctx, lg(ctx, -TW, 0, TW, 0, c1, c2), ZO, 3);
      if (type === 'pole') {
        ctx.fillStyle = C('#d0332a'); ctx.fillRect(-TW, -TH + 18, TW * 2 - 1, 7);
        UIText(ctx, '7', 0, -20, 18, '#222');
      } else if (type === 'football') {
        UIText(ctx, '99', 0, -24, 20, '#fff');
        ctx.fillStyle = C('#fff'); ctx.fillRect(-TW + 2, -10, TW * 2 - 4, 4);
      } else {
        // camisa, solapas y corbata
        ctx.beginPath(); ctx.moveTo(-11, -TH + 2); ctx.lineTo(1, -TH + 30); ctx.lineTo(13, -TH + 2); ctx.closePath();
        fs(ctx, '#e8e3c8', ZO, 2);
        ctx.fillStyle = 'rgba(120,90,40,0.35)'; ell(ctx, 4, -TH + 16, 3, 4); ctx.fill();
        ctx.save(); ctx.translate(1, -TH + 5); ctx.rotate(moving ? Math.sin(ph) * 0.18 : eating ? 0.2 : 0);
        ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.lineTo(5, 24); ctx.lineTo(2, 30); ctx.lineTo(0, 26); ctx.lineTo(-3, 31); ctx.lineTo(-5, 24); ctx.closePath();
        fs(ctx, L.tie, ZO, 1.5);
        ctx.restore();
        ctx.fillStyle = C(coat[1]);
        ctx.beginPath(); ctx.moveTo(-12, -TH + 1); ctx.lineTo(-4, -TH + 26); ctx.lineTo(-14, -TH + 14); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(14, -TH + 1); ctx.lineTo(6, -TH + 26); ctx.lineTo(16, -TH + 14); ctx.closePath(); ctx.fill();
        // botón, bolsillo, remiendo y manchas
        circle(ctx, -7, -16, 2.2); ctx.fillStyle = C('#2a1a0a'); ctx.fill();
        ctx.strokeStyle = C(ZO); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(8, -18); ctx.lineTo(18, -18); ctx.stroke();
        ctx.fillStyle = C('#5c4a6a'); ctx.fillRect(9, -12, 8, 8);
        ctx.strokeStyle = C('#d8cfa8'); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(9, -8); ctx.lineTo(17, -8); ctx.moveTo(13, -12); ctx.lineTo(13, -4); ctx.stroke();
        ctx.fillStyle = 'rgba(60,30,10,0.25)'; ell(ctx, -14, -30, 5, 7); ctx.fill();
      }
      // hombreras del futbolista
      if (type === 'football' && z.armor > 0) {
        ell(ctx, 0, -TH + 2, TW + 10, 13); fs(ctx, rg(ctx, -4, -TH - 2, TW + 10, '#ff6a5a', '#7a0a0e'), '#3a0507', 3);
        ctx.fillStyle = C('#fff'); ctx.fillRect(-TW - 6, -TH + 2, 2 * TW + 12, 3);
      }
    }

    // ----- cabeza -----
    if (!z.headless) {
      const hr = isGarg ? 0.85 : isImp ? 1.25 : 1;
      let hRot = (moving ? Math.sin(ph - 0.9) * 0.09 : Math.sin((z.animT || 0) * 1.3 + L.phase) * 0.05) + 0.06;
      let hx = -8, hy = -TH - 22;
      if (eating) { hRot = 0.18 + Math.sin((z.animT || 0) * 10) * 0.1; hx -= 4 + Math.sin((z.animT || 0) * 10) * 3; }
      if (dying) hRot = 0.5 * clamp(z.dieT / 0.4, 0, 1);
      if (isGarg) { hx = -10; hy = -TH - 12; }
      // cuello
      line(ctx, [hx + 6, hy + 18, 2, -TH + 2], isGarg ? 14 : 9, L.skin[1], ZO, 2.5);
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(hRot); ctx.scale(hr, hr);
      let jaw = 0.1 + Math.sin((z.animT || 0) * 2.2 + L.phase) * 0.05;
      if (eating) jaw = 0.12 + Math.max(0, Math.sin((z.animT || 0) * 10)) * 0.32;
      if (dying) jaw = 0.35;
      if (state === 'smash') jaw = 0.35;
      head(ctx, z, L, jaw, { dead: dying && z.dieT > 0.3, noHair: type === 'football' || type === 'imp' });
      headArmor(ctx, type, z.armor > 0 ? z.armor / z.armorMax : 0);
      ctx.restore();
    }

    // ----- objetos delante -----
    if (type === 'paper' && z.armor > 0) { ctx.save(); ctx.translate(-50, -TH + 6); newspaper(ctx, z.armor / z.armorMax); ctx.restore(); }
    if (type === 'screendoor' && z.armor > 0) { ctx.save(); ctx.translate(-44, -TH + 30); screenDoor(ctx, z.armor / z.armorMax); ctx.restore(); }

    // brazo delantero
    let fa = 1.45 + (moving ? Math.sin(ph + 0.4) * 0.14 : Math.sin((z.animT || 0) * 1.4) * 0.04), fb = -0.15;
    if (eating) { fa = 2.05 + Math.sin((z.animT || 0) * 10) * 0.25; fb = -0.55; }
    if (dying) { fa = 0.3; fb = 0.15; }
    if (type === 'paper' && z.armor > 0) { fa = 1.05; fb = -0.95; }
    if (type === 'screendoor' && z.armor > 0) { fa = 1.15; fb = -0.75; }
    if (type === 'football') { fa = moving ? 0.9 + Math.sin(ph) * 0.7 : 1.3; fb = -1.2; }
    if (type === 'pole' && z.hasPole && state !== 'jump') { fa = 1.1; fb = -1.2; }
    if (state === 'jump') { fa = 2.8; fb = 0; }
    if (isGarg) { fa = 1.3 + (moving ? Math.sin(ph) * 0.15 : 0); fb = -0.3; }
    if (isImp) { fa = moving ? 1.2 + Math.sin(ph) * 0.6 : 1.4; fb = -0.8; }
    arm(ctx, -10, -TH + 4, fa, fb, isGarg ? 36 : 26, armW, sleeve, L.skin, { lost: z.lostArm, bare: bareArms, hand: isGarg ? 1.5 : 1, grab: eating });

    ctx.restore(); // torso

    // pierna delantera
    leg(ctx, -5, hipY, a1L, bL, LEG, legW, pants, legOpt);
    ctx.restore();
  }
  function smashAngle(z) {
    const k = z.smashK || 0;
    // levanta el poste (ángulo grande = hacia arriba-delante) y golpea
    if (k < 0.55) return 2.2 + (k / 0.55) * 1.1;
    return 3.3 - Math.min(1, (k - 0.55) / 0.15) * 2.2;
  }
  function UIText(ctx, s, x, y, size, col) {
    ctx.font = `bold ${size}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = C(col); ctx.fillText(s, x, y);
  }

  // Cabeza suelta / brazo suelto (partículas)
  function zombieHead(ctx, z, alive) {
    const L = z.look || DEFAULT_LOOK;
    if (z.type === 'gargantuar') ctx.scale(1.3, 1.3);
    head(ctx, z, L, alive ? 0.15 : 0.3, { dead: !alive, noHair: z.type === 'football' || z.type === 'imp' });
    headArmor(ctx, z.type, z.armor > 0 ? z.armor / z.armorMax : 0);
  }
  function zombieArm(ctx, z) {
    const L = (z && z.look) || DEFAULT_LOOK;
    arm(ctx, 0, 0, 1.5, -0.2, 24, 11, L.coat[0], L.skin, {});
  }
  function armorPiece(ctx, type) {
    if (type === 'paper') { newspaper(ctx, 0.2); return; }
    if (type === 'screendoor') { ctx.scale(0.8, 0.8); screenDoor(ctx, 0.2); return; }
    headArmor(ctx, type, 0.2);
  }
  // Bloque de hielo para zombis congelados
  function iceBlock(ctx, z, t) {
    const s = (z.type === 'gargantuar' ? 1.75 : z.type === 'imp' ? 0.66 : 1);
    ctx.save(); ctx.scale(s, s);
    rrect(ctx, -40, -170, 78, 172, 12);
    ctx.fillStyle = 'rgba(170,225,255,0.38)'; ctx.fill();
    ctx.strokeStyle = 'rgba(230,250,255,0.85)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.moveTo(-32, -160); ctx.lineTo(-18, -160); ctx.lineTo(-34, -100); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  Object.assign(Art, { zombie, zombieHead, zombieArm, armorPiece, iceBlock, zombieLook: look, gait, stepPulse });
})();

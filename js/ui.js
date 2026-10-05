'use strict';
// =====================================================================
//  Utilidades de interfaz dibujadas en el canvas (botones, sobres, texto)
// =====================================================================
const UI = {
  hits: [],
  mouse: { x: -1, y: -1 },
  FONT: '"Luckiest Guy", "Arial Black", "Trebuchet MS", sans-serif',
  BODY: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',

  reset() { this.hits.length = 0; },
  region(x, y, w, h, fn) { this.hits.push({ x, y, w, h, fn }); },
  find(x, y) {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i];
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h;
    }
    return null;
  },
  hit(x, y) { const h = this.find(x, y); if (h) { h.fn(); return true; } return false; },
  isOver(x, y, w, h) { const m = this.mouse; return m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h; },

  text(ctx, str, x, y, size, o = {}) {
    const { fill = '#fff', stroke = '#2a1a08', lw = Math.max(3, size / 7), align = 'center', font = this.FONT, weight = '' } = o;
    ctx.font = `${weight} ${size}px ${font}`.trim();
    ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.strokeText(str, x, y); }
    ctx.fillStyle = fill; ctx.fillText(str, x, y);
  },

  // Botón estilo «pastilla» elegante: crema con icono de color y borde dorado al pasar
  button(ctx, x, y, w, h, label, fn, o = {}) {
    const { size = 30, color = 'green', disabled = false } = o;
    const over = !disabled && this.isOver(x, y, w, h);
    const icon = { green: ['#6bc25a', '#2e7a2a'], red: ['#e8604a', '#9a2a1a'], orange: ['#f0b44a', '#a8641a'], stone: ['#9aa2b4', '#4e566a'] }[color];
    const r = h / 2;
    ctx.save();
    if (over) { ctx.translate(x + w / 2, y + h / 2); ctx.scale(1.03, 1.03); ctx.translate(-(x + w / 2), -(y + h / 2)); }
    Art.rrect(ctx, x + 2, y + 5, w, h, r); ctx.fillStyle = 'rgba(10,12,24,0.35)'; ctx.fill();
    if (over) { ctx.save(); ctx.shadowColor = 'rgba(255,230,160,0.9)'; ctx.shadowBlur = 18; Art.rrect(ctx, x, y, w, h, r); ctx.fillStyle = '#fff5dc'; ctx.fill(); ctx.restore(); }
    Art.rrect(ctx, x, y, w, h, r);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    if (disabled) { g.addColorStop(0, '#8a8e98'); g.addColorStop(1, '#5e626c'); }
    else { g.addColorStop(0, '#f6f0e4'); g.addColorStop(1, '#d9cfbc'); }
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = over ? '#ffe6a8' : 'rgba(80,70,50,0.35)'; ctx.stroke();
    // icono redondo a la izquierda
    const cx = x + r, cy = y + h / 2, ir = r * 0.62;
    ctx.beginPath(); ctx.arc(cx, cy, ir, 0, Math.PI * 2);
    const ig = ctx.createRadialGradient(cx - ir * 0.3, cy - ir * 0.3, 1, cx, cy, ir);
    ig.addColorStop(0, disabled ? '#aaa' : icon[0]); ig.addColorStop(1, disabled ? '#666' : icon[1]);
    ctx.fillStyle = ig; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(cx, cy - ir * 0.55); ctx.lineTo(cx + ir * 0.4, cy); ctx.lineTo(cx, cy + ir * 0.55); ctx.lineTo(cx - ir * 0.4, cy); ctx.closePath(); ctx.fill();
    this.text(ctx, label, x + h * 0.9 + (w - h * 0.9) / 2, y + h / 2 + 1, Math.min(size * 0.92, (w - h) / Math.max(4, label.length) * 1.9), { fill: disabled ? '#2a2e38' : '#3b4255', stroke: null, font: this.FONT });
    ctx.restore();
    if (!disabled) this.region(x, y, w, h, fn);
  },

  // Panel azul noche translúcido con ribetes dorados y adornos en las esquinas
  panel(ctx, x, y, w, h) {
    Art.rrect(ctx, x, y + 10, w, h, 22); ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fill();
    Art.rrect(ctx, x, y, w, h, 22);
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(46,54,78,0.97)'); g.addColorStop(1, 'rgba(22,26,40,0.97)');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#d3bc8e'; ctx.stroke();
    ctx.save(); Art.rrect(ctx, x, y, w, h, 22); ctx.clip();
    const lg2 = ctx.createRadialGradient(x + w / 2, y - h * 0.2, 10, x + w / 2, y, w * 0.7);
    lg2.addColorStop(0, 'rgba(255,230,170,0.16)'); lg2.addColorStop(1, 'rgba(255,230,170,0)');
    ctx.fillStyle = lg2; ctx.fillRect(x, y, w, h);
    ctx.restore();
    Art.rrect(ctx, x + 10, y + 10, w - 20, h - 20, 16); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(211,188,142,0.45)'; ctx.stroke();
    // adornos de esquina
    ctx.fillStyle = '#e8d3a0';
    for (const [cx, cy] of [[x + 10, y + 10], [x + w - 10, y + 10], [x + 10, y + h - 10], [x + w - 10, y + h - 10]]) {
      ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx + 8, cy); ctx.lineTo(cx, cy + 8); ctx.lineTo(cx - 8, cy); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#2e364e'; ctx.fill(); ctx.fillStyle = '#e8d3a0';
    }
    ctx.strokeStyle = 'rgba(211,188,142,0.6)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + w / 2 - 90, y + 4); ctx.lineTo(x + w / 2 + 90, y + 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w / 2, y - 6); ctx.lineTo(x + w / 2 + 10, y + 4); ctx.lineTo(x + w / 2, y + 14); ctx.lineTo(x + w / 2 - 10, y + 4); ctx.closePath();
    ctx.fillStyle = '#e8d3a0'; ctx.fill();
  },
  star(ctx, x, y, r, col = '#ffd45a') {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(90,50,0,0.6)'; ctx.stroke();
  },
  rarity(type) { const c = PLANTS[type] ? PLANTS[type].cost : 100; return c <= 75 ? 3 : c <= 175 ? 4 : 5; },

  packetCache: {},
  // El dibujo base del sobre se guarda como imagen a la resolución real
  packetImage(type, premium) {
    const k = (typeof App !== 'undefined' ? App.scale * App.dpr : 1) || 1;
    const key = type + (premium ? '*' : '') + '@' + k.toFixed(3);
    let c = this.packetCache[key];
    if (c) return c;
    c = document.createElement('canvas');
    c.width = Math.ceil(84 * k); c.height = Math.ceil(116 * k);
    const g = c.getContext('2d');
    g.setTransform(k, 0, 0, k, 0, 0);
    this.packetBase(g, type, premium);
    this.packetCache[key] = c;
    return c;
  },
  packet(ctx, x, y, type, t, o = {}) {
    const w = 84, h = 116;
    ctx.save();
    if (o.hover) y -= 4;
    if (o.selected) ctx.globalAlpha = 0.55;
    ctx.drawImage(this.packetImage(type, o.premium), x, y, w, h);
    if (o.ready > 0) { ctx.save(); Art.rrect(ctx, x, y, w, h, 9); ctx.fillStyle = `rgba(255,255,220,${o.ready})`; ctx.fill(); ctx.restore(); }
    if (o.cd > 0) {
      ctx.save(); Art.rrect(ctx, x, y, w, h, 9); ctx.clip();
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x, y, w, h * o.cd);
      ctx.restore();
    }
    if (o.poor) { Art.rrect(ctx, x, y, w, h, 9); ctx.fillStyle = 'rgba(40,40,40,0.45)'; ctx.fill(); }
    if (o.key !== undefined && !o.poor && !(o.cd > 0)) {
      this.text(ctx, String(o.key), x + 12, y + 14, 14, { fill: '#fff', stroke: '#333', lw: 3, font: this.BODY, weight: 'bold' });
    }
    ctx.restore();
    if (o.selected) { Art.rrect(ctx, x - 2, y - 2, w + 4, h + 4, 10); ctx.lineWidth = 3; ctx.strokeStyle = '#fff6a0'; ctx.stroke(); }
  },
  packetBase(ctx, type, premium) {
    const x = 0, y = 0, w = 84, h = 116;
    const rar = this.rarity(type);
    const goth = PLANTS[type] && PLANTS[type].origin === 'gothic';
    const bg = { 3: ['#5a7cb0', '#2b3d63'], 4: ['#8a66c8', '#3c2c6a'], 5: ['#d4a258', '#7a4a1e'] }[rar];
    Art.rrect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 8);
    const g = ctx.createLinearGradient(0, y, 0, y + h - 26); g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); Art.rrect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 8); ctx.clip();
    // brillo radial detrás de la planta y destellos
    const rg2 = ctx.createRadialGradient(w / 2, h * 0.42, 4, w / 2, h * 0.42, 44);
    rg2.addColorStop(0, 'rgba(255,255,240,0.45)'); rg2.addColorStop(1, 'rgba(255,255,240,0)');
    ctx.fillStyle = rg2; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(w / 2, h * 0.42); ctx.lineTo(w / 2 + Math.cos(i * 0.8) * 70, h * 0.42 + Math.sin(i * 0.8) * 70); ctx.stroke(); }
    if (goth) { const gg = ctx.createLinearGradient(0, 0, w, h); gg.addColorStop(0, 'rgba(120,0,40,0.45)'); gg.addColorStop(0.6, 'rgba(120,0,40,0)'); ctx.fillStyle = gg; ctx.fillRect(0, 0, w, h); }
    ctx.restore();
    // planta
    ctx.save();
    Art.rrect(ctx, x + 3, y + 3, w - 6, h - 30, 6); ctx.clip();
    const tall = { tallnut: 0.42, threepeater: 0.46, chomper: 0.44, jalapeno: 0.5, gatling: 0.5, twinsunflower: 0.5, torchwood: 0.48, melonpult: 0.5, wintermelon: 0.5, magnet: 0.5, doomshroom: 0.5, iceshroom: 0.54, garlic: 0.6, spikeweed: 0.7,
      fallenangel: 0.42, lilith: 0.42, reaper: 0.44, wraith: 0.44, demon: 0.48, demongirl: 0.46, gargoyle: 0.48 }[type] || 0.56;
    ctx.translate(x + w / 2 - 2, y + h - 34); ctx.scale(tall, tall);
    Art.plant(ctx, type, 0, { armed: true });
    ctx.restore();
    // estrellas de rareza
    for (let i = 0; i < rar; i++) this.star(ctx, w / 2 + (i - (rar - 1) / 2) * 11, h - 33, 5);
    // franja inferior color crema con el coste
    ctx.save(); Art.rrect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 8); ctx.clip();
    ctx.fillStyle = '#ece5d8'; ctx.fillRect(0, h - 26, w, 26);
    ctx.restore();
    this.text(ctx, String(PLANTS[type].cost), x + w / 2, y + h - 13, 19, { fill: '#3b4255', stroke: null, font: this.FONT });
    Art.rrect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 8); ctx.lineWidth = 2; ctx.strokeStyle = goth ? '#e05a7a' : '#efe2c2'; ctx.stroke();
    if (premium) {
      ctx.save(); Art.rrect(ctx, x, y, w, h, 9); ctx.clip();
      ctx.translate(x + w - 18, y + 16); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#e8b81a'; ctx.fillRect(-40, -9, 80, 18);
      ctx.fillStyle = '#7a4a00'; ctx.fillRect(-40, -9, 80, 2); ctx.fillRect(-40, 7, 80, 2);
      this.text(ctx, 'GRATIS', 0, 1, 11, { fill: '#fff', stroke: '#7a4a00', lw: 3, font: this.BODY, weight: 'bold' });
      ctx.restore();
    }
  },

  shovel(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    Art.line(ctx, [0, -44, 0, 6], 7, '#a8743a', '#3a2008', 2.5);
    Art.rrect(ctx, -12, -54, 24, 12, 4); Art.fs(ctx, '#8a5a2a', '#3a2008', 2.5);
    ctx.beginPath(); ctx.moveTo(-18, 4); ctx.lineTo(18, 4); ctx.lineTo(16, 30); ctx.quadraticCurveTo(0, 50, -16, 30); ctx.closePath();
    Art.fs(ctx, Art.lg(ctx, -18, 0, 18, 0, '#f2f4f6', '#9aa4ac', '#5c666e'), '#262c30', 2.5);
    Art.highlight(ctx, -7, 18, 3, 10, 0, 0.5);
    ctx.restore();
  },

  trophy(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const gold = Art.lg(ctx, -40, 0, 40, 0, '#fff3a0', '#f2c21a', '#a8740a');
    ctx.beginPath(); ctx.moveTo(-40, -50); ctx.lineTo(40, -50); ctx.quadraticCurveTo(40, 10, 0, 18); ctx.quadraticCurveTo(-40, 10, -40, -50); ctx.closePath();
    Art.fs(ctx, gold, '#5a3a00', 3);
    ctx.lineWidth = 7; ctx.strokeStyle = '#d8a018';
    ctx.beginPath(); ctx.arc(-44, -30, 14, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(44, -30, 14, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    ctx.fillStyle = gold; ctx.fillRect(-8, 16, 16, 20);
    Art.rrect(ctx, -30, 34, 60, 16, 4); Art.fs(ctx, gold, '#5a3a00', 3);
    ctx.save(); ctx.translate(0, -16); ctx.scale(0.38, 0.38); Art.plant(ctx, 'sunflower', 0, {}); ctx.restore();
    ctx.restore();
  },
};

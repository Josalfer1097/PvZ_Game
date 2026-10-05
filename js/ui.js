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

  button(ctx, x, y, w, h, label, fn, o = {}) {
    const { size = 30, color = 'green', disabled = false } = o;
    const over = !disabled && this.isOver(x, y, w, h);
    const pal = {
      green: ['#9be05a', '#4f9a22', '#25520c'],
      red: ['#ff8a6a', '#d0361a', '#5a1005'],
      orange: ['#ffcf6a', '#e08a1a', '#5a3005'],
      stone: ['#c9c9c0', '#7d7d74', '#2e2e28'],
    }[color];
    ctx.save();
    if (over) { ctx.translate(x + w / 2, y + h / 2); ctx.scale(1.04, 1.04); ctx.translate(-(x + w / 2), -(y + h / 2)); }
    Art.rrect(ctx, x, y + 5, w, h, h * 0.3); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
    Art.rrect(ctx, x, y, w, h, h * 0.3);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, disabled ? '#999' : pal[0]); g.addColorStop(1, disabled ? '#555' : pal[1]);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = disabled ? '#333' : pal[2]; ctx.stroke();
    Art.rrect(ctx, x + 6, y + 4, w - 12, h * 0.38, h * 0.2); ctx.fillStyle = `rgba(255,255,255,${over ? 0.35 : 0.22})`; ctx.fill();
    this.text(ctx, label, x + w / 2, y + h / 2 + 2, size, { fill: disabled ? '#ccc' : '#fff', stroke: disabled ? '#333' : pal[2], lw: size / 5 });
    ctx.restore();
    if (!disabled) this.region(x, y, w, h, fn);
  },

  panel(ctx, x, y, w, h) {
    Art.rrect(ctx, x, y + 8, w, h, 26); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    Art.rrect(ctx, x, y, w, h, 26);
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#8c5c2e'); g.addColorStop(1, '#5a3614');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#2a1605'; ctx.stroke();
    ctx.save(); Art.rrect(ctx, x, y, w, h, 26); ctx.clip();
    ctx.globalAlpha = 0.18; ctx.fillStyle = '#000';
    for (let yy = y + 30; yy < y + h; yy += 44) ctx.fillRect(x, yy, w, 3);
    ctx.restore();
    Art.rrect(ctx, x + 12, y + 12, w - 24, h - 24, 18); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,220,160,0.35)'; ctx.stroke();
  },

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
    const goth = PLANTS[type] && PLANTS[type].origin === 'gothic';
    Art.rrect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 9);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    if (goth) { g.addColorStop(0, '#4a2048'); g.addColorStop(1, '#14060f'); } else { g.addColorStop(0, '#fbf6d8'); g.addColorStop(1, '#d6c789'); }
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = goth ? '#b0203a' : '#4c6a1c'; ctx.stroke();
    Art.rrect(ctx, x + 5, y + 5, w - 10, h - 36, 6); ctx.fillStyle = goth ? 'rgba(160,30,80,0.25)' : 'rgba(120,180,70,0.22)'; ctx.fill();
    if (goth) { ctx.strokeStyle = 'rgba(230,180,90,0.6)'; ctx.lineWidth = 1.2; Art.rrect(ctx, x + 4, y + 4, w - 8, h - 8, 7); ctx.stroke(); }
    ctx.save();
    Art.rrect(ctx, x + 3, y + 3, w - 6, h - 32, 6); ctx.clip();
    const tall = { tallnut: 0.42, threepeater: 0.46, chomper: 0.44, jalapeno: 0.5, gatling: 0.5, twinsunflower: 0.5, torchwood: 0.48, melonpult: 0.5, wintermelon: 0.5, magnet: 0.5, doomshroom: 0.5, iceshroom: 0.54, garlic: 0.6, spikeweed: 0.7 }[type] || 0.56;
    ctx.translate(x + w / 2 - 2, y + h - 38); ctx.scale(tall, tall);
    Art.plant(ctx, type, 0, { armed: true });
    ctx.restore();
    Art.rrect(ctx, x + 10, y + h - 30, w - 20, 24, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#8a7a40'; ctx.stroke();
    this.text(ctx, String(PLANTS[type].cost), x + w / 2, y + h - 17, 20, { fill: '#222', stroke: null, font: this.FONT });
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

'use strict';
// =====================================================================
//  Dibujo de la partida (escena, HUD, selector de plantas y pantallas)
// =====================================================================
Object.assign(Game.prototype, {
  levelLabel() {
    if (this.levelId === 'endless') return `Infinito · Oleada ${this.wave}`;
    if (typeof this.levelId === 'string') return this.L.name;
    const w = WORLDS.find(x => x.id === this.L.world);
    return `${w.name} ${this.L.num}`;
  },

  draw(ctx) {
    const t = this.time;
    ctx.save();
    if (this.shake > 0) ctx.translate(rand(-1, 1) * this.shake * 16, rand(-1, 1) * this.shake * 16);
    ctx.drawImage(this.app.getBg(this.stage), 0, 0, W, H);
    for (const c of this.craters) Art.crater(ctx, cellCX(c.c), rowGroundY(c.r), c.t / c.max);
    if (this.mode === 'bowling') Art.bowlLine(ctx, GRID_X + COL_W * 3);

    if (this.phase === 'choose' || this.phase === 'ready') {
      const fade = this.phase === 'ready' ? clamp(1 - this.phaseT / 0.8, 0, 1) : 1;
      if (fade > 0) {
        ctx.save(); ctx.globalAlpha = fade;
        for (const z of this.preview) { ctx.save(); ctx.translate(z.x, z.y); Art.shadow(ctx, 0, 0, 34, 9); ctx.scale(0.9, 0.9); Art.zombie(ctx, z, t); ctx.restore(); }
        ctx.restore();
      }
    }

    if (this.phase === 'play' && this.selected !== null && this.selected !== 'shovel') {
      const cell = this.cellAt(this.app.mouse.x, this.app.mouse.y);
      if (cell) {
        ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#fff';
        ctx.fillRect(GRID_X, GRID_Y + cell.r * ROW_H, COLS * COL_W, ROW_H);
        ctx.fillRect(GRID_X + cell.c * COL_W, GRID_Y, COL_W, ROWS * ROW_H);
        ctx.restore();
      }
    }

    for (let r = 0; r < ROWS; r++) {
      const m = this.mowers[r];
      if (m && m.state !== 'gone') Art.mower(ctx, m.x, rowGroundY(r) + 4, t, m.state === 'run');
      for (const f of this.patches) if (f.row === r) { ctx.save(); ctx.globalAlpha = Math.min(1, f.t); Art.ell(ctx, f.x, rowGroundY(r) + 2, 50, 12); ctx.fillStyle = 'rgba(40,10,0,0.55)'; ctx.fill(); ctx.restore(); }
      for (const tb of this.tombs) if (tb.r === r) Art.tomb(ctx, cellCX(tb.c), rowGroundY(r), tb.hp / tb.max, this.stage === 'gothic' ? 'gothic' : null);
      for (const p of this.plants) if (p.row === r && p.kind === 'spike') this.drawPlant(ctx, p, t);
      for (const p of this.plants) if (p.row === r && p.kind !== 'spike') this.drawPlant(ctx, p, t);
      for (const rl of this.rollers) if (Math.round((rl.y - rowGroundY(0)) / ROW_H) === r) {
        ctx.save(); ctx.translate(rl.x, rl.y); Art.shadow(ctx, 0, 2, 34 * rl.size, 9 * rl.size); Art.bowlnut(ctx, rl.type, rl.rot, t); ctx.restore();
      }
      const zs = this.zombies.filter(z => z.row === r && z.state !== 'thrown').sort((a, b) => b.x - a.x);
      for (const z of zs) this.drawZombie(ctx, z, t);
      for (const pe of this.peas) if (pe.row === r) {
        // estela
        ctx.save();
        pe.trail.forEach(([tx, ty], i) => {
          ctx.globalAlpha = 0.22 * (1 - i / pe.trail.length);
          const col = { blackfire: '#7a3ac8', snow: '#bfefff', fire: '#ffb040', hellfire: '#ff5a20', feather: '#8a6ac8', wisp: '#a8f4ff' }[pe.kind] || '#b8f070';
          Art.circle(ctx, tx - 6, ty, 9 - i); ctx.fillStyle = col; ctx.fill();
        });
        ctx.restore();
        if (pe.kind === 'thorn' || pe.kind === 'hellfire' || pe.kind === 'feather' || pe.kind === 'wisp' || pe.kind === 'blackfire') Art.projectile(ctx, pe.kind, pe.x, pe.y, 0, t);
        else Art.pea(ctx, pe.x, pe.y, pe.kind, t);
      }
    }
    for (const z of this.zombies) if (z.state === 'thrown') this.drawZombie(ctx, z, t);
    for (const l of this.lobs) {
      const k = l.t / l.T;
      const x = l.x0 + (l.x1 - l.x0) * k, y = l.y0 + (l.y1 - l.y0) * k - Math.sin(k * Math.PI) * 190;
      Art.shadow(ctx, x, rowGroundY(l.row), 16, 5, 0.2);
      if (l.kind === 'melon' || l.kind === 'winter') Art.melonFruit(ctx, x, y, l.rot, l.kind === 'winter');
      else Art.projectile(ctx, l.kind, x, y, l.rot, t, 1.2);
    }
    for (const s of this.shots) {
      if (s.kind !== 'rocket') Art.shadow(ctx, s.x, rowGroundY(s.row), 16, 5, 0.2);
      Art.projectile(ctx, s.kind, s.x, s.y, s.kind === 'rocket' ? s.rot : (s.rot || 0), t);
    }
    this.drawParts(ctx, false);
    for (const a of this.ambient) if (a.kind !== 'firefly' && a.kind !== 'mote') Art.ambient(ctx, a, t);

    // iluminación del escenario
    const tint = STAGES[this.stage].tint;
    if (tint) {
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = tint; ctx.fillRect(-20, -20, W + 40, H + 40); ctx.restore();
      if (this.stage === 'night' || this.stage === 'fog') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        if (this.stage === 'night') for (const ly of [230, 690]) Art.lamp(ctx, LAWN_RIGHT + 30, ly, true);
        for (const p of this.plants) if (p.type === 'plantern') {
          const g = ctx.createRadialGradient(p.x, p.y - 70, 10, p.x, p.y - 60, 220);
          g.addColorStop(0, 'rgba(255,240,160,0.35)'); g.addColorStop(1, 'rgba(255,240,160,0)');
          ctx.fillStyle = g; ctx.fillRect(p.x - 220, p.y - 280, 440, 440);
        }
        ctx.restore();
      }
    }
    if (this.fogCols) Art.fog(ctx, this.fogD, t);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const a of this.ambient) if (a.kind === 'firefly' || a.kind === 'mote') Art.ambient(ctx, a, t);
    ctx.restore();
    this.drawParts(ctx, true);

    if (this.phase === 'play' && !this.paused) this.drawCursorGhost(ctx, t);
    for (const s of this.suns) {
      let a = 1;
      if (s.state === 'ground' && s.life > 8) a = Math.sin(s.life * 18) > 0 ? 1 : 0.4;
      ctx.save(); ctx.globalAlpha = a;
      if (s.bounce > 0) { const k = Math.sin((0.35 - s.bounce) / 0.35 * Math.PI) * 0.18; ctx.translate(s.x, s.y + 20); ctx.scale(1 + k, 1 - k); ctx.translate(-s.x, -s.y - 20); }
      if (s.soul) Art.soul(ctx, s.x, s.y, t + s.t, s.scale || 1); else Art.sun(ctx, s.x, s.y, t + s.t, s.scale || 1);
      ctx.restore();
    }
    ctx.restore();

    const vg = ctx.createRadialGradient(W / 2 + 60, H / 2 + 40, H * 0.45, W / 2 + 60, H / 2 + 40, W * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, this.stage === 'night' || this.stage === 'fog' ? 'rgba(0,0,20,0.45)' : 'rgba(0,0,0,0.22)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (this.flash) {
      ctx.save(); ctx.globalAlpha = 0.85 * (1 - this.flash.t / this.flash.dur);
      ctx.fillStyle = `rgb(${this.flash.color})`; ctx.fillRect(0, 0, W, H); ctx.restore();
    }

    this.drawHUD(ctx, t);
    if (this.reward) this.drawReward(ctx, t);

    if (this.banner && this.phase !== 'lost') {
      const b = this.banner;
      const k = clamp(b.t / 0.18, 0, 1), out = clamp((b.dur - b.t) / 0.3, 0, 1);
      const sc = 0.6 + 0.4 * (1 - Math.pow(1 - k, 3)) + (b.t < 0.25 ? Math.sin(k * Math.PI) * 0.12 : 0);
      ctx.save(); ctx.globalAlpha = out; ctx.translate(W / 2 + 60, H / 2); ctx.scale(sc, sc);
      UI.text(ctx, b.text, 0, 0, b.size, { fill: b.color, stroke: '#2a0a00', lw: b.size / 6 });
      ctx.restore();
    }
    if (this.tip && this.phase === 'play') {
      const a = clamp(Math.min(this.tip.t, 9 - this.tip.t), 0, 1);
      ctx.save(); ctx.globalAlpha = a;
      ctx.font = `bold 24px ${UI.BODY}`;
      const w = ctx.measureText(this.tip.text).width + 50;
      Art.rrect(ctx, W / 2 + 40 - w / 2, 790, w, 50, 14); ctx.fillStyle = 'rgba(30,20,10,0.8)'; ctx.fill();
      UI.text(ctx, this.tip.text, W / 2 + 40, 816, 24, { font: UI.BODY, stroke: null, weight: 'bold' });
      ctx.restore();
    }

    if (this.phase === 'choose') this.drawChooser(ctx, t);
    if (this.phase === 'lost') this.drawLost(ctx, t);
    if (this.paused) this.drawPause(ctx);
  },

  drawPlant(ctx, p, t) {
    ctx.save();
    ctx.translate(p.x, p.y - (p.lift || 0));
    if (p.kind !== 'spike') Art.shadow(ctx, 0, (p.lift || 0) + 2, 38 - (p.lift || 0) * 0.1, 10);
    const grow = Math.min(1, p.plantT / 0.18);
    const sq = 1 + Math.sin(Math.min(1, p.plantT / 0.3) * Math.PI) * 0.12;
    const br = p.kind === 'spike' ? 0 : Math.sin(t * 2.2 + p.seed * 3) * 0.018;
    if (p.flash > 0) ctx.translate(rand(-1.5, 1.5), 0);
    ctx.scale(grow * sq * (1 - br * 0.6), grow * (2 - sq) * (1 + br));
    if (p.flash > 0) Art.setTint([255, 255, 255], 0.25);
    else if (p.hexed > 0) Art.setTint([150, 60, 200], 0.45);
    const nut = p.kind === 'wall' || p.type === 'garlic';
    const s = {
      seed: p.seed, recoil: p.recoil, glow: p.glow, fuse: p.fuse, armed: p.armed, pop: p.pop, mode: p.mode,
      biteT: p.biteT, squish: p.type === 'squash' && p.mode === 'smash' ? p.squish : 0, attack: p.attack, dir: p.dir,
      throwT: p.throwT, loaded: p.kind === 'cannon' || p.kind === 'rocket' ? p.fireT < 1.2 : (p.fireT < 1.5 || p.throwT > 0),
      holding: p.holding, charge: p.charge, butter: p.butter,
      dmg: nut ? (p.hp < p.maxHp / 3 ? 2 : p.hp < p.maxHp * 2 / 3 ? 1 : 0) : 0,
    };
    if (p.type === 'springnut') s.attack = p.springT > 5.6 ? 1 : 0;
    Art.plant(ctx, p.type, t + p.seed, s);
    if (p.type === 'magnet' && p.holding) {
      ctx.save(); ctx.translate(0, -88); ctx.scale(0.55, 0.55); ctx.rotate(0.2); Art.armorPiece(ctx, p.holding); ctx.restore();
    }
    Art.setTint(null, 0);
    if (p.hexed > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(150,255,100,0.7)'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, -60, 30 + i * 8, t * 3 + i * 2, t * 3 + i * 2 + 2); ctx.stroke(); }
      ctx.restore();
    }
    ctx.restore();
  },

  drawZombie(ctx, z, t) {
    ctx.save();
    const x = z.x;
    let y = z.y;
    const big = this.isGiant(z) ? 1.7 : z.type === 'imp' ? 0.7 : 1;
    const flying = this.isFlying(z) || z.state === 'blown';
    let lift = 0;
    if (flying) lift = 70 + Math.sin(t * 2 + x * 0.01) * 6;
    else if (z.fallT > 0) lift = 70 * (z.fallT / 0.35);
    if (z.state === 'jump') {
      const k = clamp(z.jumpT, 0, 1);
      const jl = Math.sin(k * Math.PI) * 130;
      Art.shadow(ctx, x, y, 34, 9);
      Art.line(ctx, [z.jumpFrom - 70, y, x - 10, y - jl - 90], 5, '#d8b060', '#4a3510', 2);
      ctx.translate(x, y - jl); ctx.rotate(-k * 0.6 + 0.2);
    } else if (z.state === 'thrown') {
      Art.shadow(ctx, x, y, 20, 6);
      ctx.translate(x, y - (z.lift || 0)); ctx.rotate(-z.flyT * Math.PI * 2);
    } else if (z.state === 'rise') {
      const k = clamp(z.riseT, 0, 1);
      Art.shadow(ctx, x, y, 34 * k, 9 * k);
      ctx.beginPath(); ctx.rect(x - 120, y - 400, 240, 404); ctx.clip();
      ctx.translate(x, y + (1 - k) * 175); ctx.rotate((1 - k) * 0.3 * Math.sin(t * 20));
    } else {
      if (z.state !== 'dying' || z.dieT < 1.5) Art.shadow(ctx, x, y, (34 - lift * 0.15) * big, (9 - lift * 0.04) * big);
      ctx.translate(x, y - lift);
      if (z.state === 'blown') ctx.rotate(Math.sin(t * 10) * 0.3);
    }
    let alpha = 1;
    if (z.state === 'dying') {
      if (z.burnt) {
        Art.setTint([25, 18, 12], 0.9);
        const k = clamp((z.dieT - 0.7) / 0.6, 0, 1);
        ctx.scale(1 + k * 0.2, 1 - k); alpha = 1 - k * 0.6;
      } else if (z.squashed) {
        const k = clamp(z.dieT / 0.15, 0, 1);
        ctx.scale(1 + k * 0.5, 1 - k * 0.8); alpha = clamp((2.6 - z.dieT) / 0.6, 0, 1);
      } else {
        const k = clamp((z.dieT - 0.35) / 0.5, 0, 1);
        const bounce = z.dieT > 0.85 ? Math.sin(clamp((z.dieT - 0.85) / 0.25, 0, 1) * Math.PI) * 0.08 : 0;
        ctx.rotate(k * k * 1.45 - bounce - (z.dieT < 0.35 ? Math.sin(z.dieT / 0.35 * Math.PI) * 0.08 : 0));
        alpha = clamp((2.6 - z.dieT) / 0.6, 0, 1);
      }
    } else if (z.flash > 0) Art.setTint([255, 255, 255], 0.45);
    else if (z.stone > 0) Art.setTint([150, 148, 140], 0.75);
    else if (z.charmed) Art.setTint([255, 120, 200], 0.3);
    else if (z.frozen > 0) Art.setTint([150, 210, 255], 0.55);
    else if (z.slow > 0) Art.setTint([80, 150, 255], 0.42);
    else if (z.enraged) Art.setTint([255, 60, 30], 0.12);
    if (this.mode === 'invisible' && z.state !== 'dying') alpha = z.flash > 0 ? 0.85 : 0.05;
    ctx.globalAlpha *= alpha;
    let zz = z;
    if (z.state === 'stun' || z.state === 'throw') zz = Object.assign({}, z, { state: 'idle' });
    else if (flying) zz = Object.assign({}, z, { state: 'fly' });
    Art.zombie(ctx, zz, t);
    Art.setTint(null, 0);
    if (z.frozen > 0 && !z.stone) Art.iceBlock(ctx, z, t);
    if (z.webT > 0) {
      ctx.save(); ctx.globalAlpha *= Math.min(1, z.webT) * 0.7; ctx.strokeStyle = '#f0f0f8'; ctx.lineWidth = 1.3;
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(-6, -70); ctx.lineTo(-6 + Math.cos(a) * 50, -70 + Math.sin(a) * 60); ctx.stroke(); }
      for (const rr of [18, 34]) { ctx.beginPath(); ctx.ellipse(-6, -70, rr, rr * 1.2, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    }
    if (z.butterT > 0 && !z.headless) Art.projectile(ctx, 'butter', -14 * big, -150 * big, 0.1, t, big);
    ctx.restore();
    if (Save.data.hpBars && this.alive(z) && z.x < ZOMBIE_VISIBLE_X && this.mode !== 'invisible') {
      const max = z.maxHp + (ZOMBIES[z.type].armor || 0);
      const v = (z.hp + z.armor) / max;
      const bw = 50 * Math.min(1.4, big), by = y - 200 * big - 6 - lift;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - bw / 2 - 2, by - 2, bw + 4, 9);
      ctx.fillStyle = v > 0.5 ? '#6ad04a' : v > 0.25 ? '#f0c030' : '#e8402a'; ctx.fillRect(x - bw / 2, by, bw * clamp(v, 0, 1), 5);
    }
  },

  drawParts(ctx, glow) {
    const GLOW = { ring: 1, fire: 1, flash: 1, text: 1, sparkle: 1, snowflake: 1, beam: 1, bolt: 1, drain: 1, slash: 1, spark: 1, heartp: 1 };
    for (const p of this.parts) {
      if (p.delay > 0 || !!GLOW[p.kind] !== glow) continue;
      const k = p.t / p.life;
      ctx.save();
      switch (p.kind) {
        case 'dirt': ctx.globalAlpha = 1 - k * k; Art.circle(ctx, p.x, p.y, p.size); ctx.fillStyle = p.color || '#6b4520'; ctx.fill(); break;
        case 'grass': ctx.globalAlpha = 1 - k; ctx.fillStyle = '#5ab02a'; ctx.fillRect(p.x, p.y, p.size, p.size * 2.5); break;
        case 'splat': ctx.globalAlpha = 1 - k; Art.circle(ctx, p.x, p.y, p.size * (1 - k * 0.5)); ctx.fillStyle = `rgb(${p.color})`; ctx.fill(); break;
        case 'ash': ctx.globalAlpha = 1 - k; ctx.fillStyle = '#2a2420'; ctx.fillRect(p.x, p.y, p.size, p.size); break;
        case 'sparkle': ctx.globalAlpha = 1 - k; ctx.fillStyle = '#fff6b0'; Art.circle(ctx, p.x, p.y, p.size * (1 - k)); ctx.fill(); break;
        case 'rain': ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#8ac8ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 3, p.y + 12); ctx.stroke(); break;
        case 'wind': ctx.globalAlpha = 0.5 * (1 - k); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x + p.size / 2, p.y - 8, p.x + p.size, p.y); ctx.stroke(); break;
        case 'snowflake': {
          ctx.globalAlpha = 1 - k; ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.strokeStyle = '#eaf8ff'; ctx.lineWidth = 1.6;
          for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-p.size, 0); ctx.lineTo(p.size, 0); ctx.stroke(); }
          break;
        }
        case 'beam': {
          ctx.globalCompositeOperation = 'lighter';
          const w = 18 * (1 - k);
          ctx.strokeStyle = `rgba(${p.color},${0.5 * (1 - k)})`; ctx.lineWidth = w * 2; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x2, p.y2); ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = w * 0.5; ctx.stroke();
          break;
        }
        case 'bolt': {
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = `rgba(160,220,255,${1 - k})`; ctx.lineWidth = 4; ctx.lineJoin = 'round';
          ctx.beginPath();
          p.pts.forEach((pt, i) => {
            if (i === 0) { ctx.moveTo(pt[0], pt[1]); return; }
            const [ax, ay] = p.pts[i - 1];
            for (let s = 1; s <= 4; s++) ctx.lineTo(ax + (pt[0] - ax) * s / 4 + (s < 4 ? rand(-12, 12) : 0), ay + (pt[1] - ay) * s / 4 + (s < 4 ? rand(-12, 12) : 0));
          });
          ctx.stroke(); ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 1.5; ctx.stroke();
          break;
        }
        case 'fire': {
          ctx.globalCompositeOperation = 'lighter';
          const r = p.size * (1 - k * 0.5);
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          g.addColorStop(0, `rgba(255,240,150,${1 - k})`); g.addColorStop(0.4, `rgba(255,120,20,${0.8 * (1 - k)})`); g.addColorStop(1, 'rgba(200,20,0,0)');
          ctx.fillStyle = g; Art.circle(ctx, p.x, p.y, r); ctx.fill(); break;
        }
        case 'smoke': ctx.globalAlpha = 0.45 * (1 - k); Art.circle(ctx, p.x, p.y, p.size * (1 + k)); ctx.fillStyle = p.color ? `rgb(${p.color})` : '#3a3530'; ctx.fill(); break;
        case 'flash': {
          const r = p.size * (0.4 + k);
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          g.addColorStop(0, `rgba(${p.color},${1 - k})`); g.addColorStop(1, `rgba(${p.color},0)`);
          ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; Art.circle(ctx, p.x, p.y, r); ctx.fill(); break;
        }
        case 'text':
          ctx.globalAlpha = clamp((1 - k) * 2, 0, 1);
          UI.text(ctx, p.text, p.x, p.y, p.size * (k < 0.15 ? 0.6 + k / 0.15 * 0.4 : 1), { fill: p.color || '#fff', stroke: '#3a1500', lw: p.size / 6 });
          break;
        case 'head':
          ctx.globalAlpha = clamp((p.life - p.t) / 0.4, 0, 1);
          ctx.translate(p.x, p.y); ctx.rotate(p.rot); Art.zombieHead(ctx, Object.assign({ armor: 0, armorMax: 1 }, p.data)); break;
        case 'arm':
          ctx.globalAlpha = clamp((p.life - p.t) / 0.4, 0, 1);
          ctx.translate(p.x, p.y); ctx.rotate(p.rot); Art.zombieArm(ctx, p.data); break;
        case 'armor':
          ctx.globalAlpha = clamp((p.life - p.t) / 0.4, 0, 1);
          ctx.translate(p.x, p.y); ctx.rotate(p.rot); Art.armorPiece(ctx, p.type); break;
        case 'armorfly': {
          const e = k * k;
          ctx.translate(p.x + (p.tx - p.x) * e, p.y + (p.ty - p.y) * e - Math.sin(k * Math.PI) * 40); ctx.scale(1 - k * 0.45, 1 - k * 0.45);
          Art.armorPiece(ctx, p.type); break;
        }
        case 'plantdie': {
          ctx.globalAlpha = 1 - k; ctx.translate(p.x, p.y); ctx.rotate(k * 0.6); ctx.scale(1 - k * 0.6, 1 - k * 0.9);
          Art.plant(ctx, p.type, p.seed, { armed: true }); break;
        }
        case 'drain': {
          const e = k;
          ctx.globalCompositeOperation = 'lighter';
          const x = p.x + (p.tx - p.x) * e, y = p.y + (p.ty - p.y) * e - Math.sin(e * Math.PI) * 40;
          Art.glow(ctx, x, y, 14, '255,40,70', 0.9 * (1 - e * 0.5)); break;
        }
        case 'slash': {
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = '#e8d8ff'; ctx.lineWidth = 10 * (1 - k); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(p.x, p.y, 110, -1.5 + k * 0.6, 0.9 + k * 0.6); ctx.stroke();
          ctx.strokeStyle = 'rgba(180,120,255,0.6)'; ctx.lineWidth = 24 * (1 - k); ctx.stroke(); break;
        }
        case 'ring': {
          ctx.globalAlpha = (1 - k) * 0.8; ctx.strokeStyle = '#fff2c0'; ctx.lineWidth = 10 * (1 - k);
          Art.ell(ctx, p.x, p.y, p.size * (0.2 + k), p.size * (0.2 + k) * 0.4); ctx.stroke(); break;
        }
        case 'blackflame': ctx.globalAlpha = 1 - k; Art.blackFlame(ctx, p.x, p.y, this.time, p.size * (1 - k * 0.5), p.x); break;
        case 'spark': ctx.globalCompositeOperation = 'lighter'; Art.glow(ctx, p.x, p.y, p.size * 2, p.color, 1 - k); break;
        case 'heartp': ctx.globalAlpha = 1 - k; Art.heart(ctx, p.x, p.y, p.size, '#ff4a9a'); break;
        case 'pole':
          ctx.globalAlpha = clamp((p.life - p.t) / 0.4, 0, 1);
          ctx.translate(p.x, p.y); ctx.rotate(p.rot); Art.line(ctx, [-80, 0, 80, 0], 5, '#d8b060', '#4a3510', 2); break;
        case 'paper':
          ctx.globalAlpha = clamp((p.life - p.t) / 0.4, 0, 1);
          ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = '#eee9d8'; ctx.fillRect(-8, -6, 16, 12);
          ctx.fillStyle = '#777'; ctx.fillRect(-6, -3, 12, 2); ctx.fillRect(-6, 1, 9, 2); break;
      }
      ctx.restore();
    }
  },

  drawCursorGhost(ctx, t) {
    const mx = this.app.mouse.x, my = this.app.mouse.y;
    const cell = this.cellAt(mx, my);
    let type = null;
    if (typeof this.selected === 'number') type = this.packets[this.selected].type;
    else if (this.selected && this.selected.belt !== undefined && this.belt[this.selected.belt]) type = this.belt[this.selected.belt].type;
    if (type) {
      if (this.canPlace(type, cell)) {
        ctx.save(); ctx.globalAlpha = 0.4;
        ctx.translate(cellCX(cell.c), rowGroundY(cell.r));
        Art.plant(ctx, type, 0, { armed: true });
        ctx.restore();
      }
      ctx.save(); ctx.translate(mx, my + 45); ctx.globalAlpha = 0.9;
      Art.plant(ctx, type, t, { armed: true });
      ctx.restore();
    } else if (this.selected === 'shovel') {
      if (cell && this.grid[cell.r][cell.c]) {
        ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff';
        ctx.fillRect(GRID_X + cell.c * COL_W, GRID_Y + cell.r * ROW_H, COL_W, ROW_H); ctx.restore();
      }
      ctx.save(); ctx.translate(mx, my); ctx.rotate(-0.5); UI.shovel(ctx, 0, 0, 1); ctx.restore();
    }
  },

  drawHUD(ctx, t) {
    if (this.usesBelt) this.drawBeltHUD(ctx, t);
    else this.drawSeedBar(ctx, t);
    if (this.phase !== 'choose') {
      UI.button(ctx, 1430, 12, 158, 54, 'Menú', () => { this.paused = true; Sfx.play('click'); }, { size: 30 });
      UI.button(ctx, 1430, 74, 158, 44, this.speed === 2 ? 'Velocidad x2' : 'Velocidad x1', () => { this.speed = this.speed === 2 ? 1 : 2; Sfx.play('click'); }, { size: 20, color: this.speed === 2 ? 'orange' : 'stone' });
    }
    if (this.waiting && this.phase === 'play') {
      UI.button(ctx, W / 2 - 120, 770, 300, 76, '¡Empezar!', () => { this.waiting = false; Sfx.play('go'); this.setBanner('¡Que vengan!', 1.5, '#ff4a2a', 80); }, { size: 38, color: 'red' });
    }
    if (this.phase === 'play' || this.phase === 'won' || this.phase === 'lost') {
      UI.text(ctx, this.levelLabel(), 1135, 872, 24, { fill: '#fff', stroke: '#2a1a08', lw: 6, align: 'right' });
      if (!this.L.endless) {
        const bx = 1150, by = 860, bw2 = 220, bh = 24;
        Art.rrect(ctx, bx, by, bw2, bh, 10); ctx.fillStyle = '#3a2810'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#1a1005'; ctx.stroke();
        const frac = clamp(this.wave / this.L.waves, 0, 1);
        if (frac > 0) { Art.rrect(ctx, bx + bw2 * (1 - frac), by + 4, Math.max(4, bw2 * frac - 4), bh - 8, 6); ctx.fillStyle = Art.lg(ctx, 0, by, 0, by + bh, '#b8f06a', '#4a9a1c'); ctx.fill(); }
        for (let w = 10; w <= this.L.waves; w += 10) this.drawFlag(ctx, bx + bw2 * (1 - w / this.L.waves) + 6, by + 6, this.wave >= w);
        if (this.L.waves % 10) this.drawFlag(ctx, bx + 6, by + 6, this.wave >= this.L.waves);
        ctx.save(); ctx.translate(bx + bw2 * (1 - frac) + 2, by + 14); ctx.scale(0.55, 0.55);
        Art.zombieHead(ctx, { type: 'normal', armor: 0, armorMax: 1 }, true); ctx.restore();
      }
    }
  },

  drawSeedBar(ctx, t) {
    const bw = this.barW;
    Art.rrect(ctx, BAR.x, BAR.y, bw, BAR.ph + 10, 14);
    ctx.fillStyle = Art.lg(ctx, 0, BAR.y, 0, BAR.y + BAR.ph, '#343c56', '#1a1f30'); ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#d3bc8e'; ctx.stroke();
    ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = '#000';
    for (let i = 0; i < 4; i++) ctx.fillRect(BAR.x + 6, BAR.y + 20 + i * 28, bw - 12, 2);
    ctx.restore();
    Art.rrect(ctx, BAR.x + 8, BAR.y + 8, BAR.sunW - 6, BAR.ph - 6, 10);
    ctx.fillStyle = 'rgba(8,12,24,0.55)'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(211,188,142,0.5)'; ctx.stroke();
    const pulse = this.sunPulse > 0 ? 1 + this.sunPulse * 0.6 : 1;
    Art.sun(ctx, BAR.x + 58, BAR.y + 46, t, 0.85 * pulse);
    Art.rrect(ctx, BAR.x + 16, BAR.y + 88, BAR.sunW - 22, 30, 8); ctx.fillStyle = '#f6edc8'; ctx.fill();
    const flashing = this.sunFlash > 0 && Math.sin(this.sunFlash * 30) > 0;
    if (this.sunFlash > 0) this.sunFlash -= 1 / 60;
    UI.text(ctx, String(this.sun), BAR.x + 13 + BAR.sunW / 2 - 6, BAR.y + 104, 28, { fill: flashing ? '#ff2a1a' : '#2a1a08', stroke: null, font: UI.FONT });

    let hover = null;
    for (let i = 0; i < this.slots; i++) {
      const r = this.packetRect(i);
      if (this.phase === 'choose') {
        const type = this.chosen[i];
        if (type) { UI.packet(ctx, r.x, r.y, type, t, { premium: PLANTS[type].premium }); UI.region(r.x, r.y, r.w, r.h, () => { this.chosen.splice(i, 1); Sfx.play('click'); }); }
        else { Art.rrect(ctx, r.x, r.y, r.w, r.h, 8); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill(); }
        continue;
      }
      const pk = this.packets[i];
      if (!pk) { Art.rrect(ctx, r.x, r.y, r.w, r.h, 8); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill(); continue; }
      const cost = PLANTS[pk.type].cost;
      UI.packet(ctx, r.x, r.y, pk.type, t, { cd: pk.cd / pk.cdMax, poor: this.sun < cost, selected: this.selected === i, key: (i + 1) % 10, premium: PLANTS[pk.type].premium, ready: pk.ready, hover: UI.isOver(r.x, r.y, r.w, r.h) && pk.cd <= 0 && this.sun >= cost });
      UI.region(r.x, r.y, r.w, r.h, () => this.selectPacket(i));
      if (UI.isOver(r.x, r.y, r.w, r.h)) hover = { type: pk.type, x: r.x };
    }
    if (this.phase !== 'choose') {
      const s = this.shovelRect();
      Art.rrect(ctx, s.x, s.y, s.w, s.h, 14);
      ctx.fillStyle = Art.lg(ctx, 0, s.y, 0, s.y + s.h, '#343c56', '#1a1f30'); ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#d3bc8e'; ctx.stroke();
      Art.rrect(ctx, s.x + 8, s.y + 8, s.w - 16, s.h - 16, 10); ctx.fillStyle = 'rgba(8,12,24,0.55)'; ctx.fill();
      if (this.selected !== 'shovel') { ctx.save(); ctx.translate(s.x + s.w / 2, s.y + s.h / 2); ctx.rotate(-0.6); UI.shovel(ctx, 0, 0, 0.9); ctx.restore(); }
      UI.region(s.x, s.y, s.w, s.h, () => { if (this.phase === 'play') { this.selected = this.selected === 'shovel' ? null : 'shovel'; Sfx.play('shovel'); } });
    }
    if (hover && this.phase === 'play' && this.selected === null) {
      const d = PLANTS[hover.type];
      ctx.font = `bold 18px ${UI.BODY}`;
      const w = Math.max(260, ctx.measureText(d.desc).width + 30);
      const x = clamp(hover.x - 20, 10, W - w - 10), y = BAR.y + BAR.ph + 18;
      Art.rrect(ctx, x, y, w, 70, 12); ctx.fillStyle = 'rgba(25,15,5,0.92)'; ctx.fill(); ctx.strokeStyle = '#c8a050'; ctx.lineWidth = 2; ctx.stroke();
      UI.text(ctx, `${d.name} · ${d.cost} soles`, x + 15, y + 22, 22, { align: 'left', fill: '#ffe48a', stroke: null });
      UI.text(ctx, d.desc, x + 15, y + 50, 18, { align: 'left', fill: '#f4ecd0', stroke: null, font: UI.BODY, weight: 'bold' });
    }
  },

  drawBeltHUD(ctx, t) {
    const bx = 10, by = 6, bw = 1100, bh = 128;
    Art.conveyor(ctx, bx, by, bw, bh, this.phase === 'play' ? t : 0);
    UI.text(ctx, this.mode === 'bowling' ? 'BOLOS' : 'CINTA', bx + 1040, by + 64, 26, { fill: '#ffe48a', stroke: '#1a1a1a', lw: 5 });
    this.belt.forEach((it, i) => {
      const x = bx + 20 + it.x, y = by + 8;
      if (x > bx + bw - 120) return;
      const sel = this.selected && this.selected.belt === i;
      if (this.mode === 'bowling') {
        ctx.save(); ctx.translate(x + 42, y + 100); if (sel) ctx.globalAlpha = 0.55;
        Art.shadow(ctx, 0, 2, 30, 7); ctx.scale(it.type === 'bignut' ? 0.62 : 0.95, it.type === 'bignut' ? 0.62 : 0.95);
        Art.bowlnut(ctx, it.type, 0, t); ctx.restore();
        if (sel) { Art.rrect(ctx, x, y, 84, 112, 10); ctx.lineWidth = 3; ctx.strokeStyle = '#fff6a0'; ctx.stroke(); }
      } else UI.packet(ctx, x, y, it.type, t, { selected: sel, free: true });
      UI.region(x, y, 84, 112, () => this.selectPacket(i));
    });
  },

  drawFlag(ctx, x, y, raised) {
    ctx.save(); ctx.translate(x, y - (raised ? 14 : 0));
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-1.5, -18, 3, 30);
    ctx.beginPath(); ctx.moveTo(1, -18); ctx.lineTo(-18, -12); ctx.lineTo(1, -4); ctx.closePath();
    ctx.fillStyle = '#d42a1a'; ctx.fill(); ctx.strokeStyle = '#3a0a00'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  },

  drawReward(ctx, t) {
    const r = this.reward;
    let x = r.x, y = r.y, sc = 1;
    if (r.collected) {
      const k = clamp(r.ct / 1.2, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      x = r.x + (W / 2 - r.x) * e; y = r.y + (H / 2 - 80 - r.y) * e; sc = 1 + e * 1.2;
      ctx.save(); ctx.globalAlpha = k * 0.88; ctx.fillStyle = '#fffbe8'; ctx.fillRect(0, 0, W, H); ctx.restore();
      if (r.ct > 0.6) {
        for (let i = 0; i < 70; i++) {
          const fx = (i * 137.5 + Math.sin(i) * 50) % W, fy = ((r.ct - 0.6) * (120 + (i % 7) * 30) + i * 37) % (H + 40) - 20;
          ctx.save(); ctx.translate(fx, fy); ctx.rotate(r.ct * 4 + i);
          ctx.fillStyle = ['#ff5a4a', '#ffd23a', '#5ad06a', '#4aa8ff', '#c87aff'][i % 5]; ctx.fillRect(-5, -3, 10, 6); ctx.restore();
        }
      }
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.6); ctx.globalAlpha = 0.5;
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-14 * sc, 120 * sc); ctx.lineTo(14 * sc, 120 * sc); ctx.closePath();
      ctx.fillStyle = 'rgba(255,240,140,0.6)'; ctx.fill();
    }
    ctx.restore();
    ctx.save(); ctx.translate(x, y + Math.sin(t * 3) * 4); ctx.scale(sc, sc); UI.trophy(ctx, 0, 0, 1); ctx.restore();
    if (!r.collected) UI.text(ctx, '¡Haz clic en el trofeo!', x, y + 90, 26, { fill: '#fff', stroke: '#2a1a08', lw: 6 });
    if (r.collected && r.ct > 1.3) {
      UI.reset();
      UI.text(ctx, `¡${this.levelLabel()} superado!`, W / 2, 140, 64, { fill: '#ffd23a', stroke: '#4a2a00', lw: 11 });
      const st = this.stats;
      UI.text(ctx, `Zombis derrotados: ${st.killed}   ·   Plantas sembradas: ${st.planted}   ·   Soles recogidos: ${st.sun}`, W / 2, H / 2 + 120, 26, { fill: '#3a2a10', stroke: null, font: UI.BODY, weight: 'bold' });
      const hasNext = typeof this.levelId === 'number' && this.levelId + 1 < LEVELS.length;
      if (hasNext) UI.button(ctx, W / 2 - 330, H / 2 + 180, 320, 74, 'Siguiente nivel', () => { Sfx.play('click'); this.app.startLevel(this.levelId + 1); }, { size: 34 });
      UI.button(ctx, hasNext ? W / 2 + 10 : W / 2 - 160, H / 2 + 180, 320, 74, 'Menú principal', () => { Sfx.play('click'); this.app.go('menu'); }, { size: 30, color: 'stone' });
    }
  },

  drawChooser(ctx, t) {
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fillRect(0, BAR.y + BAR.ph + 14, LAWN_RIGHT + 60, H); ctx.restore();
    const px = 190, py = 140, pw = 980, ph = 750;
    UI.panel(ctx, px, py, pw, ph);
    UI.text(ctx, 'Elige tus plantas', px + pw / 2, py + 40, 44, { fill: '#f0dcaa', stroke: '#141826', lw: 8 });
    UI.text(ctx, `Lleva hasta ${this.slots} · ${PLANT_ORDER.length} plantas, todas desbloqueadas y gratis`, px + pw / 2, py + 80, 21, { fill: '#e6dcc6', stroke: null, font: UI.BODY, weight: 'bold' });
    const cols = 13, S = 0.64, cw = 84 * S, chh = 116 * S;
    const pos = i => ({ x: px + 40 + (i % cols) * (cw + 15), y: py + 102 + Math.floor(i / cols) * (chh + 10) });
    let hovered = null;
    this.owned.forEach((type, i) => {
      const { x, y } = pos(i);
      const used = this.chosen.includes(type);
      ctx.save(); ctx.translate(x, y); ctx.scale(S, S);
      UI.packet(ctx, 0, 0, type, t, { poor: used, cd: 0, premium: PLANTS[type].premium });
      ctx.restore();
      if (!used) UI.region(x, y, cw, chh, () => {
        if (this.chosen.length < this.slots) { this.chosen.push(type); Sfx.play('select'); } else Sfx.play('buzz');
      });
      if (UI.isOver(x, y, cw, chh)) hovered = type;
    });
    const ty = py + 540;
    if (hovered) {
      const d = PLANTS[hovered];
      const tag = d.origin === 'gothic' ? ' · Gótica' : d.origin === 'new' ? ' · ¡NUEVA!' : d.origin === 2 ? ' · Secuela' : '';
      UI.text(ctx, `${d.name} · ${d.cost} soles · recarga ${d.cd}s${tag}`, px + pw / 2, ty, 28, { fill: '#f0dcaa', stroke: '#141826', lw: 6 });
      UI.text(ctx, d.desc, px + pw / 2, ty + 38, 21, { fill: '#e6dcc6', stroke: null, font: UI.BODY, weight: 'bold' });
    } else {
      const names = this.L.zombies.map(z => ZOMBIES[z].name);
      const half = Math.ceil(names.length / 2);
      const lines = names.length > 4 ? [names.slice(0, half).join(', ') + ',', names.slice(half).join(', ')] : [names.join(', ')];
      UI.text(ctx, 'Zombis en este nivel:', px + pw / 2, ty - 6, 24, { fill: '#ffb8a0', stroke: '#3a1e05', lw: 5 });
      lines.forEach((ln, i) => UI.text(ctx, ln, px + pw / 2, ty + 28 + i * 27, 20, { fill: '#e6dcc6', stroke: null, font: UI.BODY, weight: 'bold' }));
    }
    const ready = this.chosen.length > 0;
    UI.button(ctx, px + pw / 2 - 170, py + ph - 96, 300, 70, '¡A JUGAR!', () => { Sfx.play('go'); this.startReady(); }, { size: 36, disabled: !ready, color: 'red' });
    UI.button(ctx, px + 30, py + ph - 88, 150, 54, 'Volver', () => { Sfx.play('click'); this.app.go(typeof this.levelId === 'number' ? 'levels' : 'menu'); }, { size: 24, color: 'stone' });
    UI.button(ctx, px + pw - 320, py + ph - 88, 140, 54, 'Aleatorio', () => {
      Sfx.play('click'); const pool = PLANT_ORDER.slice().sort(() => Math.random() - 0.5);
      this.chosen = ['sunflower', ...pool.filter(p => p !== 'sunflower')].slice(0, this.slots);
    }, { size: 22, color: 'orange' });
    UI.button(ctx, px + pw - 168, py + ph - 88, 140, 54, 'Vaciar', () => { Sfx.play('click'); this.chosen = []; }, { size: 22, color: 'stone' });
  },

  drawLost(ctx, t) {
    const k = clamp(this.phaseT / 1.2, 0, 1);
    ctx.save(); ctx.globalAlpha = k * 0.75; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore();
    if (this.phaseT > 0.8) {
      const s = clamp((this.phaseT - 0.8) / 0.5, 0, 1);
      ctx.save(); ctx.translate(W / 2, H / 2 - 90); ctx.scale(0.5 + s * 0.5, 0.5 + s * 0.5); ctx.globalAlpha = s;
      ctx.rotate(Math.sin(t * 2) * 0.02);
      UI.text(ctx, '¡LOS ZOMBIS SE HAN', 0, -50, 76, { fill: '#9fe05a', stroke: '#0e1f05', lw: 12 });
      UI.text(ctx, 'COMIDO TUS CEREBROS!', 0, 40, 76, { fill: '#9fe05a', stroke: '#0e1f05', lw: 12 });
      ctx.restore();
    }
    if (this.phaseT > 1.6) {
      UI.reset();
      const tx = this.L.endless ? `Has aguantado ${Math.max(0, this.wave - 1)} oleadas` : `Llegaste a la oleada ${this.wave} de ${this.L.waves}`;
      UI.text(ctx, tx, W / 2, H / 2 + 40, 28, { fill: '#fff', stroke: '#000', lw: 5, font: UI.BODY, weight: 'bold' });
      UI.button(ctx, W / 2 - 320, H / 2 + 90, 300, 70, 'Reintentar', () => { Sfx.play('click'); this.app.startLevel(this.levelId); }, { size: 34 });
      UI.button(ctx, W / 2 + 20, H / 2 + 90, 300, 70, 'Menú principal', () => { Sfx.play('click'); this.app.go('menu'); }, { size: 30, color: 'stone' });
    }
  },

  drawPause(ctx) {
    UI.reset();
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    const pw = 600, ph = 640, px = W / 2 - pw / 2, py = H / 2 - ph / 2;
    UI.panel(ctx, px, py, pw, ph);
    UI.text(ctx, 'Pausa', W / 2, py + 58, 56, { fill: '#f0dcaa', stroke: '#141826', lw: 9 });
    let y = py + 110;
    const b = (label, fn, opts = {}) => { UI.button(ctx, px + 70, y, pw - 140, 60, label, fn, Object.assign({ size: 26 }, opts)); y += 72; };
    b('Continuar', () => { this.paused = false; Sfx.play('click'); });
    b('Reiniciar nivel', () => { Sfx.play('click'); this.app.startLevel(this.levelId); }, { color: 'orange' });
    const d = Save.data;
    const half = (label, fn, x) => UI.button(ctx, x, y, (pw - 160) / 2, 56, label, fn, { size: 22, color: 'stone' });
    half(`Sonido: ${d.sound ? 'Sí' : 'No'}`, () => { Sfx.setSound(!d.sound); Sfx.play('click'); }, px + 70);
    half(`Música: ${d.music ? 'Sí' : 'No'}`, () => { Sfx.setMusic(!d.music); Sfx.play('click'); }, px + 90 + (pw - 160) / 2);
    y += 68;
    half(`Auto-soles: ${d.autoSun ? 'Sí' : 'No'}`, () => { d.autoSun = !d.autoSun; Save.save(); Sfx.play('click'); }, px + 70);
    half(`Barras de vida: ${d.hpBars ? 'Sí' : 'No'}`, () => { d.hpBars = !d.hpBars; Save.save(); Sfx.play('click'); }, px + 90 + (pw - 160) / 2);
    y += 72;
    b(`Calidad gráfica: ${this.app.qualityLabel()}`, () => { Sfx.play('click'); this.app.cycleQuality(); }, { color: 'stone', size: 22 });
    b(this.confirmQuit ? '¿Seguro? Pulsa otra vez' : 'Menú principal', () => {
      Sfx.play('click');
      if (this.confirmQuit) this.app.go('menu'); else this.confirmQuit = true;
    }, { color: 'red' });
  },
});

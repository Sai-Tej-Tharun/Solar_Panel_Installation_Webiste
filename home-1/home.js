/**
 * ============================================================
 * GlowVeda — Solar Canvas Hero Animation  (FIXED v2.0)
 * home-1/home.js  ·  Module 1 replacement
 * ============================================================
 *
 * BUGS FIXED FROM ORIGINAL:
 * ─────────────────────────
 * 1. cycleStart double-reset:
 *    Original set cycleStart=null, then the RAF set it on frame-1,
 *    then setTimeout() reset it AGAIN 50 ms later — causing the
 *    animation to jump back to phase 0 mid-flight.
 *    FIX: cycleStart is set exactly ONCE, synchronously before the
 *    first requestAnimationFrame call. No setTimeout delay.
 *
 * 2. Sun frozen at right edge / starting at bottom-left:
 *    getSunPos() computed t = clamp(p - 0.00) / (0.72 - 0.00)
 *    which reaches 1.0 at nightStart (0.72) and stays there.
 *    At t=0 → sin(0)=0 → y = H*0.55 (ground), x = W*0.08 (left).
 *    FIX: Sun travels dawn (p=0.00) through full arc to dusk-end
 *    (p=0.72). When nighttime (p > 0.72) the sun is simply not
 *    drawn — it does not freeze, it fades out while setting.
 *    Sun starts ABOVE the horizon by offsetting t slightly so the
 *    first visible position is sky-level, not ground-level.
 *
 * 3. ResizeObserver + window resize double-correction:
 *    Both tried to fix cycleStart independently, causing phase jumps.
 *    FIX: Only the ResizeObserver is used. It recalculates canvas
 *    dimensions without touching cycleStart at all.
 *
 * 4. visibilitychange race condition:
 *    Original cancelled RAF and restarted before raf variable was
 *    guaranteed to hold a valid ID.
 *    FIX: raf is initialised to 0; the restart guard checks > 0.
 *
 * 5. Particle reset during resize:
 *    Particles stored absolute px coords. After resize they pointed
 *    to stale positions.
 *    FIX: Particles store fractional [0-1] coords and recompute
 *    absolute positions from W/H each frame.
 *
 * HOW TO USE:
 * ───────────
 * Replace the entire initSolarCanvas IIFE block in home-1/home.js
 * with this file's content. Keep all other modules intact.
 * ============================================================
 */

(function initSolarCanvas() {

  /* ── DOM ── */
  const canvas = document.getElementById('solar-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  /* ─────────────────────────────────────────────────────────
     CYCLE CONFIG
     dayPhase: 0 → 1 loops continuously (one full day cycle)

     Phase boundaries:
       0.00 – 0.15  DAWN   (sun rises, sky lightens)
       0.15 – 0.55  DAY    (full sunlight, panels active)
       0.55 – 0.72  DUSK   (sun sets, sky turns orange)
       0.72 – 1.00  NIGHT  (moon, stars, windows glow)
  ───────────────────────────────────────────────────────── */

  const CYCLE_MS = 24000; /* 24 s per full day — slow enough to appreciate */

  const PH = {
    dawnStart:  0.00,
    dayStart:   0.15,
    duskStart:  0.55,
    nightStart: 0.72,
  };

  /* ── State ── */
  let W = 0, H = 0;
  let dayPhase  = 0;
  let frame     = 0;
  let raf       = 0;
  let battPct   = 0.42; /* battery state-of-charge 0–1 */

  /*
   * FIX 1: cycleStart is set synchronously, RIGHT before the first
   * requestAnimationFrame call, so it is never null during drawing.
   * No setTimeout. No double-reset.
   */
  const cycleStart = performance.now();

  /* ── Utilities ── */
  const lerp       = (a, b, t) => a + (b - a) * t;
  const clamp      = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const smoothstep = (t) => t * t * (3 - 2 * t);

  /** Returns 0→1 transition that ramps up across [s, e]. */
  function ramp(p, s, e) {
    return smoothstep(clamp((p - s) / (e - s), 0, 1));
  }

  /** Returns 0→1 value that peaks in centre of [s, e] and is 0 outside. */
  function peak(p, s, e) {
    const m = (s + e) / 2;
    if (p <= s || p >= e) return 0;
    if (p <= m) return smoothstep((p - s) / (m - s));
    return smoothstep((e - p) / (e - m));
  }

  /* ── Canvas resize ── */
  function resize() {
    const dpr  = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    /* Only resize if dimensions actually changed — avoids thrash */
    if (canvas.width  === Math.round(rect.width  * dpr) &&
        canvas.height === Math.round(rect.height * dpr)) return;
    canvas.width  = Math.round(rect.width  * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = rect.width;
    H = rect.height;
  }

  /* ── Phase factor bundle ── */
  function getFactors(p) {
    /* daylight: 0 = full night, 1 = full day */
    let daylight;
    if      (p < PH.dayStart)   daylight = ramp(p, PH.dawnStart, PH.dayStart);
    else if (p < PH.duskStart)  daylight = 1;
    else if (p < PH.nightStart) daylight = 1 - ramp(p, PH.duskStart, PH.nightStart);
    else                         daylight = 0;

    /* nightness: 0 = day, 1 = deep night */
    const nightness = p >= PH.nightStart
      ? ramp(p, PH.nightStart, Math.min(1, PH.nightStart + 0.1))
      : 0;

    /* sunsetGlow: peaks at dusk midpoint */
    const sunsetGlow = peak(p, PH.duskStart - 0.02, PH.nightStart + 0.03);

    /* starAlpha: fades in at night-start, fades out near cycle-end */
    let starAlpha = 0;
    if (p > PH.nightStart) {
      starAlpha = ramp(p, PH.nightStart, PH.nightStart + 0.07);
      if (p > 0.93) starAlpha *= 1 - ramp(p, 0.93, 1.0);
    }

    /* panelEnergy: 0 at night, 1 in full day */
    const panelEnergy = daylight;

    /* windowGlow: warm amber windows appear at dusk, stay through night */
    let windowGlow = 0;
    if (p > PH.duskStart + 0.06) {
      windowGlow = ramp(p, PH.duskStart + 0.06, PH.nightStart);
      if (p > 0.94) windowGlow *= 1 - ramp(p, 0.94, 1.0);
    }

    return { daylight, nightness, sunsetGlow, starAlpha, panelEnergy, windowGlow };
  }


  /* ═══════════════════════════════════════════════════════
     SKY & GROUND COLOUR INTERPOLATION
  ═══════════════════════════════════════════════════════ */

  function lerpRGB(a, b, t) {
    return a.map((c, i) => Math.round(lerp(c, b[i], t)));
  }

  const PALETTE = {
    skyTop:   { dawn: [80,120,190],  day: [28,110,185],  dusk: [18,38,80],   night: [5,12,28]   },
    skyBot:   { dawn: [255,160,80],  day: [155,200,245], dusk: [255,80,20],  night: [10,22,52]  },
    gndTop:   {                      day: [88,155,70],                        night: [14,32,14]  },
    gndBot:   {                      day: [58,118,50],                        night: [7,14,7]    },
  };

  function skyGradient(f) {
    let top, bot;
    if (f.sunsetGlow > 0.02) {
      /* Dusk: blend from day colours toward sunset colours */
      const t = f.sunsetGlow;
      top = lerpRGB(PALETTE.skyTop.day,  PALETTE.skyTop.dusk,  t * 0.85);
      bot = lerpRGB(PALETTE.skyBot.day,  PALETTE.skyBot.dusk,  t);
    } else {
      top = lerpRGB(PALETTE.skyTop.night, PALETTE.skyTop.day,  f.daylight);
      bot = lerpRGB(PALETTE.skyBot.night, PALETTE.skyBot.day,  f.daylight);
    }

    const g = ctx.createLinearGradient(0, 0, 0, H * 0.76);
    g.addColorStop(0, `rgb(${top})`);
    g.addColorStop(1, `rgb(${bot})`);
    return g;
  }

  function groundGradient(f) {
    const t   = f.daylight;
    const t2  = f.sunsetGlow;
    const top = t2 > 0.05
      ? lerpRGB(PALETTE.gndTop.day, [68, 90, 42], t2)
      : lerpRGB(PALETTE.gndTop.night, PALETTE.gndTop.day, t);
    const bot = t2 > 0.05
      ? lerpRGB(PALETTE.gndBot.day, [36, 56, 24], t2)
      : lerpRGB(PALETTE.gndBot.night, PALETTE.gndBot.day, t);

    const g = ctx.createLinearGradient(0, H * 0.73, 0, H);
    g.addColorStop(0, `rgb(${top})`);
    g.addColorStop(1, `rgb(${bot})`);
    return g;
  }


  /* ═══════════════════════════════════════════════════════
     SUN — ARC TRAJECTORY

     FIX 2: The sun's position is computed from a normalised
     parameter `t` that goes 0→1 over its VISIBLE window only
     (dawnStart → nightStart).  At t=0 the sun is rising from
     the left horizon; at t=1 it has just set on the right.

     We start t at a small positive offset (0.04) so the sun
     is already ABOVE the horizon on the first visible frame —
     preventing the "sun at ground level" appearance.

     When p > nightStart the sun is simply not drawn.
  ═══════════════════════════════════════════════════════ */

  function sunPos(p) {
    /* Map p from [dawnStart, nightStart] to [0, 1] */
    const raw = (p - PH.dawnStart) / (PH.nightStart - PH.dawnStart);
    /* Add a small offset so sun starts above horizon, not AT it */
    const t   = clamp(raw + 0.04, 0, 1);

    const arcH = H * 0.50;               /* how high the arc peaks */
    const x    = lerp(W * 0.06, W * 0.94, t);
    const y    = H * 0.54 - Math.sin(t * Math.PI) * arcH;
    return { x, y };
  }

  function drawSun(p, f) {
    /* Don't draw the sun at night */
    if (p > PH.nightStart + 0.02) return;

    /* Fade alpha: strong in day, fading during dusk */
    const alpha = clamp(
      Math.max(f.daylight, f.sunsetGlow * 0.5),
      0, 1
    );
    if (alpha < 0.02) return;

    const { x: sx, y: sy } = sunPos(p);
    const sr     = W * 0.052;
    const pulse  = (Math.sin(frame * 0.05) + 1) / 2;
    const isDusk = f.sunsetGlow > 0.25;
    const sunCol = isDusk ? '#ff5c1a' : '#ffe84e';
    const glowFn = (a) => isDusk ? `rgba(255,80,0,${a})` : `rgba(255,215,0,${a})`;

    ctx.globalAlpha = alpha;

    /* Corona rings */
    for (let ring = 4; ring >= 1; ring--) {
      const rr = sr * (1 + ring * 0.36 + pulse * 0.06);
      ctx.beginPath();
      ctx.arc(sx, sy, rr, 0, Math.PI * 2);
      ctx.fillStyle = glowFn(0.033 + ring * 0.012);
      ctx.fill();
    }

    /* Rays */
    const rayA = lerp(0.55, 0.22, f.sunsetGlow);
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + frame * 0.004;
      const r1    = sr * 1.22;
      const r2    = sr * (1.54 + Math.sin(frame * 0.07 + i) * 0.07);
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(angle) * r1, sy + Math.sin(angle) * r1);
      ctx.lineTo(sx + Math.cos(angle) * r2, sy + Math.sin(angle) * r2);
      ctx.strokeStyle = glowFn(rayA + pulse * 0.18);
      ctx.lineWidth   = 2;
      ctx.lineCap     = 'round';
      ctx.stroke();
    }

    /* Sun body */
    const sg = ctx.createRadialGradient(sx - sr * 0.22, sy - sr * 0.22, 0, sx, sy, sr);
    sg.addColorStop(0,   '#fffde6');
    sg.addColorStop(0.5, sunCol);
    sg.addColorStop(1,   isDusk ? '#cc2200' : '#f59e0b');
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle   = sg;
    ctx.shadowColor = sunCol;
    ctx.shadowBlur  = 26;
    ctx.fill();
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;
  }


  /* ═══════════════════════════════════════════════════════
     MOON
  ═══════════════════════════════════════════════════════ */

  function moonPos(p) {
    /* Moon is visible from nightStart (0.72) to end-of-cycle (1.0)
       and bleeds into next cycle's dawn [0, dawnEnd = 0.15]. */
    let t;
    if (p >= PH.nightStart) {
      t = (p - PH.nightStart) / (1.0 - PH.nightStart + PH.dayStart);
    } else {
      /* Early part of next dawn */
      t = (1.0 - PH.nightStart + p) / (1.0 - PH.nightStart + PH.dayStart);
    }
    t = clamp(t, 0, 1);

    /* Moon rises from the right (opposite to sun) */
    const x = lerp(W * 0.92, W * 0.08, t);
    const y = H * 0.52 - Math.sin(t * Math.PI) * H * 0.46;
    return { x, y };
  }

  function drawMoon(p, f) {
    if (f.starAlpha < 0.02) return;

    const { x: mx, y: my } = moonPos(p);
    const mr = W * 0.044;

    ctx.globalAlpha = f.starAlpha;

    /* Halo */
    const halo = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 3.5);
    halo.addColorStop(0, 'rgba(180,200,255,0.14)');
    halo.addColorStop(1, 'rgba(180,200,255,0)');
    ctx.beginPath();
    ctx.arc(mx, my, mr * 3.5, 0, Math.PI * 2);
    ctx.fillStyle = halo;
    ctx.fill();

    /* Full disc */
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fillStyle = '#cdd8f5';
    ctx.fill();

    /* Crescent bite */
    ctx.beginPath();
    ctx.arc(mx + mr * 0.48, my - mr * 0.06, mr * 0.76, 0, Math.PI * 2);
    ctx.fillStyle = 'rgb(5,12,28)'; /* matches nightTop */
    ctx.fill();

    /* Rim shimmer */
    ctx.beginPath();
    ctx.arc(mx, my, mr, Math.PI * 0.45, Math.PI * 1.65);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth   = 1.4;
    ctx.stroke();

    ctx.globalAlpha = 1;
  }


  /* ═══════════════════════════════════════════════════════
     STARS
  ═══════════════════════════════════════════════════════ */

  /* Pre-generate deterministic star positions once */
  const STARS = Array.from({ length: 85 }, (_, i) => ({
    fx: ((7919 * (i + 1) * 31) % 940) / 1000 + 0.03,  /* 0.03 – 0.97 */
    fy: ((2731 * (i + 1) * 17) % 600) / 1000,          /* 0.00 – 0.60 */
    r:  0.4 + (i % 4) * 0.3,
    tw: i * 0.97,   /* twinkle phase offset */
  }));

  const BRIGHT_STARS = [
    { fx: 0.15, fy: 0.07 }, { fx: 0.82, fy: 0.11 },
    { fx: 0.55, fy: 0.05 }, { fx: 0.35, fy: 0.18 },
  ];

  function drawStars(f) {
    if (f.starAlpha < 0.02) return;

    STARS.forEach(s => {
      const twinkle = (Math.sin(frame * 0.04 + s.tw) + 1) / 2;
      ctx.beginPath();
      ctx.arc(W * s.fx, H * s.fy, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${f.starAlpha * (0.28 + twinkle * 0.58)})`;
      ctx.fill();
    });

    BRIGHT_STARS.forEach((s, i) => {
      const bx = W * s.fx;
      const by = H * s.fy;
      const tw = (Math.sin(frame * 0.06 + i * 1.8) + 1) / 2;
      const br = 1.4 + tw * 0.8;

      ctx.globalAlpha = f.starAlpha * (0.4 + tw * 0.5);
      ctx.strokeStyle = 'rgba(200,220,255,0.8)';
      ctx.lineWidth   = 0.8;
      ctx.beginPath();
      ctx.moveTo(bx - br * 2.5, by); ctx.lineTo(bx + br * 2.5, by);
      ctx.moveTo(bx, by - br * 2.5); ctx.lineTo(bx, by + br * 2.5);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fillStyle = '#e8eeff';
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }


  /* ═══════════════════════════════════════════════════════
     SUNSET ATMOSPHERE
  ═══════════════════════════════════════════════════════ */

  function drawSunsetAtmosphere(f) {
    if (f.sunsetGlow < 0.04) return;

    const g = ctx.createLinearGradient(0, H * 0.44, 0, H * 0.78);
    g.addColorStop(0,   `rgba(255,100,0,0)`);
    g.addColorStop(0.3, `rgba(255,80,10,${f.sunsetGlow * 0.22})`);
    g.addColorStop(0.7, `rgba(255,140,20,${f.sunsetGlow * 0.18})`);
    g.addColorStop(1,   'rgba(255,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.44, W, H * 0.34);

    /* Darken the scene silhouette */
    ctx.fillStyle = `rgba(12,8,4,${f.sunsetGlow * 0.26})`;
    ctx.fillRect(0, H * 0.62, W, H * 0.38);
  }


  /* ═══════════════════════════════════════════════════════
     ENERGY PARTICLES (day → dusk, fade with panel energy)
     FIX 5: store fractional coords so resize doesn't break them
  ═══════════════════════════════════════════════════════ */

  class Particle {
    constructor() {
      /* Stagger initial progress so they don't all fire at once */
      this.t = Math.random();
      this.reset(true);
    }

    reset(keepT = false) {
      const pIdx      = Math.floor(Math.random() * 5);
      /* Fractional source position — panels are at ~28–56% X, ~38% Y */
      this.srcFX = 0.28 + pIdx * (0.056 + 0.004);
      this.srcFY = 0.38;
      /* Fractional destination — inverter/house centre */
      this.dstFX = 0.48 + (Math.random() - 0.5) * 0.10;
      this.dstFY = 0.67;
      this.spd   = 0.006 + Math.random() * 0.007;
      this.r     = 1.8 + Math.random() * 2.0;
      this.col   = Math.random() > 0.5 ? '#FFD700' : '#4DBD33';
      this.trail = [];
      if (!keepT) this.t = 0;
    }

    update() {
      this.t = Math.min(1, this.t + this.spd);

      /* Bezier in fractional space → convert to px each frame */
      const sx = this.srcFX * W, sy = this.srcFY * H;
      const dx = this.dstFX * W, dy = this.dstFY * H;
      const cx = (sx + dx) * 0.5;
      const cy = sy - H * 0.22;

      const t = this.t;
      const bx = (1-t)*(1-t)*sx + 2*(1-t)*t*cx + t*t*dx;
      const by = (1-t)*(1-t)*sy + 2*(1-t)*t*cy + t*t*dy;

      this.trail.push({ x: bx, y: by });
      if (this.trail.length > 10) this.trail.shift();
      this.curX  = bx;
      this.curY  = by;
      this.alpha = t < 0.1 ? t * 10 : t > 0.85 ? (1 - t) * 6.67 : 1;

      if (this.t >= 1) this.reset();
    }

    draw(energy) {
      if (energy < 0.02) return;

      /* Trail */
      for (let i = 0; i < this.trail.length - 1; i++) {
        const a = (i / this.trail.length) * this.alpha * 0.55 * energy;
        if (a < 0.01) continue;
        ctx.beginPath();
        ctx.moveTo(this.trail[i].x, this.trail[i].y);
        ctx.lineTo(this.trail[i+1].x, this.trail[i+1].y);
        ctx.strokeStyle = this.col + Math.round(a * 255).toString(16).padStart(2, '0');
        ctx.lineWidth   = this.r * 0.5;
        ctx.lineCap     = 'round';
        ctx.stroke();
      }

      /* Head glow */
      const g = ctx.createRadialGradient(this.curX, this.curY, 0, this.curX, this.curY, this.r * 2.5);
      g.addColorStop(0, this.col);
      g.addColorStop(1, this.col + '00');
      ctx.beginPath();
      ctx.arc(this.curX, this.curY, this.r, 0, Math.PI * 2);
      ctx.fillStyle   = g;
      ctx.globalAlpha = this.alpha * energy;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  const particles = Array.from({ length: 36 }, () => new Particle());


  /* ═══════════════════════════════════════════════════════
     SCENE: GROUND, HOUSE, PANELS, INVERTER, BATTERY
  ═══════════════════════════════════════════════════════ */

  function drawGround(f) {
    ctx.fillStyle = groundGradient(f);
    ctx.beginPath();
    ctx.ellipse(W * 0.5, H * 0.78, W * 0.68, H * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHouse(f) {
    const n  = f.windowGlow;  /* 0 = day, 1 = night */
    const bx = W * 0.22, by = H * 0.75;
    const hw = W * 0.56, hh = H * 0.28;
    const peak = by - hh - H * 0.14;

    /* Walls */
    const wr = Math.round(lerp(222, 14, n));
    const wg = Math.round(lerp(234, 30, n));
    const wb = Math.round(lerp(246, 46, n));
    ctx.fillStyle = `rgb(${wr},${wg},${wb})`;
    ctx.beginPath();
    ctx.roundRect(bx, by - hh, hw, hh, [0, 0, 6, 6]);
    ctx.fill();

    /* Roof */
    const rr = Math.round(lerp(185, 10, n));
    const rg = Math.round(lerp(208, 23, n));
    const rb = Math.round(lerp(233, 38, n));
    ctx.fillStyle = `rgb(${rr},${rg},${rb})`;
    ctx.beginPath();
    ctx.moveTo(bx - W * 0.024, by - hh);
    ctx.lineTo(bx + hw * 0.5,  peak);
    ctx.lineTo(bx + hw + W * 0.024, by - hh);
    ctx.closePath();
    ctx.fill();

    /* Door */
    const dw = hw * 0.13, dh = hh * 0.44;
    const dr = Math.round(lerp(138, 7, n));
    const dg = Math.round(lerp(170, 18, n));
    const db = Math.round(lerp(200, 26, n));
    ctx.fillStyle = `rgb(${dr},${dg},${db})`;
    ctx.beginPath();
    ctx.roundRect(bx + hw * 0.435, by - dh, dw, dh, [dw * 0.4, dw * 0.4, 0, 0]);
    ctx.fill();

    /* Windows */
    [[0.20, 0.52], [0.64, 0.52]].forEach(([rx, ry], wi) => {
      const wx = bx + hw * rx, wy = by - hh * ry - hh * 0.15;
      const ww = hw * 0.13,    wh = hh * 0.22;
      const flicker = (Math.sin(frame * 0.035 + wi * 4.2) + 1) / 2;

      /* Night: warm outer halo */
      if (n > 0.05) {
        const hG = ctx.createRadialGradient(
          wx + ww/2, wy + wh/2, 0,
          wx + ww/2, wy + wh/2, ww * 2.2
        );
        hG.addColorStop(0, `rgba(255,190,40,${n * (0.1 + flicker * 0.06)})`);
        hG.addColorStop(1, 'rgba(255,140,0,0)');
        ctx.beginPath();
        ctx.arc(wx + ww/2, wy + wh/2, ww * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = hG;
        ctx.fill();
      }

      /* Pane */
      const pr = Math.round(lerp(200, 255, n));
      const pg = Math.round(lerp(226, 170 + flicker * 30, n));
      const pb = Math.round(lerp(255, 40, n));
      const pa = lerp(0.75, 0.65 + flicker * 0.25, n);
      ctx.fillStyle = `rgba(${pr},${pg},${pb},${pa})`;
      ctx.beginPath();
      ctx.roundRect(wx, wy, ww, wh, 3);
      ctx.fill();

      /* Dividers */
      ctx.strokeStyle = n > 0.5
        ? `rgba(255,200,80,${0.2 * n})`
        : 'rgba(150,180,220,0.4)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(wx + ww/2, wy); ctx.lineTo(wx + ww/2, wy + wh);
      ctx.moveTo(wx, wy + wh/2); ctx.lineTo(wx + ww,   wy + wh/2);
      ctx.stroke();
    });

    /* Chimney */
    const cr = Math.round(lerp(155, 14, n));
    const cg = Math.round(lerp(182, 28, n));
    const cb = Math.round(lerp(204, 42, n));
    ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
    ctx.fillRect(bx + hw * 0.14, peak + H * 0.054, W * 0.033, H * 0.055);
  }

  function drawSolarPanels(f) {
    const energy = f.panelEnergy;
    const roofY  = H * 0.38;
    const startX = W * 0.28;
    const panW   = W * 0.055;
    const panH   = H * 0.048;
    const tilt   = 0.18;

    for (let i = 0; i < 5; i++) {
      const px = startX + i * (panW + 4);
      const py = roofY  - i * 1.4;

      ctx.save();
      ctx.translate(px + panW / 2, py + panH / 2);
      ctx.rotate(-tilt);

      /* Body — night-adapted brightness */
      const bl = Math.round(lerp(7,  21, energy));
      const bg = Math.round(lerp(30, 101, energy));
      const bb = Math.round(lerp(64, 192, energy));
      const pg = ctx.createLinearGradient(-panW/2, -panH/2, panW/2, panH/2);
      pg.addColorStop(0, `rgb(${bl},${bg},${bb})`);
      pg.addColorStop(1, `rgb(${bl-6},${bg+8},${bb+8})`);
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.roundRect(-panW/2, -panH/2, panW, panH, 3);
      ctx.fill();

      /* Shimmer in day */
      if (energy > 0.3) {
        const sh = ((energy - 0.3) / 0.7) * (0.07 + Math.sin(frame * 0.05 + i * 0.8) * 0.04);
        ctx.fillStyle = `rgba(255,255,255,${sh})`;
        ctx.beginPath();
        ctx.moveTo(-panW/2, -panH/2);
        ctx.lineTo(0,       -panH/2);
        ctx.lineTo(-panW*0.2, panH/2);
        ctx.lineTo(-panW/2,   panH/2);
        ctx.closePath();
        ctx.fill();
      }

      /* Grid lines */
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth   = 0.7;
      for (let gx = -panW/2 + panW/3; gx < panW/2; gx += panW/3) {
        ctx.beginPath(); ctx.moveTo(gx, -panH/2); ctx.lineTo(gx, panH/2); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(-panW/2, 0); ctx.lineTo(panW/2, 0); ctx.stroke();

      /* Active glow border */
      const glA = energy * (0.12 + Math.sin(frame * 0.06 + i * 1.2) * 0.08);
      ctx.strokeStyle = energy > 0.4
        ? `rgba(77,189,51,${glA})`
        : `rgba(59,130,246,${glA * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-panW/2, -panH/2, panW, panH, 3);
      ctx.stroke();

      ctx.restore();
    }
  }

  function drawInverter(f) {
    const ix = W * 0.48, iy = H * 0.62;
    const iw = W * 0.065, ih = H * 0.055;
    const n  = f.windowGlow;

    const br = Math.round(lerp(91,  14, n));
    const bg = Math.round(lerp(120, 30, n));
    const bb = Math.round(lerp(153, 48, n));
    ctx.fillStyle = `rgb(${br},${bg},${bb})`;
    ctx.beginPath();
    ctx.roundRect(ix - iw/2, iy - ih/2, iw, ih, 4);
    ctx.fill();

    const ledA = 0.5 + Math.sin(frame * 0.10) * 0.45;
    ctx.fillStyle = n > 0.5
      ? `rgba(59,130,246,${ledA})`
      : `rgba(77,189,51,${ledA * Math.max(0.2, f.panelEnergy)})`;
    ctx.beginPath();
    ctx.arc(ix, iy, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle    = 'rgba(255,255,255,0.4)';
    ctx.font         = `bold ${W * 0.011}px Poppins, sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n > 0.5 ? 'BAT' : 'INV', ix, iy + H * 0.014);
  }

  function drawBatteryMeter(f) {
    const bx = W * 0.425, by = H * 0.67;
    const bw = W * 0.150, bh = H * 0.022;
    const isNight = f.windowGlow > 0.5;

    if (isNight) {
      battPct = Math.max(0.12, battPct - 0.00012);
    } else if (f.panelEnergy > 0.3) {
      battPct = Math.min(0.96, battPct + 0.00015);
    }

    /* Track */
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, bh / 2);
    ctx.fill();

    /* Fill */
    ctx.fillStyle = isNight ? '#3b82f6' : '#4DBD33';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw * battPct, bh, bh / 2);
    ctx.fill();

    const labelA = 0.5 + (isNight ? f.windowGlow : f.daylight) * 0.3;
    ctx.fillStyle    = `rgba(255,255,255,${labelA})`;
    ctx.font         = `${W * 0.011}px Inter, sans-serif`;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `🔋 ${Math.round(battPct * 100)}%  ${isNight ? 'Stored energy' : 'Charging'}`,
      bx, by - H * 0.013
    );
  }

  function drawNightFlow(f) {
    if (f.windowGlow < 0.3) return;
    const srcX = W * 0.415, srcY = H * 0.67;

    [[W * 0.31, H * 0.55], [W * 0.67, H * 0.55]].forEach((tgt, ti) => {
      for (let d = 0; d < 2; d++) {
        const t2 = ((frame * 0.004 + ti * 0.5 + d * 0.5) % 1);
        const mx = (srcX + tgt[0]) / 2;
        const my = Math.min(srcY, tgt[1]) - H * 0.08;
        const bx = (1-t2)*(1-t2)*srcX + 2*(1-t2)*t2*mx + t2*t2*tgt[0];
        const by = (1-t2)*(1-t2)*srcY + 2*(1-t2)*t2*my + t2*t2*tgt[1];
        ctx.beginPath();
        ctx.arc(bx, by, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,185,0,${f.windowGlow * (0.55 + Math.sin(frame * 0.12 + d) * 0.3)})`;
        ctx.fill();
      }
    });
  }

  function drawGridLine(f) {
    if (f.panelEnergy < 0.2) return;
    const ea = (f.panelEnergy - 0.2) / 0.8;
    const ox = W * 0.12, oy = H * 0.55;

    ctx.globalAlpha = ea * 0.24;
    ctx.setLineDash([5, 7]);
    ctx.strokeStyle = '#4DBD33';
    ctx.lineWidth   = 1.4;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.bezierCurveTo(ox + W * 0.2, oy, W * 0.7, H * 0.38, W, H * 0.38);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    for (let d = 0; d < 3; d++) {
      const t = ((frame * 0.003 + d / 3) % 1);
      const bx = Math.pow(1-t,3)*ox    + 3*Math.pow(1-t,2)*t*(ox+W*0.2)
               + 3*(1-t)*t*t*(W*0.7)   + t*t*t*W;
      const by = Math.pow(1-t,3)*oy    + 3*Math.pow(1-t,2)*t*oy
               + 3*(1-t)*t*t*(H*0.38)  + t*t*t*(H*0.38);
      ctx.beginPath();
      ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(77,189,51,${ea * (0.55 + Math.sin(frame*0.1+d)*0.3)})`;
      ctx.fill();
    }
  }


  /* ═══════════════════════════════════════════════════════
     INFO PANEL
  ═══════════════════════════════════════════════════════ */

  const STATS = { kw: 4.8, kwh: 18.4, saved: 342, co2: 2.1 };

  function drawInfoPanel(f) {
    const pw = W * 0.38, ph = H * 0.16;
    const px = W - pw - W * 0.03;
    const py = H - ph - H * 0.04;
    const n  = f.windowGlow;

    /* Card background */
    ctx.save();
    ctx.fillStyle   = n > 0.5 ? `rgba(8,18,36,0.88)` : `rgba(255,255,255,0.9)`;
    ctx.shadowColor = 'rgba(0,0,0,0.22)';
    ctx.shadowBlur  = 14;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 12);
    ctx.fill();
    ctx.shadowBlur  = 0;
    ctx.restore();

    ctx.strokeStyle = n > 0.5 ? 'rgba(255,215,0,0.14)' : 'rgba(4,80,151,0.09)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 12);
    ctx.stroke();

    const cells = n > 0.5
      ? [
          { icon: '🔋', label: 'Stored',    value: `${(battPct * 10).toFixed(1)} kWh`, col: '#3b82f6' },
          { icon: '🌙', label: 'Night use', value: `${(1.8 + Math.sin(frame*0.02)*0.3).toFixed(1)} kW`, col: '#a78bfa' },
          { icon: '₹',  label: 'Saved',     value: `₹${STATS.saved}`,  col: '#4ade80' },
          { icon: '🍃', label: 'CO₂ offset',value: `${STATS.co2} kg`,  col: '#4DBD33' },
        ]
      : [
          { icon: '⚡', label: 'Live Output', value: `${(STATS.kw + Math.sin(frame*0.04)*0.3).toFixed(1)} kW`, col: '#FFD700' },
          { icon: '☀️', label: 'Today',       value: `${(STATS.kwh + frame*0.0002).toFixed(1)} kWh`,          col: '#f59e0b' },
          { icon: '₹',  label: 'Saved',       value: `₹${STATS.saved}`,   col: '#4ade80' },
          { icon: '🍃', label: 'CO₂ offset',  value: `${STATS.co2} kg`,   col: '#4DBD33' },
        ];

    const cellW = pw / 4;

    cells.forEach((cell, i) => {
      const cx = px + i * cellW + cellW / 2;
      const cy = py + ph / 2;

      if (i > 0) {
        ctx.strokeStyle = n > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(px + i * cellW, py + ph * 0.2);
        ctx.lineTo(px + i * cellW, py + ph * 0.8);
        ctx.stroke();
      }

      ctx.font         = `${W * 0.022}px serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cell.icon, cx, cy - H * 0.028);

      ctx.font      = `bold ${W * 0.021}px Poppins, sans-serif`;
      ctx.fillStyle = cell.col;
      ctx.fillText(cell.value, cx, cy + H * 0.005);

      ctx.font      = `${W * 0.013}px Inter, sans-serif`;
      ctx.fillStyle = n > 0.5 ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.33)';
      ctx.fillText(cell.label, cx, cy + H * 0.033);
    });

    /* Phase label */
    const label = f.sunsetGlow > 0.35 ? '🌅 Sunset'
                : f.starAlpha  > 0.5  ? '🌙 Night'
                : f.daylight   > 0.9  ? '☀️ Daytime'
                : dayPhase < PH.dayStart ? '🌄 Dawn'
                : '🌤 Day';

    ctx.font      = `600 ${W * 0.013}px Poppins, sans-serif`;
    ctx.fillStyle = n > 0.5 ? 'rgba(255,215,0,0.65)' : 'rgba(4,80,151,0.5)';
    ctx.textAlign = 'left';
    ctx.fillText(label, px + 12, py + 13);
  }


  /* ═══════════════════════════════════════════════════════
     MAIN RENDER LOOP
  ═══════════════════════════════════════════════════════ */

  function draw(now) {
    /* Re-measure canvas each frame (handles CSS-only resize events) */
    const rect = canvas.getBoundingClientRect();
    if (Math.abs(W - rect.width) > 1 || Math.abs(H - rect.height) > 1) {
      resize();
    }

    ctx.clearRect(0, 0, W, H);
    frame++;

    /* Advance phase: elapsed wraps cleanly via modulo */
    const elapsed = (now - cycleStart) % CYCLE_MS;
    dayPhase = elapsed / CYCLE_MS;   /* 0 → 1, loops forever */

    const f = getFactors(dayPhase);

    /* ── Background ── */
    ctx.fillStyle = skyGradient(f);
    ctx.fillRect(0, 0, W, H * 0.76);

    /* ── Atmosphere ── */
    drawSunsetAtmosphere(f);
    drawStars(f);
    drawSun(dayPhase, f);
    drawMoon(dayPhase, f);

    /* ── Ground ── */
    drawGround(f);
    drawGridLine(f);

    /* ── Architecture ── */
    drawHouse(f);
    drawSolarPanels(f);
    drawInverter(f);
    drawBatteryMeter(f);

    /* ── Energy flow ── */
    drawNightFlow(f);
    if (f.panelEnergy > 0.04) {
      particles.forEach(p => { p.update(); p.draw(f.panelEnergy); });
    }

    /* ── HUD ── */
    drawInfoPanel(f);

    raf = requestAnimationFrame(draw);
  }


  /* ═══════════════════════════════════════════════════════
     START-UP
     FIX 1: cycleStart already set at top of IIFE.
     We just call resize() then kick off the RAF loop.
     No setTimeout, no double-setting of cycleStart.
  ═══════════════════════════════════════════════════════ */

  resize();
  raf = requestAnimationFrame(draw);

  /*
   * FIX 3: Single ResizeObserver for dimension changes.
   * Does NOT touch cycleStart — the phase continues uninterrupted.
   */
  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);

  /*
   * FIX 4: Visibility change — robustly restart RAF.
   * raf is always a valid number (0 = never started).
   */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (raf > 0) { cancelAnimationFrame(raf); raf = 0; }
    } else {
      /* Resume from where the phase currently is —
         cycleStart is untouched so dayPhase is continuous. */
      if (raf === 0) raf = requestAnimationFrame(draw);
    }
  });

})();


/* ============================================================
   2. ROI CALCULATOR
   ============================================================ */

(function initROICalculator() {

  const calculateBtn  = document.getElementById('calculate-roi');
  const billInput     = document.getElementById('monthly-bill');
  const areaInput     = document.getElementById('roof-area');
  const stateSelect   = document.getElementById('state-select');
  const billHint      = document.getElementById('monthly-bill-hint');

  // Result elements
  const elSavings  = document.getElementById('result-annual-savings');
  const elSystem   = document.getElementById('result-system-size');
  const elPayback  = document.getElementById('result-payback');
  const elCO2      = document.getElementById('result-co2');
  const elOffset   = document.getElementById('result-offset-pct');
  const progressBar= document.getElementById('roi-progress-bar');
  const progressContainer = document.getElementById('offset-bar-container');

  if (!calculateBtn) return;

  /** Validate input fields */
  function validate() {
    const bill = parseFloat(billInput.value);
    if (!bill || bill < 500) {
      billInput.classList.add('error');
      billHint.textContent = 'Please enter a monthly bill of at least ₹500.';
      billInput.focus();
      return false;
    }
    billInput.classList.remove('error');
    billHint.textContent = '';
    return true;
  }

  /** Animate a number from current displayed value to target */
  function animateValue(el, target, prefix = '', suffix = '', decimals = 0) {
    const start    = 0;
    const duration = 900;
    const startTs  = performance.now();

    function step(ts) {
      const progress = Math.min((ts - startTs) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current  = start + (target - start) * eased;
      el.textContent = prefix + current.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /** Core calculation engine */
  function calculate() {
    if (!validate()) return;

    const monthlyBill = parseFloat(billInput.value) || 5000;
    const roofArea    = parseFloat(areaInput.value)  || 600;
    const peakSunHrs  = parseFloat(stateSelect.value) || 5.2;

    // kWh from bill (avg rate ₹7/unit)
    const monthlyKWh = monthlyBill / 7;
    const annualKWh  = monthlyKWh * 12;

    // System size (kW)
    const systemSize = Math.min(
      annualKWh / (peakSunHrs * 365 * 0.80),
      roofArea / 100 // ~100 sq ft per kW
    );
    const roundedSize = Math.max(1, Math.round(systemSize * 10) / 10);

    // Annual solar generation
    const annualGenKWh = roundedSize * peakSunHrs * 365 * 0.80;

    // Grid offset %
    const offsetPct = Math.min(85, Math.round((annualGenKWh / annualKWh) * 100));

    // Annual savings (₹)
    const annualSavings = Math.round(annualKWh * (offsetPct / 100) * 7);

    // System cost (₹55,000/kW average installed)
    const systemCost = roundedSize * 55000;

    // Payback years
    const payback = annualSavings > 0 ? (systemCost / annualSavings).toFixed(1) : '—';

    // CO₂ offset (0.82 kg CO₂ / kWh for Indian grid)
    const co2Tonnes = ((annualGenKWh * 0.82) / 1000).toFixed(1);

    // ── Animate results ──
    animateValue(elSavings,  annualSavings, '₹', '', 0);
    animateValue(elSystem,   roundedSize,   '',  ' kW', 1);
    animateValue(elPayback,  parseFloat(payback), '', ' yrs', 1);
    animateValue(elCO2,      parseFloat(co2Tonnes), '', ' T', 1);
    animateValue(elOffset,   offsetPct, '', '%', 0);

    // Progress bar
    progressBar.style.width = offsetPct + '%';
    progressContainer.setAttribute('aria-valuenow', offsetPct);

    // Toast feedback
    if (window.SolarEchos) {
      window.SolarEchos.showToast(
        `Great news! You could save ₹${annualSavings.toLocaleString('en-IN')} per year with solar.`,
        'success'
      );
    }
  }

  calculateBtn.addEventListener('click', calculate);

  // Allow Enter key on inputs
  [billInput, areaInput, stateSelect].forEach(el => {
    if (!el) return;
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') calculate();
    });
  });

  // Clear error on input
  billInput.addEventListener('input', () => {
    billInput.classList.remove('error');
    billHint.textContent = '';
  });

})();


/* ============================================================
   3. TESTIMONIALS SLIDER
   ============================================================ */

(function initTestimonialsSlider() {

  const track    = document.getElementById('testimonials-track');
  const dotsWrap = document.getElementById('testimonials-dots');
  const prevBtn  = document.getElementById('prev-testimonial');
  const nextBtn  = document.getElementById('next-testimonial');

  if (!track) return;

  const cards    = Array.from(track.querySelectorAll('.testimonial-card'));
  let currentIdx = 0;
  let autoTimer;

  // Build dot buttons
  cards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'testimonials__dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Go to testimonial ${i + 1}`);
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-selected', String(i === 0));
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });

  function goTo(idx) {
    currentIdx = (idx + cards.length) % cards.length;

    // On desktop: scroll track; on mobile: noop (CSS scroll handles it)
    if (window.innerWidth > 768) {
      // Each card is 1fr — calculate offset
      const cardW = track.offsetWidth / cards.length;
      // We only show a portion — actually we use CSS grid on desktop
      // so we fade/highlight the active card instead
      cards.forEach((c, i) => {
        c.style.opacity = i === currentIdx ? '1' : '0.6';
        c.style.transform = i === currentIdx ? 'translateY(-4px) scale(1.02)' : 'scale(1)';
      });
    }

    // Update dots
    dotsWrap.querySelectorAll('.testimonials__dot').forEach((d, i) => {
      d.classList.toggle('active', i === currentIdx);
      d.setAttribute('aria-selected', String(i === currentIdx));
    });
  }

  function next() { goTo(currentIdx + 1); }
  function prev() { goTo(currentIdx - 1); }

  nextBtn?.addEventListener('click', () => { next(); resetAuto(); });
  prevBtn?.addEventListener('click', () => { prev(); resetAuto(); });

  function startAuto() {
    autoTimer = setInterval(next, 4500);
  }

  function resetAuto() {
    clearInterval(autoTimer);
    startAuto();
  }

  // Keyboard
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { next(); resetAuto(); }
    if (e.key === 'ArrowLeft')  { prev(); resetAuto(); }
  });

  // Pause on hover
  track.addEventListener('mouseenter', () => clearInterval(autoTimer));
  track.addEventListener('mouseleave', startAuto);

  startAuto();
  goTo(0);

})();


/* ============================================================
   4. COUNTER ANIMATION (Impact section)
   Triggers when the impact section scrolls into view.
   ============================================================ */

(function initCounters() {

  function animateCounter(el) {
    const target  = parseFloat(el.getAttribute('data-count-to'));
    const suffix  = el.getAttribute('data-suffix') || '';
    const decimals = target % 1 !== 0 ? 1 : 0;
    const duration = 1800;
    const startTs  = performance.now();

    function step(ts) {
      const progress = Math.min((ts - startTs) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      const value    = target * eased;
      el.textContent = value.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const counterEls = document.querySelectorAll('.impact__number[data-count-to]');
  if (!counterEls.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  counterEls.forEach(el => observer.observe(el));

})();


/* ============================================================
   5. LUCIDE ICONS RE-INIT after component injection
   The navbar/footer are loaded asynchronously; icons inside
   them won't be rendered by the inline script. We re-run
   lucide.createIcons() once components are in the DOM.
   ============================================================ */

(function watchForComponentInjection() {

  const observer = new MutationObserver(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  });

  const navbar = document.getElementById('navbar-placeholder');
  const footer = document.getElementById('footer-placeholder');

  if (navbar) observer.observe(navbar, { childList: true });
  if (footer) observer.observe(footer, { childList: true });

})();

/* ============================================================
   END OF HOME-1 JAVASCRIPT
   ============================================================ */

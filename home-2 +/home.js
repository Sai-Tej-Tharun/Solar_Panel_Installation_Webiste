/**
 * ================================================================
 * Solar-Echos | Home Page 2 – JS
 * Author  : SolarEchos
 * Version : 1.0.0
 *
 * Modules:
 *  1. Ambient canvas  – animated dot-grid + floating particles
 *  2. Hero live chart – real-time-style sparkline (Canvas 2D)
 *  3. Dashboard charts – 7-day bar chart (Canvas 2D)
 *  4. Bento mini-chart – small sparkline
 *  5. Animated counters – hero KPI numbers
 *  6. Live kWh ticker   – hero "System Live" value
 *  7. Plan price toggle – monthly / annual billing
 *  8. Chart tab switcher
 *  9. Page entrance animations (stagger)
 * 10. Install progress bar animation
 * ================================================================
 */

'use strict';

/* ──────────────────────────────────────────────────────────────
   HELPERS
   ────────────────────────────────────────────────────────────── */

/**
 * Returns CSS custom property value from :root.
 * @param {string} prop - e.g. '--color-accent-yellow'
 */
function cssVar(prop) {
  return getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
}

/**
 * Checks whether the document is currently in dark mode.
 * @returns {boolean}
 */
function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

/**
 * Linear interpolation
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/* ================================================================
   1. AMBIENT CANVAS
      Animated dot-grid background with slow-drifting particles.
   ================================================================ */

(function initAmbientCanvas() {
  const canvas = document.getElementById('ambient-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  let W, H, particles, animId;

  /* Grid settings */
  const GRID_SPACING = 48;
  const DOT_RADIUS   = 1.2;

  /* Particle settings */
  const PARTICLE_COUNT = 28;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildParticles();
  }

  function buildParticles() {
    particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x:   Math.random() * W,
      y:   Math.random() * H,
      vx:  (Math.random() - 0.5) * 0.35,
      vy:  (Math.random() - 0.5) * 0.35,
      r:   Math.random() * 2 + 1,
      alpha: Math.random() * 0.4 + 0.1,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    const dark = isDark();

    /* ── Draw dot grid ── */
    const dotColor = dark
      ? 'rgba(255,255,255,0.06)'
      : 'rgba(4,80,151,0.08)';

    ctx.fillStyle = dotColor;
    for (let x = GRID_SPACING; x < W; x += GRID_SPACING) {
      for (let y = GRID_SPACING; y < H; y += GRID_SPACING) {
        ctx.beginPath();
        ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* ── Draw particles ── */
    particles.forEach(p => {
      /* Gentle pulse alpha */
      p.alpha += Math.sin(Date.now() * 0.001 + p.x) * 0.002;
      p.alpha  = Math.max(0.05, Math.min(0.5, p.alpha));

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = dark
        ? `rgba(255,215,0,${p.alpha * 0.7})`
        : `rgba(4,80,151,${p.alpha * 0.5})`;
      ctx.fill();

      /* Move */
      p.x += p.vx;
      p.y += p.vy;

      /* Wrap around edges */
      if (p.x < 0)  p.x = W;
      if (p.x > W)  p.x = 0;
      if (p.y < 0)  p.y = H;
      if (p.y > H)  p.y = 0;
    });

    animId = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();
  draw();
})();


/* ================================================================
   2. HERO SPARKLINE CHART  (#hero-chart)
      Animated real-time-style solar production curve.
   ================================================================ */

(function initHeroChart() {
  const canvas = document.getElementById('hero-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  /* Simulated hourly data (6 AM – current hour) */
  const baseData = [0.2, 0.8, 1.6, 2.8, 3.9, 4.2, 4.7, 4.5, 4.1, 3.6];
  let displayData = baseData.map(() => 0); // starts at 0, animates up
  let progress    = 0;
  let animId;

  function getColors() {
    const dark = isDark();
    return {
      lineColor: dark ? '#FFD700' : '#e15c23',
      fillStart: dark ? 'rgba(255,215,0,0.25)' : 'rgba(225,92,35,0.2)',
      fillEnd  : dark ? 'rgba(255,215,0,0)' : 'rgba(225,92,35,0)',
      dotColor : dark ? '#FFD700' : '#e15c23',
      gridColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(4,80,151,0.06)',
    };
  }

  function drawChart() {
    const W = canvas.offsetWidth;
    const H = canvas.height;
    canvas.width = W;

    const col    = getColors();
    const pad    = { top: 8, right: 8, bottom: 8, left: 8 };
    const cW     = W - pad.left - pad.right;
    const cH     = H - pad.top  - pad.bottom;
    const maxVal = 5;
    const n      = displayData.length;

    ctx.clearRect(0, 0, W, H);

    /* ── Grid lines ── */
    ctx.strokeStyle = col.gridColor;
    ctx.lineWidth   = 1;
    [0.25, 0.5, 0.75, 1].forEach(t => {
      const y = pad.top + cH * (1 - t);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + cW, y);
      ctx.stroke();
    });

    /* ── Build path ── */
    const points = displayData.map((v, i) => ({
      x: pad.left + (i / (n - 1)) * cW,
      y: pad.top  + cH * (1 - v / maxVal),
    }));

    /* Smooth curve via bezier */
    const path = new Path2D();
    path.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < n; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx  = (prev.x + curr.x) / 2;
      path.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
    }

    /* ── Fill gradient ── */
    const fillGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
    fillGrad.addColorStop(0, col.fillStart);
    fillGrad.addColorStop(1, col.fillEnd);

    const fillPath = new Path2D(path);
    const last = points[n - 1];
    fillPath.lineTo(last.x, pad.top + cH);
    fillPath.lineTo(points[0].x, pad.top + cH);
    fillPath.closePath();

    ctx.fillStyle = fillGrad;
    ctx.fill(fillPath);

    /* ── Line ── */
    ctx.strokeStyle = col.lineColor;
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';
    ctx.stroke(path);

    /* ── Live dot (last point) ── */
    const lp = points[n - 1];
    ctx.beginPath();
    ctx.arc(lp.x, lp.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = col.dotColor;
    ctx.fill();

    /* Pulsing ring */
    const pulse = (Date.now() % 1500) / 1500;
    ctx.beginPath();
    ctx.arc(lp.x, lp.y, 4 + pulse * 10, 0, Math.PI * 2);
    ctx.strokeStyle = col.dotColor.replace(')', `,${(1 - pulse) * 0.6})`).replace('rgb', 'rgba');
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  /* Animate chart in on load */
  function animateIn() {
    progress += 0.03;
    if (progress > 1) progress = 1;
    displayData = baseData.map(v => v * easeOut(progress));
    drawChart();
    if (progress < 1) {
      animId = requestAnimationFrame(animateIn);
    } else {
      /* After entrance, keep live pulse running */
      requestAnimationFrame(livePulse);
    }
  }

  function livePulse() {
    drawChart(); // redraws pulsing dot
    requestAnimationFrame(livePulse);
  }

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  window.addEventListener('resize', drawChart, { passive: true });

  /* Start after short delay */
  setTimeout(animateIn, 400);
})();


/* ================================================================
   3. DASHBOARD MAIN CHART  (#fd-main-chart)
      7-day bar chart for the full dashboard preview section.
   ================================================================ */

(function initDashboardChart() {
  const canvas = document.getElementById('fd-main-chart');
  if (!canvas) return;

  const ctx    = canvas.getContext('2d');
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const values = [22.1, 25.4, 18.7, 28.4, 26.0, 30.1, 24.8];

  let animProgress = 0;
  let started = false;

  /* Observe when the dashboard section enters viewport */
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !started) {
      started = true;
      animate();
      observer.disconnect();
    }
  }, { threshold: 0.2 });

  observer.observe(canvas);

  function animate() {
    animProgress += 0.04;
    if (animProgress >= 1) animProgress = 1;
    draw(easeOut(animProgress));
    if (animProgress < 1) requestAnimationFrame(animate);
  }

  function draw(t) {
    const W = canvas.offsetWidth;
    const H = canvas.height;
    canvas.width = W;

    const dark    = isDark();
    const pad     = { top: 12, right: 16, bottom: 28, left: 32 };
    const cW      = W  - pad.left - pad.right;
    const cH      = H  - pad.top  - pad.bottom;
    const maxVal  = 35;
    const barGap  = 6;
    const barW    = (cW - barGap * (labels.length - 1)) / labels.length;
    const todayI  = 3; // highlight Thursday

    ctx.clearRect(0, 0, W, H);

    /* Grid lines */
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.05)' : 'rgba(4,80,151,0.06)';
    ctx.lineWidth   = 1;
    [0.25, 0.5, 0.75, 1].forEach(pct => {
      const y = pad.top + cH * (1 - pct);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + cW, y);
      ctx.stroke();

      /* Y-axis label */
      ctx.fillStyle  = dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)';
      ctx.font       = '9px DM Sans, sans-serif';
      ctx.textAlign  = 'right';
      ctx.fillText(`${Math.round(maxVal * pct)}`, pad.left - 6, y + 3);
    });

    /* Bars */
    values.forEach((val, i) => {
      const x       = pad.left + i * (barW + barGap);
      const barH    = (val / maxVal) * cH * t;
      const y       = pad.top + cH - barH;
      const isToday = i === todayI;

      /* Gradient per bar */
      const grad = ctx.createLinearGradient(x, y, x, y + barH);
      if (isToday) {
        grad.addColorStop(0, dark ? 'rgba(255,215,0,0.9)'   : 'rgba(225,92,35,0.9)');
        grad.addColorStop(1, dark ? 'rgba(255,215,0,0.3)'   : 'rgba(225,92,35,0.3)');
      } else {
        grad.addColorStop(0, dark ? 'rgba(4,80,151,0.7)'    : 'rgba(4,80,151,0.5)');
        grad.addColorStop(1, dark ? 'rgba(4,80,151,0.15)'   : 'rgba(4,80,151,0.1)');
      }

      ctx.fillStyle = grad;
      roundRect(ctx, x, y, barW, barH, 4);
      ctx.fill();

      /* Value label */
      if (t > 0.6) {
        const alpha = Math.max(0, (t - 0.6) / 0.4);
        ctx.fillStyle  = dark
          ? `rgba(255,255,255,${alpha * (isToday ? 0.9 : 0.4)})`
          : `rgba(0,0,0,${alpha * (isToday ? 0.8 : 0.35)})`;
        ctx.font       = `${isToday ? 'bold ' : ''}10px DM Sans, sans-serif`;
        ctx.textAlign  = 'center';
        ctx.fillText(`${val}`, x + barW / 2, y - 4);
      }

      /* X-axis label */
      ctx.fillStyle = dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
      ctx.font      = '10px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x + barW / 2, pad.top + cH + 18);
    });
  }

  /** Draws a rounded rectangle path */
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h);
    c.lineTo(x, y + h);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  window.addEventListener('resize', () => { if (started) draw(1); }, { passive: true });
})();


/* ================================================================
   4. BENTO MINI-CHART  (#bento-chart-1)
      Small live sparkline inside the "Live Monitoring" bento card.
   ================================================================ */

(function initBentoChart() {
  const canvas = document.getElementById('bento-chart-1');
  if (!canvas) return;

  const ctx    = canvas.getContext('2d');
  const data   = [1.2, 2.4, 3.1, 2.8, 3.9, 4.2, 3.8, 4.7, 4.5, 4.7];
  let offset   = 0;

  function draw() {
    const W = canvas.offsetWidth;
    const H = canvas.height;
    canvas.width = W;

    const dark   = isDark();
    const pad    = 6;
    const cW     = W - pad * 2;
    const cH     = H - pad * 2;
    const max    = 5.5;
    const n      = data.length;

    ctx.clearRect(0, 0, W, H);

    const pts = data.map((v, i) => ({
      x: pad + (i / (n - 1)) * cW,
      y: pad + cH * (1 - v / max),
    }));

    /* Gradient fill */
    const grad = ctx.createLinearGradient(0, pad, 0, pad + cH);
    grad.addColorStop(0, dark ? 'rgba(4,80,151,0.4)' : 'rgba(4,80,151,0.3)');
    grad.addColorStop(1, 'rgba(4,80,151,0)');

    const path = new Path2D();
    path.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < n; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      path.bezierCurveTo(
        (prev.x + curr.x) / 2, prev.y,
        (prev.x + curr.x) / 2, curr.y,
        curr.x, curr.y
      );
    }

    const fillPath = new Path2D(path);
    fillPath.lineTo(pts[n - 1].x, pad + cH);
    fillPath.lineTo(pts[0].x, pad + cH);
    fillPath.closePath();

    ctx.fillStyle = grad;
    ctx.fill(fillPath);

    ctx.strokeStyle = dark ? '#0a6ac4' : '#045097';
    ctx.lineWidth   = 1.5;
    ctx.stroke(path);

    /* Animated live dot */
    const lp = pts[n - 1];
    const pulse = (Date.now() % 1800) / 1800;
    ctx.beginPath();
    ctx.arc(lp.x, lp.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = dark ? '#FFD700' : '#e15c23';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(lp.x, lp.y, 3 + pulse * 8, 0, Math.PI * 2);
    ctx.strokeStyle = dark
      ? `rgba(255,215,0,${(1 - pulse) * 0.5})`
      : `rgba(225,92,35,${(1 - pulse) * 0.5})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => {}, { passive: true });
  draw();
})();


/* ================================================================
   5. ANIMATED COUNTERS  (.h2-count)
      Counts up from 0 to target value when in viewport.
   ================================================================ */

(function initCounters() {
  const counters = document.querySelectorAll('.h2-count');
  if (!counters.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const el     = entry.target;
      const target = parseFloat(el.dataset.target);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const dec    = target % 1 !== 0 ? 1 : 0;
      const dur    = 1400; // ms
      const start  = performance.now();

      function update(now) {
        const t       = Math.min((now - start) / dur, 1);
        const eased   = 1 - Math.pow(1 - t, 3);
        const current = target * eased;
        el.textContent = prefix + current.toFixed(dec) + suffix;
        if (t < 1) requestAnimationFrame(update);
      }

      requestAnimationFrame(update);
      observer.unobserve(el);
    });
  }, { threshold: 0.4 });

  counters.forEach(el => observer.observe(el));
})();


/* ================================================================
   6. LIVE kWh TICKER  (#live-kwh)
      Gently fluctuates the "System Live" output value.
   ================================================================ */

(function initLiveTicker() {
  const el = document.getElementById('live-kwh');
  if (!el) return;

  let base = 4.7;

  setInterval(() => {
    const delta = (Math.random() - 0.5) * 0.4;
    base = Math.max(3.8, Math.min(5.5, base + delta));
    el.textContent = base.toFixed(1) + ' kW';
  }, 2800);
})();


/* ================================================================
   7. PLAN PRICE TOGGLE  (monthly ↔ annual)
   ================================================================ */

(function initPlanToggle() {
  const btnMonthly = document.getElementById('toggle-monthly');
  const btnAnnual  = document.getElementById('toggle-annual');
  if (!btnMonthly || !btnAnnual) return;

  const priceEls = document.querySelectorAll('.h2-plan-price__val');

  function setMode(mode) {
    const isAnnual = mode === 'annual';

    btnMonthly.classList.toggle('h2-toggle-btn--active', !isAnnual);
    btnAnnual.classList.toggle('h2-toggle-btn--active',   isAnnual);
    btnMonthly.setAttribute('aria-pressed', String(!isAnnual));
    btnAnnual.setAttribute('aria-pressed',  String(isAnnual));

    priceEls.forEach(el => {
      const val = isAnnual
        ? el.dataset.annual
        : el.dataset.monthly;
      if (val === undefined) return;

      /* Animate the number change */
      el.style.opacity   = '0';
      el.style.transform = 'translateY(-6px)';
      setTimeout(() => {
        el.textContent     = val;
        el.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        el.style.opacity   = '1';
        el.style.transform = 'translateY(0)';
      }, 150);
    });
  }

  btnMonthly.addEventListener('click', () => setMode('monthly'));
  btnAnnual.addEventListener('click',  () => setMode('annual'));
})();


/* ================================================================
   8. CHART TAB SWITCHER (week / month / year)
   ================================================================ */

(function initChartTabs() {
  const tabs = document.querySelectorAll('.h2-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('h2-tab--active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('h2-tab--active');
      tab.setAttribute('aria-selected', 'true');

      /* In a real app, this would refetch data.
         For demo, we just re-trigger the chart animation. */
      const canvas = document.getElementById('fd-main-chart');
      if (canvas) {
        canvas.dispatchEvent(new Event('redraw'));
      }
    });
  });
})();


/* ================================================================
   9. STAGGERED PAGE ENTRANCE ANIMATIONS
      Adds .visible class to [data-animate] elements progressively.
   ================================================================ */

(function initEntranceAnimations() {
  /* Hero copy animates immediately on load */
  const heroCopy = document.querySelector('.h2-hero__copy');
  if (heroCopy) {
    heroCopy.style.opacity   = '1';
    heroCopy.style.transform = 'none';
  }

  /* All other [data-animate] elements use IntersectionObserver */
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('[data-animate]').forEach(el => {
      el.classList.add('in-view');
    });
    return;
  }

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

  document.querySelectorAll('[data-animate]').forEach(el => obs.observe(el));
})();


/* ================================================================
   10. INSTALL PROGRESS BAR — trigger when in viewport
   ================================================================ */

(function initInstallProgressBar() {
  const bar = document.querySelector('.h2-install-step--active .h2-fd-prog-fill');
  if (!bar) return;

  bar.style.width = '0%';

  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      setTimeout(() => {
        bar.style.width = '65%';
      }, 400);
      observer.disconnect();
    }
  }, { threshold: 0.3 });

  observer.observe(bar.closest('.h2-install-card') || bar);
})();


/* ================================================================
   11. THEME CHANGE LISTENER
      Redraws canvases when user toggles dark/light mode.
   ================================================================ */

(function watchThemeChange() {
  const mutObs = new MutationObserver(() => {
    /* Canvases will repaint on their next requestAnimationFrame,
       so nothing special is needed — just let them run. */
  });

  mutObs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
})();


/* ================================================================
   12. NAVBAR SCROLL COLOUR SHIFT
      Makes the hero ticker bar sticky-aware.
   ================================================================ */

(function initNavbarScrollShift() {
  const navbar = document.getElementById('main-navbar');
  if (!navbar) return;

  let lastY = 0;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;

    /* Add scrolled class (global.js also handles this, belt-and-suspenders) */
    navbar.classList.toggle('scrolled', y > 20);

    lastY = y;
  }, { passive: true });
})();

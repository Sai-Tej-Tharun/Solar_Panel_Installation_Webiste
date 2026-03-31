/**
 * Solar-Echos | Home Page 2 — JavaScript
 * Author: TechEchos Innovation
 * Version: 1.0.0
 *
 * Modules:
 *  1. Hero Particle Field Canvas
 *  2. Hero Dashboard Mini-Chart (Lucide-free)
 *  3. Hero Phone Sparkline
 *  4. Main Energy Production Chart (Section 3)
 *  5. App Gauge Canvas (Section 4)
 *  6. App Bar Chart (Section 4)
 *  7. Range Toggle (Today / Week / Month)
 *  8. Billing Toggle (Monthly / Annual)
 *  9. Live Stat Ticker
 * 10. Lucide re-init after component injection
 */

'use strict';

/* ============================================================
   1. HERO PARTICLE FIELD
   Floating glowing orbs that drift across the dark hero
   background, representing energy data packets.
   ============================================================ */

(function initParticleField() {

  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, raf;
  const particles = [];
  const PARTICLE_COUNT = 70;

  /* Resize to match element */
  function resize() {
    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    W = rect.width;
    H = rect.height;
  }

  /* Particle factory */
  function makeParticle() {
    const colors = ['#FFD700', '#4DBD33', '#0a6ac4', '#e15c23', '#ffffff'];
    return {
      x:     Math.random() * W,
      y:     Math.random() * H,
      r:     0.6 + Math.random() * 2.2,
      vx:    (Math.random() - 0.5) * 0.35,
      vy:    (Math.random() - 0.5) * 0.35,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 0.1 + Math.random() * 0.5,
      life:  Math.random() * Math.PI * 2, // phase offset
    };
  }

  /* Seed */
  for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(makeParticle());

  /* Draw connecting lines between nearby particles */
  function drawConnections() {
    const maxDist = 100;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx   = particles[i].x - particles[j].x;
        const dy   = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.12;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(255,215,0,${alpha})`;
          ctx.lineWidth   = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    drawConnections();

    particles.forEach(p => {
      /* Update position */
      p.x += p.vx;
      p.y += p.vy;
      p.life += 0.012;

      /* Wrap around edges */
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;

      /* Pulsing alpha */
      const a = p.alpha * (0.6 + Math.sin(p.life) * 0.4);

      /* Draw glow */
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      glow.addColorStop(0, p.color.replace(')', `,${a})`).replace('rgb', 'rgba'));
      glow.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      /* Core dot */
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = a;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    raf = requestAnimationFrame(draw);
  }

  resize();
  draw();

  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(raf);
    resize();
    draw();
  });
  ro.observe(canvas);
 
})();


/* ============================================================
   2. HERO DASHBOARD MINI-CHART
   Draws a tiny area + bar chart inside the dashboard mockup.
   Uses Canvas2D directly (no dependencies).
   ============================================================ */

(function initDashboardChart() {

  const canvas = document.getElementById('dash-chart');
  if (!canvas) return;

  const ctx  = canvas.getContext('2d');
  let W, H;
  let time   = 0;

  // Weekly data (kWh per day)
  const solarData = [18, 24, 22, 30, 28, 35, 32];
  const gridData  = [ 6,  4,  5,  3,  4,  2,  3];
  const labels    = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  function resize() {
    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    W = rect.width;
    H = rect.height;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    const maxVal  = Math.max(...solarData, ...gridData) * 1.25;
    const padL    = 28;
    const padR    = 8;
    const padT    = 8;
    const padB    = 18;
    const chartW  = W - padL - padR;
    const chartH  = H - padT - padB;

    /* Grid lines */
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth   = 0.8;
    for (let i = 0; i <= 3; i++) {
      const y = padT + (chartH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();

      /* Y-axis labels */
      ctx.fillStyle   = 'rgba(255,255,255,0.3)';
      ctx.font        = '7px Inter, sans-serif';
      ctx.textAlign   = 'right';
      ctx.textBaseline = 'middle';
      const val = Math.round(maxVal - (maxVal / 3) * i);
      ctx.fillText(val, padL - 3, y);
    }

    /* Draw area + line for solar data */
    function drawArea(data, color, fillOpacity) {
      const step   = chartW / (data.length - 1);
      const points = data.map((v, i) => ({
        x: padL + i * step,
        y: padT + chartH - (v / maxVal) * chartH,
      }));

      /* Fill */
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const cx = (points[i - 1].x + points[i].x) / 2;
        ctx.bezierCurveTo(cx, points[i - 1].y, cx, points[i].y, points[i].x, points[i].y);
      }
      ctx.lineTo(points[points.length - 1].x, padT + chartH);
      ctx.lineTo(points[0].x, padT + chartH);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
      grad.addColorStop(0, color.replace(')', `,${fillOpacity})`).replace('rgb', 'rgba'));
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fill();

      /* Line */
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const cx = (points[i - 1].x + points[i].x) / 2;
        ctx.bezierCurveTo(cx, points[i - 1].y, cx, points[i].y, points[i].x, points[i].y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1.5;
      ctx.stroke();

      /* Dots */
      points.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
    }

    /* Animated progress: reveal chart gradually */
    const revealProgress = Math.min(1, time / 60);

    /* Clip to reveal animation */
    ctx.save();
    ctx.rect(padL, 0, chartW * revealProgress, H);
    ctx.clip();

    drawArea('rgb(255,215,0)', 'rgb(255,215,0)', 0.15);
    drawArea('rgb(59,130,246)', 'rgb(59,130,246)', 0.10);

    ctx.restore();

    /* X-axis labels */
    ctx.fillStyle    = 'rgba(255,255,255,0.3)';
    ctx.font         = '7.5px Inter, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    const step = chartW / (labels.length - 1);
    labels.forEach((label, i) => {
      ctx.fillText(label, padL + i * step, padT + chartH + 4);
    });

    time++;
    if (time < 80) requestAnimationFrame(draw);
  }

  resize();
  draw();

  // Redraw on IntersectionObserver trigger
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        time = 0;
        draw();
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  observer.observe(canvas);

})();


/* ============================================================
   3. HERO PHONE SPARKLINE
   ============================================================ */

(function initPhoneSparkline() {

  const canvas = document.getElementById('phone-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const W   = 110;
  const H   = 55;
  canvas.width  = W;
  canvas.height = H;

  const values = [2.1, 3.4, 4.0, 3.8, 4.2, 3.9, 4.5, 4.8];
  const maxV   = 5.5;
  const step   = W / (values.length - 1);

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(255,215,0,0.35)');
  grad.addColorStop(1, 'transparent');

  /* Area fill */
  ctx.beginPath();
  ctx.moveTo(0, H - (values[0] / maxV) * H);
  values.forEach((v, i) => {
    if (i === 0) return;
    ctx.lineTo(i * step, H - (v / maxV) * H);
  });
  ctx.lineTo((values.length - 1) * step, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  /* Line */
  ctx.beginPath();
  ctx.moveTo(0, H - (values[0] / maxV) * H);
  values.forEach((v, i) => {
    if (i === 0) return;
    ctx.lineTo(i * step, H - (v / maxV) * H);
  });
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth   = 1.5;
  ctx.stroke();

})();


/* ============================================================
   4. MAIN ENERGY PRODUCTION CHART (Section 3)
   Full-size responsive chart with day/week/month datasets.
   ============================================================ */

(function initMainEnergyChart() {

  const canvas = document.getElementById('main-energy-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H;
  let currentRange = 'day';
  let animProgress = 0;
  let raf;

  /* Datasets */
  const datasets = {
    day: {
      labels: ['6am','7am','8am','9am','10am','11am','12pm','1pm','2pm','3pm','4pm','5pm','6pm'],
      solar:  [0, 0.2, 1.1, 2.4, 3.6, 4.2, 4.7, 4.5, 4.1, 3.5, 2.4, 1.2, 0.3],
      grid:   [1.2, 1.0, 0.8, 0.5, 0.2, 0, 0, 0, 0, 0, 0.3, 0.8, 1.1],
    },
    week: {
      labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
      solar:  [28, 32, 26, 34, 31, 38, 35],
      grid:   [8, 6, 10, 5, 7, 4, 5],
    },
    month: {
      labels: ['W1','W2','W3','W4'],
      solar:  [180, 210, 195, 225],
      grid:   [45, 38, 52, 33],
    },
  };

  /* Update KPI values */
  function updateKPIs(range) {
    const d = datasets[range];
    const totalSolar = d.solar.reduce((a, b) => a + b, 0);
    const totalGrid  = d.grid.reduce((a, b) => a + b, 0);
    const exported   = Math.max(0, totalSolar - totalGrid * 1.5).toFixed(1);

    const suffix = range === 'month' ? ' kWh' : range === 'week' ? ' kWh' : ' kWh';

    const genEl  = document.getElementById('kpi-generated');
    const consEl = document.getElementById('kpi-consumed');
    const expEl  = document.getElementById('kpi-exported');

    if (genEl)  genEl.textContent  = totalSolar.toFixed(1) + suffix;
    if (consEl) consEl.textContent = (totalSolar * 0.78).toFixed(1) + suffix;
    if (expEl)  expEl.textContent  = exported + suffix;
  }

  function resize() {
    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    W = rect.width;
    H = rect.height;
  }

  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  function drawChart(progress) {
    ctx.clearRect(0, 0, W, H);

    const dark    = isDark();
    const data    = datasets[currentRange];
    const n       = data.labels.length;
    const maxVal  = Math.max(...data.solar, ...data.grid) * 1.2;
    const padL    = 44;
    const padR    = 16;
    const padT    = 16;
    const padB    = 36;
    const cW      = W - padL - padR;
    const cH      = H - padT - padB;
    const step    = cW / (n - 1);

    /* Background */
    ctx.fillStyle = dark ? 'rgba(11,26,48,0.5)' : 'rgba(248,250,252,0.5)';
    ctx.fillRect(0, 0, W, H);

    /* Gridlines */
    const gridCount = 5;
    for (let i = 0; i <= gridCount; i++) {
      const y   = padT + (cH / gridCount) * i;
      const val = Math.round(maxVal * (1 - i / gridCount));

      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle    = dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)';
      ctx.font         = '10px Inter, sans-serif';
      ctx.textAlign    = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(val, padL - 6, y);
    }

    /* Compute point coords */
    function getPoints(values) {
      return values.map((v, i) => ({
        x: padL + i * step,
        y: padT + cH - (v / maxVal) * cH * progress,
      }));
    }

    /* Draw area+line */
    function drawSeries(points, color, fillColor) {
      /* Area */
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const cx = (points[i - 1].x + points[i].x) / 2;
        ctx.bezierCurveTo(cx, points[i - 1].y, cx, points[i].y, points[i].x, points[i].y);
      }
      ctx.lineTo(points[points.length - 1].x, padT + cH);
      ctx.lineTo(points[0].x, padT + cH);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();

      /* Line */
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const cx = (points[i - 1].x + points[i].x) / 2;
        ctx.bezierCurveTo(cx, points[i - 1].y, cx, points[i].y, points[i].x, points[i].y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2.5;
      ctx.lineJoin    = 'round';
      ctx.stroke();

      /* Dots */
      points.forEach((pt, i) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle   = color;
        ctx.fill();
        ctx.strokeStyle = dark ? '#0d1b2e' : '#fff';
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      });
    }

    /* Solar (yellow) */
    const gradSolar = ctx.createLinearGradient(0, padT, 0, padT + cH);
    gradSolar.addColorStop(0, 'rgba(255,215,0,0.25)');
    gradSolar.addColorStop(1, 'rgba(255,215,0,0)');
    drawSeries(getPoints(data.solar), '#FFD700', gradSolar);

    /* Grid (blue) */
    const gradGrid = ctx.createLinearGradient(0, padT, 0, padT + cH);
    gradGrid.addColorStop(0, 'rgba(59,130,246,0.15)');
    gradGrid.addColorStop(1, 'rgba(59,130,246,0)');
    drawSeries(getPoints(data.grid), '#3b82f6', gradGrid);

    /* X-axis labels */
    ctx.fillStyle    = dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)';
    ctx.font         = '10px Inter, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    data.labels.forEach((label, i) => {
      ctx.fillText(label, padL + i * step, padT + cH + 10);
    });
  }

  function animate() {
    animProgress += 0.04;
    if (animProgress > 1) animProgress = 1;
    drawChart(animProgress);
    if (animProgress < 1) raf = requestAnimationFrame(animate);
  }

  function triggerAnimation() {
    cancelAnimationFrame(raf);
    animProgress = 0;
    animate();
    updateKPIs(currentRange);
  }

  /* Range buttons */
  document.querySelectorAll('.h2-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.h2-view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRange = btn.dataset.range;
      triggerAnimation();
    });
  });

  resize();

  /* Trigger when scrolled into view */
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        triggerAnimation();
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  observer.observe(canvas);

  /* Re-draw on resize */
  const ro = new ResizeObserver(() => { resize(); drawChart(1); });
  ro.observe(canvas);

  /* Re-draw on theme change */
  new MutationObserver(() => drawChart(1))
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

})();


/* ============================================================
   5. APP GAUGE CANVAS (Section 4 — Mobile app mockup)
   ============================================================ */

(function initGaugeCanvas() {

  const canvas = document.getElementById('gauge-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const W   = 140;
  const H   = 80;
  canvas.width  = W;
  canvas.height = H;

  let currentVal  = 0;
  const targetVal = 4.8;
  const maxVal    = 7;

  function drawGauge(value) {
    ctx.clearRect(0, 0, W, H);

    const cx     = W / 2;
    const cy     = H * 0.9;
    const radius = H * 0.80;
    const startA = Math.PI;
    const endA   = 0;
    const currentA = startA + (endA - startA) * (value / maxVal);

    /* Background arc */
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startA, endA);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth   = 8;
    ctx.lineCap     = 'round';
    ctx.stroke();

    /* Colored arc */
    const grad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
    grad.addColorStop(0, '#4DBD33');
    grad.addColorStop(0.5, '#FFD700');
    grad.addColorStop(1, '#e15c23');

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startA, currentA);
    ctx.strokeStyle = grad;
    ctx.lineWidth   = 8;
    ctx.lineCap     = 'round';
    ctx.stroke();

    /* Needle */
    const needleA = startA + (endA - startA) * (value / maxVal);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(needleA);
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(0, -radius + 12);
    ctx.lineTo(3, 0);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.restore();

    /* Centre knob */
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }

  /* Animate value */
  function animateGauge() {
    if (currentVal < targetVal) {
      currentVal = Math.min(targetVal, currentVal + 0.08);
      drawGauge(currentVal);
      requestAnimationFrame(animateGauge);
    }
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        currentVal = 0;
        animateGauge();
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });

  observer.observe(canvas);

})();


/* ============================================================
   6. APP BAR CHART (Section 4 — 7-day mini bar chart in phone)
   ============================================================ */

(function initAppBarChart() {

  const canvas = document.getElementById('app-bar-chart');
  if (!canvas) return;

  const ctx    = canvas.getContext('2d');
  const W      = 160;
  const H      = 60;
  canvas.width  = W;
  canvas.height = H;

  const data   = [22, 28, 25, 32, 30, 36, 34];
  const maxVal = Math.max(...data) * 1.2;
  const barW   = W / data.length * 0.55;
  const gap    = W / data.length;

  data.forEach((v, i) => {
    const barH  = (v / maxVal) * (H - 10);
    const x     = i * gap + (gap - barW) / 2;
    const y     = H - barH;

    /* Bar fill */
    const grad = ctx.createLinearGradient(0, y, 0, H);
    grad.addColorStop(0, i === data.length - 1 ? '#FFD700' : 'rgba(255,215,0,0.6)');
    grad.addColorStop(1, i === data.length - 1 ? '#e15c23' : 'rgba(225,92,35,0.4)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
    ctx.fill();
  });

})();


/* ============================================================
   7. BILLING TOGGLE (Monthly / Annual pricing)
   ============================================================ */

(function initBillingToggle() {

  const monthlyBtn = document.getElementById('billing-monthly');
  const annualBtn  = document.getElementById('billing-annual');
  if (!monthlyBtn || !annualBtn) return;

  function updatePrices(period) {
    document.querySelectorAll('.h2-price').forEach(el => {
      const val = period === 'annual' ? el.dataset.annual : el.dataset.monthly;
      if (val) el.textContent = val;
    });
  }

  monthlyBtn.addEventListener('click', () => {
    monthlyBtn.classList.add('active');
    annualBtn.classList.remove('active');
    updatePrices('monthly');
  });

  annualBtn.addEventListener('click', () => {
    annualBtn.classList.add('active');
    monthlyBtn.classList.remove('active');
    updatePrices('annual');
    if (window.SolarEchos) {
      window.SolarEchos.showToast('Annual billing selected — 20% discount applied! 🎉', 'success');
    }
  });

})();


/* ============================================================
   8. LIVE STAT TICKER
   Gently animates the hero "live" stats every few seconds.
   ============================================================ */

(function initLiveStatTicker() {

  const kwEl     = document.getElementById('dash-live-kw');
  const savingEl = document.getElementById('dash-savings');
  const phoneKW  = document.getElementById('phone-kw');
  const gaugeVal = document.getElementById('gauge-value');

  if (!kwEl) return;

  function randomVariance(base, pct) {
    return (base * (1 + (Math.random() - 0.5) * pct)).toFixed(1);
  }

  function tick() {
    const kw      = randomVariance(4.8, 0.12);
    const savings = Math.round(randomVariance(342, 0.05));

    if (kwEl)     kwEl.textContent     = kw + ' kW';
    if (savingEl) savingEl.textContent = '₹' + savings;
    if (phoneKW)  phoneKW.textContent  = kw + ' kW';
    if (gaugeVal) gaugeVal.textContent = kw + ' kW';

    /* Update live stat pills in hero */
    const pillEls = document.querySelectorAll('.live-stat-pill strong');
    if (pillEls[0]) pillEls[0].textContent = kw + ' kW';
    if (pillEls[1]) pillEls[1].textContent = '₹' + savings;
  }

  setInterval(tick, 4000);

})();


/* ============================================================
   9. LUCIDE RE-INIT after async component injection
   ============================================================ */

(function watchComponents() {

  const observer = new MutationObserver(() => {
    if (window.lucide) window.lucide.createIcons();
  });

  const navEl  = document.getElementById('navbar-placeholder');
  const footEl = document.getElementById('footer-placeholder');

  if (navEl)  observer.observe(navEl,  { childList: true });
  if (footEl) observer.observe(footEl, { childList: true });

})();


/* ============================================================
   END OF HOME-2 JAVASCRIPT
   ============================================================ */

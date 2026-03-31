/**
 * Solar-Echos | Services Page — JavaScript
 * Author: TechEchos Innovation
 * Version: 1.0.0
 *
 * Modules:
 *  1. Hero particle canvas
 *  2. Filter tabs (category)
 *  3. Live search
 *  4. Grid / List view toggle
 *  5. Lucide re-init after component injection
 */

'use strict';

/* ============================================================
   1. HERO PARTICLE CANVAS
   Lightweight floating solar-orb particle field
   ============================================================ */

(function initHeroParticles() {

  const canvas = document.getElementById('hero-particles');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, raf;
  let particles = [];
  const COUNT = 55;

  /* Resize to fill the hero section */
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

  /* Particle definition */
  function makeParticle() {
    return {
      x:     Math.random() * (W || 800),
      y:     Math.random() * (H || 400),
      r:     1.2 + Math.random() * 3,
      vx:    (Math.random() - 0.5) * 0.35,
      vy:    -(0.15 + Math.random() * 0.4),  // drift upward
      alpha: 0.2 + Math.random() * 0.6,
      hue:   Math.random() > 0.55 ? 'orange' : Math.random() > 0.5 ? 'green' : 'blue',
      phase: Math.random() * Math.PI * 2,
    };
  }

  function colorFor(p) {
    if (p.hue === 'orange') return isDark() ? 'rgba(225,92,35,'   : 'rgba(225,92,35,';
    if (p.hue === 'green')  return isDark() ? 'rgba(77,189,51,'   : 'rgba(77,189,51,';
    return                                    isDark() ? 'rgba(4,80,151,'    : 'rgba(4,80,151,';
  }

  /* Seed particles */
  function seed() {
    particles = [];
    for (let i = 0; i < COUNT; i++) {
      particles.push(makeParticle());
    }
  }

  /* Connect nearby particles with faint lines */
  function connectParticles() {
    const MAX_DIST = 100;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a  = particles[i];
        const b  = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d > MAX_DIST) continue;

        const alpha = (1 - d / MAX_DIST) * 0.15;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(225,92,35,${alpha})`;
        ctx.lineWidth   = 0.8;
        ctx.stroke();
      }
    }
  }

  let frame = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    frame++;

    connectParticles();

    particles.forEach(p => {
      /* Twinkle */
      const twinkle = p.alpha + Math.sin(frame * 0.04 + p.phase) * 0.2;

      /* Glow ring */
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      grad.addColorStop(0, colorFor(p) + twinkle + ')');
      grad.addColorStop(1, colorFor(p) + '0)');

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      /* Core dot */
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = colorFor(p) + twinkle + ')';
      ctx.fill();

      /* Move */
      p.x += p.vx;
      p.y += p.vy;

      /* Wrap edges */
      if (p.y < -10)   p.y = H + 10;
      if (p.x < -10)   p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y > H + 10) p.y = -10;
    });

    raf = requestAnimationFrame(draw);
  }

  resize();
  seed();
  draw();

  /* Re-init on resize */
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(raf);
    resize();
    seed();
    draw();
  });
  ro.observe(canvas);

})();


/* ============================================================
   2. FILTER TABS (Category)
   ============================================================ */

(function initFilterTabs() {

  const tabs      = document.querySelectorAll('.filter-tab');
  const cards     = document.querySelectorAll('.svc-card');
  const noResults = document.getElementById('no-results');
  const resetBtn  = document.getElementById('reset-search');
  const searchInput = document.getElementById('service-search');

  if (!tabs.length) return;

  let activeFilter = 'all';
  let activeSearch = '';

  /**
   * Returns true if a card should be visible given
   * the current filter + search state.
   */
  function cardMatches(card) {
    const category = card.getAttribute('data-category') || '';
    const keywords = (card.getAttribute('data-keywords') || '').toLowerCase();
    const title    = (card.querySelector('.svc-card__title')?.textContent || '').toLowerCase();
    const desc     = (card.querySelector('.svc-card__body > p')?.textContent || '').toLowerCase();

    const passFilter = activeFilter === 'all' || category === activeFilter;
    const query      = activeSearch.trim().toLowerCase();
    const passSearch = !query ||
      title.includes(query) ||
      keywords.includes(query) ||
      desc.includes(query);

    return passFilter && passSearch;
  }

  /** Apply filter + search to all cards */
  function applyFilters() {
    let visibleCount = 0;

    cards.forEach(card => {
      const show = cardMatches(card);

      if (show) {
        card.removeAttribute('hidden');
        card.classList.add('filter-visible');
        // Remove animation class after it plays
        card.addEventListener('animationend', () => {
          card.classList.remove('filter-visible');
        }, { once: true });
        visibleCount++;
      } else {
        card.setAttribute('hidden', '');
        card.classList.remove('filter-visible');
      }
    });

    // Show / hide the no-results message
    if (noResults) {
      noResults.hidden = visibleCount > 0;
    }
  }

  /* Tab click handler */
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      activeFilter = tab.getAttribute('data-filter');
      applyFilters();
    });
  });

  /* Reset button inside no-results */
  resetBtn?.addEventListener('click', () => {
    // Reset filter tabs
    tabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    document.querySelector('[data-filter="all"]')?.classList.add('active');
    document.querySelector('[data-filter="all"]')?.setAttribute('aria-selected', 'true');

    // Clear search
    if (searchInput) {
      searchInput.value = '';
      document.getElementById('search-clear').hidden = true;
    }

    activeFilter = 'all';
    activeSearch = '';
    applyFilters();
  });

  // Export for search module
  window._svcFilter = { applyFilters, setSearch: (q) => { activeSearch = q; } };

})();


/* ============================================================
   3. LIVE SEARCH
   ============================================================ */

(function initSearch() {

  const input     = document.getElementById('service-search');
  const clearBtn  = document.getElementById('search-clear');

  if (!input) return;

  let debounceTimer;

  input.addEventListener('input', () => {
    const query = input.value.trim();

    // Show / hide clear button
    if (clearBtn) clearBtn.hidden = query.length === 0;

    // Debounce 220ms
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (window._svcFilter) {
        window._svcFilter.setSearch(query);
        window._svcFilter.applyFilters();
      }
    }, 220);
  });

  clearBtn?.addEventListener('click', () => {
    input.value    = '';
    clearBtn.hidden = true;
    if (window._svcFilter) {
      window._svcFilter.setSearch('');
      window._svcFilter.applyFilters();
    }
    input.focus();
  });

})();


/* ============================================================
   4. GRID / LIST VIEW TOGGLE
   ============================================================ */

(function initViewToggle() {

  const gridBtn = document.getElementById('view-grid');
  const listBtn = document.getElementById('view-list');
  const grid    = document.getElementById('services-grid-container');

  if (!gridBtn || !listBtn || !grid) return;

  function setView(mode) {
    if (mode === 'list') {
      grid.classList.add('list-view');
      listBtn.classList.add('active');
      listBtn.setAttribute('aria-pressed', 'true');
      gridBtn.classList.remove('active');
      gridBtn.setAttribute('aria-pressed', 'false');
    } else {
      grid.classList.remove('list-view');
      gridBtn.classList.add('active');
      gridBtn.setAttribute('aria-pressed', 'true');
      listBtn.classList.remove('active');
      listBtn.setAttribute('aria-pressed', 'false');
    }
    // Persist preference
    try { localStorage.setItem('solar-echos-svc-view', mode); } catch (_) {}
  }

  gridBtn.addEventListener('click', () => setView('grid'));
  listBtn.addEventListener('click', () => setView('list'));

  // Restore saved preference
  try {
    const saved = localStorage.getItem('solar-echos-svc-view');
    if (saved) setView(saved);
  } catch (_) {}

})();


/* ============================================================
   5. LUCIDE ICONS RE-INIT after component injection
   ============================================================ */

(function watchComponents() {

  const observer = new MutationObserver(() => {
    if (window.lucide) window.lucide.createIcons();
  });

  const navbar = document.getElementById('navbar-placeholder');
  const footer = document.getElementById('footer-placeholder');

  if (navbar) observer.observe(navbar, { childList: true });
  if (footer) observer.observe(footer, { childList: true });

})();


/* ============================================================
   END OF SERVICES PAGE JAVASCRIPT
   ============================================================ */
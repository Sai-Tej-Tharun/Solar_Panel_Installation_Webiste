/**
 * ================================================================
 * Solar-Echos | Blogs Page JS
 * Author  : SolarEchos
 * Version : 1.0.0
 *
 * Modules:
 *  1. Category filter  – tabs + sidebar links filter card grid
 *  2. Search           – masthead & sidebar search with highlight
 *  3. Pagination       – page number switcher with smooth scroll
 *  4. Stagger reveal   – cards animate in with IntersectionObserver
 *  5. Sticky filter bar – smart show/hide on scroll direction
 *  6. Trending strip   – scroll animation on small screens
 *  7. Newsletter forms – validate and show toast on submit
 *  8. Reading progress – thin bar at top of page
 * ================================================================
 */

'use strict';

/* ──────────────────────────────────────────────────────────────
   1. CATEGORY FILTER
   Synchronises the top filter tabs with the sidebar category
   links. Filters .bl-card elements by [data-category].
   ────────────────────────────────────────────────────────────── */

(function initCategoryFilter() {

  const tabBtns        = document.querySelectorAll('.bl-filter-tab');
  const sidebarLinks   = document.querySelectorAll('.bl-category-item');
  const allCards       = document.querySelectorAll('.bl-card');

  /** Sets the active category and animates cards in/out */
  function setCategory(category) {
    /* ── Sync tab buttons ── */
    tabBtns.forEach(btn => {
      const isActive = btn.dataset.category === category;
      btn.classList.toggle('bl-filter-tab--active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });

    /* ── Sync sidebar links ── */
    sidebarLinks.forEach(link => {
      const isActive = link.dataset.filter === category;
      link.classList.toggle('bl-category-item--active', isActive);
    });

    /* ── Filter cards ── */
    allCards.forEach((card, i) => {
      const cardCat = card.dataset.category || 'all';
      const show    = category === 'all' || cardCat === category;

      if (show) {
        card.style.display = '';
        /* Stagger the re-entry animation */
        card.style.animationDelay = `${i * 0.04}s`;
        card.classList.remove('bl-card--filtered-out');
        card.classList.add('bl-card--filtered-in');

        /* Clean up animation class after it runs */
        card.addEventListener('animationend', () => {
          card.classList.remove('bl-card--filtered-in');
          card.style.animationDelay = '';
        }, { once: true });

      } else {
        card.classList.add('bl-card--filtered-out');
        card.addEventListener('animationend', () => {
          card.style.display = 'none';
          card.classList.remove('bl-card--filtered-out');
        }, { once: true });
      }
    });

    /* Announce filter change to screen readers */
    const visibleCount = category === 'all'
      ? allCards.length
      : document.querySelectorAll(`.bl-card[data-category="${category}"]`).length;

    announceToSR(`Showing ${visibleCount} articles in ${category === 'all' ? 'all categories' : category}`);
  }

  /* ── Tab button clicks ── */
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => setCategory(btn.dataset.category));
  });

  /* ── Sidebar link clicks ── */
  sidebarLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      setCategory(link.dataset.filter);
      /* On mobile — scroll to grid */
      const grid = document.getElementById('blog-grid');
      if (grid && window.innerWidth < 1025) {
        const top = grid.getBoundingClientRect().top + window.scrollY - 120;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

})();


/* ──────────────────────────────────────────────────────────────
   2. SEARCH
   Client-side fuzzy search across card titles and excerpts.
   Highlights matched terms in visible cards.
   ────────────────────────────────────────────────────────────── */

(function initSearch() {

  /** Collect searchable data from cards */
  function getCardData() {
    return Array.from(document.querySelectorAll('.bl-card')).map(card => ({
      el:      card,
      title:   card.querySelector('.bl-card__title')?.textContent.toLowerCase() || '',
      excerpt: card.querySelector('.bl-card__excerpt')?.textContent.toLowerCase() || '',
    }));
  }

  /** Run search and show/hide cards */
  function runSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      /* Reset to show all */
      getCardData().forEach(({ el }) => { el.style.display = ''; });
      return;
    }

    const terms = q.split(/\s+/).filter(Boolean);
    let matchCount = 0;

    getCardData().forEach(({ el, title, excerpt }) => {
      const text    = title + ' ' + excerpt;
      const matches = terms.every(term => text.includes(term));
      if (matches) {
        el.style.display = '';
        matchCount++;
      } else {
        el.style.display = 'none';
      }
    });

    announceToSR(`${matchCount} article${matchCount === 1 ? '' : 's'} found for "${q}"`);
  }

  /* ── Masthead search ── */
  const mastheadInput = document.getElementById('masthead-search');
  if (mastheadInput) {
    /* Live search as user types */
    mastheadInput.addEventListener('input', () => runSearch(mastheadInput.value));
  }

  /* ── Sidebar search ── */
  const sidebarInput = document.getElementById('sidebar-search-input');
  if (sidebarInput) {
    sidebarInput.addEventListener('input', () => runSearch(sidebarInput.value));
    /* Sync with masthead */
    sidebarInput.addEventListener('input', () => {
      if (mastheadInput) mastheadInput.value = sidebarInput.value;
    });
  }

})();

/** Called by form onsubmit attributes in HTML */
function handleMastheadSearch(e) {
  e.preventDefault();
  const q = document.getElementById('masthead-search')?.value || '';
  if (!q.trim()) return;
  const grid = document.getElementById('blog-grid');
  if (grid) {
    const top = grid.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}

function handleSidebarSearch(e) {
  e.preventDefault();
}


/* ──────────────────────────────────────────────────────────────
   3. PAGINATION
   Visual page switcher. In production this would fetch new
   articles; here it scrolls back to the grid and shows a toast.
   ────────────────────────────────────────────────────────────── */

(function initPagination() {

  const prevBtn   = document.getElementById('prev-page');
  const nextBtn   = document.getElementById('next-page');
  const pageNums  = document.querySelectorAll('.bl-page-num');
  const TOTAL     = 8;
  let   currentPage = 1;

  function goToPage(page) {
    currentPage = Math.max(1, Math.min(TOTAL, page));

    /* Update button states */
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === TOTAL;

    /* Update active page number */
    pageNums.forEach(btn => {
      const num = parseInt(btn.textContent, 10);
      const isActive = num === currentPage;
      btn.classList.toggle('bl-page-num--active', isActive);
      btn.setAttribute('aria-current', isActive ? 'page' : null);
    });

    /* Scroll to grid */
    const grid = document.getElementById('articles-area');
    if (grid) {
      const top = grid.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top, behavior: 'smooth' });
    }

    /* Notify (in production, load new articles here) */
    if (window.SolarEchos?.showToast) {
      window.SolarEchos.showToast(`Loaded page ${currentPage} of ${TOTAL}`, 'info', 2500);
    }

    announceToSR(`Page ${currentPage} of ${TOTAL}`);
  }

  prevBtn?.addEventListener('click', () => goToPage(currentPage - 1));
  nextBtn?.addEventListener('click', () => goToPage(currentPage + 1));

  pageNums.forEach(btn => {
    btn.addEventListener('click', () => {
      const num = parseInt(btn.textContent, 10);
      if (!isNaN(num)) goToPage(num);
    });
  });

})();


/* ──────────────────────────────────────────────────────────────
   4. STAGGER REVEAL — IntersectionObserver
   Cards animate in with staggered delay as they scroll into view.
   ────────────────────────────────────────────────────────────── */

(function initStaggerReveal() {

  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('[data-animate]').forEach(el => el.classList.add('in-view'));
    return;
  }

  /* Standard section elements */
  const sectionObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        sectionObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

  document.querySelectorAll('[data-animate]').forEach(el => sectionObs.observe(el));

  /* Blog cards — staggered */
  const cards     = document.querySelectorAll('.bl-card');
  const cardObs   = new IntersectionObserver(entries => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        /* Stagger delay based on position in viewport batch */
        const delay = (i % 3) * 80;
        setTimeout(() => {
          entry.target.style.opacity   = '1';
          entry.target.style.transform = 'translateY(0)';
        }, delay);
        cardObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });

  cards.forEach(card => {
    /* Start hidden */
    card.style.opacity   = '0';
    card.style.transform = 'translateY(24px)';
    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    cardObs.observe(card);
  });

  /* Sidebar widgets stagger */
  const widgetObs = new IntersectionObserver(entries => {
    entries.forEach((entry, idx) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('in-view'), idx * 60);
        widgetObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05 });

  document.querySelectorAll('.bl-widget').forEach(w => widgetObs.observe(w));

})();


/* ──────────────────────────────────────────────────────────────
   5. STICKY FILTER BAR — smart hide on scroll down
   ────────────────────────────────────────────────────────────── */

(function initStickyFilter() {

  const bar   = document.querySelector('.bl-filter-bar');
  if (!bar) return;

  let lastY   = 0;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y       = window.scrollY;
        const goingDn = y > lastY && y > 200;
        bar.style.transform = goingDn ? 'translateY(-100%)' : 'translateY(0)';
        bar.style.transition = 'transform 0.3s ease';
        lastY   = y;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

})();


/* ──────────────────────────────────────────────────────────────
   6. READING PROGRESS BAR
   Thin 3px bar across the top of the viewport.
   ────────────────────────────────────────────────────────────── */

(function initReadingProgress() {

  /* Create bar element */
  const bar = document.createElement('div');
  bar.id    = 'bl-reading-progress';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', 'Page scroll progress');
  bar.setAttribute('aria-valuenow', '0');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  bar.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    height: 3px;
    width: 0%;
    background: linear-gradient(90deg, var(--color-accent-orange), var(--color-accent-yellow));
    z-index: 9999;
    pointer-events: none;
    transition: width 0.1s linear;
  `;
  document.body.prepend(bar);

  window.addEventListener('scroll', () => {
    const scrollTop  = window.scrollY;
    const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
    const pct        = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
    bar.style.width  = pct + '%';
    bar.setAttribute('aria-valuenow', Math.round(pct));
  }, { passive: true });

})();


/* ──────────────────────────────────────────────────────────────
   7. NEWSLETTER FORMS
   ────────────────────────────────────────────────────────────── */

/** Called by promo card form onsubmit */
function handlePromoSubscribe(e) {
  e.preventDefault();
  const form  = e.target;
  const input = form.querySelector('input[type="email"]');
  if (!input) return;

  const email = input.value.trim();

  /* Basic validation */
  if (!email || !email.includes('@') || !email.includes('.')) {
    input.style.borderColor = 'var(--color-error)';
    setTimeout(() => { input.style.borderColor = ''; }, 2000);
    if (window.SolarEchos?.showToast) {
      window.SolarEchos.showToast('Please enter a valid email address.', 'error');
    }
    return;
  }

  /* Success */
  input.value = '';
  if (window.SolarEchos?.showToast) {
    window.SolarEchos.showToast('Subscribed! Welcome to Solar Echos weekly.', 'success');
  }
  announceToSR('Successfully subscribed to the newsletter.');
}


/* ──────────────────────────────────────────────────────────────
   8. FEATURED CARD PARALLAX (subtle)
   The featured article image shifts very gently on scroll.
   ────────────────────────────────────────────────────────────── */

(function initFeaturedParallax() {

  const img = document.querySelector('.bl-featured-card__img img');
  if (!img) return;

  /* Only on desktop */
  if (window.matchMedia('(max-width: 768px)').matches) return;

  window.addEventListener('scroll', () => {
    const rect  = img.closest('.bl-featured-card')?.getBoundingClientRect();
    if (!rect) return;
    const midY  = rect.top + rect.height / 2 - window.innerHeight / 2;
    const shift = midY * 0.06;
    img.style.transform = `scale(1.06) translateY(${Math.max(-20, Math.min(20, shift))}px)`;
  }, { passive: true });

})();


/* ──────────────────────────────────────────────────────────────
   9. LIVE TRENDING COUNT INDICATOR
   Very subtle pulse on the "Trending" label every 8 seconds.
   ────────────────────────────────────────────────────────────── */

(function initTrendingPulse() {

  const label = document.querySelector('.bl-trending__label');
  if (!label) return;

  setInterval(() => {
    label.animate([
      { opacity: 1 },
      { opacity: 0.5 },
      { opacity: 1 },
    ], { duration: 600, easing: 'ease-in-out' });
  }, 8000);

})();


/* ──────────────────────────────────────────────────────────────
   UTILITIES
   ────────────────────────────────────────────────────────────── */

/**
 * Announces a message to screen readers via a live region.
 * @param {string} message
 */
function announceToSR(message) {
  let region = document.getElementById('sr-live-region');
  if (!region) {
    region = document.createElement('div');
    region.id   = 'sr-live-region';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.style.cssText = `
      position:absolute; width:1px; height:1px;
      overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap;
    `;
    document.body.appendChild(region);
  }
  region.textContent = '';
  setTimeout(() => { region.textContent = message; }, 100);
}

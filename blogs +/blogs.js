/**
 * Solar-Echos | Blog Page JavaScript
 * Author: TechEchos Innovation
 * Version: 1.0.0
 * Description: All interactions for blogs.html —
 *   - Category filter (pills + sidebar)
 *   - Live search
 *   - Tag cloud filter
 *   - Pagination simulation
 *   - Sort select
 *   - Newsletter form validation
 *   - Sticky sidebar behaviour
 *   - Scroll-reveal cards
 */

/* ============================================================
   1. FILTER SYSTEM
   A single filter state drives both the top pills and the
   sidebar category buttons simultaneously.
============================================================ */

/** @type {string} Currently active category filter */
let activeFilter = 'all';

/** @type {string} Current search query */
let searchQuery = '';

const CARDS_PER_PAGE = 18; // all shown on page 1; pagination is decorative sim

/**
 * Returns all blog card elements from the grid.
 * @returns {HTMLElement[]}
 */
function getCards() {
  return Array.from(document.querySelectorAll('#blog-grid .blog-card'));
}

/**
 * Applies the current `activeFilter` and `searchQuery` to
 * show/hide blog cards and update result counts.
 */
function applyFilters() {
  const cards      = getCards();
  const noResults  = document.getElementById('no-results');
  const countEl    = document.getElementById('results-count');
  let visibleCount = 0;

  cards.forEach((card, i) => {
    const cat     = card.dataset.filterCat || 'all';
    const title   = card.querySelector('.blog-card__title')?.textContent.toLowerCase() || '';
    const excerpt = card.querySelector('.blog-card__excerpt')?.textContent.toLowerCase() || '';
    const fullText = title + ' ' + excerpt;

    const matchesCat    = activeFilter === 'all' || cat === activeFilter;
    const matchesSearch = searchQuery === '' || fullText.includes(searchQuery.toLowerCase());
    const visible       = matchesCat && matchesSearch;

    if (visible) {
      card.classList.remove('hidden-by-filter');
      // Stagger-reveal newly shown cards
      card.style.animationDelay = `${(visibleCount % 3) * 0.06}s`;
      card.classList.remove('filter-reveal');
      // Force reflow to restart animation
      void card.offsetWidth;
      card.classList.add('filter-reveal');
      visibleCount++;
    } else {
      card.classList.add('hidden-by-filter');
      card.classList.remove('filter-reveal');
    }
  });

  // Update count label
  if (countEl) {
    countEl.innerHTML = `Showing <strong>${visibleCount}</strong> article${visibleCount !== 1 ? 's' : ''}`;
  }

  // Toggle no-results message
  if (noResults) {
    if (visibleCount === 0) {
      noResults.classList.remove('hidden');
    } else {
      noResults.classList.add('hidden');
    }
  }

  // Toggle pagination visibility based on results
  const pagination = document.getElementById('pagination');
  if (pagination) {
    pagination.style.display = visibleCount > 0 ? 'flex' : 'none';
  }
}

/**
 * Sets the active filter and syncs all filter UI elements.
 * @param {string} filterValue
 */
function setFilter(filterValue) {
  activeFilter = filterValue;

  // Sync top pills
  document.querySelectorAll('.filter-pill').forEach(btn => {
    const isActive = btn.dataset.filter === filterValue;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });

  // Sync sidebar category buttons
  document.querySelectorAll('.sidebar-cat-btn').forEach(btn => {
    const isActive = btn.dataset.filter === filterValue;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });

  applyFilters();

  // Scroll to grid top if user clicked a filter (skip on initial load)
  if (filterValue !== 'all' || searchQuery !== '') {
    const gridWrapper = document.querySelector('.blog-grid-wrapper');
    if (gridWrapper) {
      const navbarH = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--navbar-height') || '80', 10
      );
      const top = gridWrapper.getBoundingClientRect().top + window.scrollY - navbarH - 24;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }
}

/** Wires up top filter pills */
function initFilterPills() {
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
  });
}

/** Wires up sidebar category buttons */
function initSidebarCategories() {
  document.querySelectorAll('.sidebar-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
  });
}

/** Wires up tag cloud buttons */
function initTagCloud() {
  document.querySelectorAll('.tag-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      setFilter(btn.dataset.filter || 'all');
    });
  });
}

/* ============================================================
   2. LIVE SEARCH
   Debounced input on the sidebar search field.
   Filters cards whose title or excerpt match the query.
============================================================ */

let searchDebounceTimer = null;

/**
 * Debounce wrapper for the search handler.
 * @param {string} query
 */
function handleSearch(query) {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    searchQuery = query.trim();
    applyFilters();
  }, 280);
}

function initSearch() {
  const searchForm  = document.getElementById('sidebar-search-form');
  const searchInput = document.getElementById('sidebar-search');
  if (!searchInput) return;

  // Live filter on input
  searchInput.addEventListener('input', () => handleSearch(searchInput.value));

  // Prevent default form submit (page reload)
  searchForm?.addEventListener('submit', e => {
    e.preventDefault();
    handleSearch(searchInput.value);
  });

  // Clear search when input is cleared
  searchInput.addEventListener('search', () => {
    if (searchInput.value === '') {
      searchQuery = '';
      applyFilters();
    }
  });
}

/* ============================================================
   3. CLEAR FILTER BUTTON (inside no-results message)
============================================================ */

function initClearFilter() {
  const clearBtn = document.getElementById('clear-filter');
  clearBtn?.addEventListener('click', () => {
    // Reset search input
    const searchInput = document.getElementById('sidebar-search');
    if (searchInput) searchInput.value = '';
    searchQuery = '';
    setFilter('all');
  });
}

/* ============================================================
   4. SORT SELECT
   Simulates sorting by rearranging card DOM order.
   Real implementation would fetch from an API.
============================================================ */

function initSortSelect() {
  const sortSelect = document.getElementById('sort-select');
  if (!sortSelect) return;

  sortSelect.addEventListener('change', () => {
    const grid  = document.getElementById('blog-grid');
    const cards = getCards();
    if (!grid || !cards.length) return;

    // Sort by year/month from datetime attribute in <time>
    const sorted = [...cards].sort((a, b) => {
      const dateA = new Date(a.querySelector('time')?.getAttribute('datetime') || 0);
      const dateB = new Date(b.querySelector('time')?.getAttribute('datetime') || 0);

      if (sortSelect.value === 'oldest') return dateA - dateB;
      if (sortSelect.value === 'newest') return dateB - dateA;

      // 'popular' — fake: alternate priority by card index
      const idxA = cards.indexOf(a);
      const idxB = cards.indexOf(b);
      return (idxA % 3) - (idxB % 3);
    });

    // Re-append in sorted order
    sorted.forEach((card, i) => {
      card.style.animationDelay = `${i * 0.04}s`;
      card.classList.remove('filter-reveal');
      void card.offsetWidth;
      card.classList.add('filter-reveal');
      grid.appendChild(card);
    });
  });
}

/* ============================================================
   5. PAGINATION SIMULATION
   Clicking page buttons scrolls to the grid and shows a
   toast (real pagination would load new posts from a server).
============================================================ */

function initPagination() {
  const pageButtons = document.querySelectorAll('.pagination__page');
  const prevBtn     = document.querySelector('.pagination__btn--prev');
  const nextBtn     = document.querySelector('.pagination__btn--next');
  let currentPage   = 1;
  const totalPages  = 6;

  function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;

    // Update active state
    pageButtons.forEach(btn => {
      const num = parseInt(btn.textContent, 10);
      const isActive = num === currentPage;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-current', isActive ? 'page' : 'false');
      btn.setAttribute('aria-label', isActive ? `Page ${num}, current page` : `Go to page ${num}`);
    });

    // Update prev/next disabled states
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;

    // Scroll to grid
    const gridWrapper = document.querySelector('.blog-grid-wrapper');
    if (gridWrapper) {
      const navbarH = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--navbar-height') || '80', 10
      );
      const top = gridWrapper.getBoundingClientRect().top + window.scrollY - navbarH - 16;
      window.scrollTo({ top, behavior: 'smooth' });
    }

    // Toast feedback
    if (window.SolarEchos?.showToast) {
      window.SolarEchos.showToast(`Loaded page ${currentPage} of ${totalPages}`, 'info', 2500);
    }
  }

  pageButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.textContent, 10);
      if (!isNaN(page)) goToPage(page);
    });
  });

  prevBtn?.addEventListener('click', () => goToPage(currentPage - 1));
  nextBtn?.addEventListener('click', () => goToPage(currentPage + 1));
}

/* ============================================================
   6. NEWSLETTER FORM VALIDATION
============================================================ */

function initNewsletterForm() {
  const form      = document.getElementById('newsletter-form');
  const emailInput = document.getElementById('newsletter-email');
  const errorEl   = document.getElementById('newsletter-error');
  if (!form || !emailInput) return;

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
    emailInput.classList.add('error');
    emailInput.setAttribute('aria-invalid', 'true');
    emailInput.setAttribute('aria-describedby', 'newsletter-error');
  }

  function clearError() {
    if (!errorEl) return;
    errorEl.classList.add('hidden');
    emailInput.classList.remove('error');
    emailInput.removeAttribute('aria-invalid');
  }

  emailInput.addEventListener('input', clearError);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const email = emailInput.value.trim();

    if (!email) {
      showError('Please enter your email address.');
      emailInput.focus();
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      showError('Please enter a valid email address.');
      emailInput.focus();
      return;
    }

    // Simulate API call
    const submitBtn = form.querySelector('[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
           stroke-linejoin="round" aria-hidden="true">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      Subscribing…
    `;

    await new Promise(resolve => setTimeout(resolve, 1200));

    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
    emailInput.value = '';

    if (window.SolarEchos?.showToast) {
      window.SolarEchos.showToast('You\'re subscribed! Expect your first email this Tuesday.', 'success', 5000);
    }
  });
}

/* ============================================================
   7. FEATURED CARD PARALLAX IMAGE
   Subtle parallax on the featured post's image on scroll.
============================================================ */

function initFeaturedParallax() {
  const featuredImg = document.querySelector('.featured-card__image img');
  if (!featuredImg || window.innerWidth < 768) return;

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (ticking) return;
    requestAnimationFrame(() => {
      const rect   = featuredImg.closest('.featured-card')?.getBoundingClientRect();
      if (!rect) { ticking = false; return; }

      const center = rect.top + rect.height / 2;
      const vpMid  = window.innerHeight / 2;
      const offset = (center - vpMid) * 0.06;

      featuredImg.style.transform = `scale(1.04) translateY(${offset}px)`;
      ticking = false;
    });
    ticking = true;
  }, { passive: true });
}

/* ============================================================
   8. CARD IMAGE LAZY-LOAD BLUR-UP EFFECT
   When a lazy-loaded image finishes loading, fade from blur.
============================================================ */

function initImageBlurUp() {
  const images = document.querySelectorAll('.blog-card__image img, .recent-post__image img');

  images.forEach(img => {
    if (img.complete) return; // already loaded

    img.style.filter = 'blur(8px)';
    img.style.transition = 'filter 0.5s ease';

    img.addEventListener('load', () => {
      img.style.filter = 'none';
    }, { once: true });
  });
}

/* ============================================================
   9. SIDEBAR STICKY HEIGHT GUARD
   Clamps sidebar sticky offset so it doesn't overflow viewport.
============================================================ */

function initSidebarHeightGuard() {
  const sidebar = document.querySelector('.blog-sidebar');
  if (!sidebar) return;

  function updateSidebarMax() {
    const navbarH = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--navbar-height') || '80', 10
    );
    const maxH = window.innerHeight - navbarH - 48;
    if (window.innerWidth > 1024) {
      sidebar.style.maxHeight  = `${maxH}px`;
      sidebar.style.overflowY  = 'auto';
      sidebar.style.overflowX  = 'hidden';
      sidebar.style.scrollbarWidth = 'thin';
      sidebar.style.paddingRight = '4px';
    } else {
      sidebar.style.maxHeight  = 'none';
      sidebar.style.overflowY  = 'visible';
    }
  }

  updateSidebarMax();
  window.addEventListener('resize', updateSidebarMax);
}

/* ============================================================
   10. READ TIME BADGE GENERATOR
   Inserts an estimated read-time badge derived from card excerpt
   length, supplementing the static HTML values.
============================================================ */

function initReadTimeBadges() {
  // Already set statically in HTML — this validates and fills any
  // card that might be missing a read time.
  getCards().forEach(card => {
    const metaSpans = card.querySelectorAll('.blog-card__meta span');
    const hasTime = Array.from(metaSpans).some(s => s.textContent.includes('min'));
    if (!hasTime) {
      const excerpt   = card.querySelector('.blog-card__excerpt')?.textContent || '';
      const words     = excerpt.split(/\s+/).length;
      const readTime  = Math.max(1, Math.ceil((words * 8) / 200)); // ~200 wpm * 8x full article
      const timeSpan  = document.createElement('span');
      timeSpan.textContent = `${readTime} min read`;
      const dot = document.createElement('span');
      dot.className = 'meta-dot';
      dot.setAttribute('aria-hidden', 'true');
      const metaRow = card.querySelector('.blog-card__meta');
      if (metaRow) {
        metaRow.appendChild(dot);
        metaRow.appendChild(timeSpan);
      }
    }
  });
}

/* ============================================================
   11. PAGE INITIALISATION
============================================================ */

function initBlogsPage() {
  initFilterPills();
  initSidebarCategories();
  initTagCloud();
  initSearch();
  initClearFilter();
  initSortSelect();
  initPagination();
  initNewsletterForm();
  initFeaturedParallax();
  initImageBlurUp();
  initSidebarHeightGuard();
  initReadTimeBadges();
}

/* Run when DOM is ready */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBlogsPage);
} else {
  initBlogsPage();
}

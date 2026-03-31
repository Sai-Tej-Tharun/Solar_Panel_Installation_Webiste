/**
 * ================================================================
 * Solar-Echos | Blog Details — Shared JavaScript
 * Author  : SolarEchos
 * Version : 1.0.0
 * Used by : blog-details-1.html through blog-details-6.html
 *
 * Modules:
 *  1. Reading progress bar  — dual: top bar + sidebar fill
 *  2. TOC active spy        — highlights current section in ToC
 *  3. TOC collapse toggle   — expand/collapse table of contents
 *  4. Share buttons         — Web Share API + clipboard fallback
 *  5. Mini ROI calculator   — sidebar quick-calc widget
 *  6. Scroll reveal         — [data-animate] observer
 *  7. Estimated read time   — auto-calculates from prose word count
 *  8. Smooth anchor scroll  — offset for fixed navbar + TOC
 *  9. Newsletter form       — validate + toast
 * 10. Back-to-top           — handled by global.js (belt+suspenders)
 * 11. Code copy buttons     — if any <pre> blocks are present
 * 12. Image lightbox        — click inline images to expand
 * ================================================================
 */

'use strict';

/* ──────────────────────────────────────────────────────────────
   UTILS
   ────────────────────────────────────────────────────────────── */

function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

function srAnnounce(msg) {
  let r = document.getElementById('bd-sr-live');
  if (!r) {
    r = document.createElement('div');
    r.id = 'bd-sr-live';
    r.setAttribute('role', 'status');
    r.setAttribute('aria-live', 'polite');
    r.setAttribute('aria-atomic', 'true');
    r.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)';
    document.body.appendChild(r);
  }
  r.textContent = '';
  setTimeout(() => { r.textContent = msg; }, 50);
}


/* ================================================================
   1. READING PROGRESS BAR
   - Top bar:     #bd-progress-bar (thin stripe across top)
   - Sidebar:     .bd-sidebar-progress__fill
   - Page title updates with % for screen readers
   ================================================================ */

(function initReadingProgress() {

  /* Create the top bar if it doesn't exist in HTML */
  let topBar = document.getElementById('bd-progress-bar');
  if (!topBar) {
    topBar = document.createElement('div');
    topBar.id = 'bd-progress-bar';
    topBar.setAttribute('role', 'progressbar');
    topBar.setAttribute('aria-label', 'Article reading progress');
    topBar.setAttribute('aria-valuenow', '0');
    topBar.setAttribute('aria-valuemin', '0');
    topBar.setAttribute('aria-valuemax', '100');
    document.body.prepend(topBar);
  }

  const sidebarFill = document.querySelector('.bd-sidebar-progress__fill');
  const originalTitle = document.title;

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docH      = document.documentElement.scrollHeight - window.innerHeight;
        const pct       = docH > 0 ? Math.min(100, (scrollTop / docH) * 100) : 0;
        const rounded   = Math.round(pct);

        topBar.style.width = pct + '%';
        topBar.setAttribute('aria-valuenow', rounded);

        if (sidebarFill) sidebarFill.style.width = pct + '%';

        /* Update page title with progress hint */
        if (rounded > 2 && rounded < 99) {
          document.title = `(${rounded}%) ${originalTitle}`;
        } else {
          document.title = originalTitle;
        }

        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

})();


/* ================================================================
   2. TOC ACTIVE SPY
   Highlights the TOC link for the heading currently in view.
   ================================================================ */

(function initTOCSpy() {

  const tocLinks  = $$('.bd-toc__link');
  if (!tocLinks.length) return;

  /* Map href → heading element */
  const headingMap = new Map();
  tocLinks.forEach(link => {
    const id  = link.getAttribute('href')?.slice(1);
    const el  = id ? document.getElementById(id) : null;
    if (el) headingMap.set(link, el);
  });

  if (!headingMap.size) return;

  /* Navbar + some padding */
  const OFFSET = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--navbar-height') || '80'
  ) + 20;

  function update() {
    let activeLink = null;
    const threshold = window.scrollY + OFFSET + 60;

    headingMap.forEach((heading, link) => {
      const top = heading.getBoundingClientRect().top + window.scrollY;
      if (top <= threshold) activeLink = link;
    });

    tocLinks.forEach(l => l.classList.remove('bd-toc__link--active'));
    if (activeLink) activeLink.classList.add('bd-toc__link--active');
  }

  window.addEventListener('scroll', update, { passive: true });
  update();

})();


/* ================================================================
   3. TOC COLLAPSE TOGGLE
   ================================================================ */

(function initTOCToggle() {

  const toggle  = document.querySelector('.bd-toc__toggle');
  const tocList = document.querySelector('.bd-toc__list');
  if (!toggle || !tocList) return;

  let collapsed = false;

  toggle.addEventListener('click', () => {
    collapsed = !collapsed;
    tocList.style.display   = collapsed ? 'none' : '';
    toggle.textContent       = collapsed ? 'Expand' : 'Collapse';
    toggle.setAttribute('aria-expanded', String(!collapsed));
  });

  toggle.setAttribute('aria-expanded', 'true');
  toggle.setAttribute('aria-controls', 'bd-toc-list');
  tocList.id = 'bd-toc-list';

})();


/* ================================================================
   4. SHARE BUTTONS
   Uses Web Share API where available; falls back to clipboard.
   ================================================================ */

(function initShareButtons() {

  $$('.bd-share-btn[data-share]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const action = btn.dataset.share;

      if (action === 'native' && navigator.share) {
        try {
          await navigator.share({
            title: document.title,
            url:   window.location.href,
          });
          srAnnounce('Article shared successfully.');
        } catch {
          /* User cancelled — do nothing */
        }
        return;
      }

      if (action === 'copy') {
        try {
          await navigator.clipboard.writeText(window.location.href);
          const orig = btn.innerHTML;
          btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg> Copied!';
          setTimeout(() => { btn.innerHTML = orig; if (window.lucide) lucide.createIcons(); }, 2000);
          srAnnounce('Article link copied to clipboard.');
          if (window.SolarEchos?.showToast) {
            window.SolarEchos.showToast('Link copied to clipboard!', 'success', 2500);
          }
        } catch {
          if (window.SolarEchos?.showToast) {
            window.SolarEchos.showToast('Could not copy link. Please copy manually.', 'error');
          }
        }
        return;
      }

      /* Social links — open in new tab */
      const url = encodeURIComponent(window.location.href);
      const title = encodeURIComponent(document.title);
      const hrefs = {
        twitter:  `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
        whatsapp: `https://wa.me/?text=${title}%20${url}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      };
      if (hrefs[action]) {
        window.open(hrefs[action], '_blank', 'noopener,noreferrer,width=600,height=500');
      }
    });
  });

})();


/* ================================================================
   5. MINI ROI CALCULATOR (sidebar widget)
   ================================================================ */

(function initSidebarCalc() {

  const form   = document.getElementById('bd-mini-calc');
  const result = document.getElementById('bd-calc-result');
  if (!form || !result) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    const bill  = parseFloat(document.getElementById('bd-calc-bill')?.value)  || 0;
    const units = parseFloat(document.getElementById('bd-calc-units')?.value) || 0;

    if (bill <= 0 || units <= 0) {
      if (window.SolarEchos?.showToast) {
        window.SolarEchos.showToast('Please enter both fields to estimate savings.', 'warning');
      }
      return;
    }

    /* Simple model: solar covers ~70-80% of average usage */
    const solarCoverage = 0.75;
    const annualSavings = Math.round(bill * 12 * solarCoverage);

    /* System size: approx 1 kW per 100 units/month */
    const systemKW      = Math.max(1, Math.round(units / 100));

    /* Payback: avg ₹55,000 per kW after subsidy */
    const cost          = systemKW * 55000;
    const payback       = (cost / annualSavings).toFixed(1);

    document.getElementById('bd-calc-savings').textContent  = `₹${annualSavings.toLocaleString('en-IN')}`;
    document.getElementById('bd-calc-system').textContent   = `${systemKW} kW`;
    document.getElementById('bd-calc-payback').textContent  = `${payback} yrs`;

    result.classList.add('show');
    result.setAttribute('aria-live', 'polite');
    srAnnounce(`Estimated annual savings: ₹${annualSavings.toLocaleString('en-IN')}. Recommended system: ${systemKW} kW. Payback period: ${payback} years.`);
  });

})();


/* ================================================================
   6. SCROLL REVEAL  — [data-animate]
   ================================================================ */

(function initScrollReveal() {

  if (!('IntersectionObserver' in window)) {
    $$('[data-animate]').forEach(el => el.classList.add('in-view'));
    return;
  }

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.animateDelay
          ? parseInt(entry.target.dataset.animateDelay) * 80
          : 0;
        setTimeout(() => entry.target.classList.add('in-view'), delay);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.07, rootMargin: '0px 0px -30px 0px' });

  $$('[data-animate]').forEach(el => obs.observe(el));

})();


/* ================================================================
   7. ESTIMATED READ TIME — auto-calculate from prose
   ================================================================ */

(function initReadTime() {

  const article    = document.querySelector('.bd-article');
  const readTimeEl = document.getElementById('bd-read-time');
  const wordsEl    = document.getElementById('bd-word-count');
  if (!article) return;

  const words  = article.textContent.trim().split(/\s+/).length;
  const mins   = Math.max(1, Math.round(words / 220));  /* 220 wpm reading speed */

  if (readTimeEl) readTimeEl.textContent = `${mins} min read`;
  if (wordsEl)    wordsEl.textContent    = `${words.toLocaleString('en-IN')} words`;

})();


/* ================================================================
   8. SMOOTH ANCHOR SCROLL (TOC links + any in-page links)
   Adds proper offset so headings aren't hidden under sticky navbar.
   ================================================================ */

(function initAnchorScroll() {

  const NAVBAR_H = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--navbar-height') || '80'
  );

  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const id     = link.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (!target) return;

    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - NAVBAR_H - 24;
    window.scrollTo({ top, behavior: 'smooth' });

    /* Update URL without jumping */
    history.pushState(null, '', `#${id}`);
  });

})();


/* ================================================================
   9. NEWSLETTER FORM (sidebar)
   ================================================================ */

(function initNewsletterForm() {

  const form = document.getElementById('bd-newsletter-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    const input = form.querySelector('input[type="email"]');
    const email = input?.value.trim() || '';

    if (!email || !email.includes('@') || !email.includes('.')) {
      if (input) {
        input.style.borderColor = 'var(--color-error)';
        setTimeout(() => { input.style.borderColor = ''; }, 2000);
      }
      if (window.SolarEchos?.showToast) {
        window.SolarEchos.showToast('Please enter a valid email.', 'error');
      }
      return;
    }

    if (input) input.value = '';
    if (window.SolarEchos?.showToast) {
      window.SolarEchos.showToast('Subscribed! You\'ll get weekly solar insights.', 'success');
    }
    srAnnounce('Successfully subscribed to newsletter.');
  });

})();


/* ================================================================
   10. INLINE IMAGE LIGHTBOX
   Click any .bd-img img to see it full-screen.
   ================================================================ */

(function initLightbox() {

  /* Build overlay once */
  const overlay = document.createElement('div');
  overlay.id    = 'bd-lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Image viewer');
  overlay.style.cssText = `
    position:fixed; inset:0;
    background:rgba(0,0,0,0.88);
    z-index:9998;
    display:flex; align-items:center; justify-content:center;
    padding:32px;
    opacity:0; pointer-events:none;
    transition:opacity 0.3s ease;
    cursor:zoom-out;
  `;

  const img = document.createElement('img');
  img.style.cssText = `
    max-width:100%; max-height:90vh;
    border-radius:12px;
    box-shadow:0 24px 80px rgba(0,0,0,0.7);
    transform:scale(0.95);
    transition:transform 0.3s ease;
    pointer-events:none;
  `;

  overlay.appendChild(img);
  document.body.appendChild(overlay);

  function open(src, alt) {
    img.src = src;
    img.alt = alt || '';
    overlay.style.opacity       = '1';
    overlay.style.pointerEvents = 'all';
    img.style.transform         = 'scale(1)';
    document.body.style.overflow = 'hidden';
  }

  function close() {
    overlay.style.opacity       = '0';
    overlay.style.pointerEvents = 'none';
    img.style.transform         = 'scale(0.95)';
    document.body.style.overflow = '';
  }

  overlay.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  /* Attach to all inline article images */
  $$('.bd-img img, .bd-hero__img-wrap img').forEach(el => {
    el.style.cursor = 'zoom-in';
    el.addEventListener('click', () => open(el.src, el.alt));
  });

})();


/* ================================================================
   11. HIGHLIGHT BOX ENTRANCE ANIMATION
   Slightly different treatment from regular [data-animate]
   ================================================================ */

(function initHighlightBoxes() {

  if (!('IntersectionObserver' in window)) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity   = '1';
        entry.target.style.transform = 'none';
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  $$('.bd-highlight-box, .bd-pullquote, .bd-stat-row').forEach(el => {
    el.style.cssText += 'opacity:0;transform:translateY(16px);transition:opacity 0.5s ease,transform 0.5s ease;';
    obs.observe(el);
  });

})();


/* ================================================================
   12. STICKY TOC — collapse on mobile, expand on desktop
   ================================================================ */

(function initMobileTOC() {

  const toc   = document.querySelector('.bd-toc');
  const list  = document.querySelector('.bd-toc__list');
  if (!toc || !list) return;

  function check() {
    if (window.innerWidth < 768) {
      /* Collapse by default on mobile */
      list.style.display = 'none';
    } else {
      list.style.display = '';
    }
  }

  check();
  window.addEventListener('resize', check, { passive: true });

})();

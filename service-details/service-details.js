/**
 * Solar-Echos | Service Details — Shared JavaScript
 * File:    service-details/service-details.js
 * Used by: ALL 6 service detail pages
 * Version: 1.0.0
 *
 * Modules:
 *  1. FAQ Accordion
 *  2. Gallery Lightbox
 *  3. Sidebar Quote Form
 *  4. Sticky Sidebar Progress Tracker
 *  5. Animated Number Counters (hero stats)
 *  6. Smooth Section Scroll Spy (highlight active TOC link)
 *  7. Lucide re-init after component injection
 */

'use strict';

/* ============================================================
   1. FAQ ACCORDION
   ============================================================ */

(function initFAQ() {

  const items = document.querySelectorAll('.sd-faq-item');
  if (!items.length) return;

  items.forEach(item => {
    const trigger = item.querySelector('.sd-faq-item__trigger');
    const body    = item.querySelector('.sd-faq-item__body');
    if (!trigger || !body) return;

    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('sd-faq-item--open');

      // Close all items
      items.forEach(i => {
        i.classList.remove('sd-faq-item--open');
        const b = i.querySelector('.sd-faq-item__body');
        const t = i.querySelector('.sd-faq-item__trigger');
        if (b) { collapsePanel(b); }
        if (t) { t.setAttribute('aria-expanded', 'false'); }
      });

      // Open clicked (if was closed)
      if (!isOpen) {
        item.classList.add('sd-faq-item--open');
        trigger.setAttribute('aria-expanded', 'true');
        expandPanel(body);
      }
    });

    // Keyboard
    trigger.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        trigger.click();
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = getAdjacentItem(item, 1);
        next?.querySelector('.sd-faq-item__trigger')?.focus();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = getAdjacentItem(item, -1);
        prev?.querySelector('.sd-faq-item__trigger')?.focus();
      }
    });
  });

  function expandPanel(el) {
    el.style.display  = 'block';
    el.style.overflow = 'hidden';
    el.style.maxHeight = '0';
    el.style.opacity  = '0';
    el.style.transition = 'max-height 0.35s ease, opacity 0.25s ease';
    void el.offsetHeight;
    el.style.maxHeight = el.scrollHeight + 30 + 'px';
    el.style.opacity  = '1';
    el.addEventListener('transitionend', () => {
      el.style.maxHeight = '';
      el.style.overflow  = '';
    }, { once: true });
  }

  function collapsePanel(el) {
    if (el.style.display === 'none' || !el.offsetHeight) return;
    el.style.overflow  = 'hidden';
    el.style.maxHeight = el.scrollHeight + 'px';
    el.style.opacity  = '1';
    el.style.transition = 'max-height 0.28s ease, opacity 0.2s ease';
    void el.offsetHeight;
    el.style.maxHeight = '0';
    el.style.opacity  = '0';
    el.addEventListener('transitionend', () => {
      el.style.display   = 'none';
      el.style.maxHeight = '';
      el.style.overflow  = '';
      el.style.opacity   = '';
    }, { once: true });
  }

  function getAdjacentItem(current, dir) {
    const all = Array.from(items);
    const idx = all.indexOf(current);
    return all[idx + dir] || null;
  }

})();


/* ============================================================
   2. GALLERY LIGHTBOX
   ============================================================ */

(function initLightbox() {

  const galleryItems = document.querySelectorAll('.sd-gallery-item');
  if (!galleryItems.length) return;

  // Create lightbox DOM once
  const lb = document.createElement('div');
  lb.className = 'sd-lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Image lightbox');
  lb.innerHTML = `
    <button class="sd-lightbox__close" aria-label="Close lightbox">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
           viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6 6 18M6 6l12 12"/>
      </svg>
    </button>
    <img class="sd-lightbox__img" src="" alt="" />
    <div class="sd-lightbox__caption"></div>
  `;
  document.body.appendChild(lb);

  const lbImg     = lb.querySelector('.sd-lightbox__img');
  const lbCaption = lb.querySelector('.sd-lightbox__caption');
  const lbClose   = lb.querySelector('.sd-lightbox__close');

  function openLightbox(src, alt, caption) {
    lbImg.src     = src;
    lbImg.alt     = alt;
    lbCaption.textContent = caption || '';
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }

  function closeLightbox() {
    lb.classList.remove('active');
    document.body.style.overflow = '';
  }

  galleryItems.forEach(item => {
    const img     = item.querySelector('img');
    const strong  = item.querySelector('.sd-gallery-item__overlay strong');
    const span    = item.querySelector('.sd-gallery-item__overlay span');
    if (!img) return;

    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `View: ${img.alt}`);

    item.addEventListener('click', () =>
      openLightbox(img.src, img.alt, strong ? strong.textContent + (span ? ' · ' + span.textContent : '') : '')
    );

    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); }
    });
  });

  lbClose.addEventListener('click', closeLightbox);
  lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && lb.classList.contains('active')) closeLightbox();
  });

})();


/* ============================================================
   3. SIDEBAR QUOTE FORM
   ============================================================ */

(function initSidebarQuoteForm() {

  const form = document.getElementById('sd-quote-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const nameEl  = form.querySelector('#sdq-name');
    const phoneEl = form.querySelector('#sdq-phone');
    const btn     = form.querySelector('[type="submit"]');
    const btnText = btn?.querySelector('span') || btn;

    // Simple validation
    let valid = true;

    if (!nameEl?.value.trim()) {
      nameEl?.classList.add('error');
      valid = false;
    } else {
      nameEl?.classList.remove('error');
    }

    if (!phoneEl?.value.trim() || !/^[\d+\s\-()]{7,15}$/.test(phoneEl.value)) {
      phoneEl?.classList.add('error');
      valid = false;
    } else {
      phoneEl?.classList.remove('error');
    }

    if (!valid) return;

    // Loading state
    if (btn) {
      btn.disabled = true;
      if (btnText) btnText.textContent = 'Sending…';
    }

    // Simulate API
    await new Promise(r => setTimeout(r, 1400));

    // Success
    form.innerHTML = `
      <div style="text-align:center;padding:var(--space-3) 0;color:#fff;">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"
             viewBox="0 0 24 24" fill="none" stroke="#4ade80"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="margin:0 auto var(--space-2);display:block;">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <strong style="font-size:var(--text-md);display:block;margin-bottom:8px;">Request Sent!</strong>
        <p style="font-size:var(--text-sm);color:rgba(255,255,255,0.65);margin:0;">
          We'll call you back within 2 hours.
        </p>
      </div>
    `;

    if (window.SolarEchos) {
      window.SolarEchos.showToast('Quote request sent! Expect a call within 2 hours. ☀️', 'success');
    }
  });

  // Clear errors on input
  form.querySelectorAll('.form-control').forEach(input => {
    input.addEventListener('input', () => input.classList.remove('error'));
  });

})();


/* ============================================================
   4. SCROLL SPY — highlight active TOC / section link
   ============================================================ */

(function initScrollSpy() {

  const tocLinks = document.querySelectorAll('.sd-toc-link');
  if (!tocLinks.length) return;

  const sectionIds = Array.from(tocLinks).map(l => l.getAttribute('href')?.slice(1)).filter(Boolean);
  const sections   = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

  if (!sections.length) return;

  const navbarH = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--navbar-height') || '80', 10
  );

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        tocLinks.forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`.sd-toc-link[href="#${entry.target.id}"]`);
        activeLink?.classList.add('active');
      }
    });
  }, {
    rootMargin: `-${navbarH + 20}px 0px -60% 0px`,
    threshold: 0,
  });

  sections.forEach(s => observer.observe(s));

})();


/* ============================================================
   5. ANIMATED NUMBER COUNTERS (hero stats)
   ============================================================ */

(function initHeroCounters() {

  const counters = document.querySelectorAll('[data-sd-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el      = entry.target;
      const target  = parseFloat(el.getAttribute('data-sd-count'));
      const suffix  = el.getAttribute('data-sd-suffix') || '';
      const prefix  = el.getAttribute('data-sd-prefix') || '';
      const dec     = el.getAttribute('data-sd-decimals') ? parseInt(el.getAttribute('data-sd-decimals')) : 0;
      const dur     = 1600;
      const startTs = performance.now();

      function step(ts) {
        const p = Math.min((ts - startTs) / dur, 1);
        const v = target * (1 - Math.pow(1 - p, 3));
        el.textContent = prefix + v.toFixed(dec) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));

})();


/* ============================================================
   6. STICKY "IN THIS SERVICE" MINI NAVIGATION
   Highlights current visible section in the mini-TOC
   that can optionally appear in the sidebar.
   ============================================================ */

(function initStickyTOC() {

  const toc = document.getElementById('sd-toc');
  if (!toc) return;

  // Build TOC from all sd-section elements that have an id
  const sections = document.querySelectorAll('.sd-section[id]');
  if (!sections.length) return;

  const ul = toc.querySelector('ul') || (() => {
    const list = document.createElement('ul');
    list.className = 'sd-toc-list';
    toc.appendChild(list);
    return list;
  })();

  // Only build if empty
  if (!ul.children.length) {
    sections.forEach(sec => {
      const heading = sec.querySelector('h2, h3, .sd-section-heading');
      if (!heading) return;
      const li   = document.createElement('li');
      const link = document.createElement('a');
      link.className = 'sd-toc-link';
      link.href      = `#${sec.id}`;
      link.textContent = heading.textContent.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
      li.appendChild(link);
      ul.appendChild(li);

      link.addEventListener('click', e => {
        e.preventDefault();
        const top = sec.getBoundingClientRect().top + window.scrollY
                    - parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height'), 10) - 20;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }

})();


/* ============================================================
   7. LUCIDE RE-INIT after async component injection
   ============================================================ */

(function watchComponents() {

  const observer = new MutationObserver(() => {
    if (window.lucide) window.lucide.createIcons();
  });

  ['navbar-placeholder', 'footer-placeholder'].forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el, { childList: true });
  });

})();

/* ============================================================
   END OF SERVICE-DETAILS SHARED JAVASCRIPT
   ============================================================ */

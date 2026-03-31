/**
 * Solar-Echos | Contact Page — JavaScript
 * Author: TechEchos Innovation
 * Version: 1.0.0
 *
 * Modules:
 *  1. Contact Form — Validation + Submission
 *  2. FAQ Accordion
 *  3. Map Tabs
 *  4. Floating Label Enhancement
 *  5. Character counter on textarea
 *  6. Lucide re-init after component injection
 */

'use strict';

/* ============================================================
   1. CONTACT FORM — VALIDATION + SUBMISSION
   ============================================================ */

(function initContactForm() {

  const form       = document.getElementById('contact-form');
  const submitBtn  = document.getElementById('cf-submit');
  const submitText = document.getElementById('cf-submit-text');
  const successEl  = document.getElementById('contact-success');

  if (!form) return;

  /* ── Field definitions for validation ── */
  const fields = [
    {
      id:        'cf-name',
      errorId:   'cf-name-error',
      label:     'Full name',
      validate:  v => v.trim().length >= 2,
      message:   'Please enter your full name (at least 2 characters).',
    },
    {
      id:        'cf-phone',
      errorId:   'cf-phone-error',
      label:     'Phone number',
      validate:  v => /^[+]?[\d\s\-()]{8,15}$/.test(v.trim()),
      message:   'Please enter a valid phone number.',
    },
    {
      id:        'cf-email',
      errorId:   'cf-email-error',
      label:     'Email address',
      validate:  v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
      message:   'Please enter a valid email address.',
    },
    {
      id:        'cf-city',
      errorId:   'cf-city-error',
      label:     'City / location',
      validate:  v => v.trim().length >= 2,
      message:   'Please enter your city or location.',
    },
  ];

  /* ── Validate a single field ── */
  function validateField(fieldDef) {
    const input = document.getElementById(fieldDef.id);
    const error = document.getElementById(fieldDef.errorId);
    if (!input || !error) return true;

    const isValid = fieldDef.validate(input.value);

    if (!isValid) {
      input.classList.add('error');
      input.setAttribute('aria-invalid', 'true');
      error.textContent = fieldDef.message;
      return false;
    }

    input.classList.remove('error');
    input.removeAttribute('aria-invalid');
    error.textContent = '';
    return true;
  }

  /* ── Validate consent checkbox ── */
  function validateConsent() {
    const checkbox = document.getElementById('cf-consent');
    const error    = document.getElementById('cf-consent-error');
    if (!checkbox || !error) return true;

    if (!checkbox.checked) {
      error.textContent = 'Please accept the privacy policy to continue.';
      return false;
    }

    error.textContent = '';
    return true;
  }

  /* ── Clear error on input ── */
  fields.forEach(fieldDef => {
    const input = document.getElementById(fieldDef.id);
    if (!input) return;

    input.addEventListener('input', () => {
      if (input.classList.contains('error')) {
        validateField(fieldDef);
      }
    });

    input.addEventListener('blur', () => {
      if (input.value.trim()) validateField(fieldDef);
    });
  });

  /* ── Set loading state ── */
  function setLoading(isLoading) {
    submitBtn.classList.toggle('loading', isLoading);
    submitBtn.disabled = isLoading;

    if (isLoading) {
      submitText.innerHTML = `
        <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
             viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Submitting…
      `;
    } else {
      submitText.textContent = 'Request Free Survey & Quote';
    }
  }

  /* ── Simulate form submission (replace with real API call) ── */
  async function submitForm() {
    // In production replace this with:
    // const res = await fetch('/api/contact', { method:'POST', body: new FormData(form) });
    return new Promise(resolve => setTimeout(resolve, 1800));
  }

  /* ── Reveal success state ── */
  function showSuccess() {
    form.setAttribute('hidden', '');
    successEl?.removeAttribute('hidden');
    successEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (window.SolarEchos) {
      window.SolarEchos.showToast(
        'Your request has been submitted! We\'ll call you within 2 hours. ☀️',
        'success',
        6000
      );
    }

    // Re-init lucide icons inside success element
    if (window.lucide) window.lucide.createIcons();
  }

  /* ── Submit handler ── */
  form.addEventListener('submit', async e => {
    e.preventDefault();

    // Validate all required fields
    let isValid = true;
    fields.forEach(f => { if (!validateField(f)) isValid = false; });
    if (!validateConsent()) isValid = false;

    if (!isValid) {
      // Scroll to first error
      const firstError = form.querySelector('.form-control.error, input:invalid');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstError?.focus();
      return;
    }

    setLoading(true);

    try {
      await submitForm();
      showSuccess();
    } catch (err) {
      if (window.SolarEchos) {
        window.SolarEchos.showToast(
          'Something went wrong. Please try again or call +91 (987) 654-3210.',
          'error'
        );
      }
    } finally {
      setLoading(false);
    }
  });

  /* ── Phone number formatter ── */
  const phoneInput = document.getElementById('cf-phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      // Strip non-numeric except + - ( ) space
      const cleaned = phoneInput.value.replace(/[^\d+\-() ]/g, '');
      if (cleaned !== phoneInput.value) phoneInput.value = cleaned;
    });
  }

})();


/* ============================================================
   2. FAQ ACCORDION
   Single-open accordion with smooth height animation.
   ============================================================ */

(function initFAQAccordion() {

  const triggers = document.querySelectorAll('.faq-item__trigger');
  if (!triggers.length) return;

  triggers.forEach(trigger => {
    const bodyId = trigger.getAttribute('aria-controls');
    const body   = document.getElementById(bodyId);
    if (!body) return;

    trigger.addEventListener('click', () => {
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';

      // Close all other open items first
      triggers.forEach(otherTrigger => {
        if (otherTrigger === trigger) return;
        const otherId   = otherTrigger.getAttribute('aria-controls');
        const otherBody = document.getElementById(otherId);
        if (!otherBody) return;

        otherTrigger.setAttribute('aria-expanded', 'false');
        collapseBody(otherBody);
      });

      // Toggle this item
      if (isOpen) {
        trigger.setAttribute('aria-expanded', 'false');
        collapseBody(body);
      } else {
        trigger.setAttribute('aria-expanded', 'true');
        expandBody(body);
      }
    });

    // Keyboard: Enter / Space
    trigger.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        trigger.click();
      }
      // Arrow key navigation between triggers
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = getNextTrigger(trigger, 1);
        next?.focus();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = getNextTrigger(trigger, -1);
        prev?.focus();
      }
    });
  });

  function expandBody(body) {
    body.removeAttribute('hidden');
    body.style.overflow = 'hidden';
    body.style.maxHeight = '0';
    body.style.opacity  = '0';
    body.style.transition = 'max-height 0.35s ease, opacity 0.25s ease';

    // Force reflow
    void body.offsetHeight;

    body.style.maxHeight = body.scrollHeight + 'px';
    body.style.opacity   = '1';

    body.addEventListener('transitionend', () => {
      body.style.maxHeight = '';
      body.style.overflow  = '';
    }, { once: true });
  }

  function collapseBody(body) {
    if (body.hasAttribute('hidden')) return;

    body.style.overflow  = 'hidden';
    body.style.maxHeight = body.scrollHeight + 'px';
    body.style.opacity   = '1';
    body.style.transition = 'max-height 0.3s ease, opacity 0.2s ease';

    void body.offsetHeight;

    body.style.maxHeight = '0';
    body.style.opacity   = '0';

    body.addEventListener('transitionend', () => {
      body.setAttribute('hidden', '');
      body.style.maxHeight = '';
      body.style.overflow  = '';
    }, { once: true });
  }

  function getNextTrigger(current, direction) {
    const all   = Array.from(triggers);
    const idx   = all.indexOf(current);
    const next  = idx + direction;
    if (next < 0 || next >= all.length) return null;
    return all[next];
  }

})();


/* ============================================================
   3. MAP TABS
   Shows/hides map panels and updates the overlay info card.
   ============================================================ */

(function initMapTabs() {

  const tabs = document.querySelectorAll('.map-tab');
  if (!tabs.length) return;

  /* Map overlay info data per office */
  const officeData = {
    mumbai:    { name: 'Mumbai Head Office',    address: '42 Solar Tower, BKC, Mumbai 400051' },
    pune:      { name: 'Pune Regional Office',  address: 'Green Energy Park, Hinjewadi, Pune 411057' },
    bengaluru: { name: 'Bengaluru Office',      address: 'Solar Hub, Whitefield, Bengaluru 560066' },
  };

  const nameEl    = document.getElementById('map-office-name');
  const addressEl = document.getElementById('map-office-address');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const mapKey = tab.dataset.map;

      /* Update tab states */
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      /* Show correct panel */
      document.querySelectorAll('.map-panel').forEach(panel => {
        panel.classList.remove('active');
        panel.setAttribute('hidden', '');
      });

      const activePanel = document.getElementById(`map-panel-${mapKey}`);
      if (activePanel) {
        activePanel.removeAttribute('hidden');
        activePanel.classList.add('active');
      }

      /* Update overlay info */
      const data = officeData[mapKey];
      if (data && nameEl && addressEl) {
        nameEl.textContent    = data.name;
        addressEl.textContent = data.address;
      }
    });
  });

})();


/* ============================================================
   4. TEXTAREA CHARACTER COUNTER
   Adds a live character count below the message field.
   ============================================================ */

(function initCharCounter() {

  const textarea = document.getElementById('cf-message');
  if (!textarea) return;

  const MAX_CHARS = 800;
  textarea.setAttribute('maxlength', MAX_CHARS);

  const counter = document.createElement('span');
  counter.className = 'form-char-counter';
  counter.setAttribute('aria-live', 'polite');
  counter.style.cssText = `
    display:block;
    text-align:right;
    font-size:var(--text-xs);
    color:var(--text-muted);
    margin-top:4px;
    transition:color var(--transition-fast);
  `;
  counter.textContent = `0 / ${MAX_CHARS}`;

  textarea.parentNode.appendChild(counter);

  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    counter.textContent = `${len} / ${MAX_CHARS}`;

    if (len > MAX_CHARS * 0.9) {
      counter.style.color = 'var(--color-error)';
    } else if (len > MAX_CHARS * 0.75) {
      counter.style.color = 'var(--color-warning)';
    } else {
      counter.style.color = 'var(--text-muted)';
    }
  });

})();


/* ============================================================
   5. ANCHOR SCROLL FOR "GET FREE QUOTE" HERO CHIP
   Ensures clicking the CTA scrolls smoothly to the form.
   ============================================================ */

(function initHeroScrollCTA() {
  // Handled by global.js smooth anchor scroll — no extra code needed.
  // This is a placeholder to document the dependency.
})();


/* ============================================================
   6. LUCIDE RE-INIT after async component injection
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
   END OF CONTACT PAGE JAVASCRIPT
   ============================================================ */

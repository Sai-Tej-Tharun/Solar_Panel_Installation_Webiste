/**
 * Solar-Echos | Login & Register Page JavaScript
 * Author: TechEchos Innovation
 * Version: 1.0.0
 * Description:
 *   - Cinematic login ↔ register mode switching
 *   - Full form validation (login + register)
 *   - Password strength meter
 *   - Password show/hide toggles
 *   - Account type radio visual
 *   - Tab slider sync
 *   - Social login simulation
 *   - Forgot password flow
 */

/* ============================================================
   1. MODE STATE & SWITCHING
   The entire page lives in one of two modes: 'login' | 'register'.
   Switching triggers a cascade of visual changes.
============================================================ */

/** @type {'login' | 'register'} */
let currentMode = 'login';

const TRANSITION_DURATION = 450; // ms — must match CSS animation duration

/**
 * Switches the auth page between login and register modes.
 * Triggers CSS transition animations, swaps form visibility,
 * updates ARIA states, and refreshes brand panel copy.
 *
 * @param {'login' | 'register'} mode
 */
function switchMode(mode) {
  if (mode === currentMode) return;
  currentMode = mode;

  const formWrap     = document.getElementById('auth-form-wrap');
  const brandPanel   = document.querySelector('.auth-panel--brand');
  const formLogin    = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const tabsSlider   = document.getElementById('tabs-slider');
  const brandCopyLogin    = document.getElementById('brand-copy-login');
  const brandCopyRegister = document.getElementById('brand-copy-register');

  // ── 1. Trigger form-wrap slide animation ──
  formWrap?.classList.add('transitioning');
  brandPanel?.classList.add('transitioning');

  // ── 2. Midpoint: swap forms & update tab UI ──
  setTimeout(() => {
    // Show/hide forms
    if (mode === 'register') {
      formLogin?.classList.add('hidden');
      formRegister?.classList.remove('hidden');
      formRegister?.classList.add('form-appear');

      // Swap brand copy
      brandCopyLogin?.classList.add('hidden');
      brandCopyRegister?.classList.remove('hidden');

      // Move tab slider right
      tabsSlider?.classList.add('right');

    } else {
      formRegister?.classList.add('hidden');
      formRegister?.classList.remove('form-appear');
      formLogin?.classList.remove('hidden');
      formLogin?.classList.add('form-appear');

      // Swap brand copy
      brandCopyRegister?.classList.add('hidden');
      brandCopyLogin?.classList.remove('hidden');

      // Move tab slider left
      tabsSlider?.classList.remove('right');
    }

    // Update tabs
    updateTabsAria(mode);

    // Clear form errors when switching
    clearAllErrors();

  }, TRANSITION_DURATION * 0.4);

  // ── 3. Cleanup transition classes ──
  setTimeout(() => {
    formWrap?.classList.remove('transitioning');
    brandPanel?.classList.remove('transitioning');
    formLogin?.classList.remove('form-appear');
    formRegister?.classList.remove('form-appear');
  }, TRANSITION_DURATION + 50);

  // ── 4. Update document title ──
  document.title = mode === 'register'
    ? 'Create Account | Solar-Echos'
    : 'Sign In | Solar-Echos';

  // ── 5. Update body data-mode for CSS hooks ──
  document.getElementById('auth-body')?.setAttribute('data-mode', mode);
}

/**
 * Updates ARIA selected state on tab buttons.
 * @param {'login' | 'register'} mode
 */
function updateTabsAria(mode) {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    const isActive = tab.dataset.mode === mode;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
}

/**
 * Wires all mode-switching triggers (tabs, inline links).
 */
function initModeSwitching() {
  // Tab buttons
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
  });

  // In-form switch links
  document.querySelectorAll('.auth-switch-link').forEach(link => {
    link.addEventListener('click', () => switchMode(link.dataset.mode));
  });
}

/* ============================================================
   2. VALIDATION HELPERS
============================================================ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s\-().]{7,20}$/;

/**
 * Shows an error message below a field.
 * @param {string} fieldId
 * @param {string} msg
 */
function showError(fieldId, msg) {
  const errEl  = document.getElementById(fieldId + '-err');
  const inputEl = document.getElementById(fieldId);
  if (errEl) { errEl.textContent = msg; errEl.classList.remove('hidden'); }
  if (inputEl) {
    inputEl.classList.add('error');
    inputEl.setAttribute('aria-invalid', 'true');
  }
}

/**
 * Clears an error for a specific field.
 * @param {string} fieldId
 */
function clearError(fieldId) {
  const errEl  = document.getElementById(fieldId + '-err');
  const inputEl = document.getElementById(fieldId);
  if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); }
  if (inputEl) {
    inputEl.classList.remove('error');
    inputEl.removeAttribute('aria-invalid');
  }
}

/** Clears all validation errors across both forms. */
function clearAllErrors() {
  document.querySelectorAll('.form-error').forEach(el => {
    el.textContent = '';
    el.classList.add('hidden');
  });
  document.querySelectorAll('.auth-input').forEach(el => {
    el.classList.remove('error');
    el.removeAttribute('aria-invalid');
  });
}

/**
 * Sets button into loading state.
 * @param {HTMLButtonElement} btn
 */
function setButtonLoading(btn) {
  const text   = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  const arrow  = btn.querySelector('.btn-arrow');
  if (text)   text.style.opacity = '0';
  if (loader) loader.classList.remove('hidden');
  if (arrow)  arrow.style.opacity = '0';
  btn.disabled = true;
}

/**
 * Restores button from loading state.
 * @param {HTMLButtonElement} btn
 */
function setButtonReady(btn) {
  const text   = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  const arrow  = btn.querySelector('.btn-arrow');
  if (text)   text.style.opacity = '1';
  if (loader) loader.classList.add('hidden');
  if (arrow)  arrow.style.opacity = '1';
  btn.disabled = false;
}

/* ============================================================
   3. LOGIN FORM VALIDATION & SUBMIT
============================================================ */

function initLoginForm() {
  const form       = document.getElementById('form-login');
  const submitBtn  = document.getElementById('login-submit-btn');
  if (!form) return;

  // Clear errors on input
  ['login-email', 'login-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => clearError(id));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();

    const email    = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;

    let valid = true;

    if (!email) {
      showError('login-email', 'Please enter your email address.');
      valid = false;
    } else if (!EMAIL_RE.test(email)) {
      showError('login-email', 'Please enter a valid email address.');
      valid = false;
    }

    if (!password) {
      showError('login-password', 'Please enter your password.');
      valid = false;
    } else if (password.length < 6) {
      showError('login-password', 'Password must be at least 6 characters.');
      valid = false;
    }

    if (!valid) return;

    setButtonLoading(submitBtn);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    setButtonReady(submitBtn);

    // Simulate success — redirect to dashboard
    if (window.SolarEchos?.showToast) {
      window.SolarEchos.showToast('Welcome back! Redirecting to your dashboard…', 'success', 3000);
    }

    setTimeout(() => {
      window.location.href = '../admin-dashboard/dashboard.html';
    }, 2000);
  });
}

/* ============================================================
   4. REGISTER FORM VALIDATION & SUBMIT
============================================================ */

function initRegisterForm() {
  const form      = document.getElementById('form-register');
  const submitBtn = document.getElementById('register-submit-btn');
  if (!form) return;

  // Clear errors on input
  ['reg-fname','reg-lname','reg-email','reg-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => clearError(id));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();

    const fname    = document.getElementById('reg-fname')?.value.trim();
    const lname    = document.getElementById('reg-lname')?.value.trim();
    const email    = document.getElementById('reg-email')?.value.trim();
    const phone    = document.getElementById('reg-phone')?.value.trim();
    const password = document.getElementById('reg-password')?.value;
    const terms    = document.getElementById('reg-terms')?.checked;

    let valid = true;

    if (!fname) {
      showError('reg-fname', 'First name is required.');
      valid = false;
    } else if (fname.length < 2) {
      showError('reg-fname', 'Enter at least 2 characters.');
      valid = false;
    }

    if (!lname) {
      showError('reg-lname', 'Last name is required.');
      valid = false;
    }

    if (!email) {
      showError('reg-email', 'Email address is required.');
      valid = false;
    } else if (!EMAIL_RE.test(email)) {
      showError('reg-email', 'Please enter a valid email address.');
      valid = false;
    }

    if (phone && !PHONE_RE.test(phone)) {
      showError('reg-phone', 'Please enter a valid phone number.');
      valid = false;
    }

    if (!password) {
      showError('reg-password', 'Please create a password.');
      valid = false;
    } else if (password.length < 8) {
      showError('reg-password', 'Password must be at least 8 characters.');
      valid = false;
    }

    if (!terms) {
      showError('reg-terms', 'Please accept the terms to continue.');
      valid = false;
    }

    if (!valid) {
      // Scroll to first error
      const firstErr = form.querySelector('.form-error:not(.hidden)');
      if (firstErr) {
        firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setButtonLoading(submitBtn);

    await new Promise(resolve => setTimeout(resolve, 1800));

    setButtonReady(submitBtn);

    if (window.SolarEchos?.showToast) {
      window.SolarEchos.showToast('Account created! Please verify your email address.', 'success', 5000);
    }

    // Clear form
    form.reset();
    resetPasswordStrength();
    document.querySelectorAll('.account-type-option').forEach((opt, i) => {
      opt.classList.toggle('active', i === 0);
    });
  });
}

/* ============================================================
   5. PASSWORD VISIBILITY TOGGLE
============================================================ */

function initPasswordToggles() {
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId  = btn.dataset.target;
      const input     = document.getElementById(targetId);
      const eyeOpen   = btn.querySelector('.eye-open');
      const eyeClosed = btn.querySelector('.eye-closed');
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      eyeOpen?.classList.toggle('hidden', isPassword);
      eyeClosed?.classList.toggle('hidden', !isPassword);

      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');

      // Return focus to input
      input.focus();
    });
  });
}

/* ============================================================
   6. PASSWORD STRENGTH METER
============================================================ */

/** Resets all strength bar colours. */
function resetPasswordStrength() {
  for (let i = 1; i <= 4; i++) {
    const bar = document.getElementById(`pwb-${i}`);
    if (bar) { bar.className = 'pw-bar'; }
  }
  const label = document.getElementById('pw-label');
  if (label) label.textContent = 'Enter a password';
}

/**
 * Calculates password strength score 0–4.
 * @param {string} pw
 * @returns {{ score: number, label: string }}
 */
function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: 'Enter a password' };

  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score] || 'Weak' };
}

function initPasswordStrength() {
  const input = document.getElementById('reg-password');
  if (!input) return;

  input.addEventListener('input', () => {
    const { score, label } = getPasswordStrength(input.value);
    const strengthLabel    = document.getElementById('pw-label');
    const classMap         = ['', 'weak', 'fair', 'good', 'strong'];

    for (let i = 1; i <= 4; i++) {
      const bar = document.getElementById(`pwb-${i}`);
      if (!bar) continue;
      bar.className = 'pw-bar';
      if (i <= score) bar.classList.add(classMap[score]);
    }

    if (strengthLabel) {
      strengthLabel.textContent = label;
      strengthLabel.style.color = score >= 3
        ? 'var(--color-secondary)'
        : score === 2 ? '#3b82f6'
        : score === 1 ? 'var(--color-warning)'
        : 'var(--text-muted)';
    }
  });
}

/* ============================================================
   7. ACCOUNT TYPE RADIO VISUALS
============================================================ */

function initAccountTypeOptions() {
  const options = document.querySelectorAll('.account-type-option');
  options.forEach(option => {
    option.addEventListener('click', () => {
      options.forEach(o => o.classList.remove('active'));
      option.classList.add('active');
    });
  });
}

/* ============================================================
   8. SOCIAL BUTTON SIMULATION
============================================================ */

function initSocialButtons() {
  document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const provider = btn.getAttribute('aria-label').replace('Sign in with ', '').replace('Sign up with ', '');
      if (window.SolarEchos?.showToast) {
        window.SolarEchos.showToast(`Redirecting to ${provider} sign-in…`, 'info', 2500);
      }
    });
  });
}

/* ============================================================
   9. FORGOT PASSWORD FLOW
============================================================ */

function initForgotPassword() {
  const link = document.getElementById('forgot-link');
  if (!link) return;

  link.addEventListener('click', (e) => {
    e.preventDefault();

    const emailInput = document.getElementById('login-email');
    const email      = emailInput?.value.trim();

    if (!email || !EMAIL_RE.test(email)) {
      // Shake the email field and show hint
      emailInput?.focus();
      showError('login-email', 'Enter your email first, then click Forgot password.');
      return;
    }

    // Simulate sending reset email
    if (window.SolarEchos?.showToast) {
      window.SolarEchos.showToast(`Password reset link sent to ${email}`, 'success', 5000);
    }
  });
}

/* ============================================================
   10. INPUT SHINE EFFECT ON FOCUS
   Adds a transient glow ring to the form card when any input
   is focused — reinforces the "solar energy" theme.
============================================================ */

function initInputShine() {
  const forms = document.querySelectorAll('.auth-form');

  forms.forEach(form => {
    form.querySelectorAll('.auth-input').forEach(input => {
      input.addEventListener('focus', () => {
        form.style.boxShadow = `
          var(--shadow-lg),
          0 0 0 1px rgba(255,215,0,0.15),
          0 0 40px rgba(255,215,0,0.06)
        `;
      });

      input.addEventListener('blur', () => {
        form.style.boxShadow = '';
      });
    });
  });
}

/* ============================================================
   11. KEYBOARD NAVIGATION
   ESC on focused form input clears that field.
   Tab trap is handled natively by the browser.
============================================================ */

function initKeyboardNav() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const active = document.activeElement;
      if (active?.classList.contains('auth-input')) {
        active.blur();
        clearError(active.id);
      }
    }
  });
}

/* ============================================================
   12. BRAND PANEL PARALLAX
   The sun system shifts very slightly on mouse move for depth.
============================================================ */

function initBrandParallax() {
  const brandPanel = document.querySelector('.auth-panel--brand');
  const sunSystem  = document.querySelector('.sun-system');
  if (!brandPanel || !sunSystem) return;

  if (window.matchMedia('(hover: none)').matches) return;

  let animFrame;

  brandPanel.addEventListener('mousemove', e => {
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = requestAnimationFrame(() => {
      const rect = brandPanel.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = (e.clientX - cx) / rect.width;
      const dy   = (e.clientY - cy) / rect.height;

      sunSystem.style.transform = `
        translate(calc(-50% + ${dx * 18}px), calc(-50% + ${dy * 18}px))
      `;
    });
  });

  brandPanel.addEventListener('mouseleave', () => {
    sunSystem.style.transform = 'translate(-50%, -50%)';
  });
}

/* ============================================================
   13. URL HASH ROUTING
   Allows direct linking to /login/#register
============================================================ */

function initHashRouting() {
  const hash = window.location.hash;
  if (hash === '#register') {
    switchMode('register');
  }
}

/* ============================================================
   14. PAGE INITIALISATION
============================================================ */

function initLoginPage() {
  initModeSwitching();
  initLoginForm();
  initRegisterForm();
  initPasswordToggles();
  initPasswordStrength();
  initAccountTypeOptions();
  initSocialButtons();
  initForgotPassword();
  initInputShine();
  initKeyboardNav();
  initBrandParallax();
  initHashRouting();

  // Wire theme toggle (global.js handles theme, but button needs event)
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.SolarEchos?.toggleTheme) window.SolarEchos.toggleTheme();
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLoginPage);
} else {
  initLoginPage();
}

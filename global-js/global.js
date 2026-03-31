/**
 * Solar-Echos | Global JavaScript
 * Author: TechEchos Innovation
 * Version: 1.0.0
 * Description: Shared utilities — component loader, theme toggle,
 *              scroll animations, back-to-top, toast notifications.
 */

/* ============================================================
   1. COMPONENT LOADER
   Fetches navbar.html and footer.html, injects them,
   then initialises all navbar behaviour.
   ============================================================ */


/**
 * Loads an HTML partial from a given URL and injects it
 * into the element matching the selector.
 *
 * @param {string} selector   – CSS selector of the mount point
 * @param {string} url        – path to the HTML partial
 * @returns {Promise<void>}
 */
async function loadComponent(selector, url) {
  const el = document.querySelector(selector);
  if (!el) return;

  try {
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    const html = await res.text();
    el.innerHTML = html;
  } catch (err) {
    console.warn(`[Solar-Echos] Component load error:`, err);
  }
}

/**
 * Marks the active nav link based on the current page URL.
 */
function setActiveNavLink() {
  const currentPath = window.location.pathname;

  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    // strip query strings / hashes for comparison
    const linkPath = href.split('?')[0].split('#')[0];

    if (linkPath && currentPath.includes(linkPath)) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });
}
/* ============================================================
   2. THEME TOGGLE (FINAL — FIXED + EVENT SYSTEM)
   ============================================================ */

const THEME_KEY = 'solar-echos-theme';

/**
 * Returns stored theme or system default
 */
function getStoredTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Applies theme + NOTIFIES entire app
 */
function applyTheme(theme) {
  const root = document.documentElement;

  // 🛑 Prevent redundant updates
  const prev = root.getAttribute('data-theme');
  if (prev === theme) return;

  // ✅ Set theme
  root.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);

  // ✅ Update UI icons
  updateThemeToggleUI(theme);

  // 🚀🔥 DISPATCH GLOBAL EVENT (THIS FIXES YOUR CANVAS)
  window.dispatchEvent(
    new CustomEvent('themeChange', { detail: theme })
  );
}

/**
 * Updates toggle button UI
 */
function updateThemeToggleUI(theme) {
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    const isDark = theme === 'dark';

    const iconEl = btn.querySelector('[data-theme-icon]');
    if (iconEl) {
      iconEl.innerHTML = isDark
        ? `<!-- Sun icon -->
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <circle cx="12" cy="12" r="4"/>
             <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41
                      M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
           </svg>`
        : `<!-- Moon icon -->
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
           </svg>`;
    }

    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('aria-pressed', String(isDark));
  });
}

/**
 * Toggle handler
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

/* ✅ APPLY THEME ON LOAD */
applyTheme(getStoredTheme());
/* ============================================================
   3. SCROLL ANIMATION OBSERVER
   Elements with [data-animate] gain .in-view when visible.
   ============================================================ */

function initScrollAnimations() {
  if (!('IntersectionObserver' in window)) {
    // Fallback: show all elements for older browsers
    document.querySelectorAll('[data-animate]').forEach(el => el.classList.add('in-view'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target); // animate once
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
}

/* ============================================================
   4. BACK-TO-TOP BUTTON
   ============================================================ */

function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ============================================================
   5. TOAST NOTIFICATION SYSTEM
   Usage: showToast('Message', 'success' | 'error' | 'warning' | 'info')
   ============================================================ */

const TOAST_ICONS = {
  success: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
               fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
               <path d="M20 6 9 17l-5-5"/></svg>`,
  error:   `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
               fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
               <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
               fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
               <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
               <path d="M12 9v4M12 17h.01"/></svg>`,
  info:    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
               fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
               <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
};

/**
 * Displays a toast notification.
 * @param {string} message  – text to show
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} [duration=4000] – ms before auto-dismiss
 */
function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('role', 'region');
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-label', 'Notifications');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    ${TOAST_ICONS[type] || TOAST_ICONS.info}
    <span>${message}</span>
    <button onclick="this.closest('.toast').remove()"
            aria-label="Dismiss"
            style="margin-left:auto;background:none;border:none;cursor:pointer;
                   color:var(--text-muted);padding:2px;line-height:1;">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2.5"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6 6 18M6 6l12 12"/>
      </svg>
    </button>
  `;

  container.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

/* Make globally accessible */
window.showToast = showToast;

/* ============================================================
   6. SMOOTH ANCHOR SCROLL
   Handles in-page anchor links gracefully (accounts for
   fixed navbar height).
   ============================================================ */

function initSmoothAnchors() {
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const id     = link.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (!target) return;

    e.preventDefault();
    const navbarH = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--navbar-height') || '80',
      10
    );
    const top = target.getBoundingClientRect().top + window.scrollY - navbarH - 16;
    window.scrollTo({ top, behavior: 'smooth' });
  });
}

/* ============================================================
   7. MOBILE MENU HELPERS
   Called after the navbar HTML is injected.
   ============================================================ */

function initNavbarBehaviours() {
  /* ── 7a. Mobile hamburger ── */
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileOverlay = document.getElementById('mobile-overlay');

  function openMenu() {
    hamburger?.setAttribute('aria-expanded', 'true');
    mobileMenu?.classList.add('open');
    mobileOverlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
    // Animate hamburger → X
    hamburger?.classList.add('active');
  }

  function closeMenu() {
    hamburger?.setAttribute('aria-expanded', 'false');
    mobileMenu?.classList.remove('open');
    mobileOverlay?.classList.remove('active');
    document.body.style.overflow = '';
    hamburger?.classList.remove('active');
  }

  hamburger?.addEventListener('click', () => {
    const isOpen = mobileMenu?.classList.contains('open');
    isOpen ? closeMenu() : openMenu();
  });

  mobileOverlay?.addEventListener('click', closeMenu);

  // Close on ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
  });
// Active nav link (REPLACE your old setActiveNavLink function)
function setActiveNavLink() {
  const currentPath = window.location.pathname;

  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');

    if (href && currentPath.includes(href)) {
      link.classList.add('active');
    }
  });
}
  // Close when a mobile nav link is clicked
// Close only real links, NOT dropdown parents
document.querySelectorAll('.mobile-nav-link').forEach(link => {
  link.addEventListener('click', function(e) {

    const parent = this.closest('.mobile-parent');

    // If it's a dropdown parent → toggle instead of closing
    if (parent) {
      e.preventDefault();

      // Close others (optional UX)
      document.querySelectorAll('.mobile-parent').forEach(p => {
        if (p !== parent) p.classList.remove('open');
      });

      parent.classList.toggle('open');
      return;
    }

    // Otherwise close menu normally
    closeMenu();
  });
});

  /* ── 7b. Sticky navbar shadow ── */
  const navbar = document.getElementById('main-navbar');

  function handleNavbarScroll() {
    if (!navbar) return;
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', handleNavbarScroll, { passive: true });
  handleNavbarScroll(); // run once on load

  /* ── 7c. Theme toggle buttons (may be inside navbar) ── */
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.addEventListener('click', toggleTheme);
  });

  // Sync theme icon after navbar is injected
  updateThemeToggleUI(getStoredTheme());

  /* ── 7d. Active link highlighting ── */
  setActiveNavLink();

  /* ── 7e. Dropdown menu on desktop (hover + focus) ── */
  document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
    const trigger = dropdown.querySelector('.nav-dropdown-trigger');
    const menu    = dropdown.querySelector('.nav-dropdown-menu');

    if (!trigger || !menu) return;

    let closeTimer;

    const openDropdown = () => {
      clearTimeout(closeTimer);
      menu.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    };

    const scheduleClose = () => {
      closeTimer = setTimeout(() => {
        menu.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }, 150);
    };

    dropdown.addEventListener('mouseenter', openDropdown);
    dropdown.addEventListener('mouseleave', scheduleClose);
    trigger.addEventListener('focus', openDropdown);
    menu.addEventListener('mouseenter', () => clearTimeout(closeTimer));

    // Keyboard: Enter/Space opens; Escape closes
    trigger.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        menu.classList.contains('open') ? scheduleClose() : openDropdown();
      }
      if (e.key === 'Escape') scheduleClose();
    });
  });
}

/* ============================================================
   8. INITIALISATION ENTRY POINT
   ============================================================ */

async function initGlobal() {
  // Determine the relative path from the current page to /components/
  // This uses a data attribute on <body> for flexibility.
  const componentsBase = document.body.dataset.componentsPath || '../components';

  /* Load navbar */
  await loadComponent('#navbar-placeholder', `${componentsBase}/navbar.html`);

  /* Load footer */
  await loadComponent('#footer-placeholder', `${componentsBase}/footer.html`);

  /* Wire up all navbar interactivity (must run AFTER navbar HTML injected) */
  initNavbarBehaviours();

  /* Scroll animations */
  initScrollAnimations();

  /* Back-to-top */
  initBackToTop();

  /* Smooth anchor scroll */
  initSmoothAnchors();

  /* Theme toggle for any buttons outside the navbar */
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.addEventListener('click', toggleTheme);
  });
}

/* Run when DOM is ready */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGlobal);
} else {
  initGlobal();
}

/* ============================================================
   9. EXPORTED UTILITIES (for page-level scripts)
   ============================================================ */
window.SolarEchos = {
  showToast,
  applyTheme,
  toggleTheme,
  getStoredTheme,
};

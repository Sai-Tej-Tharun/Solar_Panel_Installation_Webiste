/**
 * Solar-Echos | About Page JavaScript
 * Author: TechEchos Innovation
 * Version: 1.0.0
 * Description: Page-specific interactions for about.html.
 *              - Animated stat counters
 *              - Testimonial carousel (mobile)
 *              - Parallax subtle effect on hero image
 *              - Timeline entrance animations
 */

/* ============================================================
   1. ANIMATED STAT COUNTERS
   Uses IntersectionObserver to trigger counting when the
   stats bar scrolls into view.
============================================================ */

/**
 * Eases a value using an ease-out cubic function.
 * @param {number} t – progress 0→1
 * @returns {number}
 */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Animates a number from 0 to its target value.
 * @param {HTMLElement} el          – the element containing the number
 * @param {number}      target      – final number to count to
 * @param {number}      [duration=2000] – ms
 */
function animateCounter(el, target, duration = 2000) {
  const start     = performance.now();
  const isDecimal = target % 1 !== 0;

  function tick(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = easeOutCubic(progress);
    const current  = Math.round(eased * target);

    el.textContent = current.toLocaleString('en-IN');

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = target.toLocaleString('en-IN');
    }
  }

  requestAnimationFrame(tick);
}

/**
 * Initialises all stat counters; each fires once when in view.
 */
function initCounters() {
  const counterEls = document.querySelectorAll('[data-count]');
  if (!counterEls.length) return;

  if (!('IntersectionObserver' in window)) {
    // Fallback: set final values immediately
    counterEls.forEach(el => {
      el.textContent = Number(el.dataset.count).toLocaleString('en-IN');
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const target = parseFloat(entry.target.dataset.count);
        animateCounter(entry.target, target);
        observer.unobserve(entry.target); // trigger once only
      });
    },
    { threshold: 0.5 }
  );

  counterEls.forEach(el => observer.observe(el));
}

/* ============================================================
   2. TESTIMONIAL CAROUSEL (Mobile)
   On screens < 768 px, shows one testimonial at a time with
   prev/next dot navigation. On larger screens, the CSS grid
   handles the layout.
============================================================ */

function initTestimonialCarousel() {
  const slider = document.querySelector('.testimonials-slider');
  if (!slider) return;

  // Only activate on mobile
  const MOBILE_BREAKPOINT = 768;
  let currentIndex    = 0;
  let carouselActive  = false;
  let dotContainer    = null;
  const cards         = Array.from(slider.querySelectorAll('.testimonial-card'));

  function buildDots() {
    if (dotContainer) dotContainer.remove();
    dotContainer = document.createElement('div');
    dotContainer.className = 'testimonial-dots';
    dotContainer.setAttribute('role', 'tablist');
    dotContainer.setAttribute('aria-label', 'Testimonial navigation');
    dotContainer.style.cssText = `
      display: flex; justify-content: center; gap: 8px; margin-top: 20px;
    `;

    cards.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Testimonial ${i + 1}`);
      dot.setAttribute('aria-selected', String(i === currentIndex));
      dot.style.cssText = `
        width: 10px; height: 10px; border-radius: 50%; border: none;
        background: ${i === currentIndex ? 'var(--color-accent-orange)' : 'var(--border-color-strong)'};
        cursor: pointer; transition: background 0.3s, transform 0.3s;
        padding: 0;
      `;
      dot.addEventListener('click', () => goTo(i));
      dotContainer.appendChild(dot);
    });

    slider.parentNode.insertBefore(dotContainer, slider.nextSibling);
  }

  function updateDots() {
    if (!dotContainer) return;
    const dots = dotContainer.querySelectorAll('button');
    dots.forEach((dot, i) => {
      const active = i === currentIndex;
      dot.style.background = active ? 'var(--color-accent-orange)' : 'var(--border-color-strong)';
      dot.style.transform   = active ? 'scale(1.3)' : 'scale(1)';
      dot.setAttribute('aria-selected', String(active));
    });
  }

  function goTo(index) {
    cards[currentIndex].style.display = 'none';
    currentIndex = (index + cards.length) % cards.length;
    cards[currentIndex].style.display = 'flex';
    cards[currentIndex].style.flexDirection = 'column';
    cards[currentIndex].style.animation = 'fadeIn 0.4s ease';
    updateDots();
  }

  function activateCarousel() {
    if (carouselActive) return;
    carouselActive = true;
    // Hide all but first
    cards.forEach((card, i) => {
      card.style.display = i === 0 ? 'flex' : 'none';
      if (i === 0) card.style.flexDirection = 'column';
    });
    currentIndex = 0;
    buildDots();
  }

  function deactivateCarousel() {
    if (!carouselActive) return;
    carouselActive = false;
    cards.forEach(card => { card.style.display = ''; card.style.animation = ''; });
    if (dotContainer) { dotContainer.remove(); dotContainer = null; }
  }

  function checkBreakpoint() {
    if (window.innerWidth < MOBILE_BREAKPOINT) {
      activateCarousel();
    } else {
      deactivateCarousel();
    }
  }

  // Touch swipe support
  let touchStartX = 0;
  slider.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  slider.addEventListener('touchend', e => {
    if (!carouselActive) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? goTo(currentIndex + 1) : goTo(currentIndex - 1);
    }
  }, { passive: true });

  checkBreakpoint();
  window.addEventListener('resize', checkBreakpoint);
}

/* ============================================================
   3. HERO PARALLAX (Subtle)
   The hero image scrolls at a slightly reduced rate to create
   a depth effect. Only runs on non-mobile for performance.
============================================================ */

function initHeroParallax() {
  const heroFrame = document.querySelector('.hero-img-frame');
  if (!heroFrame) return;

  // Skip on mobile (performance + not visible)
  if (window.innerWidth < 768) return;

  let ticking = false;

  function updateParallax() {
    const scrollY = window.scrollY;
    const offset  = scrollY * 0.15; // 15% scroll rate
    heroFrame.style.transform = `translateY(${offset}px)`;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });
}

/* ============================================================
   4. TIMELINE STAGGER ANIMATION
   Timeline items animate in with a slight stagger based on
   their position in the list. Works with the global
   [data-animate] observer from global.js.
============================================================ */

function initTimelineStagger() {
  const timelineItems = document.querySelectorAll('.timeline__item');
  if (!timelineItems.length) return;

  timelineItems.forEach((item, i) => {
    const content = item.querySelector('.timeline__content');
    if (content) {
      content.setAttribute('data-animate', '');
      content.style.transitionDelay = `${i * 0.1}s`;
    }
  });
}

/* ============================================================
   5. MISSION CARD HOVER GLOW
   Adds a subtle gradient glow beneath each mission card on hover.
============================================================ */

function initCardGlowEffect() {
  const missionCards = document.querySelectorAll('.mission-card');

  missionCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mouse-x', `${x}%`);
      card.style.setProperty('--mouse-y', `${y}%`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.removeProperty('--mouse-x');
      card.style.removeProperty('--mouse-y');
    });
  });
}

/* ============================================================
   6. PARTNER MARQUEE – Pause on Focus (Accessibility)
   Pauses the scrolling animation when any partner tile
   receives keyboard focus, resuming when it leaves.
============================================================ */

function initPartnerAccessibility() {
  const track = document.querySelector('.partners-track');
  if (!track) return;

  track.querySelectorAll('.partner-tile').forEach(tile => {
    tile.setAttribute('tabindex', '0');

    tile.addEventListener('focus', () => {
      track.style.animationPlayState = 'paused';
    });

    tile.addEventListener('blur', () => {
      track.style.animationPlayState = 'running';
    });
  });
}

/* ============================================================
   7. SMOOTH SECTION REVEAL FOR TIMELINE (EXTRA POLISH)
   The timeline's central line grows from top to bottom
   as the user scrolls through the section.
============================================================ */

function initTimelineLineGrow() {
  const timeline = document.querySelector('.timeline');
  if (!timeline) return;

  if (!('IntersectionObserver' in window)) return;

  const pseudoLine = document.createElement('div');
  pseudoLine.style.cssText = `
    position: absolute;
    top: 0; left: 50%;
    transform: translateX(-50%);
    width: 2px;
    height: 0;
    background: linear-gradient(
      to bottom,
      var(--color-primary),
      var(--color-accent-orange) 50%,
      var(--color-secondary)
    );
    transition: height 1.4s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
    z-index: 0;
  `;

  timeline.style.position = 'relative';
  // Hide the CSS ::before pseudo-element by overriding via JS overlay
  timeline.appendChild(pseudoLine);

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        pseudoLine.style.height = '100%';
        observer.unobserve(timeline);
      }
    },
    { threshold: 0.1 }
  );

  observer.observe(timeline);
}

/* ============================================================
   8. PAGE INITIALISATION
============================================================ */

function initAboutPage() {
  initCounters();
  initTestimonialCarousel();
  initHeroParallax();
  initTimelineStagger();
  initCardGlowEffect();
  initPartnerAccessibility();
  initTimelineLineGrow();
}

/* Run when DOM is ready */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAboutPage);
} else {
  initAboutPage();
}

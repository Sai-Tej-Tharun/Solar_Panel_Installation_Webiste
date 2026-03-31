/**
 * Solar-Echos | Pricing Page JavaScript
 * Author: TechEchos Innovation
 * Version: 1.0.0
 * Description: All interactions for pricing.html:
 *   - Residential / Commercial billing toggle (price swap)
 *   - Interactive savings calculator engine
 *   - Slider ↔ input sync
 *   - Property type pills
 *   - FAQ accordion (ARIA-compliant)
 *   - Comparison table column highlight
 *   - Plan card entrance stagger
 */

/* ============================================================
   1. BILLING TOGGLE (Residential / Commercial)
   Swaps all price-amount, price-note strong, and price-emi
   strong elements that carry data-res and data-com attributes.
============================================================ */

let isCommercial = false;

/**
 * Swaps all data-res/data-com data attributes on price elements.
 * Uses a brief CSS animation for a clean number flip.
 * @param {boolean} commercial
 */
function applyPriceMode(commercial) {
  isCommercial = commercial;

  // Animate all swappable elements
  const swappables = document.querySelectorAll('[data-res][data-com]');
  swappables.forEach(el => {
    el.classList.remove('swapping');
    void el.offsetWidth; // reflow
    el.classList.add('swapping');

    el.addEventListener('animationend', () => {
      el.textContent = commercial ? el.dataset.com : el.dataset.res;
      el.classList.remove('swapping');
    }, { once: true });
  });

  // Update toggle visual state
  const toggle = document.getElementById('billing-toggle');
  if (toggle) toggle.setAttribute('aria-checked', String(commercial));

  // Update label active states
  document.querySelectorAll('.billing-label--residential').forEach(el => {
    el.classList.toggle('active', !commercial);
  });
  document.querySelectorAll('.billing-label--commercial').forEach(el => {
    el.classList.toggle('active', commercial);
  });

  // Update save badge text
  const badge = document.getElementById('billing-save-badge');
  if (badge) {
    badge.textContent = commercial ? '★ Volume Discounts Available' : '★ Best Value for Homes';
  }

  // Re-run calculator with new mode
  runCalculator();
}

function initBillingToggle() {
  const toggle = document.getElementById('billing-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    applyPriceMode(!isCommercial);
  });

  // Initial state: labels
  document.querySelectorAll('.billing-label--residential').forEach(el => el.classList.add('active'));
}

/* ============================================================
   2. SAVINGS CALCULATOR ENGINE
   Calculates system size, savings, payback, CO₂, subsidy.
   Updates all result elements in real-time.
============================================================ */

/** State from India's solar irradiance maps (peak sun hours/day) */
const STATE_SUN_HOURS = {
  rajasthan: 6.2, gujarat: 5.9, maharashtra: 5.5, karnataka: 5.4,
  tamilnadu: 5.6, andhra: 5.5, telangana: 5.4, mp: 5.6,
  up: 5.0, delhi: 5.0, kerala: 4.8, punjab: 5.2, haryana: 5.2,
  wb: 4.5, other: 5.0,
};

/** Average utility tariff by state (₹/kWh) */
const STATE_TARIFF = {
  rajasthan: 7.5, gujarat: 8.0, maharashtra: 9.5, karnataka: 7.8,
  tamilnadu: 8.2, andhra: 8.0, telangana: 8.5, mp: 7.0,
  up: 7.5, delhi: 8.0, kerala: 6.5, punjab: 7.5, haryana: 8.0,
  wb: 7.0, other: 8.0,
};

/** Property type multipliers for sizing */
const TYPE_MULTIPLIER = {
  residential: 1.0,
  commercial: 1.5,
  industrial: 2.2,
};

/** Government subsidy tiers (PM Surya Ghar, residential only) */
const SUBSIDY = {
  residential: (kw) => {
    if (kw <= 1)  return 30000;
    if (kw <= 2)  return 60000;
    if (kw <= 3)  return 78000;
    return 78000; // capped for residential
  },
  commercial: () => 0,
  industrial: () => 0,
};

/** Cost per Watt by system size bracket (₹) */
function costPerWatt(kw) {
  if (kw <= 3)  return 65;
  if (kw <= 10) return 58;
  if (kw <= 50) return 52;
  return 48;
}

/**
 * Core calculation engine.
 * @param {number} monthlyBill  – user's current monthly electricity bill (₹)
 * @param {string} state        – state key
 * @param {string} propertyType – 'residential' | 'commercial' | 'industrial'
 * @returns {object}
 */
function calculateSolar(monthlyBill, state, propertyType) {
  const tariff      = STATE_TARIFF[state] || 8.0;
  const sunHours    = STATE_SUN_HOURS[state] || 5.0;
  const multiplier  = TYPE_MULTIPLIER[propertyType] || 1.0;

  // Monthly consumption in kWh
  const monthlyKwh   = monthlyBill / tariff;

  // Required kW capacity (with 80% coverage target)
  const coverageFactor = 0.80;
  const rawKw = (monthlyKwh * coverageFactor) / (sunHours * 30 * 0.85); // 0.85 = system efficiency
  const systemKw = Math.max(1, Math.round(rawKw * multiplier * 2) / 2); // round to nearest 0.5 kW

  // System cost
  const systemCostRaw = systemKw * 1000 * costPerWatt(systemKw);

  // Subsidy (residential only)
  const subsidyAmount = SUBSIDY[propertyType] ? SUBSIDY[propertyType](systemKw) : 0;

  // Net cost
  const netCost = systemCostRaw - subsidyAmount;

  // Annual generation (kWh)
  const annualKwh = systemKw * sunHours * 365 * 0.85;

  // Annual savings (₹)
  const annualSavings = annualKwh * tariff;
  const monthlySavings = annualSavings / 12;

  // Bill after solar
  const remainingBill = Math.max(0, monthlyBill - monthlySavings);

  // Payback period (years)
  const paybackYears = netCost / annualSavings;

  // 25-year savings (assuming 5% tariff escalation per year)
  let totalSavings = 0;
  let yearlyS = annualSavings;
  for (let i = 0; i < 25; i++) {
    totalSavings += yearlyS;
    yearlyS *= 1.05;
  }

  // CO₂ saved per year (Indian grid emission factor: 0.82 kgCO₂/kWh)
  const co2PerYear = (annualKwh * 0.82) / 1000; // tonnes

  // Savings percentage of current bill
  const savingsPct = Math.min(95, Math.round((monthlySavings / monthlyBill) * 100));

  return {
    systemKw,
    systemCostRaw,
    subsidyAmount,
    netCost,
    monthlySavings,
    annualSavings,
    remainingBill,
    paybackYears,
    totalSavings,
    co2PerYear,
    savingsPct,
  };
}

/**
 * Formats a number as Indian Rupees (compact for large values).
 * @param {number} n
 * @returns {string}
 */
function formatRupee(n) {
  if (n >= 100000) {
    return '₹' + (n / 100000).toFixed(2).replace(/\.?0+$/, '') + 'L';
  }
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

/**
 * Animates a result value changing (opacity + translateY).
 * @param {HTMLElement} el
 * @param {string} newVal
 */
function animateResult(el, newVal) {
  if (!el) return;
  if (el.textContent === newVal) return;
  el.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
  el.style.opacity    = '0';
  el.style.transform  = 'translateY(-6px)';
  setTimeout(() => {
    el.textContent = newVal;
    el.style.opacity   = '1';
    el.style.transform = 'translateY(0)';
  }, 180);
}

/**
 * Reads current form state and updates all result elements.
 */
function runCalculator() {
  const billInput = document.getElementById('calc-bill');
  const stateSelect = document.getElementById('calc-state');
  if (!billInput || !stateSelect) return;

  const bill = Math.max(500, parseInt(billInput.value, 10) || 5000);
  const state = stateSelect.value || 'maharashtra';
  const activeTypePill = document.querySelector('.calc-type-pill.active');
  const propType = activeTypePill?.dataset.type || 'residential';

  const result = calculateSolar(bill, state, propType);

  // System size
  animateResult(document.getElementById('res-system-size'), `${result.systemKw} kW`);

  // Monthly savings
  animateResult(document.getElementById('res-monthly-saving'), formatRupee(result.monthlySavings));

  // Annual savings
  animateResult(document.getElementById('res-annual-saving'), formatRupee(result.annualSavings));

  // Payback
  const paybackStr = result.paybackYears < 1
    ? `${Math.round(result.paybackYears * 12)} mo`
    : `${result.paybackYears.toFixed(1)} yrs`;
  animateResult(document.getElementById('res-payback'), paybackStr);

  // 25-year savings
  animateResult(document.getElementById('res-25yr-saving'), formatRupee(result.totalSavings));

  // CO₂
  animateResult(document.getElementById('res-co2'), `${result.co2PerYear.toFixed(1)} T`);

  // Subsidy
  animateResult(
    document.getElementById('res-subsidy'),
    result.subsidyAmount > 0 ? formatRupee(result.subsidyAmount) : 'Not applicable'
  );

  // Progress bars
  const barSavings   = document.getElementById('bar-savings');
  const barRemaining = document.getElementById('bar-remaining');
  const lblSavings   = document.getElementById('bar-label-savings');
  const lblRemaining = document.getElementById('bar-label-remaining');

  if (barSavings)   barSavings.style.width = `${result.savingsPct}%`;
  if (barRemaining) barRemaining.style.width = `${100 - result.savingsPct}%`;
  if (lblSavings)   lblSavings.textContent  = `${formatRupee(result.monthlySavings)} saved`;
  if (lblRemaining) lblRemaining.textContent = `${formatRupee(result.remainingBill)} remaining`;
}

function initCalculator() {
  const billInput    = document.getElementById('calc-bill');
  const billSlider   = document.getElementById('calc-bill-slider');
  const stateSelect  = document.getElementById('calc-state');
  const typePills    = document.querySelectorAll('.calc-type-pill');

  if (!billInput || !billSlider) return;

  // Sync slider ↔ number input
  billSlider.addEventListener('input', () => {
    billInput.value = billSlider.value;
    runCalculator();
  });

  billInput.addEventListener('input', () => {
    const v = parseInt(billInput.value, 10);
    if (!isNaN(v)) {
      billSlider.value = Math.min(50000, Math.max(500, v));
    }
    runCalculator();
  });

  stateSelect?.addEventListener('change', runCalculator);

  typePills.forEach(pill => {
    pill.addEventListener('click', () => {
      typePills.forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-pressed', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-pressed', 'true');
      runCalculator();
    });
  });

  // Initial run
  runCalculator();
}

/* ============================================================
   3. FAQ ACCORDION
   ARIA-compliant: manages aria-expanded + hidden attribute.
   Only one item open at a time.
============================================================ */

function initAccordion() {
  const accordion = document.getElementById('pricing-faq');
  if (!accordion) return;

  const triggers = accordion.querySelectorAll('.accordion-trigger');

  triggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      const bodyId = trigger.getAttribute('aria-controls');
      const body   = document.getElementById(bodyId);

      // Close all
      triggers.forEach(t => {
        t.setAttribute('aria-expanded', 'false');
        const bId = t.getAttribute('aria-controls');
        const b   = document.getElementById(bId);
        if (b) b.hidden = true;
      });

      // Open clicked (unless it was already open)
      if (!isOpen && body) {
        trigger.setAttribute('aria-expanded', 'true');
        body.hidden = false;

        // Smooth scroll into view if partially off-screen
        const rect = trigger.getBoundingClientRect();
        if (rect.top < 80) {
          const navbarH = parseInt(
            getComputedStyle(document.documentElement).getPropertyValue('--navbar-height') || '80', 10
          );
          window.scrollTo({ top: window.scrollY + rect.top - navbarH - 16, behavior: 'smooth' });
        }
      }
    });

    // Keyboard: Space and Enter toggle; Escape closes
    trigger.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        trigger.setAttribute('aria-expanded', 'false');
        const bId = trigger.getAttribute('aria-controls');
        const b   = document.getElementById(bId);
        if (b) b.hidden = true;
      }
    });
  });
}

/* ============================================================
   4. COMPARISON TABLE — Column hover highlight
   Syncs the highlight class on all td-popular cells so the
   whole column lights up on hover.
============================================================ */

function initTableHover() {
  const table = document.querySelector('.comparison-table');
  if (!table) return;

  const popularCells = table.querySelectorAll('.td-popular');
  popularCells.forEach(cell => {
    cell.addEventListener('mouseenter', () => {
      popularCells.forEach(c => c.style.background = 'rgba(4,80,151,0.08)');
    });
    cell.addEventListener('mouseleave', () => {
      popularCells.forEach(c => c.style.background = '');
    });
  });
}

/* ============================================================
   5. PLAN CARD TILT EFFECT (Subtle 3D on mouse move)
   Applies a gentle perspective tilt to plan cards on hover.
   Skipped on touch devices.
============================================================ */

function initPlanCardTilt() {
  if (window.matchMedia('(hover: none)').matches) return;

  document.querySelectorAll('.plan-card').forEach(card => {
    card.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease';

    card.addEventListener('mousemove', e => {
      const rect   = card.getBoundingClientRect();
      const cx     = rect.left + rect.width  / 2;
      const cy     = rect.top  + rect.height / 2;
      const dx     = (e.clientX - cx) / (rect.width  / 2);
      const dy     = (e.clientY - cy) / (rect.height / 2);
      const rotX   = -dy * 4;
      const rotY   =  dx * 4;
      const isPopular = card.classList.contains('plan-card--popular');
      const baseY  = isPopular ? -8 : -6;

      card.style.transform = `
        perspective(800px)
        rotateX(${rotX}deg)
        rotateY(${rotY}deg)
        translateY(${baseY}px)
      `;
    });

    card.addEventListener('mouseleave', () => {
      const isPopular = card.classList.contains('plan-card--popular');
      card.style.transform = isPopular ? 'translateY(-8px)' : '';
    });
  });
}

/* ============================================================
   6. STICKY CALCULATOR CTA VISIBILITY
   After the user scrolls past the plans section, show a
   toast nudge once prompting them to use the calculator.
============================================================ */

function initCalcNudge() {
  const calcSection = document.querySelector('.calculator-section');
  if (!calcSection) return;

  let nudgeFired = false;

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !nudgeFired) {
      nudgeFired = true;
      setTimeout(() => {
        if (window.SolarEchos?.showToast) {
          window.SolarEchos.showToast('Calculate your exact savings below ↓', 'info', 4000);
        }
      }, 600);
      observer.disconnect();
    }
  }, { threshold: 0.2 });

  observer.observe(calcSection);
}

/* ============================================================
   7. PLAN CARD FEATURE LIST STAGGER
   Staggers the entrance of each feature item within a card
   when the card enters the viewport.
============================================================ */

function initFeatureStagger() {
  if (!('IntersectionObserver' in window)) return;

  document.querySelectorAll('.plan-card').forEach(card => {
    const items = card.querySelectorAll('.feature-item');

    items.forEach((item, i) => {
      item.style.opacity   = '0';
      item.style.transform = 'translateX(-10px)';
      item.style.transition = `opacity 0.35s ease ${i * 0.05}s, transform 0.35s ease ${i * 0.05}s`;
    });

    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        items.forEach(item => {
          item.style.opacity   = '1';
          item.style.transform = 'translateX(0)';
        });
        obs.unobserve(card);
      }
    }, { threshold: 0.2 });

    obs.observe(card);
  });
}

/* ============================================================
   8. PAGE INITIALISATION
============================================================ */

function initPricingPage() {
  initBillingToggle();
  initCalculator();
  initAccordion();
  initTableHover();
  initPlanCardTilt();
  initCalcNudge();
  initFeatureStagger();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPricingPage);
} else {
  initPricingPage();
}

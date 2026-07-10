const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Scroll reveal ── */
const revealEls = document.querySelectorAll('[data-reveal]');

revealEls.forEach(el => {
  const delay = el.dataset.delay;
  if (delay) el.style.transitionDelay = `${delay}ms`;
});

const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);

revealEls.forEach(el => revealObserver.observe(el));

/* ── Mobile menu ── */
const menuToggle = document.querySelector('[data-menu-toggle]');
const mobileMenu = document.querySelector('[data-mobile-menu]');
const mobileLinks = document.querySelectorAll('[data-mobile-link]');

function closeMenu() {
  if (!menuToggle || !mobileMenu) return;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open menu');
  mobileMenu.classList.remove('is-open');
  document.body.classList.remove('menu-open');
}

function openMenu() {
  if (!menuToggle || !mobileMenu) return;
  menuToggle.setAttribute('aria-expanded', 'true');
  menuToggle.setAttribute('aria-label', 'Close menu');
  mobileMenu.classList.add('is-open');
  document.body.classList.add('menu-open');
  const firstLink = mobileMenu.querySelector('a');
  if (firstLink) firstLink.focus();
}

if (menuToggle && mobileMenu) {
  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    if (isOpen) closeMenu(); else openMenu();
  });

  mobileLinks.forEach(link => link.addEventListener('click', closeMenu));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menuToggle.focus();
    }
  });

  window.matchMedia('(min-width: 860px)').addEventListener('change', e => {
    if (e.matches) closeMenu();
  });
}

/* ── Scrollspy: highlight active nav link ── */
const navLinks = document.querySelectorAll('[data-nav-link]');
const spySections = document.querySelectorAll('main section[id]');

if (navLinks.length && spySections.length) {
  const sectionObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        const matches = document.querySelectorAll(`[data-nav-link][href="#${id}"]`);
        if (!matches.length) return;
        navLinks.forEach(link => link.classList.remove('is-active'));
        matches.forEach(link => link.classList.add('is-active'));
      });
    },
    { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
  );

  spySections.forEach(section => sectionObserver.observe(section));
}

/* ── How it works: highlight plan card by active step ── */
const planCard = document.querySelector('.plan-card');
const howSteps = document.querySelectorAll('.how__step[data-step-index]');

if (planCard && howSteps.length) {
  const stepObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          planCard.dataset.activeStep = entry.target.dataset.stepIndex;
        }
      });
    },
    { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
  );

  howSteps.forEach(step => stepObserver.observe(step));
}

/* ── Timeline prev/next scroll ── */
const timelineViewport = document.querySelector('[data-timeline-viewport]');
const timelinePrev = document.querySelector('[data-timeline-prev]');
const timelineNext = document.querySelector('[data-timeline-next]');

if (timelineViewport && timelinePrev && timelineNext) {
  const scrollAmount = () => Math.min(timelineViewport.clientWidth * 0.8, 340);
  const behavior = prefersReducedMotion ? 'auto' : 'smooth';

  timelinePrev.addEventListener('click', () => {
    timelineViewport.scrollBy({ left: -scrollAmount(), behavior });
  });
  timelineNext.addEventListener('click', () => {
    timelineViewport.scrollBy({ left: scrollAmount(), behavior });
  });
}

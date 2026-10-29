/**
 * PROJECT MONDAY — SMOOTH SCROLL & NAVIGATION CONTROLLER
 * Ensures fluid kinetic momentum while strictly honoring accessibility preferences.
 */

export class SmoothScrollController {
  constructor() {
    this.initAnchorLinks();
  }

  initAnchorLinks() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a[href^="#"]');
      if (!target) return;

      const hash = target.getAttribute('href');
      if (!hash || hash === '#') return;

      const destination = document.querySelector(hash);
      if (destination) {
        e.preventDefault();
        destination.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          block: 'start'
        });
      }
    });
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    new SmoothScrollController();
  });
}


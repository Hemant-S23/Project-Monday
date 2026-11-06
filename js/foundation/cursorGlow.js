/**
 * PROJECT MONDAY — INTERACTIVE CURSOR GLOW ENGINE
 * Computes high-performance specular radial highlights on glass surfaces.
 * Uses event delegation and zero-reflow requestAnimationFrame throttling for seamless 60fps rendering.
 */

export class CursorGlowEngine {
  constructor() {
    this.activeCard = null;
    this.mousePosition = { x: 0, y: 0 };
    this.isTicking = false;
    this.init();
  }

  init() {
    window.addEventListener('mousemove', (e) => this.onMouseMove(e), { passive: true });
  }

  onMouseMove(e) {
    const card = e.target && e.target.closest ? e.target.closest('.glass-card, .glass-hero-card') : null;
    if (!card) {
      this.activeCard = null;
      return;
    }

    this.mousePosition.x = e.clientX;
    this.mousePosition.y = e.clientY;
    this.activeCard = card;

    if (!this.isTicking) {
      window.requestAnimationFrame(() => {
        if (this.activeCard) {
          const rect = this.activeCard.getBoundingClientRect();
          const x = this.mousePosition.x - rect.left;
          const y = this.mousePosition.y - rect.top;
          this.activeCard.style.setProperty('--mouse-x', `${x}px`);
          this.activeCard.style.setProperty('--mouse-y', `${y}px`);
        }
        this.isTicking = false;
      });
      this.isTicking = true;
    }
  }
}

// Auto-instantiate if running in browser
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.cursorGlowEngine = new CursorGlowEngine();
  });
}


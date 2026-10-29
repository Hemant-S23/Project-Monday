/**
 * PROJECT MONDAY — INTERACTIVE CURSOR GLOW ENGINE
 * Computes high-performance specular radial highlights on glass surfaces.
 * Uses requestAnimationFrame throttling for seamless 60fps rendering.
 */

export class CursorGlowEngine {
  constructor() {
    this.cards = [];
    this.mousePosition = { x: 0, y: 0 };
    this.isTicking = false;
    this.init();
  }

  init() {
    this.refreshCards();
    window.addEventListener('mousemove', (e) => this.onMouseMove(e), { passive: true });
    window.addEventListener('resize', () => this.refreshCards(), { passive: true });
  }

  refreshCards() {
    this.cards = Array.from(document.querySelectorAll('.glass-card, .glass-hero-card'));
  }

  onMouseMove(e) {
    this.mousePosition.x = e.clientX;
    this.mousePosition.y = e.clientY;

    if (!this.isTicking) {
      window.requestAnimationFrame(() => {
        this.updateCardGlows();
        this.isTicking = false;
      });
      this.isTicking = true;
    }
  }

  updateCardGlows() {
    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i];
      const rect = card.getBoundingClientRect();

      // Only update if cursor is within 400px of the card boundary
      const isNear = (
        this.mousePosition.x >= rect.left - 200 &&
        this.mousePosition.x <= rect.right + 200 &&
        this.mousePosition.y >= rect.top - 200 &&
        this.mousePosition.y <= rect.bottom + 200
      );

      if (isNear) {
        const x = this.mousePosition.x - rect.left;
        const y = this.mousePosition.y - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      }
    }
  }
}

// Auto-instantiate if running in browser
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.cursorGlowEngine = new CursorGlowEngine();
  });
}


/**
 * PROJECT MONDAY — OVERLAYS & DIALOG CONTROLLER
 * Manages Modals, Drawers, Toasts, Tooltips and Command Palette
 */

import { sfx } from './sfx.js';

export class OverlaysController {
  constructor() {
    this.toastContainer = null;
    this.initCommandPaletteListener();
    this.initEscapeListener();
  }

  initEscapeListener() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
        this.closeAllDrawers();
      }
    });
  }

  // --- MODAL ENGINE ---
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      sfx.playClick();
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
  }

  // --- DRAWER ENGINE ---
  openDrawer(drawerId) {
    const drawer = document.getElementById(drawerId);
    if (drawer) {
      drawer.classList.add('open');
      sfx.playClick();
    }
  }

  closeDrawer(drawerId) {
    const drawer = document.getElementById(drawerId);
    if (drawer) {
      drawer.classList.remove('open');
    }
  }

  closeAllDrawers() {
    document.querySelectorAll('.drawer-backdrop.open').forEach(d => d.classList.remove('open'));
  }

  // --- TOAST STACK ---
  showToast({ title, message, type = 'info', duration = 3000 }) {
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.className = 'toast-stack-container';
      this.toastContainer.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 2000;
        pointer-events: none;
      `;
      document.body.appendChild(this.toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `glass-card glass-${type}-border`;
    toast.style.cssText = `
      padding: 12px 18px;
      min-width: 280px;
      max-width: 360px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
      pointer-events: auto;
      transform: translateY(20px);
      opacity: 0;
      transition: all 250ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;

    let iconHtml = '<i class="ph-bold ph-info" style="color: var(--cyan); font-size: 1.25rem;"></i>';
    if (type === 'profit') {
      iconHtml = '<i class="ph-bold ph-check-circle" style="color: var(--profit); font-size: 1.25rem;"></i>';
      sfx.playOrderExecuted();
    } else if (type === 'risk') {
      iconHtml = '<i class="ph-bold ph-warning-circle" style="color: var(--risk); font-size: 1.25rem;"></i>';
    } else if (type === 'shield') {
      iconHtml = '<i class="ph-bold ph-shield-warning" style="color: var(--shield); font-size: 1.25rem;"></i>';
      sfx.playShieldAlert();
    }

    toast.innerHTML = `
      ${iconHtml}
      <div style="flex: 1;">
        ${title ? `<div style="font-weight: 600; font-size: 0.85rem; color: var(--text-hi);">${title}</div>` : ''}
        <div style="font-size: 0.8rem; color: var(--text-mid);">${message}</div>
      </div>
    `;

    this.toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });

    setTimeout(() => {
      toast.style.transform = 'translateY(15px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  // --- COMMAND PALETTE (Ctrl+K) ---
  initCommandPaletteListener() {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const cmdPalette = document.getElementById('cmd_palette_modal');
        if (cmdPalette) {
          if (cmdPalette.classList.contains('open')) {
            this.closeModal('cmd_palette_modal');
          } else {
            this.openModal('cmd_palette_modal');
            const input = cmdPalette.querySelector('.cmd-palette-input');
            if (input) setTimeout(() => input.focus(), 80);
          }
        }
      }
    });
  }
}

export const overlays = new OverlaysController();


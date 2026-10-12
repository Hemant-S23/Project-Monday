/**
 * Notification & Activity Center Manager
 * Handles trade alerts (TP, SL, Orders, AI signals), persistent storage in localStorage,
 * unread badges, timestamp formatting (Today, Yesterday, Date), and popover UI.
 */
export class NotificationManager {
  constructor() {
    this.storageKey = 'monday_notifications_v1';
    this.notifications = this.loadNotifications();
    this.wrapperEl = null;
    this.btnEl = null;
    this.badgeEl = null;
    this.countEl = null;
    this.listEl = null;
    this.markReadBtn = null;
    this.clearBtn = null;
  }

  loadNotifications() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to parse notifications:', e);
    }

    // Default starter notifications matching trading terminal history
    return [
      {
        id: 'notif_init_1',
        type: 'target',
        title: 'Target Hit • BTC/USD Long',
        message: '+$53.90 (+2.69R) profit realized at $65,600',
        timestamp: Date.now() - 3600000 * 5,
        read: true
      },
      {
        id: 'notif_init_2',
        type: 'target',
        title: 'Target Hit • SOL/USD Long',
        message: '+$50.22 (+2.51R) profit realized at $157.50',
        timestamp: Date.now() - 3600000 * 18,
        read: true
      },
      {
        id: 'notif_init_3',
        type: 'stop',
        title: 'Stop Loss Hit • BTC/USD Short',
        message: '-$20.00 (-1.00R) risk protected at $66,700',
        timestamp: Date.now() - 86400000,
        read: true
      }
    ];
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.notifications.slice(0, 60)));
    } catch (e) {
      console.warn('Failed to save notifications:', e);
    }
  }

  initDOM() {
    this.wrapperEl = document.getElementById('notif_popover_wrapper');
    this.btnEl = document.getElementById('notif_bell_btn');
    this.badgeEl = document.getElementById('notif_unread_badge');
    this.countEl = document.getElementById('notif_header_count');
    this.listEl = document.getElementById('notif_list');
    this.markReadBtn = document.getElementById('notif_mark_read_btn');
    this.clearBtn = document.getElementById('notif_clear_btn');

    if (this.btnEl && this.wrapperEl) {
      this.btnEl.addEventListener('click', (e) => {
        e.stopPropagation();

        // Close profile popover if open
        const profilePopover = document.getElementById('profile_popover_wrapper');
        if (profilePopover) {
          profilePopover.classList.remove('open');
          const pBtn = document.getElementById('profile_avatar_btn');
          if (pBtn) pBtn.setAttribute('aria-expanded', 'false');
        }

        const isOpen = this.wrapperEl.classList.toggle('open');
        this.btnEl.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      document.addEventListener('click', (e) => {
        if (this.wrapperEl && !this.wrapperEl.contains(e.target)) {
          this.wrapperEl.classList.remove('open');
          this.btnEl.setAttribute('aria-expanded', 'false');
        }
      });
    }

    if (this.markReadBtn) {
      this.markReadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.markAllAsRead();
      });
    }

    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearAll();
      });
    }

    this.render();
  }

  addNotification({ type = 'info', title, message, tradeId = null }) {
    const item = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type,
      title,
      message,
      tradeId,
      timestamp: Date.now(),
      read: false
    };

    this.notifications.unshift(item);
    if (this.notifications.length > 60) {
      this.notifications.pop();
    }
    this.save();
    this.render();

    // Trigger native browser notification if permitted and tab is in background
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      try {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico'
        });
      } catch (e) {}
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => { n.read = true; });
    this.save();
    this.render();
  }

  clearAll() {
    this.notifications = [];
    this.save();
    this.render();
  }

  formatTime(ts) {
    if (!ts) return 'Just now';
    const d = new Date(ts);
    const now = new Date();

    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) {
      return `Today, ${timeStr}`;
    } else if (isYesterday) {
      return `Yesterday, ${timeStr}`;
    } else {
      const datePart = d.toLocaleDateString([], { day: 'numeric', month: 'short' });
      return `${datePart}, ${timeStr}`;
    }
  }

  render() {
    if (!this.listEl) return;

    const unreadCount = this.notifications.filter(n => !n.read).length;

    // 1. Unread badge on bell
    if (this.badgeEl) {
      if (unreadCount > 0) {
        this.badgeEl.style.display = 'flex';
        this.badgeEl.textContent = unreadCount > 9 ? '9+' : unreadCount;
      } else {
        this.badgeEl.style.display = 'none';
      }
    }

    // 2. Count pill in header
    if (this.countEl) {
      this.countEl.textContent = unreadCount > 0 ? `${unreadCount} unread` : `${this.notifications.length} alerts`;
      this.countEl.className = `notif-count-pill ${unreadCount > 0 ? 'active' : ''}`;
    }

    // 3. Render items list
    if (this.notifications.length === 0) {
      this.listEl.innerHTML = `
        <div class="notif-empty-state">
          <div class="notif-empty-icon"><i class="ph ph-bell-simple-slash"></i></div>
          <div class="notif-empty-title">All Caught Up</div>
          <div class="notif-empty-desc">No trade or setup notifications yet.</div>
        </div>
      `;
      return;
    }

    this.listEl.innerHTML = this.notifications.map(item => {
      let icon = 'ph-info';
      let iconClass = 'info';

      if (item.type === 'target') {
        icon = 'ph-crosshair';
        iconClass = 'target';
      } else if (item.type === 'stop') {
        icon = 'ph-shield-warning';
        iconClass = 'stop';
      } else if (item.type === 'order') {
        icon = 'ph-lightning';
        iconClass = 'order';
      } else if (item.type === 'ai') {
        icon = 'ph-sparkle';
        iconClass = 'ai';
      }

      const formattedTime = this.formatTime(item.timestamp);

      return `
        <div class="notif-item ${item.read ? 'read' : 'unread'}" data-id="${item.id}">
          <div class="notif-icon-box ${iconClass}">
            <i class="ph-bold ${icon}"></i>
          </div>
          <div class="notif-body">
            <div class="notif-title-row">
              <span class="notif-title">${item.title}</span>
              ${!item.read ? '<span class="notif-dot"></span>' : ''}
            </div>
            <div class="notif-msg">${item.message}</div>
            <div class="notif-time">${formattedTime}</div>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listener on each notification to mark as read
    this.listEl.querySelectorAll('.notif-item.unread').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        const target = this.notifications.find(n => n.id === id);
        if (target) {
          target.read = true;
          this.save();
          this.render();
        }
      });
    });
  }
}

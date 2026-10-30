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

    // Attach to window so inline onclick and external triggers never fail
    window.notificationManager = this;
    window.mondayNotifications = this;
    window.markAllNotificationsRead = (e) => this.markAllAsRead(e);
    window.clearAllNotifications = (e) => this.clearAll(e);
  }

  loadNotifications() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        // Automatically purge any legacy mock notifications with obsolete placeholder prices
        const cleaned = parsed.filter(item => !item.id?.startsWith('notif_init_'));
        if (cleaned.length > 0) return cleaned;
      }
    } catch (e) {
      console.warn('Failed to parse notifications:', e);
    }

    return [
      {
        id: 'notif_welcome',
        type: 'ai',
        title: 'Monday AI Copilot Active',
        message: 'Live tracking active on Coinbase pure USD feeds • Zero delay',
        timestamp: Date.now(),
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
    this.menuEl = document.getElementById('notif_popover_menu');
    this.badgeEl = document.getElementById('notif_unread_badge');
    this.countEl = document.getElementById('notif_header_count');
    this.listEl = document.getElementById('notif_list');
    this.markReadBtn = document.getElementById('notif_mark_read_btn');
    this.clearBtn = document.getElementById('notif_clear_btn');

    // Attach to window so inline onclick and external triggers never fail
    window.notificationManager = this;
    window.mondayNotifications = this;
    window.markAllNotificationsRead = (e) => this.markAllAsRead(e);
    window.clearAllNotifications = (e) => this.clearAll(e);

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
        if (this.menuEl) {
          this.menuEl.classList.toggle('active', isOpen);
        }
      });

      document.addEventListener('click', (e) => {
        if (this.wrapperEl && !this.wrapperEl.contains(e.target)) {
          this.wrapperEl.classList.remove('open');
          this.btnEl.setAttribute('aria-expanded', 'false');
          if (this.menuEl) {
            this.menuEl.classList.remove('active');
          }
        }
      });
    }

    if (this.markReadBtn) {
      this.markReadBtn.addEventListener('click', (e) => this.markAllAsRead(e));
    }

    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', (e) => this.clearAll(e));
    }

    // Bulletproof Event Delegation Fallback
    document.addEventListener('click', (e) => {
      const markBtn = e.target.closest('#notif_mark_read_btn');
      if (markBtn) {
        this.markAllAsRead(e);
        return;
      }
      const clearBtn = e.target.closest('#notif_clear_btn');
      if (clearBtn) {
        this.clearAll(e);
        return;
      }
    });

    this.render();
  }

  addNotification({ type = 'info', title, message, tradeId = null }) {
    // Deduplication guard: ignore duplicate identical alert if received within last 45 seconds
    const isDuplicate = this.notifications.some(
      n => n.title === title && n.message === message && (Date.now() - n.timestamp < 45000)
    );
    if (isDuplicate) return;

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

  markAllAsRead(e) {
    if (e) {
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      if (typeof e.preventDefault === 'function') e.preventDefault();
    }
    this.notifications.forEach(n => { n.read = true; });
    this.save();
    this.render();
  }

  clearAll(e) {
    if (e) {
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      if (typeof e.preventDefault === 'function') e.preventDefault();
    }
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

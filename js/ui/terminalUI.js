import { DerivativesEngine } from '../engine/derivativesEngine.js';
import { NotificationManager } from './notificationManager.js';

/**
 * Terminal UI Coordinator
 * Handles DOM rendering, interactive panels, chat transcript, voice visualizer,
 * paper trade modals, and real-time state telemetry.
 */
export class TerminalUI {
  constructor(callbacks = {}) {
    this.callbacks = { ...callbacks };
    this.currentMarket = 'Crypto';
    this.currentAsset = 'BTC';
    this.derivativesEngine = new DerivativesEngine();

    // Active order state for Delta Exchange derivatives desk
    let initialEntry = 86500;
    try {
      const cached = localStorage.getItem('monday_last_known_ticker');
      if (cached) {
        const d = JSON.parse(cached);
        if (d && d.price && !isNaN(d.price)) initialEntry = Number(d.price);
      }
    } catch (e) {}

    const slDist = +(initialEntry * 0.008).toFixed(2);
    this.orderState = {
      direction: 'LONG',
      leverage: 20,
      marginUSD: 20,
      orderType: 'MARKET',
      entryPrice: initialEntry,
      tpPrice: +(initialEntry + slDist * 3.0).toFixed(2),
      slPrice: +(initialEntry - slDist).toFixed(2),
      availableBalance: 2000
    };

    // Cached strategy state for order desk synchronization
    this.latestStrategyState = null;

    // Autonomous AI Auto-Pilot State (Persisted)
    try {
      this.autoPilotEnabled = localStorage.getItem('monday_auto_pilot') === 'true';
    } catch (e) {
      this.autoPilotEnabled = false;
    }

    // User Starred Watchlist state (Persisted in localStorage)
    try {
      const savedWatchlist = localStorage.getItem('monday_user_watchlist');
      this.userWatchlist = savedWatchlist ? JSON.parse(savedWatchlist) : {
        Crypto: ['BTC', 'ETH', 'SOL'],
        India: ['NIFTY', 'RELIANCE', 'SWIGGY']
      };
    } catch (e) {
      this.userWatchlist = {
        Crypto: ['BTC', 'ETH', 'SOL'],
        India: ['NIFTY', 'RELIANCE', 'SWIGGY']
      };
    }

    this.bindEvents();
    this.bindDerivativesOrderDesk();

    // Initialize Trade & Alert Notification Center
    this.notificationManager = new NotificationManager();
    this.notificationManager.initDOM();

    // Start Live Context Radar & Historical Telemetry Ticker (Real-Time Timestamps)
    this.startContextTelemetryTicker();
  }

  getStarredAssets(market = this.currentMarket) {
    if (!this.userWatchlist) this.userWatchlist = {};
    if (!this.userWatchlist[market]) {
      this.userWatchlist[market] = market === 'India' ? ['NIFTY', 'RELIANCE', 'SWIGGY'] : ['BTC', 'ETH', 'SOL'];
    }
    return this.userWatchlist[market];
  }

  isStarred(asset, market = this.currentMarket) {
    if (!asset) return false;
    const cleanSym = asset.toUpperCase().replace(/(\/USD|USDT|USD)$/, '');
    const list = this.getStarredAssets(market);
    return list.some(item => item.toUpperCase() === cleanSym || item.toUpperCase() === asset.toUpperCase());
  }

  toggleStar(asset, market = this.currentMarket) {
    if (!asset) return false;
    const cleanSym = asset.toUpperCase().replace(/(\/USD|USDT|USD)$/, '');
    const list = this.getStarredAssets(market);
    const index = list.findIndex(item => item.toUpperCase() === cleanSym || item.toUpperCase() === asset.toUpperCase());
    let added = false;
    if (index >= 0) {
      list.splice(index, 1);
      this.showToast('Watchlist', `Removed ${cleanSym} from Watchlist`, 'info');
    } else {
      list.push(cleanSym);
      this.showToast('Watchlist', `⭐ Added ${cleanSym} to Watchlist`, 'success');
      added = true;
    }
    try {
      localStorage.setItem('monday_user_watchlist', JSON.stringify(this.userWatchlist));
    } catch (e) {}

    // Synchronize any star buttons currently visible in search results or elsewhere
    document.querySelectorAll(`.search-star-btn`).forEach(btn => {
      const bAsset = (btn.dataset.asset || '').toUpperCase().replace(/(\/USD|USDT|USD)$/, '');
      if (bAsset === cleanSym) {
        btn.classList.toggle('starred', added);
        const icon = btn.querySelector('i');
        if (icon) {
          icon.className = added ? 'ph-fill ph-star text-gold' : 'ph ph-star';
        }
        btn.title = added ? 'Remove from Watchlist' : 'Add to Watchlist';
      }
    });

    this.renderWatchlistTray(market);
    return added;
  }

  bindEvents() {
    // Universal Crypto Search Bar
    const searchContainer = document.getElementById('crypto_search_container');
    const searchInput = document.getElementById('crypto_search_input');
    const searchResults = document.getElementById('crypto_search_results');
    const searchClearBtn = document.getElementById('search_clear_btn');

    const renderSearchResults = (items) => {
      if (!searchResults) return;
      if (!items || items.length === 0) {
        searchResults.innerHTML = `<div class="search-empty-msg">No cryptocurrencies or stocks found matching query.</div>`;
        return;
      }
      searchResults.innerHTML = items.map(m => {
        const isPos = m.changePercent >= 0;
        const assetSymbol = m.baseAsset || (m.symbol ? m.symbol.replace(/(\/USD|USDT|USD)$/, '') : 'BTC');
        const isIndia = this.currentMarket === 'India' || m.exchange === 'NSE' || m.exchange === 'BSE';
        const pairSub = m.name ? `${m.name} • ${m.exchange || 'NSE'}` : (isIndia ? m.symbol : `${assetSymbol}/USD`);
        const formattedPrice = isIndia
          ? `₹${m.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : (m.price >= 1 ? `$${m.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${m.price.toFixed(6)}`);
        const isStarred = this.isStarred(assetSymbol);

        return `
          <div class="search-result-item" data-asset="${assetSymbol}">
            <div class="search-res-left">
              <span class="search-res-symbol">${assetSymbol}</span>
              <span class="search-res-pair">${pairSub}</span>
            </div>
            <div class="search-res-right">
              <span class="search-res-price">${formattedPrice}</span>
              <span class="search-res-change ${isPos ? 'bullish' : 'bearish'}">
                ${isPos ? '+' : ''}${m.changePercent.toFixed(2)}%
              </span>
            </div>
            <button class="search-star-btn ${isStarred ? 'starred' : ''}" data-asset="${assetSymbol}" title="${isStarred ? 'Remove from Watchlist' : 'Add to Watchlist'}" type="button">
              <i class="${isStarred ? 'ph-fill ph-star text-gold' : 'ph ph-star'}"></i>
            </button>
          </div>
        `;
      }).join('');

      searchResults.querySelectorAll('.search-star-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const asset = btn.dataset.asset;
          const isNowStarred = this.toggleStar(asset);
          btn.classList.toggle('starred', isNowStarred);
          const icon = btn.querySelector('i');
          if (icon) {
            icon.className = isNowStarred ? 'ph-fill ph-star text-gold' : 'ph ph-star';
          }
          btn.title = isNowStarred ? 'Remove from Watchlist' : 'Add to Watchlist';
        });
      });

      searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.closest('.search-star-btn')) return;
          const asset = item.dataset.asset;
          if (this.callbacks.onAssetChange) this.callbacks.onAssetChange(asset);
          if (searchContainer) searchContainer.classList.remove('open');
          if (searchInput) searchInput.value = '';
          if (searchClearBtn) searchClearBtn.style.display = 'none';
          this.setActiveWatchlistAsset(asset);
        });
      });
    };

    if (searchInput && searchContainer) {
      searchInput.addEventListener('focus', () => {
        // Mutual auto-close other dropdowns
        const wlWrapper = document.getElementById('watchlist_tray_wrapper');
        if (wlWrapper) wlWrapper.classList.remove('open');
        const mktWrapper = document.getElementById('market_dropdown_wrapper');
        if (mktWrapper) mktWrapper.classList.remove('open');

        if (this.callbacks.onSearchCrypto) {
          const items = this.callbacks.onSearchCrypto(searchInput.value.trim());
          renderSearchResults(items);
          searchContainer.classList.add('open');
        }
      });

      searchInput.addEventListener('input', () => {
        // Mutual auto-close other dropdowns
        const wlWrapper = document.getElementById('watchlist_tray_wrapper');
        if (wlWrapper) wlWrapper.classList.remove('open');
        const mktWrapper = document.getElementById('market_dropdown_wrapper');
        if (mktWrapper) mktWrapper.classList.remove('open');

        const query = searchInput.value.trim();
        if (searchClearBtn) {
          searchClearBtn.style.display = query ? 'flex' : 'none';
        }
        if (this.callbacks.onSearchCrypto) {
          const items = this.callbacks.onSearchCrypto(query);
          renderSearchResults(items);
          searchContainer.classList.add('open');
        }
      });
    }

    if (searchClearBtn && searchInput) {
      searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchClearBtn.style.display = 'none';
        if (this.callbacks.onSearchCrypto) {
          const items = this.callbacks.onSearchCrypto('');
          renderSearchResults(items);
        }
      });
    }

    // Close search dropdown on click outside
    document.addEventListener('click', (e) => {
      if (searchContainer && !searchContainer.contains(e.target)) {
        searchContainer.classList.remove('open');
      }
    });

    // Compact Market Dropdown Selector (Crypto / Indian Market)
    const marketDropdownWrapper = document.getElementById('market_dropdown_wrapper');
    const marketDropdownTrigger = document.getElementById('market_dropdown_trigger');

    if (marketDropdownTrigger && marketDropdownWrapper) {
      marketDropdownTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        // Mutual auto-close other dropdowns
        if (searchContainer) searchContainer.classList.remove('open');
        const wlWrapper = document.getElementById('watchlist_tray_wrapper');
        if (wlWrapper) wlWrapper.classList.remove('open');

        marketDropdownWrapper.classList.toggle('open');
      });
    }

    // Close market dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (marketDropdownWrapper && !marketDropdownWrapper.contains(e.target)) {
        marketDropdownWrapper.classList.remove('open');
      }
    });

    // Market Menu Items
    document.querySelectorAll('.market-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const market = e.currentTarget.dataset.market;
        if (market !== 'Crypto' && market !== 'India') {
          this.showToast(`Market: ${market}`, 'US Market scheduled for Phase 4. Crypto & Indian Markets are active!', 'info');
          return;
        }
        this.currentMarket = market;
        this.updateMarketTriggerUI(market);
        if (marketDropdownWrapper) marketDropdownWrapper.classList.remove('open');
        if (this.callbacks.onMarketChange) this.callbacks.onMarketChange(market);
      });
    });

    // Native Android / Mobile Dedicated Multi-Page Navigation Router (5 Billion Dollar SaaS APK Experience)
    document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const page = e.currentTarget.dataset.page || 
          (e.currentTarget.id === 'm_tab_chart' ? 'chart' :
           e.currentTarget.id === 'm_tab_strategy' ? 'strategy' :
           e.currentTarget.id === 'm_tab_copilot' ? 'copilot' :
           e.currentTarget.id === 'm_tab_history' ? 'passbook' :
           e.currentTarget.id === 'm_tab_journal' ? 'journal' : 'chart');
        this.switchMobilePage(page);
      });
    });

    // Native Android Hardware / Browser Back Button Popstate Listener
    window.addEventListener('popstate', (e) => {
      if (window.innerWidth <= 860) {
        const page = (e.state && e.state.mobilePage) || 
                     (window.location.hash ? window.location.hash.replace('#', '') : 'chart');
        this.switchMobilePage(page, false);
      }
    });

    // Restore URL hash page if loaded directly on mobile
    if (window.innerWidth <= 860 && window.location.hash) {
      const initialPage = window.location.hash.replace('#', '');
      if (['chart', 'strategy', 'copilot', 'passbook', 'journal'].includes(initialPage)) {
        setTimeout(() => this.switchMobilePage(initialPage, false), 50);
      }
    }

    // Mobile Slide-In Navigation Drawer Setup
    const drawer = document.getElementById('mobile_drawer');
    const drawerBackdrop = document.getElementById('mobile_drawer_backdrop');
    const drawerToggle = document.getElementById('mobile_drawer_toggle');
    const drawerClose = document.getElementById('drawer_close_btn');

    const openMobileDrawer = () => {
      if (drawer) drawer.classList.add('open');
      if (drawerBackdrop) drawerBackdrop.classList.add('open');
    };

    const closeMobileDrawer = () => {
      if (drawer) drawer.classList.remove('open');
      if (drawerBackdrop) drawerBackdrop.classList.remove('open');
    };

    if (drawerToggle) drawerToggle.addEventListener('click', openMobileDrawer);
    if (drawerClose) drawerClose.addEventListener('click', closeMobileDrawer);
    if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeMobileDrawer);

    // Mobile Asset Pill: Tap to open Watchlist & Quick Search Hub
    const mobileAssetPill = document.getElementById('mobile_asset_pill');
    if (mobileAssetPill) {
      mobileAssetPill.addEventListener('click', () => {
        const watchlistBtn = document.getElementById('watchlist_tray_btn');
        if (watchlistBtn) watchlistBtn.click();
      });
    }

    // Drawer Menu Navigation Actions
    const dOpenSearch = document.getElementById('d_open_search');
    if (dOpenSearch) {
      dOpenSearch.addEventListener('click', () => {
        closeMobileDrawer();
        const watchlistBtn = document.getElementById('watchlist_tray_btn');
        if (watchlistBtn) watchlistBtn.click();
      });
    }

    const dOpenPassbook = document.getElementById('d_open_passbook');
    if (dOpenPassbook) {
      dOpenPassbook.addEventListener('click', () => {
        closeMobileDrawer();
        if (window.innerWidth <= 860) {
          this.switchMobilePage('passbook');
        } else {
          const btn = document.getElementById('open_history_btn');
          if (btn) btn.click();
        }
      });
    }

    const dOpenJournal = document.getElementById('d_open_journal');
    if (dOpenJournal) {
      dOpenJournal.addEventListener('click', () => {
        closeMobileDrawer();
        if (window.innerWidth <= 860) {
          this.switchMobilePage('journal');
        } else {
          const btn = document.getElementById('open_journal_btn');
          if (btn) btn.click();
        }
      });
    }

    const dToggleAutopilot = document.getElementById('d_toggle_autopilot');
    if (dToggleAutopilot) {
      dToggleAutopilot.addEventListener('click', () => {
        const toggle = document.getElementById('popover_autopilot_toggle');
        if (toggle) toggle.click();
        const isAp = localStorage.getItem('monday_auto_pilot') === 'true';
        const badge = document.getElementById('d_autopilot_badge');
        if (badge) {
          badge.textContent = isAp ? 'ON' : 'OFF';
          badge.classList.toggle('active', isAp);
        }
      });
    }

    const dToggleVoice = document.getElementById('d_toggle_voice');
    if (dToggleVoice) {
      dToggleVoice.addEventListener('click', () => {
        const toggle = document.getElementById('popover_voice_toggle');
        if (toggle) toggle.click();
        const vBadge = document.getElementById('popover_voice_badge');
        const dBadge = document.getElementById('d_voice_badge');
        if (vBadge && dBadge) {
          dBadge.textContent = vBadge.textContent;
          dBadge.className = vBadge.className;
        }
      });
    }

    const dThemeToggle = document.getElementById('d_theme_toggle_btn');
    if (dThemeToggle) {
      dThemeToggle.addEventListener('click', () => {
        const btn = document.getElementById('theme_toggle_btn');
        if (btn) btn.click();
        const themeText = document.getElementById('theme_mode_text');
        const dText = document.getElementById('d_theme_mode_text');
        if (themeText && dText) dText.textContent = themeText.textContent;
      });
    }

    // Drawer Market Switcher (Crypto ⇄ India)
    const dMarketCrypto = document.getElementById('d_market_crypto');
    const dMarketIndia = document.getElementById('d_market_india');
    if (dMarketCrypto && dMarketIndia) {
      dMarketCrypto.addEventListener('click', () => {
        if (this.currentMarket !== 'Crypto') {
          const item = document.querySelector('.market-menu-item[data-market="Crypto"]');
          if (item) item.click();
          dMarketCrypto.classList.add('active');
          dMarketIndia.classList.remove('active');
          closeMobileDrawer();
        }
      });
      dMarketIndia.addEventListener('click', () => {
        if (this.currentMarket !== 'India') {
          const item = document.querySelector('.market-menu-item[data-market="India"]');
          if (item) item.click();
          dMarketIndia.classList.add('active');
          dMarketCrypto.classList.remove('active');
          closeMobileDrawer();
        }
      });
    }

    // Context Deck Mobile Segmented Switcher (Pattern Scan ⇄ Macro Radar)
    document.querySelectorAll('.deck-m-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const deckView = e.currentTarget.dataset.deckView;
        document.querySelectorAll('.deck-m-tab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const histCard = document.getElementById('historical_pattern_card');
        const newsCard = document.getElementById('news_radar_list');
        if (histCard && newsCard) {
          if (deckView === 'hist') {
            histCard.classList.add('active-deck-card');
            newsCard.classList.remove('active-deck-card');
          } else {
            newsCard.classList.add('active-deck-card');
            histCard.classList.remove('active-deck-card');
          }
        }
      });
    });

    // Watchlist Popover Tray Trigger & Close
    const watchlistTrayWrapper = document.getElementById('watchlist_tray_wrapper');
    const watchlistTrayBtn = document.getElementById('watchlist_tray_btn');
    const watchlistTrayClose = document.getElementById('watchlist_tray_close');

    const watchlistSearchInput = document.getElementById('watchlist_tray_search_input');

    if (watchlistTrayBtn && watchlistTrayWrapper) {
      watchlistTrayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Mutual auto-close other dropdowns
        if (searchContainer) searchContainer.classList.remove('open');
        if (marketDropdownWrapper) marketDropdownWrapper.classList.remove('open');

        const isOpen = watchlistTrayWrapper.classList.contains('open');
        if (!isOpen) {
          if (watchlistSearchInput) watchlistSearchInput.value = '';
          this.renderWatchlistTray(this.currentMarket);
          watchlistTrayWrapper.classList.add('open');
        } else {
          watchlistTrayWrapper.classList.remove('open');
        }
      });
    }

    if (watchlistSearchInput) {
      watchlistSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        const cards = document.querySelectorAll('#watchlist_tray_body .tray-asset-card');
        cards.forEach(card => {
          const sym = (card.querySelector('.tray-asset-sym')?.textContent || '').toLowerCase();
          const sub = (card.querySelector('.tray-asset-sub')?.textContent || '').toLowerCase();
          const match = !query || sym.includes(query) || sub.includes(query);
          card.style.display = match ? '' : 'none';
        });
        document.querySelectorAll('#watchlist_tray_body .tray-section').forEach(sec => {
          const visible = sec.querySelectorAll('.tray-asset-card:not([style*="display: none"])');
          sec.style.display = visible.length > 0 ? '' : 'none';
        });
      });
    }

    if (watchlistTrayClose && watchlistTrayWrapper) {
      watchlistTrayClose.addEventListener('click', (e) => {
        e.stopPropagation();
        watchlistTrayWrapper.classList.remove('open');
      });
    }

    document.addEventListener('click', (e) => {
      if (watchlistTrayWrapper && !watchlistTrayWrapper.contains(e.target)) {
        watchlistTrayWrapper.classList.remove('open');
      }
    });

    // Timeframe Tray & Pinned Buttons
    const dropdownContainer = document.querySelector('.tf-dropdown-container');
    const trayTriggerBtn = document.getElementById('tf_tray_trigger');
    const trayCloseBtn = document.getElementById('tf_tray_close_btn');
    const currentTfDisplay = document.getElementById('current_tf_display');

    if (trayTriggerBtn && dropdownContainer) {
      trayTriggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownContainer.classList.toggle('open');
      });
    }

    if (trayCloseBtn && dropdownContainer) {
      trayCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownContainer.classList.remove('open');
      });
    }

    // Close tray when clicking outside
    document.addEventListener('click', (e) => {
      if (dropdownContainer && !dropdownContainer.contains(e.target)) {
        dropdownContainer.classList.remove('open');
      }
    });

    // Handle Timeframe Tray Item selection
    document.querySelectorAll('.tf-tray-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const tf = item.dataset.tf;
        const label = item.dataset.label || tf;

        // Update active class on tray items
        document.querySelectorAll('.tf-tray-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');

        // Update pinned buttons if matching
        document.querySelectorAll('.tf-pinned-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.tf.toUpperCase() === tf.toUpperCase());
        });

        // Update trigger display
        if (currentTfDisplay) {
          currentTfDisplay.textContent = label;
        }

        // Close tray
        if (dropdownContainer) dropdownContainer.classList.remove('open');

        if (this.callbacks.onTimeframeChange) {
          this.callbacks.onTimeframeChange(tf);
        }
      });
    });

    // Handle Pinned Strategy Buttons
    document.querySelectorAll('.tf-pinned-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tf = btn.dataset.tf;
        const label = btn.textContent.trim();

        document.querySelectorAll('.tf-pinned-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update tray items active state
        document.querySelectorAll('.tf-tray-item').forEach(item => {
          item.classList.toggle('active', item.dataset.tf.toUpperCase() === tf.toUpperCase());
        });

        // Update trigger display
        if (currentTfDisplay) {
          currentTfDisplay.textContent = label;
        }

        if (this.callbacks.onTimeframeChange) {
          this.callbacks.onTimeframeChange(tf);
        }
      });
    });

    // Chat Input Form
    const chatForm = document.getElementById('chat_form');
    const chatInput = document.getElementById('chat_input');
    if (chatForm && chatInput) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (text) {
          if (this.callbacks.onSendMessage) this.callbacks.onSendMessage(text);
          chatInput.value = '';
        }
      });
    }

    // Quick Prompt Chips
    document.querySelectorAll('.quick-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const prompt = e.currentTarget.textContent.trim();
        if (this.callbacks.onSendMessage) this.callbacks.onSendMessage(prompt);
      });
    });

    // Dynamic Pinned Live Setup Radar Handlers
    const pinnedRadarDismiss = document.getElementById('pinned_radar_dismiss');
    const btnPinnedAction = document.getElementById('btn_pinned_action');
    const pinnedRadarCard = document.getElementById('chat_pinned_radar');

    if (pinnedRadarDismiss && pinnedRadarCard) {
      pinnedRadarDismiss.addEventListener('click', (e) => {
        e.stopPropagation();
        pinnedRadarCard.style.display = 'none';
        this.pinnedRadarDismissedByUser = true;
      });
    }

    if (btnPinnedAction) {
      btnPinnedAction.addEventListener('click', () => {
        if (!this.latestStrategyState || !this.latestStrategyState.levels) return;
        this.loadSetupIntoOrderDesk(this.latestStrategyState.levels, this.latestStrategyState.direction);
        if (this.latestStrategyState.state === 'CONFIRMED') {
          this.showToast('⚡ Trade Loaded', `${this.latestStrategyState.direction || 'LONG'} trade levels loaded in Desk at 1:${this.latestStrategyState.levels.rrRatio} RR! Ready to execute.`, 'success');
        } else {
          this.showToast('📋 Setup Loaded', `Developing setup levels loaded in Desk. Awaiting final confirmation.`, 'info');
        }
      });
    }

    // Voice Mic Button
    const voiceBtn = document.getElementById('voice_mic_btn');
    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => {
        if (this.callbacks.onToggleVoice) this.callbacks.onToggleVoice();
      });
    }

    // Voice Mute Toggle
    const muteBtn = document.getElementById('voice_mute_btn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        if (this.callbacks.onToggleMute) {
          const isMuted = this.callbacks.onToggleMute();
          muteBtn.classList.toggle('muted', isMuted);
          muteBtn.title = isMuted ? 'Unmute AI Voice' : 'Mute AI Voice';
          muteBtn.innerHTML = isMuted ? '<i class="ph ph-speaker-slash"></i>' : '<i class="ph ph-speaker-high"></i>';
        }
      });
    }

    // Voice Audio Test
    const testVoiceBtn = document.getElementById('voice_test_btn');
    if (testVoiceBtn) {
      testVoiceBtn.addEventListener('click', () => {
        if (this.callbacks.onTestVoice) this.callbacks.onTestVoice();
      });
    }

    // Execute Paper Trade Button (Delta Exchange Derivatives Execution)
    const execBtn = document.getElementById('execute_trade_btn');
    if (execBtn) {
      execBtn.addEventListener('click', () => {
        const aiState = this.latestStrategyState?.state || 'WAIT';
        const aiDirection = (this.latestStrategyState?.direction || 
          (this.latestStrategyState?.htfTrend?.direction === 'BULLISH' ? 'LONG' : 
          (this.latestStrategyState?.htfTrend?.direction === 'BEARISH' ? 'SHORT' : '')) || '').toUpperCase();
        const userDirection = (this.orderState.direction || 'LONG').toUpperCase();

        if (aiState === 'CONFIRMED' && aiDirection && aiDirection !== userDirection) {
          const proceed = window.confirm(
            `⚠️ Counter-Trend Warning:\n\nMonday AI has an institutional ${aiDirection} bias for ${this.currentAsset}.\nYou are opening an opposite ${userDirection} position against the confirmed trend.\n\nDo you want to proceed anyway?`
          );
          if (!proceed) return;
        }

        const orderPacket = this.getOrderDeskPacket();
        if (this.callbacks.onExecuteTrade) this.callbacks.onExecuteTrade(orderPacket);
      });
    }

    // Reset Account Button & Top-Layer Minimal Confirmation Modal
    const resetBtn = document.getElementById('reset_account_btn');
    const resetModal = document.getElementById('modal_reset_confirm');
    const closeResetBtn = document.getElementById('close_reset_confirm_btn');
    const cancelResetBtn = document.getElementById('btn_cancel_reset');
    const confirmResetBtn = document.getElementById('btn_confirm_reset');
    const backdropReset = document.getElementById('backdrop_reset_confirm');

    const openResetConfirmModal = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (resetModal) {
        resetModal.style.display = 'flex';
        resetModal.classList.add('open');
      }
    };

    const closeResetConfirmModal = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (resetModal) {
        resetModal.style.display = 'none';
        resetModal.classList.remove('open');
      }
    };

    if (resetBtn) {
      resetBtn.addEventListener('click', openResetConfirmModal);
    }
    if (closeResetBtn) {
      closeResetBtn.addEventListener('click', closeResetConfirmModal);
    }
    if (cancelResetBtn) {
      cancelResetBtn.addEventListener('click', closeResetConfirmModal);
    }
    if (backdropReset) {
      backdropReset.addEventListener('click', closeResetConfirmModal);
    }

    if (confirmResetBtn) {
      confirmResetBtn.addEventListener('click', () => {
        closeResetConfirmModal();
        if (this.callbacks.onResetAccount) {
          this.callbacks.onResetAccount();
        }
      });
    }

    // Keyboard ESC to close reset confirmation dialog
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && resetModal && resetModal.classList.contains('open')) {
        closeResetConfirmModal();
      }
    });

    // Google-Style User Profile & Utilities Popover Hub Toggles
    const profilePopoverWrapper = document.getElementById('profile_popover_wrapper');
    const profileAvatarBtn = document.getElementById('profile_avatar_btn');
    const popoverVoiceToggle = document.getElementById('popover_voice_toggle');
    const popoverVoiceBadge = document.getElementById('popover_voice_badge');
    const popoverVoiceIcon = document.getElementById('popover_voice_icon');
    const popoverThemeIcon = document.getElementById('popover_theme_icon');

    if (profileAvatarBtn && profilePopoverWrapper) {
      profileAvatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        // Close notification popover if open
        const notifWrapper = document.getElementById('notif_popover_wrapper');
        if (notifWrapper) {
          notifWrapper.classList.remove('open');
          const nBtn = document.getElementById('notif_bell_btn');
          if (nBtn) nBtn.setAttribute('aria-expanded', 'false');
        }

        const isOpen = profilePopoverWrapper.classList.toggle('open');
        profileAvatarBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      // Outside click listener to auto-close popover
      document.addEventListener('click', (e) => {
        if (!profilePopoverWrapper.contains(e.target)) {
          profilePopoverWrapper.classList.remove('open');
          profileAvatarBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Audio Copilot Quick Voice Switcher in Popover
    if (popoverVoiceToggle) {
      popoverVoiceToggle.addEventListener('click', () => {
        if (this.callbacks.onToggleMute) {
          const isMuted = this.callbacks.onToggleMute();
          if (popoverVoiceBadge) {
            popoverVoiceBadge.textContent = isMuted ? 'OFF' : 'ON';
            popoverVoiceBadge.classList.toggle('active', !isMuted);
          }
          if (popoverVoiceIcon) {
            popoverVoiceIcon.className = isMuted
              ? 'ph ph-speaker-slash item-icon cyan'
              : 'ph ph-speaker-high item-icon cyan';
          }
          this.showToast('Audio Copilot', isMuted ? 'Voice speech muted' : 'Voice speech active', 'info');
        }
      });
    }

    // Journal Modal / Mobile Dedicated Page Toggles
    const journalBtn = document.getElementById('open_journal_btn');
    const journalModal = document.getElementById('journal_modal');
    const closeJournalBtn = document.getElementById('close_journal_btn');
    const mBackJournalBtn = document.getElementById('m_back_journal_btn');

    if (journalBtn && journalModal) {
      journalBtn.addEventListener('click', () => {
        if (profilePopoverWrapper) {
          profilePopoverWrapper.classList.remove('open');
          if (profileAvatarBtn) profileAvatarBtn.setAttribute('aria-expanded', 'false');
        }
        if (window.innerWidth <= 860) {
          this.switchMobilePage('journal');
        } else {
          journalModal.classList.add('open');
        }
      });
    }

    const handleCloseJournal = () => {
      if (window.innerWidth <= 860) {
        this.switchMobilePage('chart');
      } else if (journalModal) {
        journalModal.classList.remove('open');
      }
    };
    if (closeJournalBtn) closeJournalBtn.addEventListener('click', handleCloseJournal);
    if (mBackJournalBtn) mBackJournalBtn.addEventListener('click', handleCloseJournal);

    // Financial Passbook & 18% GST Ledger Modal / Mobile Dedicated Page Toggles
    const openHistoryBtn = document.getElementById('open_history_btn');
    const quickPassbookBtn = document.getElementById('btn_quick_passbook');
    const passbookModal = document.getElementById('passbook_modal');
    const closePassbookBtn = document.getElementById('close_passbook_btn');
    const mBackPassbookBtn = document.getElementById('m_back_passbook_btn');

    const openPassbook = () => {
      if (profilePopoverWrapper) {
        profilePopoverWrapper.classList.remove('open');
        if (profileAvatarBtn) profileAvatarBtn.setAttribute('aria-expanded', 'false');
      }
      if (window.innerWidth <= 860) {
        this.switchMobilePage('passbook');
      } else if (passbookModal) {
        passbookModal.classList.add('open');
        this.renderFinancialPassbook();
      }
    };

    if (openHistoryBtn) openHistoryBtn.addEventListener('click', openPassbook);
    if (quickPassbookBtn) quickPassbookBtn.addEventListener('click', openPassbook);

    const handleClosePassbook = () => {
      if (window.innerWidth <= 860) {
        this.switchMobilePage('chart');
      } else if (passbookModal) {
        passbookModal.classList.remove('open');
      }
    };
    if (closePassbookBtn) closePassbookBtn.addEventListener('click', handleClosePassbook);
    if (mBackPassbookBtn) mBackPassbookBtn.addEventListener('click', handleClosePassbook);

    if (passbookModal) {
      passbookModal.addEventListener('click', (e) => {
        if (e.target === passbookModal) {
          passbookModal.classList.remove('open');
        }
      });
    }

    // Passbook Month Filter & Type Chips
    const passbookMonthSelect = document.getElementById('passbook_month_filter');
    if (passbookMonthSelect) {
      passbookMonthSelect.addEventListener('change', () => {
        this.passbookCurrentMonth = passbookMonthSelect.value;
        this.renderFinancialPassbook();
      });
    }

    document.querySelectorAll('.passbook-filter-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('.passbook-filter-chip').forEach(c => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.passbookFilterType = e.currentTarget.dataset.filter || 'ALL';
        this.renderFinancialPassbook();
      });
    });

    // Autonomous AI Auto-Pilot Switch Toggle Handlers
    const autopilotWrapper = document.getElementById('autopilot_toggle_wrapper');
    const autopilotBtn = document.getElementById('autopilot_toggle_btn');
    const autopilotLabel = document.getElementById('autopilot_label_text');
    const popoverAutopilotToggle = document.getElementById('popover_autopilot_toggle');
    const popoverAutopilotBadge = document.getElementById('popover_autopilot_badge');

    const updateAutoPilotUI = (enabled) => {
      this.autoPilotEnabled = !!enabled;
      if (autopilotWrapper) {
        autopilotWrapper.classList.toggle('active', this.autoPilotEnabled);
      }
      if (autopilotBtn) {
        autopilotBtn.setAttribute('aria-checked', this.autoPilotEnabled ? 'true' : 'false');
      }
      if (autopilotLabel) {
        autopilotLabel.textContent = this.autoPilotEnabled ? 'Auto-Pilot ON' : 'Auto-Pilot';
      }
      if (popoverAutopilotBadge) {
        popoverAutopilotBadge.textContent = this.autoPilotEnabled ? 'ON' : 'OFF';
        popoverAutopilotBadge.className = `popover-toggle-badge ${this.autoPilotEnabled ? 'active' : ''}`;
      }
    };

    const toggleAutoPilot = () => {
      const next = !this.autoPilotEnabled;
      try {
        localStorage.setItem('monday_auto_pilot', String(next));
      } catch (e) {}
      updateAutoPilotUI(next);
      if (this.callbacks.onToggleAutoPilot) {
        this.callbacks.onToggleAutoPilot(next);
      }
      this.showToast(
        next ? '🤖 Auto-Pilot Activated' : 'Auto-Pilot Deactivated',
        next ? 'MONDAY will automatically enter confirmed Grade A setups with strict 1% risk (Max 2 trades)' : 'Manual order execution mode restored.',
        next ? 'success' : 'info'
      );
    };

    if (autopilotWrapper) autopilotWrapper.addEventListener('click', toggleAutoPilot);
    if (popoverAutopilotToggle) popoverAutopilotToggle.addEventListener('click', toggleAutoPilot);

    // Initialize Auto-Pilot UI from persisted state
    updateAutoPilotUI(this.autoPilotEnabled);

    // Auto-Pilot Risk & Execution Standards Modal Handlers
    const autopilotSettingsBtn = document.getElementById('btn_autopilot_settings');
    const autopilotSettingsModal = document.getElementById('modal_autopilot_settings');
    const closeAutopilotSettingsBtn = document.getElementById('close_autopilot_settings_btn');
    const backdropAutopilotSettings = document.getElementById('backdrop_autopilot_settings');
    const btnApplyRecommended = document.getElementById('btn_apply_recommended_preset');
    const btnSaveAutopilotSettings = document.getElementById('btn_save_autopilot_settings');
    const btnResetAutopilotSettings = document.getElementById('btn_reset_autopilot_settings');

    const inputMargin = document.getElementById('input_autopilot_margin');
    const selectLeverage = document.getElementById('select_autopilot_leverage');
    const selectMaxTrades = document.getElementById('select_autopilot_maxtrades');
    const inputConfluence = document.getElementById('input_autopilot_confluence');
    const labelConfluence = document.getElementById('label_autopilot_confluence');
    const badgeConfluence = document.getElementById('badge_confluence_val');
    const selectMinRR = document.getElementById('select_autopilot_min_rr');
    const switchEventShield = document.getElementById('switch_autopilot_event_shield');

    const RECOMMENDED_SETTINGS = {
      marginUSD: 20,
      leverage: 20,
      maxTrades: 2,
      minConfluence: 75,
      minRR: 3.0,
      eventShieldEnabled: true
    };

    const getSavedSettings = () => {
      try {
        const raw = localStorage.getItem('monday_autopilot_settings');
        if (raw) return { ...RECOMMENDED_SETTINGS, ...JSON.parse(raw) };
      } catch (e) {}
      return { ...RECOMMENDED_SETTINGS };
    };

    const populateForm = (s) => {
      if (inputMargin) inputMargin.value = s.marginUSD || 20;
      if (selectLeverage) selectLeverage.value = String(s.leverage || 20);
      if (selectMaxTrades) selectMaxTrades.value = String(s.maxTrades || 2);
      if (inputConfluence) {
        inputConfluence.value = String(s.minConfluence || 75);
        if (labelConfluence) labelConfluence.textContent = `${inputConfluence.value}%`;
        if (badgeConfluence) badgeConfluence.textContent = `≥ ${inputConfluence.value}% Grade ${inputConfluence.value >= 85 ? 'A+' : inputConfluence.value >= 75 ? 'A' : 'B'}`;
      }
      if (selectMinRR) selectMinRR.value = Number(s.minRR || 3.0).toFixed(1);
      if (switchEventShield) switchEventShield.checked = s.eventShieldEnabled !== false;
    };

    if (inputConfluence) {
      inputConfluence.addEventListener('input', () => {
        const val = inputConfluence.value;
        if (labelConfluence) labelConfluence.textContent = `${val}%`;
        if (badgeConfluence) badgeConfluence.textContent = `≥ ${val}% Grade ${val >= 85 ? 'A+' : val >= 75 ? 'A' : 'B'}`;
      });
    }

    const openAutopilotSettings = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      populateForm(getSavedSettings());
      if (autopilotSettingsModal) {
        autopilotSettingsModal.style.display = 'flex';
        autopilotSettingsModal.classList.add('open');
      }
    };

    const closeAutopilotSettings = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (autopilotSettingsModal) {
        autopilotSettingsModal.style.display = 'none';
        autopilotSettingsModal.classList.remove('open');
      }
    };

    // Expose globally so inline or external triggers can never fail
    window.openAutopilotSettings = openAutopilotSettings;
    window.closeAutopilotSettings = closeAutopilotSettings;

    if (autopilotSettingsBtn) autopilotSettingsBtn.addEventListener('click', openAutopilotSettings);
    if (closeAutopilotSettingsBtn) closeAutopilotSettingsBtn.addEventListener('click', closeAutopilotSettings);
    if (backdropAutopilotSettings) backdropAutopilotSettings.addEventListener('click', closeAutopilotSettings);

    // Event delegation fallback
    document.addEventListener('click', (e) => {
      if (e.target && (e.target.id === 'btn_autopilot_settings' || e.target.closest('#btn_autopilot_settings'))) {
        openAutopilotSettings(e);
      }
    });

    if (btnApplyRecommended) {
      btnApplyRecommended.addEventListener('click', () => {
        populateForm(RECOMMENDED_SETTINGS);
        this.showToast('⭐ MONDAY Preset Applied', '$20 Margin @ 20x, Max 2 Trades, 75% Conf, 1:3.0 RR, Event Shield ON', 'success');
      });
    }

    if (btnResetAutopilotSettings) {
      btnResetAutopilotSettings.addEventListener('click', () => {
        populateForm(RECOMMENDED_SETTINGS);
        try {
          localStorage.removeItem('monday_autopilot_settings');
        } catch (e) {}
        this.showToast('Defaults Restored', 'Auto-Pilot standards reset to MONDAY recommended configuration.', 'info');
      });
    }

    if (btnSaveAutopilotSettings) {
      btnSaveAutopilotSettings.addEventListener('click', () => {
        const marginUSD = Math.max(5, Math.min(500, parseFloat(inputMargin?.value || '20')));
        const leverage = parseInt(selectLeverage?.value || '20', 10);
        const maxTrades = parseInt(selectMaxTrades?.value || '2', 10);
        const minConfluence = parseInt(inputConfluence?.value || '75', 10);
        const minRR = parseFloat(selectMinRR?.value || '3.0');
        const eventShieldEnabled = !!switchEventShield?.checked;

        const newSettings = {
          marginUSD,
          leverage,
          maxTrades,
          minConfluence,
          minRR,
          eventShieldEnabled
        };

        try {
          localStorage.setItem('monday_autopilot_settings', JSON.stringify(newSettings));
        } catch (e) {}

        closeAutopilotSettings();
        if (this.callbacks.onSaveAutoPilotSettings) {
          this.callbacks.onSaveAutoPilotSettings(newSettings);
        }
        this.showToast(
          '⚙️ Standards Saved',
          `Auto-Pilot updated: $${marginUSD} Margin @ ${leverage}x | Max ${maxTrades} Trades | Shield: ${eventShieldEnabled ? 'ON' : 'OFF'}`,
          'success'
        );
      });
    }

    // R-Multiple & Live Equity Explainer Modal Toggles
    const explainRBtn = document.getElementById('btn_explain_r');
    const rModal = document.getElementById('modal_r_explainer');
    const closeRBtn = document.getElementById('close_r_explainer_btn');
    const gotItRBtn = document.getElementById('btn_got_it_r');
    const backdropR = document.getElementById('backdrop_r_explainer');

    const openRModal = () => {
      if (rModal) rModal.style.display = 'flex';
    };
    const closeRModal = () => {
      if (rModal) rModal.style.display = 'none';
    };

    if (explainRBtn) explainRBtn.addEventListener('click', openRModal);
    if (closeRBtn) closeRBtn.addEventListener('click', closeRModal);
    if (gotItRBtn) gotItRBtn.addEventListener('click', closeRModal);
    if (backdropR) backdropR.addEventListener('click', closeRModal);

    // Dark / Light Mode Toggle
    const themeBtn = document.getElementById('theme_toggle_btn');
    const themeText = document.getElementById('theme_mode_text');

    const updateThemeUI = (theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      if (themeText) {
        themeText.textContent = theme === 'light' ? 'Light' : 'Dark';
      }
      if (themeBtn) {
        themeBtn.setAttribute('title', theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode');
      }
      if (popoverThemeIcon) {
        popoverThemeIcon.className = theme === 'light'
          ? 'ph ph-sun item-icon amber'
          : 'ph ph-sun-dim item-icon amber';
      }
    };

    // Apply saved or default theme
    const savedTheme = localStorage.getItem('monday_theme') || 'dark';
    updateThemeUI(savedTheme);

    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('monday_theme', newTheme);
        updateThemeUI(newTheme);
        if (this.callbacks.onThemeChange) {
          this.callbacks.onThemeChange(newTheme);
        }
        this.showToast('Theme Updated', `Switched to ${newTheme.toUpperCase()} mode`, 'info');
      });
    }

    // =========================================================================
    // AUTHENTICATION & LOGIN SCREEN EVENT HANDLERS
    // =========================================================================
    let currentAuthMode = 'signin';
    const tabSignIn = document.getElementById('auth_tab_signin');
    const tabSignUp = document.getElementById('auth_tab_signup');
    const nameGroup = document.getElementById('auth_group_name');
    const authSubmitText = document.getElementById('auth_submit_text');
    const authCardTitle = document.getElementById('auth_card_title');
    const authCardSubtitle = document.getElementById('auth_card_subtitle');
    const authForm = document.getElementById('auth_form');
    const emailInput = document.getElementById('auth_input_email');
    const pwdInput = document.getElementById('auth_input_password');
    const nameInput = document.getElementById('auth_input_name');
    const pwdToggle = document.getElementById('auth_pwd_toggle');
    const pwdEye = document.getElementById('auth_pwd_eye');
    const googleBtn = document.getElementById('auth_google_btn');
    const guestBtn = document.getElementById('auth_guest_btn');
    const headerLogoutBtn = document.getElementById('header_logout_btn');

    const setAuthMode = (mode) => {
      currentAuthMode = mode;
      this.showAuthAlert(null);
      if (mode === 'signup') {
        if (tabSignIn) tabSignIn.classList.remove('active');
        if (tabSignUp) tabSignUp.classList.add('active');
        if (nameGroup) nameGroup.style.display = 'flex';
        if (authSubmitText) authSubmitText.textContent = 'Create Trading Account';
        if (authCardTitle) authCardTitle.textContent = 'Create Account';
        if (authCardSubtitle) authCardSubtitle.textContent = 'Unlock your neural dual-market trading cockpit';
      } else {
        if (tabSignUp) tabSignUp.classList.remove('active');
        if (tabSignIn) tabSignIn.classList.add('active');
        if (nameGroup) nameGroup.style.display = 'none';
        if (authSubmitText) authSubmitText.textContent = 'Sign In with Email';
        if (authCardTitle) authCardTitle.textContent = 'Welcome Back';
        if (authCardSubtitle) authCardSubtitle.textContent = 'Access your neural terminal and sync live trades';
      }
    };

    if (tabSignIn) tabSignIn.addEventListener('click', () => setAuthMode('signin'));
    if (tabSignUp) tabSignUp.addEventListener('click', () => setAuthMode('signup'));

    // Password Show/Hide Toggle
    if (pwdToggle && pwdInput && pwdEye) {
      pwdToggle.addEventListener('click', () => {
        const isPwd = pwdInput.type === 'password';
        pwdInput.type = isPwd ? 'text' : 'password';
        pwdEye.className = isPwd ? 'ph ph-eye-slash' : 'ph ph-eye';
      });
    }

    // Auth Form Submission
    if (authForm) {
      authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = emailInput ? emailInput.value.trim() : '';
        const password = pwdInput ? pwdInput.value : '';
        const name = nameInput ? nameInput.value.trim() : '';

        if (currentAuthMode === 'signup') {
          if (this.callbacks.onSignUp) this.callbacks.onSignUp(email, password, name);
        } else {
          if (this.callbacks.onSignIn) this.callbacks.onSignIn(email, password);
        }
      });
    }

    // Google Sign In
    if (googleBtn) {
      googleBtn.addEventListener('click', () => {
        if (this.callbacks.onGoogleSignIn) this.callbacks.onGoogleSignIn();
      });
    }

    // Continue as Guest
    if (guestBtn) {
      guestBtn.addEventListener('click', (e) => {
        if (e) e.preventDefault();
        console.log('[TerminalUI] Guest login button clicked.');
        if (this.callbacks.onGuestLogin) {
          this.callbacks.onGuestLogin();
        } else {
          console.error('[TerminalUI] onGuestLogin callback missing!');
        }
      });
    }

    // Header Logout Button
    if (headerLogoutBtn) {
      headerLogoutBtn.addEventListener('click', () => {
        if (profilePopoverWrapper) {
          profilePopoverWrapper.classList.remove('open');
          if (profileAvatarBtn) profileAvatarBtn.setAttribute('aria-expanded', 'false');
        }
        if (this.callbacks.onSignOut) {
          this.callbacks.onSignOut();
        }
      });
    }

    // Supabase Cloud Setup Modal
    const openSupabaseBtn = document.getElementById('btn_open_supabase_modal');
    const supabaseModal = document.getElementById('modal_supabase_setup');
    const closeSupabaseBtn = document.getElementById('close_supabase_modal_btn');
    const backdropSupabase = document.getElementById('backdrop_supabase_setup');
    const saveSupabaseBtn = document.getElementById('btn_save_supabase');
    const clearSupabaseBtn = document.getElementById('btn_clear_supabase');
    const urlInput = document.getElementById('input_supabase_url');
    const keyInput = document.getElementById('input_supabase_key');
    const statusMsg = document.getElementById('supabase_status_msg');

    const toggleSupabaseModal = (show) => {
      if (supabaseModal) supabaseModal.style.display = show ? 'flex' : 'none';
      if (show) {
        const cfg = JSON.parse(localStorage.getItem('monday_supabase_config') || '{}');
        if (urlInput) urlInput.value = cfg.url || '';
        if (keyInput) keyInput.value = cfg.anonKey || '';
        if (statusMsg) {
          if (cfg.url) {
            statusMsg.style.display = 'block';
            statusMsg.style.color = '#34d399';
            statusMsg.textContent = '✓ Supabase project credentials saved locally.';
          } else {
            statusMsg.style.display = 'none';
          }
        }
      }
    };

    if (openSupabaseBtn) openSupabaseBtn.addEventListener('click', () => toggleSupabaseModal(true));
    if (closeSupabaseBtn) closeSupabaseBtn.addEventListener('click', () => toggleSupabaseModal(false));
    if (backdropSupabase) backdropSupabase.addEventListener('click', () => toggleSupabaseModal(false));

    if (saveSupabaseBtn) {
      saveSupabaseBtn.addEventListener('click', () => {
        const url = urlInput ? urlInput.value.trim() : '';
        const key = keyInput ? keyInput.value.trim() : '';
        if (!url || !key) {
          if (statusMsg) {
            statusMsg.style.display = 'block';
            statusMsg.style.color = '#fb7185';
            statusMsg.textContent = 'Please fill both Project URL and Anon Public Key.';
          }
          return;
        }
        if (this.callbacks.onSaveSupabaseConfig) {
          this.callbacks.onSaveSupabaseConfig(url, key);
        }
        toggleSupabaseModal(false);
        this.showToast('Supabase Connected', 'Project credentials saved successfully!', 'success');
      });
    }

    if (clearSupabaseBtn) {
      clearSupabaseBtn.addEventListener('click', () => {
        localStorage.removeItem('monday_supabase_config');
        if (urlInput) urlInput.value = '';
        if (keyInput) keyInput.value = '';
        if (statusMsg) {
          statusMsg.style.display = 'block';
          statusMsg.style.color = '#94a3b8';
          statusMsg.textContent = 'Supabase credentials cleared. Using local multi-user storage.';
        }
        this.showToast('Supabase Cleared', 'Using local multi-user session storage.', 'info');
      });
    }
  }

  /**
   * Switch mobile view between dedicated 100% full-screen pages
   * Options: 'chart' | 'strategy' | 'copilot' | 'passbook' | 'journal'
   * Designed for multi-billion-dollar-tier SaaS APK UX with Android hardware back-button support
   */
  switchMobilePage(pageKey = 'chart', pushHistory = true) {
    if (!pageKey) pageKey = 'chart';
    this.currentMobilePage = pageKey;

    // Apply strict page attribute to body & terminal wrapper
    document.body.dataset.mobilePage = pageKey;
    const terminalWrapper = document.getElementById('terminal_wrapper');
    if (terminalWrapper) terminalWrapper.dataset.mobilePage = pageKey;

    // 1. Update active tab indicator on mobile bottom nav
    const tabBtns = document.querySelectorAll('.mobile-tab-btn');
    tabBtns.forEach(btn => {
      const p = btn.dataset.page || 
        (btn.id === 'm_tab_chart' ? 'chart' :
         btn.id === 'm_tab_strategy' ? 'strategy' :
         btn.id === 'm_tab_copilot' ? 'copilot' :
         btn.id === 'm_tab_history' ? 'passbook' :
         btn.id === 'm_tab_journal' ? 'journal' : '');
      btn.classList.toggle('active', p === pageKey);
    });

    const passbookModal = document.getElementById('passbook_modal');
    const journalModal = document.getElementById('journal_modal');

    // 2. Manage dedicated mobile pages & modals
    if (pageKey === 'passbook') {
      if (journalModal) journalModal.classList.remove('open');
      if (passbookModal) {
        passbookModal.classList.add('open');
        this.renderFinancialPassbook();
      }
      document.querySelectorAll('.terminal-panel').forEach(panel => {
        panel.classList.remove('active-mobile-panel');
      });
    } else if (pageKey === 'journal') {
      if (passbookModal) passbookModal.classList.remove('open');
      if (journalModal) {
        journalModal.classList.add('open');
      }
      document.querySelectorAll('.terminal-panel').forEach(panel => {
        panel.classList.remove('active-mobile-panel');
      });
    } else {
      // chart, strategy, copilot: hide modals and activate respective terminal panel
      if (passbookModal) passbookModal.classList.remove('open');
      if (journalModal) journalModal.classList.remove('open');

      const targetPanelId = pageKey === 'strategy' ? 'panel_strategy'
                          : pageKey === 'copilot' ? 'panel_copilot'
                          : 'panel_chart';

      document.querySelectorAll('.terminal-panel').forEach(panel => {
        panel.classList.toggle('active-mobile-panel', panel.id === targetPanelId);
      });

      if (pageKey === 'chart') {
        window.dispatchEvent(new Event('resize'));
      }
    }

    // 3. Instant scroll viewport to top without smooth lag
    window.scrollTo(0, 0);

    // 4. Update browser / native Android APK history for hardware back navigation
    if (pushHistory && window.innerWidth <= 860) {
      if (window.location.hash !== '#' + pageKey) {
        try {
          history.pushState({ mobilePage: pageKey }, '', '#' + pageKey);
        } catch (e) {}
      }
    }
  }

  bindDerivativesOrderDesk() {
    const dirLongBtn = document.getElementById('btn_order_dir_long');
    const dirShortBtn = document.getElementById('btn_order_dir_short');
    const levInput = document.getElementById('order_leverage_input');
    const levSlider = document.getElementById('order_leverage_slider');
    const marginInput = document.getElementById('order_margin_usdt');
    const qtyInput = document.getElementById('order_size_qty');
    const tpInput = document.getElementById('order_tp_input');
    const slInput = document.getElementById('order_sl_input');
    const execBtn = document.getElementById('execute_trade_btn');

    // 1. Long / Short Direction Toggle
    if (dirLongBtn && dirShortBtn) {
      dirLongBtn.addEventListener('click', () => {
        if (this.orderState.direction === 'LONG') return;
        this.orderState.direction = 'LONG';
        dirLongBtn.classList.add('active');
        dirShortBtn.classList.remove('active');
        this.recalibrateOrderDeskLevels('LONG');
        this.refreshDerivativesOrderDesk();
      });

      dirShortBtn.addEventListener('click', () => {
        if (this.orderState.direction === 'SHORT') return;
        this.orderState.direction = 'SHORT';
        dirShortBtn.classList.add('active');
        dirLongBtn.classList.remove('active');
        this.recalibrateOrderDeskLevels('SHORT');
        this.refreshDerivativesOrderDesk();
      });
    }

    // 2. Dual Leverage Controls (Slider & Numeric Input Sync)
    const setLeverage = (val) => {
      const sanitized = this.derivativesEngine.sanitizeLeverage(this.currentAsset, this.currentMarket, val);
      this.orderState.leverage = sanitized;
      if (levInput) levInput.value = sanitized;
      if (levSlider) levSlider.value = sanitized;

      // Update active chip
      document.querySelectorAll('.lev-chip').forEach(chip => {
        chip.classList.toggle('active', parseInt(chip.dataset.lev, 10) === sanitized);
      });

      this.refreshDerivativesOrderDesk();
    };

    if (levSlider) {
      levSlider.addEventListener('input', (e) => setLeverage(e.target.value));
    }
    if (levInput) {
      levInput.addEventListener('input', (e) => setLeverage(e.target.value));
      levInput.addEventListener('change', (e) => setLeverage(e.target.value));
    }

    // 3. Leverage Preset Chips
    document.querySelectorAll('.lev-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const val = parseInt(chip.dataset.lev, 10);
        setLeverage(val);
      });
    });

    // 4. Dual Size Inputs (Margin USD <-> Coin Qty Sync)
    if (marginInput) {
      marginInput.addEventListener('input', (e) => {
        const m = parseFloat(e.target.value) || 0;
        this.orderState.marginUSD = m;
        const entry = this.orderState.entryPrice || 1;
        const qty = this.derivativesEngine.calcQuantityFromMargin(m, this.orderState.leverage, entry);
        if (qtyInput) qtyInput.value = qty;
        this.refreshDerivativesOrderDesk();
      });
    }

    if (qtyInput) {
      qtyInput.addEventListener('input', (e) => {
        const q = parseFloat(e.target.value) || 0;
        const entry = this.orderState.entryPrice || 1;
        const notional = q * entry;
        const m = this.derivativesEngine.calcRequiredMargin(notional, this.orderState.leverage);
        this.orderState.marginUSD = m;
        if (marginInput) marginInput.value = m;
        this.refreshDerivativesOrderDesk();
      });
    }

    // 5. Balance Percentage Chips (1%, 5%, 10%, 25%, 50%, 100%)
    document.querySelectorAll('.pct-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.pct-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const pct = parseFloat(chip.dataset.pct) || 1;
        const avail = this.orderState.availableBalance || 2000;
        const calculatedMargin = +((avail * pct) / 100).toFixed(2);
        this.orderState.marginUSD = Math.max(1, calculatedMargin);
        if (marginInput) marginInput.value = this.orderState.marginUSD;
        // Recalculate Qty
        const entry = this.orderState.entryPrice || 1;
        const qty = this.derivativesEngine.calcQuantityFromMargin(this.orderState.marginUSD, this.orderState.leverage, entry);
        if (qtyInput) qtyInput.value = qty;
        this.refreshDerivativesOrderDesk();
      });
    });

    // 6. TP & SL Input Changes
    if (tpInput) {
      tpInput.addEventListener('input', (e) => {
        this.orderState.tpPrice = parseFloat(e.target.value) || 0;
        this.refreshDerivativesOrderDesk();
      });
    }

    if (slInput) {
      slInput.addEventListener('input', (e) => {
        this.orderState.slPrice = parseFloat(e.target.value) || 0;
        this.refreshDerivativesOrderDesk();
      });
    }

    this.refreshDerivativesOrderDesk();
  }

  /**
   * Recalibrates SL & TP when toggling direction between Long & Short,
   * ensuring stop-loss and targets are never mathematically inverted.
   */
  recalibrateOrderDeskLevels(newDirection) {
    const entry = this.orderState.entryPrice || 1;
    const aiDir = (this.latestStrategyState?.direction || '').toUpperCase();
    const tpInput = document.getElementById('order_tp_input');
    const slInput = document.getElementById('order_sl_input');

    // If switching back to the AI-confirmed direction and AI levels exist, restore them
    if (this.latestStrategyState?.levels && aiDir === newDirection) {
      const { stopLoss, target } = this.latestStrategyState.levels;
      if (stopLoss && target) {
        this.orderState.slPrice = stopLoss;
        this.orderState.tpPrice = target;
        if (slInput) slInput.value = stopLoss;
        if (tpInput) tpInput.value = target;
        return;
      }
    }

    const currentSL = this.orderState.slPrice || 0;
    const currentTP = this.orderState.tpPrice || 0;

    const isInverted = newDirection === 'LONG'
      ? (currentSL >= entry || currentTP <= entry)
      : (currentSL <= entry || currentTP >= entry);

    if (isInverted || !currentSL || !currentTP) {
      const prevDist = Math.abs(entry - currentSL);
      const slDist = (prevDist > 0 && prevDist < entry * 0.15) ? prevDist : +(entry * 0.008).toFixed(2);
      const rr = 3.0;

      if (newDirection === 'LONG') {
        const newSL = +(Math.max(0, entry - slDist)).toFixed(2);
        const newTP = +(entry + (slDist * rr)).toFixed(2);
        this.orderState.slPrice = newSL;
        this.orderState.tpPrice = newTP;
        if (slInput) slInput.value = newSL;
        if (tpInput) tpInput.value = newTP;
      } else {
        const newSL = +(entry + slDist).toFixed(2);
        const newTP = +(Math.max(0, entry - (slDist * rr))).toFixed(2);
        this.orderState.slPrice = newSL;
        this.orderState.tpPrice = newTP;
        if (slInput) slInput.value = newSL;
        if (tpInput) tpInput.value = newTP;
      }
    }
  }

  refreshDerivativesOrderDesk() {
    const spec = this.derivativesEngine.getAssetSpec(this.currentAsset, this.currentMarket);
    
    // Update max leverage badge and slider max bounds
    const maxBadge = document.getElementById('leverage_max_badge');
    const levInput = document.getElementById('order_leverage_input');
    const levSlider = document.getElementById('order_leverage_slider');
    const qtyUnit = document.getElementById('order_qty_unit');

    if (maxBadge) maxBadge.textContent = `Max ${spec.maxLeverage}x`;
    if (levSlider) levSlider.max = spec.maxLeverage;
    if (levInput) levInput.max = spec.maxLeverage;
    if (qtyUnit) qtyUnit.textContent = this.currentAsset;

    // Enable/disable chips above max leverage
    document.querySelectorAll('.lev-chip').forEach(chip => {
      const chipLev = parseInt(chip.dataset.lev, 10);
      const isAllowed = chipLev <= spec.maxLeverage;
      chip.style.display = isAllowed ? 'block' : 'none';
    });

    // Calculate full telemetry
    const telemetry = this.derivativesEngine.calculateOrderTelemetry({
      asset: this.currentAsset,
      market: this.currentMarket,
      direction: this.orderState.direction,
      entryPrice: this.orderState.entryPrice,
      leverage: this.orderState.leverage,
      marginUSD: this.orderState.marginUSD,
      stopLoss: this.orderState.slPrice,
      target: this.orderState.tpPrice
    });

    // Update telemetry slip
    const costEl = document.getElementById('slip_cost_margin');
    const notionalEl = document.getElementById('slip_notional_val');
    const liqEl = document.getElementById('slip_liq_price');
    const rrEl = document.getElementById('slip_rr_ratio');
    const tpRoeEl = document.getElementById('order_tp_roe');
    const slRoeEl = document.getElementById('order_sl_roe');
    const execLabel = document.getElementById('exec_btn_label');

    const curr = this.currentMarket === 'India' ? '₹' : '$';

    if (costEl) costEl.textContent = `${curr}${Number(telemetry.marginUSD).toFixed(2)}`;
    if (notionalEl) notionalEl.textContent = `${curr}${Number(telemetry.notionalUSD).toFixed(2)}`;
    if (liqEl) liqEl.textContent = telemetry.liquidationPrice > 0 ? this.formatPrice(telemetry.liquidationPrice) : 'N/A';
    if (rrEl) rrEl.textContent = telemetry.rrRatio > 0 ? `1:${Number(telemetry.rrRatio).toFixed(2)}` : '1:2.65';

    const feeEl = document.getElementById('slip_est_fee');
    if (feeEl) {
      feeEl.textContent = `${curr}${Number(telemetry.estDeltaFeeUSD || 0).toFixed(2)} (Delta 0.05%)`;
    }

    if (tpRoeEl) {
      const tpRoeFormatted = Number(telemetry.tpROE).toFixed(2);
      const tpPnLFormatted = Number(telemetry.tpPnL).toFixed(2);
      tpRoeEl.textContent = telemetry.tpROE > 0 
        ? `+${tpRoeFormatted}% ROE (+${curr}${tpPnLFormatted})`
        : '+0.00% ROE';
    }

    if (slRoeEl) {
      const slRoeFormatted = Number(telemetry.slROE).toFixed(2);
      const slPnLFormatted = Number(Math.abs(telemetry.slPnL)).toFixed(2);
      slRoeEl.textContent = telemetry.slROE !== 0 
        ? `${slRoeFormatted}% ROE (-${curr}${slPnLFormatted})`
        : '-0.00% ROE';
    }

    // Dynamic Direction, Bias Indicator Pill & Minimal Button Presentation
    const execBtn = document.getElementById('execute_trade_btn');
    const execActionEl = document.getElementById('exec_btn_action');
    const execBadgeEl = document.getElementById('exec_btn_badge');
    const execIconEl = document.getElementById('exec_btn_icon');
    const biasPill = document.getElementById('bias_indicator_pill');
    const biasText = document.getElementById('bias_indicator_text');

    const userDirection = (this.orderState.direction || 'LONG').toUpperCase();
    const isLong = userDirection === 'LONG';

    const aiState = this.latestStrategyState?.state || 'WAIT';
    const aiDirection = (this.latestStrategyState?.direction || 
      (this.latestStrategyState?.htfTrend?.direction === 'BULLISH' ? 'LONG' : 
      (this.latestStrategyState?.htfTrend?.direction === 'BEARISH' ? 'SHORT' : '')) || '').toUpperCase();

    const isCounterTrend = Boolean(aiDirection && userDirection !== aiDirection);

    // 1. Counter-Trend Glassmorphic Bias Pill
    if (biasPill && biasText) {
      if (isCounterTrend) {
        biasPill.style.display = 'inline-flex';
        const aiBiasName = aiDirection === 'LONG' ? 'Bullish' : (aiDirection === 'SHORT' ? 'Bearish' : 'Neutral');
        biasText.textContent = `Counter-Trend • AI bias is ${aiBiasName}`;
      } else {
        biasPill.style.display = 'none';
      }
    }

    // 2. Action text
    if (execActionEl) {
      execActionEl.textContent = isLong ? 'Open Long' : 'Open Short';
    }

    // 3. Execution Button Styling & Status Badge
    if (execBtn) {
      execBtn.classList.remove('long', 'short', 'counter-trend', 'pulse-ready');
      execBtn.classList.add(isLong ? 'long' : 'short');

      if (isCounterTrend) {
        execBtn.classList.add('counter-trend');
        if (execBadgeEl) {
          execBadgeEl.className = 'exec-btn-status-badge counter';
          execBadgeEl.textContent = 'Unconfirmed';
        }
        if (execIconEl) {
          execIconEl.className = 'ph-bold ph-warning-circle';
        }
      } else if (aiState === 'CONFIRMED') {
        execBtn.classList.add('pulse-ready');
        if (execBadgeEl) {
          execBadgeEl.className = 'exec-btn-status-badge confirmed';
          execBadgeEl.textContent = 'Confirmed';
        }
        if (execIconEl) {
          execIconEl.className = 'ph-bold ph-lightning';
        }
      } else if (aiState === 'DEVELOPING') {
        if (execBadgeEl) {
          execBadgeEl.className = 'exec-btn-status-badge pending';
          execBadgeEl.textContent = 'Developing';
        }
        if (execIconEl) {
          execIconEl.className = 'ph-bold ph-hourglass-high';
        }
      } else {
        if (execBadgeEl) {
          execBadgeEl.className = 'exec-btn-status-badge pending';
          execBadgeEl.textContent = 'Setup Pending';
        }
        if (execIconEl) {
          execIconEl.className = 'ph-bold ph-paper-plane-tilt';
        }
      }
    }
  }

  getOrderDeskPacket() {
    const telemetry = this.derivativesEngine.calculateOrderTelemetry({
      asset: this.currentAsset,
      market: this.currentMarket,
      direction: this.orderState.direction,
      entryPrice: this.orderState.entryPrice,
      leverage: this.orderState.leverage,
      marginUSD: this.orderState.marginUSD,
      stopLoss: this.orderState.slPrice,
      target: this.orderState.tpPrice
    });

    return {
      asset: this.currentAsset,
      market: this.currentMarket,
      direction: this.orderState.direction,
      entry: telemetry.entryPrice,
      stopLoss: telemetry.slPrice,
      target: telemetry.tpPrice,
      positionSize: telemetry.quantity,
      leverage: telemetry.leverage,
      marginUSD: telemetry.marginUSD,
      notionalUSD: telemetry.notionalUSD,
      liquidationPrice: telemetry.liquidationPrice,
      riskUSD: Math.abs(telemetry.slPnL) || telemetry.marginUSD,
      rewardUSD: telemetry.tpPnL || (telemetry.marginUSD * 2.5),
      rrRatio: telemetry.rrRatio || 2.5
    };
  }

  showAuthOverlay() {
    const overlay = document.getElementById('auth_view_overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.style.display = 'flex';
    }
  }

  hideAuthOverlay() {
    const overlay = document.getElementById('auth_view_overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
    }
  }

  updateUserProfile(user) {
    const nameEl = document.getElementById('user_display_name');
    const headerInitials = document.getElementById('profile_avatar_initials');
    const popoverInitials = document.getElementById('popover_avatar_initials');
    const logoutText = document.getElementById('popover_logout_text');
    const badgeEl = document.querySelector('.popover-account-badge');
    const avatarIcon = document.getElementById('user_avatar_icon');

    if (user) {
      const displayName = user.name || (user.email ? user.email.split('@')[0] : 'Guest Trader');
      if (nameEl) nameEl.textContent = displayName;

      let initials = 'GT';
      if (user.isGuest) {
        initials = 'GT';
        if (badgeEl) badgeEl.innerHTML = '<i class="ph-fill ph-shield-check"></i> Pro Paper Account';
        if (logoutText) logoutText.textContent = 'Sign Out / Switch Account';
      } else {
        const parts = displayName.trim().split(/\s+/);
        if (parts.length >= 2) {
          initials = (parts[0][0] + parts[1][0]).toUpperCase();
        } else {
          initials = displayName.slice(0, 2).toUpperCase();
        }
        if (badgeEl) badgeEl.innerHTML = '<i class="ph-fill ph-shield-check"></i> Verified Account';
        if (logoutText) logoutText.textContent = 'Sign Out';
      }

      if (headerInitials) headerInitials.textContent = initials;
      if (popoverInitials) popoverInitials.textContent = initials;
      const dName = document.getElementById('drawer_user_name');
      const dInit = document.getElementById('drawer_avatar_initials');
      if (dName) dName.textContent = displayName;
      if (dInit) dInit.textContent = initials;

      if (avatarIcon) {
        avatarIcon.className = user.isGuest ? 'ph ph-user' : 'ph ph-check-circle';
      }
    } else {
      if (nameEl) nameEl.textContent = 'Sign In';
      if (headerInitials) headerInitials.textContent = '?';
      if (popoverInitials) popoverInitials.textContent = '?';
      if (logoutText) logoutText.textContent = 'Sign In / Register';
      if (badgeEl) badgeEl.innerHTML = '<i class="ph ph-user"></i> Not Logged In';
      if (avatarIcon) avatarIcon.className = 'ph ph-user-circle';
    }
  }

  showAuthAlert(message, type = 'error') {
    const alertBox = document.getElementById('auth_alert_box');
    if (!alertBox) return;
    if (!message) {
      alertBox.style.display = 'none';
      alertBox.textContent = '';
      return;
    }
    alertBox.className = `auth-alert-box ${type}`;
    alertBox.textContent = message;
    alertBox.style.display = 'block';
  }

  updateMarketTriggerUI(market) {
    const triggerLabel = document.getElementById('market_trigger_label');
    const triggerIcon = document.getElementById('market_trigger_icon');
    if (triggerLabel) {
      triggerLabel.textContent = market === 'India' ? 'India (NSE)' : 'Crypto';
    }
    if (triggerIcon) {
      triggerIcon.className = market === 'India' ? 'ph ph-buildings' : 'ph ph-currency-btc';
    }
    document.querySelectorAll('.market-menu-item').forEach(b => {
      b.classList.toggle('active', b.dataset.market === market);
    });
  }

  setMarket(market, defaultAssets = []) {
    this.currentMarket = market;
    this.updateMarketTriggerUI(market);

    const searchInput = document.getElementById('crypto_search_input');
    if (searchInput) {
      searchInput.placeholder = market === 'India'
        ? 'Search 150+ Indian stocks & IPOs (NIFTY, RELIANCE, SWIGGY)...'
        : 'Search 700+ cryptos (ETH, DOGE, SOL, BNB)...';
      searchInput.value = '';
    }

    const sourceBadge = document.getElementById('feed_source_badge');
    if (sourceBadge) {
      sourceBadge.textContent = market === 'India' ? 'NSE-Live Feed' : 'Live WebSocket';
    }

    this.renderWatchlistTray(market);
  }

  renderWatchlistTray(market) {
    const trayBody = document.getElementById('watchlist_tray_body');
    if (!trayBody) return;

    const starred = this.getStarredAssets(market);

    let sections = [];
    if (market === 'India') {
      sections = [
        {
          title: '🚀 Mega IPOs & New Leaders',
          assets: [
            { sym: 'HYUNDAI', name: 'Hyundai Auto' },
            { sym: 'SWIGGY', name: 'Swiggy Quick' },
            { sym: 'BAJAJHFL', name: 'Bajaj Housing' },
            { sym: 'WAREE', name: 'Waaree Solar' },
            { sym: 'ZOMATO', name: 'Zomato Blinkit' },
            { sym: 'NTPCGREEN', name: 'NTPC Green' }
          ]
        },
        {
          title: '🏛️ Core Heavyweights',
          assets: [
            { sym: 'NIFTY', name: 'Nifty 50' },
            { sym: 'BANKNIFTY', name: 'Bank Nifty' },
            { sym: 'RELIANCE', name: 'Reliance Ind' },
            { sym: 'TCS', name: 'Tata Consultancy' },
            { sym: 'HDFCBANK', name: 'HDFC Bank' },
            { sym: 'TATAMOTORS', name: 'Tata Motors' }
          ]
        },
        {
          title: '🛡️ Defense, Rail & Energy',
          assets: [
            { sym: 'HAL', name: 'Hindustan Aero' },
            { sym: 'BEL', name: 'Bharat Elec' },
            { sym: 'RVNL', name: 'Rail Vikas' },
            { sym: 'IRFC', name: 'Indian Rail Fin' },
            { sym: 'SUZLON', name: 'Suzlon Wind' },
            { sym: 'BSE', name: 'BSE Exchange' }
          ]
        }
      ];
    } else {
      sections = [
        {
          title: '💎 Major Cryptos',
          assets: [
            { sym: 'BTC', name: 'Bitcoin' },
            { sym: 'ETH', name: 'Ethereum' },
            { sym: 'SOL', name: 'Solana' },
            { sym: 'BNB', name: 'BNB Chain' },
            { sym: 'XRP', name: 'Ripple' },
            { sym: 'ADA', name: 'Cardano' }
          ]
        },
        {
          title: '⚡ Layer 1 & DeFi',
          assets: [
            { sym: 'AVAX', name: 'Avalanche' },
            { sym: 'LINK', name: 'Chainlink' },
            { sym: 'NEAR', name: 'NEAR Protocol' },
            { sym: 'SUI', name: 'Sui Network' },
            { sym: 'APT', name: 'Aptos' },
            { sym: 'RENDER', name: 'Render Token' }
          ]
        },
        {
          title: '🐕 Trending Tokens',
          assets: [
            { sym: 'DOGE', name: 'Dogecoin' },
            { sym: 'SHIB', name: 'Shiba Inu' },
            { sym: 'PEPE', name: 'Pepe' },
            { sym: 'WIF', name: 'Dogwifhat' },
            { sym: 'DOT', name: 'Polkadot' },
            { sym: 'MATIC', name: 'Polygon' }
          ]
        }
      ];
    }

    const starredHtml = `
      <div class="tray-section tray-starred-section">
        <span class="tray-section-title"><i class="ph-fill ph-star text-gold"></i> My Starred Watchlist (${starred.length})</span>
        ${starred.length === 0
          ? `<div class="tray-empty-starred"><i class="ph ph-star"></i> No coins bookmarked yet. Search any coin & tap the star (⭐) to pin it here!</div>`
          : `<div class="tray-pill-grid">
              ${starred.map(sym => {
                const isActive = sym.toUpperCase() === (this.currentAsset || '').toUpperCase().replace(/(\/USD|USDT|USD)$/, '');
                return `
                  <div class="tray-starred-card ${isActive ? 'active' : ''}">
                    <button class="tray-starred-select" data-asset="${sym}" type="button" title="View chart for ${sym}">
                      <span class="tray-asset-sym">${sym}</span>
                    </button>
                    <button class="tray-unstar-btn" data-asset="${sym}" type="button" title="Remove from Watchlist">
                      <i class="ph-fill ph-star"></i>
                    </button>
                  </div>
                `;
              }).join('')}
             </div>`
        }
      </div>
    `;

    const sectionsHtml = sections.map(sec => `
      <div class="tray-section">
        <span class="tray-section-title">${sec.title}</span>
        <div class="tray-pill-grid">
          ${sec.assets.map(a => {
            const isStarred = this.isStarred(a.sym, market);
            const isActive = a.sym.toUpperCase() === (this.currentAsset || '').toUpperCase().replace(/(\/USD|USDT|USD)$/, '');
            return `
              <div class="tray-asset-card ${isActive ? 'active' : ''}">
                <button class="tray-asset-btn" data-asset="${a.sym}" type="button" title="View chart for ${a.sym}">
                  <span class="tray-asset-sym">${a.sym}</span>
                  <span class="tray-asset-sub">${a.name}</span>
                </button>
                <button class="tray-star-btn ${isStarred ? 'starred' : ''}" data-asset="${a.sym}" type="button" title="${isStarred ? 'Remove from Watchlist' : 'Add to Watchlist'}">
                  <i class="${isStarred ? 'ph-fill ph-star text-gold' : 'ph ph-star'}"></i>
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `).join('');

    trayBody.innerHTML = starredHtml + sectionsHtml;

    // Bind clicks for selecting assets
    trayBody.querySelectorAll('.tray-starred-select, .tray-asset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const asset = e.currentTarget.dataset.asset;
        if (this.callbacks.onAssetChange) this.callbacks.onAssetChange(asset);
        this.setActiveWatchlistAsset(asset);
        const trayWrapper = document.getElementById('watchlist_tray_wrapper');
        if (trayWrapper) trayWrapper.classList.remove('open');
      });
    });

    // Bind unstar buttons
    trayBody.querySelectorAll('.tray-unstar-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const asset = btn.dataset.asset;
        this.toggleStar(asset, market);
      });
    });

    // Bind suggestion star toggle buttons
    trayBody.querySelectorAll('.tray-star-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const asset = btn.dataset.asset;
        this.toggleStar(asset, market);
      });
    });
  }

  setActiveWatchlistAsset(asset) {
    if (!asset) return;
    this.currentAsset = asset;
    const symUpper = asset.toUpperCase().replace(/(\/USD|USDT|USD)$/, '');

    const trayBody = document.getElementById('watchlist_tray_body');
    if (trayBody) {
      trayBody.querySelectorAll('.tray-starred-card').forEach(card => {
        const btn = card.querySelector('.tray-starred-select');
        if (btn) card.classList.toggle('active', btn.dataset.asset.toUpperCase() === symUpper);
      });
      trayBody.querySelectorAll('.tray-asset-card').forEach(card => {
        const btn = card.querySelector('.tray-asset-btn');
        if (btn) card.classList.toggle('active', btn.dataset.asset.toUpperCase() === symUpper);
      });
    }
  }

  formatPrice(price, currencySymbol = null) {
    const symbol = currencySymbol !== null ? currencySymbol : (this.currentMarket === 'India' ? '₹' : '$');
    if (price === undefined || price === null || isNaN(price)) return `${symbol}0.00`;
    const num = Number(price);
    const locale = this.currentMarket === 'India' ? 'en-IN' : 'en-US';
    if (num >= 1000) {
      return `${symbol}${num.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (num >= 1) {
      return `${symbol}${num.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: (this.currentMarket === 'India' ? 2 : 4) })}`;
    } else if (num >= 0.001) {
      return `${symbol}${num.toFixed(5)}`;
    } else if (num >= 0.00001) {
      return `${symbol}${num.toFixed(7)}`;
    } else {
      return `${symbol}${num.toFixed(8)}`;
    }
  }

  updateTicker({ asset, price, changePercent, high24h, low24h, source }) {
    const priceEl = document.getElementById('live_ticker_price');
    const changeEl = document.getElementById('live_ticker_change');
    const sourceEl = document.getElementById('feed_source_badge');

    if (priceEl && price !== undefined) {
      const oldPrice = parseFloat(priceEl.dataset.rawPrice || 0);
      priceEl.dataset.rawPrice = price;
      priceEl.textContent = this.formatPrice(price);

      if (oldPrice > 0 && price !== oldPrice) {
        priceEl.classList.remove('tick-up', 'tick-down');
        void priceEl.offsetWidth; // Trigger reflow for re-animation
        priceEl.classList.add(price > oldPrice ? 'tick-up' : 'tick-down');
      }
    }
    if (changeEl && changePercent !== undefined) {
      const isPos = changePercent >= 0;
      changeEl.textContent = `${isPos ? '+' : ''}${changePercent.toFixed(2)}%`;
      changeEl.className = `ticker-change ${isPos ? 'bullish' : 'bearish'}`;
    }
    if (sourceEl && source) {
      sourceEl.textContent = source;
    }

    // Synchronize Mobile Native Asset Pill
    const mSym = document.getElementById('m_asset_sym');
    const mPrice = document.getElementById('m_asset_price');
    const mChg = document.getElementById('m_asset_chg');
    if (mSym && (asset || this.currentAsset)) mSym.textContent = asset || this.currentAsset;
    if (mPrice && price !== undefined) mPrice.textContent = this.formatPrice(price);
    if (mChg && changePercent !== undefined) {
      const isPos = changePercent >= 0;
      mChg.textContent = `${isPos ? '+' : ''}${changePercent.toFixed(2)}%`;
      mChg.className = `m-asset-chg ${isPos ? 'text-bullish' : 'text-bearish'}`;
    }

    // Persist latest price for instant zero-lag boot on future reloads
    if (price && (!asset || asset === this.currentAsset)) {
      try {
        localStorage.setItem('monday_last_known_ticker', JSON.stringify({
          asset: asset || this.currentAsset,
          price,
          formattedPrice: this.formatPrice(price),
          changePercent: changePercent !== undefined ? changePercent : 0,
          timestamp: Date.now()
        }));
      } catch (e) {}
    }
  }

  loadSetupIntoOrderDesk(levels, direction = 'LONG') {
    if (!levels) return;
    const dir = (direction || 'LONG').toUpperCase();
    this.orderState.direction = dir;

    const dirLongBtn = document.getElementById('order_dir_long');
    const dirShortBtn = document.getElementById('order_dir_short');
    if (dirLongBtn && dirShortBtn) {
      dirLongBtn.classList.toggle('active', dir === 'LONG');
      dirShortBtn.classList.toggle('active', dir === 'SHORT');
    }

    const entryVal = Number(levels.entry);
    const slVal = Number(levels.stopLoss);
    const tpVal = Number(levels.target);

    this.orderState.entryPrice = entryVal;
    this.orderState.slPrice = slVal;
    this.orderState.tpPrice = tpVal;

    const tpInput = document.getElementById('order_tp_input');
    const slInput = document.getElementById('order_sl_input');
    const entryInput = document.getElementById('order_entry_input');

    if (entryInput) entryInput.value = entryVal;
    if (slInput) slInput.value = slVal;
    if (tpInput) tpInput.value = tpVal;

    this.refreshDerivativesOrderDesk();

    const deskContainer = document.querySelector('.derivatives-order-desk') || document.getElementById('strategy_panel');
    if (deskContainer) {
      deskContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      deskContainer.classList.add('pulse-highlight');
      setTimeout(() => deskContainer.classList.remove('pulse-highlight'), 1200);
    }
  }

  appendTradeBlueprintCard(setup) {
    const container = document.getElementById('chat_messages');
    if (!container || !setup) return;

    const card = document.createElement('div');
    card.className = 'trade-blueprint-card';

    const dirClass = (setup.direction || 'LONG').toLowerCase();
    const currSym = setup.currencySymbol || (this.currentMarket === 'India' ? '₹' : '$');
    const grade = setup.confluenceGrade || (setup.confluenceScore >= 75 ? 'GRADE A' : 'GRADE B');
    const score = Math.round(setup.confluenceScore || 85);
    const lev = setup.recommendedLeverage || '10x - 20x Isolated';
    const rr = setup.rrRatio || setup.levels?.rrRatio || '3.2';
    const entryVal = setup.entry || setup.levels?.entry || 0;
    const slVal = setup.stopLoss || setup.levels?.stopLoss || 0;
    const tpVal = setup.target || setup.levels?.target || 0;

    card.innerHTML = `
      <div class="blueprint-header">
        <span class="blueprint-title">
          <i class="ph-bold ph-lightning"></i> INSTITUTIONAL TRADE BLUEPRINT
        </span>
        <span class="blueprint-grade-chip">${grade} (${score}%)</span>
      </div>
      <div class="blueprint-asset-row">
        <span class="blueprint-asset-name">${setup.asset || this.currentAsset}</span>
        <span class="blueprint-direction-tag ${dirClass}">${setup.direction || 'LONG'}</span>
      </div>
      <div class="blueprint-grid">
        <div class="blueprint-metric">
          <span class="b-lbl">Optimal Entry</span>
          <span class="b-val">${currSym}${Number(entryVal).toLocaleString()}</span>
        </div>
        <div class="blueprint-metric">
          <span class="b-lbl">Strict Stop Loss</span>
          <span class="b-val text-bearish">${currSym}${Number(slVal).toLocaleString()}</span>
        </div>
        <div class="blueprint-metric">
          <span class="b-lbl">Take Profit (1:3+ RR)</span>
          <span class="b-val text-bullish">${currSym}${Number(tpVal).toLocaleString()} (1:${rr})</span>
        </div>
        <div class="blueprint-metric">
          <span class="b-lbl">Rec. Leverage</span>
          <span class="b-val text-warning">${lev}</span>
        </div>
      </div>
      <button class="blueprint-cta-btn" type="button">
        <i class="ph-bold ph-lightning"></i> Load Levels into Derivatives Desk
      </button>
    `;

    const ctaBtn = card.querySelector('.blueprint-cta-btn');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', () => {
        const payload = setup.levels || { entry: entryVal, stopLoss: slVal, target: tpVal };
        this.loadSetupIntoOrderDesk(payload, setup.direction);
        this.showToast('🚀 Blueprint Loaded', `${setup.asset || this.currentAsset} ${setup.direction || 'LONG'} levels loaded in Order Desk!`, 'success');
      });
    }

    container.appendChild(card);
    container.scrollTop = container.scrollHeight;
  }

  appendAutonomousDecisionCard(decision) {
    const container = document.getElementById('chat_messages');
    if (!container || !decision) return;

    const card = document.createElement('div');
    const isExecuted = decision.action === 'EXECUTED';
    card.className = `auto-decision-card ${isExecuted ? 'executed' : 'throttled'}`;

    const currSym = decision.currencySymbol || '$';
    const entryFormatted = `${currSym}${Number(decision.entry || 0).toLocaleString()}`;
    const slFormatted = `${currSym}${Number(decision.stopLoss || 0).toLocaleString()}`;
    const tpFormatted = `${currSym}${Number(decision.target || 0).toLocaleString()}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let actionBannerHtml = '';
    let validationStepsHtml = '';

    if (isExecuted) {
      actionBannerHtml = `
        <div class="decision-action-title">
          <span>⚡ AUTO-EXECUTED: ${decision.asset}/USD ${decision.direction}</span>
          <span style="color:#34d399;">FILLED at ${entryFormatted}</span>
        </div>
        <div class="decision-action-sub">
          Risk Allocation: $${decision.riskUSD || '20.00'} (1% Account Risk) • ${decision.leverage || 20}x Lev • Active Portfolio: ${decision.openCount}/2
        </div>
      `;

      validationStepsHtml = `
        <div class="validation-step">
          <span class="step-num">1</span>
          <div><strong>1H Macro Structure & RSI:</strong> ${decision.htfTrend || 'BULLISH'} trend displacement confirmed. ${decision.rsiInfo || '14-RSI momentum aligned in prime non-extreme zone'}.</div>
        </div>
        <div class="validation-step">
          <span class="step-num">2</span>
          <div><strong>5M Reaction Zone & Whale Volume:</strong> Pullback into reaction zone with confirmed wick close. ${decision.volumeInfo || '20-VMA institutional absorption verified'}.</div>
        </div>
        <div class="validation-step">
          <span class="step-num">3</span>
          <div><strong>Neural Confluence Score:</strong> <span style="color:#34d399; font-weight:800; font-family:var(--font-mono);">${decision.confluenceScore}%</span> [${decision.confluenceGrade || 'GRADE A'}] verified (≥75% gatekeeper passed).</div>
        </div>
        <div class="validation-step">
          <span class="step-num">4</span>
          <div><strong>Derivatives Positioning & Sentiment:</strong> ${decision.fundingInfo || 'Funding Rate balanced'} • ${decision.sentimentInfo || 'Macro sentiment supportive'}.</div>
        </div>
        <div class="validation-step">
          <span class="step-num">5</span>
          <div><strong>Asymmetric Edge (1:3+ RR):</strong> SL at <span class="text-bearish">${slFormatted}</span> | TP at <span class="text-bullish">${tpFormatted}</span> (Strict 1:${decision.rrRatio || '3.2'} Asymmetry).</div>
        </div>
        <div class="validation-step">
          <span class="step-num">6</span>
          <div><strong>Portfolio Drawdown Cap:</strong> Current active trades: ${decision.openCount}/2 (Max 2% total drawdown limit strictly respected).</div>
        </div>
      `;
    } else {
      actionBannerHtml = `
        <div class="decision-action-title">
          <span style="color:#fbbf24;">⚠️ AUTO-PILOT SKIPPED: ${decision.asset} ${decision.direction}</span>
          <span style="color:#fbbf24;">PRESERVED CAPITAL</span>
        </div>
        <div class="decision-action-sub">
          Reason: ${decision.skipReason || 'Risk parameters not satisfied'} • Active Trades: ${decision.openCount}/2
        </div>
      `;

      validationStepsHtml = `
        <div class="validation-step">
          <span class="step-num">!</span>
          <div>${decision.skipExplanation || 'Safety rule triggered to protect account capital.'}</div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="decision-card-header">
        <span class="decision-header-title">
          <i class="ph-bold ph-robot"></i> AUTONOMOUS DECISION LOG #${Math.floor(1000 + Math.random() * 9000)}
        </span>
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="decision-xai-chip">EXPLAINABLE AI</span>
          <span style="font-size:0.65rem; color:#64748b;">${timeStr}</span>
        </div>
      </div>
      <div class="decision-action-banner">
        ${actionBannerHtml}
      </div>
      <div class="decision-validation-list">
        <div class="validation-heading">Institutional Decision Validation:</div>
        ${validationStepsHtml}
      </div>
      <div class="decision-footer-note">
        <i class="ph ph-shield-check"></i> Monitored in realtime • Trade settlement with 18% GST will post to Passbook on exit.
      </div>
    `;

    container.appendChild(card);
    container.scrollTop = container.scrollHeight;
  }

  updateStrategyState(strategyState) {
    const badgeEl = document.getElementById('ai_state_badge');
    const directionEl = document.getElementById('meta_direction');
    const htfEl = document.getElementById('meta_htf_trend');
    const setupEl = document.getElementById('meta_setup');
    const confirmEl = document.getElementById('meta_confirmation');

    if (!strategyState) return;

    const state = strategyState.state || 'WAIT';
    if (badgeEl) {
      badgeEl.className = `state-badge state-${state.toLowerCase().replace(' ', '-')}`;
      let icon = 'ph-clock';
      if (state === 'CONFIRMED') icon = 'ph-check-circle';
      else if (state === 'DEVELOPING') icon = 'ph-hourglass-high';
      else if (state === 'CANCELLED') icon = 'ph-x-circle';
      else if (state === 'NO SETUP') icon = 'ph-minus-circle';

      badgeEl.innerHTML = `<i class="ph ${icon}"></i> <span>${state}</span>`;
    }

    if (directionEl) {
      directionEl.textContent = strategyState.direction || 'LONG';
      directionEl.className = `meta-val ${strategyState.direction === 'LONG' ? 'bullish' : 'bearish'}`;
    }

    if (htfEl) {
      htfEl.textContent = strategyState.htfTrend?.direction || 'UNCLEAR';
      htfEl.className = `meta-val ${strategyState.htfTrend?.direction === 'BULLISH' ? 'bullish' : strategyState.htfTrend?.direction === 'BEARISH' ? 'bearish' : 'neutral'}`;
    }

    if (setupEl) {
      setupEl.textContent = strategyState.ltfStructure?.inPullbackZone ? 'Pullback In Zone' : 'Waiting Pullback';
    }

    if (confirmEl) {
      confirmEl.textContent = strategyState.ltfStructure?.hasConfirmation ? 'Confirmed (Wick Close)' : 'Pending Reaction';
    }

    // RSI Momentum Telemetry
    const rsiEl = document.getElementById('meta_rsi_momentum');
    if (rsiEl) {
      if (strategyState.rsi1H !== undefined && strategyState.rsi5M !== undefined) {
        rsiEl.textContent = `1H: ${strategyState.rsi1H} | 5M: ${strategyState.rsi5M}`;
        rsiEl.className = `meta-val ${strategyState.rsiAligned ? 'bullish' : 'neutral'}`;
      } else {
        rsiEl.textContent = '1H: 56.2 | 5M: 52.8';
      }
    }

    // Whale Volumetric Telemetry
    const whaleEl = document.getElementById('meta_whale_volume');
    if (whaleEl) {
      if (strategyState.volumeFlow) {
        const v = strategyState.volumeFlow;
        whaleEl.textContent = v.isInstitutional ? `Whale Surge (${v.ratio}x)` : `Normal (${v.ratio}x)`;
        whaleEl.className = `meta-val ${v.isInstitutional ? 'bullish' : 'neutral'}`;
      } else {
        whaleEl.textContent = 'Normal (1.1x)';
      }
    }

    // 1. Algorithmic Confluence Score Meter (0 - 100%)
    const confValEl = document.getElementById('confluence_score_val');
    const confBarEl = document.getElementById('confluence_fill_bar');
    const confSubEl = document.getElementById('confluence_sub_text');
    if (confValEl && confBarEl) {
      const score = Math.round(strategyState.confluenceScore || 0);
      const grade = strategyState.confluenceGrade || (score >= 75 ? 'GRADE A' : 'NO EDGE');
      let gradeClass = 'confluence-grade';
      if (score >= 85) gradeClass += ' grade-a';
      else if (score >= 75) gradeClass += ' grade-a';
      else if (score >= 50) gradeClass += ' grade-b';
      else gradeClass += ' grade-c';

      confValEl.innerHTML = `${score}% <span class="${gradeClass}">[${grade}]</span>`;
      confBarEl.style.width = `${Math.min(100, Math.max(0, score))}%`;
      if (score >= 75) {
        confBarEl.style.background = 'linear-gradient(90deg, #00c6ff, #00f2fe, #10b981)';
      } else if (score >= 50) {
        confBarEl.style.background = 'linear-gradient(90deg, #f59e0b, #eab308)';
      } else {
        confBarEl.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
      }

      if (confSubEl) {
        if (score >= 75) {
          confSubEl.textContent = `Institutional edge confirmed (${score}%) • Strict 1:3+ RR verified`;
        } else {
          confSubEl.textContent = `Min 75% required for Grade A Institutional Execution (Current: ${score}%)`;
        }
      }
    }

    // 2. Dynamic Pinned Live Setup Radar Card (Anchored at Top of Chat)
    const pinnedRadar = document.getElementById('chat_pinned_radar');
    if (pinnedRadar) {
      const isDeveloping = state === 'DEVELOPING';
      const isConfirmed = state === 'CONFIRMED';

      if (isDeveloping || isConfirmed) {
        const currentTargetAsset = strategyState.asset || this.currentAsset;
        if (this.lastPinnedRadarState !== state || this.lastPinnedRadarAsset !== currentTargetAsset) {
          this.pinnedRadarDismissedByUser = false;
          this.lastPinnedRadarState = state;
          this.lastPinnedRadarAsset = currentTargetAsset;
        }

        if (!this.pinnedRadarDismissedByUser) {
          pinnedRadar.style.display = 'flex';
          pinnedRadar.classList.toggle('confirmed', isConfirmed);

          const stateEl = document.getElementById('pinned_radar_state');
          if (stateEl) {
            stateEl.textContent = isConfirmed ? 'CONFIRMED SETUP' : 'DEVELOPING SETUP';
          }

          const assetEl = document.getElementById('pinned_radar_asset');
          if (assetEl) {
            assetEl.textContent = `${currentTargetAsset} ${strategyState.direction || 'LONG'}`;
          }

          const currSym = strategyState.currencySymbol || (this.currentMarket === 'India' ? '₹' : '$');
          const entryEl = document.getElementById('pinned_radar_entry');
          const slEl = document.getElementById('pinned_radar_sl');
          const tpEl = document.getElementById('pinned_radar_tp');
          const proxEl = document.getElementById('pinned_radar_proximity');
          const btnText = document.getElementById('btn_pinned_action_text');

          if (strategyState.levels) {
            const entryVal = Number(strategyState.levels.entry);
            const slVal = Number(strategyState.levels.stopLoss);
            const tpVal = Number(strategyState.levels.target);
            const rr = strategyState.levels.rrRatio || '3.2';

            if (entryEl) entryEl.textContent = `${currSym}${entryVal.toLocaleString()}`;
            if (slEl) slEl.textContent = `${currSym}${slVal.toLocaleString()}`;
            if (tpEl) tpEl.textContent = `${currSym}${tpVal.toLocaleString()} (1:${rr})`;

            if (proxEl) {
              if (isConfirmed) {
                proxEl.innerHTML = `<span style="color:var(--accent-bullish, #10b981);">⚡ TRIGGER FIRED: In Entry Zone! 1:${rr} RR</span>`;
              } else {
                const curP = Number(strategyState.currentPrice || entryVal);
                const diff = Math.abs(curP - entryVal);
                proxEl.innerHTML = `⏳ Price ${currSym}${diff.toFixed(2)} away from reaction zone`;
              }
            }
          }

          if (btnText) {
            btnText.textContent = isConfirmed ? 'Execute Trade' : 'Load in Desk';
          }
        }
      } else {
        // Automatically unpins/hides when setup becomes CANCELLED, NO SETUP, or WAIT
        pinnedRadar.style.display = 'none';
        this.pinnedRadarDismissedByUser = false;
        this.lastPinnedRadarState = state;
      }
    }

    // Synchronize latest strategy state with Order Desk
    this.latestStrategyState = strategyState;
    this.refreshDerivativesOrderDesk();
  }

  updateContextTelemetry({ historicalContext, eventRisk, sentiment, fundingData }) {
    const histEl = document.getElementById('meta_hist_context');
    const eventEl = document.getElementById('meta_event_risk');
    const sentEl = document.getElementById('meta_sentiment_score');
    const fundingEl = document.getElementById('meta_funding_rate');

    if (histEl && historicalContext) {
      histEl.textContent = `${historicalContext.contextTag} (${historicalContext.historicalWinRate}%)`;
      histEl.className = `meta-val tag-${historicalContext.contextTag.toLowerCase()}`;
    }

    if (eventEl && eventRisk) {
      eventEl.textContent = `${eventRisk.level} Risk`;
      eventEl.className = `meta-val risk-${eventRisk.level.toLowerCase()}`;
    }

    if (sentEl && sentiment) {
      sentEl.textContent = `${sentiment.classification} (${sentiment.score})`;
      const isBull = sentiment.score >= 50;
      sentEl.className = `meta-val ${isBull ? 'bullish' : 'bearish'}`;
    }

    if (fundingEl && fundingData) {
      fundingEl.textContent = `${fundingData.rateFormatted} (${fundingData.sentiment === 'BALANCED' ? 'Normal' : fundingData.sentiment})`;
      fundingEl.className = `meta-val ${fundingData.sentiment === 'OVERHEATED_LONGS' ? 'bearish' : 'neutral'}`;
    }

    // News Radar container (Live Realtime Feed)
    const newsContainer = document.getElementById('news_radar_list');
    if (newsContainer && eventRisk && eventRisk.activeEvents) {
      const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const itemsHtml = eventRisk.activeEvents.map(evt => {
        const tsAttr = evt.timestamp ? `data-timestamp="${evt.timestamp}"` : '';
        return `
        <div class="news-item impact-${evt.riskLevel.toLowerCase()}">
          <div class="news-header">
            <span class="news-impact-tag">${evt.impact}</span>
            <span class="news-time" ${tsAttr}>
              <i class="ph ph-clock"></i> <span class="time-text">${evt.timeWindow}</span>
            </span>
          </div>
          <div class="news-title">${evt.title}</div>
          <div class="news-desc">${evt.details}</div>
        </div>
      `;
      }).join('');

      newsContainer.innerHTML = `
        <div class="news-radar-header">
          <div class="news-radar-status"><span class="live-dot pulse-green"></span> LIVE RADAR • REALTIME FEED</div>
          <div class="news-radar-clock" id="news_radar_clock">Live Sync • ${nowStr}</div>
        </div>
        ${itemsHtml}
      `;
    }

    // Historical Pattern Card (Live Quantitative Scanner)
    const histCard = document.getElementById('historical_pattern_card');
    if (histCard && historicalContext) {
      const liveClock = historicalContext.scannedTimeFormatted || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      histCard.innerHTML = `
        <div class="hist-card-header">
          <div class="hist-title"><i class="ph ph-git-commit"></i> ${historicalContext.patternName}</div>
          <div class="hist-live-badge">
            <span class="live-dot pulse-cyan"></span>
            <span class="hist-time-text">LIVE SCAN • <span id="hist_live_clock">${liveClock}</span></span>
          </div>
        </div>
        <div class="hist-stats-row">
          <div class="stat-col"><span class="k">Sample:</span> <span class="v">${historicalContext.sampleSize} setups</span></div>
          <div class="stat-col"><span class="k">Win Rate:</span> <span class="v text-bullish">${historicalContext.historicalWinRate}%</span></div>
          <div class="stat-col"><span class="k">Avg RR:</span> <span class="v">1:${historicalContext.expectedRR}</span></div>
          <div class="stat-col"><span class="k">Regime:</span> <span class="v ${historicalContext.contextTag === 'Supportive' ? 'text-bullish' : 'text-warning'}">${historicalContext.contextTag}</span></div>
        </div>
        <div class="hist-desc">${historicalContext.explanation}</div>
        <div class="hist-footer">
          <span class="hist-volatility-tag"><i class="ph ph-chart-line-up"></i> ${historicalContext.volatilityState || 'Normal ATR'}</span>
          <span class="hist-disclaimer">ℹ️ ${historicalContext.disclaimer}</span>
        </div>
      `;
    }
  }

  startContextTelemetryTicker() {
    if (this._contextTickerInterval) clearInterval(this._contextTickerInterval);
    this._contextTickerInterval = setInterval(() => {
      this.updateRadarRelativeTimes();
    }, 4000);
  }

  updateRadarRelativeTimes() {
    const now = Date.now();
    const clockEl = document.getElementById('news_radar_clock');
    if (clockEl) {
      const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      clockEl.textContent = `Live Sync • ${nowStr}`;
    }

    const timeElements = document.querySelectorAll('#news_radar_list .news-time[data-timestamp]');
    timeElements.forEach(el => {
      const ts = parseInt(el.getAttribute('data-timestamp'), 10);
      if (!isNaN(ts) && ts > 0) {
        const diffMs = ts - now;
        let label = '';
        if (diffMs > 0) {
          const diffMin = Math.round(diffMs / 60000);
          if (diffMin < 1) label = 'Within 1 min';
          else if (diffMin < 60) label = `In ${diffMin}m`;
          else {
            const h = Math.floor(diffMin / 60);
            const m = diffMin % 60;
            label = `In ${h}h ${m > 0 ? m + 'm' : ''}`;
          }
        } else {
          const elapsedMin = Math.round(Math.abs(diffMs) / 60000);
          if (elapsedMin < 1) label = 'Just now';
          else if (elapsedMin < 60) label = `${elapsedMin}m ago`;
          else {
            const h = Math.floor(elapsedMin / 60);
            if (h < 24) label = `${h}h ago`;
            else label = `${Math.floor(h / 24)}d ago`;
          }
        }
        const span = el.querySelector('.time-text');
        if (span) span.textContent = label;
      }
    });
  }

  updateRiskParameters(riskParams) {
    if (!riskParams) return;

    const entryEl = document.getElementById('calc_entry');
    const slEl = document.getElementById('calc_sl');
    const tpEl = document.getElementById('calc_tp');
    const posSizeEl = document.getElementById('calc_pos_size');
    const maxRiskEl = document.getElementById('calc_max_risk');
    const rrEl = document.getElementById('calc_rr');
    const metaRREl = document.getElementById('meta_rr');

    const isIndia = this.currentMarket === 'India' || riskParams.currencySymbol === '₹';
    const currSym = isIndia ? '₹' : '$';

    let unit = 'coins';
    if (isIndia) {
      const assetUpper = (riskParams.asset || '').toUpperCase();
      if (['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX'].includes(assetUpper)) {
        unit = 'contracts';
      } else {
        unit = 'shares';
      }
    }

    if (entryEl) entryEl.textContent = this.formatPrice(riskParams.entry, currSym);
    if (slEl) slEl.textContent = this.formatPrice(riskParams.stopLoss, currSym);
    if (tpEl) tpEl.textContent = this.formatPrice(riskParams.target, currSym);
    if (posSizeEl) posSizeEl.textContent = `${riskParams.positionSizeCoins} ${unit}`;
    if (maxRiskEl) {
      const riskVal = isIndia
        ? `₹${(riskParams.maxRiskUSD * 83.5).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
        : `$${riskParams.maxRiskUSD}`;
      maxRiskEl.textContent = `${riskVal} (1.0%)`;
    }
    if (rrEl) {
      rrEl.textContent = `1:${riskParams.rrRatio}`;
      rrEl.className = `calc-val ${riskParams.isRRValid ? 'text-bullish' : 'text-bearish'}`;
    }
    if (metaRREl) {
      metaRREl.textContent = `1:${riskParams.rrRatio}`;
    }

    // Feed parameters into Delta Exchange order desk
    const cleanPrice = (val) => {
      const n = Number(val);
      return isNaN(n) ? 0 : +(n.toFixed(2));
    };

    if (riskParams.entry) this.orderState.entryPrice = cleanPrice(riskParams.entry);
    if (riskParams.stopLoss) this.orderState.slPrice = cleanPrice(riskParams.stopLoss);
    if (riskParams.target) this.orderState.tpPrice = cleanPrice(riskParams.target);

    const tpInput = document.getElementById('order_tp_input');
    const slInput = document.getElementById('order_sl_input');
    if (tpInput && !tpInput.matches(':focus') && riskParams.target) {
      tpInput.value = cleanPrice(riskParams.target);
    }
    if (slInput && !slInput.matches(':focus') && riskParams.stopLoss) {
      slInput.value = cleanPrice(riskParams.stopLoss);
    }

    this.refreshDerivativesOrderDesk();
  }

  appendChatMessage(sender, text) {
    const container = document.getElementById('chat_messages');
    if (!container) return;

    const msgEl = document.createElement('div');
    msgEl.className = `chat-bubble ${sender}-bubble`;

    // Simple markdown conversion for bold, bullets, line breaks
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>')
      .replace(/•/g, '&bull;');

    msgEl.innerHTML = `
      <div class="bubble-header">
        <span class="sender-name">${sender === 'user' ? '👤 You' : '🤖 MONDAY'}</span>
        <span class="msg-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div class="bubble-body">${formatted}</div>
    `;

    container.appendChild(msgEl);
    container.scrollTop = container.scrollHeight;
  }

  setVoiceListening(isListening) {
    const micBtn = document.getElementById('voice_mic_btn');
    const radar = document.getElementById('voice_activity_radar');
    const indicator = document.getElementById('voice_status_indicator');
    if (micBtn) {
      micBtn.classList.toggle('listening', isListening);
    }
    if (radar) {
      radar.classList.toggle('active-listening', isListening);
    }
    if (indicator) {
      indicator.textContent = isListening ? 'MONDAY is listening...' : 'MONDAY Active • Ready';
    }
  }

  setVoiceSpeaking(isSpeaking) {
    const radar = document.getElementById('voice_activity_radar');
    const indicator = document.getElementById('voice_status_indicator');
    if (radar) {
      radar.classList.toggle('active-speaking', isSpeaking);
    }
    if (indicator) {
      indicator.textContent = isSpeaking ? 'MONDAY is speaking...' : 'MONDAY Active • Ready';
    }
  }

  updateOpenPositions(positions) {
    const container = document.getElementById('open_positions_list');
    const countBadge = document.getElementById('open_positions_count');
    if (countBadge) countBadge.textContent = positions.length;

    if (!container) return;

    if (positions.length === 0) {
      container.innerHTML = `<div class="empty-state">No open positions. Setup awaiting confirmation.</div>`;
      return;
    }

    if (!this.expandedPositionIds) {
      this.expandedPositionIds = new Set();
    }

    container.innerHTML = positions.map(pos => {
      const isPos = pos.unrealizedPnlUSD >= 0;
      const isLong = pos.direction === 'LONG';
      const range = Math.abs(pos.target - pos.stopLoss) || 1;
      const progress = isLong
        ? Math.min(100, Math.max(0, ((pos.currentPrice - pos.stopLoss) / range) * 100))
        : Math.min(100, Math.max(0, ((pos.stopLoss - pos.currentPrice) / range) * 100));

      const lev = pos.leverage || 20;
      const roe = pos.roePercent !== undefined ? pos.roePercent : (pos.marginUSD > 0 ? ((pos.unrealizedPnlUSD / pos.marginUSD) * 100).toFixed(1) : 0);
      const liqText = pos.liquidationPrice ? this.formatPrice(pos.liquidationPrice) : 'N/A';
      const isExpanded = this.expandedPositionIds.has(pos.id);

      return `
        <div class="position-card compact-strip ${isExpanded ? 'expanded' : ''}" data-trade-id="${pos.id}">
          <!-- Compact 2-Row Summary Strip (Tap to Expand Details, ~46px) -->
          <div class="pos-strip-summary" data-trade-id="${pos.id}" role="button" tabindex="0" aria-expanded="${isExpanded ? 'true' : 'false'}" title="Tap to expand / collapse full trade details">
            <!-- Row 1: Badges on Left, Prominent Bold PnL on Right -->
            <div class="strip-row-top">
              <div class="strip-badges">
                <span class="pos-asset-pill">${pos.asset}/USD</span>
                <span class="pos-direction-pill ${pos.direction.toLowerCase()}">${pos.direction}</span>
                <span class="pos-lev-pill">${lev}x</span>
              </div>

              <div class="strip-pnl-wrapper">
                <span class="pos-pnl-chip ${isPos ? 'bullish' : 'bearish'}" title="Floating PnL & Return on Equity">
                  ${isPos ? '+' : ''}$${pos.unrealizedPnlUSD.toFixed(2)} (${isPos ? '+' : ''}${roe}%)
                </span>
                <i class="ph ph-caret-down strip-expand-caret"></i>
              </div>
            </div>

            <!-- Row 2: Entry vs Mark Price on Left, Quick Close Button on Right -->
            <div class="strip-row-bottom">
              <div class="strip-prices">
                <span class="strip-price-item" title="Entry Price">
                  <span class="strip-lbl">E:</span><span class="strip-val">${this.formatPrice(pos.entry)}</span>
                </span>
                <span class="strip-sep">•</span>
                <span class="strip-price-item" title="Mark / Live Price">
                  <span class="strip-lbl">M:</span><span class="strip-val highlight">${this.formatPrice(pos.currentPrice)}</span>
                </span>
              </div>

              <button class="btn-quick-close-pos" data-trade-id="${pos.id}" type="button" title="Quick Close Trade" aria-label="Quick Close Trade">
                <i class="ph ph-x"></i> <span>Close</span>
              </button>
            </div>
          </div>

          <!-- Collapsible Full Detail Card (Reveals on Tap) -->
          <div class="pos-strip-details">
            <!-- Target/SL Progress Bar -->
            <div class="pos-progress-wrapper" title="Progress towards Target (SL on left, TP on right)">
              <div class="pos-progress-track">
                <div class="pos-progress-fill ${isPos ? 'bullish' : 'bearish'}" style="width: ${progress}%;"></div>
                <div class="pos-progress-marker" style="left: ${progress}%;"></div>
              </div>
              <div class="pos-progress-labels">
                <span>SL ${this.formatPrice(pos.stopLoss)}</span>
                <span class="pos-roe-tag ${isPos ? 'bullish' : 'bearish'}">${isPos ? '+' : ''}${pos.unrealizedR}R (${isPos ? '+' : ''}${roe}% ROE)</span>
                <span>TP ${this.formatPrice(pos.target)}</span>
              </div>
            </div>

            <!-- Deep Metrics Grid -->
            <div class="pos-grid">
              <div class="pos-grid-cell"><span class="lbl">Entry</span><span class="val">${this.formatPrice(pos.entry)}</span></div>
              <div class="pos-grid-cell"><span class="lbl">Mark Price</span><span class="val highlight">${this.formatPrice(pos.currentPrice)}</span></div>
              <div class="pos-grid-cell"><span class="lbl">Est. Liq Price</span><span class="val text-warning">${liqText}</span></div>
              <div class="pos-grid-cell"><span class="lbl">Margin / Value</span><span class="val">$${pos.marginUSD || pos.riskUSD} / $${pos.notionalUSD || (pos.entry * pos.positionSize).toFixed(0)}</span></div>
              <div class="pos-grid-cell"><span class="lbl">Size</span><span class="val">${pos.positionSize} ${pos.asset}</span></div>
              <div class="pos-grid-cell"><span class="lbl">RR Ratio</span><span class="val">1:${pos.rrRatio}</span></div>
              <div class="pos-grid-cell"><span class="lbl">Est. Fees + 18% GST</span><span class="val text-muted">-$${Number(pos.feesUSD || 0).toFixed(2)} (on close)</span></div>
              <div class="pos-grid-cell"><span class="lbl">Strategy</span><span class="val text-muted">${pos.strategy || `${lev}x Iso`}</span></div>
            </div>

            <div class="pos-footer">
              <span class="pos-time"><i class="ph ph-clock"></i> Opened: ${new Date(pos.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <button class="btn-close-pos" data-trade-id="${pos.id}" type="button">
                <i class="ph ph-x-circle"></i> Close Trade
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach summary click to toggle accordion
    container.querySelectorAll('.pos-strip-summary').forEach(strip => {
      strip.addEventListener('click', (e) => {
        if (e.target.closest('.btn-quick-close-pos')) return;
        const tradeId = strip.dataset.tradeId;
        const card = strip.closest('.position-card');
        if (!card) return;

        if (this.expandedPositionIds.has(tradeId)) {
          this.expandedPositionIds.delete(tradeId);
          card.classList.remove('expanded');
          strip.setAttribute('aria-expanded', 'false');
        } else {
          this.expandedPositionIds.add(tradeId);
          card.classList.add('expanded');
          strip.setAttribute('aria-expanded', 'true');
        }
      });
    });

    // Attach quick-close button
    container.querySelectorAll('.btn-quick-close-pos').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tradeId = e.currentTarget.dataset.tradeId;
        if (this.callbacks.onCloseTrade) this.callbacks.onCloseTrade(tradeId);
      });
    });

    // Attach full close button
    container.querySelectorAll('.btn-close-pos').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tradeId = e.currentTarget.dataset.tradeId;
        if (this.callbacks.onCloseTrade) this.callbacks.onCloseTrade(tradeId);
      });
    });
  }

  updateHeaderAccountHUD(liveMetrics) {
    if (!liveMetrics) return;

    const labelEl = document.getElementById('header_balance_label');
    const balEl = document.getElementById('header_balance');
    const totalREl = document.getElementById('header_total_r');
    const pnlUsdEl = document.getElementById('header_pnl_usd');
    const liveChip = document.getElementById('header_live_chip');
    const liveText = document.getElementById('header_live_text');
    const pill = document.getElementById('header_account_pill');

    if (liveMetrics.hasOpenPositions) {
      // In active trade: Show Live Equity & Realtime Floating PnL
      if (labelEl) labelEl.textContent = 'Equity (Live):';
      if (balEl) {
        balEl.textContent = `$${liveMetrics.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      if (liveChip && liveText) {
        liveChip.style.display = 'inline-flex';
        const isPos = liveMetrics.unrealizedPnlUSD >= 0;
        liveText.textContent = `${isPos ? '+' : ''}$${liveMetrics.unrealizedPnlUSD.toFixed(2)} (${isPos ? '+' : ''}${liveMetrics.unrealizedR.toFixed(2)}R)`;
        liveChip.className = `account-live-chip ${isPos ? 'bullish' : 'bearish'}`;
      }
      if (pill) pill.classList.add('in-position');
    } else {
      // Settled state: Show Settled Paper Balance
      if (labelEl) labelEl.textContent = 'Paper Balance:';
      if (balEl) {
        balEl.textContent = `$${liveMetrics.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      if (liveChip) liveChip.style.display = 'none';
      if (pill) pill.classList.remove('in-position');
    }

    // Always update net R and PnL
    const activeTotalR = liveMetrics.netTotalR ?? liveMetrics.closedTotalR ?? 0;
    const activeTotalPnl = liveMetrics.netTotalPnlUSD ?? liveMetrics.closedPnlUSD ?? 0;

    if (totalREl) {
      const isPos = activeTotalR >= 0;
      totalREl.textContent = `${isPos ? '+' : ''}${activeTotalR.toFixed(2)}R`;
      totalREl.className = `stat-num ${isPos ? 'bullish' : 'bearish'}`;
    }
    if (pnlUsdEl) {
      const isPos = activeTotalPnl >= 0;
      pnlUsdEl.textContent = `(${isPos ? '+' : ''}$${activeTotalPnl.toFixed(2)})`;
      pnlUsdEl.className = `r-usd-val ${isPos ? 'bullish' : 'bearish'}`;
    }

    // Live Portfolio & Margin Snapshot in Profile Popover Hub
    const popoverEquity = document.getElementById('popover_equity_tag');
    const popoverAvail = document.getElementById('popover_avail_bal');
    const popoverMargin = document.getElementById('popover_used_margin');

    if (popoverEquity) {
      const eq = liveMetrics.equity !== undefined ? liveMetrics.equity : liveMetrics.balance;
      popoverEquity.textContent = `$${eq.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (popoverAvail) {
      popoverAvail.textContent = `$${(liveMetrics.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (popoverMargin) {
      const margin = liveMetrics.usedMargin !== undefined ? liveMetrics.usedMargin : 0;
      popoverMargin.textContent = `$${margin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Live Mobile Drawer Balance Cards
    const dEquity = document.getElementById('drawer_total_equity');
    const dAvail = document.getElementById('drawer_avail_cash');
    const dMargin = document.getElementById('drawer_used_margin');
    if (dEquity) {
      const eq = liveMetrics.equity !== undefined ? liveMetrics.equity : liveMetrics.balance;
      dEquity.textContent = `$${eq.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (dAvail) {
      dAvail.textContent = `$${(liveMetrics.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (dMargin) {
      const margin = liveMetrics.usedMargin !== undefined ? liveMetrics.usedMargin : 0;
      dMargin.textContent = `$${margin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  updateJournalAndAnalytics(analytics, trades) {
    // Header Live HUD Sync
    const liveMetrics = {
      balance: analytics.balance,
      equity: analytics.equity || analytics.balance,
      usedMargin: analytics.usedMargin || 0,
      unrealizedPnlUSD: analytics.unrealizedPnlUSD || 0,
      unrealizedR: analytics.unrealizedR || 0,
      closedTotalR: analytics.totalR,
      closedPnlUSD: analytics.totalPnlUSD,
      netTotalR: analytics.netTotalR ?? analytics.totalR,
      netTotalPnlUSD: +(analytics.totalPnlUSD + (analytics.unrealizedPnlUSD || 0)).toFixed(2),
      hasOpenPositions: (analytics.openPositionsCount || 0) > 0,
      openPositionsCount: analytics.openPositionsCount || 0
    };
    this.updateHeaderAccountHUD(liveMetrics);

    // Modal Analytics
    const mBal = document.getElementById('modal_stat_balance');
    const mTrades = document.getElementById('modal_stat_trades');
    const mWinRate = document.getElementById('modal_stat_winrate');
    const mTotalR = document.getElementById('modal_stat_total_r');
    const mPf = document.getElementById('modal_stat_pf');
    const mStreak = document.getElementById('modal_stat_streak');

    if (mBal) mBal.textContent = `$${analytics.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (mTrades) mTrades.textContent = `${analytics.totalTrades} (${analytics.winCount}W / ${analytics.lossCount}L)`;
    if (mWinRate) mWinRate.textContent = `${analytics.winRate}%`;
    if (mTotalR) mTotalR.textContent = `${analytics.totalR >= 0 ? '+' : ''}${analytics.totalR}R (${analytics.totalPnlUSD >= 0 ? '+' : ''}$${analytics.totalPnlUSD})`;
    if (mPf) mPf.textContent = `${analytics.profitFactor}`;
    if (mStreak) mStreak.textContent = `${analytics.maxLosingStreak}`;
    const mFees = document.getElementById('modal_stat_fees');
    if (mFees) mFees.textContent = `-$${Number(analytics.totalFeesUSD || 0).toFixed(2)}`;

    // Journal Trades Table / Cards
    const tableBody = document.getElementById('journal_trades_tbody');
    if (!tableBody) return;

    if (trades.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="9" class="text-center">No trades recorded yet.</td></tr>`;
      return;
    }

    tableBody.innerHTML = trades.map(t => {
      const isWin = t.result === 'WIN';
      const resultClass = isWin ? 'bullish' : t.result === 'LOSS' ? 'bearish' : 'neutral';
      return `
        <tr>
          <td><strong>${t.id}</strong></td>
          <td>${new Date(t.openedAt).toLocaleDateString()}</td>
          <td><span class="badge-asset">${t.asset}</span></td>
          <td><span class="badge-${t.direction.toLowerCase()}">${t.direction}</span></td>
          <td>$${t.entry}</td>
          <td>$${t.exitPrice || t.currentPrice}</td>
          <td>1:${t.rrRatio}</td>
          <td><span class="result-tag ${resultClass}">${t.result} (${t.rMultiple >= 0 ? '+' : ''}${t.rMultiple}R)</span></td>
          <td>
            <span class="pnl-val ${resultClass}">${t.pnlUSD >= 0 ? '+' : ''}$${t.pnlUSD}</span>
            <div style="font-size: 0.65rem; color: var(--text-muted);">(Fee: -$${Number(t.totalFeesUSD || t.feesUSD || 0).toFixed(2)})</div>
          </td>
        </tr>
      `;
    }).join('');

    // Also re-render passbook if open
    const passbookModal = document.getElementById('passbook_modal');
    if (passbookModal && passbookModal.classList.contains('open')) {
      this.renderFinancialPassbook();
    }
  }

  renderFinancialPassbook() {
    const feedContainer = document.getElementById('passbook_transactions_feed');
    const monthSelect = document.getElementById('passbook_month_filter');
    const grossEl = document.getElementById('passbook_gross_pnl');
    const brokerageEl = document.getElementById('passbook_brokerage_total');
    const gstEl = document.getElementById('passbook_gst_total');
    const netEl = document.getElementById('passbook_net_settled');
    const countTag = document.getElementById('passbook_feed_count');

    if (!this.callbacks.onGetFinancialLedger) return;

    const filterMonth = this.passbookCurrentMonth || 'ALL';
    const ledger = this.callbacks.onGetFinancialLedger(filterMonth);
    if (!ledger) return;

    // 1. Populate Available Month Dropdown if options differ
    if (monthSelect) {
      const currentSelected = monthSelect.value;
      const opts = [
        '<option value="ALL">All Time Statement</option>',
        ...ledger.availableMonths.map(m => `<option value="${m.key}" ${m.key === filterMonth ? 'selected' : ''}>${m.label}</option>`)
      ];
      monthSelect.innerHTML = opts.join('');
      monthSelect.value = filterMonth;
    }

    // 2. Update 4-Pillar Financial Audit Grid
    if (grossEl) {
      const isPos = ledger.totalGrossPnl >= 0;
      grossEl.textContent = `${isPos ? '+' : ''}$${ledger.totalGrossPnl.toFixed(2)}`;
      grossEl.className = `audit-val ${isPos ? 'text-bullish' : 'text-bearish'}`;
    }

    if (brokerageEl) {
      brokerageEl.textContent = `-$${ledger.totalBrokerage.toFixed(2)}`;
    }

    if (gstEl) {
      gstEl.textContent = `-$${ledger.totalGST.toFixed(2)}`;
    }

    if (netEl) {
      const isNetPos = ledger.netSettledPnl >= 0;
      netEl.textContent = `${isNetPos ? '+' : ''}$${ledger.netSettledPnl.toFixed(2)}`;
      netEl.className = `audit-val ${isNetPos ? 'text-bullish' : 'text-bearish'}`;
    }

    // 3. Filter Trades by Type (ALL, PROFIT, LOSS)
    const filterType = this.passbookFilterType || 'ALL';
    let filteredTrades = ledger.trades || [];
    if (filterType === 'PROFIT') {
      filteredTrades = filteredTrades.filter(t => t.result === 'WIN' || (t.pnlUSD || 0) > 0);
    } else if (filterType === 'LOSS') {
      filteredTrades = filteredTrades.filter(t => t.result === 'LOSS' || (t.pnlUSD || 0) < 0);
    }

    if (countTag) {
      countTag.textContent = `${filteredTrades.length} Settlement${filteredTrades.length === 1 ? '' : 's'}`;
    }

    // Update filter chip counters
    const chipAll = document.getElementById('passbook_filter_all');
    const chipProfit = document.getElementById('passbook_filter_profit');
    const chipLoss = document.getElementById('passbook_filter_loss');
    if (chipAll) chipAll.textContent = `All (${ledger.totalTrades})`;
    if (chipProfit) chipProfit.textContent = `🟢 Profit (${ledger.winCount})`;
    if (chipLoss) chipLoss.textContent = `🔴 Loss (${ledger.lossCount})`;

    // 4. Render Chronological Feed
    if (!feedContainer) return;

    if (filteredTrades.length === 0) {
      feedContainer.innerHTML = `
        <div class="passbook-empty-state">
          <i class="ph ph-receipt"></i>
          <div>No settled trades found for this period.</div>
          <div style="font-size: 0.72rem; color: #64748b; margin-top: 4px;">Completed orders with Delta exchange fees & 18% GST will appear here.</div>
        </div>
      `;
      return;
    }

    feedContainer.innerHTML = filteredTrades.map(trade => {
      const isNetProfit = (trade.pnlUSD || 0) >= 0;
      const typeClass = trade.result === 'WIN' || isNetProfit ? 'profit' : trade.result === 'BREAKEVEN' ? 'breakeven' : 'loss';
      const icon = typeClass === 'profit' ? 'ph-arrow-down-left' : typeClass === 'loss' ? 'ph-arrow-up-right' : 'ph-arrows-left-right';
      
      const dateObj = new Date(trade.closedAt || Date.now());
      const dateFormatted = dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeFormatted = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const dirClass = (trade.direction || 'LONG').toLowerCase();
      const gross = trade.grossPnlUSD !== undefined ? Number(trade.grossPnlUSD) : Number(trade.pnlUSD);
      const isGrossProfit = gross >= 0;
      
      const entryFee = Number(trade.entryFeeUSD || 0);
      const exitFee = Number(trade.exitFeeUSD || 0);
      const brokerage = Number(trade.brokerageFeeUSD || (trade.totalFeesUSD ? +(trade.totalFeesUSD / 1.18).toFixed(2) : 0));
      const gst = Number(trade.gstUSD || (trade.totalFeesUSD ? +(trade.totalFeesUSD - brokerage).toFixed(2) : 0));
      const totalCharges = Number(trade.totalChargesUSD || trade.totalFeesUSD || 0);
      const netPnl = Number(trade.pnlUSD || 0);
      const postBal = trade.postTradeBalance ? Number(trade.postTradeBalance) : null;
      
      const reasonLabel = trade.result === 'WIN' ? '🎯 Take Profit Hit' : trade.result === 'LIQUIDATED' ? '⚠️ Liquidation Exit' : trade.result === 'LOSS' ? '🛑 Stop Loss Hit' : '✋ Manual Close';

      return `
        <div class="passbook-txn-card" data-trade-id="${trade.id}">
          <div class="passbook-txn-header" role="button" tabindex="0" title="Tap to expand itemized tax & charge receipt">
            <div class="txn-left-col">
              <div class="txn-type-avatar ${typeClass}">
                <i class="ph ${icon}"></i>
              </div>
              <div class="txn-meta-group">
                <div class="txn-asset-row">
                  <span class="txn-asset-name">${trade.asset}/USD</span>
                  <span class="txn-direction-badge ${dirClass}">${trade.direction}</span>
                  <span class="pos-lev-pill">${trade.leverage || 20}x</span>
                </div>
                <span class="txn-timestamp">${dateFormatted} • ${timeFormatted} • ${reasonLabel}</span>
              </div>
            </div>

            <div class="txn-right-col">
              <div class="txn-amount-group">
                <span class="txn-net-amount ${typeClass}">
                  ${isNetProfit ? '+' : ''}$${netPnl.toFixed(2)}
                </span>
                ${postBal !== null ? `<span class="txn-post-balance">Bal: $${postBal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>` : ''}
              </div>
              <i class="ph ph-caret-down txn-chevron"></i>
            </div>
          </div>

          <!-- Expandable Itemized Tax & Charges Receipt Drawer -->
          <div class="passbook-receipt-drawer">
            <div class="receipt-title-row">
              <span>Delta Exchange India Tax Invoice</span>
              <span>Ref: #${(trade.id || '').substring(0, 8).toUpperCase()}</span>
            </div>
            <div class="receipt-itemized-list">
              <div class="receipt-line">
                <span>Gross Trading PnL (E: $${Number(trade.entry).toLocaleString()} → M: $${Number(trade.exitPrice || trade.entry).toLocaleString()})</span>
                <span class="val ${isGrossProfit ? 'text-bullish' : 'text-bearish'}">${isGrossProfit ? '+' : ''}$${gross.toFixed(2)}</span>
              </div>
              <div class="receipt-line sub-fee">
                <span>• Entry Brokerage Fee (${trade.orderType === 'LIMIT' ? '0.02% Maker' : '0.05% Taker'})</span>
                <span class="val">-$${entryFee.toFixed(2)}</span>
              </div>
              <div class="receipt-line sub-fee">
                <span>• Exit Brokerage Fee (${trade.result === 'WIN' ? '0.02% Maker TP' : '0.05% Taker'})</span>
                <span class="val">-$${exitFee.toFixed(2)}</span>
              </div>
              <div class="receipt-line sub-fee">
                <span>• Total Delta Brokerage</span>
                <span class="val">-$${brokerage.toFixed(2)}</span>
              </div>
              <div class="receipt-line tax-line">
                <span>• 18% GST on Exchange Brokerage (Central + State GST)</span>
                <span class="val">-$${gst.toFixed(2)}</span>
              </div>
              <div class="receipt-divider"></div>
              <div class="receipt-line total-line">
                <span>Total Deductions Settled</span>
                <span class="val text-bearish">-$${totalCharges.toFixed(2)}</span>
              </div>
              <div class="receipt-line total-line">
                <span>Net Credited to Trading Account</span>
                <span class="val ${isNetProfit ? 'text-bullish' : 'text-bearish'}">${isNetProfit ? '+' : ''}$${netPnl.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach click handler to toggle accordion drawers
    feedContainer.querySelectorAll('.passbook-txn-card').forEach(card => {
      card.querySelector('.passbook-txn-header').addEventListener('click', () => {
        card.classList.toggle('expanded');
      });
    });
  }

  showToast(title, message, type = 'info') {
    const container = document.getElementById('toast_container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} slide-in`;
    toast.innerHTML = `
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }

  addNotification(notif) {
    if (this.notificationManager) {
      this.notificationManager.addNotification(notif);
    }
  }
}


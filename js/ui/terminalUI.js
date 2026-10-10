import { DerivativesEngine } from '../engine/derivativesEngine.js';

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
    this.orderState = {
      direction: 'LONG',
      leverage: 20,
      marginUSD: 20,
      orderType: 'MARKET',
      entryPrice: 65000,
      tpPrice: 66800,
      slPrice: 64150,
      availableBalance: 2000
    };

    this.bindEvents();
    this.bindDerivativesOrderDesk();
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
        searchResults.innerHTML = `<div class="search-empty-msg">No cryptocurrencies found matching query.</div>`;
        return;
      }
      searchResults.innerHTML = items.map(m => {
        const isPos = m.changePercent >= 0;
        const assetSymbol = m.baseAsset || m.symbol;
        const pairSub = m.name ? `${m.name} • ${m.exchange || 'NSE'}` : m.symbol;
        const isIndia = this.currentMarket === 'India' || m.exchange === 'NSE' || m.exchange === 'BSE';
        const formattedPrice = isIndia
          ? `₹${m.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : (m.price >= 1 ? `$${m.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${m.price.toFixed(6)}`);

        return `
          <button class="search-result-item" data-asset="${assetSymbol}" type="button">
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
          </button>
        `;
      }).join('');

      searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
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
        if (this.callbacks.onSearchCrypto) {
          const items = this.callbacks.onSearchCrypto(searchInput.value.trim());
          renderSearchResults(items);
          searchContainer.classList.add('open');
        }
      });

      searchInput.addEventListener('input', () => {
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

    // Market Selector (Crypto / Indian Market)
    document.querySelectorAll('.market-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const market = e.currentTarget.dataset.market;
        if (market !== 'Crypto' && market !== 'India') {
          this.showToast(`Market: ${market}`, 'US Market scheduled for Phase 4. Crypto & Indian Markets are active!', 'info');
          return;
        }
        this.currentMarket = market;
        document.querySelectorAll('.market-tab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        if (this.callbacks.onMarketChange) this.callbacks.onMarketChange(market);
      });
    });

    // Mobile Navigation Tabs Handler
    document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = e.currentTarget.dataset.target;
        document.querySelectorAll('.mobile-tab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // Toggle mobile active panel
        document.querySelectorAll('.terminal-panel').forEach(panel => {
          panel.classList.toggle('active-mobile-panel', panel.id === targetId);
        });
      });
    });

    // Quick Watchlist Pills
    document.querySelectorAll('.asset-pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.asset-pill-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const asset = e.currentTarget.dataset.asset;
        if (this.callbacks.onAssetChange) this.callbacks.onAssetChange(asset);
      });
    });

    // Watchlist Popover Tray Trigger & Close
    const watchlistTrayWrapper = document.getElementById('watchlist_tray_wrapper');
    const watchlistTrayBtn = document.getElementById('watchlist_tray_btn');
    const watchlistTrayClose = document.getElementById('watchlist_tray_close');

    if (watchlistTrayBtn && watchlistTrayWrapper) {
      watchlistTrayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        watchlistTrayWrapper.classList.toggle('open');
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
        const orderPacket = this.getOrderDeskPacket();
        if (this.callbacks.onExecuteTrade) this.callbacks.onExecuteTrade(orderPacket);
      });
    }

    // Reset Account Button
    const resetBtn = document.getElementById('reset_account_btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Kya tum account balance aur journal reset karna chahte ho?')) {
          if (this.callbacks.onResetAccount) this.callbacks.onResetAccount();
        }
      });
    }

    // Journal Modal Toggles
    const journalBtn = document.getElementById('open_journal_btn');
    const journalModal = document.getElementById('journal_modal');
    const closeJournalBtn = document.getElementById('close_journal_btn');

    if (journalBtn && journalModal) {
      journalBtn.addEventListener('click', () => {
        journalModal.classList.add('open');
      });
    }
    if (closeJournalBtn && journalModal) {
      closeJournalBtn.addEventListener('click', () => {
        journalModal.classList.remove('open');
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
        if (confirm('Kya aap logout karke account switch karna chahte hain?')) {
          if (this.callbacks.onSignOut) this.callbacks.onSignOut();
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
        this.orderState.direction = 'LONG';
        dirLongBtn.classList.add('active');
        dirShortBtn.classList.remove('active');
        if (execBtn) {
          execBtn.classList.remove('short');
          execBtn.classList.add('long');
        }
        this.refreshDerivativesOrderDesk();
      });

      dirShortBtn.addEventListener('click', () => {
        this.orderState.direction = 'SHORT';
        dirShortBtn.classList.add('active');
        dirLongBtn.classList.remove('active');
        if (execBtn) {
          execBtn.classList.remove('long');
          execBtn.classList.add('short');
        }
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

    // 4. Dual Size Inputs (Margin USDT <-> Coin Qty Sync)
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

    if (costEl) costEl.textContent = `${curr}${telemetry.marginUSD.toLocaleString()}`;
    if (notionalEl) notionalEl.textContent = `${curr}${telemetry.notionalUSD.toLocaleString()}`;
    if (liqEl) liqEl.textContent = telemetry.liquidationPrice > 0 ? this.formatPrice(telemetry.liquidationPrice) : 'N/A';
    if (rrEl) rrEl.textContent = telemetry.rrRatio > 0 ? `1:${telemetry.rrRatio}` : '1:2.65';

    if (tpRoeEl) {
      tpRoeEl.textContent = telemetry.tpROE > 0 
        ? `+${telemetry.tpROE}% ROE (+${curr}${telemetry.tpPnL})`
        : '+0.0% ROE';
    }

    if (slRoeEl) {
      slRoeEl.textContent = telemetry.slROE !== 0 
        ? `${telemetry.slROE}% ROE (-${curr}${Math.abs(telemetry.slPnL)})`
        : '-0.0% ROE';
    }

    if (execLabel) {
      const isLong = this.orderState.direction === 'LONG';
      execLabel.textContent = `${isLong ? 'Buy / Long' : 'Sell / Short'} ${this.currentAsset} [${telemetry.leverage}x]`;
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
    const avatarIcon = document.getElementById('user_avatar_icon');
    if (!nameEl) return;
    if (user) {
      nameEl.textContent = user.name || (user.email ? user.email.split('@')[0] : 'Guest Trader');
      if (avatarIcon) {
        avatarIcon.className = user.isGuest ? 'ph ph-user' : 'ph ph-check-circle';
      }
    } else {
      nameEl.textContent = 'Sign In';
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

  setActiveWatchlistAsset(asset) {
    let matched = false;
    document.querySelectorAll('.asset-pill-btn').forEach(b => {
      const isMatch = b.dataset.asset === asset;
      b.classList.toggle('active', isMatch);
      if (isMatch) matched = true;
    });

    // If selected asset is not already in top quick pills, dynamically add it and make it active
    if (!matched) {
      const container = document.getElementById('quick_watchlist_pills');
      if (container) {
        document.querySelectorAll('.asset-pill-btn').forEach(b => b.classList.remove('active'));
        const newBtn = document.createElement('button');
        newBtn.className = 'asset-pill-btn active';
        newBtn.dataset.asset = asset;
        newBtn.textContent = asset;
        newBtn.addEventListener('click', () => {
          document.querySelectorAll('.asset-pill-btn').forEach(b => b.classList.remove('active'));
          newBtn.classList.add('active');
          if (this.callbacks.onAssetChange) this.callbacks.onAssetChange(asset);
        });
        container.appendChild(newBtn);
      }
    }
  }

  setMarket(market, defaultAssets = []) {
    this.currentMarket = market;

    document.querySelectorAll('.market-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.market === market);
    });

    const searchInput = document.getElementById('crypto_search_input');
    if (searchInput) {
      searchInput.placeholder = market === 'India'
        ? 'Search 150+ Indian stocks & IPOs (NIFTY, RELIANCE, SWIGGY, HYUNDAI)...'
        : 'Search 700+ cryptos (ETH, DOGE, SOL, BNB)...';
      searchInput.value = '';
    }

    const sourceBadge = document.getElementById('feed_source_badge');
    if (sourceBadge) {
      sourceBadge.textContent = market === 'India' ? 'NSE-Live Feed' : 'Live WebSocket';
    }

    const container = document.getElementById('quick_watchlist_pills');
    const pinnedAssets = defaultAssets.slice(0, 3);
    if (container && pinnedAssets.length > 0) {
      container.innerHTML = pinnedAssets.map((asset, index) => `
        <button class="asset-pill-btn ${index === 0 ? 'active' : ''}" data-asset="${asset}">${asset}</button>
      `).join('');

      container.querySelectorAll('.asset-pill-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          container.querySelectorAll('.asset-pill-btn').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          const asset = e.currentTarget.dataset.asset;
          if (this.callbacks.onAssetChange) this.callbacks.onAssetChange(asset);
        });
      });
    }

    this.renderWatchlistTray(market);
  }

  renderWatchlistTray(market) {
    const trayBody = document.getElementById('watchlist_tray_body');
    if (!trayBody) return;

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

    trayBody.innerHTML = sections.map(sec => `
      <div class="tray-section">
        <span class="tray-section-title">${sec.title}</span>
        <div class="tray-pill-grid">
          ${sec.assets.map(a => `
            <button class="tray-asset-btn" data-asset="${a.sym}" type="button">
              <span class="tray-asset-sym">${a.sym}</span>
              <span class="tray-asset-sub">${a.name}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `).join('');

    trayBody.querySelectorAll('.tray-asset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const asset = e.currentTarget.dataset.asset;
        if (this.callbacks.onAssetChange) this.callbacks.onAssetChange(asset);
        this.setActiveWatchlistAsset(asset);
        const trayWrapper = document.getElementById('watchlist_tray_wrapper');
        if (trayWrapper) trayWrapper.classList.remove('open');
      });
    });
  }

  setActiveWatchlistAsset(asset) {
    if (!asset) return;
    const symUpper = asset.toUpperCase();

    // 1. Update quick pills bar: ensure active pill is highlighted or present
    const container = document.getElementById('quick_watchlist_pills');
    if (container) {
      let existingBtn = container.querySelector(`[data-asset="${symUpper}"]`);
      if (!existingBtn) {
        const newBtn = document.createElement('button');
        newBtn.className = 'asset-pill-btn active';
        newBtn.dataset.asset = symUpper;
        newBtn.textContent = symUpper;
        newBtn.addEventListener('click', () => {
          container.querySelectorAll('.asset-pill-btn').forEach(b => b.classList.remove('active'));
          newBtn.classList.add('active');
          if (this.callbacks.onAssetChange) this.callbacks.onAssetChange(symUpper);
        });

        if (container.children.length >= 4) {
          container.removeChild(container.lastElementChild);
        }
        container.appendChild(newBtn);
      }

      container.querySelectorAll('.asset-pill-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.asset.toUpperCase() === symUpper);
      });
    }

    // 2. Update tray buttons
    const trayBody = document.getElementById('watchlist_tray_body');
    if (trayBody) {
      trayBody.querySelectorAll('.tray-asset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.asset.toUpperCase() === symUpper);
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
  }

  updateStrategyState(strategyState) {
    const badgeEl = document.getElementById('ai_state_badge');
    const directionEl = document.getElementById('meta_direction');
    const htfEl = document.getElementById('meta_htf_trend');
    const setupEl = document.getElementById('meta_setup');
    const confirmEl = document.getElementById('meta_confirmation');
    const execBtn = document.getElementById('execute_trade_btn');

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

    // Enable/disable execution button depending on state
    if (execBtn) {
      if (state === 'CONFIRMED') {
        execBtn.disabled = false;
        execBtn.classList.add('pulse-ready');
        execBtn.innerHTML = `<i class="ph ph-lightning"></i> <span>Execute Paper Trade (Confirmed)</span>`;
      } else {
        execBtn.disabled = false; // allow demo testing even if waiting
        execBtn.classList.remove('pulse-ready');
        execBtn.innerHTML = `<i class="ph ph-paper-plane-tilt"></i> <span>Execute Paper Trade (${state})</span>`;
      }
    }
  }

  updateContextTelemetry({ historicalContext, eventRisk }) {
    const histEl = document.getElementById('meta_hist_context');
    const eventEl = document.getElementById('meta_event_risk');

    if (histEl && historicalContext) {
      histEl.textContent = `${historicalContext.contextTag} (${historicalContext.historicalWinRate}%)`;
      histEl.className = `meta-val tag-${historicalContext.contextTag.toLowerCase()}`;
    }

    if (eventEl && eventRisk) {
      eventEl.textContent = `${eventRisk.level} Risk`;
      eventEl.className = `meta-val risk-${eventRisk.level.toLowerCase()}`;
    }

    // News Radar container
    const newsContainer = document.getElementById('news_radar_list');
    if (newsContainer && eventRisk && eventRisk.activeEvents) {
      newsContainer.innerHTML = eventRisk.activeEvents.map(evt => `
        <div class="news-item impact-${evt.riskLevel.toLowerCase()}">
          <div class="news-header">
            <span class="news-impact-tag">${evt.impact}</span>
            <span class="news-time">${evt.timeWindow}</span>
          </div>
          <div class="news-title">${evt.title}</div>
          <div class="news-desc">${evt.details}</div>
        </div>
      `).join('');
    }

    // Historical Pattern Card
    const histCard = document.getElementById('historical_pattern_card');
    if (histCard && historicalContext) {
      histCard.innerHTML = `
        <div class="hist-title"><i class="ph ph-git-commit"></i> ${historicalContext.patternName}</div>
        <div class="hist-stats-row">
          <div class="stat-col"><span class="k">Sample:</span> <span class="v">${historicalContext.sampleSize} setups</span></div>
          <div class="stat-col"><span class="k">Win Rate:</span> <span class="v text-bullish">${historicalContext.historicalWinRate}%</span></div>
          <div class="stat-col"><span class="k">Avg RR:</span> <span class="v">1:${historicalContext.expectedRR}</span></div>
        </div>
        <div class="hist-desc">${historicalContext.explanation}</div>
        <div class="hist-disclaimer">ℹ️ ${historicalContext.disclaimer}</div>
      `;
    }
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
    if (riskParams.entry) this.orderState.entryPrice = riskParams.entry;
    if (riskParams.stopLoss) this.orderState.slPrice = riskParams.stopLoss;
    if (riskParams.target) this.orderState.tpPrice = riskParams.target;

    const tpInput = document.getElementById('order_tp_input');
    const slInput = document.getElementById('order_sl_input');
    if (tpInput && !tpInput.matches(':focus') && riskParams.target) {
      tpInput.value = riskParams.target;
    }
    if (slInput && !slInput.matches(':focus') && riskParams.stopLoss) {
      slInput.value = riskParams.stopLoss;
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

      return `
        <div class="position-card">
          <div class="pos-top">
            <div class="pos-badge-group">
              <span class="pos-asset-pill">${pos.asset}/USDT</span>
              <span class="pos-lev-pill">${lev}x Isolated</span>
              <span class="pos-direction-pill ${pos.direction.toLowerCase()}">${pos.direction}</span>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
              <span class="pos-pnl-chip ${isPos ? 'bullish' : 'bearish'}">
                ${isPos ? '+' : ''}$${pos.unrealizedPnlUSD.toFixed(2)} (${isPos ? '+' : ''}${pos.unrealizedR}R)
              </span>
              <span class="pos-roe-badge ${isPos ? 'bullish' : 'bearish'}">
                ${isPos ? '+' : ''}${roe}% ROE
              </span>
            </div>
          </div>

          <!-- Target/SL Progress Bar -->
          <div class="pos-progress-wrapper" title="Progress towards Target (SL on left, TP on right)">
            <div class="pos-progress-track">
              <div class="pos-progress-fill ${isPos ? 'bullish' : 'bearish'}" style="width: ${progress}%;"></div>
              <div class="pos-progress-marker" style="left: ${progress}%;"></div>
            </div>
            <div class="pos-progress-labels">
              <span>SL ${this.formatPrice(pos.stopLoss)}</span>
              <span>TP ${this.formatPrice(pos.target)}</span>
            </div>
          </div>

          <div class="pos-grid">
            <div class="pos-grid-cell"><span class="lbl">Entry</span><span class="val">${this.formatPrice(pos.entry)}</span></div>
            <div class="pos-grid-cell"><span class="lbl">Mark Price</span><span class="val highlight">${this.formatPrice(pos.currentPrice)}</span></div>
            <div class="pos-grid-cell"><span class="lbl">Est. Liq Price</span><span class="val text-warning">${liqText}</span></div>
            <div class="pos-grid-cell"><span class="lbl">Margin / Value</span><span class="val">$${pos.marginUSD || pos.riskUSD} / $${pos.notionalUSD || (pos.entry * pos.positionSize).toFixed(0)}</span></div>
            <div class="pos-grid-cell"><span class="lbl">Size</span><span class="val">${pos.positionSize} ${pos.asset}</span></div>
            <div class="pos-grid-cell"><span class="lbl">RR Ratio</span><span class="val">1:${pos.rrRatio}</span></div>
          </div>

          <div class="pos-footer">
            <span class="pos-time"><i class="ph ph-clock"></i> ${new Date(pos.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <button class="btn-close-pos" data-trade-id="${pos.id}" type="button">
              <i class="ph ph-x-circle"></i> Close Trade
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach close buttons
    container.querySelectorAll('.btn-close-pos').forEach(btn => {
      btn.addEventListener('click', (e) => {
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
  }

  updateJournalAndAnalytics(analytics, trades) {
    // Header Live HUD Sync
    const liveMetrics = {
      balance: analytics.balance,
      equity: analytics.equity || analytics.balance,
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
          <td><span class="pnl-val ${resultClass}">${t.pnlUSD >= 0 ? '+' : ''}$${t.pnlUSD}</span></td>
        </tr>
      `;
    }).join('');
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
}

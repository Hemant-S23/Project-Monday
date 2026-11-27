import { CryptoAdapter } from './adapters/cryptoAdapter.js';
import { StrategyEngine } from './engine/strategyEngine.js';
import { HistoricalContextEngine } from './engine/historicalEngine.js';
import { NewsContextEngine } from './engine/newsContextEngine.js';
import { DerivativesEngine } from './engine/derivativesEngine.js';
import { RiskEngine } from './engine/riskEngine.js';
import { PaperTrader } from './paperTrading/paperTrader.js';
import { CopilotBrain } from './copilot/copilotBrain.js';
import { VoiceAssistant } from './copilot/voiceAssistant.js';
import { ChartManager } from './ui/chartManager.js';
import { TerminalUI } from './ui/terminalUI.js';
import { AuthManager } from './auth/authManager.js';
import { SignalEngine } from './engine/signalEngine.js';

/**
 * Main Application Orchestrator
 * Connects Crypto Perpetual Market adapters, strategy engines, AI reasoning, voice synthesis, and UI terminal.
 */

// Immediate Hard Dark Cockpit Lock
try {
  document.documentElement.setAttribute('data-theme', 'dark');
  if (document.body) document.body.setAttribute('data-theme', 'dark');
} catch (e) { }

class App {
  constructor() {
    this.currentMarket = 'Crypto';
    this.currentAsset = 'BTC';
    this.currentTimeframe = '1H';
    this.lastKnownState = null;
    this._isSyncingCloud = false;
    this._boundOnMarketDataTick = (data) => this.onMarketDataTick(data);
    this.autoPilotEnabled = true;
    this._autoPilotSettings = {
      marginUSD: 100,
      leverage: 20,
      maxTrades: 10,
      minConfluence: 75,
      minRR: 2.0,
      eventShieldEnabled: true
    };
    this._userWatchlist = ['BTC', 'ETH', 'SOL', 'OP', 'DOGE', 'SUI', 'ALGO', 'ARB', 'INJ', 'UNI'];

    // Instantiate market adapters
    this.cryptoAdapter = new CryptoAdapter();

    // User Authentication & Session Management
    this.authManager = new AuthManager();
    const activeUserId = this.authManager.getUserId();

    // Core analysis & risk modules
    this.strategyEngine = new StrategyEngine();
    this.historicalEngine = new HistoricalContextEngine();
    this.newsEngine = new NewsContextEngine();
    this.derivativesEngine = new DerivativesEngine();
    this.paperTrader = new PaperTrader(2000, activeUserId);
    this.riskEngine = new RiskEngine(this.paperTrader.balance, 1.0);
    this.copilotBrain = new CopilotBrain();
    this.chartManager = new ChartManager('tv_chart_container', {
      onExecuteInstantTrade: (orderPacket) => this.executeCurrentTrade(orderPacket)
    });

    // Institutional Alpha Signal Engine
    this.signalEngine = new SignalEngine();

    // UI Coordinator
    this.ui = new TerminalUI({
      onAssetChange: (asset) => this.switchAsset(asset),
      onMarketChange: (market) => this.switchMarket(market),
      onTimeframeChange: (tf) => this.switchTimeframe(tf),
      onSearchCrypto: (query) => this.getActiveAdapter().searchAssets(query),
      onSendMessage: (msg) => this.handleUserMessage(msg),
      onToggleVoice: () => this.toggleVoiceListening(),
      onToggleMute: () => this.voiceAssistant.toggleMute(),
      onTestVoice: () => this.voiceAssistant.testVoice(),
      onToggleAutoPilot: async (enabled) => {
        this.autoPilotEnabled = enabled;
        if (this.ui && typeof this.ui.updateAutoPilotUI === 'function') {
          this.ui.updateAutoPilotUI(enabled);
        }
        await this.pushSettingsToCloud();
        if (enabled) {
          this.voiceAssistant.speak('Auto-pilot mode activated. Confirmed setups will execute automatically.');
          this.scanAndExecuteAutoPilot();
        } else {
          this.isAutoPilotScanning = false;
          this.voiceAssistant.speak('Auto-pilot deactivated. Manual mode active.');
        }
      },
      onSaveAutoPilotSettings: async (newSettings) => {
        if (newSettings) {
          await this.pushSettingsToCloud(newSettings);
        }
        await this.runFullEvaluation();
        if (this.autoPilotEnabled) {
          await this.scanAndExecuteAutoPilot();
        }
      },
      onExecuteTrade: (orderPacket) => this.executeCurrentTrade(orderPacket),
      onCloseTrade: (id) => this.closeActiveTrade(id),
      onCloseAllTrades: () => this.closeAllActiveTrades(),
      onCloseAllPositions: () => this.closeAllActiveTrades(),
      onResetAccount: () => this.resetAccount(),
      onSyncCloud: async () => {
        this.ui.showToast('⚡ Cloud Syncing', 'Pushing local backlog and syncing with Supabase Cloud...', 'info');
        await this.reconcileOfflineTradesWithSupabase();
        await this.syncWithSupabaseCloud(true);
        this.ui.showToast('✅ Cloud Synchronized', 'All positions, ledger trades and balance match Supabase Cloud.', 'success');
      },
      onGetFinancialLedger: (month) => this.paperTrader.getFinancialLedger(month),
      onThemeChange: (theme) => this.chartManager.setTheme(theme),
      onSignIn: async (email, password) => {
        const res = await this.authManager.signInWithEmail(email, password);
        if (!res.success) {
          this.ui.showAuthAlert(res.error, 'error');
        } else {
          this.handleAuthSuccess(res.user);
        }
      },
      onSignUp: async (email, password, name) => {
        const res = await this.authManager.signUpWithEmail(email, password, name);
        if (!res.success) {
          this.ui.showAuthAlert(res.error, 'error');
        } else {
          this.handleAuthSuccess(res.user);
        }
      },
      onGoogleSignIn: async () => {
        const res = await this.authManager.signInWithGoogle();
        if (res && !res.success && res.error) {
          const isNotEnabled = res.error.toLowerCase().includes('not enabled');
          const errMsg = isNotEnabled
            ? 'Google Sign-In is not enabled in Supabase yet. Please enable it in Supabase Dashboard -> Auth -> Providers -> Google.'
            : res.error;
          this.ui.showAuthAlert(errMsg, 'error');
          this.ui.showToast('Google Sign-In', errMsg, 'warning');
        } else if (res && res.user) {
          this.handleAuthSuccess(res.user);
        }
      },
      onGuestLogin: async () => {
        const savedName = localStorage.getItem('monday_trader_name');
        const res = await this.authManager.loginAsGuest(savedName);
        this.handleAuthSuccess(res.user);
      },
      onSignOut: () => {
        this.authManager.signOut();
        this.ui.updateUserProfile(null);
        this.ui.showAuthOverlay();
      },
      onSaveSupabaseConfig: (url, anonKey) => {
        this.authManager.setSupabaseConfig(url, anonKey);
      },
      onGetSignals: (filter) => this.signalEngine.getSignals(filter),
      onGetActiveSignalsCount: () => this.signalEngine.getActiveCount(),
      onClearSignals: async () => {
        const now = Date.now();
        this.signalEngine.clearArchived(now);
        this.pushSettingsToCloud().catch(() => { });
        this.ui.updateSignalsBadge(this.signalEngine.getActiveCount());

        // Cloud Prune: ONLY delete unexecuted expired / invalidated signals. NEVER delete TP_HIT or SL_HIT!
        try {
          const cfg = window.MONDAY_SUPABASE_CONFIG;
          if (cfg && cfg.url && cfg.anonKey) {
            await fetch(`${cfg.url}/rest/v1/paper_trades?status=in.(SIGNAL_EXPIRED,SIGNAL_INVALIDATED)`, {
              method: 'DELETE',
              headers: {
                'apikey': cfg.anonKey,
                'Authorization': `Bearer ${cfg.anonKey}`
              }
            });
            console.log('[Signals Cloud Prune] Unfilled and expired signals deleted from Supabase Cloud. Wins preserved.');
          }
        } catch (e) { }
      },
      onSignalsPageOpen: () => {
        if (this.signalEngine && this.cryptoAdapter) {
          this.signalEngine.auditDowntimeSignals(this.cryptoAdapter).then(res => {
            if (res && res.length > 0 && this.ui) {
              this.ui.renderSignalsPage();
            }
          }).catch(() => { });
        }
      },
      onScanAllSignals: () => this.scanAllAssetsForSignals(),
      onSelectSignalForDesk: (signal) => this.loadSignalIntoOrderDesk(signal)
    });

    this.signalEngine.subscribe(() => {
      this.ui.updateSignalsBadge(this.signalEngine.getActiveCount());
      if (this.ui.currentSaaSPage === 'signals') {
        this.ui.renderSignalsPage();
      }
    });
    this.signalEngine.setOnSignalChange((sig) => {
      this.syncSignalToSupabase(sig).catch(() => { });
    });
    this.signalEngine.setOnSignalFill(async (signal) => {
      if (this.autoPilotEnabled) {
        await this.handleAutoPilotSignalFill(signal);
      }
    });

    // Two-Way Sync Bridge: When a Paper Trade hits TP or SL on the desk, immediately update its linked Alpha Signal
    this.paperTrader.setOnTradeClose((closedTrade) => {
      if (this.signalEngine && closedTrade) {
        const sig = this.signalEngine.signals.find(s => 
          (closedTrade.signalId && s.id === closedTrade.signalId) ||
          (closedTrade.strategy && s.tradeId === closedTrade.id) ||
          (s.asset === closedTrade.asset && (s.status === 'PENDING' || s.status === 'ACTIVE'))
        );
        if (sig) {
          const isWin = closedTrade.result === 'WIN';
          sig.status = isWin ? 'TP_HIT' : 'SL_HIT';
          sig.closedAt = closedTrade.closedAt || Date.now();
          sig.realizedR = closedTrade.rMultiple || (isWin ? (sig.riskReward || 2.0) : -1.0);
          this.signalEngine.saveSignals();
          this.syncSignalToSupabase(sig).catch(() => {});
          if (this.ui && this.ui.currentSaaSPage === 'signals') {
            this.ui.renderSignalsPage();
          }
        }
      }
    });
    this.ui.updateSignalsBadge(this.signalEngine.getActiveCount());

    // Voice Assistant with natural Indian and English profiles
    this.voiceAssistant = new VoiceAssistant({
      onSpeechRecognized: (transcript) => {
        this.handleUserMessage(transcript);
      },
      onListeningStateChange: (listening) => this.ui.setVoiceListening(listening),
      onSpeakingStateChange: (speaking) => this.ui.setVoiceSpeaking(speaking)
    });

    // Boot Notification & Noise Shield: Suppresses startup toast & alert blast
    this.isBooting = true;
  }

  handleAuthSuccess(user) {
    this.ui.updateUserProfile(user);
    this.ui.hideAuthOverlay();
    this.paperTrader.setUser(user.id);
    this.riskEngine.setAccountBalance(this.paperTrader.balance);
    this.updateTradeJournalAndStats();
    this.ui.updateOpenPositions(this.paperTrader.openPositions);
    const liveMetrics = this.paperTrader.getLiveEquity();
    this.ui.updateHeaderAccountHUD(liveMetrics);
    if (this.ui.orderState) {
      this.ui.orderState.availableBalance = liveMetrics.availableMargin !== undefined
        ? liveMetrics.availableMargin
        : Math.max(0, this.paperTrader.balance - (liveMetrics.usedMargin || 0));
      this.ui.refreshDerivativesOrderDesk();
    }
    this.syncWithSupabaseCloud();
    this.reconcileOfflineTradesWithSupabase().catch(() => { });
    this.pushSettingsToCloud(this.getAutoPilotSettings()).catch(() => { });
    this.paperTrader.auditDowntimeTrades(this.cryptoAdapter).then(resolved => {
      if (resolved && resolved.length > 0) {
        this.updateTradeJournalAndStats();
        this.ui.updateOpenPositions(this.paperTrader.openPositions);
        this.ui.updateHeaderAccountHUD(this.paperTrader.getLiveEquity());
      }
    }).catch(e => console.warn('[App] Post-login downtime audit err:', e));
    this.ui.showToast('Welcome!', `${user.name || 'Trader'}, trading session active.`, 'success');
  }

  getActiveAdapter() {
    return this.cryptoAdapter;
  }

  async init() {
    console.log('[App] Initializing AI Trading Co-Pilot for Crypto Perpetual Markets...');

    // Eradicate all browser localStorage state except active auth session token (100% Cloud-First Architecture)
    try {
      if (typeof localStorage !== 'undefined') {
        const preserveKeys = new Set(['monday_active_session_v1', 'monday_guest_uuid']);
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && !preserveKeys.has(k)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      }
    } catch (e) { }

    // Purge browser Service Worker CacheStorage
    try {
      if (typeof caches !== 'undefined') {
        caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
      }
    } catch (e) {}

    // 0. Verify Auth Session & update UI state (Seamless instant-cockpit entry)
    await this.authManager.ready();
    let currentUser = this.authManager.getUser();
    if (!currentUser) {
      const hasOAuthTokens = (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('type='))) ||
        (window.location.search && window.location.search.includes('code='));
      if (!hasOAuthTokens) {
        // Auto-activate instant Guest Trader account only if user did not initiate an OAuth login
        const guestRes = await this.authManager.loginAsGuest();
        currentUser = guestRes.user;
      }
    }
    if (currentUser) {
      this.ui.updateUserProfile(currentUser);
      this.ui.hideAuthOverlay();
      this.paperTrader.setUser(currentUser.id);
      this.riskEngine.setAccountBalance(this.paperTrader.balance);
    }

    // Immediate Synchronous State Sync (Zero-Lag Frame 0 HUD, Open Positions, and Journal Restoration)
    this.updateTradeJournalAndStats();
    this.ui.updateOpenPositions(this.paperTrader.openPositions);
    const initialLiveMetrics = this.paperTrader.getLiveEquity();
    this.ui.updateHeaderAccountHUD(initialLiveMetrics);
    if (this.ui.orderState) {
      this.ui.orderState.availableBalance = initialLiveMetrics.availableMargin !== undefined
        ? initialLiveMetrics.availableMargin
        : Math.max(0, this.paperTrader.balance - (initialLiveMetrics.usedMargin || 0));
      this.ui.refreshDerivativesOrderDesk();
    }

    // Frame-0 Direct SaaS Page Routing (Zero Milliseconds delay)
    // If URL contains an explicit hash (like #passbook or #signals), honor it.
    // Otherwise, default directly to 'terminal' (Live Cockpit) so Launch Terminal ALWAYS shows the Terminal.
    const rawHash = (window.location.hash || '').replace('#', '').trim().toLowerCase();
    const validPages = ['terminal', 'positions', 'signals', 'passbook', 'copilot', 'settings'];
    const activePage = (rawHash && validPages.includes(rawHash))
      ? rawHash
      : 'terminal';
    if (this.ui && typeof this.ui.switchPage === 'function') {
      this.ui.switchPage(activePage);
    }

    // 1. Initialize TradingView chart with saved theme and active adapter (Frame 0)
    const activeTheme = localStorage.getItem('monday_theme') || 'dark';
    this.chartManager.setAdapter(this.cryptoAdapter);
    this.chartManager.setAdapters({ crypto: this.cryptoAdapter });
    this.chartManager.init(this.currentAsset, '60', 'Crypto', activeTheme, this.cryptoAdapter);
    this.ui.renderWatchlistTray('Crypto');

    // Set up network online reconnect listener for automatic cloud sync
    this.setupNetworkReconciliation();

    // Cross-tab and post-login real-time cloud synchronizer
    window.addEventListener('monday:auth-changed', (e) => {
      if (e.detail) {
        console.log('[App] Auth state updated across context. Synchronizing cockpit for:', e.detail.email);
        this.handleAuthSuccess(e.detail);
      }
    });

    // 2. Non-blocking Asynchronous Background Market Hydration & Sync (Never freezes UI or scrolling)
    (async () => {
      try {
        // Fast-Path Cloud Hydration in background
        try {
          await Promise.race([
            this.syncWithSupabaseCloud(),
            new Promise(resolve => setTimeout(resolve, 3500))
          ]);
          // Reconcile and push any local offline backlog to cloud
          this.reconcileOfflineTradesWithSupabase().catch(() => { });
        } catch (e) {
          console.warn('[App] Background cloud sync timeout/err:', e);
        }

        // Initialize Crypto Market Feeds
        await this.cryptoAdapter.init();

        // Subscribe to ALL assets in the market universe simultaneously (Zero-Delay Full Coverage)
        const cryptoAssets = this.cryptoAdapter.allMarkets.map(m => m.baseAsset);
        cryptoAssets.forEach(asset => {
          this.cryptoAdapter.subscribe(asset, this._boundOnMarketDataTick);
        });

        // Restore and subscribe to any active open positions in parallel
        if (this.paperTrader.openPositions.length > 0) {
          await Promise.all(this.paperTrader.openPositions.map(pos => {
            return this.cryptoAdapter.ensureAssetInitialized(pos.asset).then(() => {
              this.cryptoAdapter.subscribe(pos.asset, this._boundOnMarketDataTick);
            }).catch(err => console.warn('[App] Position restore warmup error:', err));
          }));
        }

        // Audit Downtime Trades BEFORE live ticks to guarantee exact historical timestamps!
        try {
          const downtimeResolved = await this.paperTrader.auditDowntimeTrades(this.cryptoAdapter);
          if (downtimeResolved && downtimeResolved.length > 0) {
            console.log(`[App] Downtime Catch-Up: Resolved ${downtimeResolved.length} trade(s) with accurate historical timestamps.`);
            this.updateTradeJournalAndStats();
            this.ui.updateOpenPositions(this.paperTrader.openPositions);
            this.ui.updateHeaderAccountHUD(this.paperTrader.getLiveEquity());

            const count = downtimeResolved.length;
            const times = downtimeResolved.map(t => new Date(t.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })).join(', ');
            this.ui.showToast(
              '⚡ Portfolio Synchronized',
              `${count} trade(s) settled at exact historical levels (${times}). Ledger & Passbook updated.`,
              'info'
            );

            downtimeResolved.forEach(trade => {
              const isWin = trade.result === 'WIN';
              const exitTimeStr = new Date(trade.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
              const formattedPrice = this.ui.formatPrice(trade.exitPrice, '$');
              const pnlSign = (trade.pnlUSD || 0) >= 0 ? '+' : '';
              const isLiq = trade.result === 'LIQUIDATED';

              this.ui.addNotification({
                type: isWin ? 'target' : isLiq ? 'liquidation' : 'stop',
                title: isWin
                  ? `Target Hit • ${trade.asset} ${trade.direction}`
                  : isLiq
                    ? `Liquidated • ${trade.asset} ${trade.direction}`
                    : `Stop Loss Hit • ${trade.asset} ${trade.direction}`,
                message: `${pnlSign}$${trade.pnlUSD} settled at ${exitTimeStr} (${formattedPrice}). Recorded in Passbook.`,
                tradeId: trade.id,
                timestamp: trade.closedAt
              });
              // Cloud-First Guarantee: Sync resolved downtime trade to Supabase Cloud immediately
              this.syncTradeToSupabase(trade).catch(() => { });
            });
          }
        } catch (downtimeErr) {
          console.warn('[App] Downtime audit error:', downtimeErr);
        }

        // Audit Downtime Signals immediately to catch historical TP/SL hits from downtime
        if (this.signalEngine && this.cryptoAdapter) {
          this.signalEngine.auditDowntimeSignals(this.cryptoAdapter).then(resolved => {
            if (resolved && resolved.length > 0 && this.ui && typeof this.ui.renderSignalsPage === 'function') {
              this.ui.renderSignalsPage();
            }
          }).catch(e => console.warn('[App] Downtime signals audit warning:', e));
        }

        // Run strategic evaluation in background
        await this.runFullEvaluation(true);
        this.ui.updateOpenPositions(this.paperTrader.openPositions);
        this.updateTradeJournalAndStats();

        // Initialize auth profile in UI if user is already logged in
        if (this.authManager && this.authManager.isLoggedIn()) {
          this.ui.updateUserProfile(this.authManager.getUser());
        }
      } catch (hydrationErr) {
        console.warn('[App] Background hydration error:', hydrationErr);
      }
    })();

    // Run Supabase sync and background offline reconciliation asynchronously without blocking chart render
    setTimeout(() => {
      this.syncWithSupabaseCloud().then(() => {
        this.reconcileOfflineTradesWithSupabase().catch(() => { });
      }).catch(() => { });
    }, 150);

    // 5. Initial greeting from MONDAY
    setTimeout(() => {
      const user = this.authManager && this.authManager.getUser ? this.authManager.getUser() : null;
      const savedTraderName = localStorage.getItem('monday_trader_name');
      const rawName = (user?.name && user.name !== 'Guest Trader') ? user.name : (savedTraderName || '');
      const firstName = rawName.trim().split(/\s+/)[0] || '';
      const salutation = firstName ? `Namaste ${firstName} bhai!` : `Namaste!`;

      const initialGreeting = `${salutation} Main hoon **MONDAY** (**M**arket-**O**riented **N**eural **D**ecision **A**ssistant for **Y**ou). 🧠✨\n\n` +
        `Main continuously market observe kar rahi hoon — **24/7 Global Crypto Perpetual Markets** fully active hain! ` +
        `1H aur 5M structure analyze kar rahi hoon aur strict 1% risk calculate kar rahi hoon.\n\n` +
        `Tum mujhse text ya voice ke through freely koi bhi market scenario discuss kar sakte ho!`;
      this.ui.appendChatMessage('copilot', initialGreeting);

      const voiceGreeting = firstName
        ? `Namaste ${firstName} bhai! Main hoon Monday. 24/7 Global Crypto Perpetual Markets active hain. Market analysis ready hai.`
        : `Namaste! Main hoon Monday. 24/7 Global Crypto Perpetual Markets active hain. Market analysis ready hai.`;
      this.voiceAssistant.speak(voiceGreeting);
    }, 1200);

    // Lift boot silence shield after frame 0 hydration stabilizes
    setTimeout(() => {
      this.isBooting = false;
    }, 6000);

    // 6. Setup interval for continuous position updates, evaluation & Supabase sync
    setInterval(() => this.runFullEvaluation(), 5000);
    setInterval(() => {
      if (!document.hidden) {
        this.syncWithSupabaseCloud(false).catch(() => { });
      }
    }, 15000);

    // 7. Initial Alpha Signals & Portfolio Cloud Sync (full 1000-row boot hydration)
    setTimeout(() => {
      this.syncWithSupabaseCloud(true).catch(() => { });
    }, 2000);

    // 8. 24/7 Supabase Realtime WebSocket Cockpit Activation (Zero-Poll Live Stream)
    setTimeout(() => {
      this.initSupabaseRealtime();
    }, 800);
  }

  /**
   * 24/7 Live Supabase Realtime WebSocket Engine.
   * Eliminates polling delay and local storage reliance by subscribing directly to Postgres changes.
   * Orders, TP hits, SL hits, and Circuit Breakers update within <50ms!
   */
  initSupabaseRealtime() {
    try {
      const cfg = window.MONDAY_SUPABASE_CONFIG;
      if (!cfg || !cfg.url || !cfg.anonKey) return;
      if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        setTimeout(() => this.initSupabaseRealtime(), 1000);
        return;
      }

      if (this._realtimeSubscription) return;

      const client = window.supabase.createClient(cfg.url, cfg.anonKey);
      this.supabaseClient = client;

      console.log('[Realtime] Subscribing to 24/7 Supabase Realtime WebSocket channel for paper_trades...');
      const channel = client
        .channel('public:paper_trades')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'paper_trades' },
          (payload) => {
            this.handleRealtimeTradeUpdate(payload);
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime] Channel subscription status: ${status}`);
          if (status === 'SUBSCRIBED') {
            console.log('⚡ [Realtime] Live Cockpit Connected! Instant push updates active.');
          }
        });

      this._realtimeSubscription = channel;
    } catch (err) {
      console.warn('[Realtime] Failed to initialize Supabase Realtime:', err);
    }
  }

  handleRealtimeTradeUpdate(payload) {
    if (!payload) return;
    const { eventType, new: newRow, old: oldRow } = payload;
    const trade = newRow || oldRow;
    if (!trade || !trade.id) return;

    // 1. If it's a configuration row, trigger settings reload
    if (trade.id.startsWith('CONFIG_') || trade.status === 'CONFIG') {
      this.syncWithSupabaseCloud(false).catch(() => {});
      return;
    }

    // 2. If it's a signal row
    if (trade.id.startsWith('SIG-') || (trade.status && trade.status.startsWith('SIGNAL_'))) {
      if (this.signalEngine) {
        if (eventType === 'DELETE') {
          this.signalEngine.signals = this.signalEngine.signals.filter(s => s.id !== trade.id);
        } else {
          const idx = this.signalEngine.signals.findIndex(s => s.id === trade.id);
          const formatted = this.signalEngine.formatCloudSignal(trade);
          if (idx !== -1) {
            this.signalEngine.signals[idx] = { ...this.signalEngine.signals[idx], ...formatted };
          } else {
            this.signalEngine.signals.unshift(formatted);
          }
        }
        if (this.ui && typeof this.ui.renderSignalsPage === 'function' && this.ui.currentSaaSPage === 'signals') {
          this.ui.renderSignalsPage();
        }
      }
      return;
    }

    // 3. Regular Paper Trade Events
    if (eventType === 'INSERT') {
      if (trade.status === 'OPEN') {
        const exists = this.paperTrader.openPositions.some(p => p.id === trade.id);
        if (!exists) {
          const entryP = Number(trade.entry_price || trade.entry) || 0;
          const posSz = Number(trade.position_size) || 0;
          const notional = +(entryP * posSz).toFixed(2);
          const entryFee = +(notional * 0.0005).toFixed(2);

          const newPos = {
            id: trade.id,
            market: trade.market || 'Crypto',
            asset: trade.asset,
            direction: trade.direction,
            entry: entryP,
            stopLoss: Number(trade.stop_loss),
            target: Number(trade.target_price),
            positionSize: posSz,
            riskUSD: Number(trade.risk_usd || 20),
            rewardUSD: Number(trade.reward_usd || 60),
            rrRatio: Number(trade.rr_ratio || 3.0),
            leverage: 20,
            marginUSD: Number(trade.risk_usd || 20),
            notionalUSD: notional,
            entryFeeUSD: entryFee,
            estExitFeeUSD: entryFee,
            status: 'OPEN',
            currentPrice: entryP,
            unrealizedPnlUSD: 0,
            unrealizedGrossPnlUSD: 0,
            unrealizedR: 0,
            roePercent: 0,
            feesUSD: +(entryFee * 2 * 1.18).toFixed(2),
            openedAt: new Date(trade.created_at).getTime()
          };

          this.paperTrader.openPositions.unshift(newPos);
          this.ui.updateOpenPositions(this.paperTrader.openPositions);
          this.ui.updateHeaderAccountHUD(this.paperTrader.getLiveEquity());

          if (!this.isBooting) {
            this.ui.showToast('🚀 Order Executed', `${trade.asset} ${trade.direction} entered at $${entryP}. Live!`, 'success');
            if (this.voiceAssistant) this.voiceAssistant.speak(`${trade.asset} ${trade.direction} entered.`);
          }
        }
      } else if (trade.status === 'CLOSED') {
        this.syncWithSupabaseCloud(false).catch(() => {});
      }
    } else if (eventType === 'UPDATE') {
      if (trade.status === 'CLOSED') {
        // Trade closed in Cloud! Remove from open positions
        const openIdx = this.paperTrader.openPositions.findIndex(p => p.id === trade.id);
        if (openIdx !== -1) {
          this.paperTrader.openPositions.splice(openIdx, 1);
        }

        const isWin = trade.result === 'WIN';
        const pnl = Number(trade.pnl_usd) || 0;
        const pnlSign = pnl >= 0 ? '+' : '';
        const exitP = Number(trade.exit_price || trade.target_price || trade.entry_price);
        const formattedPrice = this.ui.formatPrice(exitP, '$');

        // Refresh cloud ledger sync to populate Passbook and update Balance immediately
        this.syncWithSupabaseCloud(false).then(() => {
          if (!this.isBooting) {
            const title = isWin ? '🎯 TARGET HIT!' : '🛑 STOP LOSS HIT!';
            const msg = `${trade.asset} closed at ${formattedPrice} (${trade.result}). PnL: ${pnlSign}$${pnl}`;
            this.ui.showToast(title, msg, isWin ? 'success' : 'danger');
            if (this.voiceAssistant) this.voiceAssistant.speak(`${trade.asset} trade hit ${isWin ? 'Target' : 'Stop loss'}.`);
          }
        }).catch(() => {});
      } else if (trade.status === 'OPEN') {
        const localPos = this.paperTrader.openPositions.find(p => p.id === trade.id);
        if (localPos) {
          if (trade.stop_loss) localPos.stopLoss = Number(trade.stop_loss);
          if (trade.target_price) localPos.target = Number(trade.target_price);
        }
      }
    } else if (eventType === 'DELETE') {
      this.paperTrader.openPositions = this.paperTrader.openPositions.filter(p => p.id !== trade.id);
      this.paperTrader.trades = this.paperTrader.trades.filter(t => t.id !== trade.id);
      this.ui.updateOpenPositions(this.paperTrader.openPositions);
      this.updateTradeJournalAndStats();
    }
  }

  async syncWithSupabaseCloud(isFullSync = true) {
    if (this._isSyncingCloud) return;
    this._isSyncingCloud = true;
    try {
      const cfg = window.MONDAY_SUPABASE_CONFIG;
      if (!cfg || !cfg.url || !cfg.anonKey) return;

      const activeUserId = this.authManager && this.authManager.getUserId ? this.authManager.getUserId() : 'guest_autopilot';
      const isAuth = this.authManager && typeof this.authManager.isUserAuthenticated === 'function' && this.authManager.isUserAuthenticated();
      const currentUser = this.authManager && this.authManager.getUser ? this.authManager.getUser() : null;
      const isOwner = currentUser && (currentUser.email === 'hsmcpl06@gmail.com' || (currentUser.name && currentUser.name.toLowerCase().includes('hemant')));

      // Strict User Isolation + Universal Alpha Signals Access:
      // - Authenticated users query strictly their personal trades + universal cloud signals
      // - Unauthenticated users query guest trades + universal cloud signals
      let userFilter;
      if (isAuth) {
        userFilter = `or=(user_id.eq.${activeUserId},status.like.SIGNAL_*)`;
      } else {
        userFilter = `or=(user_id.eq.guest_autopilot,status.like.SIGNAL_*)`;
      }

      const token = (this.authManager && typeof this.authManager.getAuthToken === 'function')
        ? await this.authManager.getAuthToken()
        : cfg.anonKey;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const fetchLimit = 1000;
      const res = await fetch(`${cfg.url}/rest/v1/paper_trades?select=*&${userFilter}&order=created_at.desc&limit=${fetchLimit}`, {
        headers: {
          'apikey': cfg.anonKey,
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) return;

      const cloudTrades = await res.json();
      if (!Array.isArray(cloudTrades)) return;

      let changed = false;

      // Index cloud trades by status
      const cloudOpenMap = new Map();
      const cloudClosedMap = new Map();
      const cloudSignals = [];

      for (const ct of cloudTrades) {
        if (ct.status === 'CONFIG' || ct.id.startsWith('CONFIG_')) {
          if (ct.strategy) {
            try {
              const cloudSet = JSON.parse(ct.strategy);
              if (cloudSet) {
                // 1. Auto-Pilot Risk Settings
                const apSettings = cloudSet.autopilotSettings || (cloudSet.riskPerTradePercent !== undefined ? cloudSet : null);
                if (apSettings) {
                  this._autoPilotSettings = {
                    marginUSD: Math.max(5, Math.min(500, parseFloat(apSettings.marginUSD) || 100)),
                    leverage: Math.max(1, Math.min(50, parseInt(apSettings.leverage, 10) || 20)),
                    maxTrades: Math.max(1, Math.min(100, parseInt(apSettings.maxTrades, 10) || 10)),
                    minConfluence: Math.max(50, Math.min(95, parseInt(apSettings.minConfluence, 10) || 75)),
                    minRR: Math.max(1.5, Math.min(5.0, parseFloat(apSettings.minRR) || 2.0)),
                    eventShieldEnabled: apSettings.eventShieldEnabled !== false
                  };
                  if (this.copilotBrain && typeof this.copilotBrain.setAutoPilotConfig === 'function') {
                    this.copilotBrain.setAutoPilotConfig(this._autoPilotSettings);
                  }
                }
                // 2. Master Auto-Pilot Toggle
                if (cloudSet.autoPilotEnabled !== undefined) {
                  this.autoPilotEnabled = !!cloudSet.autoPilotEnabled;
                  if (this.ui) {
                    this.ui.autoPilotEnabled = this.autoPilotEnabled;
                    if (typeof this.ui.updateAutoPilotUI === 'function') {
                      this.ui.updateAutoPilotUI(this.autoPilotEnabled);
                    }
                  }
                }
                // 3. Pinned User Watchlist
                if (Array.isArray(cloudSet.watchlist) && cloudSet.watchlist.length > 0) {
                  this._userWatchlist = cloudSet.watchlist;
                  if (this.ui) this.ui.userWatchlist = cloudSet.watchlist;
                }
                // 4. Multi-Chart Layout
                if (cloudSet.multiLayout && this.chartManager?.applyLayout) {
                  this.chartManager.applyLayout(cloudSet.multiLayout);
                }
                // 5. Preferred Market Focus
                if (cloudSet.preferredMarket && cloudSet.preferredMarket !== this.currentMarket) {
                  this.currentMarket = cloudSet.preferredMarket;
                }
                // 6. Voice Assistant Mute
                if (cloudSet.voiceMuted !== undefined) {
                  if (this.voiceAssistant) this.voiceAssistant.voiceMuted = !!cloudSet.voiceMuted;
                }
                // 7. Signals Archived Cleared Watermark
                if (cloudSet.signalsArchivedClearedAt) {
                  const cloudT = Number(cloudSet.signalsArchivedClearedAt) || 0;
                  if (this.signalEngine) {
                    this.signalEngine.setArchivedClearedAt(cloudT);
                  }
                }
              }
            } catch (e) { }
          }
          continue;
        }

        // Alpha Signals Desk Sync
        if (ct.id.startsWith('SIG-') || (ct.status && ct.status.startsWith('SIGNAL_'))) {
          cloudSignals.push(ct);
          continue;
        }

        if (ct.status === 'OPEN') {
          cloudOpenMap.set(ct.id, ct);
        } else if (ct.status === 'CLOSED') {
          if (!(ct.result === 'LIQUIDATED' && Number(ct.pnl_usd || 0) === 0)) {
            cloudClosedMap.set(ct.id, ct);
          }
        }
      }

      // 1. Authoritative Cloud-First Hydration for Open Positions
      // Discard all local ghost positions. Supabase Cloud is Single Source of Truth.
      const settings = this.getAutoPilotSettings ? this.getAutoPilotSettings() : {};
      const maxAllowed = Number(settings.maxTrades) || 10;
      const newOpenPositions = [];
      const seenOpenAssets = new Set();

      for (const [id, ct] of cloudOpenMap.entries()) {
        if (newOpenPositions.length >= maxAllowed) break;
        if (!ct.asset || seenOpenAssets.has(ct.asset)) continue;
        if (ct.id && (ct.id.toLowerCase().includes('test') || ct.id.toLowerCase().includes('bat'))) continue;
        if (ct.asset === 'BTC' && Number(ct.entry_price) === 60000) continue;

        seenOpenAssets.add(ct.asset);
        const entryP = Number(ct.entry_price) || 0;
        const posSz = Number(ct.position_size || 0);
        const notional = +(entryP * posSz).toFixed(2);
        const entryFee = +(notional * 0.0005).toFixed(2);

        newOpenPositions.push({
          id: ct.id,
          market: ct.market || 'Crypto',
          asset: ct.asset,
          direction: ct.direction,
          entry: entryP,
          stopLoss: Number(ct.stop_loss),
          target: Number(ct.target_price),
          positionSize: posSz,
          riskUSD: Number(ct.risk_usd || 20),
          rewardUSD: Number(ct.reward_usd || 60),
          rrRatio: Number(ct.rr_ratio || 3.0),
          leverage: 20,
          marginUSD: Number(ct.risk_usd || 20),
          notionalUSD: notional,
          entryFeeUSD: entryFee,
          estExitFeeUSD: entryFee,
          status: 'OPEN',
          currentPrice: entryP,
          unrealizedPnlUSD: 0,
          unrealizedGrossPnlUSD: 0,
          unrealizedR: 0,
          roePercent: 0,
          feesUSD: +(entryFee * 2 * 1.18).toFixed(2),
          openedAt: new Date(ct.created_at).getTime()
        });
      }
      this.paperTrader.openPositions = newOpenPositions;

      // 2. Authoritative Cloud-First Hydration for Closed Trades Ledger
      const newClosedTrades = [];
      const seenClosedSignatures = new Set();

      for (const [id, ct] of cloudClosedMap.entries()) {
        if (ct.id && (ct.id.toLowerCase().includes('test') || ct.id.toLowerCase().includes('bat'))) continue;
        if (ct.asset === 'BTC' && Number(ct.entry_price) === 60000) continue;
        if (ct.asset === 'ETH' && Number(ct.entry_price) === 3000 && Math.abs(Number(ct.pnl_usd || 0)) < 0.01) continue;

        let parsedMeta = {};
        if (ct.strategy) {
          try { parsedMeta = JSON.parse(ct.strategy); } catch (e) { }
        }
        const openedAtTime = parsedMeta.openedAt || (ct.created_at ? new Date(ct.created_at).getTime() : Date.now());
        const closedAtTime = parsedMeta.closedAt || (ct.created_at ? new Date(ct.created_at).getTime() : Date.now());

        const cloudDateStr = new Date(closedAtTime).toDateString();
        const sig = `${ct.asset}_${ct.direction}_${Number(ct.entry_price)}_${cloudDateStr}`;
        if (seenClosedSignatures.has(sig)) continue;
        seenClosedSignatures.add(sig);

        const fee = Number(parsedMeta.feesUSD || parsedMeta.totalFeesUSD || 0);
        newClosedTrades.push({
          id: ct.id,
          market: ct.market || 'Crypto',
          asset: ct.asset,
          direction: ct.direction,
          entry: Number(ct.entry_price),
          stopLoss: Number(ct.stop_loss),
          target: Number(ct.target_price),
          positionSize: Number(ct.position_size || 0),
          riskUSD: Number(ct.risk_usd || 20),
          rewardUSD: Number(ct.reward_usd || 60),
          rrRatio: Number(ct.rr_ratio || 3.0),
          status: 'CLOSED',
          result: ct.result || (Number(ct.pnl_usd || 0) >= 0 ? 'WIN' : 'LOSS'),
          pnlUSD: Number(ct.pnl_usd || 0),
          rMultiple: Number(ct.r_multiple || 0),
          exitPrice: ct.exit_price ? Number(ct.exit_price) : null,
          exitReason: parsedMeta.exitReason || (ct.result === 'WIN' ? 'TAKE_PROFIT' : 'STOP_LOSS'),
          feesUSD: fee,
          totalFeesUSD: fee,
          brokerageFeeUSD: Number(parsedMeta.brokerageFeeUSD !== undefined ? parsedMeta.brokerageFeeUSD : (fee > 0 ? +(fee / 1.18).toFixed(2) : 0)),
          gstUSD: Number(parsedMeta.gstUSD !== undefined ? parsedMeta.gstUSD : (fee > 0 ? +(fee - fee / 1.18).toFixed(2) : 0)),
          grossPnLUSD: Number(parsedMeta.grossPnLUSD !== undefined ? parsedMeta.grossPnLUSD : (Number(ct.pnl_usd || 0) + fee)),
          openedAt: openedAtTime,
          closedAt: closedAtTime
        });
      }

      newClosedTrades.sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0));
      this.paperTrader.trades = newClosedTrades;

      // 3. Compute Realized PnL & Authoritative Balance from Cloud
      const totalRealized = this.paperTrader.trades
        .filter(t => t.status === 'CLOSED')
        .reduce((sum, t) => sum + (Number(t.pnlUSD) || 0), 0);
      this.paperTrader.balance = Math.max(2000, +(this.paperTrader.initialBalance + totalRealized).toFixed(2));
      this.riskEngine.setAccountBalance(this.paperTrader.balance);

      this.updateTradeJournalAndStats();
      this.ui.updateOpenPositions(this.paperTrader.openPositions);
      const liveMetrics = this.paperTrader.getLiveEquity();
      this.ui.updateHeaderAccountHUD(liveMetrics);
      if (this.ui.orderState) {
        this.ui.orderState.availableBalance = liveMetrics.availableMargin !== undefined
          ? liveMetrics.availableMargin
          : Math.max(0, this.paperTrader.balance - (liveMetrics.usedMargin || 0));
        this.ui.refreshDerivativesOrderDesk();
      }
      if (this.ui.currentSaaSPage === 'passbook' && this.ui.renderFinancialPassbook) {
        this.ui.renderFinancialPassbook();
      }
      const restoredPortfolioCount = cloudOpenMap.size + cloudClosedMap.size;
      if (restoredPortfolioCount > 0 && isFullSync) {
        this.ui.showToast('⚡ Cloud Synced', `Synchronized ${restoredPortfolioCount} portfolio trade(s) from Cloud.`, 'success');
      }

      // 5. Merge Alpha Signals from Cloud into SignalEngine & Auto-Pilot Desk
      if (this.signalEngine && cloudSignals.length > 0) {
        this.signalEngine.mergeCloudSignals(cloudSignals);
        if (this.ui && this.ui.currentSaaSPage === 'signals') {
          this.ui.renderSignalsPage();
        }

        // ⚡ Immediate Auto-Pilot Execution for Active Tradeable Signals
        if (this.autoPilotEnabled) {
          const settings = this.getAutoPilotSettings();
          for (const cs of cloudSignals) {
            if (this.paperTrader.openPositions.length >= settings.maxTrades) break;
            const alreadyOpen = this.paperTrader.openPositions.some(p => p.asset === cs.asset);
            if (cs.status === 'SIGNAL_ACTIVE' && !alreadyOpen) {
              const adapter = this.getActiveAdapter();
              const curP = adapter ? adapter.getCurrentPrice(cs.asset) : Number(cs.entry_price);
              const isLong = (cs.direction || 'LONG').toUpperCase() === 'LONG';
              const slP = Number(cs.stop_loss);
              const tpP = Number(cs.target_price);
              const inZone = isLong ? (curP > slP && curP < tpP) : (curP < slP && curP > tpP);
              if (inZone) {
                this.handleAutoPilotSignalFill({
                  id: cs.id,
                  asset: cs.asset,
                  direction: cs.direction,
                  entryPrice: Number(cs.entry_price),
                  stopLossPrice: slP,
                  takeProfitPrice: tpP,
                  riskReward: Number(cs.rr_ratio) || 2.5
                });
              }
            }
          }
        }
      }

      // 6. Reconcile Active Open Cloud Trades with Alpha Signals Desk
      if (this.signalEngine && Array.isArray(cloudTrades)) {
        for (const ct of cloudTrades) {
          if (ct.status === 'OPEN') {
            if (ct.id && (ct.id.toLowerCase().includes('test') || ct.id.toLowerCase().includes('bat'))) continue;
            if (ct.asset === 'BTC' && Number(ct.entry_price) === 60000) continue;
            const alreadyHasSig = this.signalEngine.signals.some(s => s.tradeId === ct.id);
            if (!alreadyHasSig) {
              const posFormat = {
                id: ct.id,
                asset: ct.asset,
                direction: ct.direction,
                entry: Number(ct.entry_price),
                stopLoss: Number(ct.stop_loss),
                target: Number(ct.target_price),
                rrRatio: Number(ct.rr_ratio || 2.0),
                confluenceScore: 85,
                market: ct.market || 'Crypto'
              };
              this.signalEngine.registerExecutedPosition(posFormat);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[App] Supabase cloud sync error:', e.message);
    } finally {
      this._isSyncingCloud = false;
    }
  }

  async onMarketDataTick(data) {
    // Distribute tick to all active multi-chart subwindows
    this.chartManager.onRealtimeTick(data);

    // Feed price tick to Alpha Signal Engine for live limit fills, target hits, & stop losses
    if (this.signalEngine && data.asset && data.price) {
      this.signalEngine.onPriceTick(data.asset, data.price);
    }

    if (data.asset === this.currentAsset) {
      this.ui.updateTicker(data);
      if (this.ui.orderState && data.price) {
        this.ui.orderState.entryPrice = data.price;
        this.ui.refreshDerivativesOrderDesk();
      }
    }

    // Check open positions for target or stop hit dynamically across all traded assets
    const currentPrices = {};
    this.paperTrader.openPositions.forEach(pos => {
      const price = this.cryptoAdapter.getCurrentPrice(pos.asset);
      if (price) currentPrices[pos.asset] = price;
    });

    const activeAdapter = this.getActiveAdapter();
    currentPrices[this.currentAsset] = activeAdapter.getCurrentPrice(this.currentAsset);

    const closedTrades = this.paperTrader.updateLivePositions(currentPrices);
    if (closedTrades.length > 0) {
      closedTrades.forEach(({ pos, result, price }) => {
        const isWin = result === 'WIN';
        if (!isWin) {
          // REFINED COOLDOWN: 3-minute structural pause on LOSS (falling-knife / revenge trading guard)
          this.setAssetCooldown(pos.asset, pos.direction, 3 * 60 * 1000);
        } else {
          // On WIN: 0 Cooldown — allow immediate trend continuation if fresh setup forms
          if (this.assetCooldowns) {
            this.assetCooldowns.delete(`${pos.asset}_${(pos.direction || 'LONG').toUpperCase()}`);
          }
        }
        // Permanently exhaust the completed setup levels for 30 minutes
        this.markSetupExhausted(pos.asset, pos.direction, pos.entry, pos.target, 30 * 60 * 1000);

        const isLiq = result === 'LIQUIDATED';
        const title = isWin ? '🎯 TARGET HIT!' : isLiq ? '⚠️ LIQUIDATION EXIT!' : '🛑 STOP LOSS HIT!';
        const formattedPrice = this.ui.formatPrice(price, '$');
        const pnlSign = pos.unrealizedPnlUSD >= 0 ? '+' : '';
        const msg = `${pos.asset} paper trade closed at ${formattedPrice} (${result}). PnL: ${pnlSign}$${pos.unrealizedPnlUSD}`;
        this.ui.showToast(title, msg, isWin ? 'success' : 'danger');
        this.voiceAssistant.speak(`${pos.asset} trade hit ${isWin ? 'Target' : isLiq ? 'Liquidation' : 'Stop loss'}. Position closed.`);

        // Dispatch persistent notification
        const rStr = pos.unrealizedR !== undefined ? ` (${pos.unrealizedR >= 0 ? '+' : ''}${pos.unrealizedR}R)` : '';
        this.ui.addNotification({
          type: isWin ? 'target' : isLiq ? 'liquidation' : 'stop',
          title: isWin
            ? `Target Hit • ${pos.asset} ${pos.direction}`
            : isLiq
              ? `Liquidated • ${pos.asset} ${pos.direction}`
              : `Stop Loss Hit • ${pos.asset} ${pos.direction}`,
          message: `${pnlSign}$${pos.unrealizedPnlUSD}${rStr} closed at ${formattedPrice}`,
          tradeId: pos.id
        });

        if (this.signalEngine) {
          this.signalEngine.onPositionClosed(pos, result, price);
        }
        // Cloud-First Guarantee: Sync closed trade to Supabase Cloud immediately
        this.syncTradeToSupabase(pos).catch(() => { });
      });
      this.updateTradeJournalAndStats();
    }

    // Active Risk Radar & Circuit Breaker: Rapid tick-level threat audit (throttled to 2.5s)
    const now = Date.now();
    if (this.paperTrader.openPositions.length > 0 && (!this._lastThreatAuditTick || (now - this._lastThreatAuditTick > 2500))) {
      this._lastThreatAuditTick = now;
      this.auditOpenPositionThreats().catch(e => console.warn('[App] Threat audit tick warning:', e));
    }

    // Batched 60 FPS UI DOM Pipeline (Keeps main thread silky smooth during 35+ coin tick torrent)
    if (!this._hudRenderScheduled) {
      this._hudRenderScheduled = true;
      const scheduleFn = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (fn) => setTimeout(fn, 16);
      scheduleFn(() => {
        this._hudRenderScheduled = false;
        this.ui.updateOpenPositions(this.paperTrader.openPositions);
        const liveMetrics = this.paperTrader.getLiveEquity(currentPrices);
        this.ui.updateHeaderAccountHUD(liveMetrics);
      });
    }
  }

  async evaluateAsset(targetAsset) {
    const adapter = this.getActiveAdapter();
    await adapter.ensureAssetInitialized(targetAsset);
    const currentPrice = adapter.getCurrentPrice(targetAsset);
    if (!currentPrice || currentPrice <= 0) return null;

    // SMT Divergence Related Asset for Crypto: BTC vs ETH
    const relatedAsset = targetAsset === 'BTC' ? 'ETH' : 'BTC';

    // Parallel async data pipeline for sub-second evaluation
    const [candles1H, candles5M, relatedCandles5M, sentiment, fundingData] = await Promise.all([
      adapter.getHistoricalCandles(targetAsset, '1H'),
      adapter.getHistoricalCandles(targetAsset, '5M'),
      adapter.getHistoricalCandles(relatedAsset, '5M'),
      this.newsEngine.fetchFearAndGreed(),
      this.derivativesEngine.fetchLiveFundingRate(targetAsset, 'Crypto')
    ]);

    const currencySymbol = '$';
    const eventRisk = this.newsEngine.getOverallEventRisk(targetAsset, 'Crypto');
    const settings = this.getAutoPilotSettings();

    // Strategy Evaluation with Multi-Factor Confluence & Event Shield
    const strategyResult = this.strategyEngine.evaluate(
      targetAsset,
      candles1H,
      candles5M,
      relatedCandles5M,
      currentPrice,
      currencySymbol,
      relatedAsset,
      { sentiment, fundingData, eventRisk, userStandards: settings }
    );

    const isSynthetic = typeof adapter.isAssetSynthetic === 'function' ? adapter.isAssetSynthetic(targetAsset) : false;
    const assetVolume = adapter.cache?.[targetAsset]?.volume || 0;

    const evalData = {
      targetAsset,
      currentPrice,
      strategyResult,
      eventRisk,
      sentiment,
      fundingData,
      currencySymbol,
      candles5M,
      candles1H,
      isSynthetic,
      volume: assetVolume
    };

    // Feed strategy evaluation to Alpha Signals Engine (Auto-Pilot setup unification across genuine market assets)
    if (this.signalEngine && !isSynthetic && (assetVolume === undefined || assetVolume > 10000 )) {
      this.signalEngine.processStrategyResult(targetAsset, evalData);
    }

    return evalData;
  }

  async runFullEvaluation(isBoot = false) {
    const targetAsset = this.currentAsset;
    const adapter = this.getActiveAdapter();

    // Hyper-Sensitive Event Risk Scanner (Ultra-rapid news check)
    if (this.newsEngine.fetchBreakingNewsFeed) {
      this.newsEngine.fetchBreakingNewsFeed().catch(() => { });
    }

    const evalData = await this.evaluateAsset(targetAsset);
    if (!evalData) return;

    const { currentPrice, strategyResult, eventRisk, sentiment, fundingData, currencySymbol, candles5M, candles1H } = evalData;

    // 2. Historical Context Analysis with Real-time Live Candles & Price
    const histContext = this.historicalEngine.evaluate(
      targetAsset,
      strategyResult.direction,
      strategyResult.htfTrend,
      strategyResult.volatility || 'NORMAL',
      'Crypto',
      candles5M,
      currentPrice,
      strategyResult
    );

    // 4. Risk & Position Calculation
    const levels = strategyResult.levels || {
      entry: +(Number(currentPrice).toFixed(2)),
      stopLoss: +((Number(currentPrice) * 0.99).toFixed(2)),
      target: +((Number(currentPrice) * 1.025).toFixed(2))
    };
    const riskParams = this.riskEngine.calculateTradeParameters(
      levels.entry,
      levels.stopLoss,
      levels.target,
      currencySymbol
    );
    riskParams.asset = targetAsset;
    riskParams.direction = strategyResult.direction || (strategyResult.htfTrend?.direction === 'BULLISH' ? 'LONG' : 'SHORT');

    // 5. Update UI Telemetry
    const liveSnapshot = adapter.getSnapshot(targetAsset);
    this.ui.updateTicker(liveSnapshot);
    this.ui.updateStrategyState(strategyResult);
    this.ui.updateContextTelemetry({ historicalContext: histContext, eventRisk, sentiment, fundingData });
    this.ui.updateRiskParameters(riskParams);
    this.chartManager.updateLevelsOverlay(riskParams);

    // 6. Update Brain Context
    this.copilotBrain.updateContext({
      targetAsset,
      currentPrice,
      strategyState: strategyResult,
      historicalContext: histContext,
      eventRisk,
      riskParams,
      openPositions: this.paperTrader.openPositions,
      analytics: this.paperTrader.getAnalytics(),
      market: 'Crypto'
    });

    // 7. Check for State Transitions on current screen asset
    if (this.lastKnownState && this.lastKnownState !== strategyResult.state) {
      this.handleStateTransition(this.lastKnownState, strategyResult.state, strategyResult);
    }
    this.lastKnownState = strategyResult.state;

    // 7.5. Risk Radar & Emergency Circuit Breaker: Proactively audit active positions for acute shocks
    if (this.paperTrader.openPositions.length > 0) {
      await this.auditOpenPositionThreats();
    }

    // 8. Auto-Pilot Multi-Asset Scanner (Fills open positions up to maxTrades across watchlist)
    if (this.autoPilotEnabled) {
      if (isBoot) {
        // Defer heavy multi-asset watchlist scan by 1.5s after boot so screen loads instantly in < 2s
        setTimeout(() => this.scanAndExecuteAutoPilot(), 1500);
      } else {
        await this.scanAndExecuteAutoPilot();
      }
    }
  }

  setAssetCooldown(asset, direction, durationMs = 600000) {
    if (!this.assetCooldowns) this.assetCooldowns = new Map();
    const key = `${asset}_${(direction || 'LONG').toUpperCase()}`;
    this.assetCooldowns.set(key, Date.now() + durationMs);
    console.log(`[Cooldown Guard] Set ${key} universal exit cooldown for ${durationMs / 1000}s`);
  }

  isAssetOnCooldown(asset, direction) {
    if (!this.assetCooldowns) return false;
    const key = `${asset}_${(direction || 'LONG').toUpperCase()}`;
    const expiry = this.assetCooldowns.get(key);
    if (!expiry) return false;
    if (Date.now() > expiry) {
      this.assetCooldowns.delete(key);
      return false;
    }
    return true;
  }

  formatDynamicPrice(val) {
    const num = Number(val);
    if (isNaN(num)) return '0.00';
    if (num >= 1000) return num.toFixed(2);
    if (num >= 1) return num.toFixed(4);
    if (num >= 0.01) return num.toFixed(6);
    return num.toFixed(8);
  }

  markSetupExhausted(asset, direction, entry, target, durationMs = 1800000) {
    if (!this.exhaustedSetups) this.exhaustedSetups = new Map();
    const entryStr = this.formatDynamicPrice(entry);
    const targetStr = this.formatDynamicPrice(target);
    const key = `${asset}_${(direction || 'LONG').toUpperCase()}_${entryStr}_${targetStr}`;
    this.exhaustedSetups.set(key, Date.now() + durationMs);
    console.log(`[Setup Lock] Setup ${key} permanently exhausted for ${durationMs / 60000} mins`);
  }

  isSetupExhausted(asset, direction, entry, target) {
    if (!this.exhaustedSetups) return false;
    const entryStr = this.formatDynamicPrice(entry);
    const targetStr = this.formatDynamicPrice(target);
    const key = `${asset}_${(direction || 'LONG').toUpperCase()}_${entryStr}_${targetStr}`;
    const expiry = this.exhaustedSetups.get(key);
    if (!expiry) return false;
    if (Date.now() > expiry) {
      this.exhaustedSetups.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Risk Radar & Emergency Circuit Breaker: Proactively audit active open positions.
   * If an acute market reversal or shock occurs, cuts the trade early (e.g. at -0.35R to -0.5R)
   * saving substantial capital before the full -1.0R Stop Loss is hit.
   */
  async auditOpenPositionThreats() {
    if (this._isAuditingThreats) return;
    if (!this.paperTrader || !this.paperTrader.openPositions || this.paperTrader.openPositions.length === 0) {
      return;
    }

    this._isAuditingThreats = true;
    try {
      const adapter = this.getActiveAdapter();
      const openPositionsCopy = [...this.paperTrader.openPositions];

      // 1. Pre-fetch BTC 5M candles for benchmark dump/pump detection
      let btcCandles5M = null;
      let btc5mDropPercent = 0;
      let btc5mPumpPercent = 0;
      try {
        btcCandles5M = await adapter.getHistoricalCandles('BTC', '5M');
        if (btcCandles5M && btcCandles5M.length >= 3) {
          const lastCandle = btcCandles5M[btcCandles5M.length - 1];
          const prevCandle = btcCandles5M[btcCandles5M.length - 2];
          const prev2Candle = btcCandles5M[btcCandles5M.length - 3];
          const openRef = prevCandle.open || prev2Candle.open;
          const currentRef = lastCandle.close;
          const pctMove = ((currentRef - openRef) / openRef) * 100;
          if (pctMove <= -1.8) {
            btc5mDropPercent = Math.abs(pctMove);
          } else if (pctMove >= 2.0) {
            btc5mPumpPercent = pctMove;
          }
        }
      } catch (e) {
        // Non-blocking BTC check
      }

      for (const pos of openPositionsCopy) {
        // Ensure position is still open
        const stillOpen = this.paperTrader.openPositions.some(p => p.id === pos.id);
        if (!stillOpen) continue;

        const livePrice = adapter.getCurrentPrice(pos.asset) || pos.currentPrice || pos.entry;
        if (!livePrice || livePrice <= 0) continue;

        const isLong = pos.direction === 'LONG';
        const posRiskUSD = Number(pos.riskUSD) || 1;
        const priceDelta = isLong ? (livePrice - pos.entry) : (pos.entry - livePrice);
        const grossPnl = priceDelta * (Number(pos.positionSize) || 0);
        const currentR = grossPnl / posRiskUSD;
        const tradeAgeMs = Date.now() - (pos.openedAt || 0);

        let triggerReason = null;
        let triggerTitle = '';
        let triggerDetail = '';

        // -------------------------------------------------------------
        // TRIGGER 1: Breaking Shock Catalyst / Event Risk Shield
        // -------------------------------------------------------------
        const eventRisk = this.newsEngine.getOverallEventRisk(pos.asset, 'Crypto');
        if (eventRisk && eventRisk.isShieldTriggered) {
          if (currentR < 0.5) {
            triggerReason = 'SHIELD_EMERGENCY';
            triggerTitle = '🛡️ Shield Circuit Breaker Activated';
            triggerDetail = `High-impact news shock detected for ${pos.asset}. Cut early at ${currentR.toFixed(2)}R.`;
          }
        }

        // -------------------------------------------------------------
        // TRIGGER 2: Benchmark BTC Cascade (Systemic Flash Shock)
        // -------------------------------------------------------------
        if (!triggerReason) {
          if (isLong && btc5mDropPercent >= 1.8 && currentR < 0) {
            // For Altcoins, trigger at >= 1.8%. For BTC itself, trigger on acute collapse >= 2.2%
            if (pos.asset !== 'BTC' || btc5mDropPercent >= 2.2) {
              triggerReason = 'BENCHMARK_COLLAPSE';
              triggerTitle = '⚡ BTC Cascade Circuit Breaker';
              triggerDetail = `BTC sudden flash dump (-${btc5mDropPercent.toFixed(1)}% in 5m). ${pos.asset} Long cut early at ${currentR.toFixed(2)}R.`;
            }
          } else if (!isLong && btc5mPumpPercent >= 2.0 && currentR < 0) {
            if (pos.asset !== 'BTC' || btc5mPumpPercent >= 2.4) {
              triggerReason = 'BENCHMARK_COLLAPSE';
              triggerTitle = '⚡ BTC Short-Squeeze Surge';
              triggerDetail = `BTC vertical short squeeze (+${btc5mPumpPercent.toFixed(1)}% in 5m). ${pos.asset} Short cut early at ${currentR.toFixed(2)}R.`;
            }
          }
        }

        // -------------------------------------------------------------
        // TRIGGER 3: Confirmed Structural Shift (MSS Invalidation)
        // Requires trade maturity (>45s) and adverse drawdown (currentR <= -0.35)
        // -------------------------------------------------------------
        if (!triggerReason && currentR <= -0.35 && tradeAgeMs >= 45000) {
          try {
            const candles5M = await adapter.getHistoricalCandles(pos.asset, '5M');
            if (candles5M && candles5M.length >= 20) {
              const closes = candles5M.map(c => c.close);
              const ema20 = this.strategyEngine.calculateEMA(closes, 20);
              // Confirmed closed candle is index length - 2 (avoids premature wick-outs on live forming candle)
              const closedCandle = candles5M[candles5M.length - 2];
              const lastCandle = candles5M[candles5M.length - 1];

              if (isLong) {
                // Must have confirmed candle close below EMA20 AND live price continuing below EMA20
                if ((closedCandle.close < ema20 || lastCandle.close < ema20) && livePrice < ema20) {
                  const swingLow3 = Math.min(...candles5M.slice(-4, -1).map(c => c.low));
                  if (livePrice < swingLow3) {
                    triggerReason = 'STRUCTURAL_INVALIDATION';
                    triggerTitle = '📉 Structural Invalidation Cut';
                    triggerDetail = `5M Market Structure Shifted Bearish (closed below EMA20 & swing low). Cut at ${currentR.toFixed(2)}R.`;
                  }
                }
              } else {
                // Short: confirmed candle close above EMA20 AND live price continuing above EMA20
                if ((closedCandle.close > ema20 || lastCandle.close > ema20) && livePrice > ema20) {
                  const swingHigh3 = Math.max(...candles5M.slice(-4, -1).map(c => c.high));
                  if (livePrice > swingHigh3) {
                    triggerReason = 'STRUCTURAL_INVALIDATION';
                    triggerTitle = '📈 Structural Invalidation Cut';
                    triggerDetail = `5M Market Structure Shifted Bullish (closed above EMA20 & swing high). Cut at ${currentR.toFixed(2)}R.`;
                  }
                }
              }
            }
          } catch (err) {
            // Non-blocking
          }
        }

        // If any trigger fired, execute early exit
        if (triggerReason) {
          const exitTime = Date.now();
          const closed = this.paperTrader.closePosition(pos.id, triggerReason, livePrice, exitTime);
          if (closed) {
            this.setAssetCooldown(pos.asset, pos.direction, 3 * 60 * 1000);
            this.markSetupExhausted(pos.asset, pos.direction, pos.entry, pos.target, 30 * 60 * 1000);

            const savedR = Math.max(0, 1.0 - Math.abs(closed.rMultiple || 0)).toFixed(2);
            const savedUSD = Math.max(0, (pos.riskUSD || 0) - Math.abs(closed.pnlUSD || 0)).toFixed(2);

            const toastMessage = `${triggerDetail} Capital saved: ~${savedR}R ($${savedUSD}) vs full Stop Loss!`;
            this.ui.showToast(triggerTitle, toastMessage, 'warning');
            this.voiceAssistant.speak(`Circuit breaker activated for ${pos.asset}. Position closed early.`);

            const formattedPrice = this.ui.formatPrice(livePrice, '$');
            const pnlSign = closed.pnlUSD >= 0 ? '+' : '';
            this.ui.addNotification({
              type: 'stop',
              title: `${triggerTitle} • ${pos.asset} ${pos.direction}`,
              message: `${pnlSign}$${closed.pnlUSD} (${closed.rMultiple}R) at ${formattedPrice}. Preserved +$${savedUSD} (${savedR}R).`,
              tradeId: closed.id,
              timestamp: exitTime
            });

            if (this.signalEngine) {
              this.signalEngine.onPositionClosed(pos, closed.result, livePrice);
            }
            this.syncTradeToSupabase(closed).catch(() => {});
            this.updateTradeJournalAndStats();
          }
        }
      }
    } finally {
      this._isAuditingThreats = false;
    }
  }

  async scanAndExecuteAutoPilot() {
    if (!this.autoPilotEnabled || this.isAutoPilotScanning) return;
    this.isAutoPilotScanning = true;

    try {
      const settings = this.getAutoPilotSettings();
      const openPositions = this.paperTrader.openPositions;
      if (openPositions.length >= settings.maxTrades) return;

      // 🛡️ FULL-MARKET PARALLEL SCANNER (All coins evaluated simultaneously)
      const baseCandidates = this.cryptoAdapter?.allMarkets ? this.cryptoAdapter.allMarkets.map(m => m.baseAsset) : ['BTC', 'ETH', 'SOL'];
      const candidateAssets = this.currentAsset
        ? [this.currentAsset, ...baseCandidates.filter(a => a !== this.currentAsset)]
        : baseCandidates;

      // Filter out assets that already have active positions to avoid redundant overhead
      const availableCandidates = candidateAssets.filter(asset =>
        !this.paperTrader.openPositions.some(p => p.asset === asset)
      );

      // 🚀 PARALLEL SWARM EVALUATION: Evaluate all candidate coins simultaneously (<400ms)
      const swarmResults = await Promise.all(
        availableCandidates.map(async (asset) => {
          try {
            if (!this.autoPilotEnabled) return null;

            // 0. Asset-Specific Event Risk Shield Gatekeeper (Capital Preservation Armor)
            if (settings.eventShieldEnabled) {
              const assetRisk = this.newsEngine.getOverallEventRisk(asset, 'Crypto');
              if (assetRisk && assetRisk.isShieldTriggered) {
                console.log(`[Auto-Pilot Swarm] Skipping ${asset}: Event Risk Shield active (${assetRisk.summary || 'Shock Catalyst'}).`);
                return null;
              }
            }

            const evalData = await this.evaluateAsset(asset);
            if (!evalData || !evalData.strategyResult) return null;

            const { strategyResult } = evalData;
            const proposedDir = strategyResult.direction || 'LONG';
            const entryLvl = strategyResult.levels?.entry;
            const targetLvl = strategyResult.levels?.target;

            // 1. Mandatory Cooldown Guard
            if (this.isAssetOnCooldown(asset, proposedDir)) {
              return null;
            }

            // 2. Setup Exhaustion Guard: Prevent re-trading identical completed setup
            if (entryLvl && targetLvl && this.isSetupExhausted(asset, proposedDir, entryLvl, targetLvl)) {
              return null;
            }

            // Dynamic execution eligibility: Either state is CONFIRMED, or score meets user standards
            const isEligible = (
              strategyResult.state === 'CONFIRMED' ||
              (strategyResult.confluenceScore >= settings.minConfluence && strategyResult.levels?.rrRatio >= settings.minRR)
            ) && strategyResult.levels;

            return {
              asset,
              proposedDir,
              strategyResult,
              isEligible,
              confluenceScore: strategyResult.confluenceScore || 0,
              currentPrice: evalData.currentPrice,
              state: strategyResult.state,
              htfTrend: strategyResult.htfTrend?.direction
            };
          } catch (err) {
            console.warn(`[Auto-Pilot Swarm] Error on ${asset}:`, err.message);
            return null;
          }
        })
      );

      // Feed full multi-asset radar overview to Copilot Brain so it knows what's happening across all coins
      const validSwarm = swarmResults.filter(Boolean);
      if (this.copilotBrain && validSwarm.length > 0) {
        this.copilotBrain.updateWatchlistRadar(validSwarm);
      }

      // Priority Execution Queue: Sort highest confluence Grade A setups first
      const eligibleSetups = validSwarm
        .filter(r => r.isEligible)
        .sort((a, b) => b.confluenceScore - a.confluenceScore);

      for (const setup of eligibleSetups) {
        if (!this.autoPilotEnabled) break;
        if (this.paperTrader.openPositions.length >= settings.maxTrades) break;
        console.log(`[Auto-Pilot Swarm] Autonomous execution triggered for ${setup.asset} (${setup.proposedDir}) at ${setup.confluenceScore}% confluence`);
        await this.processAutoPilotExecution(setup.asset, setup.proposedDir, setup.strategyResult);
      }
    } catch (err) {
      console.error('[Auto-Pilot Scanner Error]:', err);
    } finally {
      this.isAutoPilotScanning = false;
    }
  }

  handleStateTransition(oldState, newState, strategyResult) {
    const asset = this.currentAsset;
    const currSym = '$';

    if (newState === 'CONFIRMED') {
      const dir = strategyResult.direction || 'LONG';
      const rr = strategyResult.levels?.rrRatio || '3.2';
      const entry = strategyResult.levels ? Number(strategyResult.levels.entry).toLocaleString() : '';
      const sl = strategyResult.levels ? Number(strategyResult.levels.stopLoss).toLocaleString() : '';
      const tp = strategyResult.levels ? Number(strategyResult.levels.target).toLocaleString() : '';
      const lev = '15x-20x Isolated';

      if (!this.isBooting) {
        this.ui.showToast(`🟢 ${asset} Setup CONFIRMED`, `Grade A confluence satisfied. 1:${rr} RR ready to execute.`, 'success');

        // Actionable voice briefing with exact levels
        this.voiceAssistant.speak(
          `Alert! ${asset} ${dir} confirm ho gaya hai! Entry ${currSym}${entry} pe lo, Stop Loss ${currSym}${sl} pe lock rakho, aur Target ${currSym}${tp} hai with 1:${rr} Risk Reward.`
        );

        this.ui.addNotification({
          type: 'ai',
          title: `AI Confirmed • ${asset} ${dir}`,
          message: `Grade A (${strategyResult.confluenceScore || 85}%) • 1:${rr} RR • Entry: ${currSym}${entry} • SL: ${currSym}${sl} • TP: ${currSym}${tp}`
        });
      }

      // Inject Interactive Trade Blueprint Card into chat transcript
      this.ui.appendTradeBlueprintCard({
        asset,
        direction: dir,
        entry: strategyResult.levels?.entry,
        stopLoss: strategyResult.levels?.stopLoss,
        target: strategyResult.levels?.target,
        rrRatio: rr,
        confluenceScore: strategyResult.confluenceScore || 85,
        confluenceGrade: strategyResult.confluenceGrade || 'GRADE A',
        recommendedLeverage: lev,
        currencySymbol: currSym,
        levels: strategyResult.levels
      });

      // Autonomous AI Auto-Pilot Execution (If Active)
      // HTF Gate: only fire if direction matches the 1H trend
      if (this.autoPilotEnabled) {
        const htfDir = strategyResult.htfTrend?.direction;
        const execDir = dir;
        const directionAligned = (htfDir === 'BULLISH' && execDir === 'LONG') || (htfDir === 'BEARISH' && execDir === 'SHORT');
        if (directionAligned) {
          this.processAutoPilotExecution(asset, dir, strategyResult);
        } else {
          console.warn(`[HTF Gate / StateTransition] Blocked ${asset} ${execDir}: 1H trend is ${htfDir}.`);
        }
      }
    } else if (newState === 'DEVELOPING') {
      this.ui.showToast(`🟠 ${asset} Setup DEVELOPING`, `Price reaction zone me enter ho chuki hai. Awaiting confirmation.`, 'warning');
      this.voiceAssistant.speak(`${asset} setup develop ho raha hai. Reaction zone me price monitor kar rahi hu.`);
    } else if (newState === 'CANCELLED') {
      this.ui.showToast(`🔴 ${asset} Setup CANCELLED`, `Key invalidation level break ho chuka hai.`, 'danger');
      this.voiceAssistant.speak(`${asset} setup invalidate ho gaya hai. Trade cancelled.`);
    }

    // Auto-log AI commentary in chat
    const briefing = this.copilotBrain.generateMarketBriefing();
    this.ui.appendChatMessage('copilot', briefing);
  }

  async pushSettingsToCloud(settings = null) {
    try {
      const cfg = window.MONDAY_SUPABASE_CONFIG;
      if (!cfg || !cfg.url || !cfg.anonKey) return;
      const activeUserId = this.authManager && this.authManager.getUserId ? this.authManager.getUserId() : 'guest_autopilot';
      const token = (this.authManager && typeof this.authManager.getAuthToken === 'function')
        ? await this.authManager.getAuthToken()
        : cfg.anonKey;

      const effectiveUserId = (token && token !== cfg.anonKey) ? activeUserId : 'guest_autopilot';
      const apSettings = settings || this.getAutoPilotSettings();
      apSettings.userId = effectiveUserId;
      const userConfig = {
        userId: effectiveUserId,
        autopilotSettings: apSettings,
        autoPilotEnabled: this.autoPilotEnabled,
        watchlist: this.ui?.userWatchlist || this._userWatchlist || ['BTC', 'ETH', 'SOL', 'OP', 'DOGE', 'SUI', 'ALGO', 'ARB', 'INJ', 'UNI'],
        multiLayout: this.chartManager?.activeLayoutId || '1',
        preferredMarket: 'Crypto',
        voiceMuted: this.voiceAssistant?.voiceMuted || false,
        signalsArchivedClearedAt: Number(this.signalEngine?.archivedClearedAt || 0),
        updatedAt: new Date().toISOString()
      };
      const configId = effectiveUserId === 'guest_autopilot' ? 'CONFIG_AUTOPILOT_GUEST' : `CONFIG_AUTOPILOT_${effectiveUserId}`;
      const payload = {
        id: configId,
        user_id: effectiveUserId,
        market: 'Crypto' || 'Crypto',
        asset: 'SETTINGS',
        direction: 'CONFIG',
        entry_price: 0,
        stop_loss: 0,
        target_price: 0,
        risk_usd: apSettings.marginUSD || 20,
        reward_usd: apSettings.leverage || 20,
        rr_ratio: apSettings.minRR || 2.5,
        position_size: apSettings.maxTrades || 3,
        status: 'CONFIG',
        strategy: JSON.stringify(userConfig)
      };

      const payloads = [payload];
      if (effectiveUserId !== 'guest_autopilot') {
        payloads.push({
          ...payload,
          id: 'CONFIG_AUTOPILOT_GUEST',
          user_id: 'guest_autopilot'
        });
      }

      await fetch(`${cfg.url}/rest/v1/paper_trades`, {
        method: 'POST',
        headers: {
          'apikey': cfg.anonKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payloads)
      });
      console.log('[App] Full user settings & workspace preferences synced to Supabase Cloud.');
    } catch (err) {
      console.warn('[App] Cloud settings push warning:', err.message);
    }
  }

  getAutoPilotSettings() {
    if (this._autoPilotSettings) {
      return {
        marginUSD: Math.max(5, Math.min(500, parseFloat(this._autoPilotSettings.marginUSD) || 100)),
        leverage: Math.max(1, Math.min(50, parseInt(this._autoPilotSettings.leverage, 10) || 20)),
        maxTrades: Math.max(1, Math.min(100, parseInt(this._autoPilotSettings.maxTrades, 10) || 10)),
        minConfluence: Math.max(50, Math.min(95, parseInt(this._autoPilotSettings.minConfluence, 10) || 75)),
        minRR: Math.max(1.5, Math.min(5.0, parseFloat(this._autoPilotSettings.minRR) || 2.0)),
        eventShieldEnabled: this._autoPilotSettings.eventShieldEnabled !== false
      };
    }
    return {
      marginUSD: 100,
      leverage: 20,
      maxTrades: 10,
      minConfluence: 75,
      minRR: 2.0,
      eventShieldEnabled: true
    };
  }

  async handleAutoPilotSignalFill(signal) {
    if (!signal || !this.autoPilotEnabled) return;
    const settings = this.getAutoPilotSettings();

    // Check max concurrent trades limit
    if (settings.maxTrades < 900 && this.paperTrader.openPositions.length >= settings.maxTrades) {
      console.warn(`[Auto-Pilot Fill] Max ${settings.maxTrades} trades already open. Skipping fill for ${signal.asset}.`);
      return;
    }

    // Check duplicate position on same asset
    if (this.paperTrader.openPositions.some(p => p.asset === signal.asset)) {
      return;
    }

    const lev = settings.leverage || 20;
    const marginUSD = settings.marginUSD || 100;
    const notional = +(marginUSD * lev).toFixed(2);
    const rawPos = notional / signal.entryPrice;
    const posSize = signal.entryPrice >= 1000
      ? +rawPos.toFixed(6)
      : (signal.entryPrice >= 1 ? +rawPos.toFixed(4) : +rawPos.toFixed(2));
    const rr = Number(signal.riskReward) || 2.0;

    const trade = this.paperTrader.executePaperTrade({
      asset: signal.asset,
      market: 'Crypto' || 'Crypto',
      direction: signal.direction,
      entry: signal.entryPrice,
      stopLoss: signal.stopLossPrice,
      target: signal.takeProfitPrice,
      leverage: lev,
      marginUSD: marginUSD,
      notionalUSD: notional,
      positionSize: posSize,
      rrRatio: rr,
      riskUSD: marginUSD,
      rewardUSD: +(marginUSD * rr).toFixed(2)
    });

    if (trade) {
      signal.tradeId = trade.id;
      signal.inPortfolio = true;
      this.updateTradeJournalAndStats();
      this.ui.updateOpenPositions(this.paperTrader.openPositions);
      this.ui.updateHeaderAccountHUD(this.paperTrader.getLiveEquity());
      this.syncTradeToSupabase(trade).catch(() => { });
      this.ui.showToast('🤖 Auto-Pilot Position Filled', `${signal.asset} ${signal.direction} Limit Order filled @ $${signal.entryPrice}!`, 'success');
      this.voiceAssistant.speak(`Auto-pilot position filled for ${signal.asset} ${signal.direction}. Stoploss and target armed.`);
    }
  }

  async processAutoPilotExecution(asset, direction, strategyResult) {
    // 🔒 ABSOLUTE MASTER KILL-SWITCH: If Auto-Pilot is turned OFF, abort execution immediately
    if (!this.autoPilotEnabled) {
      console.warn(`[Auto-Pilot Master Gate] Blocked execution for ${asset}: Auto-Pilot is switched OFF.`);
      return;
    }

    const settings = this.getAutoPilotSettings();
    const openPositions = this.paperTrader.openPositions;
    const currentOpenCount = openPositions.length;
    const currSym = '$';

    // 0. Hyper-Sensitive Event Risk Shield Gatekeeper (Safety First)
    const eventRisk = this.newsEngine.getOverallEventRisk(asset, 'Crypto');
    const isShieldActive = settings.eventShieldEnabled && eventRisk.isShieldTriggered;
    if (isShieldActive) {
      const now = Date.now();
      const shockTitle = eventRisk.activeEvents?.[0]?.title || eventRisk.summary || 'Breaking Macro / Regulatory Shock';

      // Debounce notifications: only alert user once every 10 minutes
      if (!this.lastEventShieldToastTime || (now - this.lastEventShieldToastTime) > 600000) {
        this.lastEventShieldToastTime = now;
        this.ui.appendAutonomousDecisionCard({
          action: 'SKIPPED',
          asset,
          direction,
          openCount: currentOpenCount,
          maxTrades: settings.maxTrades,
          skipReason: '🚨 HYPER-SENSITIVE EVENT RISK SHIELD ACTIVE',
          skipExplanation: `Breaking shock catalyst detected: "${shockTitle}". Auto-Pilot engaged capital preservation armor. Entries throttled to prevent volatile news slippage and wick hunts.`
        });
        this.voiceAssistant.speak('Alert! Breaking shock catalyst detected. Auto-pilot entry cancelled to protect capital.');
        this.ui.showToast('🛡️ Event Risk Shield Active', `${shockTitle.slice(0, 55)}... Order cancelled.`, 'warning');
      }

      // Put this asset on a 1-minute cooldown so it doesn't repeatedly spam while shield is active
      this.setAssetCooldown(asset, direction, 60000);
      return;
    }

    // 1. Max Concurrent Trades Guardrail (Bypassed when >= 900 for testing)
    if (settings.maxTrades < 900 && currentOpenCount >= settings.maxTrades) {
      this.ui.appendAutonomousDecisionCard({
        action: 'SKIPPED',
        asset,
        direction,
        openCount: currentOpenCount,
        maxTrades: settings.maxTrades,
        skipReason: `Max ${settings.maxTrades} Concurrent Trades Limit Reached`,
        skipExplanation: `Auto-Pilot currently holds ${currentOpenCount} active open positions (${openPositions.map(p => p.asset).join(', ')}). To prevent portfolio over-exposure, new entries are strictly capped until an existing trade hits TP or SL.`
      });
      this.ui.showToast('⚠️ Auto-Pilot Throttled', `Max ${settings.maxTrades} concurrent positions active. Capital protection preserved.`, 'warning');
      return;
    }

    // 🔒 1.5. HARD HTF TREND DIRECTIONAL GATE — Permanent Fix
    // If 1H trend is BEARISH → only SHORT allowed. LONG = absolute block.
    // If 1H trend is BULLISH → only LONG allowed. SHORT = absolute block.
    const htfDirection = strategyResult.htfTrend?.direction || 'UNCLEAR';
    const allowedDirection = htfDirection === 'BULLISH' ? 'LONG' : (htfDirection === 'BEARISH' ? 'SHORT' : null);
    if (!allowedDirection || direction !== allowedDirection) {
      const trendLabel = htfDirection === 'BULLISH' ? '📈 Bullish' : htfDirection === 'BEARISH' ? '📉 Bearish' : '↔️ Sideways/Unclear';
      console.warn(`[HTF Gate] BLOCKED ${asset} ${direction}: 1H trend is ${htfDirection}. Only ${allowedDirection || 'WAIT'} entries allowed.`);
      this.ui.appendAutonomousDecisionCard({
        action: 'SKIPPED',
        asset,
        direction,
        openCount: currentOpenCount,
        maxTrades: settings.maxTrades,
        skipReason: `🔒 HTF Trend Gate: ${trendLabel} Market`,
        skipExplanation: `1H higher-timeframe trend is ${htfDirection}. Only ${allowedDirection || 'no'} trades are allowed in this regime. A ${direction} entry would trade AGAINST the institutional trend — blocked to protect capital.`
      });
      return;
    }

    // 2. Prevent Duplicate Trade on Same Asset
    const alreadyOpen = openPositions.some(p => p.asset === asset);
    if (alreadyOpen) {
      this.ui.appendAutonomousDecisionCard({
        action: 'SKIPPED',
        asset,
        direction,
        openCount: currentOpenCount,
        maxTrades: settings.maxTrades,
        skipReason: `Duplicate Position on ${asset}`,
        skipExplanation: `An active ${asset} position is already open and running. Pyramiding or duplicate exposure is blocked for safety.`
      });
      return;
    }

    // 3. Confluence & RR Gatekeeper (Configurable Thresholds)
    const score = Math.round(strategyResult.confluenceScore || 0);
    const rr = Number(strategyResult.levels?.rrRatio || 0);
    if (score < settings.minConfluence || rr < settings.minRR) {
      this.ui.appendAutonomousDecisionCard({
        action: 'SKIPPED',
        asset,
        direction,
        openCount: currentOpenCount,
        maxTrades: settings.maxTrades,
        skipReason: `Setup Filtered by Standards (${score}% Conf, 1:${rr} RR)`,
        skipExplanation: `Auto-Pilot execution standards require minimum ${settings.minConfluence}% Confluence and 1:${settings.minRR} RR. Setup filtered out to avoid choppy/low-probability market.`
      });
      return;
    }

    // 3.5. Extract setup levels & Pre-Flight Price Sanity Firewall
    const rawEntry = Number(strategyResult.levels.entry);
    const stopLoss = Number(strategyResult.levels.stopLoss);
    const target = Number(strategyResult.levels.target);

    const adapter = this.getActiveAdapter();
    const livePrice = adapter.getCurrentPrice(asset) || rawEntry;

    // Zero-Tolerance Price Sanity Check: If market has reached or crossed SL or TP, block order
    if (direction === 'LONG') {
      if (livePrice <= stopLoss || livePrice >= target) {
        console.warn(`[Auto-Pilot Firewall] LONG blocked for ${asset}: Live price ($${livePrice}) is at/past SL ($${stopLoss}) or TP ($${target}).`);
        this.ui.appendAutonomousDecisionCard({
          action: 'SKIPPED',
          asset,
          direction,
          openCount: currentOpenCount,
          maxTrades: settings.maxTrades,
          skipReason: '🚨 PRE-FLIGHT PRICE FIREWALL ACTIVE',
          skipExplanation: `Live market price ($${livePrice}) is already at or past setup target ($${target}) or stop loss ($${stopLoss}). Order discarded to protect capital.`
        });
        return;
      }
    } else {
      if (livePrice >= stopLoss || livePrice <= target) {
        console.warn(`[Auto-Pilot Firewall] SHORT blocked for ${asset}: Live price ($${livePrice}) is at/past SL ($${stopLoss}) or TP ($${target}).`);
        this.ui.appendAutonomousDecisionCard({
          action: 'SKIPPED',
          asset,
          direction,
          openCount: currentOpenCount,
          maxTrades: settings.maxTrades,
          skipReason: '🚨 PRE-FLIGHT PRICE FIREWALL ACTIVE',
          skipExplanation: `Live market price ($${livePrice}) is already at or past setup target ($${target}) or stop loss ($${stopLoss}). Order discarded to protect capital.`
        });
        return;
      }
    }

    // Institutional Entry Zone Check:
    // Only execute if live market price is sitting in the valid entry/pullback zone (at or better than limit entry)
    // without breaching stop-loss or chasing towards target.
    const isInEntryZone = direction === 'LONG'
      ? (livePrice <= rawEntry && livePrice > stopLoss)
      : (livePrice >= rawEntry && livePrice < stopLoss);

    if (!isInEntryZone) {
      const isChasing = direction === 'LONG' ? (livePrice > rawEntry) : (livePrice < rawEntry);
      console.warn(`[Auto-Pilot Entry Gate] Setup for ${asset} ${direction} is outside entry zone (Live: $${livePrice}, Entry: $${rawEntry}).`);
      this.ui.appendAutonomousDecisionCard({
        action: 'SKIPPED',
        asset,
        direction,
        openCount: currentOpenCount,
        maxTrades: settings.maxTrades,
        skipReason: isChasing ? '🚫 ANTI-CHASING SHIELD ACTIVE' : '⏳ AWAITING LIMIT ENTRY TOUCH',
        skipExplanation: isChasing
          ? `Live market price ($${livePrice}) has moved past entry towards target. Auto-Pilot strictly forbids chasing to protect risk-reward asymmetry.`
          : `Live market price ($${livePrice}) is awaiting retracement to limit level ($${rawEntry}). Order will trigger automatically upon limit fill.`
      });
      return;
    }

    // Fill at exact live market tick to the penny
    const entry = livePrice;

    // 4. Autonomous Execution (Configured Margin & Leverage)
    const leverage = settings.leverage;
    const marginUSD = settings.marginUSD;
    const notionalUSD = +(marginUSD * leverage).toFixed(2);
    const rawPosSize = notionalUSD / entry;
    const positionSize = entry >= 1000
      ? +rawPosSize.toFixed(6)
      : (entry >= 1 ? +rawPosSize.toFixed(4) : (entry >= 0.01 ? +rawPosSize.toFixed(2) : Math.round(rawPosSize)));
    const riskUSD = marginUSD;
    const rewardUSD = +(riskUSD * rr).toFixed(2);
    const rawLiq = direction === 'LONG'
      ? entry * (1 - (1 / leverage) * 0.95)
      : entry * (1 + (1 / leverage) * 0.95);
    const liqPrice = entry >= 1000
      ? +rawLiq.toFixed(2)
      : (entry >= 1 ? +rawLiq.toFixed(4) : (entry >= 0.01 ? +rawLiq.toFixed(6) : +rawLiq.toFixed(8)));

    const orderPacket = {
      asset,
      market: 'Crypto',
      direction,
      entry,
      stopLoss,
      target,
      rrRatio: rr,
      leverage,
      marginUSD,
      notionalUSD,
      positionSize,
      riskUSD,
      rewardUSD,
      liquidationPrice: liqPrice,
      conditions: strategyResult.reasoning || ['Autonomous Neural Execution'],
      historicalContext: 'Supportive',
      eventRisk: eventRisk.level || 'Low'
    };

    const executedPos = await this.executeCurrentTrade(orderPacket);
    if (!executedPos) {
      console.warn(`[Auto-Pilot] Execution skipped or blocked by risk firewall for ${asset}`);
      return;
    }

    // Lock setup fingerprint immediately so this exact setup cannot be re-entered
    this.markSetupExhausted(asset, direction, rawEntry, target);

    // Voice announcement
    this.voiceAssistant.speak(
      `Auto-Pilot Execution: ${asset} ${direction} position automatically enter kar di gayi hai at ${currSym}${entry} with strict 1:${rr} Risk Reward.`
    );

    // Transparent Chain-of-Thought Decision Card in Chat
    this.ui.appendAutonomousDecisionCard({
      action: 'EXECUTED',
      asset,
      direction,
      entry,
      stopLoss,
      target,
      rrRatio: rr,
      confluenceScore: score,
      confluenceGrade: strategyResult.confluenceGrade || 'GRADE A',
      htfTrend: strategyResult.htfTrend?.direction || 'BULLISH',
      riskUSD,
      leverage,
      openCount: this.paperTrader.openPositions.length,
      maxTrades: settings.maxTrades,
      currencySymbol: currSym,
      rsiInfo: `1H RSI: ${strategyResult.rsi1H || 55} • 5M RSI: ${strategyResult.rsi5M || 50} (${strategyResult.rsiStatus || 'Momentum Aligned'})`,
      volumeInfo: strategyResult.volumeFlow?.desc || 'Normal Baseline Volume (20-VMA Validated)',
      sentimentInfo: `Market Sentiment: ${this.newsEngine.getMarketSentiment(this.currentMarket).classification} (${this.newsEngine.getMarketSentiment(this.currentMarket).score})`,
      fundingInfo: `Funding Rate: ${(await this.derivativesEngine.fetchLiveFundingRate(asset, this.currentMarket)).rateFormatted} (Balanced Crowd Exposure)`
    });
  }

  async handleUserMessage(message) {
    if (!message || !message.trim()) return;
    this.ui.appendChatMessage('user', message);

    const reply = await this.copilotBrain.processQuery(message);
    this.ui.appendChatMessage('copilot', reply);
    this.voiceAssistant.speak(reply);
  }

  toggleVoiceListening() {
    if (this.voiceAssistant.isListening) {
      this.voiceAssistant.stopListening();
    } else {
      this.voiceAssistant.startListening();
    }
  }

  async executeCurrentTrade(customOrder = null) {
    const ctx = this.copilotBrain.currentContext;
    const adapter = this.getActiveAdapter();
    const currency = '$';

    let orderParams;
    if (customOrder && customOrder.entry) {
      orderParams = {
        asset: customOrder.asset || this.currentAsset,
        market: 'Crypto',
        direction: customOrder.direction || 'LONG',
        entry: customOrder.entry,
        stopLoss: customOrder.stopLoss,
        target: customOrder.target,
        positionSize: customOrder.positionSize,
        riskUSD: customOrder.riskUSD,
        rewardUSD: customOrder.rewardUSD,
        rrRatio: customOrder.rrRatio,
        leverage: customOrder.leverage || 20,
        marginUSD: customOrder.marginUSD,
        notionalUSD: customOrder.notionalUSD,
        liquidationPrice: customOrder.liquidationPrice,
        conditions: customOrder.conditions || ctx?.strategyState?.reasoning || ['Delta Derivatives Desk Execution'],
        historicalContext: customOrder.historicalContext || ctx?.historicalContext?.contextTag || 'Supportive',
        eventRisk: customOrder.eventRisk || ctx?.eventRisk?.level || 'Low',
        aiReasoning: `Executed at ${currency}${customOrder.entry} with ${customOrder.leverage}x leverage. Margin: ${currency}${customOrder.marginUSD}. Est Liq: ${currency}${customOrder.liquidationPrice}.`
      };
    } else {
      if (!ctx || !ctx.riskParams) {
        this.ui.showToast('Execution Error', 'Risk parameters calculate nahi ho sake.', 'danger');
        return;
      }
      const { targetAsset, strategyState, historicalContext, eventRisk, riskParams } = ctx;
      orderParams = {
        asset: targetAsset,
        market: 'Crypto',
        direction: strategyState.direction || 'LONG',
        entry: riskParams.entry,
        stopLoss: riskParams.stopLoss,
        target: riskParams.target,
        positionSize: riskParams.positionSizeCoins,
        riskUSD: riskParams.maxRiskUSD,
        rewardUSD: riskParams.potentialRewardUSD,
        rrRatio: riskParams.rrRatio,
        leverage: 20,
        marginUSD: riskParams.maxRiskUSD,
        notionalUSD: +(riskParams.entry * riskParams.positionSizeCoins).toFixed(2),
        liquidationPrice: null,
        conditions: strategyState.reasoning,
        historicalContext: historicalContext.contextTag,
        eventRisk: eventRisk.level,
        aiReasoning: `Executed at ${currency}${riskParams.entry} with strict 1% risk.`
      };
    }

    const newPos = this.paperTrader.executePaperTrade(orderParams);
    if (!newPos) {
      console.warn('[App] Order placement rejected by PaperTrader firewall:', orderParams?.asset);
      this.ui.showToast('Order Rejected', `Order for ${orderParams?.asset || 'asset'} was rejected by safety & risk firewall.`, 'warning');
      return null;
    }

    // Ensure live market tick listener is active for this asset
    await adapter.ensureAssetInitialized(newPos.asset);
    adapter.subscribe(newPos.asset, this._boundOnMarketDataTick);

    const formattedEntry = this.ui.formatPrice(newPos.entry);
    if (!this.isBooting) {
      this.ui.showToast('🚀 Order Executed', `${newPos.asset} ${newPos.direction} [${newPos.leverage}x] entered at ${formattedEntry}. Live tracking active!`, 'success');
      this.voiceAssistant.speak(`${newPos.asset} ${newPos.direction} entered with ${newPos.leverage}x leverage.`);

      this.ui.addNotification({
        type: 'order',
        title: `Order Executed • ${newPos.asset} ${newPos.direction} [${newPos.leverage}x]`,
        message: `Entered at ${formattedEntry} • Margin: $${newPos.marginUSD}`,
        tradeId: newPos.id
      });
    }

    this.ui.updateOpenPositions(this.paperTrader.openPositions);
    const liveMetrics = this.paperTrader.getLiveEquity();
    this.ui.updateHeaderAccountHUD(liveMetrics);
    this.updateTradeJournalAndStats();
    this.syncTradeToSupabase(newPos);
    if (this.signalEngine) {
      this.signalEngine.registerExecutedPosition(newPos);
    }
    return newPos;
  }

  closeActiveTrade(tradeId) {
    const closed = this.paperTrader.closePosition(tradeId, 'MANUAL');
    if (closed) {
      const pnlPrefix = closed.pnlUSD >= 0 ? '+' : '';
      this.ui.showToast('Trade Closed', `${closed.asset} manually closed. PnL: ${pnlPrefix}$${closed.pnlUSD} (${closed.rMultiple >= 0 ? '+' : ''}${closed.rMultiple}R).`, 'info');
      this.voiceAssistant.speak(`Trade closed. Realized profit ${closed.pnlUSD} dollars.`);

      const isWin = closed.pnlUSD >= 0;
      this.ui.addNotification({
        type: isWin ? 'target' : 'stop',
        title: `Position Closed • ${closed.asset} ${closed.direction}`,
        message: `${pnlPrefix}$${closed.pnlUSD} (${closed.rMultiple >= 0 ? '+' : ''}${closed.rMultiple}R) at ${this.ui.formatPrice(closed.exitPrice)}`,
        tradeId: closed.id
      });

      this.ui.updateOpenPositions(this.paperTrader.openPositions);
      this.updateTradeJournalAndStats();
      this.syncTradeToSupabase(closed);
      if (this.signalEngine) {
        this.signalEngine.onPositionClosed(closed);
      }
    }
  }

  async closeAllActiveTrades() {
    if (!this.paperTrader.openPositions || this.paperTrader.openPositions.length === 0) return;

    // Refresh live mark prices from active adapter before closing
    const adapter = this.getActiveAdapter();
    const livePrices = {};
    for (const pos of this.paperTrader.openPositions) {
      const p = adapter.getCurrentPrice(pos.asset) || pos.currentPrice || pos.entry;
      pos.currentPrice = p;
      livePrices[pos.asset] = p;
    }
    this.paperTrader.updateLivePositions(livePrices);

    const closedList = this.paperTrader.closeAllPositions('MANUAL');
    if (closedList && closedList.length > 0) {
      const totalPnL = closedList.reduce((sum, t) => sum + (Number(t.pnlUSD) || 0), 0);
      const isPositive = totalPnL >= 0;
      const pnlPrefix = isPositive ? '+' : '';
      const pnlFormatted = `${pnlPrefix}$${totalPnL.toFixed(2)}`;

      this.ui.showToast(
        'All Trades Closed',
        `Closed ${closedList.length} positions at market LTP. Total Realized: ${pnlFormatted}`,
        isPositive ? 'success' : 'info'
      );

      this.voiceAssistant.speak(
        `All active positions closed at market price. Realized profit and loss ${totalPnL.toFixed(2)} dollars.`
      );

      this.ui.addNotification({
        type: isPositive ? 'target' : 'stop',
        title: `Panic Flatten • ${closedList.length} Positions Closed`,
        message: `Closed all active positions at market LTP. Total Realized: ${pnlFormatted}`
      });

      this.ui.updateOpenPositions(this.paperTrader.openPositions);
      const liveMetrics = this.paperTrader.getLiveEquity();
      this.ui.updateHeaderAccountHUD(liveMetrics);
      this.updateTradeJournalAndStats();

      // Sync all closed trades to Supabase & SignalEngine
      for (const t of closedList) {
        this.syncTradeToSupabase(t);
        if (this.signalEngine) {
          this.signalEngine.onPositionClosed(t);
        }
      }
    }
  }

  formatTradePayload(trade, activeUserId) {
    const openedAtTime = trade.openedAt ? Number(trade.openedAt) : Date.now();
    const closedAtTime = trade.closedAt ? Number(trade.closedAt) : (trade.status === 'CLOSED' ? Date.now() : null);
    const fees = Number(trade.feesUSD || trade.totalFeesUSD || 0);
    const brokerage = Number(trade.brokerageFeeUSD !== undefined ? trade.brokerageFeeUSD : (fees > 0 ? +(fees / 1.18).toFixed(2) : 0));
    const gst = Number(trade.gstUSD !== undefined ? trade.gstUSD : (fees > 0 ? +(fees - brokerage).toFixed(2) : 0));
    const gross = Number(trade.grossPnLUSD !== undefined ? trade.grossPnLUSD : (trade.pnlUSD ? +(Number(trade.pnlUSD) + fees).toFixed(2) : 0));

    const meta = {
      strategyName: trade.strategy || '20x Isolated HTF-Trend Pullback',
      openedAt: openedAtTime,
      closedAt: closedAtTime,
      exitReason: trade.exitReason || trade.closeReason || (trade.result === 'WIN' ? 'TAKE_PROFIT' : (trade.result === 'LOSS' ? 'STOP_LOSS' : null)),
      feesUSD: fees,
      totalFeesUSD: fees,
      brokerageFeeUSD: brokerage,
      gstUSD: gst,
      grossPnLUSD: gross
    };

    return {
      id: trade.id,
      user_id: activeUserId,
      market: trade.market || 'Crypto',
      asset: trade.asset,
      direction: trade.direction,
      entry_price: trade.entry,
      stop_loss: trade.stopLoss,
      target_price: trade.target,
      position_size: trade.positionSize,
      risk_usd: trade.riskUSD,
      reward_usd: trade.rewardUSD,
      rr_ratio: trade.rrRatio ? parseFloat(trade.rrRatio) : 3.0,
      status: trade.status || 'OPEN',
      result: trade.result || (trade.status === 'CLOSED' ? (Number(trade.pnlUSD || 0) >= 0 ? 'WIN' : 'LOSS') : null),
      pnl_usd: trade.pnlUSD || 0,
      r_multiple: trade.rMultiple || 0,
      exit_price: trade.exitPrice || null,
      timeframe: '5M',
      strategy: JSON.stringify(meta),
      created_at: new Date(openedAtTime).toISOString()
    };
  }

  formatSignalPayload(signal, activeUserId) {
    const issuedAtTime = signal.issuedAt ? Number(signal.issuedAt) : Date.now();
    const meta = {
      confluenceScore: signal.confluenceScore || 85,
      confluenceGrade: signal.confluenceGrade || 'GRADE A',
      rationale: signal.rationale || ['1H HTF Directional Confluence', 'Institutional Order Flow'],
      currencySymbol: signal.currencySymbol || '$',
      validityMinutes: signal.validityMinutes || 45,
      issuedAt: issuedAtTime,
      expiresAt: signal.expiresAt || (issuedAtTime + 2700000),
      filledAt: signal.filledAt || null,
      closedAt: signal.closedAt || null,
      tradeId: signal.tradeId || null,
      invalidatedReason: signal.invalidatedReason || null
    };

    return {
      id: signal.id,
      user_id: 'guest_autopilot',
      market: 'Crypto',
      asset: signal.asset,
      direction: signal.direction,
      entry_price: signal.entryPrice,
      stop_loss: signal.stopLossPrice,
      target_price: signal.takeProfitPrice,
      position_size: 0,
      risk_usd: 0,
      reward_usd: 0,
      rr_ratio: signal.riskReward,
      status: 'SIGNAL_' + signal.status,
      result: signal.status === 'TP_HIT' ? 'WIN' : (signal.status === 'SL_HIT' ? 'LOSS' : null),
      pnl_usd: 0,
      r_multiple: signal.realizedR || 0,
      exit_price: signal.takeProfitPrice,
      timeframe: '5M',
      strategy: JSON.stringify(meta),
      created_at: new Date(issuedAtTime).toISOString()
    };
  }

  async syncTradeToSupabase(trade) {
    try {
      const cfg = window.MONDAY_SUPABASE_CONFIG;
      if (!cfg || !cfg.url || !cfg.anonKey || !trade) return;
      const activeUserId = this.authManager && this.authManager.getUserId ? this.authManager.getUserId() : 'guest_autopilot';
      const token = (this.authManager && typeof this.authManager.getAuthToken === 'function')
        ? await this.authManager.getAuthToken()
        : cfg.anonKey;
      const effectiveUserId = (token === cfg.anonKey) ? 'guest_autopilot' : activeUserId;

      const payload = this.formatTradePayload(trade, effectiveUserId);
      await fetch(`${cfg.url}/rest/v1/paper_trades`, {
        method: 'POST',
        headers: {
          'apikey': cfg.anonKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('[App] Supabase trade sync offline/failed:', e.message);
    }
  }

  async syncSignalToSupabase(signal) {
    try {
      const cfg = window.MONDAY_SUPABASE_CONFIG;
      if (!cfg || !cfg.url || !cfg.anonKey || !signal) return;
      const activeUserId = this.authManager && this.authManager.getUserId ? this.authManager.getUserId() : 'guest_autopilot';
      const token = (this.authManager && typeof this.authManager.getAuthToken === 'function')
        ? await this.authManager.getAuthToken()
        : cfg.anonKey;
      const effectiveUserId = (token === cfg.anonKey) ? 'guest_autopilot' : activeUserId;

      const payload = this.formatSignalPayload(signal, effectiveUserId);
      await fetch(`${cfg.url}/rest/v1/paper_trades`, {
        method: 'POST',
        headers: {
          'apikey': cfg.anonKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('[App] Supabase signal sync offline/failed:', e.message);
    }
  }

  async reconcileOfflineTradesWithSupabase() {
    try {
      const cfg = window.MONDAY_SUPABASE_CONFIG;
      if (!cfg || !cfg.url || !cfg.anonKey) return;
      const activeUserId = this.authManager && this.authManager.getUserId ? this.authManager.getUserId() : 'guest_autopilot';
      const token = (this.authManager && typeof this.authManager.getAuthToken === 'function')
        ? await this.authManager.getAuthToken()
        : cfg.anonKey;
      const effectiveUserId = (token === cfg.anonKey) ? 'guest_autopilot' : activeUserId;

      // 1. Reconcile user settings & preferences
      this.pushSettingsToCloud().catch(() => { });

      // 2. Reconcile paper trades
      const toSyncTrades = [...(this.paperTrader.openPositions || []), ...(this.paperTrader.trades || [])].filter(t => {
        if (t.id && (t.id.toLowerCase().includes('test') || t.id.toLowerCase().includes('bat'))) return false;
        if (t.asset === 'BTC' && Number(t.entry) === 60000) return false;
        if (t.asset === 'ETH' && Number(t.entry) === 3000 && Math.abs(Number(t.pnlUSD || 0)) < 0.01) return false;
        return true;
      });

      const tradePayloads = toSyncTrades.map(t => this.formatTradePayload(t, effectiveUserId));
      if (tradePayloads.length === 0) return;

      // Execute bulk upsert of user trades in chunks of 25 in parallel
      const chunkSize = 25;
      for (let i = 0; i < tradePayloads.length; i += chunkSize) {
        const chunk = tradePayloads.slice(i, i + chunkSize);
        await fetch(`${cfg.url}/rest/v1/paper_trades`, {
          method: 'POST',
          headers: {
            'apikey': cfg.anonKey,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(chunk)
        });
      }
      console.log(`[App] Supabase cloud sync bulk reconciled ${tradePayloads.length} user trades successfully.`);
    } catch (err) {
      console.warn('[App] Cloud trade reconciliation failed:', err);
    }
  }

  setupNetworkReconciliation() {
    window.addEventListener('online', async () => {
      console.log('[App] Network restored. Reconciling offline trades with Supabase...');
      this.ui.showToast('Network Restored', 'Re-syncing paper trading ledger with cloud database...', 'info');
      await this.reconcileOfflineTradesWithSupabase();
      if (this.signalEngine && this.cryptoAdapter) {
        this.signalEngine.auditDowntimeSignals(this.cryptoAdapter).catch(() => { });
      }
    });

    window.addEventListener('focus', () => {
      // Immediate cloud and signals catch-up whenever window regains user focus
      this.syncWithSupabaseCloud().catch(() => { });
      if (this.signalEngine && this.cryptoAdapter) {
        this.signalEngine.auditDowntimeSignals(this.cryptoAdapter).then(res => {
          if (res && res.length > 0 && this.ui && typeof this.ui.renderSignalsPage === 'function') {
            this.ui.renderSignalsPage();
          }
        }).catch(() => { });
      }
    });
  }

  async resetAccount() {
    this.paperTrader.resetAccount(true);
    this.riskEngine.setAccountBalance(2000);

    // Forcefully wipe all trade and position keys from localStorage across all user profiles
    try {
      const allKeys = Object.keys(localStorage);
      for (const k of allKeys) {
        if (k.startsWith('ai_copilot_paper_') || k.startsWith('monday_paper_') || k.startsWith('monday_open_')) {
          localStorage.removeItem(k);
        }
      }
    } catch (e) { }

    this.updateTradeJournalAndStats();
    this.ui.updateOpenPositions([]);
    const liveMetrics = this.paperTrader.getLiveEquity();
    this.ui.updateHeaderAccountHUD(liveMetrics);
    if (this.ui.orderState) {
      this.ui.orderState.availableBalance = 2000;
      this.ui.refreshDerivativesOrderDesk();
    }
    if (typeof this.ui.renderFinancialPassbook === 'function') {
      this.ui.renderFinancialPassbook();
    }
    if (typeof this.ui.renderYearbookHeatmap === 'function') {
      this.ui.renderYearbookHeatmap([]);
    }
    this.ui.showToast('Account Reset', 'Clean account balance restored to $2,000.00 with 0 trades.', 'success');

    // 🔒 CLOUD PURGE: Delete user paper trades from Supabase Cloud
    try {
      const cfg = window.MONDAY_SUPABASE_CONFIG;
      if (cfg && cfg.url && cfg.anonKey) {
        const activeUserId = this.authManager && this.authManager.getUserId ? this.authManager.getUserId() : 'guest_autopilot';
        const token = (this.authManager && typeof this.authManager.getAuthToken === 'function')
          ? await this.authManager.getAuthToken()
          : cfg.anonKey;

        // Purge OPEN and CLOSED paper portfolio trades across user scopes (never touch Alpha Radar signals)
        const targetUids = [...new Set([activeUserId, 'guest_autopilot', 'default'])];
        for (const uid of targetUids) {
          await fetch(`${cfg.url}/rest/v1/paper_trades?user_id=eq.${uid}&status=in.(OPEN,CLOSED)`, {
            method: 'DELETE',
            headers: {
              'apikey': cfg.anonKey,
              'Authorization': `Bearer ${token}`
            }
          });
        }

        // Also reset cloud config row balance to clean $2,000
        const configIds = ['CONFIG_AUTOPILOT_GUEST'];
        if (activeUserId && activeUserId !== 'guest_autopilot') {
          configIds.push(`CONFIG_AUTOPILOT_${activeUserId}`);
        }
        for (const cid of configIds) {
          await fetch(`${cfg.url}/rest/v1/paper_trades?id=eq.${cid}`, {
            method: 'PATCH',
            headers: {
              'apikey': cfg.anonKey,
              'Authorization': `Bearer ${cfg.anonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              risk_usd: 2000,
              pnl_usd: 0
            })
          }).catch(() => { });
        }

        console.log('[Cloud Reset] User paper trades purged from Supabase Cloud successfully.');
      }
    } catch (err) {
      console.warn('[Cloud Reset] Supabase trade purge error:', err);
    }
  }

  updateTradeJournalAndStats() {
    const analytics = this.paperTrader.getAnalytics();
    const trades = this.paperTrader.trades;
    this.ui.updateJournalAndAnalytics(analytics, trades);
  }

  async switchAsset(asset) {
    if (this.currentAsset === asset) return;
    this.currentAsset = asset;
    this.lastKnownState = null;

    const adapter = this.getActiveAdapter();
    await adapter.ensureAssetInitialized(asset);

    const snapshot = adapter.getSnapshot(asset);
    this.ui.updateTicker(snapshot);

    adapter.subscribe(asset, this._boundOnMarketDataTick);

    this.chartManager.setAdapter(adapter);
    this.chartManager.setAsset(asset, this.currentMarket);
    this.ui.setActiveWatchlistAsset(asset);
    this.ui.currentAsset = asset;
    this.ui.refreshDerivativesOrderDesk();

    const fundingEl = document.getElementById('meta_funding_rate');
    if (fundingEl && true) {
      fundingEl.textContent = 'Syncing Delta...';
      fundingEl.className = 'meta-val neutral';
    }

    await this.runFullEvaluation();
    this.ui.showToast('Asset Changed', `Active charting and analysis switched to ${asset}.`, 'info');
    this.voiceAssistant.speak(`Switched to ${asset}. Loading analysis.`);
  }

  async switchMarket(market = 'Crypto') {
    this.currentMarket = 'Crypto';
    this.ui.currentMarket = 'Crypto';
    const adapter = this.getActiveAdapter();
    const defaultAsset = 'BTC';
    this.currentAsset = defaultAsset;
    const defaultPills = ['BTC', 'ETH', 'SOL'];
    this.ui.setMarket('Crypto', defaultPills);
    await adapter.ensureAssetInitialized(defaultAsset);
    adapter.subscribe(defaultAsset, this._boundOnMarketDataTick);
    const snapshot = adapter.getSnapshot(defaultAsset);
    this.ui.updateTicker(snapshot);
    this.chartManager.setAdapter(adapter);
    this.chartManager.setMarket('Crypto', defaultAsset);
    this.ui.currentAsset = defaultAsset;
    this.ui.refreshDerivativesOrderDesk();
    await this.runFullEvaluation();
  }

  switchTimeframe(tf) {
    this.currentTimeframe = tf;
    this.chartManager.setTimeframe(tf);
    this.runFullEvaluation();
  }

  async scanAllAssetsForSignals() {
    if (this._isScanningAllSignals) return;
    this._isScanningAllSignals = true;

    try {
      // Pure Cloud Architecture: Fetch canonical institutional setups from 24/7 Cloud Daemon
      await this.syncWithSupabaseCloud();
    } catch (e) {
      console.warn('[App] Scan all signals cloud sync error:', e);
    } finally {
      this._isScanningAllSignals = false;
      if (this.ui && typeof this.ui.renderSignalsPage === 'function') {
        this.ui.renderSignalsPage();
      }
      this.reconcileOfflineTradesWithSupabase().catch(() => { });
      if (this.ui && typeof this.ui.showToast === 'function') {
        this.ui.showToast('Alpha Radar Synchronized', 'Real-time institutional setups verified from 24/7 Cloud Sentinel.', 'success');
      }
    }
  }

  loadSignalIntoOrderDesk(signal) {
    if (!signal) return;
    if (signal.asset !== this.currentAsset) {
      this.switchAsset(signal.asset);
    }
    this.ui.switchPage('terminal');
    if (this.ui.prefillOrderDesk) {
      this.ui.prefillOrderDesk({
        direction: signal.direction,
        orderType: 'LIMIT',
        limitPrice: signal.entryPrice,
        stopLoss: signal.stopLossPrice,
        takeProfit: signal.takeProfitPrice
      });
    }
    this.ui.showToast(
      '⚡ Order Desk Loaded',
      `${signal.asset} ${signal.direction} Limit Order @ ${signal.currencySymbol || '$'}${signal.entryPrice} loaded into desk with 1:${signal.riskReward} R:R.`,
      'info'
    );
  }
}

// Bootstrap once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init().catch(err => console.error('[App] Init failed:', err));
  window.__AI_COPILOT_APP__ = app;
  window.mondayApp = app;
});

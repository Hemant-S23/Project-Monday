import { CryptoAdapter } from './adapters/cryptoAdapter.js';
import { IndiaAdapter } from './adapters/indiaAdapter.js';
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

/**
 * Main Application Orchestrator
 * Connects Crypto & Indian Market adapters, strategy engines, AI reasoning, voice synthesis, and UI terminal.
 */
class App {
  constructor() {
    this.currentMarket = 'Crypto';
    this.currentAsset = 'BTC';
    this.currentTimeframe = '1H';
    this.lastKnownState = null;
    try {
      this.autoPilotEnabled = localStorage.getItem('monday_auto_pilot') === 'true';
    } catch (e) {
      this.autoPilotEnabled = false;
    }

    // Instantiate market adapters
    this.cryptoAdapter = new CryptoAdapter();
    this.indiaAdapter = new IndiaAdapter();

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
      onToggleAutoPilot: (enabled) => {
        this.autoPilotEnabled = enabled;
        if (enabled) {
          this.voiceAssistant.speak('Auto-pilot mode activated. Confirmed setups will execute automatically.');
          this.scanAndExecuteAutoPilot();
        } else {
          this.isAutoPilotScanning = false;
          this.voiceAssistant.speak('Auto-pilot deactivated. Manual mode active.');
        }
      },
      onSaveAutoPilotSettings: async () => {
        await this.runFullEvaluation();
        if (this.autoPilotEnabled) {
          await this.scanAndExecuteAutoPilot();
        }
      },
      onExecuteTrade: (orderPacket) => this.executeCurrentTrade(orderPacket),
      onCloseTrade: (id) => this.closeActiveTrade(id),
      onCloseAllTrades: () => this.closeAllActiveTrades(),
      onResetAccount: () => this.resetAccount(),
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
        if (res && res.user) {
          this.handleAuthSuccess(res.user);
        }
      },
      onGuestLogin: async () => {
        const res = await this.authManager.loginAsGuest();
        this.handleAuthSuccess(res.user);
      },
      onSignOut: () => {
        this.authManager.signOut();
        this.ui.updateUserProfile(null);
        this.ui.showAuthOverlay();
      },
      onSaveSupabaseConfig: (url, anonKey) => {
        this.authManager.setSupabaseConfig(url, anonKey);
      }
    });

    // Voice Assistant with natural Indian and English profiles
    this.voiceAssistant = new VoiceAssistant({
      onSpeechRecognized: (transcript) => {
        this.handleUserMessage(transcript);
      },
      onListeningStateChange: (listening) => this.ui.setVoiceListening(listening),
      onSpeakingStateChange: (speaking) => this.ui.setVoiceSpeaking(speaking)
    });
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
    return this.currentMarket === 'India' ? this.indiaAdapter : this.cryptoAdapter;
  }

  async init() {
    console.log('[App] Initializing AI Trading Co-Pilot for Crypto and Indian Markets...');

    // 0. Verify Auth Session & update UI state
    const currentUser = this.authManager.getUser();
    if (currentUser) {
      this.ui.updateUserProfile(currentUser);
      this.ui.hideAuthOverlay();
      this.paperTrader.setUser(currentUser.id);
      this.riskEngine.setAccountBalance(this.paperTrader.balance);
    } else {
      this.ui.showAuthOverlay();
    }

    // 0.5 Fast-Path Cloud Hydration: Reconcile with Supabase Cloud BEFORE first UI paint
    // Gives a fast 350ms window. Supabase typically responds in ~100-200ms.
    // If it succeeds, the UI will paint 100% FRESH data on Frame 1, with zero lag and zero stale flash!
    // If offline/slow, it times out in 350ms and falls back gracefully to cached localStorage.
    try {
      await Promise.race([
        this.syncWithSupabaseCloud(),
        new Promise(resolve => setTimeout(resolve, 350))
      ]);
    } catch (e) {
      console.warn('[App] Pre-render cloud sync timeout/err:', e);
    }

    // Immediate Synchronous State Sync (Zero-Lag HUD, Open Positions, and Journal Restoration)
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

    // 1. Initialize TradingView chart with saved theme and active adapter
    const activeTheme = localStorage.getItem('monday_theme') || 'dark';
    this.chartManager.setAdapter(this.getActiveAdapter());
    this.chartManager.setAdapters({ crypto: this.cryptoAdapter, india: this.indiaAdapter });
    this.chartManager.init(this.currentAsset, '60', this.currentMarket, activeTheme, this.getActiveAdapter());

    // 2. Initialize Market Feeds in parallel
    await Promise.all([
      this.cryptoAdapter.init(),
      this.indiaAdapter.init()
    ]);

    // 2.5 Audit Downtime Trades in Background (Non-blocking: UI and chart render immediately without lag!)
    this.paperTrader.auditDowntimeTrades(this.cryptoAdapter).then(downtimeResolved => {
      if (downtimeResolved && downtimeResolved.length > 0) {
        console.log(`[App] Downtime Catch-Up: Resolved ${downtimeResolved.length} trade(s) with accurate historical timestamps.`);
        this.updateTradeJournalAndStats();
        this.ui.updateOpenPositions(this.paperTrader.openPositions);
        this.ui.updateHeaderAccountHUD(this.paperTrader.getLiveEquity());

        downtimeResolved.forEach(trade => {
          const isWin = trade.result === 'WIN';
          const exitTimeStr = new Date(trade.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
          const formattedPrice = this.ui.formatPrice(trade.exitPrice, trade.market === 'India' ? '₹' : '$');
          const pnlSign = (trade.pnlUSD || 0) >= 0 ? '+' : '';
          
          this.ui.showToast(
            isWin ? '🎯 Downtime Target Hit' : '🛑 Downtime Stop Triggered',
            `${trade.asset} ${trade.direction} resolved at ${exitTimeStr} (${formattedPrice}). Net PnL: ${pnlSign}$${trade.pnlUSD}`,
            isWin ? 'success' : 'danger'
          );

          this.ui.addNotification({
            type: isWin ? 'target' : 'stop',
            title: isWin 
              ? `Target Hit (Downtime) • ${trade.asset} ${trade.direction}` 
              : `Stop Loss Hit (Downtime) • ${trade.asset} ${trade.direction}`,
            message: `${pnlSign}$${trade.pnlUSD} settled at ${exitTimeStr} (${formattedPrice}). Recorded in Passbook.`,
            tradeId: trade.id
          });
        });
      }
    }).catch(downtimeErr => {
      console.warn('[App] Downtime audit error:', downtimeErr);
    });

    // 3. Subscribe to default asset streams
    ['BTC', 'ETH', 'SOL'].forEach(asset => {
      this.cryptoAdapter.subscribe(asset, (data) => this.onMarketDataTick(data));
    });
    ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TCS', 'HDFCBANK'].forEach(asset => {
      this.indiaAdapter.subscribe(asset, (data) => this.onMarketDataTick(data));
    });

    // Restore and subscribe to any active open positions in parallel
    if (this.paperTrader.openPositions.length > 0) {
      await Promise.all(this.paperTrader.openPositions.map(pos => {
        const adapter = pos.market === 'India' ? this.indiaAdapter : this.cryptoAdapter;
        return adapter.ensureAssetInitialized(pos.asset).then(() => {
          adapter.subscribe(pos.asset, (data) => this.onMarketDataTick(data));
        }).catch(err => console.warn('[App] Position restore warmup error:', err));
      }));
    }

    // 4. Run first full strategic evaluation (fast-path: skips heavy multi-asset scan on frame 1)
    this.ui.renderWatchlistTray(this.currentMarket);
    await this.runFullEvaluation(true);
    this.ui.updateOpenPositions(this.paperTrader.openPositions);
    this.updateTradeJournalAndStats();

    // Initialize auth profile in UI if user is already logged in
    if (this.authManager && this.authManager.isLoggedIn()) {
      this.ui.updateUserProfile(this.authManager.getUser());
    }

    // Set up network online reconnect listener for automatic cloud sync
    this.setupNetworkReconciliation();

    // Run Supabase sync asynchronously without blocking chart render
    setTimeout(() => this.syncWithSupabaseCloud(), 150);

    // 5. Initial greeting from MONDAY
    setTimeout(() => {
      const initialGreeting = `Namaste! Main hoon **MONDAY** (**M**arket-**O**riented **N**eural **D**ecision **A**ssistant for **Y**ou). 🧠✨\n\n` +
        `Main continuously market observe kar rahi hoon — ab **Crypto** ke sath-sath **Full Indian Market (NSE/BSE)** bhi fully active hai! ` +
        `1H aur 5M structure analyze kar rahi hoon aur strict 1% risk calculate kar rahi hoon.\n\n` +
        `Tum mujhse text ya voice ke through freely koi bhi market scenario discuss kar sakte ho!`;
      this.ui.appendChatMessage('copilot', initialGreeting);
      this.voiceAssistant.speak('Namaste! Main hoon Monday. Crypto aur Indian Market dono active hain. Market analysis ready hai.');
    }, 1200);

    // 6. Setup interval for continuous position updates, evaluation & Supabase sync
    setInterval(() => this.runFullEvaluation(), 5000);
    setInterval(() => this.syncWithSupabaseCloud(), 15000);
  }

  async syncWithSupabaseCloud() {
    try {
      const cfg = window.MONDAY_SUPABASE_CONFIG;
      if (!cfg || !cfg.url || !cfg.anonKey) return;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${cfg.url}/rest/v1/paper_trades?select=*&order=created_at.desc&limit=100`, {
        headers: {
          'apikey': cfg.anonKey,
          'Authorization': `Bearer ${cfg.anonKey}`
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

      for (const ct of cloudTrades) {
        if (ct.status === 'OPEN') {
          cloudOpenMap.set(ct.id, ct);
        } else if (ct.status === 'CLOSED') {
          if (!(ct.result === 'LIQUIDATED' && Number(ct.pnl_usd || 0) === 0)) {
            cloudClosedMap.set(ct.id, ct);
          }
        }
      }

      // 1. Reconcile existing local open positions:
      // Remove any position that cloud has marked CLOSED or purged
      const reconciledOpen = [];
      for (const pos of this.paperTrader.openPositions) {
        if (cloudClosedMap.has(pos.id)) {
          // Closed in cloud! Prune from local open
          changed = true;
        } else if (pos.id && pos.id.startsWith('TRADE-') && !cloudOpenMap.has(pos.id) && cloudClosedMap.size > 0) {
          // Ghost position from earlier session that is no longer in cloud
          changed = true;
        } else {
          reconciledOpen.push(pos);
        }
      }
      this.paperTrader.openPositions = reconciledOpen;

      // 2. Add any active cloud OPEN positions not yet tracked locally
      for (const [id, ct] of cloudOpenMap.entries()) {
        const exists = this.paperTrader.openPositions.find(p => p.id === id);
        if (!exists) {
          const entryP = Number(ct.entry_price) || 0;
          const posSz = Number(ct.position_size || 0);
          const notional = +(entryP * posSz).toFixed(2);
          const entryFee = +(notional * 0.0005).toFixed(2);
          this.paperTrader.openPositions.push({
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
          changed = true;
        }
      }

      // 3. Add any cloud CLOSED trades into local trades ledger
      for (const [id, ct] of cloudClosedMap.entries()) {
        const existsClosed = this.paperTrader.trades.find(t => t.id === id);
        if (!existsClosed) {
          this.paperTrader.trades.unshift({
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
            result: ct.result || 'WIN',
            pnlUSD: Number(ct.pnl_usd || 0),
            rMultiple: Number(ct.r_multiple || 0),
            exitPrice: ct.exit_price ? Number(ct.exit_price) : null,
            openedAt: ct.created_at ? new Date(ct.created_at).getTime() : Date.now(),
            closedAt: ct.closed_at ? new Date(ct.closed_at).getTime() : (ct.created_at ? new Date(ct.created_at).getTime() : Date.now())
          });
          changed = true;
        }
      }

      // 4. Update balance & save if any change occurred
      if (changed) {
        this.paperTrader.trades.sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0));
        const totalRealized = this.paperTrader.trades
          .filter(t => t.status === 'CLOSED')
          .reduce((sum, t) => sum + (Number(t.pnlUSD) || 0), 0);
        this.paperTrader.balance = +(this.paperTrader.initialBalance + totalRealized).toFixed(2);

        this.paperTrader.save();
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
      }
    } catch (e) {
      console.warn('[App] Supabase cloud sync error:', e.message);
    }
  }

  async onMarketDataTick(data) {
    // Distribute tick to all active multi-chart subwindows
    this.chartManager.onRealtimeTick(data);

    if (data.asset === this.currentAsset) {
      this.ui.updateTicker(data);
      if (this.ui.orderState && data.price) {
        this.ui.orderState.entryPrice = data.price;
        this.ui.refreshDerivativesOrderDesk();
      }
    }

    // Check open positions for target or stop hit dynamically across all traded assets & markets
    const currentPrices = {};
    this.paperTrader.openPositions.forEach(pos => {
      const price = pos.market === 'India' 
        ? this.indiaAdapter.getCurrentPrice(pos.asset) 
        : this.cryptoAdapter.getCurrentPrice(pos.asset);
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

        const title = isWin ? '🎯 TARGET HIT!' : '🛑 STOP LOSS HIT!';
        const formattedPrice = this.ui.formatPrice(price, pos.market === 'India' ? '₹' : '$');
        const pnlSign = pos.unrealizedPnlUSD >= 0 ? '+' : '';
        const msg = `${pos.asset} paper trade closed at ${formattedPrice} (${result}). PnL: ${pnlSign}$${pos.unrealizedPnlUSD}`;
        this.ui.showToast(title, msg, isWin ? 'success' : 'danger');
        this.voiceAssistant.speak(`${pos.asset} trade hit ${isWin ? 'Target' : 'Stop loss'}. Position closed.`);

        // Dispatch persistent notification
        const rStr = pos.unrealizedR !== undefined ? ` (${pos.unrealizedR >= 0 ? '+' : ''}${pos.unrealizedR}R)` : '';
        this.ui.addNotification({
          type: isWin ? 'target' : 'stop',
          title: isWin ? `Target Hit • ${pos.asset} ${pos.direction}` : `Stop Loss Hit • ${pos.asset} ${pos.direction}`,
          message: `${pnlSign}$${pos.unrealizedPnlUSD}${rStr} closed at ${formattedPrice}`,
          tradeId: pos.id
        });
      });
      this.updateTradeJournalAndStats();
    }

    this.ui.updateOpenPositions(this.paperTrader.openPositions);

    // Live Header Equity HUD: updates on every real-time price tick
    const liveMetrics = this.paperTrader.getLiveEquity(currentPrices);
    this.ui.updateHeaderAccountHUD(liveMetrics);
  }

  async evaluateAsset(targetAsset) {
    const adapter = this.getActiveAdapter();
    await adapter.ensureAssetInitialized(targetAsset);
    const currentPrice = adapter.getCurrentPrice(targetAsset);
    if (!currentPrice || currentPrice <= 0) return null;

    // SMT Divergence Related Asset:
    // For India: NIFTY vs BANKNIFTY (or Stock vs NIFTY)
    // For Crypto: BTC vs ETH (or ETH/SOL vs BTC)
    const relatedAsset = this.currentMarket === 'India'
      ? (targetAsset === 'NIFTY' ? 'BANKNIFTY' : 'NIFTY')
      : (targetAsset === 'BTC' ? 'ETH' : 'BTC');

    // Parallel async data pipeline for sub-second evaluation
    const [candles1H, candles5M, relatedCandles5M, sentiment, fundingData] = await Promise.all([
      adapter.getHistoricalCandles(targetAsset, '1H'),
      adapter.getHistoricalCandles(targetAsset, '5M'),
      adapter.getHistoricalCandles(relatedAsset, '5M'),
      this.currentMarket === 'India' 
        ? Promise.resolve(this.newsEngine.getMarketSentiment('India')) 
        : this.newsEngine.fetchFearAndGreed(),
      this.derivativesEngine.fetchLiveFundingRate(targetAsset, this.currentMarket)
    ]);

    const currencySymbol = this.currentMarket === 'India' ? '₹' : '$';
    const eventRisk = this.newsEngine.getOverallEventRisk(targetAsset, this.currentMarket);
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

    return {
      targetAsset,
      currentPrice,
      strategyResult,
      eventRisk,
      sentiment,
      fundingData,
      currencySymbol,
      candles5M,
      candles1H
    };
  }

  async runFullEvaluation(isBoot = false) {
    const targetAsset = this.currentAsset;
    const adapter = this.getActiveAdapter();

    // Hyper-Sensitive Event Risk Scanner (Ultra-rapid news check)
    if (this.newsEngine.fetchBreakingNewsFeed) {
      this.newsEngine.fetchBreakingNewsFeed().catch(() => {});
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
      this.currentMarket,
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
      market: this.currentMarket
    });

    // 7. Check for State Transitions on current screen asset
    if (this.lastKnownState && this.lastKnownState !== strategyResult.state) {
      this.handleStateTransition(this.lastKnownState, strategyResult.state, strategyResult);
    }
    this.lastKnownState = strategyResult.state;

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

  async scanAndExecuteAutoPilot() {
    if (!this.autoPilotEnabled || this.isAutoPilotScanning) return;
    this.isAutoPilotScanning = true;

    try {
      const settings = this.getAutoPilotSettings();
      const openPositions = this.paperTrader.openPositions;
      if (openPositions.length >= settings.maxTrades) return;

      // Watchlist candidate assets for current market (Prioritizing currently viewed asset)
      let baseCandidates;
      if (this.currentMarket === 'India') {
        baseCandidates = ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TATAMOTORS', 'HDFCBANK', 'HAL', 'ZOMATO', 'INFY', 'TCS', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'KOTAKBANK', 'LT', 'AXISBANK'];
      } else {
        const top10 = ['BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'DOGE', 'NEAR', 'SUI', 'XRP', 'ADA'];
        if (settings.maxTrades > 10 && this.cryptoAdapter?.allMarkets?.length > 0) {
          const allMarketAssets = this.cryptoAdapter.allMarkets.map(m => m.baseAsset).filter(Boolean);
          baseCandidates = Array.from(new Set([...top10, ...allMarketAssets])).slice(0, Math.min(100, settings.maxTrades + 15));
        } else {
          baseCandidates = top10;
        }
      }
      const candidateAssets = this.currentAsset
        ? [this.currentAsset, ...baseCandidates.filter(a => a !== this.currentAsset)]
        : baseCandidates;

      // Filter out assets that already have active positions to avoid redundant overhead
      const availableCandidates = candidateAssets.filter(asset => 
        !this.paperTrader.openPositions.some(p => p.asset === asset)
      );

      for (const asset of availableCandidates) {
        // Immediate termination if user disabled Auto-Pilot mid-scan
        if (!this.autoPilotEnabled) break;

        // Stop if maxTrades limit reached (bypassed in testing mode)
        if (settings.maxTrades < 900 && this.paperTrader.openPositions.length >= settings.maxTrades) break;

        // Evaluate candidate asset
        const evalData = await this.evaluateAsset(asset);
        if (!evalData || !evalData.strategyResult) continue;

        const { strategyResult } = evalData;
        const proposedDir = strategyResult.direction || 'LONG';
        const entryLvl = strategyResult.levels?.entry;
        const targetLvl = strategyResult.levels?.target;

        // 1. Mandatory Cooldown Guard
        if (this.isAssetOnCooldown(asset, proposedDir)) {
          console.log(`[Auto-Pilot] Skipping ${asset} ${proposedDir}: On active post-exit cooldown.`);
          continue;
        }

        // 2. Setup Exhaustion Guard: Prevent re-trading identical completed setup
        if (entryLvl && targetLvl && this.isSetupExhausted(asset, proposedDir, entryLvl, targetLvl)) {
          console.log(`[Auto-Pilot] Skipping ${asset} ${proposedDir}: Setup levels already completed & exhausted.`);
          continue;
        }

        // Dynamic execution eligibility: Either state is CONFIRMED, or score meets user standards
        const isEligible = (
          strategyResult.state === 'CONFIRMED' || 
          (strategyResult.confluenceScore >= settings.minConfluence && strategyResult.levels?.rrRatio >= settings.minRR)
        ) && strategyResult.levels;

        if (isEligible) {
          console.log(`[Auto-Pilot] Autonomous execution triggered for ${asset} (${proposedDir}) at ${strategyResult.confluenceScore}% confluence (Threshold: ${settings.minConfluence}%)`);
          await this.processAutoPilotExecution(asset, proposedDir, strategyResult);
        }
      }
    } catch (err) {
      console.error('[Auto-Pilot Scanner Error]:', err);
    } finally {
      this.isAutoPilotScanning = false;
    }
  }

  handleStateTransition(oldState, newState, strategyResult) {
    const asset = this.currentAsset;
    const currSym = this.currentMarket === 'India' ? '₹' : '$';

    if (newState === 'CONFIRMED') {
      const dir = strategyResult.direction || 'LONG';
      const rr = strategyResult.levels?.rrRatio || '3.2';
      const entry = strategyResult.levels ? Number(strategyResult.levels.entry).toLocaleString() : '';
      const sl = strategyResult.levels ? Number(strategyResult.levels.stopLoss).toLocaleString() : '';
      const tp = strategyResult.levels ? Number(strategyResult.levels.target).toLocaleString() : '';
      const lev = this.currentMarket === 'India' ? '5x Intraday' : '15x-20x Isolated';

      this.ui.showToast(`🟢 ${asset} Setup CONFIRMED`, `Grade A confluence satisfied. 1:${rr} RR ready to execute.`, 'success');

      // Comprehensive actionable voice briefing with exact levels as requested by user
      this.voiceAssistant.speak(
        `Alert! ${asset} ${dir} confirm ho gaya hai! Entry ${currSym}${entry} pe lo, Stop Loss ${currSym}${sl} pe lock rakho, aur Target ${currSym}${tp} hai with 1:${rr} Risk Reward.`
      );

      this.ui.addNotification({
        type: 'ai',
        title: `AI Confirmed • ${asset} ${dir}`,
        message: `Grade A (${strategyResult.confluenceScore || 85}%) • 1:${rr} RR • Entry: ${currSym}${entry} • SL: ${currSym}${sl} • TP: ${currSym}${tp}`
      });

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

  getAutoPilotSettings() {
    try {
      const raw = localStorage.getItem('monday_autopilot_settings');
      if (raw) {
        const s = JSON.parse(raw);
        return {
          marginUSD: Math.max(5, Math.min(500, parseFloat(s.marginUSD) || 20)),
          leverage: Math.max(1, Math.min(50, parseInt(s.leverage, 10) || (this.currentMarket === 'India' ? 5 : 20))),
          maxTrades: Math.max(1, Math.min(100, parseInt(s.maxTrades, 10) || 2)),
          minConfluence: Math.max(50, Math.min(95, parseInt(s.minConfluence, 10) || 75)),
          minRR: Math.max(1.5, Math.min(5.0, parseFloat(s.minRR) || 3.0)),
          eventShieldEnabled: s.eventShieldEnabled !== false
        };
      }
    } catch (e) {}
    return {
      marginUSD: 20,
      leverage: this.currentMarket === 'India' ? 5 : 20,
      maxTrades: 2,
      minConfluence: 75,
      minRR: 3.0,
      eventShieldEnabled: true
    };
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
    const currSym = this.currentMarket === 'India' ? '₹' : '$';

    // 0. Hyper-Sensitive Event Risk Shield Gatekeeper (Safety First)
    const eventRisk = this.newsEngine.getOverallEventRisk(asset, this.currentMarket);
    const isShieldActive = settings.eventShieldEnabled && eventRisk.isShieldTriggered;
    if (isShieldActive) {
      const shockTitle = eventRisk.activeEvents?.[0]?.title || eventRisk.summary || 'Breaking Macro / Regulatory Shock';
      this.ui.appendAutonomousDecisionCard({
        action: 'SKIPPED',
        asset,
        direction,
        openCount: currentOpenCount,
        skipReason: '🚨 HYPER-SENSITIVE EVENT RISK SHIELD ACTIVE',
        skipExplanation: `Breaking shock catalyst detected: "${shockTitle}". Auto-Pilot engaged capital preservation armor. Entries throttled to prevent volatile news slippage and wick hunts.`
      });
      this.voiceAssistant.speak('Alert! Breaking shock catalyst detected. Auto-pilot entry cancelled to protect capital.');
      this.ui.showToast('🛡️ Event Risk Shield Active', `${shockTitle.slice(0, 55)}... Order cancelled.`, 'warning');
      return;
    }

    // 1. Max Concurrent Trades Guardrail (Bypassed when >= 900 for testing)
    if (settings.maxTrades < 900 && currentOpenCount >= settings.maxTrades) {
      this.ui.appendAutonomousDecisionCard({
        action: 'SKIPPED',
        asset,
        direction,
        openCount: currentOpenCount,
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
          skipReason: '🚨 PRE-FLIGHT PRICE FIREWALL ACTIVE',
          skipExplanation: `Live market price ($${livePrice}) is already at or past setup target ($${target}) or stop loss ($${stopLoss}). Order discarded to protect capital.`
        });
        return;
      }
    }

    // =========================================================================
    // PILLAR A: EXACT-MATCH REALTIME ENTRY FILTER (ZERO-SLIPPAGE TOUCH EXECUTION)
    // =========================================================================
    // Strict Touch Rule: Order ONLY executes if live chart price physically touches/matches entry level.
    // If live price has drifted, missed, or moved towards target/SL, Monday will NOT enter.
    let maxTouchTolerance;
    if (rawEntry >= 1000) {
      maxTouchTolerance = 0.0003; // ~0.03% for high-value tokens (BTC, ETH)
    } else if (rawEntry >= 1) {
      maxTouchTolerance = 0.0006; // ~0.06% for mid-tier tokens (SOL, NEAR, AVAX, SUI)
    } else {
      maxTouchTolerance = 0.0008; // ~0.08% for sub-dollar tokens (XRP, ADA, DOGE)
    }

    const priceDiscrepancy = Math.abs(livePrice - rawEntry) / rawEntry;
    const isChasing = direction === 'LONG' 
      ? (livePrice > rawEntry * (1 + maxTouchTolerance)) 
      : (livePrice < rawEntry * (1 - maxTouchTolerance));

    if (priceDiscrepancy > maxTouchTolerance || isChasing) {
      const diffFormatted = (priceDiscrepancy * 100).toFixed(3);
      console.warn(`[Pillar A Guard] Execution REJECTED for ${asset}: Live market price ($${livePrice}) does not match entry level ($${rawEntry}). Discrepancy: ${diffFormatted}%. Zero-slippage exact touch policy active.`);
      this.ui.appendAutonomousDecisionCard({
        action: 'SKIPPED',
        asset,
        direction,
        openCount: currentOpenCount,
        skipReason: '🎯 PILLAR A: EXACT-MATCH TICK REJECTED',
        skipExplanation: `Live realtime price ($${livePrice}) is not at the exact setup entry ($${rawEntry}). Market has drifted by ${diffFormatted}%. Zero-slippage policy active — order discarded to eliminate loops and bad fills.`
      });
      return;
    }

    // Fill at exact live market tick to the penny (Zero Slippage)
    const entry = livePrice;

    // 4. Autonomous Execution (Configured Margin & Leverage)
    const leverage = this.currentMarket === 'India' ? Math.min(5, settings.leverage) : settings.leverage;
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
      market: this.currentMarket,
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
    const currency = this.currentMarket === 'India' ? '₹' : '$';

    let orderParams;
    if (customOrder && customOrder.entry) {
      orderParams = {
        asset: customOrder.asset || this.currentAsset,
        market: this.currentMarket,
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
        market: this.currentMarket,
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
    adapter.subscribe(newPos.asset, (data) => this.onMarketDataTick(data));

    const formattedEntry = this.ui.formatPrice(newPos.entry);
    this.ui.showToast('🚀 Order Executed', `${newPos.asset} ${newPos.direction} [${newPos.leverage}x] entered at ${formattedEntry}. Live tracking active!`, 'success');
    this.voiceAssistant.speak(`${newPos.asset} ${newPos.direction} entered with ${newPos.leverage}x leverage.`);

    this.ui.addNotification({
      type: 'order',
      title: `Order Executed • ${newPos.asset} ${newPos.direction} [${newPos.leverage}x]`,
      message: `Entered at ${formattedEntry} • Margin: $${newPos.marginUSD}`,
      tradeId: newPos.id
    });

    this.ui.updateOpenPositions(this.paperTrader.openPositions);
    const liveMetrics = this.paperTrader.getLiveEquity();
    this.ui.updateHeaderAccountHUD(liveMetrics);
    this.updateTradeJournalAndStats();
    this.syncTradeToSupabase(newPos);
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

      // Sync all closed trades to Supabase
      for (const t of closedList) {
        this.syncTradeToSupabase(t);
      }
    }
  }

  async syncTradeToSupabase(trade) {
    try {
      const cfg = window.MONDAY_SUPABASE_CONFIG;
      if (!cfg || !cfg.url || !cfg.anonKey || !trade) return;
      const activeUserId = this.authManager && this.authManager.getUserId ? this.authManager.getUserId() : 'guest_autopilot';
      const payload = {
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
        result: trade.result || null,
        pnl_usd: trade.pnlUSD || 0,
        r_multiple: trade.rMultiple || 0,
        exit_price: trade.exitPrice || null,
        timeframe: '5M',
        strategy: '20x Isolated HTF-Trend Pullback'
      };
      await fetch(`${cfg.url}/rest/v1/paper_trades`, {
        method: 'POST',
        headers: {
          'apikey': cfg.anonKey,
          'Authorization': `Bearer ${cfg.anonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('[App] Supabase trade sync offline/failed:', e.message);
    }
  }

  async reconcileOfflineTradesWithSupabase() {
    try {
      const cfg = window.MONDAY_SUPABASE_CONFIG;
      if (!cfg || !cfg.url || !cfg.anonKey) return;
      const toSync = [...(this.paperTrader.openPositions || []), ...(this.paperTrader.trades || []).slice(0, 15)];
      await Promise.all(toSync.map(trade => this.syncTradeToSupabase(trade)));
      console.log(`[App] Supabase cloud sync reconciled ${toSync.length} items in parallel.`);
    } catch (err) {
      console.warn('[App] Cloud trade reconciliation failed:', err);
    }
  }

  setupNetworkReconciliation() {
    window.addEventListener('online', async () => {
      console.log('[App] Network restored. Reconciling offline trades with Supabase...');
      this.ui.showToast('Network Restored', 'Re-syncing paper trading ledger with cloud database...', 'info');
      await this.reconcileOfflineTradesWithSupabase();
    });
  }

  handleAuthSuccess(user) {
    if (!user) return;
    this.ui.hideAuthOverlay();
    this.ui.updateUserProfile(user);
    this.paperTrader.setUser(user.id);
    this.riskEngine.setAccountBalance(this.paperTrader.balance);
    this.updateTradeJournalAndStats();
    this.ui.updateOpenPositions(this.paperTrader.openPositions);
    const liveMetrics = this.paperTrader.getLiveEquity();
    this.ui.updateHeaderAccountHUD(liveMetrics);
    this.ui.showToast('Logged In', `Welcome back, ${user.name || user.email || 'Trader'}!`, 'success');
    this.voiceAssistant.speak(`Welcome ${user.name || 'Trader'}. Account sync complete.`);
    this.reconcileOfflineTradesWithSupabase();
  }

  async resetAccount() {
    this.paperTrader.resetAccount(true);
    this.riskEngine.setAccountBalance(2000);
    this.updateTradeJournalAndStats();
    this.ui.updateOpenPositions([]);
    const liveMetrics = this.paperTrader.getLiveEquity();
    this.ui.updateHeaderAccountHUD(liveMetrics);
    this.ui.showToast('Account Reset', 'Clean account balance restored to $2,000.00 with 0 trades.', 'info');

    // Cloud-Aware Reset: Also purge Supabase paper_trades so cloud sync doesn't resurrect deleted trades
    try {
      const cfg = window.MONDAY_SUPABASE_CONFIG;
      if (cfg && cfg.url && cfg.anonKey) {
        await fetch(`${cfg.url}/rest/v1/paper_trades?id=neq.NONE`, {
          method: 'DELETE',
          headers: {
            'apikey': cfg.anonKey,
            'Authorization': `Bearer ${cfg.anonKey}`
          }
        });
        console.log('[Cloud Reset] Supabase paper_trades table purged successfully.');
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

    adapter.subscribe(asset, (data) => this.onMarketDataTick(data));

    this.chartManager.setAdapter(adapter);
    this.chartManager.setAsset(asset, this.currentMarket);
    this.ui.setActiveWatchlistAsset(asset);
    this.ui.currentAsset = asset;
    this.ui.refreshDerivativesOrderDesk();
    await this.runFullEvaluation();
    this.ui.showToast('Asset Changed', `Active charting and analysis switched to ${asset}.`, 'info');
    this.voiceAssistant.speak(`Switched to ${asset}. Loading analysis.`);
  }

  async switchMarket(market) {
    if (this.currentMarket === market) return;
    this.currentMarket = market;
    this.lastKnownState = null;

    const adapter = this.getActiveAdapter();
    const defaultAsset = market === 'India' ? 'NIFTY' : 'BTC';
    this.currentAsset = defaultAsset;

    const defaultPills = market === 'India'
      ? ['NIFTY', 'BANKNIFTY', 'RELIANCE']
      : ['BTC', 'ETH', 'SOL'];

    this.ui.setMarket(market, defaultPills);

    await adapter.ensureAssetInitialized(defaultAsset);
    adapter.subscribe(defaultAsset, (data) => this.onMarketDataTick(data));

    const snapshot = adapter.getSnapshot(defaultAsset);
    this.ui.updateTicker(snapshot);

    this.chartManager.setAdapter(adapter);
    this.chartManager.setMarket(market, defaultAsset);
    this.ui.currentMarket = market;
    this.ui.currentAsset = defaultAsset;
    this.ui.refreshDerivativesOrderDesk();
    await this.runFullEvaluation();

    const marketTitle = market === 'India' ? 'Indian Market (NSE/BSE)' : 'Crypto Market';
    this.ui.showToast(`🇮🇳 ${marketTitle} Active`, `Monitoring ${defaultAsset} with real-time Indian feeds.`, 'success');
    this.voiceAssistant.speak(
      market === 'India'
        ? 'Indian Market active ho gaya hai. Ab NIFTY 50 aur Bank Nifty ka live analysis load ho raha hai.'
        : 'Crypto Market active ho gaya hai. Bitcoin aur Ethereum ka analysis load ho raha hai.'
    );
  }

  switchTimeframe(tf) {
    this.currentTimeframe = tf;
    this.chartManager.setTimeframe(tf);
    this.runFullEvaluation();
  }
}

// Bootstrap once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init().catch(err => console.error('[App] Init failed:', err));
  window.__AI_COPILOT_APP__ = app;
});

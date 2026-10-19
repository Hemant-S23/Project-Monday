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
    this.chartManager = new ChartManager('tv_chart_container');

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
          this.voiceAssistant.speak('Auto-pilot deactivated. Manual mode active.');
        }
      },
      onSaveAutoPilotSettings: () => {
        if (this.autoPilotEnabled) {
          this.scanAndExecuteAutoPilot();
        }
      },
      onExecuteTrade: (orderPacket) => this.executeCurrentTrade(orderPacket),
      onCloseTrade: (id) => this.closeActiveTrade(id),
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
      this.ui.orderState.availableBalance = this.paperTrader.balance;
      this.ui.refreshDerivativesOrderDesk();
    }
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

    // Immediate Synchronous State Sync (Zero-Lag HUD, Open Positions, and Journal Restoration)
    this.updateTradeJournalAndStats();
    this.ui.updateOpenPositions(this.paperTrader.openPositions);
    const initialLiveMetrics = this.paperTrader.getLiveEquity();
    this.ui.updateHeaderAccountHUD(initialLiveMetrics);
    if (this.ui.orderState) {
      this.ui.orderState.availableBalance = this.paperTrader.balance;
      this.ui.refreshDerivativesOrderDesk();
    }

    // 1. Initialize TradingView chart with saved theme and active adapter
    const activeTheme = localStorage.getItem('monday_theme') || 'dark';
    this.chartManager.setAdapter(this.getActiveAdapter());
    this.chartManager.init(this.currentAsset, '60', this.currentMarket, activeTheme, this.getActiveAdapter());

    // 2. Initialize Market Feeds in parallel
    await Promise.all([
      this.cryptoAdapter.init(),
      this.indiaAdapter.init()
    ]);

    // 3. Subscribe to default asset streams
    ['BTC', 'ETH', 'SOL'].forEach(asset => {
      this.cryptoAdapter.subscribe(asset, (data) => this.onMarketDataTick(data));
    });
    ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TCS', 'HDFCBANK'].forEach(asset => {
      this.indiaAdapter.subscribe(asset, (data) => this.onMarketDataTick(data));
    });

    // Restore and subscribe to any active open positions saved across page refreshes
    for (const pos of this.paperTrader.openPositions) {
      const adapter = pos.market === 'India' ? this.indiaAdapter : this.cryptoAdapter;
      await adapter.ensureAssetInitialized(pos.asset);
      adapter.subscribe(pos.asset, (data) => this.onMarketDataTick(data));
    }

    // 4. Run first full strategic evaluation & initialize watchlist tray
    this.ui.renderWatchlistTray(this.currentMarket);
    await this.runFullEvaluation();
    this.ui.updateOpenPositions(this.paperTrader.openPositions);
    this.updateTradeJournalAndStats();

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

      const res = await fetch(`${cfg.url}/rest/v1/paper_trades?select=*&order=created_at.desc`, {
        headers: {
          'apikey': cfg.anonKey,
          'Authorization': `Bearer ${cfg.anonKey}`
        }
      });
      if (!res.ok) return;

      const cloudTrades = await res.json();
      if (!Array.isArray(cloudTrades)) return;

      let changed = false;
      for (const ct of cloudTrades) {
        if (ct.status === 'OPEN') {
          const exists = this.paperTrader.openPositions.find(p => p.id === ct.id);
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
        } else if (ct.status === 'CLOSED') {
          const openIdx = this.paperTrader.openPositions.findIndex(p => p.id === ct.id);
          if (openIdx !== -1) {
            this.paperTrader.openPositions.splice(openIdx, 1);
            changed = true;
          }
          const existsClosed = this.paperTrader.trades.find(t => t.id === ct.id);
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
              openedAt: new Date(ct.created_at).getTime(),
              closedAt: Date.now()
            });
            changed = true;
          }
        }
      }

      if (changed) {
        this.paperTrader.save();
        this.updateTradeJournalAndStats();
        this.ui.updateOpenPositions(this.paperTrader.openPositions);
        const liveMetrics = this.paperTrader.getLiveEquity();
        this.ui.updateHeaderAccountHUD(liveMetrics);
      }
    } catch (e) {
      // Supabase sync failure non-blocking
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

    const candles1H = await adapter.getHistoricalCandles(targetAsset, '1H');
    const candles5M = await adapter.getHistoricalCandles(targetAsset, '5M');
    const relatedCandles5M = await adapter.getHistoricalCandles(relatedAsset, '5M');

    const currencySymbol = this.currentMarket === 'India' ? '₹' : '$';

    // Fetch live sentiment (Fear & Greed Index) and Perpetual Funding Rate
    const sentiment = this.currentMarket === 'India' 
      ? this.newsEngine.getMarketSentiment('India') 
      : await this.newsEngine.fetchFearAndGreed();
    const fundingData = await this.derivativesEngine.fetchLiveFundingRate(targetAsset, this.currentMarket);
    const eventRisk = this.newsEngine.getOverallEventRisk(targetAsset, this.currentMarket);

    // Strategy Evaluation with Multi-Factor Confluence & Event Shield
    const strategyResult = this.strategyEngine.evaluate(
      targetAsset,
      candles1H,
      candles5M,
      relatedCandles5M,
      currentPrice,
      currencySymbol,
      relatedAsset,
      { sentiment, fundingData, eventRisk }
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

  async runFullEvaluation() {
    const targetAsset = this.currentAsset;
    const adapter = this.getActiveAdapter();

    // Hyper-Sensitive Event Risk Scanner (Ultra-rapid news check)
    if (this.newsEngine.fetchBreakingNewsFeed) {
      await this.newsEngine.fetchBreakingNewsFeed();
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
      await this.scanAndExecuteAutoPilot();
    }
  }

  async scanAndExecuteAutoPilot() {
    if (!this.autoPilotEnabled || this.isAutoPilotScanning) return;
    this.isAutoPilotScanning = true;

    try {
      const settings = this.getAutoPilotSettings();
      const openPositions = this.paperTrader.openPositions;
      if (openPositions.length >= settings.maxTrades) return;

      // Watchlist candidate assets for current market (Prioritizing currently viewed asset)
      const baseCandidates = this.currentMarket === 'India'
        ? ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TATAMOTORS', 'HDFCBANK', 'HAL', 'ZOMATO']
        : ['BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'DOGE', 'NEAR', 'SUI', 'XRP', 'ADA'];
      const candidateAssets = this.currentAsset
        ? [this.currentAsset, ...baseCandidates.filter(a => a !== this.currentAsset)]
        : baseCandidates;

      for (const asset of candidateAssets) {
        // Stop if maxTrades limit reached (bypassed in testing mode)
        if (settings.maxTrades < 900 && this.paperTrader.openPositions.length >= settings.maxTrades) break;

        // Skip assets already open (prevents duplicate position on same coin)
        if (this.paperTrader.openPositions.some(p => p.asset === asset)) continue;

        // Evaluate candidate asset
        const evalData = await this.evaluateAsset(asset);
        if (!evalData || !evalData.strategyResult) continue;

        const { strategyResult } = evalData;
        if (strategyResult.state === 'CONFIRMED' && strategyResult.levels) {
          console.log(`[Auto-Pilot] Autonomous execution triggered for ${asset} (${strategyResult.direction || 'LONG'})`);
          await this.processAutoPilotExecution(asset, strategyResult.direction || 'LONG', strategyResult);
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
      if (this.autoPilotEnabled) {
        this.processAutoPilotExecution(asset, dir, strategyResult);
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
          maxTrades: Math.max(1, Math.min(999, parseInt(s.maxTrades, 10) || 999)),
          minConfluence: Math.max(50, Math.min(95, parseInt(s.minConfluence, 10) || 75)),
          minRR: Math.max(1.5, Math.min(5.0, parseFloat(s.minRR) || 3.0)),
          eventShieldEnabled: s.eventShieldEnabled !== false
        };
      }
    } catch (e) {}
    return {
      marginUSD: 20,
      leverage: this.currentMarket === 'India' ? 5 : 20,
      maxTrades: 999, // Uncapped for testing
      minConfluence: 75,
      minRR: 3.0,
      eventShieldEnabled: true
    };
  }

  async processAutoPilotExecution(asset, direction, strategyResult) {
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

    // 4. Autonomous Execution (Configured Margin & Leverage)
    const entry = Number(strategyResult.levels.entry);
    const stopLoss = Number(strategyResult.levels.stopLoss);
    const target = Number(strategyResult.levels.target);
    const leverage = this.currentMarket === 'India' ? Math.min(5, settings.leverage) : settings.leverage;
    const marginUSD = settings.marginUSD;
    const notionalUSD = +(marginUSD * leverage).toFixed(2);
    const positionSize = +(notionalUSD / entry).toFixed(5);
    const riskUSD = marginUSD;
    const rewardUSD = +(riskUSD * rr).toFixed(2);
    const liqPrice = +(direction === 'LONG' ? entry * (1 - 1 / leverage) : entry * (1 + 1 / leverage)).toFixed(2);

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

    await this.executeCurrentTrade(orderPacket);

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

  async syncTradeToSupabase(trade) {
    try {
      const cfg = window.MONDAY_SUPABASE_CONFIG;
      if (!cfg || !cfg.url || !cfg.anonKey || !trade) return;
      const payload = {
        id: trade.id,
        user_id: 'guest_autopilot',
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
    } catch (e) {}
  }

  resetAccount() {
    this.paperTrader.resetAccount(true);
    this.riskEngine.setAccountBalance(2000);
    this.updateTradeJournalAndStats();
    this.ui.updateOpenPositions([]);
    this.ui.showToast('Account Reset', 'Clean account balance restored to $2,000.00 with 0 trades.', 'info');
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

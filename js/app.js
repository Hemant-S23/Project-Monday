import { CryptoAdapter } from './adapters/cryptoAdapter.js';
import { IndiaAdapter } from './adapters/indiaAdapter.js';
import { StrategyEngine } from './engine/strategyEngine.js';
import { HistoricalContextEngine } from './engine/historicalEngine.js';
import { NewsContextEngine } from './engine/newsContextEngine.js';
import { RiskEngine } from './engine/riskEngine.js';
import { PaperTrader } from './paperTrading/paperTrader.js';
import { CopilotBrain } from './copilot/copilotBrain.js';
import { VoiceAssistant } from './copilot/voiceAssistant.js';
import { ChartManager } from './ui/chartManager.js';
import { TerminalUI } from './ui/terminalUI.js';

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

    // Instantiate market adapters
    this.cryptoAdapter = new CryptoAdapter();
    this.indiaAdapter = new IndiaAdapter();

    // Core analysis & risk modules
    this.strategyEngine = new StrategyEngine();
    this.historicalEngine = new HistoricalContextEngine();
    this.newsEngine = new NewsContextEngine();
    this.riskEngine = new RiskEngine(2000, 1.0); // $2000 balance, 1% risk default
    this.paperTrader = new PaperTrader(2000);
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
      onExecuteTrade: () => this.executeCurrentTrade(),
      onCloseTrade: (id) => this.closeActiveTrade(id),
      onResetAccount: () => this.resetAccount(),
      onThemeChange: (theme) => this.chartManager.setTheme(theme)
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

  getActiveAdapter() {
    return this.currentMarket === 'India' ? this.indiaAdapter : this.cryptoAdapter;
  }

  async init() {
    console.log('[App] Initializing AI Trading Co-Pilot for Crypto and Indian Markets...');

    // 1. Initialize TradingView chart with saved theme
    const activeTheme = localStorage.getItem('monday_theme') || 'dark';
    this.chartManager.init(this.currentAsset, '60', this.currentMarket, activeTheme);

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

    // 4. Run first full strategic evaluation
    await this.runFullEvaluation();
    this.ui.updateOpenPositions(this.paperTrader.openPositions);
    this.updateTradeJournalAndStats();

    // 5. Initial greeting from MONDAY
    setTimeout(() => {
      const initialGreeting = `Namaste! Main hoon **MONDAY** (**M**arket-**O**riented **N**eural **D**ecision **A**ssistant for **Y**ou). 🧠✨\n\n` +
        `Main continuously market observe kar rahi hoon — ab **Crypto** ke sath-sath **Full Indian Market (NSE/BSE)** bhi fully active hai! ` +
        `1H aur 5M structure analyze kar rahi hoon aur strict 1% risk calculate kar rahi hoon.\n\n` +
        `Tum mujhse text ya voice ke through freely koi bhi market scenario discuss kar sakte ho!`;
      this.ui.appendChatMessage('copilot', initialGreeting);
      this.voiceAssistant.speak('Namaste! Main hoon Monday. Crypto aur Indian Market dono active hain. Market analysis ready hai.');
    }, 1200);

    // 6. Setup interval for continuous position updates & evaluation
    setInterval(() => this.runFullEvaluation(), 5000);
  }

  async onMarketDataTick(data) {
    if (data.asset === this.currentAsset) {
      this.ui.updateTicker(data);
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
        const title = result === 'WIN' ? '🎯 TARGET HIT!' : '🛑 STOP LOSS HIT!';
        const formattedPrice = this.ui.formatPrice(price, pos.market === 'India' ? '₹' : '$');
        const msg = `${pos.asset} paper trade closed at ${formattedPrice} (${result}). PnL: ${pos.unrealizedPnlUSD >= 0 ? '+' : ''}$${pos.unrealizedPnlUSD}`;
        this.ui.showToast(title, msg, result === 'WIN' ? 'success' : 'danger');
        this.voiceAssistant.speak(`${pos.asset} trade hit ${result === 'WIN' ? 'Target' : 'Stop loss'}. Position closed.`);
      });
      this.updateTradeJournalAndStats();
    }

    this.ui.updateOpenPositions(this.paperTrader.openPositions);

    // Live Header Equity HUD: updates on every real-time price tick
    const liveMetrics = this.paperTrader.getLiveEquity(currentPrices);
    this.ui.updateHeaderAccountHUD(liveMetrics);
  }

  async runFullEvaluation() {
    const targetAsset = this.currentAsset;
    const adapter = this.getActiveAdapter();
    const currentPrice = adapter.getCurrentPrice(targetAsset);

    // SMT Divergence Related Asset:
    // For India: NIFTY vs BANKNIFTY (or Stock vs NIFTY)
    // For Crypto: BTC vs ETH
    const relatedAsset = this.currentMarket === 'India'
      ? (targetAsset === 'NIFTY' ? 'BANKNIFTY' : 'NIFTY')
      : 'ETH';

    const candles1H = await adapter.getHistoricalCandles(targetAsset, '1H');
    const candles5M = await adapter.getHistoricalCandles(targetAsset, '5M');
    const relatedCandles5M = await adapter.getHistoricalCandles(relatedAsset, '5M');

    const currencySymbol = this.currentMarket === 'India' ? '₹' : '$';

    // 1. Strategy Evaluation
    const strategyResult = this.strategyEngine.evaluate(
      targetAsset,
      candles1H,
      candles5M,
      relatedCandles5M,
      currentPrice,
      currencySymbol,
      relatedAsset
    );

    // 2. Historical Context Analysis
    const histContext = this.historicalEngine.evaluate(
      targetAsset,
      strategyResult.direction,
      strategyResult.htfTrend,
      'NORMAL',
      this.currentMarket
    );

    // 3. News & Event Context
    const eventRisk = this.newsEngine.getOverallEventRisk(targetAsset, this.currentMarket);

    // 4. Risk & Position Calculation
    const levels = strategyResult.levels || {
      entry: currentPrice,
      stopLoss: currentPrice * 0.99,
      target: currentPrice * 1.025
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
    this.ui.updateContextTelemetry({ historicalContext: histContext, eventRisk });
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

    // 7. Check for State Transitions
    if (this.lastKnownState && this.lastKnownState !== strategyResult.state) {
      this.handleStateTransition(this.lastKnownState, strategyResult.state, strategyResult);
    }
    this.lastKnownState = strategyResult.state;
  }

  handleStateTransition(oldState, newState, strategyResult) {
    const asset = this.currentAsset;

    if (newState === 'CONFIRMED') {
      this.ui.showToast(`🟢 ${asset} Setup CONFIRMED`, `Strategy conditions satisfied. 1:${strategyResult.levels?.rrRatio} RR available.`, 'success');
      this.voiceAssistant.speak(`Alert! ${asset} setup confirmed ho gaya hai. Required confirmation mil gaya hai.`);
    } else if (newState === 'DEVELOPING') {
      this.ui.showToast(`🟠 ${asset} Setup DEVELOPING`, `Price 5M reaction zone me enter ho chuki hai. Awaiting confirmation.`, 'warning');
    } else if (newState === 'CANCELLED') {
      this.ui.showToast(`🔴 ${asset} Setup CANCELLED`, `Key invalidation level break ho chuka hai.`, 'danger');
    }

    // Auto-log AI commentary in chat
    const briefing = this.copilotBrain.generateMarketBriefing();
    this.ui.appendChatMessage('copilot', briefing);
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

  async executeCurrentTrade() {
    const ctx = this.copilotBrain.currentContext;
    if (!ctx || !ctx.riskParams) {
      this.ui.showToast('Execution Error', 'Risk parameters calculate nahi ho sake.', 'danger');
      return;
    }

    const { targetAsset, strategyState, historicalContext, eventRisk, riskParams } = ctx;
    const adapter = this.getActiveAdapter();
    const currency = this.currentMarket === 'India' ? '₹' : '$';

    const newPos = this.paperTrader.executePaperTrade({
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
      conditions: strategyState.reasoning,
      historicalContext: historicalContext.contextTag,
      eventRisk: eventRisk.level,
      aiReasoning: `Executed at ${currency}${riskParams.entry} with strict 1% risk (${currency}${riskParams.maxRiskUSD}). RR 1:${riskParams.rrRatio}.`
    });

    // Ensure live market tick listener is active for this asset
    await adapter.ensureAssetInitialized(newPos.asset);
    adapter.subscribe(newPos.asset, (data) => this.onMarketDataTick(data));

    const formattedEntry = this.ui.formatPrice(newPos.entry);
    this.ui.showToast('🚀 Paper Trade Executed', `${targetAsset} ${newPos.direction} entered at ${formattedEntry}. Live tracking active!`, 'success');
    this.voiceAssistant.speak(`Paper trade executed for ${targetAsset}. Entry ${formattedEntry}.`);

    this.ui.updateOpenPositions(this.paperTrader.openPositions);
    const liveMetrics = this.paperTrader.getLiveEquity();
    this.ui.updateHeaderAccountHUD(liveMetrics);
    this.updateTradeJournalAndStats();
  }

  closeActiveTrade(tradeId) {
    const closed = this.paperTrader.closePosition(tradeId, 'MANUAL');
    if (closed) {
      const pnlPrefix = closed.pnlUSD >= 0 ? '+' : '';
      this.ui.showToast('Trade Closed', `${closed.asset} manually closed. PnL: ${pnlPrefix}$${closed.pnlUSD} (${closed.rMultiple >= 0 ? '+' : ''}${closed.rMultiple}R).`, 'info');
      this.voiceAssistant.speak(`Trade closed. Realized profit ${closed.pnlUSD} dollars.`);
      this.ui.updateOpenPositions(this.paperTrader.openPositions);
      this.updateTradeJournalAndStats();
    }
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

    this.chartManager.setAsset(asset, this.currentMarket);
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
      ? ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'HYUNDAI', 'SWIGGY', 'ZOMATO', 'BAJAJHFL']
      : ['BTC', 'ETH', 'SOL'];

    this.ui.setMarket(market, defaultPills);

    await adapter.ensureAssetInitialized(defaultAsset);
    adapter.subscribe(defaultAsset, (data) => this.onMarketDataTick(data));

    const snapshot = adapter.getSnapshot(defaultAsset);
    this.ui.updateTicker(snapshot);

    this.chartManager.setAsset(defaultAsset, market);
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

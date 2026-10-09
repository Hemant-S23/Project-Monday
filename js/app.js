import { CryptoAdapter } from './adapters/cryptoAdapter.js';
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
 * Connects adapters, strategy engines, AI reasoning, voice synthesis, and UI terminal.
 */
class App {
  constructor() {
    this.currentMarket = 'Crypto';
    this.currentAsset = 'BTC';
    this.currentTimeframe = '1H';
    this.lastKnownState = null;

    // Instantiate core modules
    this.cryptoAdapter = new CryptoAdapter();
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
      onSearchCrypto: (query) => this.cryptoAdapter.searchAssets(query),
      onSendMessage: (msg) => this.handleUserMessage(msg),
      onToggleVoice: () => this.toggleVoiceListening(),
      onToggleMute: () => this.voiceAssistant.toggleMute(),
      onExecuteTrade: () => this.executeCurrentTrade(),
      onCloseTrade: (id) => this.closeActiveTrade(id),
      onResetAccount: () => this.resetAccount()
    });

    // Voice Assistant
    this.voiceAssistant = new VoiceAssistant({
      onSpeechRecognized: (transcript) => {
        this.handleUserMessage(transcript);
      },
      onListeningStateChange: (listening) => this.ui.setVoiceListening(listening),
      onSpeakingStateChange: (speaking) => this.ui.setVoiceSpeaking(speaking)
    });
  }

  async init() {
    console.log('[App] Initializing AI Trading Co-Pilot...');

    // 1. Initialize TradingView chart
    this.chartManager.init(this.currentAsset, '60');

    // 2. Initialize Market Feeds
    await this.cryptoAdapter.init();

    // 3. Subscribe to asset price & candle streams
    ['BTC', 'ETH', 'SOL'].forEach(asset => {
      this.cryptoAdapter.subscribe(asset, (data) => this.onMarketDataTick(data));
    });

    // Restore and subscribe to any active open positions saved across page refreshes
    for (const pos of this.paperTrader.openPositions) {
      await this.cryptoAdapter.ensureAssetInitialized(pos.asset);
      this.cryptoAdapter.subscribe(pos.asset, (data) => this.onMarketDataTick(data));
    }

    // 4. Initial evaluation and terminal setup
    await this.runFullEvaluation();
    this.ui.updateOpenPositions(this.paperTrader.openPositions);
    this.updateTradeJournalAndStats();

    // 5. Initial greeting from MONDAY
    setTimeout(() => {
      const initialGreeting = `Namaste! Main hoon **MONDAY** (**M**arket-**O**riented **N**eural **D**ecision **A**ssistant for **Y**ou). 🧠✨\n\n` +
        `Main continuously market observe kar rahi hoon, 1H aur 5M structure analyze kar rahi hoon, ` +
        `aur predefined strategy rules ke sath 1% risk strictly calculate kar rahi hoon.\n\n` +
        `Tum mujhse text ya voice ke through freely koi bhi market scenario discuss kar sakte ho!`;
      this.ui.appendChatMessage('copilot', initialGreeting);
      this.voiceAssistant.speak('Namaste! Main hoon Monday, tumhari Market-Oriented Neural Decision Assistant. Market analysis ready hai.');
    }, 1200);

    // 6. Setup interval for continuous position updates & evaluation
    setInterval(() => this.runFullEvaluation(), 5000);
  }

  async onMarketDataTick(data) {
    if (data.asset === this.currentAsset) {
      this.ui.updateTicker(data);
    }

    // Check open positions for target or stop hit dynamically across all traded assets
    const currentPrices = {};
    this.paperTrader.openPositions.forEach(pos => {
      currentPrices[pos.asset] = this.cryptoAdapter.getCurrentPrice(pos.asset);
    });
    currentPrices[this.currentAsset] = this.cryptoAdapter.getCurrentPrice(this.currentAsset);
    currentPrices['BTC'] = this.cryptoAdapter.getCurrentPrice('BTC');
    currentPrices['ETH'] = this.cryptoAdapter.getCurrentPrice('ETH');
    currentPrices['SOL'] = this.cryptoAdapter.getCurrentPrice('SOL');

    const closedTrades = this.paperTrader.updateLivePositions(currentPrices);
    if (closedTrades.length > 0) {
      closedTrades.forEach(({ pos, result, price }) => {
        const title = result === 'WIN' ? '🎯 TARGET HIT!' : '🛑 STOP LOSS HIT!';
        const formattedPrice = this.ui.formatPrice(price);
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
    const currentPrice = this.cryptoAdapter.getCurrentPrice(targetAsset);

    const candles1H = await this.cryptoAdapter.getHistoricalCandles(targetAsset, '1H');
    const candles5M = await this.cryptoAdapter.getHistoricalCandles(targetAsset, '5M');
    const relatedCandles5M = await this.cryptoAdapter.getHistoricalCandles('ETH', '5M');

    // 1. Strategy Evaluation
    const strategyResult = this.strategyEngine.evaluate(
      targetAsset,
      candles1H,
      candles5M,
      relatedCandles5M,
      currentPrice
    );

    // 2. Historical Context Analysis
    const histContext = this.historicalEngine.evaluate(
      targetAsset,
      strategyResult.direction,
      strategyResult.htfTrend
    );

    // 3. News & Event Context
    const eventRisk = this.newsEngine.getOverallEventRisk(targetAsset);

    // 4. Risk & Position Calculation
    const levels = strategyResult.levels || {
      entry: currentPrice,
      stopLoss: currentPrice * 0.99,
      target: currentPrice * 1.025
    };
    const riskParams = this.riskEngine.calculateTradeParameters(
      levels.entry,
      levels.stopLoss,
      levels.target
    );

    // 5. Update UI Telemetry
    const liveSnapshot = this.cryptoAdapter.getSnapshot(targetAsset);
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
      analytics: this.paperTrader.getAnalytics()
    });

    // 7. Check for State Transitions to alert user
    if (this.lastKnownState !== strategyResult.state) {
      if (this.lastKnownState !== null) {
        this.handleStateTransition(this.lastKnownState, strategyResult.state, strategyResult);
      }
      this.lastKnownState = strategyResult.state;
    }

    this.updateTradeJournalAndStats();
  }

  handleStateTransition(oldState, newState, strategyResult) {
    const asset = this.currentAsset;
    let toastType = 'info';

    if (newState === 'CONFIRMED') {
      toastType = 'success';
      this.ui.showToast(`🟢 ${asset} Setup CONFIRMED`, `Strategy conditions satisfied. 1:${strategyResult.levels?.rrRatio} RR available.`, 'success');
      this.voiceAssistant.speak(`Alert! ${asset} setup confirmed ho gaya hai. Required confirmation mil gaya hai.`);
    } else if (newState === 'DEVELOPING') {
      toastType = 'warning';
      this.ui.showToast(`🟠 ${asset} Setup DEVELOPING`, `Price 5M reaction zone me enter ho chuki hai. Awaiting confirmation.`, 'warning');
    } else if (newState === 'CANCELLED') {
      toastType = 'danger';
      this.ui.showToast(`🔴 ${asset} Setup CANCELLED`, `Key invalidation level break ho chuka hai.`, 'danger');
    }

    // Auto-log AI commentary in chat
    const briefing = this.copilotBrain.generateMarketBriefing();
    this.ui.appendChatMessage('copilot', briefing);
  }

  async handleUserMessage(message) {
    if (!message || !message.trim()) return;
    // Display user's message bubble immediately in the chat transcript
    this.ui.appendChatMessage('user', message);

    // Generate intelligent response from CopilotBrain
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
      aiReasoning: `Executed at $${riskParams.entry} with strict 1% risk ($${riskParams.maxRiskUSD}). RR 1:${riskParams.rrRatio}.`
    });

    // Ensure live market tick listener is active for this asset
    await this.cryptoAdapter.ensureAssetInitialized(newPos.asset);
    this.cryptoAdapter.subscribe(newPos.asset, (data) => this.onMarketDataTick(data));

    this.ui.showToast('🚀 Paper Trade Executed', `${targetAsset} ${newPos.direction} entered at $${newPos.entry}. Live tracking active!`, 'success');
    this.voiceAssistant.speak(`Paper trade executed. Entry $${newPos.entry}, Stop Loss $${newPos.stopLoss}.`);

    this.ui.updateOpenPositions(this.paperTrader.openPositions);
    const liveMetrics = this.paperTrader.getLiveEquity();
    this.ui.updateHeaderAccountHUD(liveMetrics);
    this.updateTradeJournalAndStats();
  }

  closeActiveTrade(tradeId) {
    const closed = this.paperTrader.closePosition(tradeId, 'MANUAL');
    if (closed) {
      this.ui.showToast('Trade Closed', `${closed.asset} manually closed. PnL: ${closed.pnlUSD >= 0 ? '+' : ''}$${closed.pnlUSD} (${closed.rMultiple >= 0 ? '+' : ''}${closed.rMultiple}R).`, 'info');
      this.voiceAssistant.speak(`Trade closed. PnL ${closed.pnlUSD} dollars.`);
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

    // Ensure candles and ticker for new asset are initialized
    await this.cryptoAdapter.ensureAssetInitialized(asset);
    
    // Immediately update top ticker display to newly selected asset's live price and 24h change
    const snapshot = this.cryptoAdapter.getSnapshot(asset);
    this.ui.updateTicker(snapshot);

    this.cryptoAdapter.subscribe(asset, (data) => this.onMarketDataTick(data));

    this.chartManager.setAsset(asset);
    await this.runFullEvaluation();
    this.ui.showToast('Asset Changed', `Active charting and analysis switched to ${asset}.`, 'info');
    this.voiceAssistant.speak(`Switched to ${asset}. Loading analysis.`);
  }

  switchMarket(market) {
    this.currentMarket = market;
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

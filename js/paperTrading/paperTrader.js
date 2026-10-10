/**
 * Paper Trading & Journal Engine (PRD Sections 26, 27, 28)
 * Manages virtual account, active positions, automated journal recording,
 * and comprehensive performance analytics (Win Rate, Total R, Profit Factor, Drawdown).
 */
export class PaperTrader {
  constructor(initialBalance = 2000, userId = null) {
    this.initialBalance = initialBalance;
    this.userId = userId || 'default';
    this.storageKey = `ai_copilot_paper_trades_${this.userId}`;
    this.balanceStorageKey = `ai_copilot_paper_balance_${this.userId}`;
    this.positionsStorageKey = `ai_copilot_paper_positions_${this.userId}`;

    this.trades = this.loadTrades();
    this.openPositions = this.loadOpenPositions();

    const storedBalance = localStorage.getItem(this.balanceStorageKey);
    if (storedBalance !== null && !isNaN(parseFloat(storedBalance))) {
      this.balance = parseFloat(storedBalance);
    } else {
      const closedPnL = this.trades
        .filter(t => t.status === 'CLOSED')
        .reduce((sum, t) => sum + (t.pnlUSD || 0), 0);
      this.balance = +(initialBalance + closedPnL).toFixed(2);
      this.save();
    }
  }

  setUser(userId) {
    if (this.userId === userId) return;
    this.userId = userId || 'default';
    this.storageKey = `ai_copilot_paper_trades_${this.userId}`;
    this.balanceStorageKey = `ai_copilot_paper_balance_${this.userId}`;
    this.positionsStorageKey = `ai_copilot_paper_positions_${this.userId}`;
    this.trades = this.loadTrades();
    this.openPositions = this.loadOpenPositions();
    const storedBalance = localStorage.getItem(this.balanceStorageKey);
    if (storedBalance !== null && !isNaN(parseFloat(storedBalance))) {
      this.balance = parseFloat(storedBalance);
    } else {
      this.balance = this.initialBalance;
      this.save();
    }
  }

  loadOpenPositions() {
    const raw = localStorage.getItem(this.positionsStorageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Failed to parse stored open positions:', e);
      }
    }
    return [];
  }

  loadTrades() {
    const raw = localStorage.getItem(this.storageKey);
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Failed to parse stored trades:', e);
      }
    }
    // Only load starter demo trades if explicitly previewing demo account
    if (this.userId === 'demo_preview') {
      return this.getStarterTrades();
    }
    return [];
  }

  getStarterTrades() {
    return [
      {
        id: 'TRADE-001',
        market: 'Crypto',
        asset: 'BTC',
        direction: 'LONG',
        entry: 63850.0,
        stopLoss: 63200.0,
        target: 65600.0,
        positionSize: 0.0308,
        riskUSD: 20.0,
        rewardUSD: 53.9,
        rrRatio: 2.69,
        status: 'CLOSED',
        result: 'WIN',
        pnlUSD: 53.9,
        rMultiple: 2.69,
        exitPrice: 65600.0,
        timeframe: '1H / 5M',
        strategy: 'HTF-Trend Pullback & SMT Divergence',
        conditions: [
          '✓ 1H Trend Bullish',
          '✓ 5M Pullback into Discount Zone',
          '✓ Bullish SMT Divergence vs ETH',
          '✓ Price Confirmation Reversal Wick',
          '✓ RR >= 1:2 Passed'
        ],
        historicalContext: 'Supportive (Post-sweep continuation regime)',
        eventRisk: 'Low',
        aiReasoning: 'BTC swept Asian low while ETH held strong. Clean 1:2.69 R:R setup with disciplined 1% risk allocation.',
        openedAt: Date.now() - 86400000 * 2,
        closedAt: Date.now() - 86400000 * 2 + 7200000
      },
      {
        id: 'TRADE-002',
        market: 'Crypto',
        asset: 'SOL',
        direction: 'LONG',
        entry: 148.2,
        stopLoss: 144.5,
        target: 157.5,
        positionSize: 5.4,
        riskUSD: 20.0,
        rewardUSD: 50.22,
        rrRatio: 2.51,
        status: 'CLOSED',
        result: 'WIN',
        pnlUSD: 50.22,
        rMultiple: 2.51,
        exitPrice: 157.5,
        timeframe: '1H / 5M',
        strategy: 'HTF-Trend Pullback & SMT Divergence',
        conditions: [
          '✓ 1H Bullish Expansion',
          '✓ 5M Order Block Tap',
          '✓ Bullish Confirmation Displacement',
          '✓ RR >= 1:2 Passed'
        ],
        historicalContext: 'Supportive',
        eventRisk: 'Medium (Ecosystem catalysts)',
        aiReasoning: 'SOL recovered rapidly from local liquidity pocket. Reached Target 1 cleanly with disciplined stop management.',
        openedAt: Date.now() - 86400000,
        closedAt: Date.now() - 86400000 + 5400000
      },
      {
        id: 'TRADE-003',
        market: 'Crypto',
        asset: 'BTC',
        direction: 'SHORT',
        entry: 66200.0,
        stopLoss: 66700.0,
        target: 64950.0,
        positionSize: 0.04,
        riskUSD: 20.0,
        rewardUSD: 50.0,
        rrRatio: 2.5,
        status: 'CLOSED',
        result: 'LOSS',
        pnlUSD: -20.0,
        rMultiple: -1.0,
        exitPrice: 66700.0,
        timeframe: '1H / 5M',
        strategy: 'HTF-Trend Pullback & SMT Divergence',
        conditions: [
          '✓ 1H Bearish Trend',
          '✓ 5M Premium Retest',
          '✓ Confirmation Rejection Candle'
        ],
        historicalContext: 'Mixed',
        eventRisk: 'High (Pre-CPI positioning)',
        aiReasoning: 'Pre-CPI volatility spike wicked through stop loss before subsequent drop. Exactly 1% max risk adhered to.',
        openedAt: Date.now() - 43200000,
        closedAt: Date.now() - 36000000
      }
    ];

    localStorage.setItem(this.storageKey, JSON.stringify(starterTrades));
    return starterTrades;
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.trades));
      localStorage.setItem(this.balanceStorageKey, this.balance.toFixed(2));
      localStorage.setItem(this.positionsStorageKey, JSON.stringify(this.openPositions));
    } catch (e) {
      console.error('Failed to save paper trading state:', e);
    }
  }

  executePaperTrade({
    asset,
    market = 'Crypto',
    direction,
    entry,
    stopLoss,
    target,
    positionSize,
    riskUSD,
    rewardUSD,
    rrRatio,
    conditions = [],
    historicalContext = 'Supportive',
    eventRisk = 'Low',
    aiReasoning = ''
  }) {
    const tradeId = `TRADE-${String(this.trades.length + this.openPositions.length + 1).padStart(3, '0')}`;
    const newPosition = {
      id: tradeId,
      market,
      asset,
      direction,
      entry: Number(entry),
      stopLoss: Number(stopLoss),
      target: Number(target),
      positionSize,
      riskUSD: +riskUSD.toFixed(2),
      rewardUSD: +rewardUSD.toFixed(2),
      rrRatio: +rrRatio.toFixed(2),
      status: 'OPEN',
      currentPrice: Number(entry),
      unrealizedPnlUSD: 0,
      unrealizedR: 0,
      timeframe: '1H / 5M',
      strategy: 'HTF-Trend Pullback & SMT Divergence',
      conditions,
      historicalContext,
      eventRisk,
      aiReasoning,
      openedAt: Date.now()
    };

    this.openPositions.push(newPosition);
    this.save();
    return newPosition;
  }

  updateLivePositions(currentPrices) {
    const closedList = [];

    this.openPositions.forEach(pos => {
      const livePrice = currentPrices[pos.asset];
      if (!livePrice) return;

      pos.currentPrice = livePrice;
      const isLong = pos.direction === 'LONG';

      // Calculate unrealized PnL
      const priceDelta = isLong ? (livePrice - pos.entry) : (pos.entry - livePrice);
      pos.unrealizedPnlUSD = +(priceDelta * pos.positionSize).toFixed(2);
      pos.unrealizedR = pos.riskUSD > 0 ? +(pos.unrealizedPnlUSD / pos.riskUSD).toFixed(2) : 0;

      // Check SL or TP Hit
      let hitTarget = isLong ? (livePrice >= pos.target) : (livePrice <= pos.target);
      let hitStop = isLong ? (livePrice <= pos.stopLoss) : (livePrice >= pos.stopLoss);

      if (hitTarget) {
        this.closePosition(pos.id, 'WIN', pos.target);
        closedList.push({ pos, result: 'WIN', price: pos.target });
      } else if (hitStop) {
        this.closePosition(pos.id, 'LOSS', pos.stopLoss);
        closedList.push({ pos, result: 'LOSS', price: pos.stopLoss });
      }
    });

    return closedList;
  }

  closePosition(tradeId, resultType = 'MANUAL', exitPrice = null) {
    const index = this.openPositions.findIndex(p => p.id === tradeId);
    if (index === -1) return null;

    const pos = this.openPositions[index];
    this.openPositions.splice(index, 1);

    const actualExit = exitPrice !== null ? exitPrice : pos.currentPrice;
    const isLong = pos.direction === 'LONG';
    const priceDelta = isLong ? (actualExit - pos.entry) : (pos.entry - actualExit);
    const pnlUSD = +(priceDelta * pos.positionSize).toFixed(2);
    const rMultiple = pos.riskUSD > 0 ? +(pnlUSD / pos.riskUSD).toFixed(2) : 0;

    let result = resultType;
    if (resultType === 'MANUAL') {
      result = pnlUSD > 0 ? 'WIN' : pnlUSD < 0 ? 'LOSS' : 'BREAKEVEN';
    }

    const closedTrade = {
      ...pos,
      status: 'CLOSED',
      result,
      exitPrice: +actualExit.toFixed(2),
      pnlUSD,
      rMultiple,
      closedAt: Date.now()
    };

    this.balance = +(this.balance + pnlUSD).toFixed(2);
    this.trades.unshift(closedTrade);
    this.save();
    return closedTrade;
  }

  getLiveEquity(currentPrices = {}) {
    let unrealizedPnlUSD = 0;
    let unrealizedR = 0;

    this.openPositions.forEach(pos => {
      const livePrice = currentPrices[pos.asset] || pos.currentPrice || pos.entry;
      pos.currentPrice = livePrice;
      const isLong = pos.direction === 'LONG';
      const priceDelta = isLong ? (livePrice - pos.entry) : (pos.entry - livePrice);
      const pnl = +(priceDelta * pos.positionSize).toFixed(2);
      const r = pos.riskUSD > 0 ? +(pnl / pos.riskUSD).toFixed(2) : 0;
      pos.unrealizedPnlUSD = pnl;
      pos.unrealizedR = r;

      unrealizedPnlUSD += pnl;
      unrealizedR += r;
    });

    const closed = this.trades.filter(t => t.status === 'CLOSED');
    const closedTotalR = +closed.reduce((acc, t) => acc + (t.rMultiple || 0), 0).toFixed(2);
    const closedPnlUSD = +closed.reduce((acc, t) => acc + (t.pnlUSD || 0), 0).toFixed(2);
    const equity = +(this.balance + unrealizedPnlUSD).toFixed(2);
    const netTotalR = +(closedTotalR + unrealizedR).toFixed(2);
    const netTotalPnlUSD = +(closedPnlUSD + unrealizedPnlUSD).toFixed(2);

    return {
      balance: +this.balance.toFixed(2),
      equity,
      unrealizedPnlUSD: +unrealizedPnlUSD.toFixed(2),
      unrealizedR: +unrealizedR.toFixed(2),
      closedTotalR,
      closedPnlUSD,
      netTotalR,
      netTotalPnlUSD,
      hasOpenPositions: this.openPositions.length > 0,
      openPositionsCount: this.openPositions.length
    };
  }

  getAnalytics() {
    const closed = this.trades.filter(t => t.status === 'CLOSED');
    const totalTrades = closed.length;
    const wins = closed.filter(t => t.result === 'WIN');
    const losses = closed.filter(t => t.result === 'LOSS');
    const breakevens = closed.filter(t => t.result === 'BREAKEVEN');

    const winRate = totalTrades > 0 ? +((wins.length / totalTrades) * 100).toFixed(1) : 0;
    const totalR = +closed.reduce((acc, t) => acc + (t.rMultiple || 0), 0).toFixed(2);
    const totalPnlUSD = +closed.reduce((acc, t) => acc + (t.pnlUSD || 0), 0).toFixed(2);

    const grossProfit = wins.reduce((acc, t) => acc + t.pnlUSD, 0);
    const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.pnlUSD, 0));
    const profitFactor = grossLoss > 0 ? +(grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? 99.9 : 0;

    const avgWinR = wins.length > 0 ? +(wins.reduce((a, b) => a + b.rMultiple, 0) / wins.length).toFixed(2) : 0;
    const avgLossR = losses.length > 0 ? +(losses.reduce((a, b) => a + b.rMultiple, 0) / losses.length).toFixed(2) : 0;

    // Consecutive losing streaks
    let maxLosingStreak = 0;
    let currentLossStreak = 0;
    [...closed].reverse().forEach(t => {
      if (t.result === 'LOSS') {
        currentLossStreak++;
        if (currentLossStreak > maxLosingStreak) maxLosingStreak = currentLossStreak;
      } else {
        currentLossStreak = 0;
      }
    });

    const unrealizedPnlUSD = +this.openPositions.reduce((acc, p) => acc + (p.unrealizedPnlUSD || 0), 0).toFixed(2);
    const unrealizedR = +this.openPositions.reduce((acc, p) => acc + (p.unrealizedR || 0), 0).toFixed(2);

    return {
      balance: +this.balance.toFixed(2),
      initialBalance: this.initialBalance,
      equity: +(this.balance + unrealizedPnlUSD).toFixed(2),
      unrealizedPnlUSD,
      unrealizedR,
      netTotalR: +(totalR + unrealizedR).toFixed(2),
      totalTrades,
      winCount: wins.length,
      lossCount: losses.length,
      breakevenCount: breakevens.length,
      winRate,
      totalR,
      totalPnlUSD,
      profitFactor,
      avgWinR,
      avgLossR,
      maxLosingStreak,
      openPositionsCount: this.openPositions.length
    };
  }

  resetAccount(clearTrades = true) {
    this.balance = this.initialBalance;
    this.openPositions = [];
    if (clearTrades) {
      this.trades = [];
      localStorage.setItem(this.storageKey, JSON.stringify([]));
    }
    localStorage.setItem(this.balanceStorageKey, this.initialBalance.toFixed(2));
    localStorage.setItem(this.positionsStorageKey, JSON.stringify([]));
    this.save();
  }
}

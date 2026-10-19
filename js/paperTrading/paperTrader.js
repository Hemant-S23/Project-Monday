/**
 * Paper Trading & Journal Engine (PRD Sections 26, 27, 28)
 * Manages virtual account, active positions, automated journal recording,
 * and comprehensive performance analytics (Win Rate, Total R, Profit Factor, Drawdown).
 */
// Delta Exchange Futures Fee Matrix (Standard Tier-1 Derivatives)
export const DELTA_FEE_RATES = {
  TAKER: 0.0005, // 0.05% for Market / Taker orders
  MAKER: 0.0002, // 0.02% for Limit / Maker orders
  GST_RATE: 0.18 // 18% GST on Delta Exchange Brokerage (Delta India compliance)
};

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
    const parsedBal = parseFloat(storedBalance);
    if (storedBalance !== null && !isNaN(parsedBal) && isFinite(parsedBal) && parsedBal > 0) {
      this.balance = parsedBal;
    } else {
      const closedPnL = this.trades
        .filter(t => t.status === 'CLOSED')
        .reduce((sum, t) => sum + (Number(t.pnlUSD) || 0), 0);
      const calcBal = initialBalance + closedPnL;
      this.balance = (isNaN(calcBal) || !isFinite(calcBal) || calcBal <= 0) ? initialBalance : +calcBal.toFixed(2);
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
    const parsedBal = parseFloat(storedBalance);
    if (storedBalance !== null && !isNaN(parsedBal) && isFinite(parsedBal) && parsedBal > 0) {
      this.balance = parsedBal;
    } else {
      const closedPnL = this.trades
        .filter(t => t.status === 'CLOSED')
        .reduce((sum, t) => sum + (Number(t.pnlUSD) || 0), 0);
      const calcBal = this.initialBalance + closedPnL;
      this.balance = (isNaN(calcBal) || !isFinite(calcBal) || calcBal <= 0) ? this.initialBalance : +calcBal.toFixed(2);
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
        if (Array.isArray(parsed)) {
          // Identify any rapid glitch loop trades (< 2 minutes duration, loss/liquidation, LONG or SHORT)
          const isGlitchLoopTrade = (t) => {
            if (t.result === 'LIQUIDATED' && Number(t.pnlUSD || 0) === 0) return true;
            const duration = (t.closedAt || 0) - (t.openedAt || 0);
            if ((t.result === 'LOSS' || t.result === 'LIQUIDATED') && duration < 120000) return true;
            return false;
          };

          // If the ledger was corrupted by the runaway 1,000+ trade glitch loop
          const hasRunawayGlitch = parsed.length > 50 && (parsed.filter(t => t.result === 'LOSS' || t.result === 'LIQUIDATED').length / parsed.length) > 0.8;

          let clean = [];
          if (hasRunawayGlitch) {
            // Completely wipe the runaway loop corruption
            clean = parsed.filter(t => !isGlitchLoopTrade(t) && !t.id?.startsWith('TRADE-'));
          } else {
            clean = parsed.filter(t => !isGlitchLoopTrade(t));
          }

          if (clean.length !== parsed.length) {
            localStorage.setItem(this.storageKey, JSON.stringify(clean));
            const netRealized = +clean.reduce((acc, t) => acc + (Number(t.pnlUSD) || 0), 0).toFixed(2);
            this.balance = Math.max(2000, +(2000 + netRealized).toFixed(2));
            localStorage.setItem(this.balanceStorageKey, this.balance.toFixed(2));
            console.log(`[PaperTrader] Auto-purged ${parsed.length - clean.length} glitch trades. Balance restored to $${this.balance}`);
          }
          return clean;
        }
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
      if (isNaN(this.balance) || !isFinite(this.balance) || this.balance <= 0) {
        this.balance = this.initialBalance || 2000;
      }
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
    leverage = 20,
    marginUSD = null,
    notionalUSD = null,
    liquidationPrice = null,
    conditions = [],
    historicalContext = 'Supportive',
    eventRisk = 'Low',
    aiReasoning = ''
  }) {
    const dir = (direction || 'LONG').toUpperCase();
    const entryNum = Number(entry);
    const slNum = Number(stopLoss);
    const tpNum = Number(target);

    // =========================================================================
    // PRE-FLIGHT EXECUTION FIREWALL: Zero-Tolerance Sanity & Level Validation
    // =========================================================================
    if (isNaN(entryNum) || isNaN(slNum) || isNaN(tpNum) || entryNum <= 0 || slNum <= 0 || tpNum <= 0) {
      console.warn(`[Pre-Flight Firewall] Order rejected for ${asset}: Invalid price numbers.`);
      return null;
    }

    if (dir === 'LONG') {
      if (slNum >= entryNum) {
        console.warn(`[Pre-Flight Firewall] LONG rejected for ${asset}: Stop Loss ($${slNum}) cannot be >= Entry ($${entryNum}).`);
        return null;
      }
      if (tpNum <= entryNum) {
        console.warn(`[Pre-Flight Firewall] LONG rejected for ${asset}: Target ($${tpNum}) cannot be <= Entry ($${entryNum}).`);
        return null;
      }
    } else if (dir === 'SHORT') {
      if (slNum <= entryNum) {
        console.warn(`[Pre-Flight Firewall] SHORT rejected for ${asset}: Stop Loss ($${slNum}) cannot be <= Entry ($${entryNum}).`);
        return null;
      }
      if (tpNum >= entryNum) {
        console.warn(`[Pre-Flight Firewall] SHORT rejected for ${asset}: Target ($${tpNum}) cannot be >= Entry ($${entryNum}).`);
        return null;
      }
    }

    const tradeId = `TRADE-${String(this.trades.length + this.openPositions.length + 1).padStart(3, '0')}`;
    const lev = Math.max(1, Number(leverage) || 1);
    const posSize = Number(positionSize) || 0;
    const notional = notionalUSD !== null ? Number(notionalUSD) : +(entryNum * posSize).toFixed(2);
    const margin = marginUSD !== null ? Number(marginUSD) : +(notional / lev).toFixed(2);

    // Delta Exchange Entry Fee (0.05% Taker on Notional)
    const entryFeeUSD = +(notional * DELTA_FEE_RATES.TAKER).toFixed(2);
    const estExitFeeUSD = +(notional * DELTA_FEE_RATES.TAKER).toFixed(2);
    const estTotalFeesUSD = +(entryFeeUSD + estExitFeeUSD).toFixed(2);

    const newPosition = {
      id: tradeId,
      market,
      asset,
      direction: (direction || 'LONG').toUpperCase(),
      entry: Number(entry),
      stopLoss: Number(stopLoss),
      target: Number(target),
      positionSize: posSize,
      leverage: lev,
      marginUSD: margin,
      notionalUSD: notional,
      entryFeeUSD,
      estExitFeeUSD,
      feesUSD: estTotalFeesUSD,
      feeModel: 'Delta Exchange (0.05% Taker / 0.02% Maker)',
      liquidationPrice: liquidationPrice !== null ? Number(liquidationPrice) : null,
      riskUSD: +riskUSD.toFixed(2),
      rewardUSD: +rewardUSD.toFixed(2),
      rrRatio: +rrRatio.toFixed(2),
      status: 'OPEN',
      currentPrice: Number(entry),
      unrealizedGrossPnlUSD: 0,
      unrealizedPnlUSD: -estTotalFeesUSD,
      unrealizedR: riskUSD > 0 ? +((-estTotalFeesUSD) / riskUSD).toFixed(2) : 0,
      roePercent: margin > 0 ? +(((-estTotalFeesUSD) / margin) * 100).toFixed(1) : 0,
      timeframe: '1H / 5M',
      strategy: `${lev}x Isolated Perpetual`,
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

      // Real-time price movement (Gross Unrealized Floating PnL - Standard Exchange UX)
      const priceDelta = isLong ? (livePrice - pos.entry) : (pos.entry - livePrice);
      const posSize = Number(pos.positionSize) || 0;
      const notional = Number(pos.notionalUSD) || +(pos.entry * posSize).toFixed(2) || 0;
      const grossPnl = +(priceDelta * posSize).toFixed(2) || 0;
      const estExitFee = +(livePrice * posSize * DELTA_FEE_RATES.TAKER).toFixed(2) || 0;
      const entryFee = Number(pos.entryFeeUSD) || +(notional * DELTA_FEE_RATES.TAKER).toFixed(2) || 0;
      const brokerageFee = +(entryFee + estExitFee).toFixed(2);
      const estGst = +(brokerageFee * DELTA_FEE_RATES.GST_RATE).toFixed(2);
      const totalEstimatedCharges = +(brokerageFee + estGst).toFixed(2);
      const netPnl = +(grossPnl - totalEstimatedCharges).toFixed(2);

      // Open positions display Gross Floating PnL so price moves in trader direction show green immediately
      pos.unrealizedGrossPnlUSD = grossPnl;
      pos.unrealizedPnlUSD = grossPnl;
      pos.unrealizedNetPnlUSD = netPnl;
      pos.brokerageFeeUSD = brokerageFee;
      pos.gstUSD = estGst;
      pos.feesUSD = totalEstimatedCharges;
      pos.unrealizedR = Number(pos.riskUSD) > 0 ? +(grossPnl / pos.riskUSD).toFixed(2) : 0;
      pos.roePercent = Number(pos.marginUSD) > 0 ? +((grossPnl / pos.marginUSD) * 100).toFixed(1) : 0;

      // 1. Check Liquidation (Delta Exchange Standard)
      let hitLiquidation = false;
      if (pos.liquidationPrice && pos.liquidationPrice > 0) {
        hitLiquidation = isLong ? (livePrice <= pos.liquidationPrice) : (livePrice >= pos.liquidationPrice);
      }

      // 2. Check SL or TP Hit
      let hitTarget = isLong ? (livePrice >= pos.target) : (livePrice <= pos.target);
      let hitStop = isLong ? (livePrice <= pos.stopLoss) : (livePrice >= pos.stopLoss);

      if (hitLiquidation) {
        this.closePosition(pos.id, 'LIQUIDATED', pos.liquidationPrice);
        closedList.push({ pos, result: 'LIQUIDATED', price: pos.liquidationPrice });
      } else if (hitTarget) {
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
    
    // Delta Exchange Execution Fees + 18% GST (Delta Exchange India Standard)
    const posSize = Number(pos.positionSize) || 0;
    const notional = Number(pos.notionalUSD) || +(Number(pos.entry || actualExit) * posSize).toFixed(2) || 0;
    const entryFee = Number(pos.entryFeeUSD) || +(notional * DELTA_FEE_RATES.TAKER).toFixed(2) || 0;
    // TP exit is Maker (0.02%), SL / Manual exit is Taker (0.05%)
    const exitRate = resultType === 'WIN' ? DELTA_FEE_RATES.MAKER : DELTA_FEE_RATES.TAKER;
    const exitNotional = +(actualExit * posSize).toFixed(2) || 0;
    const exitFee = +(exitNotional * exitRate).toFixed(2) || 0;
    const brokerageFee = +(entryFee + exitFee).toFixed(2);
    const gstFee = +(brokerageFee * DELTA_FEE_RATES.GST_RATE).toFixed(2); // 18% GST on Delta Exchange Brokerage
    const totalCharges = +(brokerageFee + gstFee).toFixed(2);

    let grossPnlUSD;
    let pnlUSD;
    let rMultiple;
    let result = resultType;

    if (resultType === 'LIQUIDATED') {
      const margin = Number(pos.marginUSD) || +(notional / (Number(pos.leverage) || 20)).toFixed(2) || 0;
      grossPnlUSD = -margin;
      pnlUSD = -margin;
      rMultiple = -1.0;
      result = 'LIQUIDATED';
    } else {
      grossPnlUSD = +(priceDelta * posSize).toFixed(2) || 0;
      pnlUSD = +(grossPnlUSD - totalCharges).toFixed(2) || 0; // Net Realized Settled to Wallet
      const risk = Number(pos.riskUSD) || 0;
      rMultiple = risk > 0 ? +(pnlUSD / risk).toFixed(2) : 0;
      if (resultType === 'MANUAL') {
        result = pnlUSD > 0 ? 'WIN' : pnlUSD < 0 ? 'LOSS' : 'BREAKEVEN';
      }
    }

    if (isNaN(pnlUSD) || !isFinite(pnlUSD)) pnlUSD = 0;
    if (isNaN(grossPnlUSD) || !isFinite(grossPnlUSD)) grossPnlUSD = 0;
    if (isNaN(rMultiple) || !isFinite(rMultiple)) rMultiple = 0;

    const baseBal = (isNaN(this.balance) || !isFinite(this.balance) || this.balance <= 0) ? this.initialBalance : this.balance;
    const postTradeBalance = +(baseBal + pnlUSD).toFixed(2);

    const closedTrade = {
      ...pos,
      status: 'CLOSED',
      result,
      exitPrice: actualExit < 0.1 ? +actualExit.toFixed(6) : actualExit < 1 ? +actualExit.toFixed(5) : actualExit < 10 ? +actualExit.toFixed(4) : +actualExit.toFixed(2),
      grossPnlUSD,
      entryFeeUSD: entryFee,
      exitFeeUSD: exitFee,
      brokerageFeeUSD: brokerageFee,
      gstUSD: gstFee,
      totalFeesUSD: totalCharges,
      totalChargesUSD: totalCharges,
      feesUSD: totalCharges,
      feeModel: 'Delta Exchange India (0.05% Taker / 0.02% Maker + 18% GST)',
      pnlUSD, // Net Realized Settled PnL
      postTradeBalance,
      rMultiple,
      closedAt: Date.now()
    };

    this.balance = postTradeBalance;
    this.trades.unshift(closedTrade);
    this.save();
    return closedTrade;
  }

  closeAllPositions(resultType = 'MANUAL') {
    const closedList = [];
    const toClose = [...this.openPositions];
    for (const pos of toClose) {
      const closed = this.closePosition(pos.id, resultType, pos.currentPrice);
      if (closed) {
        closedList.push(closed);
      }
    }
    return closedList;
  }

  getLiveEquity(currentPrices = {}) {
    let unrealizedPnlUSD = 0;
    let unrealizedGrossPnlUSD = 0;
    let unrealizedFeesUSD = 0;
    let unrealizedR = 0;

    // Self-healing balance check: if corrupted by NaN or non-finite, heal immediately
    if (isNaN(this.balance) || !isFinite(this.balance) || this.balance <= 0) {
      const closedPnL = this.trades
        .filter(t => t.status === 'CLOSED')
        .reduce((sum, t) => sum + (Number(t.pnlUSD) || 0), 0);
      const calcBal = (this.initialBalance || 2000) + closedPnL;
      this.balance = (isNaN(calcBal) || !isFinite(calcBal) || calcBal <= 0) ? (this.initialBalance || 2000) : +calcBal.toFixed(2);
      this.save();
    }

    this.openPositions.forEach(pos => {
      const livePrice = Number(currentPrices[pos.asset] || pos.currentPrice || pos.entry || 0);
      pos.currentPrice = livePrice;
      const isLong = (pos.direction || 'LONG').toUpperCase() === 'LONG';
      const entryP = Number(pos.entry) || livePrice;
      const priceDelta = isLong ? (livePrice - entryP) : (entryP - livePrice);
      const posSize = Number(pos.positionSize) || 0;
      const notional = Number(pos.notionalUSD) || +(entryP * posSize).toFixed(2) || 0;
      const grossPnl = +(priceDelta * posSize).toFixed(2) || 0;
      const estExitFee = +(livePrice * posSize * DELTA_FEE_RATES.TAKER).toFixed(2) || 0;
      const entryFee = Number(pos.entryFeeUSD) || +(notional * DELTA_FEE_RATES.TAKER).toFixed(2) || 0;
      const brokerage = +( entryFee + estExitFee ).toFixed(2);
      const estGst = +(brokerage * DELTA_FEE_RATES.GST_RATE).toFixed(2);
      const totalFees = +(brokerage + estGst).toFixed(2);
      const netPnl = +(grossPnl - totalFees).toFixed(2);

      pos.unrealizedGrossPnlUSD = isNaN(grossPnl) ? 0 : grossPnl;
      pos.feesUSD = isNaN(totalFees) ? 0 : totalFees;
      pos.unrealizedPnlUSD = isNaN(grossPnl) ? 0 : grossPnl;
      pos.unrealizedNetPnlUSD = isNaN(netPnl) ? 0 : netPnl;
      const risk = Number(pos.riskUSD) || 0;
      pos.unrealizedR = risk > 0 ? +(grossPnl / risk).toFixed(2) : 0;
      const margin = Number(pos.marginUSD) || 0;
      pos.roePercent = margin > 0 ? +((grossPnl / margin) * 100).toFixed(1) : 0;

      unrealizedGrossPnlUSD += (isNaN(grossPnl) ? 0 : grossPnl);
      unrealizedFeesUSD += (isNaN(totalFees) ? 0 : totalFees);
      unrealizedPnlUSD += (isNaN(grossPnl) ? 0 : grossPnl);
      unrealizedR += (isNaN(pos.unrealizedR) ? 0 : pos.unrealizedR);
    });

    const closed = this.trades.filter(t => t.status === 'CLOSED');
    const closedTotalR = +closed.reduce((acc, t) => acc + (Number(t.rMultiple) || 0), 0).toFixed(2);
    const closedPnlUSD = +closed.reduce((acc, t) => acc + (Number(t.pnlUSD) || 0), 0).toFixed(2);
    const safeBalance = (isNaN(this.balance) || !isFinite(this.balance) || this.balance <= 0) ? (this.initialBalance || 2000) : this.balance;
    const equity = +(safeBalance + unrealizedPnlUSD).toFixed(2);
    const netTotalR = +(closedTotalR + unrealizedR).toFixed(2);
    const netTotalPnlUSD = +(closedPnlUSD + unrealizedPnlUSD).toFixed(2);
    const usedMargin = +this.openPositions.reduce((acc, p) => acc + (Number(p.marginUSD) || 0), 0).toFixed(2);
    const availableMargin = Math.max(0, +(safeBalance - usedMargin).toFixed(2));

    return {
      balance: +safeBalance.toFixed(2),
      equity: isNaN(equity) ? +safeBalance.toFixed(2) : equity,
      usedMargin,
      availableMargin,
      unrealizedPnlUSD: +unrealizedPnlUSD.toFixed(2),
      unrealizedGrossPnlUSD: +unrealizedGrossPnlUSD.toFixed(2),
      unrealizedFeesUSD: +unrealizedFeesUSD.toFixed(2),
      unrealizedR: +unrealizedR.toFixed(2),
      closedTotalR,
      closedPnlUSD,
      netTotalR,
      netTotalPnlUSD,
      hasOpenPositions: this.openPositions.length > 0,
      openPositionsCount: this.openPositions.length
    };
  }

  getFinancialLedger(filterMonth = 'ALL') {
    // Dynamic In-Memory Self-Healing: If runaway glitch trades detected in this.trades, wipe them immediately
    if (this.trades.length > 50 && (this.trades.filter(t => t.result === 'LOSS' || t.result === 'LIQUIDATED').length / this.trades.length) > 0.8) {
      this.trades = [];
      this.balance = 2000.0;
      this.save();
    }
    const closed = this.trades.filter(t => t.status === 'CLOSED');
    
    // Group / filter by month if specified (Format: YYYY-MM)
    const filtered = closed.filter(t => {
      if (filterMonth === 'ALL') return true;
      const d = new Date(t.closedAt || Date.now());
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return monthKey === filterMonth;
    });

    const totalTrades = filtered.length;
    const wins = filtered.filter(t => t.result === 'WIN' || (Number(t.pnlUSD || 0) > 0));
    const losses = filtered.filter(t => t.result === 'LOSS' || t.result === 'LIQUIDATED' || (Number(t.pnlUSD || 0) < 0));
    const breakevens = filtered.filter(t => t.result === 'BREAKEVEN' || (Number(t.pnlUSD || 0) === 0 && t.result !== 'LIQUIDATED'));

    const totalBrokerage = +filtered.reduce((acc, t) => acc + (t.brokerageFeeUSD || (t.totalFeesUSD ? +(t.totalFeesUSD / 1.18).toFixed(2) : 0)), 0).toFixed(2);
    const totalGST = +filtered.reduce((acc, t) => acc + (t.gstUSD || (t.totalFeesUSD ? +(t.totalFeesUSD - (t.totalFeesUSD / 1.18)).toFixed(2) : 0)), 0).toFixed(2);
    const totalCharges = +(totalBrokerage + totalGST).toFixed(2);
    const netSettledPnl = +filtered.reduce((acc, t) => acc + (Number(t.pnlUSD) || 0), 0).toFixed(2);
    // Double-entry accounting: Gross PnL minus Charges equals Net Settled to the penny
    const totalGrossPnl = +(netSettledPnl + totalCharges).toFixed(2);
    const winRate = totalTrades > 0 ? +((wins.length / totalTrades) * 100).toFixed(1) : 0;

    // Available month options extracted from history
    const monthsSet = new Set();
    closed.forEach(t => {
      const d = new Date(t.closedAt || Date.now());
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(monthKey);
    });

    const availableMonths = Array.from(monthsSet).sort().reverse().map(key => {
      const [year, month] = key.split('-');
      const dateObj = new Date(Number(year), Number(month) - 1, 1);
      const label = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return { key, label };
    });

    return {
      filterMonth,
      availableMonths,
      totalTrades,
      winCount: wins.length,
      lossCount: losses.length,
      breakevenCount: breakevens.length,
      winRate,
      totalGrossPnl,
      totalBrokerage,
      totalGST,
      totalCharges,
      netSettledPnl,
      trades: filtered,
      allTrades: closed
    };
  }

  getAnalytics() {
    const closed = this.trades.filter(t => t.status === 'CLOSED');
    const totalTrades = closed.length;
    const wins = closed.filter(t => t.result === 'WIN' || (Number(t.pnlUSD || 0) > 0));
    const losses = closed.filter(t => t.result === 'LOSS' || t.result === 'LIQUIDATED' || (Number(t.pnlUSD || 0) < 0));
    const breakevens = closed.filter(t => t.result === 'BREAKEVEN' || (Number(t.pnlUSD || 0) === 0 && t.result !== 'LIQUIDATED'));

    const winRate = totalTrades > 0 ? +((wins.length / totalTrades) * 100).toFixed(1) : 0;
    const totalR = +closed.reduce((acc, t) => acc + (t.rMultiple || 0), 0).toFixed(2);
    const totalPnlUSD = +closed.reduce((acc, t) => acc + (t.pnlUSD || 0), 0).toFixed(2);
    const totalFeesUSD = +closed.reduce((acc, t) => acc + (t.totalFeesUSD || t.feesUSD || 0), 0).toFixed(2);
    const grossPnlUSD = +(totalPnlUSD + totalFeesUSD).toFixed(2);

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
    const usedMargin = +this.openPositions.reduce((acc, p) => acc + (p.marginUSD || 0), 0).toFixed(2);

    return {
      balance: +this.balance.toFixed(2),
      initialBalance: this.initialBalance,
      equity: +(this.balance + unrealizedPnlUSD).toFixed(2),
      usedMargin,
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
      totalFeesUSD,
      grossPnlUSD,
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

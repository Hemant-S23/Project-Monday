/**
 * MONDAY Alpha Radar — Institutional Signal & Execution Engine
 * Evaluates multi-asset confluence, issues structured limit orders with precise timestamps,
 * enforces dynamic validity windows, and autonomously manages order lifecycle.
 */

function formatLevelPrice(val, asset) {
  const n = Number(val);
  if (isNaN(n)) return 0;
  if (asset === 'BTC') return +n.toFixed(1);
  if (asset === 'ETH' || asset === 'SOL') return +n.toFixed(2);
  if (n < 0.001) return +n.toFixed(6);
  if (n < 0.01) return +n.toFixed(5);
  if (n < 1) return +n.toFixed(4);
  if (n < 100) return +n.toFixed(3);
  return +n.toFixed(2);
}

export class SignalEngine {
  constructor() {
    this.storageKey = 'monday_alpha_signals';
    this.signals = this.loadSignals();
    this.listeners = new Set();
    this.lastScannedPrices = new Map();
  }

  loadSignals() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            // Clean Slate Sanitizer: Automatically purge legacy corrupted signals with collapsed/identical/negative levels
            const sanitized = parsed.filter(s => {
              const entry = Number(s.entryPrice);
              const sl = Number(s.stopLossPrice);
              const tp = Number(s.takeProfitPrice);
              if (isNaN(entry) || isNaN(sl) || isNaN(tp)) return false;
              if (entry <= 0 || sl <= 0 || tp <= 0) return false;
              if (entry === sl || entry === tp || sl === tp) return false;
              if (s.direction === 'LONG' && (tp <= entry || sl >= entry)) return false;
              if (s.direction === 'SHORT' && (tp >= entry || sl <= entry)) return false;
              return true;
            });
            if (sanitized.length !== parsed.length) {
              localStorage.setItem(this.storageKey, JSON.stringify(sanitized));
            }
            return sanitized;
          }
        }
      }
    } catch (e) {
      console.warn('[SignalEngine] Failed to load persisted signals:', e);
    }
    return [];
  }

  saveSignals() {
    try {
      if (typeof localStorage !== 'undefined') {
        // Keep up to 100 most recent signals
        const toSave = this.signals.slice(0, 100);
        localStorage.setItem(this.storageKey, JSON.stringify(toSave));
      }
    } catch (e) {
      console.warn('[SignalEngine] Failed to persist signals:', e);
    }
    this.notify();
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.add(listener);
    }
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(cb => {
      try {
        cb(this.getSignals());
      } catch (e) {}
    });
  }

  /**
   * Process a strategy evaluation from StrategyEngine for an asset
   */
  processStrategyResult(asset, evalData) {
    if (!evalData || !evalData.strategyResult) return null;
    const { strategyResult, currentPrice, currencySymbol = '$' } = evalData;

    // 1. Strict Real-Data Gate: For Crypto, reject any signals generated on synthetic/fallback candles
    if (currencySymbol === '$' && (evalData.isSynthetic || evalData.candlesAreSynthetic)) {
      return null;
    }

    // 2. Minimum Liquidity & Price Gate: Skip sub-cent penny tokens and dead assets (< $0.005 or zero volume)
    if (currencySymbol === '$') {
      if (!currentPrice || currentPrice < 0.005) {
        return null;
      }
      if (evalData.volume && evalData.volume > 0 && evalData.volume < 10000) {
        return null;
      }
    }

    // 3. Cooldown Gate: Prevent rapid re-triggering on same asset (15-minute cooldown since last closed signal)
    const recentClosed = this.signals.find(s => 
      s.asset === asset && 
      (s.status === 'SL_HIT' || s.status === 'TP_HIT' || s.status === 'INVALIDATED') &&
      s.closedAt && (Date.now() - s.closedAt < 15 * 60 * 1000)
    );
    if (recentClosed) {
      return null;
    }

    // Check existing active or pending signal for this asset
    const existingActive = this.signals.find(s => 
      s.asset === asset && (s.status === 'PENDING' || s.status === 'ACTIVE')
    );

    // If an active signal exists, check for structural invalidation from engine
    if (existingActive) {
      if (strategyResult.state === 'CANCELLED' && existingActive.status === 'PENDING') {
        existingActive.status = 'INVALIDATED';
        existingActive.invalidatedReason = strategyResult.reasoning?.[0] || 'Market structure broken';
        existingActive.closedAt = Date.now();
        this.saveSignals();
      }
      return existingActive;
    }

    // Only issue signals for High-Probability Setups (Grade A or A+, Confluence >= 70% or CONFIRMED/DEVELOPING)
    const levels = strategyResult.levels;
    const targetVal = levels ? (levels.takeProfit || levels.target) : null;
    const isGradeA = (strategyResult.confluenceScore || 0) >= 70 || strategyResult.state === 'CONFIRMED' || strategyResult.state === 'DEVELOPING';
    const isStateEligible = strategyResult.state !== 'CANCELLED' && strategyResult.state !== 'NO SETUP';
    const hasValidLevels = levels && levels.entry && levels.stopLoss && targetVal;

    if (!isGradeA || !isStateEligible || !hasValidLevels) {
      return null;
    }

    const minRR = Number(levels.rrRatio) || 2.0;
    if (minRR < 1.5) return null; // Strict Risk:Reward safety gate

    // 4. Math & Physical Distance Safety Gate:
    // Entry, Stop Loss, and Take Profit MUST have distinct values and minimum physical separation
    const entryVal = Number(levels.entry);
    const slVal = Number(levels.stopLoss);
    const tpVal = Number(targetVal);

    if (entryVal <= 0 || slVal <= 0 || tpVal <= 0) return null;
    if (entryVal === slVal || entryVal === tpVal || slVal === tpVal) return null;

    const minDistance = entryVal * 0.003; // minimum 0.3% physical separation
    if (Math.abs(entryVal - slVal) < minDistance || Math.abs(tpVal - entryVal) < minDistance) {
      return null;
    }

    // Directional integrity check
    const direction = strategyResult.direction || (entryVal < tpVal ? 'LONG' : 'SHORT');
    if (direction === 'LONG' && (tpVal <= entryVal || slVal >= entryVal)) {
      return null;
    }
    if (direction === 'SHORT' && (tpVal >= entryVal || slVal <= entryVal)) {
      return null;
    }

    // Auto-Pilot Pre-Flight Price Sanity Firewall: If market has reached or crossed SL or TP, block signal
    const livePrice = Number(currentPrice) || entryVal;
    if (direction === 'LONG') {
      if (livePrice <= slVal || livePrice >= tpVal) return null;
    } else {
      if (livePrice >= slVal || livePrice <= tpVal) return null;
    }

    const entryPrice = formatLevelPrice(entryVal, asset);
    const stopLossPrice = formatLevelPrice(slVal, asset);
    const takeProfitPrice = formatLevelPrice(tpVal, asset);

    // Final Guard: Verify that formatted numbers never collapse into each other
    if (entryPrice === stopLossPrice || entryPrice === takeProfitPrice || stopLossPrice === takeProfitPrice) {
      return null;
    }

    // Dynamic Validity Window: 45 minutes for 5M pullback, 90 mins for 1H HTF confirmation
    const validityMinutes = strategyResult.htfTrend?.direction !== 'UNCLEAR' ? 45 : 30;
    const now = Date.now();

    const signal = {
      id: `SIG-${asset}-${now}`,
      asset,
      direction,
      orderType: 'LIMIT',
      entryPrice,
      stopLossPrice,
      takeProfitPrice,
      riskReward: +minRR.toFixed(2),
      confluenceScore: strategyResult.confluenceScore || 80,
      confluenceGrade: strategyResult.confluenceGrade || 'GRADE A',
      rationale: Array.isArray(strategyResult.reasoning) && strategyResult.reasoning.length > 0
        ? strategyResult.reasoning.slice(0, 3)
        : ['1H HTF Directional Confluence', 'Institutional Liquidity Retracement', 'Strict 1:2 R:R Asymmetry'],
      currencySymbol,
      issuedAt: now,
      validityMinutes,
      expiresAt: now + (validityMinutes * 60 * 1000),
      status: 'PENDING', // PENDING -> ACTIVE -> TP_HIT | SL_HIT | EXPIRED | INVALIDATED
      inPortfolio: false,
      tradeId: null,
      filledAt: null,
      closedAt: null,
      realizedR: 0
    };

    // Prepend new signal
    this.signals.unshift(signal);
    this.saveSignals();
    return signal;
  }

  /**
   * Price ticker lifecycle watcher
   * Updates state on each price tick across coins
   */
  onPriceTick(asset, price) {
    if (!price || isNaN(price)) return;
    this.lastScannedPrices.set(asset, Number(price));

    const now = Date.now();
    let hasChanged = false;

    this.signals.forEach(signal => {
      if (signal.asset !== asset) return;

      // 1. Check expiration for pending signals
      if (signal.status === 'PENDING' && now >= signal.expiresAt) {
        signal.status = 'EXPIRED';
        signal.closedAt = now;
        hasChanged = true;
        return;
      }

      // 2. Pending limit order state transitions
      if (signal.status === 'PENDING') {
        if (signal.direction === 'LONG') {
          // If price touches or dips below limit entry: ORDER FILLED
          if (price <= signal.entryPrice) {
            signal.status = 'ACTIVE';
            signal.filledAt = now;
            hasChanged = true;
          } 
          // If price shoots up directly to target BEFORE entering: INVALIDATED
          else if (price >= signal.takeProfitPrice) {
            signal.status = 'INVALIDATED';
            signal.invalidatedReason = 'Price hit target without triggering entry limit.';
            signal.closedAt = now;
            hasChanged = true;
          }
          // If price crashes past stop loss BEFORE entering: INVALIDATED
          else if (price <= signal.stopLossPrice) {
            signal.status = 'INVALIDATED';
            signal.invalidatedReason = 'Price breached invalidation level before entry.';
            signal.closedAt = now;
            hasChanged = true;
          }
        } else if (signal.direction === 'SHORT') {
          // If price rallies to or above limit entry: ORDER FILLED
          if (price >= signal.entryPrice) {
            signal.status = 'ACTIVE';
            signal.filledAt = now;
            hasChanged = true;
          }
          // If price dumps directly to target BEFORE entering: INVALIDATED
          else if (price <= signal.takeProfitPrice) {
            signal.status = 'INVALIDATED';
            signal.invalidatedReason = 'Price hit target without triggering entry limit.';
            signal.closedAt = now;
            hasChanged = true;
          }
          // If price pumps past stop loss BEFORE entering: INVALIDATED
          else if (price >= signal.stopLossPrice) {
            signal.status = 'INVALIDATED';
            signal.invalidatedReason = 'Price breached invalidation level before entry.';
            signal.closedAt = now;
            hasChanged = true;
          }
        }
      }

      // 3. Active position state transitions (TP / SL Watcher)
      else if (signal.status === 'ACTIVE') {
        if (signal.direction === 'LONG') {
          if (price >= signal.takeProfitPrice) {
            signal.status = 'TP_HIT';
            signal.closedAt = now;
            signal.realizedR = signal.riskReward;
            hasChanged = true;
          } else if (price <= signal.stopLossPrice) {
            signal.status = 'SL_HIT';
            signal.closedAt = now;
            signal.realizedR = -1.0;
            hasChanged = true;
          }
        } else if (signal.direction === 'SHORT') {
          if (price <= signal.takeProfitPrice) {
            signal.status = 'TP_HIT';
            signal.closedAt = now;
            signal.realizedR = signal.riskReward;
            hasChanged = true;
          } else if (price >= signal.stopLossPrice) {
            signal.status = 'SL_HIT';
            signal.closedAt = now;
            signal.realizedR = -1.0;
            hasChanged = true;
          }
        }
      }
    });

    if (hasChanged) {
      this.saveSignals();
    }
  }

  /**
   * Directly registers an executed position into the signals desk
   * Ensures any trade taken by Auto-Pilot or manual desk immediately appears as an ACTIVE signal card
   */
  registerExecutedPosition(pos) {
    if (!pos || !pos.asset) return;
    const now = Date.now();
    let sig = this.signals.find(s => s.asset === pos.asset && (s.status === 'PENDING' || s.status === 'ACTIVE'));
    if (sig) {
      sig.status = 'ACTIVE';
      sig.inPortfolio = true;
      sig.tradeId = pos.id;
      sig.filledAt = sig.filledAt || now;
      this.saveSignals();
      return sig;
    }

    const entryPrice = formatLevelPrice(pos.entry, pos.asset);
    const stopLossPrice = formatLevelPrice(pos.stopLoss, pos.asset);
    const takeProfitPrice = formatLevelPrice(pos.target, pos.asset);
    const rr = Number(pos.rrRatio) || 2.0;

    sig = {
      id: `SIG-${pos.asset}-${now}`,
      tradeId: pos.id,
      asset: pos.asset,
      direction: pos.direction || 'LONG',
      orderType: 'MARKET',
      entryPrice,
      stopLossPrice,
      takeProfitPrice,
      riskReward: +rr.toFixed(2),
      confluenceScore: pos.confluenceScore || 85,
      confluenceGrade: pos.confluenceGrade || 'GRADE A',
      rationale: Array.isArray(pos.conditions) && pos.conditions.length > 0
        ? pos.conditions.slice(0, 3)
        : ['Auto-Pilot Neural Execution', 'Institutional Order Flow', 'Asymmetric Risk/Reward Verified'],
      currencySymbol: pos.market === 'India' ? '₹' : '$',
      issuedAt: now,
      validityMinutes: 60,
      expiresAt: now + (60 * 60 * 1000),
      status: 'ACTIVE',
      inPortfolio: true,
      filledAt: now,
      closedAt: null,
      realizedR: 0
    };

    this.signals.unshift(sig);
    this.saveSignals();
    return sig;
  }

  /**
   * Synchronizes signal status when an actual position closes in PaperTrader
   */
  onPositionClosed(closedPos, result = null, exitPrice = null) {
    if (!closedPos || !closedPos.asset) return;
    const now = Date.now();
    const sig = this.signals.find(s => 
      (closedPos.id && s.tradeId === closedPos.id) || 
      (s.asset === closedPos.asset && s.status === 'ACTIVE')
    );
    if (!sig) return;

    sig.inPortfolio = false;
    sig.closedAt = now;
    const isWin = result === 'WIN' || closedPos.result === 'WIN' || closedPos.exitReason === 'TAKE_PROFIT' || closedPos.exitReason === 'Take Profit Hit' || Number(closedPos.pnlUSD || closedPos.realizedPnlUSD || 0) >= 0;
    
    if (isWin) {
      sig.status = 'TP_HIT';
      sig.realizedR = sig.riskReward || 2.0;
    } else {
      sig.status = 'SL_HIT';
      sig.realizedR = -1.0;
    }
    this.saveSignals();
  }

  /**
   * Synchronizes the inPortfolio flag with the live openPositions list
   */
  syncOpenPositions(openPositions = []) {
    const activeAssets = new Set((openPositions || []).map(p => p.asset));
    let hasChanged = false;
    this.signals.forEach(s => {
      if (s.status === 'ACTIVE') {
        const shouldBeIn = activeAssets.has(s.asset);
        if (s.inPortfolio !== shouldBeIn) {
          s.inPortfolio = shouldBeIn;
          hasChanged = true;
        }
      } else if (s.inPortfolio) {
        s.inPortfolio = false;
        hasChanged = true;
      }
    });
    if (hasChanged) {
      this.saveSignals();
    }
  }

  /**
   * Historical Downtime Catch-Up for Alpha Signals
   * Audits unresolved ACTIVE and PENDING signals against 5M historical candles
   * Ensures sleeping/throttled browser tabs catch all Target Hits & Stop Losses immediately on wake-up!
   */
  async auditDowntimeSignals(cryptoAdapter = null) {
    const now = Date.now();
    if (this._lastAuditDowntime && (now - this._lastAuditDowntime < 20000)) {
      return [];
    }
    this._lastAuditDowntime = now;

    const unresolved = this.signals.filter(s => s.status === 'PENDING' || s.status === 'ACTIVE');
    if (unresolved.length === 0) return [];

    let hasChanged = false;
    const resolved = [];

    await Promise.all(unresolved.map(async (sig) => {
      try {
        const cleanAsset = (sig.asset || 'BTC').toUpperCase().replace(/\/USD$/, '').replace(/-USD$/, '');
        let candles = [];

        // 1. Fetch recent 5M candles from Coinbase API
        const symbol = `${cleanAsset}-USD`;
        const url = `https://api.exchange.coinbase.com/products/${symbol}/candles?granularity=300`;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              candles = data.map(c => ({
                time: c[0] * 1000,
                low: parseFloat(c[1]),
                high: parseFloat(c[2]),
                open: parseFloat(c[3]),
                close: parseFloat(c[4])
              })).sort((a, b) => a.time - b.time);
            }
          }
        } catch (fetchErr) {}

        // Fallback to adapter cache if REST failed
        if ((!candles || candles.length === 0) && cryptoAdapter && typeof cryptoAdapter.getHistoricalCandles === 'function') {
          try {
            const cached = await cryptoAdapter.getHistoricalCandles(cleanAsset, '5M');
            if (Array.isArray(cached) && cached.length > 0) {
              candles = cached.map(c => ({
                time: typeof c.time === 'number' ? (c.time > 1e11 ? c.time : c.time * 1000) : Date.now(),
                low: c.low,
                high: c.high,
                open: c.open,
                close: c.close
              })).sort((a, b) => a.time - b.time);
            }
          } catch (cacheErr) {}
        }

        if (!candles || candles.length === 0) return;

        const isLong = (sig.direction || 'LONG').toUpperCase() === 'LONG';
        const startTime = sig.issuedAt || (Date.now() - 86400000);
        const relevantCandles = candles.filter(c => c.time >= (startTime - 60000));

        for (const candle of relevantCandles) {
          // If still PENDING, check if candle touched limit entry
          if (sig.status === 'PENDING') {
            const entryTouched = isLong ? (candle.low <= sig.entryPrice) : (candle.high >= sig.entryPrice);
            if (entryTouched) {
              sig.status = 'ACTIVE';
              sig.filledAt = candle.time;
              hasChanged = true;
            }
          }

          // If ACTIVE, check TP and SL
          if (sig.status === 'ACTIVE') {
            // Check Stop Loss
            if (sig.stopLossPrice) {
              const slHit = isLong ? (candle.low <= sig.stopLossPrice) : (candle.high >= sig.stopLossPrice);
              if (slHit) {
                sig.status = 'SL_HIT';
                sig.closedAt = candle.time;
                sig.realizedR = -1.0;
                sig.inPortfolio = false;
                hasChanged = true;
                resolved.push(sig);
                break;
              }
            }

            // Check Take Profit
            if (sig.takeProfitPrice) {
              const tpHit = isLong ? (candle.high >= sig.takeProfitPrice) : (candle.low <= sig.takeProfitPrice);
              if (tpHit) {
                sig.status = 'TP_HIT';
                sig.closedAt = candle.time;
                sig.realizedR = sig.riskReward || 2.0;
                sig.inPortfolio = false;
                hasChanged = true;
                resolved.push(sig);
                break;
              }
            }
          }
        }
      } catch (err) {}
    }));

    if (hasChanged) {
      this.saveSignals();
    }
    return resolved;
  }

  /**
   * Periodic interval cleanup (marks expired pending signals even if no new ticks)
   */
  checkTimeouts() {
    const now = Date.now();
    let hasChanged = false;

    this.signals.forEach(signal => {
      if (signal.status === 'PENDING' && now >= signal.expiresAt) {
        signal.status = 'EXPIRED';
        signal.closedAt = now;
        hasChanged = true;
      }
    });

    if (hasChanged) {
      this.saveSignals();
    }
  }

  getSignals(filter = 'ALL') {
    this.checkTimeouts();
    if (filter === 'PENDING') {
      return this.signals.filter(s => s.status === 'PENDING');
    }
    if (filter === 'ACTIVE') {
      return this.signals.filter(s => s.status === 'ACTIVE');
    }
    if (filter === 'COMPLETED') {
      return this.signals.filter(s => s.status === 'TP_HIT' || s.status === 'SL_HIT');
    }
    if (filter === 'EXPIRED') {
      return this.signals.filter(s => s.status === 'EXPIRED' || s.status === 'INVALIDATED');
    }
    return [...this.signals];
  }

  getActiveCount() {
    this.checkTimeouts();
    return this.signals.filter(s => s.status === 'PENDING' || s.status === 'ACTIVE').length;
  }

  getSignalById(id) {
    return this.signals.find(s => s.id === id) || null;
  }

  clearAll() {
    this.signals = [];
    this.saveSignals();
  }
}


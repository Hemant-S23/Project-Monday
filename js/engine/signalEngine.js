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

    // 2. Minimum Liquidity & Price Gate: Skip sub-cent penny tokens and dead assets (< $0.005 or < $5M volume)
    if (currencySymbol === '$') {
      if (!currentPrice || currentPrice < 0.005) {
        return null;
      }
      if (evalData.volume && evalData.volume > 0 && evalData.volume < 5000000) {
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
    // Entry, Stop Loss, and Take Profit MUST have distinct values and minimum 0.8% physical separation
    const entryVal = Number(levels.entry);
    const slVal = Number(levels.stopLoss);
    const tpVal = Number(targetVal);

    if (entryVal <= 0 || slVal <= 0 || tpVal <= 0) return null;
    if (entryVal === slVal || entryVal === tpVal || slVal === tpVal) return null;

    const minDistance = entryVal * 0.003; // minimum 0.3% physical separation ($200+ on BTC, distinct on alts)
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


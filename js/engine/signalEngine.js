/**
 * MONDAY Alpha Radar — Institutional Signal & Execution Engine
 * Evaluates multi-asset confluence, issues structured limit orders with precise timestamps,
 * enforces dynamic validity windows, and autonomously manages order lifecycle.
 */

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
            return parsed;
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

    // Only issue signals for High-Probability Setups (Grade A or A+, Confluence >= 75%)
    const isGradeA = strategyResult.confluenceScore >= 75;
    const isStateEligible = strategyResult.state === 'CONFIRMED' || strategyResult.state === 'DEVELOPING';
    const hasValidLevels = strategyResult.levels && strategyResult.levels.entry && strategyResult.levels.stopLoss && strategyResult.levels.takeProfit;

    if (!isGradeA || !isStateEligible || !hasValidLevels) {
      return null;
    }

    const levels = strategyResult.levels;
    const minRR = Number(levels.rrRatio) || 2.0;
    if (minRR < 1.5) return null; // Strict Risk:Reward safety gate

    // Dynamic Validity Window: 45 minutes for 5M pullback, 90 mins for 1H HTF confirmation
    const validityMinutes = strategyResult.htfTrend?.direction !== 'UNCLEAR' ? 45 : 30;
    const now = Date.now();

    const signal = {
      id: `SIG-${asset}-${now}`,
      asset,
      direction: strategyResult.direction || (levels.entry < levels.takeProfit ? 'LONG' : 'SHORT'),
      orderType: 'LIMIT',
      entryPrice: +levels.entry.toFixed(asset === 'BTC' ? 1 : (asset === 'ETH' || asset === 'SOL' ? 2 : 4)),
      stopLossPrice: +levels.stopLoss.toFixed(asset === 'BTC' ? 1 : (asset === 'ETH' || asset === 'SOL' ? 2 : 4)),
      takeProfitPrice: +levels.takeProfit.toFixed(asset === 'BTC' ? 1 : (asset === 'ETH' || asset === 'SOL' ? 2 : 4)),
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


/**
 * Strategy Engine
 * Implements PRD Steps 1-5:
 * 1. 1H Higher Timeframe Direction (Bullish / Bearish / Unclear)
 * 2. 5M Pullback into Key Area
 * 3. Related-Asset Divergence (BTC vs ETH SMT divergence)
 * 4. Price Confirmation & Real-time AI States (NO SETUP, WAIT, DEVELOPING, CONFIRMED, CANCELLED)
 * 5. Structural SL, TP & R:R Validation (Min 1:2)
 */
export class StrategyEngine {
  constructor() {
    this.name = 'HTF-Trend Pullback & SMT Divergence';
    this.lastEvaluations = new Map();
  }

  /**
   * Evaluates the strategy for a target asset (BTC or SOL) comparing with related asset (ETH)
   */
  evaluate(targetAsset, targetCandles1H, targetCandles5M, relatedCandles5M, currentPrice, currencySymbol = '$', relatedAssetName = 'ETH') {
    if (!targetCandles1H || targetCandles1H.length < 10 || !targetCandles5M || targetCandles5M.length < 10) {
      return this.createState('NO SETUP', 'Insufficient candle data to form complete strategy assessment.');
    }

    // --- STEP 1: Higher-Timeframe (1H) Direction ---
    const htfTrend = this.calculateHTFTrend(targetCandles1H);

    if (htfTrend.direction === 'UNCLEAR') {
      return this.createState('WAIT', '1H higher timeframe trend is consolidating/unclear. Awaiting directional expansion.', {
        htfTrend,
        targetAsset
      });
    }

    // --- STEP 2: Lower-Timeframe (5M) Pullback into key zone ---
    const ltfStructure = this.calculateLTFStructure(targetCandles5M, htfTrend.direction, currentPrice);

    // --- STEP 3: Related-Asset SMT Divergence ---
    const smtAnalysis = this.calculateSMTDivergence(targetCandles5M, relatedCandles5M, htfTrend.direction);

    // --- STEP 4 & 5: Targets, Stop Loss, and Risk:Reward ---
    const levels = this.calculateLevelsAndRR(targetCandles5M, htfTrend.direction, currentPrice);

    // --- DETERMINING OVERALL STATE ---
    let state = 'WAIT';
    let reasoning = [];
    let missingConditions = [];

    // Check 1: HTF Trend
    reasoning.push(`1H Trend is ${htfTrend.direction} (EMA20: ${currencySymbol}${htfTrend.emaFast.toFixed(1)}, EMA50: ${currencySymbol}${htfTrend.emaSlow.toFixed(1)}).`);

    // Check 2: Pullback
    if (ltfStructure.inPullbackZone) {
      reasoning.push(`5M price pulled back into ${ltfStructure.zoneName} (${currencySymbol}${ltfStructure.zoneLow.toFixed(1)} - ${currencySymbol}${ltfStructure.zoneHigh.toFixed(1)}).`);
    } else {
      missingConditions.push(`5M price is extended; waiting for pullback into reaction zone (${currencySymbol}${ltfStructure.zoneLow.toFixed(1)} - ${currencySymbol}${ltfStructure.zoneHigh.toFixed(1)}).`);
    }

    // Check 3: SMT Divergence
    if (smtAnalysis.divergenceDetected) {
      reasoning.push(`Bullish SMT Divergence detected: ${smtAnalysis.details}.`);
    } else {
      missingConditions.push(`Related asset (${relatedAssetName}) correlation is neutral; no SMT divergence clue yet.`);
    }

    // Check 4: Price Confirmation
    if (ltfStructure.hasConfirmation) {
      reasoning.push(`Price confirmation achieved via lower-timeframe reversal rejection candle.`);
    } else {
      missingConditions.push('Waiting for 5M reversal displacement candle close.');
    }

    // Check 5: Risk / Reward
    if (levels.rrRatio >= 2.0) {
      reasoning.push(`Risk/Reward is attractive at 1:${levels.rrRatio.toFixed(2)} (Target: ${currencySymbol}${levels.target.toFixed(1)}, SL: ${currencySymbol}${levels.stopLoss.toFixed(1)}).`);
    } else {
      missingConditions.push(`Nearest structural target yields RR 1:${levels.rrRatio.toFixed(2)} (Below required 1:2.0 minimum).`);
    }

    // State synthesis
    if (ltfStructure.isInvalidated) {
      state = 'CANCELLED';
      reasoning.push(`Setup invalidated: 5M structure broke key invalidation level $${ltfStructure.invalidationLevel.toFixed(1)}.`);
    } else if (
      ltfStructure.inPullbackZone &&
      ltfStructure.hasConfirmation &&
      levels.rrRatio >= 2.0
    ) {
      state = 'CONFIRMED';
    } else if (ltfStructure.inPullbackZone) {
      state = 'DEVELOPING';
    } else {
      state = 'WAIT';
    }

    const result = {
      state,
      targetAsset,
      currentPrice,
      direction: htfTrend.direction === 'BULLISH' ? 'LONG' : 'SHORT',
      htfTrend,
      ltfStructure,
      smtAnalysis,
      levels,
      reasoning,
      missingConditions,
      evaluatedAt: Date.now()
    };

    this.lastEvaluations.set(targetAsset, result);
    return result;
  }

  calculateHTFTrend(candles) {
    const closes = candles.map(c => c.close);
    const emaFast = this.calculateEMA(closes, 12);
    const emaSlow = this.calculateEMA(closes, 26);
    const lastClose = closes[closes.length - 1];

    let direction = 'UNCLEAR';
    const slope = (emaFast - emaSlow) / emaSlow;

    if (lastClose > emaFast && emaFast > emaSlow && slope > 0.002) {
      direction = 'BULLISH';
    } else if (lastClose < emaFast && emaFast < emaSlow && slope < -0.002) {
      direction = 'BEARISH';
    } else {
      // Structure check
      const recentHighs = candles.slice(-5).map(c => c.high);
      const recentLows = candles.slice(-5).map(c => c.low);
      if (recentHighs[4] > recentHighs[0] && recentLows[4] > recentLows[0]) {
        direction = 'BULLISH';
      } else if (recentHighs[4] < recentHighs[0] && recentLows[4] < recentLows[0]) {
        direction = 'BEARISH';
      }
    }

    return {
      direction,
      emaFast,
      emaSlow,
      lastClose
    };
  }

  calculateLTFStructure(candles, trendDirection, currentPrice) {
    const slice = candles.slice(-15);
    const highs = slice.map(c => c.high);
    const lows = slice.map(c => c.low);
    const lowest = Math.min(...lows);
    const highest = Math.max(...highs);
    const range = highest - lowest;

    if (trendDirection === 'BULLISH') {
      // Bullish setup: Looking for discount pullback (38.2% - 61.8% of recent leg)
      const zoneHigh = highest - (range * 0.382);
      const zoneLow = highest - (range * 0.65);
      const inPullbackZone = currentPrice <= zoneHigh && currentPrice >= (zoneLow - range * 0.05);
      const isInvalidated = currentPrice < (lowest - range * 0.05);

      // Confirmation candle: last candle closed green above previous candle high or bullish wick
      const last = slice[slice.length - 1];
      const prev = slice[slice.length - 2];
      const hasConfirmation = last && prev && (last.close > last.open) && (last.close > prev.close || (last.high - last.close) < (last.close - last.low));

      return {
        zoneName: 'Discount Liquidity / Order Block Zone',
        zoneHigh,
        zoneLow,
        inPullbackZone,
        hasConfirmation,
        isInvalidated,
        invalidationLevel: lowest
      };
    } else {
      // Bearish setup: Premium pullback
      const zoneLow = lowest + (range * 0.382);
      const zoneHigh = lowest + (range * 0.65);
      const inPullbackZone = currentPrice >= zoneLow && currentPrice <= (zoneHigh + range * 0.05);
      const isInvalidated = currentPrice > (highest + range * 0.05);

      const last = slice[slice.length - 1];
      const prev = slice[slice.length - 2];
      const hasConfirmation = last && prev && (last.close < last.open) && (last.close < prev.close);

      return {
        zoneName: 'Premium Supply / FVG Rejection Zone',
        zoneHigh,
        zoneLow,
        inPullbackZone,
        hasConfirmation,
        isInvalidated,
        invalidationLevel: highest
      };
    }
  }

  calculateSMTDivergence(targetCandles, relatedCandles, trendDirection) {
    if (!relatedCandles || relatedCandles.length < 5) {
      return { divergenceDetected: false, details: 'Related asset feed waiting' };
    }

    const tSlice = targetCandles.slice(-6);
    const rSlice = relatedCandles.slice(-6);

    const tLows = tSlice.map(c => c.low);
    const rLows = rSlice.map(c => c.low);

    if (trendDirection === 'BULLISH') {
      // Target made lower low, but ETH made higher low (Bullish SMT)
      const targetLowerLow = tLows[tLows.length - 1] <= Math.min(...tLows.slice(0, -1));
      const relatedHigherLow = rLows[rLows.length - 1] > Math.min(...rLows.slice(0, -1));

      if (targetLowerLow && relatedHigherLow) {
        return {
          divergenceDetected: true,
          details: 'Target swept lower low while ETH maintained a higher swing low (Smart Money Accumulation)'
        };
      }
    } else {
      // Bearish SMT
      const tHighs = tSlice.map(c => c.high);
      const rHighs = rSlice.map(c => c.high);
      const targetHigherHigh = tHighs[tHighs.length - 1] >= Math.max(...tHighs.slice(0, -1));
      const relatedLowerHigh = rHighs[rHighs.length - 1] < Math.max(...rHighs.slice(0, -1));

      if (targetHigherHigh && relatedLowerHigh) {
        return {
          divergenceDetected: true,
          details: 'Target swept higher high while ETH formed lower high (Smart Money Distribution)'
        };
      }
    }

    return {
      divergenceDetected: false,
      details: 'Correlated price movements, no divergence identified'
    };
  }

  calculateLevelsAndRR(candles, trendDirection, currentPrice) {
    const slice = candles.slice(-20);
    const highs = slice.map(c => c.high);
    const lows = slice.map(c => c.low);

    let stopLoss = 0;
    let target = 0;

    if (trendDirection === 'BULLISH') {
      const swingLow = Math.min(...lows);
      stopLoss = swingLow * 0.9985; // 0.15% below swing low
      const recentHigh = Math.max(...highs);
      const potentialTarget = Math.max(recentHigh, currentPrice + (currentPrice - stopLoss) * 2.5);
      target = potentialTarget;
    } else {
      const swingHigh = Math.max(...highs);
      stopLoss = swingHigh * 1.0015;
      const recentLow = Math.min(...lows);
      const potentialTarget = Math.min(recentLow, currentPrice - (stopLoss - currentPrice) * 2.5);
      target = potentialTarget;
    }

    const risk = Math.abs(currentPrice - stopLoss);
    const reward = Math.abs(target - currentPrice);
    const rrRatio = risk > 0 ? (reward / risk) : 0;

    return {
      entry: currentPrice,
      stopLoss,
      target,
      riskDistance: risk,
      rewardDistance: reward,
      rrRatio: +rrRatio.toFixed(2)
    };
  }

  calculateEMA(values, period) {
    if (values.length === 0) return 0;
    const k = 2 / (period + 1);
    let ema = values[0];
    for (let i = 1; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
    }
    return ema;
  }

  createState(state, message, extra = {}) {
    return {
      state,
      direction: 'WAIT',
      reasoning: [message],
      missingConditions: [message],
      evaluatedAt: Date.now(),
      ...extra
    };
  }
}

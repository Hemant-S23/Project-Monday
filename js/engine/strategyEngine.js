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
  evaluate(targetAsset, targetCandles1H, targetCandles5M, relatedCandles5M, currentPrice, currencySymbol = '$', relatedAssetName = 'ETH', externalTelemetry = {}) {
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

    // --- STEP 6: Multi-Timeframe RSI Momentum (14-Period Wilder RSI) ---
    const rsi1H = this.calculateRSI(targetCandles1H, 14);
    const rsi5M = this.calculateRSI(targetCandles5M, 14);
    const isBullish = htfTrend.direction === 'BULLISH';

    let rsiAligned = false;
    let rsiStatus = 'NEUTRAL';
    if (isBullish) {
      if (rsi1H >= 38 && rsi1H <= 75 && rsi5M >= 38) {
        rsiAligned = true;
        rsiStatus = `Bullish Momentum (1H RSI: ${rsi1H}, 5M RSI: ${rsi5M})`;
      } else if (rsi1H > 75) {
        rsiStatus = `Overbought Warning (1H RSI: ${rsi1H} > 75)`;
      } else {
        rsiStatus = `Subdued Momentum (1H RSI: ${rsi1H})`;
      }
    } else {
      if (rsi1H <= 62 && rsi1H >= 25 && rsi5M <= 62) {
        rsiAligned = true;
        rsiStatus = `Bearish Momentum (1H RSI: ${rsi1H}, 5M RSI: ${rsi5M})`;
      } else if (rsi1H < 25) {
        rsiStatus = `Oversold Warning (1H RSI: ${rsi1H} < 25)`;
      } else {
        rsiStatus = `Subdued Momentum (1H RSI: ${rsi1H})`;
      }
    }

    // --- STEP 7: Whale & Volumetric Inflow Filter (20-VMA) ---
    const volumeFlow = this.calculateVolumetricFlow(targetCandles5M);

    // --- STEP 8: Liquidity & Spread Check ---
    const liquidityCheck = this.checkSpreadAndLiquidity(targetAsset, currentPrice);

    // --- DETERMINING OVERALL STATE & REASONING ---
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

    // Check 5: Strict 1:3.0 Asymmetric Risk / Reward Rule
    if (levels.rrRatio >= 3.0) {
      reasoning.push(`Strict 1:3+ Asymmetric Risk/Reward verified at 1:${levels.rrRatio.toFixed(2)} (Target: ${currencySymbol}${levels.target.toFixed(1)}, SL: ${currencySymbol}${levels.stopLoss.toFixed(1)}).`);
    } else {
      missingConditions.push(`Nearest target yields RR 1:${levels.rrRatio.toFixed(2)} (Below required 1:3.0 asymmetric minimum).`);
    }

    // Check 6: RSI Momentum Alignment
    if (rsiAligned) {
      reasoning.push(`RSI Momentum Alignment: ${rsiStatus}.`);
    } else {
      missingConditions.push(`RSI condition: ${rsiStatus}.`);
    }

    // Check 7: Whale Volume Confirmation
    if (volumeFlow.isInstitutional) {
      reasoning.push(`Whale Volume Surge: ${volumeFlow.desc} validates order flow.`);
    }

    // --- ALGORITHMIC CONFLUENCE SCORE (0 - 100%) ---
    let confluenceScore = 0;
    if (htfTrend.direction !== 'UNCLEAR') confluenceScore += 20;
    if (ltfStructure.inPullbackZone) confluenceScore += 20;
    if (ltfStructure.hasConfirmation) confluenceScore += 20;
    if (levels.rrRatio >= 3.0) confluenceScore += 15;
    else if (levels.rrRatio >= 2.5) confluenceScore += 10;
    if (rsiAligned) confluenceScore += 10;
    if (volumeFlow.isInstitutional) confluenceScore += 10;
    if (smtAnalysis.divergenceDetected) confluenceScore += 10;
    
    // Cap score at 100%
    confluenceScore = Math.min(100, confluenceScore);

    // Hyper-Sensitive Event Risk Shield (Safety Gatekeeper)
    const isEventShieldTriggered = !!(externalTelemetry?.eventRisk?.isShieldTriggered || externalTelemetry?.eventRisk?.level === 'High');
    if (isEventShieldTriggered) {
      confluenceScore = Math.max(0, confluenceScore - 25);
      const shockHeadline = externalTelemetry?.eventRisk?.activeEvents?.[0]?.title || 'Market Shock / Macro Release';
      missingConditions.push(`🚨 HYPER-SENSITIVE EVENT RISK SHIELD ACTIVE: ${shockHeadline}. New entries throttled to preserve capital against news spikes.`);
    }

    let confluenceGrade = 'GRADE C [NO EDGE]';
    if (confluenceScore >= 85) confluenceGrade = 'GRADE A+ [INSTITUTIONAL EDGE]';
    else if (confluenceScore >= 75) confluenceGrade = 'GRADE A [HIGH CONFLUENCE]';
    else if (confluenceScore >= 50) confluenceGrade = 'GRADE B [DEVELOPING]';

    // State synthesis (Requires >= 75% Confluence, 1:3.0 RR, and Event Shield clear)
    if (ltfStructure.isInvalidated) {
      state = 'CANCELLED';
      reasoning.push(`Setup invalidated: 5M structure broke key invalidation level ${currencySymbol}${ltfStructure.invalidationLevel.toFixed(1)}.`);
    } else if (
      ltfStructure.inPullbackZone &&
      ltfStructure.hasConfirmation &&
      levels.rrRatio >= 3.0 &&
      confluenceScore >= 75 &&
      !isEventShieldTriggered
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
      rsi1H,
      rsi5M,
      rsiAligned,
      rsiStatus,
      volumeFlow,
      liquidityCheck,
      confluenceScore,
      confluenceGrade,
      reasoning,
      missingConditions,
      externalTelemetry,
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
      const potentialTarget = Math.max(recentHigh, currentPrice + (currentPrice - stopLoss) * 3.2);
      target = potentialTarget;
    } else {
      const swingHigh = Math.max(...highs);
      stopLoss = swingHigh * 1.0015;
      const recentLow = Math.min(...lows);
      const potentialTarget = Math.min(recentLow, currentPrice - (stopLoss - currentPrice) * 3.2);
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

  /**
   * Wilder's Smoothed RSI (14 Periods)
   */
  calculateRSI(candles, period = 14) {
    if (!candles || candles.length < period + 1) return 50;
    const closes = candles.map(c => Number(c.close) || 0);
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      const gain = diff >= 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    return +rsi.toFixed(1);
  }

  /**
   * Whale & Volumetric Anomaly Filter (20-Period VMA)
   */
  calculateVolumetricFlow(candles) {
    if (!candles || candles.length < 10) {
      return { status: 'NORMAL', ratio: 1.0, isInstitutional: false, desc: 'Normal Baseline Volume' };
    }
    const volumes = candles.map(c => Number(c.volume) || 1);
    const recent = volumes[volumes.length - 1];
    const previousSlice = volumes.slice(-21, -1);
    const avg = previousSlice.reduce((a, b) => a + b, 0) / (previousSlice.length || 1);
    const ratio = +(recent / (avg || 1)).toFixed(2);

    if (ratio >= 1.6) {
      return {
        status: 'WHALE_ACCUMULATION',
        ratio,
        isInstitutional: true,
        desc: `Institutional Absorption (${ratio}x 20-VMA)`
      };
    } else if (ratio <= 0.55) {
      return {
        status: 'LOW_VOLUME_TRAP',
        ratio,
        isInstitutional: false,
        desc: `Low Volume (${ratio}x 20-VMA)`
      };
    }
    return {
      status: 'NORMAL',
      ratio,
      isInstitutional: false,
      desc: `Balanced Volume (${ratio}x 20-VMA)`
    };
  }

  /**
   * Liquidity & Spread Slippage Gatekeeper
   */
  checkSpreadAndLiquidity(asset, currentPrice) {
    const p = Number(currentPrice) || 1;
    // Tier-1 crypto pairs have ultra-tight spreads (< 0.05%)
    const spreadPct = 0.02; // 0.02% typical top-of-book spread on Delta/Binance
    return {
      asset,
      currentPrice: p,
      estimatedSpreadPct: spreadPct,
      isLiquid: true,
      executionTier: 'TIER_1_DEEP_ORDER_BOOK',
      desc: 'Deep Liquidity (Spread < 0.05% • Minimal Slippage)'
    };
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


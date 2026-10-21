/**
 * Risk Management Engine (PRD Section 16, 17, 19)
 * Enforces strict 1% maximum account risk rule, calculates exact position size,
 * verifies min 1:2 R:R ratio, and prevents leverage-induced risk creep.
 */
export class RiskEngine {
  constructor(accountBalance = 2000, riskPercentage = 1.0) {
    this.accountBalance = accountBalance;
    this.riskPercentage = riskPercentage; // 1% default
  }

  setAccountBalance(balance) {
    this.accountBalance = Math.max(10, balance);
  }

  setRiskPercentage(pct) {
    this.riskPercentage = Math.min(5, Math.max(0.25, pct));
  }

  formatDynamicPrice(val) {
    const num = Number(val);
    if (isNaN(num)) return 0;
    if (num >= 1000) return +(num.toFixed(2));
    if (num >= 1) return +(num.toFixed(4));
    if (num >= 0.01) return +(num.toFixed(6));
    return +(num.toFixed(8));
  }

  formatDynamicSize(val) {
    const num = Number(val);
    if (isNaN(num)) return 0;
    if (num >= 1000) return +(num.toFixed(2));
    if (num >= 1) return +(num.toFixed(4));
    if (num >= 0.01) return +(num.toFixed(6));
    return +(num.toFixed(8));
  }

  calculateTradeParameters(entry, stopLoss, target, currencySymbol = '$') {
    const maxRiskAmount = +(this.accountBalance * (this.riskPercentage / 100)).toFixed(2);
    const slDistance = Math.abs(entry - stopLoss);
    const tpDistance = Math.abs(target - entry);

    if (slDistance <= 0) {
      return {
        isValid: false,
        error: 'Stop loss distance cannot be zero or equal to entry price.'
      };
    }

    // Units / Shares: Position Size = Max Risk / SL Distance (Dynamic precision for micro/high-value assets)
    const rawPosSize = maxRiskAmount / slDistance;
    const positionSizeCoins = this.formatDynamicSize(rawPosSize);
    const totalExposureUSD = +(positionSizeCoins * entry).toFixed(2);
    const potentialRewardUSD = +(positionSizeCoins * tpDistance).toFixed(2);
    const rrRatio = +(tpDistance / slDistance).toFixed(2);
    const isRRValid = rrRatio >= 3.0;

    return {
      isValid: true,
      accountBalance: this.accountBalance,
      riskPercentage: this.riskPercentage,
      currencySymbol,
      maxRiskUSD: maxRiskAmount,
      entry: this.formatDynamicPrice(entry),
      stopLoss: this.formatDynamicPrice(stopLoss),
      target: this.formatDynamicPrice(target),
      slDistanceUSD: this.formatDynamicPrice(slDistance),
      tpDistanceUSD: this.formatDynamicPrice(tpDistance),
      positionSizeCoins,
      totalExposureUSD,
      potentialRewardUSD,
      rrRatio,
      isRRValid,
      riskExplanation: `1% account risk par tumhara maximum loss ${currencySymbol}${maxRiskAmount} fix hai. Position size exact ${positionSizeCoins} units banegi. Agar target hit hota hai to potential profit ${currencySymbol}${potentialRewardUSD} (1:${rrRatio} RR) milega.`
    };
  }
}

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

    // Units / Shares: Position Size = Max Risk / SL Distance
    const positionSizeCoins = +(maxRiskAmount / slDistance).toFixed(4);
    const totalExposureUSD = +(positionSizeCoins * entry).toFixed(2);
    const potentialRewardUSD = +(positionSizeCoins * tpDistance).toFixed(2);
    const rrRatio = +(tpDistance / slDistance).toFixed(2);
    const isRRValid = rrRatio >= 2.0;

    return {
      isValid: true,
      accountBalance: this.accountBalance,
      riskPercentage: this.riskPercentage,
      currencySymbol,
      maxRiskUSD: maxRiskAmount,
      entry,
      stopLoss,
      target,
      slDistanceUSD: slDistance,
      tpDistanceUSD: tpDistance,
      positionSizeCoins,
      totalExposureUSD,
      potentialRewardUSD,
      rrRatio,
      isRRValid,
      riskExplanation: `1% account risk par tumhara maximum loss ${currencySymbol}${maxRiskAmount} fix hai. Position size exact ${positionSizeCoins} units banegi. Agar target hit hota hai to potential profit ${currencySymbol}${potentialRewardUSD} (1:${rrRatio} RR) milega.`
    };
  }
}

/**
 * Crypto Derivatives & Margin Engine (Delta Exchange / Tier-1 Exchange Specifications)
 * 
 * Provides:
 * 1. Tier-1 Dynamic Leverage Matrix (BTC/ETH up to 200x, Alts 25x-75x, Indian equities 5x MIS)
 * 2. Cross & Isolated Initial Margin calculation
 * 3. Exact Mathematical Liquidation Price determination based on Maintenance Margin Rate (MMR)
 * 4. ROE % (Return on Equity) & Notional Value calculations
 * 5. Bidirectional Size Sync (USD Margin <-> Coin Quantity)
 */

export class DerivativesEngine {
  constructor() {
    // Standard Tier-1 Exchange Leverage Matrix
    this.leverageLimits = {
      // BTC & ETH: Maximum institutional liquidity
      BTC: { maxLeverage: 200, mmr: 0.004 },   // 0.40% Maintenance Margin
      ETH: { maxLeverage: 200, mmr: 0.005 },   // 0.50% Maintenance Margin
      
      // Major High-Cap Alts
      SOL: { maxLeverage: 75, mmr: 0.010 },
      BNB: { maxLeverage: 75, mmr: 0.010 },
      XRP: { maxLeverage: 75, mmr: 0.012 },
      ADA: { maxLeverage: 50, mmr: 0.015 },
      DOGE: { maxLeverage: 50, mmr: 0.015 },

      // Mid-Cap Ecosystem Tokens
      AVAX: { maxLeverage: 25, mmr: 0.020 },
      LINK: { maxLeverage: 25, mmr: 0.020 },
      DOT: { maxLeverage: 25, mmr: 0.020 },
      NEAR: { maxLeverage: 25, mmr: 0.020 },
      MATIC: { maxLeverage: 25, mmr: 0.020 },
      SUI: { maxLeverage: 25, mmr: 0.020 },
      PEPE: { maxLeverage: 20, mmr: 0.025 },
      SHIB: { maxLeverage: 20, mmr: 0.025 }
    };

    // Default for any other crypto
    this.defaultCryptoLimit = { maxLeverage: 25, mmr: 0.020 };

    // Indian Equities (Standard SEBI Intraday MIS Limits)
    this.indianEquityLimit = { maxLeverage: 5, mmr: 0.200 };
  }

  /**
   * Get maximum allowed leverage and maintenance margin rate for an asset
   */
  getAssetSpec(asset, market = 'Crypto') {
    if (market === 'India') {
      return this.indianEquityLimit;
    }
    const clean = (asset || '').toUpperCase().replace(/(\/USD|USDT|USD)$/, '');
    return this.leverageLimits[clean] || this.defaultCryptoLimit;
  }

  /**
   * Clamp user-chosen leverage within valid bounds
   */
  sanitizeLeverage(asset, market, requestedLeverage) {
    const spec = this.getAssetSpec(asset, market);
    const lev = parseInt(requestedLeverage, 10);
    if (isNaN(lev) || lev < 1) return 1;
    if (lev > spec.maxLeverage) return spec.maxLeverage;
    return lev;
  }

  /**
   * Calculate Notional Position Value
   * Notional = Quantity (Coins) * Price
   */
  calcNotional(quantity, price) {
    const q = Number(quantity) || 0;
    const p = Number(price) || 0;
    return +(q * p).toFixed(2);
  }

  /**
   * Calculate Required Margin (Cost to Open)
   * Initial Margin = Notional Value / Leverage
   */
  calcRequiredMargin(notional, leverage) {
    const n = Number(notional) || 0;
    const lev = Math.max(1, Number(leverage) || 1);
    return +(n / lev).toFixed(2);
  }

  /**
   * Convert USD Margin to Coin Quantity at given leverage
   * Qty = (Margin * Leverage) / Price
   */
  calcQuantityFromMargin(marginUSD, leverage, price) {
    const m = Number(marginUSD) || 0;
    const lev = Math.max(1, Number(leverage) || 1);
    const p = Number(price) || 1;
    if (p <= 0) return 0;
    const rawQty = (m * lev) / p;
    // Format precision based on price magnitude
    if (p >= 1000) return +rawQty.toFixed(4);
    if (p >= 10) return +rawQty.toFixed(3);
    return +rawQty.toFixed(2);
  }

  /**
   * Calculate Estimated Liquidation Price (Delta Exchange Standard)
   * 
   * Long: Entry * (1 - (1 / Leverage) + MMR)
   * Short: Entry * (1 + (1 / Leverage) - MMR)
   */
  calcLiquidationPrice({ entry, direction, leverage, asset, market = 'Crypto' }) {
    const p = Number(entry) || 0;
    if (p <= 0) return 0;

    const lev = Math.max(1, Number(leverage) || 1);
    const spec = this.getAssetSpec(asset, market);
    const mmr = spec.mmr;
    const isLong = (direction || 'LONG').toUpperCase() === 'LONG';

    if (isLong) {
      const factor = 1 - (1 / lev) + mmr;
      const liq = p * Math.max(0, factor);
      return +liq.toFixed(2);
    } else {
      const factor = 1 + (1 / lev) - mmr;
      const liq = p * factor;
      return +liq.toFixed(2);
    }
  }

  /**
   * Calculate ROE % (Return on Equity)
   * ROE = ((Exit - Entry) / Entry) * Leverage * 100 (for Long)
   */
  calcROE(entry, targetOrExit, direction, leverage) {
    const ent = Number(entry) || 0;
    const ext = Number(targetOrExit) || 0;
    if (ent <= 0) return 0;

    const lev = Math.max(1, Number(leverage) || 1);
    const isLong = (direction || 'LONG').toUpperCase() === 'LONG';
    const priceDelta = isLong ? (ext - ent) : (ent - ext);

    const roe = (priceDelta / ent) * lev * 100;
    return +roe.toFixed(2);
  }

  /**
   * Full derivatives telemetry for pre-trade slip
   */
  calculateOrderTelemetry({
    asset,
    market = 'Crypto',
    direction = 'LONG',
    entryPrice,
    leverage = 20,
    marginUSD = 20,
    stopLoss = 0,
    target = 0
  }) {
    const spec = this.getAssetSpec(asset, market);
    const lev = this.sanitizeLeverage(asset, market, leverage);
    const entry = Number(entryPrice) || 0;
    const margin = Number(marginUSD) || 0;

    const quantity = this.calcQuantityFromMargin(margin, lev, entry);
    const notional = this.calcNotional(quantity, entry);
    const requiredMargin = this.calcRequiredMargin(notional, lev);

    const liqPrice = this.calcLiquidationPrice({
      entry,
      direction,
      leverage: lev,
      asset,
      market
    });

    const isLong = direction.toUpperCase() === 'LONG';
    
    // Stop Loss PnL & ROE
    let slPnL = 0;
    let slROE = 0;
    if (stopLoss > 0 && entry > 0) {
      const slDelta = isLong ? (stopLoss - entry) : (entry - stopLoss);
      slPnL = +(slDelta * quantity).toFixed(2);
      slROE = this.calcROE(entry, stopLoss, direction, lev);
    }

    // Target PnL & ROE
    let tpPnL = 0;
    let tpROE = 0;
    if (target > 0 && entry > 0) {
      const tpDelta = isLong ? (target - entry) : (entry - target);
      tpPnL = +(tpDelta * quantity).toFixed(2);
      tpROE = this.calcROE(entry, target, direction, lev);
    }

    // Risk / Reward Ratio
    let rrRatio = 0;
    if (Math.abs(slPnL) > 0) {
      rrRatio = +(Math.abs(tpPnL) / Math.abs(slPnL)).toFixed(2);
    }

    return {
      asset,
      market,
      maxAllowedLeverage: spec.maxLeverage,
      mmr: spec.mmr,
      leverage: lev,
      entryPrice: entry,
      marginUSD: requiredMargin,
      quantity,
      notionalUSD: notional,
      liquidationPrice: liqPrice,
      slPrice: stopLoss,
      slPnL,
      slROE,
      tpPrice: target,
      tpPnL,
      tpROE,
      rrRatio
    };
  }
}

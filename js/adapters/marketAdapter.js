/**
 * Base Market Adapter Interface
 * Normalizes price, OHLC candles, and market events across Crypto, Indian, and US markets.
 */
export class MarketAdapter {
  constructor(marketName) {
    this.marketName = marketName;
    this.subscribers = new Map();
  }

  // Subscribe to updates for an asset
  subscribe(asset, callback) {
    if (!this.subscribers.has(asset)) {
      this.subscribers.set(asset, new Set());
    }
    this.subscribers.get(asset).add(callback);
  }

  unsubscribe(asset, callback) {
    if (this.subscribers.has(asset)) {
      this.subscribers.get(asset).delete(callback);
    }
  }

  emit(asset, data) {
    if (this.subscribers.has(asset)) {
      this.subscribers.get(asset).forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error notifying subscriber for ${asset}:`, err);
        }
      });
    }
  }

  async getHistoricalCandles(asset, timeframe, limit = 50) {
    throw new Error('getHistoricalCandles() must be implemented by adapter.');
  }

  async getCurrentPrice(asset) {
    throw new Error('getCurrentPrice() must be implemented by adapter.');
  }

  disconnect() {
    this.subscribers.clear();
  }
}

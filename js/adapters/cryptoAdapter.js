import { MarketAdapter } from './marketAdapter.js';

/**
 * Crypto Adapter for Binance Public Feeds (BTC, ETH, SOL)
 * Includes live REST klines, live WebSocket ticker updates, and fallback simulated streaming.
 */
export class CryptoAdapter extends MarketAdapter {
  constructor() {
    super('Crypto');
    this.symbolMap = {
      'BTC': 'BTCUSDT',
      'ETH': 'ETHUSDT',
      'SOL': 'SOLUSDT'
    };

    this.cache = {
      'BTC': { price: 65420.5, '1H': [], '5M': [], lastUpdate: Date.now() },
      'ETH': { price: 3480.2, '1H': [], '5M': [], lastUpdate: Date.now() },
      'SOL': { price: 154.8, '1H': [], '5M': [], lastUpdate: Date.now() }
    };

    this.allMarkets = [];
    this.ws = null;
    this.isWsConnected = false;
    this.simulationTimer = null;
    this.pollingTimer = null;
  }

  async init() {
    console.log('[CryptoAdapter] Initializing feeds...');
    // 1. Fetch full list of all available USDT crypto pairs from Binance
    await this.fetchAllMarkets();

    // 2. Initial candle fetch for default assets (BTC, ETH, SOL)
    for (const asset of ['BTC', 'ETH', 'SOL']) {
      await this.ensureAssetInitialized(asset);
    }

    this.startWebSocket();
    this.startPolling();
    this.startHeartbeatSimulation();
  }

  async fetchAllMarkets() {
    try {
      const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      this.allMarkets = data
        .filter(item => item.symbol.endsWith('USDT') && !item.symbol.includes('UPUSDT') && !item.symbol.includes('DOWNUSDT'))
        .map(item => {
          const base = item.symbol.replace('USDT', '');
          return {
            baseAsset: base,
            symbol: `${base}/USD`,
            rawSymbol: item.symbol,
            price: parseFloat(item.lastPrice),
            changePercent: parseFloat(item.priceChangePercent),
            high24h: parseFloat(item.highPrice),
            low24h: parseFloat(item.lowPrice),
            volume: parseFloat(item.quoteVolume)
          };
        })
        .sort((a, b) => b.volume - a.volume); // Rank by 24h volume so top coins appear first

      console.log(`[CryptoAdapter] Loaded ${this.allMarkets.length} crypto USD markets.`);
    } catch (err) {
      console.warn('[CryptoAdapter] Failed to fetch all tickers, using top default cryptos:', err.message);
      this.allMarkets = [
        { baseAsset: 'BTC', symbol: 'BTC/USD', rawSymbol: 'BTCUSDT', price: 65420.5, changePercent: 2.15, volume: 5000000000 },
        { baseAsset: 'ETH', symbol: 'ETH/USD', rawSymbol: 'ETHUSDT', price: 3480.2, changePercent: 1.84, volume: 2500000000 },
        { baseAsset: 'SOL', symbol: 'SOL/USD', rawSymbol: 'SOLUSDT', price: 154.8, changePercent: 4.12, volume: 1800000000 },
        { baseAsset: 'BNB', symbol: 'BNB/USD', rawSymbol: 'BNBUSDT', price: 590.3, changePercent: 0.95, volume: 900000000 },
        { baseAsset: 'XRP', symbol: 'XRP/USD', rawSymbol: 'XRPUSDT', price: 0.58, changePercent: -0.45, volume: 750000000 },
        { baseAsset: 'DOGE', symbol: 'DOGE/USD', rawSymbol: 'DOGEUSDT', price: 0.12, changePercent: 3.25, volume: 600000000 },
        { baseAsset: 'ADA', symbol: 'ADA/USD', rawSymbol: 'ADAUSDT', price: 0.36, changePercent: 1.15, volume: 450000000 },
        { baseAsset: 'AVAX', symbol: 'AVAX/USD', rawSymbol: 'AVAXUSDT', price: 28.4, changePercent: 2.40, volume: 380000000 },
        { baseAsset: 'NEAR', symbol: 'NEAR/USD', rawSymbol: 'NEARUSDT', price: 5.25, changePercent: 5.10, volume: 320000000 },
        { baseAsset: 'SUI', symbol: 'SUI/USD', rawSymbol: 'SUIUSDT', price: 1.95, changePercent: 6.80, volume: 300000000 },
        { baseAsset: 'LINK', symbol: 'LINK/USD', rawSymbol: 'LINKUSDT', price: 12.1, changePercent: 1.30, volume: 280000000 },
        { baseAsset: 'PEPE', symbol: 'PEPE/USD', rawSymbol: 'PEPEUSDT', price: 0.0000105, changePercent: 8.50, volume: 260000000 }
      ];
    }
  }

  searchAssets(query) {
    if (!query || !query.trim()) {
      return this.allMarkets.slice(0, 15);
    }
    const q = query.trim().toUpperCase();
    return this.allMarkets
      .filter(m => m.baseAsset.includes(q) || m.symbol.includes(q))
      .slice(0, 20);
  }

  async ensureAssetInitialized(asset) {
    const symbol = `${asset}USDT`;
    this.symbolMap[asset] = symbol;

    if (!this.cache[asset]) {
      const marketMeta = this.allMarkets.find(m => m.baseAsset === asset);
      this.cache[asset] = {
        price: marketMeta ? marketMeta.price : 100,
        high24h: marketMeta ? marketMeta.high24h : 105,
        low24h: marketMeta ? marketMeta.low24h : 95,
        changePercent: marketMeta ? marketMeta.changePercent : 0,
        volume: marketMeta ? marketMeta.volume : 100000,
        '1H': [],
        '5M': [],
        lastUpdate: Date.now()
      };
    }

    if (!this.cache[asset]['1H'] || this.cache[asset]['1H'].length === 0) {
      await this.refreshCandles(asset, '1H');
    }
    if (!this.cache[asset]['5M'] || this.cache[asset]['5M'].length === 0) {
      await this.refreshCandles(asset, '5M');
    }

    return this.cache[asset];
  }

  async refreshCandles(asset, timeframe) {
    const symbol = this.symbolMap[asset];
    const interval = timeframe.toLowerCase(); // '1h' or '5m'
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=60`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      const candles = data.map(c => ({
        time: Math.floor(c[0] / 1000),
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4]),
        volume: parseFloat(c[5])
      }));

      this.cache[asset][timeframe] = candles;
      if (candles.length > 0) {
        this.cache[asset].price = candles[candles.length - 1].close;
      }
      return candles;
    } catch (err) {
      console.warn(`[CryptoAdapter] Live fetch failed for ${asset} ${timeframe}, generating synthetic candles:`, err.message);
      const fallbackCandles = this.generateSyntheticCandles(asset, timeframe);
      this.cache[asset][timeframe] = fallbackCandles;
      return fallbackCandles;
    }
  }

  generateSyntheticCandles(asset, timeframe) {
    const candles = [];
    let basePrice = asset === 'BTC' ? 64800 : asset === 'ETH' ? 3420 : 152;
    const count = 60;
    const intervalSec = timeframe === '1H' ? 3600 : 300;
    const now = Math.floor(Date.now() / 1000);

    for (let i = count; i >= 0; i--) {
      const time = now - (i * intervalSec);
      const volatility = basePrice * (timeframe === '1H' ? 0.008 : 0.003);
      const delta = (Math.random() - 0.48) * volatility;
      const open = basePrice;
      const close = basePrice + delta;
      const high = Math.max(open, close) + Math.random() * (volatility * 0.6);
      const low = Math.min(open, close) - Math.random() * (volatility * 0.6);
      const volume = (Math.random() * 50 + 20) * (asset === 'BTC' ? 10 : asset === 'ETH' ? 50 : 200);

      candles.push({ time, open, high, low, close, volume });
      basePrice = close;
    }
    this.cache[asset].price = basePrice;
    return candles;
  }

  startWebSocket() {
    try {
      // Connect to Binance multi-ticker array stream covering all 700+ USDT pairs simultaneously
      this.ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');

      this.ws.onopen = () => {
        console.log('[CryptoAdapter] WebSocket connected to Binance (!miniTicker@arr)');
        this.isWsConnected = true;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data)) {
            data.forEach(item => {
              if (item.s && item.s.endsWith('USDT')) {
                const asset = item.s.replace('USDT', '');
                const price = parseFloat(item.c);
                const open = parseFloat(item.o);
                const high24h = parseFloat(item.h);
                const low24h = parseFloat(item.l);
                const changePercent = open > 0 ? ((price - open) / open) * 100 : 0;
                const volume = parseFloat(item.v);

                if (!this.cache[asset]) {
                  this.cache[asset] = {
                    price,
                    high24h,
                    low24h,
                    changePercent,
                    volume,
                    '1H': [],
                    '5M': [],
                    lastUpdate: Date.now()
                  };
                } else {
                  this.cache[asset].price = price;
                  this.cache[asset].high24h = high24h;
                  this.cache[asset].low24h = low24h;
                  this.cache[asset].changePercent = changePercent;
                  this.cache[asset].volume = volume;
                  this.cache[asset].lastUpdate = Date.now();
                  this.updateLatestCandle(asset, price);
                }

                // If any listener is subscribed to this asset, emit live tick immediately!
                if (this.subscribers.has(asset)) {
                  this.emit(asset, {
                    asset,
                    price,
                    high24h,
                    low24h,
                    changePercent,
                    volume,
                    source: 'Binance-Live',
                    timestamp: Date.now()
                  });
                }
              }
            });
          }
        } catch (e) {
          // ignore parse errors
        }
      };

      this.ws.onerror = (e) => {
        console.warn('[CryptoAdapter] WebSocket error, fallback to polling and simulation');
        this.isWsConnected = false;
      };

      this.ws.onclose = () => {
        this.isWsConnected = false;
        setTimeout(() => this.startWebSocket(), 10000);
      };
    } catch (e) {
      console.warn('[CryptoAdapter] WebSocket initialization exception:', e);
    }
  }

  startPolling() {
    // Poll REST candles every 30 seconds for accuracy
    this.pollingTimer = setInterval(async () => {
      for (const asset of ['BTC', 'ETH', 'SOL']) {
        await this.refreshCandles(asset, '5M');
      }
    }, 30000);
  }

  startHeartbeatSimulation() {
    // Micro tick simulation to keep UI alive even if offline or behind firewalls
    this.simulationTimer = setInterval(() => {
      if (!this.isWsConnected) {
        const assets = Array.from(new Set(['BTC', 'ETH', 'SOL', ...Array.from(this.subscribers.keys())]));
        for (const asset of assets) {
          if (!this.cache[asset]) continue;
          const current = this.cache[asset].price || (asset === 'BTC' ? 65000 : asset === 'SOL' ? 150 : 1);
          const jitter = (Math.random() - 0.495) * (current * 0.0004);
          const newPrice = +(current + jitter);
          this.cache[asset].price = newPrice;
          this.updateLatestCandle(asset, newPrice);

          this.emit(asset, {
            asset,
            price: newPrice,
            changePercent: this.cache[asset].changePercent || 0,
            volume: this.cache[asset].volume || 14500,
            source: 'Simulated-Feed',
            timestamp: Date.now()
          });
        }
      }
    }, 1200);
  }

  updateLatestCandle(asset, price) {
    for (const tf of ['1H', '5M']) {
      const candles = this.cache[asset][tf];
      if (candles && candles.length > 0) {
        const lastCandle = candles[candles.length - 1];
        lastCandle.close = price;
        if (price > lastCandle.high) lastCandle.high = price;
        if (price < lastCandle.low) lastCandle.low = price;
      }
    }
  }

  async getHistoricalCandles(asset, timeframe) {
    if (!this.cache[asset][timeframe] || this.cache[asset][timeframe].length === 0) {
      await this.refreshCandles(asset, timeframe);
    }
    return this.cache[asset][timeframe] || [];
  }

  getCurrentPrice(asset) {
    if (this.cache[asset]?.price) return this.cache[asset].price;
    const meta = this.allMarkets.find(m => m.baseAsset === asset);
    return meta?.price || 0;
  }

  getSnapshot(asset) {
    const cached = this.cache[asset] || {};
    const meta = this.allMarkets.find(m => m.baseAsset === asset) || {};
    const price = cached.price || meta.price || 0;
    const changePercent = cached.changePercent !== undefined ? cached.changePercent : (meta.changePercent || 0);
    const high24h = cached.high24h || meta.high24h || price;
    const low24h = cached.low24h || meta.low24h || price;

    return {
      asset,
      price,
      changePercent,
      high24h,
      low24h,
      candles1H: cached['1H'] || [],
      candles5M: cached['5M'] || [],
      source: this.isWsConnected ? 'Binance-WS' : 'Binance-Live',
      timestamp: Date.now()
    };
  }

  disconnect() {
    super.disconnect();
    if (this.ws) this.ws.close();
    clearInterval(this.simulationTimer);
    clearInterval(this.pollingTimer);
  }
}

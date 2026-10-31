/**
 * PROJECT MONDAY — LIVE MARKETS CONTROLLER (MARKETING / LANDING PAGE)
 * Ultra-low latency public feeds from Coinbase (WSS + REST) for zero-login live telemetry.
 * Powers dynamic ticker marquee, live confluence sandbox rates, and 1:3.0 asymmetric targets.
 * Tab-inactivity auto-pause ensures zero GPU/CPU lag.
 */

export class LiveMarketsFeed {
  constructor(options = {}) {
    this.sandboxController = options.sandboxController || null;
    this.copilotController = options.copilotController || null;

    this.symbols = ['BTC', 'ETH', 'SOL'];
    this.productMap = {
      'BTC': 'BTC-USD',
      'ETH': 'ETH-USD',
      'SOL': 'SOL-USD'
    };

    // Live market cache with reliable anchor defaults
    this.prices = {
      BTC: { price: 77140.0, changePct: 0.85, high: 77950, low: 76100 },
      ETH: { price: 2240.0, changePct: 1.20, high: 2310, low: 2200 },
      SOL: { price: 95.5, changePct: 3.40, high: 98.0, low: 92.5 },
      NIFTY: { price: 25120.4, changePct: 0.72 },
      HYUNDAI: { price: 1865.4, changePct: 2.45 },
      SWIGGY: { price: 422.8, changePct: 4.60 },
      WAAREE: { price: 2840.0, changePct: 5.80 },
      HAL: { price: 4480.0, changePct: 3.10 }
    };

    this.ws = null;
    this.pollTimer = null;
    this.isTabHidden = false;

    this.init();
  }

  init() {
    this.bindVisibility();
    this.fetchRestPrices();
    this.connectWebSocket();
    this.startMicroTickSimulation();
  }

  bindVisibility() {
    document.addEventListener('visibilitychange', () => {
      this.isTabHidden = document.hidden;
      if (!this.isTabHidden) {
        // Tab became visible again — fetch immediate fresh rates
        this.fetchRestPrices();
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          this.connectWebSocket();
        }
      }
    });
  }

  async fetchRestPrices() {
    try {
      await Promise.all(this.symbols.map(async (sym) => {
        const prod = this.productMap[sym];
        try {
          const [tickerRes, statsRes] = await Promise.all([
            fetch(`https://api.exchange.coinbase.com/products/${prod}/ticker`),
            fetch(`https://api.exchange.coinbase.com/products/${prod}/stats`)
          ]);

          if (tickerRes.ok) {
            const tData = await tickerRes.json();
            const price = parseFloat(tData.price);
            if (!isNaN(price) && price > 0) {
              let changePct = this.prices[sym].changePct;
              if (statsRes.ok) {
                const sData = await statsRes.json();
                const open = parseFloat(sData.open);
                if (!isNaN(open) && open > 0) {
                  changePct = ((price - open) / open) * 100;
                }
              }
              this.updatePrice(sym, price, changePct);
            }
          }
        } catch (err) {
          // Non-blocking single asset fallback
        }
      }));
    } catch (e) {
      console.warn('[LiveMarkets] REST fetch non-blocking notice:', e);
    }
  }

  connectWebSocket() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }

    try {
      this.ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');

      this.ws.onopen = () => {
        const subscribeMsg = {
          type: 'subscribe',
          product_ids: ['BTC-USD', 'ETH-USD', 'SOL-USD'],
          channels: ['ticker']
        };
        this.ws.send(JSON.stringify(subscribeMsg));
      };

      this.ws.onmessage = (event) => {
        if (this.isTabHidden) return; // Zero-lag tab guard
        try {
          const data = JSON.parse(event.data);
          if (data && data.type === 'ticker' && data.price) {
            const price = parseFloat(data.price);
            let sym = null;
            if (data.product_id === 'BTC-USD') sym = 'BTC';
            else if (data.product_id === 'ETH-USD') sym = 'ETH';
            else if (data.product_id === 'SOL-USD') sym = 'SOL';

            if (sym && !isNaN(price)) {
              let changePct = this.prices[sym].changePct;
              if (data.open_24h) {
                const open = parseFloat(data.open_24h);
                if (open > 0) {
                  changePct = ((price - open) / open) * 100;
                }
              }
              this.updatePrice(sym, price, changePct);
            }
          }
        } catch (e) {}
      };

      this.ws.onerror = () => {
        // Fallback to REST polling if WSS is blocked on client's network
        this.scheduleRestPolling();
      };

      this.ws.onclose = () => {
        if (!this.isTabHidden) {
          setTimeout(() => this.connectWebSocket(), 10000);
        }
      };
    } catch (e) {
      this.scheduleRestPolling();
    }
  }

  scheduleRestPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => {
      if (!this.isTabHidden) {
        this.fetchRestPrices();
      }
    }, 6000);
  }

  updatePrice(sym, price, changePct) {
    if (!this.prices[sym]) return;

    this.prices[sym].price = price;
    if (changePct !== undefined && !isNaN(changePct)) {
      this.prices[sym].changePct = changePct;
    }

    // 1. Update Marquee Ticker in DOM
    this.updateMarqueeDOM(sym);

    // 2. If BTC, update Hero Orbit Chip (+3.00R Asymmetric Target)
    if (sym === 'BTC') {
      this.updateHeroOrbitTarget(price);
    }

    // 3. Sync with Sandbox Controller
    if (this.sandboxController && typeof this.sandboxController.updateLiveAssetPrice === 'function') {
      this.sandboxController.updateLiveAssetPrice(sym, price);
    }

    // 4. Sync with Copilot Dialogue Controller
    if (sym === 'BTC' && this.copilotController && typeof this.copilotController.updateLiveBtc === 'function') {
      this.copilotController.updateLiveBtc(price);
    }
  }

  updateMarqueeDOM(sym) {
    const data = this.prices[sym];
    if (!data) return;

    const formattedPrice = sym === 'SOL' 
      ? `$${data.price.toFixed(2)}` 
      : sym === 'ETH' 
        ? `$${data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `$${data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const isPositive = data.changePct >= 0;
    const sign = isPositive ? '+' : '';
    const formattedChange = `(${sign}${data.changePct.toFixed(2)}%)`;
    const trendClass = isPositive ? 'text-profit' : 'text-loss';
    const iconClass = isPositive ? 'ph-bold ph-trend-up text-profit' : 'ph-bold ph-trend-down text-loss';

    const items = document.querySelectorAll(`[data-ticker-asset="${sym}"]`);
    items.forEach(el => {
      el.innerHTML = `<i class="${iconClass}"></i> ${sym} ${formattedPrice} <span class="${trendClass}">${formattedChange}</span>`;
      // Flash micro glow
      el.classList.add(isPositive ? 'ticker-pulse-up' : 'ticker-pulse-down');
      setTimeout(() => el.classList.remove('ticker-pulse-up', 'ticker-pulse-down'), 400);
    });
  }

  updateHeroOrbitTarget(btcPrice) {
    const targetEl = document.getElementById('hero_orbit_target');
    if (!targetEl) return;

    // Strict 1:3.0 institutional calculation
    const riskDist = Math.round(btcPrice * 0.0065); // ~0.65% stop
    const targetPrice = Math.round(btcPrice + (riskDist * 3.0));

    targetEl.textContent = `+3.00R ($${targetPrice.toLocaleString()})`;
  }

  startMicroTickSimulation() {
    // Subtle realistic micro-ticks for Indian assets (NIFTY, HAL, SWIGGY, etc.)
    setInterval(() => {
      if (this.isTabHidden) return;
      const indianAssets = ['NIFTY', 'HYUNDAI', 'SWIGGY', 'WAAREE', 'HAL'];
      const chosen = indianAssets[Math.floor(Math.random() * indianAssets.length)];
      const item = this.prices[chosen];
      if (!item) return;

      const delta = (Math.random() - 0.49) * (item.price * 0.0004);
      item.price = Number((item.price + delta).toFixed(2));

      const items = document.querySelectorAll(`[data-ticker-asset="${chosen}"]`);
      const isPositive = item.changePct >= 0;
      const sign = isPositive ? '+' : '';
      const prefix = chosen === 'NIFTY' ? '' : '₹';
      items.forEach(el => {
        el.innerHTML = `<i class="ph-bold ph-trend-up text-profit"></i> ${chosen} ${prefix}${item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })} <span class="text-profit">(${sign}${item.changePct.toFixed(2)}%)</span>`;
      });
    }, 4500);
  }
}

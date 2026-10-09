/**
 * Chart Manager (PRD Section 25 & 32)
 * Integrates TradingView real-time Advanced Chart Widget and overlay levels (Entry, SL, TP).
 */
export class ChartManager {
  constructor(containerId) {
    this.containerId = containerId;
    this.currentAsset = 'BTC';
    this.currentMarket = 'Crypto';
    this.currentTimeframe = '60'; // 60 = 1H, 5 = 5M
    this.currentTheme = localStorage.getItem('monday_theme') || 'dark';
    this.activeLevels = null;
  }

  init(asset = 'BTC', timeframe = '60', market = 'Crypto', theme = null) {
    this.currentAsset = asset;
    this.currentMarket = market;
    this.currentTimeframe = timeframe;
    if (theme) this.currentTheme = theme;
    this.renderTradingViewWidget();
  }

  setTheme(theme) {
    if (this.currentTheme === theme) return;
    this.currentTheme = theme;
    this.renderTradingViewWidget();
  }

  setAsset(asset, market = null) {
    if (market) this.currentMarket = market;
    this.currentAsset = asset;
    this.renderTradingViewWidget();
  }

  setMarket(market, defaultAsset = null) {
    this.currentMarket = market;
    if (defaultAsset) this.currentAsset = defaultAsset;
    this.renderTradingViewWidget();
  }

  setTimeframe(tf) {
    const tfMap = {
      '1m': '1',
      '1M': '1',
      '3m': '3',
      '3M': '3',
      '5m': '5',
      '5M': '5',
      '15m': '15',
      '15M': '15',
      '30m': '30',
      '30M': '30',
      '45m': '45',
      '45M': '45',
      '1h': '60',
      '1H': '60',
      '2h': '120',
      '2H': '120',
      '3h': '180',
      '3H': '180',
      '4h': '240',
      '4H': '240',
      '1d': 'D',
      '1D': 'D',
      '1w': 'W',
      '1W': 'W'
    };
    const tvTf = tfMap[tf] || tf;
    if (this.currentTimeframe === tvTf) return;
    this.currentTimeframe = tvTf;
    this.renderTradingViewWidget();
  }

  renderTradingViewWidget() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    let symbol = `BINANCE:${this.currentAsset}USDT`;
    let timezone = "Etc/UTC";

    if (this.currentMarket === 'India') {
      timezone = "Asia/Kolkata";
      const assetUpper = this.currentAsset.toUpperCase();
      if (assetUpper === 'NIFTY' || assetUpper === 'NIFTY50') {
        symbol = 'NSE:NIFTY1!'; // TradingView live Nifty Futures — unrestricted embed!
      } else if (assetUpper === 'BANKNIFTY' || assetUpper === 'NIFTYBANK') {
        symbol = 'NSE:BANKNIFTY1!'; // TradingView live Bank Nifty Futures — unrestricted embed!
      } else if (assetUpper === 'FINNIFTY') {
        symbol = 'NSE:FINNIFTY1!';
      } else if (assetUpper === 'MIDCPNIFTY') {
        symbol = 'NSE:MIDCPNIFTY1!';
      } else if (assetUpper === 'SENSEX') {
        symbol = 'BSE:SENSEX';
      } else {
        symbol = `NSE:${assetUpper}`;
      }
    }
    container.innerHTML = `
      <div class="tradingview-widget-container" style="width: 100%; height: 100%; position: absolute; inset: 0;">
        <div class="tradingview-widget-container__widget" style="width: 100%; height: 100%;"></div>
      </div>
      <div id="chart_levels_overlay" class="chart-levels-overlay"></div>
    `;

    const widgetWrapper = container.querySelector('.tradingview-widget-container');
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: this.currentTimeframe,
      timezone: timezone,
      theme: this.currentTheme || "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: false,
      calendar: false,
      hide_top_toolbar: false,
      hide_side_toolbar: false,
      support_host: "https://www.tradingview.com"
    });

    widgetWrapper.appendChild(script);

    // Refresh overlay levels if any
    if (this.activeLevels) {
      this.updateLevelsOverlay(this.activeLevels);
    }
  }

  updateLevelsOverlay(levels) {
    this.activeLevels = levels;
    const overlay = document.getElementById('chart_levels_overlay');
    if (!overlay) return;

    if (!levels || !levels.entry) {
      overlay.innerHTML = '';
      return;
    }

    const { entry, stopLoss, target, rrRatio, currencySymbol } = levels;
    const curr = currencySymbol || (this.currentMarket === 'India' ? '₹' : '$');
    const isIndia = this.currentMarket === 'India' || curr === '₹';

    const formatVal = (val) => {
      if (typeof val !== 'number') return `${curr}0.00`;
      if (isIndia) {
        return `${curr}${val.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`;
      }
      return val >= 1
        ? `${curr}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `${curr}${val.toFixed(4)}`;
    };

    overlay.innerHTML = `
      <div class="level-badge tp-badge">
        <span class="level-label">🎯 TARGET</span>
        <span class="level-val">${formatVal(target)}</span>
        <span class="level-rr">RR 1:${rrRatio}</span>
      </div>
      <div class="level-badge entry-badge">
        <span class="level-label">📍 ENTRY</span>
        <span class="level-val">${formatVal(entry)}</span>
      </div>
      <div class="level-badge sl-badge">
        <span class="level-label">🛑 STOP LOSS</span>
        <span class="level-val">${formatVal(stopLoss)}</span>
      </div>
    `;
  }
}

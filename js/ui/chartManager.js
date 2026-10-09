/**
 * Chart Manager (PRD Section 25 & 32)
 * Integrates TradingView real-time Advanced Chart Widget and overlay levels (Entry, SL, TP).
 */
export class ChartManager {
  constructor(containerId) {
    this.containerId = containerId;
    this.currentAsset = 'BTC';
    this.currentTimeframe = '60'; // 60 = 1H, 5 = 5M
    this.activeLevels = null;
    this.symbolMap = {
      'BTC': 'BINANCE:BTCUSDT',
      'SOL': 'BINANCE:SOLUSDT',
      'ETH': 'BINANCE:ETHUSDT'
    };
  }

  init(asset = 'BTC', timeframe = '60') {
    this.currentAsset = asset;
    this.currentTimeframe = timeframe;
    this.renderTradingViewWidget();
  }

  setAsset(asset) {
    if (this.currentAsset === asset) return;
    this.currentAsset = asset;
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

    const symbol = `BINANCE:${this.currentAsset}USDT`;
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
      timezone: "Etc/UTC",
      theme: "dark",
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

    const { entry, stopLoss, target, rrRatio } = levels;
    overlay.innerHTML = `
      <div class="level-badge tp-badge">
        <span class="level-label">🎯 TARGET</span>
        <span class="level-val">$${target.toFixed(1)}</span>
        <span class="level-rr">RR 1:${rrRatio}</span>
      </div>
      <div class="level-badge entry-badge">
        <span class="level-label">📍 ENTRY</span>
        <span class="level-val">$${entry.toFixed(1)}</span>
      </div>
      <div class="level-badge sl-badge">
        <span class="level-label">🛑 STOP LOSS</span>
        <span class="level-val">$${stopLoss.toFixed(1)}</span>
      </div>
    `;
  }
}

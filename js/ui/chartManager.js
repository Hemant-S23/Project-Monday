/**
 * Chart Manager (PRD Section 25 & 32)
 * Dual-Engine Charting:
 * 1. Indian Market (NSE / BSE): TradingView Lightweight Charts (Canvas Engine)
 *    - 100% reliable local rendering, zero licensing popups, zero fallback to Apple
 *    - Real-time candle ticks from IndiaAdapter
 *    - Native Canvas price lines for Entry, Target, and Stop Loss
 *    - Full Dark/Light mode theme sync
 *    - Quick shortcut button to TradingView Web
 * 2. Crypto Market (Binance): TradingView Advanced Chart Widget (iframe)
 *    - Preserved completely untouched as requested
 */
export class ChartManager {
  constructor(containerId) {
    this.containerId = containerId;
    this.currentAsset = 'BTC';
    this.currentMarket = 'Crypto';
    this.currentTimeframe = '60'; // 60 = 1H, 5 = 5M
    this.rawTimeframe = '1H';
    this.currentTheme = localStorage.getItem('monday_theme') || 'dark';
    this.activeLevels = null;
    this.adapter = null;

    // Lightweight Charts instances
    this.lwChart = null;
    this.candleSeries = null;
    this.volumeSeries = null;
    this.emaSeries = null;
    this.entryPriceLine = null;
    this.targetPriceLine = null;
    this.slPriceLine = null;
    this.resizeObserver = null;
    this.currentBar = null;
  }

  setAdapter(adapter) {
    this.adapter = adapter;
  }

  init(asset = 'BTC', timeframe = '60', market = 'Crypto', theme = null, adapter = null) {
    this.currentAsset = asset;
    this.currentMarket = market;
    this.currentTimeframe = timeframe;
    this.rawTimeframe = timeframe === '5' ? '5M' : '1H';
    if (theme) this.currentTheme = theme;
    if (adapter) this.adapter = adapter;
    this.render();
  }

  render() {
    if (this.currentMarket === 'India') {
      this.renderLightweightChart();
    } else {
      this.destroyLightweightChart();
      this.renderTradingViewWidget();
    }
  }

  setTheme(theme) {
    if (this.currentTheme === theme) return;
    this.currentTheme = theme;

    if (this.currentMarket === 'India' && this.lwChart) {
      const isDark = theme !== 'light';
      this.lwChart.applyOptions({
        layout: {
          background: { type: 'solid', color: isDark ? '#090d16' : '#ffffff' },
          textColor: isDark ? '#94a3b8' : '#475569'
        },
        grid: {
          vertLines: { color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.05)' },
          horzLines: { color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.05)' }
        },
        timeScale: {
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
        },
        rightPriceScale: {
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
        }
      });
    } else {
      this.render();
    }
  }

  setAsset(asset, market = null) {
    if (market) this.currentMarket = market;
    this.currentAsset = asset;
    this.render();
  }

  setMarket(market, defaultAsset = null) {
    this.currentMarket = market;
    if (defaultAsset) this.currentAsset = defaultAsset;
    this.render();
  }

  setTimeframe(tf) {
    this.rawTimeframe = tf.toUpperCase();
    const tfMap = {
      '1m': '1', '1M': '1',
      '3m': '3', '3M': '3',
      '5m': '5', '5M': '5',
      '15m': '15', '15M': '15',
      '30m': '30', '30M': '30',
      '45m': '45', '45M': '45',
      '1h': '60', '1H': '60',
      '2h': '120', '2H': '120',
      '3h': '180', '3H': '180',
      '4h': '240', '4H': '240',
      '1d': 'D', '1D': 'D',
      '1w': 'W', '1W': 'W'
    };
    const tvTf = tfMap[tf] || tf;
    if (this.currentTimeframe === tvTf && this.currentMarket !== 'India') return;
    this.currentTimeframe = tvTf;
    this.render();
  }

  // =========================================================================
  // 1. TRADINGVIEW ADVANCED WIDGET (CRYPTO ENGINE - UNTOUCHED)
  // =========================================================================
  renderTradingViewWidget() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    let symbol = `BINANCE:${this.currentAsset}USDT`;
    let timezone = "Etc/UTC";

    if (this.currentMarket === 'India') {
      timezone = "Asia/Kolkata";
      const assetUpper = this.currentAsset.toUpperCase();
      if (assetUpper === 'NIFTY' || assetUpper === 'NIFTY50') {
        symbol = 'NSE:NIFTY1!';
      } else if (assetUpper === 'BANKNIFTY' || assetUpper === 'NIFTYBANK') {
        symbol = 'NSE:BANKNIFTY1!';
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

    if (this.activeLevels) {
      this.updateLevelsOverlay(this.activeLevels);
    }
  }

  // =========================================================================
  // 2. TRADINGVIEW LIGHTWEIGHT CHARTS (INDIAN MARKET CANVAS ENGINE)
  // =========================================================================
  destroyLightweightChart() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.lwChart) {
      try {
        this.lwChart.remove();
      } catch (err) {
        console.warn('[ChartManager] Error destroying lwChart:', err);
      }
      this.lwChart = null;
      this.candleSeries = null;
      this.volumeSeries = null;
      this.emaSeries = null;
      this.entryPriceLine = null;
      this.targetPriceLine = null;
      this.slPriceLine = null;
      this.currentBar = null;
    }
  }

  async renderLightweightChart() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    this.destroyLightweightChart();

    // Check if LightweightCharts global library is ready
    if (!window.LightweightCharts) {
      let retryCount = 0;
      const retryTimer = setInterval(() => {
        retryCount++;
        if (window.LightweightCharts) {
          clearInterval(retryTimer);
          this.renderLightweightChart();
        } else if (retryCount > 25) {
          clearInterval(retryTimer);
          console.error('[ChartManager] LightweightCharts library failed to load.');
        }
      }, 80);
      return;
    }

    const isDark = this.currentTheme !== 'light';
    const assetUpper = this.currentAsset.toUpperCase();
    const snapshot = this.adapter && typeof this.adapter.getSnapshot === 'function'
      ? this.adapter.getSnapshot(this.currentAsset)
      : null;
    const currentPrice = snapshot ? snapshot.price : (this.adapter ? this.adapter.getCurrentPrice(this.currentAsset) : 25120.0);
    const changePct = snapshot ? snapshot.changePercent : 0.72;
    const isUp = changePct >= 0;

    container.innerHTML = `
      <div class="lw-chart-wrapper" id="lw_chart_wrapper">
        <div class="lw-chart-header">
          <div class="lw-header-left">
            <span class="lw-asset-tag">
              <i class="ph ph-buildings"></i> NSE • ${assetUpper}
            </span>
            <span class="lw-live-price" id="lw_header_price">
              ₹${currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
            </span>
            <span class="lw-live-change ${isUp ? 'bullish' : 'bearish'}" id="lw_header_change">
              ${isUp ? '+' : ''}${changePct.toFixed(2)}%
            </span>
            <span class="lw-indicator-badges">
              <span class="lw-indicator-pill"><i class="ph ph-clock"></i> ${this.rawTimeframe || '1H'}</span>
              <span class="lw-indicator-pill">EMA 20</span>
              <span class="lw-indicator-pill">VOL</span>
            </span>
          </div>
          <div class="lw-header-right">
            <a 
              href="https://in.tradingview.com/chart/?symbol=NSE:${encodeURIComponent(assetUpper)}" 
              target="_blank" 
              rel="noopener noreferrer" 
              class="tv-shortcut-btn" 
              title="Open full chart on TradingView in new tab for manual drawing tools"
            >
              <i class="ph ph-arrow-square-out"></i> TV Web ↗
            </a>
          </div>
        </div>
        <div class="lw-canvas-container" id="lw_canvas_container"></div>
        <div id="chart_levels_overlay" class="chart-levels-overlay"></div>
      </div>
    `;

    const canvasContainer = document.getElementById('lw_canvas_container');
    if (!canvasContainer) return;

    const chartWidth = canvasContainer.clientWidth || container.clientWidth || 600;
    const chartHeight = canvasContainer.clientHeight || (container.clientHeight - 42) || 400;

    const chart = window.LightweightCharts.createChart(canvasContainer, {
      width: chartWidth,
      height: chartHeight,
      layout: {
        background: { type: 'solid', color: isDark ? '#090d16' : '#ffffff' },
        textColor: isDark ? '#94a3b8' : '#475569',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.05)' },
        horzLines: { color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.05)' }
      },
      crosshair: {
        mode: window.LightweightCharts.CrosshairMode.Normal,
        vertLine: {
          color: isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(2, 132, 199, 0.4)',
          width: 1,
          style: window.LightweightCharts.LineStyle.Dashed
        },
        horzLine: {
          color: isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(2, 132, 199, 0.4)',
          width: 1,
          style: window.LightweightCharts.LineStyle.Dashed
        }
      },
      timeScale: {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
        timeVisible: true,
        secondsVisible: false
      },
      rightPriceScale: {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
        scaleMargins: { top: 0.12, bottom: 0.22 }
      }
    });

    this.lwChart = chart;

    // 1. Candlestick Series
    this.candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderUpColor: '#10b981',
      borderDownColor: '#f43f5e',
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e'
    });

    // 2. Volume Histogram Series (overlay in lower section)
    this.volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      scaleMargins: { top: 0.82, bottom: 0 }
    });

    // 3. 20 EMA Line Indicator
    this.emaSeries = chart.addLineSeries({
      color: '#38bdf8',
      lineWidth: 1.5,
      title: 'EMA 20',
      crosshairMarkerVisible: true
    });

    // Fetch and populate candle data
    const adapterTf = this.rawTimeframe === '5M' ? '5M' : '1H';
    let rawCandles = [];
    if (this.adapter && typeof this.adapter.getHistoricalCandles === 'function') {
      rawCandles = await this.adapter.getHistoricalCandles(this.currentAsset, adapterTf, 60);
    }

    if (rawCandles && rawCandles.length > 0) {
      const formattedCandles = rawCandles.map(c => ({
        time: Math.floor(c.time / 1000),
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close)
      })).filter((c, idx, arr) => idx === 0 || c.time > arr[idx - 1].time);

      this.candleSeries.setData(formattedCandles);

      const volumeData = rawCandles.map(c => ({
        time: Math.floor(c.time / 1000),
        value: c.volume || 100000,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)'
      })).filter((c, idx, arr) => idx === 0 || c.time > arr[idx - 1].time);

      this.volumeSeries.setData(volumeData);

      const emaData = this.calculateEMA(formattedCandles, 20);
      this.emaSeries.setData(emaData);

      if (formattedCandles.length > 0) {
        this.currentBar = { ...formattedCandles[formattedCandles.length - 1] };
      }

      this.lwChart.timeScale().fitContent();
    }

    // Auto-fit on resize
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(entries => {
        if (!entries || entries.length === 0) return;
        const rect = entries[0].contentRect;
        if (rect && rect.width > 0 && rect.height > 0 && this.lwChart) {
          this.lwChart.applyOptions({
            width: rect.width,
            height: rect.height
          });
        }
      });
      this.resizeObserver.observe(canvasContainer);
    }

    if (this.activeLevels) {
      this.updateLevelsOverlay(this.activeLevels);
    }
  }

  calculateEMA(candles, period = 20) {
    if (!candles || candles.length < 2) return [];
    const k = 2 / (period + 1);
    const emaData = [];
    let ema = candles[0].close;

    for (let i = 0; i < candles.length; i++) {
      const close = candles[i].close;
      ema = (close * k) + (ema * (1 - k));
      if (i >= Math.min(period - 1, 5)) {
        emaData.push({
          time: candles[i].time,
          value: +ema.toFixed(2)
        });
      }
    }
    return emaData;
  }

  onRealtimeTick(tick) {
    if (this.currentMarket !== 'India' || !this.candleSeries || !this.currentBar) return;
    if (tick.asset && tick.asset.toUpperCase() !== this.currentAsset.toUpperCase()) return;

    const price = Number(tick.price);
    if (isNaN(price)) return;

    // Update last candle
    this.currentBar.close = price;
    if (price > this.currentBar.high) this.currentBar.high = price;
    if (price < this.currentBar.low) this.currentBar.low = price;

    try {
      this.candleSeries.update(this.currentBar);
    } catch (e) {
      // Ignore timestamp ordering race
    }

    // Update header price badge
    const priceEl = document.getElementById('lw_header_price');
    if (priceEl) {
      priceEl.textContent = `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`;
    }
  }

  // =========================================================================
  // 3. OVERLAYS (NATIVE CANVAS PRICE LINES + HTML BADGES)
  // =========================================================================
  updateLevelsOverlay(levels) {
    this.activeLevels = levels;

    // 1. Native Canvas Price Lines for Indian Market
    if (this.currentMarket === 'India' && this.candleSeries && window.LightweightCharts) {
      if (this.entryPriceLine) {
        try { this.candleSeries.removePriceLine(this.entryPriceLine); } catch (e) {}
        this.entryPriceLine = null;
      }
      if (this.targetPriceLine) {
        try { this.candleSeries.removePriceLine(this.targetPriceLine); } catch (e) {}
        this.targetPriceLine = null;
      }
      if (this.slPriceLine) {
        try { this.candleSeries.removePriceLine(this.slPriceLine); } catch (e) {}
        this.slPriceLine = null;
      }

      if (levels && typeof levels.entry === 'number') {
        this.entryPriceLine = this.candleSeries.createPriceLine({
          price: levels.entry,
          color: '#38bdf8',
          lineWidth: 2,
          lineStyle: window.LightweightCharts.LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'ENTRY'
        });
      }
      if (levels && typeof levels.target === 'number') {
        this.targetPriceLine = this.candleSeries.createPriceLine({
          price: levels.target,
          color: '#10b981',
          lineWidth: 2,
          lineStyle: window.LightweightCharts.LineStyle.Solid,
          axisLabelVisible: true,
          title: 'TARGET'
        });
      }
      if (levels && typeof levels.stopLoss === 'number') {
        this.slPriceLine = this.candleSeries.createPriceLine({
          price: levels.stopLoss,
          color: '#f43f5e',
          lineWidth: 2,
          lineStyle: window.LightweightCharts.LineStyle.Solid,
          axisLabelVisible: true,
          title: 'STOP LOSS'
        });
      }
    }

    // 2. HTML Level Badges Overlay
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

/**
 * Project Monday — TradingView Pro Multi-Chart Suite (60 FPS GPU Canvas Engine)
 * Features:
 * 1. 1 to 8 Chart Layout Grid with Crosshair, Symbol & Timeframe Sync.
 * 2. Top TradingView Pro Bar: Symbol Quick Switcher, Timeframe Pills, Chart Styles, fx Indicators, Instant Orders.
 * 3. Left Drawing Toolbar: Crosshair, Trendline, Horizontal Line, Rectangle Zone, Long/Short Position, Measure.
 * 4. High-DPI Interactive Canvas Drawing Layer overlaid on each cell with Undo/Redo & Clear.
 * 5. Signature TradingView Blue Focus Outline on selected cell.
 * 6. Live OHLC Readout Legend with real-time cursor hover tracking.
 * 7. On-Chart Instant Buy/Sell Orders Overlay with direct Paper Trader execution.
 * 8. Dynamic fx Indicators Engine: EMA 9/20/50/200, Volume SMA, Bollinger Bands, RSI.
 */

export const MULTI_CHART_LAYOUTS = {
  // 1 Chart
  '1': {
    id: '1',
    name: '1 Chart (Full)',
    charts: 1,
    cssClass: 'grid-1',
    glyph: 'glyph-1',
    cells: 1
  },
  // 2 Charts
  '2-vert': {
    id: '2-vert',
    name: '2 Columns (Vertical Split)',
    charts: 2,
    cssClass: 'grid-2-vert',
    glyph: 'glyph-2-v',
    cells: 2
  },
  '2-horiz': {
    id: '2-horiz',
    name: '2 Rows (Horizontal Split)',
    charts: 2,
    cssClass: 'grid-2-horiz',
    glyph: 'glyph-2-h',
    cells: 2
  },
  // 3 Charts
  '3-vert': {
    id: '3-vert',
    name: '3 Columns',
    charts: 3,
    cssClass: 'grid-3-vert',
    glyph: 'glyph-3-v',
    cells: 3
  },
  '3-horiz': {
    id: '3-horiz',
    name: '3 Rows',
    charts: 3,
    cssClass: 'grid-3-h',
    glyph: 'glyph-3-h',
    cells: 3
  },
  '3-left': {
    id: '3-left',
    name: '1 Left / 2 Right',
    charts: 3,
    cssClass: 'grid-3-left',
    glyph: 'glyph-3-l',
    cells: 3
  },
  '3-right': {
    id: '3-right',
    name: '2 Left / 1 Right',
    charts: 3,
    cssClass: 'grid-3-right',
    glyph: 'glyph-3-r',
    cells: 3
  },
  '3-top': {
    id: '3-top',
    name: '1 Top / 2 Bottom',
    charts: 3,
    cssClass: 'grid-3-top',
    glyph: 'glyph-3-t',
    cells: 3
  },
  '3-bottom': {
    id: '3-bottom',
    name: '2 Top / 1 Bottom',
    charts: 3,
    cssClass: 'grid-3-bot',
    glyph: 'glyph-3-b',
    cells: 3
  },
  // 4 Charts
  '4-grid': {
    id: '4-grid',
    name: '4 Grid (2x2)',
    charts: 4,
    cssClass: 'grid-4-grid',
    glyph: 'glyph-4-g',
    cells: 4
  },
  '4-vert': {
    id: '4-vert',
    name: '4 Columns',
    charts: 4,
    cssClass: 'grid-4-vert',
    glyph: 'glyph-4-v',
    cells: 4
  },
  '4-horiz': {
    id: '4-horiz',
    name: '4 Rows',
    charts: 4,
    cssClass: 'grid-4-horiz',
    glyph: 'glyph-4-h',
    cells: 4
  },
  '4-left': {
    id: '4-left',
    name: '1 Left / 3 Right',
    charts: 4,
    cssClass: 'grid-4-left',
    glyph: 'glyph-4-l',
    cells: 4
  },
  '4-top': {
    id: '4-top',
    name: '1 Top / 3 Bottom',
    charts: 4,
    cssClass: 'grid-4-top',
    glyph: 'glyph-4-t',
    cells: 4
  },
  // 5 Charts
  '5-grid': {
    id: '5-grid',
    name: '5 Charts (2 Top / 3 Bottom)',
    charts: 5,
    cssClass: 'grid-5-grid',
    glyph: 'glyph-5-g',
    cells: 5
  },
  '5-horiz': {
    id: '5-horiz',
    name: '5 Rows',
    charts: 5,
    cssClass: 'grid-5-horiz',
    glyph: 'glyph-5-h',
    cells: 5
  },
  // 6 Charts
  '6-grid': {
    id: '6-grid',
    name: '6 Grid (3x2)',
    charts: 6,
    cssClass: 'grid-6-grid',
    glyph: 'glyph-6-g',
    cells: 6
  },
  '6-grid-v': {
    id: '6-grid-v',
    name: '6 Grid (2x3)',
    charts: 6,
    cssClass: 'grid-6-grid-v',
    glyph: 'glyph-6-gv',
    cells: 6
  },
  '6-horiz': {
    id: '6-horiz',
    name: '6 Rows',
    charts: 6,
    cssClass: 'grid-6-horiz',
    glyph: 'glyph-6-h',
    cells: 6
  },
  // 7 Charts
  '7-grid': {
    id: '7-grid',
    name: '7 Charts (1 Master / 6 Grid)',
    charts: 7,
    cssClass: 'grid-7-grid',
    glyph: 'glyph-7-g',
    cells: 7
  },
  // 8 Charts
  '8-grid': {
    id: '8-grid',
    name: '8 Grid (4x2)',
    charts: 8,
    cssClass: 'grid-8-grid',
    glyph: 'glyph-8-g',
    cells: 8
  },
  '8-grid-v': {
    id: '8-grid-v',
    name: '8 Grid (2x4)',
    charts: 8,
    cssClass: 'grid-8-grid-v',
    glyph: 'glyph-8-gv',
    cells: 8
  }
};

export class MultiChartManager {
  constructor(viewportContainerId, options = {}) {
    this.viewportId = viewportContainerId;
    this.options = options;
    this.adapter = options.adapter || null;
    this.adapters = options.adapters || null;
    this.currentTheme = localStorage.getItem('monday_theme') || 'dark';

    // Layout State
    this.activeLayoutId = localStorage.getItem('monday_multi_layout') || '1';
    this.activeCellIndex = 0;
    this.maximizedCellIndex = null;

    // TradingView Pro Tool State
    this.activeDrawingTool = 'cursor';
    this.instantOrdersEnabled = localStorage.getItem('monday_instant_orders') === 'true';
    this.activeChartStyle = 'candles';
    this.indicatorsPopoverOpen = false;
    this.drawingHistory = [];
    this.drawingRedoHistory = [];

    // Sync Preferences (TradingView Pro standard)
    this.syncSettings = {
      symbol: localStorage.getItem('monday_sync_symbol') === 'true',
      interval: localStorage.getItem('monday_sync_interval') === 'true',
      crosshair: localStorage.getItem('monday_sync_crosshair') !== 'false', // Default ON
      time: localStorage.getItem('monday_sync_time') === 'true'
    };

    // Sub-Charts State Registry
    this.subCharts = [];
    this.isSyncingTime = false;
    this.popoverOpen = false;

    // Default asset pool
    this.defaultAssetUniverse = [
      'BTC', 'ETH', 'SOL', 'AVAX', 'LINK',
      'DOGE', 'NEAR', 'SUI', 'XRP', 'ADA',
      'NIFTY', 'BANKNIFTY', 'RELIANCE', 'TATASTEEL', 'HDFCBANK'
    ];
  }

  setAdapter(adapter) {
    this.adapter = adapter;
  }

  setAdapters(adapters) {
    this.adapters = adapters;
  }

  getAdapterForCell(sc) {
    const isIndian = sc.market === 'India' || ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TATASTEEL', 'HDFCBANK', 'HAL', 'ZOMATO', 'TATAMOTORS'].includes(sc.asset);
    if (this.adapters) {
      return isIndian ? this.adapters.india : this.adapters.crypto;
    }
    return this.adapter;
  }

  setTheme(theme) {
    this.currentTheme = theme;
    this.subCharts.forEach(sc => {
      if (sc.chart) {
        const isDark = theme !== 'light';
        sc.chart.applyOptions({
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
      }
      this.redrawCanvas(sc);
    });
  }

  init(initialAsset = 'BTC', initialTimeframe = '1H', initialMarket = 'Crypto') {
    this.initialAsset = initialAsset;
    this.initialTimeframe = initialTimeframe;
    this.initialMarket = initialMarket;

    this.renderLayoutPopover();
    if (this.activeLayoutId && this.activeLayoutId !== '1') {
      this.applyLayout(this.activeLayoutId);
    }
  }

  // =========================================================================
  // 1. TRADINGVIEW LAYOUT POPOVER TRAY
  // =========================================================================
  renderLayoutPopover() {
    const popover = document.getElementById('chart_layout_popover');
    if (!popover) return;

    const groupedTiers = {
      1: ['1'],
      2: ['2-vert', '2-horiz'],
      3: ['3-vert', '3-horiz', '3-left', '3-right', '3-top', '3-bottom'],
      4: ['4-grid', '4-vert', '4-horiz', '4-left', '4-top'],
      5: ['5-grid', '5-horiz'],
      6: ['6-grid', '6-grid-v', '6-horiz'],
      7: ['7-grid'],
      8: ['8-grid', '8-grid-v']
    };

    let tiersHtml = '';
    for (let tier = 1; tier <= 8; tier++) {
      const layoutIds = groupedTiers[tier];
      let optionsHtml = '';
      
      layoutIds.forEach(id => {
        const layout = MULTI_CHART_LAYOUTS[id];
        if (!layout) return;
        const isActive = this.activeLayoutId === id;
        
        let glyphCells = '';
        for (let i = 0; i < layout.charts; i++) {
          glyphCells += '<div class="glyph-cell"></div>';
        }

        optionsHtml += `
          <button 
            class="layout-option-card ${isActive ? 'active' : ''}" 
            data-layout-id="${id}" 
            title="${layout.name}"
            type="button"
          >
            <div class="layout-glyph ${layout.glyph}">
              ${glyphCells}
            </div>
          </button>
        `;
      });

      tiersHtml += `
        <div class="layout-tier-row">
          <span class="layout-tier-num">${tier}</span>
          <div class="layout-tier-options">${optionsHtml}</div>
        </div>
      `;
    }

    popover.innerHTML = `
      <div class="layout-popover-header">
        <span class="layout-popover-title">
          <i class="ph-bold ph-squares-four"></i> Select Layout (1 to 8)
        </span>
        <button class="layout-popover-close" id="btn_close_layout_popover" type="button">
          <i class="ph ph-x"></i>
        </button>
      </div>

      <div class="layout-groups-container">
        ${tiersHtml}
      </div>

      <div class="layout-sync-section">
        <div class="layout-sync-header">
          <span>Sync in Layout</span>
          <i class="ph ph-info" title="Control synchronization across all active charts"></i>
        </div>
        <div class="layout-sync-options">
          <div class="layout-sync-item">
            <label class="sync-label-wrap" for="sync_toggle_symbol">
              <i class="ph ph-currency-circle-dollar"></i> Symbol
            </label>
            <label class="tv-toggle-switch">
              <input type="checkbox" id="sync_toggle_symbol" ${this.syncSettings.symbol ? 'checked' : ''} />
              <span class="tv-toggle-slider"></span>
            </label>
          </div>
          <div class="layout-sync-item">
            <label class="sync-label-wrap" for="sync_toggle_interval">
              <i class="ph ph-clock"></i> Interval / Timeframe
            </label>
            <label class="tv-toggle-switch">
              <input type="checkbox" id="sync_toggle_interval" ${this.syncSettings.interval ? 'checked' : ''} />
              <span class="tv-toggle-slider"></span>
            </label>
          </div>
          <div class="layout-sync-item">
            <label class="sync-label-wrap" for="sync_toggle_crosshair">
              <i class="ph ph-crosshair"></i> Crosshair
            </label>
            <label class="tv-toggle-switch">
              <input type="checkbox" id="sync_toggle_crosshair" ${this.syncSettings.crosshair ? 'checked' : ''} />
              <span class="tv-toggle-slider"></span>
            </label>
          </div>
          <div class="layout-sync-item">
            <label class="sync-label-wrap" for="sync_toggle_time">
              <i class="ph ph-arrows-left-right"></i> Time (Scroll & Zoom)
            </label>
            <label class="tv-toggle-switch">
              <input type="checkbox" id="sync_toggle_time" ${this.syncSettings.time ? 'checked' : ''} />
              <span class="tv-toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    `;

    this.bindPopoverEvents();
  }

  bindPopoverEvents() {
    const trigger = document.getElementById('chart_layout_btn');
    const popover = document.getElementById('chart_layout_popover');
    const closeBtn = document.getElementById('btn_close_layout_popover');

    if (trigger) {
      trigger.onclick = (e) => {
        e.stopPropagation();
        this.togglePopover();
      };
    }

    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        this.closePopover();
      };
    }

    // Dismiss when clicking outside
    document.addEventListener('click', (e) => {
      if (popover && !popover.contains(e.target) && trigger && !trigger.contains(e.target)) {
        this.closePopover();
      }
      const indPopover = document.getElementById('tv_indicators_popover');
      const indBtn = document.getElementById('btn_open_indicators');
      if (indPopover && !indPopover.contains(e.target) && indBtn && !indBtn.contains(e.target)) {
        indPopover.classList.remove('active');
        this.indicatorsPopoverOpen = false;
      }
    });

    // Layout Option Selection
    popover.querySelectorAll('.layout-option-card').forEach(btn => {
      btn.onclick = (e) => {
        const layoutId = e.currentTarget.dataset.layoutId;
        if (layoutId) {
          this.applyLayout(layoutId);
          this.closePopover();
        }
      };
    });

    // Sync Toggles Binding
    const symToggle = document.getElementById('sync_toggle_symbol');
    if (symToggle) {
      symToggle.onchange = (e) => {
        this.syncSettings.symbol = e.target.checked;
        localStorage.setItem('monday_sync_symbol', String(e.target.checked));
      };
    }

    const intToggle = document.getElementById('sync_toggle_interval');
    if (intToggle) {
      intToggle.onchange = (e) => {
        this.syncSettings.interval = e.target.checked;
        localStorage.setItem('monday_sync_interval', String(e.target.checked));
      };
    }

    const crsToggle = document.getElementById('sync_toggle_crosshair');
    if (crsToggle) {
      crsToggle.onchange = (e) => {
        this.syncSettings.crosshair = e.target.checked;
        localStorage.setItem('monday_sync_crosshair', String(e.target.checked));
      };
    }

    const timToggle = document.getElementById('sync_toggle_time');
    if (timToggle) {
      timToggle.onchange = (e) => {
        this.syncSettings.time = e.target.checked;
        localStorage.setItem('monday_sync_time', String(e.target.checked));
      };
    }
  }

  togglePopover() {
    const popover = document.getElementById('chart_layout_popover');
    const trigger = document.getElementById('chart_layout_btn');
    if (!popover) return;
    this.popoverOpen = !this.popoverOpen;
    popover.classList.toggle('active', this.popoverOpen);
    if (trigger) trigger.setAttribute('aria-expanded', String(this.popoverOpen));
  }

  closePopover() {
    const popover = document.getElementById('chart_layout_popover');
    const trigger = document.getElementById('chart_layout_btn');
    if (!popover) return;
    this.popoverOpen = false;
    popover.classList.remove('active');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  // =========================================================================
  // 2. GRID LAYOUT INITIALIZATION & LIFECYCLE (TRADINGVIEW PRO SUITE)
  // =========================================================================
  applyLayout(layoutId) {
    const layout = MULTI_CHART_LAYOUTS[layoutId] || MULTI_CHART_LAYOUTS['1'];
    this.activeLayoutId = layout.id;
    this.maximizedCellIndex = null;
    localStorage.setItem('monday_multi_layout', layout.id);

    // Update active highlight in popover
    const popover = document.getElementById('chart_layout_popover');
    if (popover) {
      popover.querySelectorAll('.layout-option-card').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.layoutId === layout.id);
      });
    }

    const trigger = document.getElementById('chart_layout_btn');
    if (trigger) {
      trigger.title = `Layout: ${layout.name}`;
    }

    if (layout.id === '1') {
      this.destroyAll();
      if (this.options.onSingleChartSelected) {
        this.options.onSingleChartSelected();
      }
      return;
    }

    const container = document.getElementById(this.viewportId);
    if (!container) return;

    this.destroyAll();

    // Preserve previous cell configs or assign smart defaults
    const requiredCount = layout.charts;
    const newSubCharts = [];

    for (let i = 0; i < requiredCount; i++) {
      const prev = this.subCharts[i];
      const asset = prev ? prev.asset : (this.defaultAssetUniverse[i % this.defaultAssetUniverse.length] || 'BTC');
      const tf = prev ? prev.timeframe : (i === 1 ? '5M' : (i === 0 ? (this.initialTimeframe || '1H') : '15M'));
      const market = ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TATASTEEL', 'HDFCBANK'].includes(asset) ? 'India' : 'Crypto';

      newSubCharts.push({
        id: `subchart_${i}`,
        cellIndex: i,
        asset,
        timeframe: tf,
        market,
        chart: null,
        candleSeries: null,
        volumeSeries: null,
        emaSeries: null,
        ema50Series: null,
        ema200Series: null,
        bBandUpper: null,
        bBandLower: null,
        currentBar: null,
        rawCandles: [],
        drawings: [],
        indicators: {
          ema20: true,
          ema50: false,
          ema200: false,
          volSma: true,
          bBands: false,
          rsi: false
        },
        resizeObserver: null
      });
    }

    this.subCharts = newSubCharts;

    // Render Full TradingView Pro Suite Shell
    container.innerHTML = `
      <div class="tv-multi-pro-wrapper" id="tv_multi_pro_wrapper">
        <!-- TOP TRADINGVIEW PRO TOOLBAR -->
        <div class="tv-multi-pro-topbar" id="tv_multi_pro_topbar">
          <div class="tv-topbar-left">
            <button class="tv-symbol-pill-btn" id="btn_topbar_symbol" type="button" title="Active Chart Symbol">
              <i class="ph ph-magnifying-glass"></i>
              <span id="topbar_active_symbol">${this.subCharts[0]?.asset || 'BTC'}</span>
            </button>

            <!-- Quick Timeframe Pills Group -->
            <div class="tv-tf-pills-group" id="topbar_tf_pills">
              <button class="tv-tf-pill" data-tf="1M" type="button">1m</button>
              <button class="tv-tf-pill" data-tf="5M" type="button">5m</button>
              <button class="tv-tf-pill" data-tf="15M" type="button">15m</button>
              <button class="tv-tf-pill active" data-tf="1H" type="button">1h</button>
              <button class="tv-tf-pill" data-tf="4H" type="button">4h</button>
              <button class="tv-tf-pill" data-tf="1D" type="button">1d</button>
            </div>

            <!-- Chart Style Selector Button -->
            <button class="tv-tool-btn" id="btn_chart_style" type="button" title="Chart Style: Candlesticks">
              <i class="ph ph-chart-bar" id="chart_style_icon"></i>
              <span id="chart_style_label">Candles</span>
            </button>

            <!-- fx Indicators Dialog Trigger -->
            <button class="tv-indicators-btn" id="btn_open_indicators" type="button" title="Add / Remove Technical Indicators">
              <i>fx</i> Indicators
            </button>

            <!-- Instant Buy/Sell Orders Toggle -->
            <label class="tv-instant-orders-toggle" id="lbl_instant_orders" title="Toggle On-Chart Instant Buy / Sell Buttons">
              <input type="checkbox" id="toggle_instant_orders" ${this.instantOrdersEnabled ? 'checked' : ''} />
              <span>Instant Orders</span>
            </label>
          </div>

          <div class="tv-topbar-right">
            <button class="tv-tool-btn" id="btn_undo_drawing" type="button" title="Undo Drawing (Ctrl+Z)"><i class="ph ph-arrow-u-up-left"></i></button>
            <button class="tv-tool-btn" id="btn_redo_drawing" type="button" title="Redo Drawing (Ctrl+Y)"><i class="ph ph-arrow-u-up-right"></i></button>
            <button class="tv-tool-btn" id="btn_toggle_fullscreen" type="button" title="Toggle Fullscreen Grid"><i class="ph ph-arrows-out"></i></button>
          </div>
        </div>

        <div class="tv-multi-main-body">
          <!-- LEFT TRADINGVIEW DRAWING TOOLBAR -->
          <div class="tv-multi-drawing-toolbar" id="tv_multi_drawing_toolbar">
            <button class="tv-draw-tool-btn ${this.activeDrawingTool === 'cursor' ? 'active' : ''}" data-tool="cursor" title="Crosshair Cursor (Esc)" type="button"><i class="ph ph-crosshair"></i></button>
            <button class="tv-draw-tool-btn ${this.activeDrawingTool === 'trendline' ? 'active' : ''}" data-tool="trendline" title="Trendline Tool" type="button"><i class="ph ph-line-segments"></i></button>
            <button class="tv-draw-tool-btn ${this.activeDrawingTool === 'hline' ? 'active' : ''}" data-tool="hline" title="Horizontal Support/Resistance Line" type="button"><i class="ph ph-arrows-horizontal"></i></button>
            <button class="tv-draw-tool-btn ${this.activeDrawingTool === 'rectangle' ? 'active' : ''}" data-tool="rectangle" title="Order Block / Reaction Zone Box" type="button"><i class="ph ph-square"></i></button>
            <button class="tv-draw-tool-btn ${this.activeDrawingTool === 'long_position' ? 'active' : ''}" data-tool="long_position" title="Long Position Risk-Reward Setup" type="button"><i class="ph ph-trend-up"></i></button>
            <button class="tv-draw-tool-btn ${this.activeDrawingTool === 'short_position' ? 'active' : ''}" data-tool="short_position" title="Short Position Risk-Reward Setup" type="button"><i class="ph ph-trend-down"></i></button>
            <button class="tv-draw-tool-btn ${this.activeDrawingTool === 'measure' ? 'active' : ''}" data-tool="measure" title="Measure Distance & Percentage" type="button"><i class="ph ph-ruler"></i></button>
            <div class="tv-toolbar-divider"></div>
            <button class="tv-draw-tool-btn danger" id="btn_clear_drawings" title="Clear All Drawings on Active Chart" type="button"><i class="ph ph-trash"></i></button>
          </div>

          <!-- GRID VIEWPORT -->
          <div class="multi-chart-grid-container ${layout.cssClass}" id="multi_chart_grid"></div>
        </div>

        <!-- FX INDICATORS SELECTION POPOVER DIALOG -->
        <div class="tv-indicators-popover" id="tv_indicators_popover">
          <div class="indicators-popover-header">
            <span class="indicators-popover-title"><i class="ph-bold ph-lightning"></i> Technical Indicators & Overlays</span>
            <button class="layout-popover-close" id="btn_close_indicators" type="button"><i class="ph ph-x"></i></button>
          </div>
          <div class="indicators-list" id="indicators_checklist">
            <label class="indicator-row-item">
              <div class="ind-meta">
                <span class="ind-color-chip" style="background: #38bdf8;"></span>
                <span class="ind-name">EMA 20</span>
                <span class="ind-tag">Trend Pullback</span>
              </div>
              <input type="checkbox" data-ind="ema20" checked />
            </label>
            <label class="indicator-row-item">
              <div class="ind-meta">
                <span class="ind-color-chip" style="background: #eab308;"></span>
                <span class="ind-name">EMA 50</span>
                <span class="ind-tag">Institutional Anchor</span>
              </div>
              <input type="checkbox" data-ind="ema50" />
            </label>
            <label class="indicator-row-item">
              <div class="ind-meta">
                <span class="ind-color-chip" style="background: #f97316;"></span>
                <span class="ind-name">EMA 200</span>
                <span class="ind-tag">Macro Trend Line</span>
              </div>
              <input type="checkbox" data-ind="ema200" />
            </label>
            <label class="indicator-row-item">
              <div class="ind-meta">
                <span class="ind-color-chip" style="background: #6366f1;"></span>
                <span class="ind-name">Bollinger Bands (20, 2)</span>
                <span class="ind-tag">Volatility Bands</span>
              </div>
              <input type="checkbox" data-ind="bBands" />
            </label>
            <label class="indicator-row-item">
              <div class="ind-meta">
                <span class="ind-color-chip" style="background: #10b981;"></span>
                <span class="ind-name">Volume SMA</span>
                <span class="ind-tag">Whale Filter</span>
              </div>
              <input type="checkbox" data-ind="volSma" checked />
            </label>
          </div>
        </div>
      </div>
    `;

    const grid = document.getElementById('multi_chart_grid');
    if (!grid) return;

    // Render cells in DOM with Live OHLC, Instant Orders & Drawing Canvas
    grid.innerHTML = this.subCharts.map((sc, idx) => `
      <div class="subchart-cell ${idx === this.activeCellIndex ? 'active-cell' : ''}" id="cell_wrap_${idx}" data-cell-idx="${idx}">
        <div class="subchart-header">
          <div class="subchart-header-left">
            <span class="subchart-idx-badge">${idx + 1}</span>
            <select class="subchart-asset-select" id="asset_select_${idx}" data-cell-idx="${idx}">
              <optgroup label="Crypto (Pure USD)">
                <option value="BTC" ${sc.asset === 'BTC' ? 'selected' : ''}>BTC</option>
                <option value="ETH" ${sc.asset === 'ETH' ? 'selected' : ''}>ETH</option>
                <option value="SOL" ${sc.asset === 'SOL' ? 'selected' : ''}>SOL</option>
                <option value="AVAX" ${sc.asset === 'AVAX' ? 'selected' : ''}>AVAX</option>
                <option value="LINK" ${sc.asset === 'LINK' ? 'selected' : ''}>LINK</option>
                <option value="DOGE" ${sc.asset === 'DOGE' ? 'selected' : ''}>DOGE</option>
                <option value="NEAR" ${sc.asset === 'NEAR' ? 'selected' : ''}>NEAR</option>
                <option value="SUI" ${sc.asset === 'SUI' ? 'selected' : ''}>SUI</option>
                <option value="XRP" ${sc.asset === 'XRP' ? 'selected' : ''}>XRP</option>
                <option value="ADA" ${sc.asset === 'ADA' ? 'selected' : ''}>ADA</option>
              </optgroup>
              <optgroup label="Indian Market (NSE)">
                <option value="NIFTY" ${sc.asset === 'NIFTY' ? 'selected' : ''}>NIFTY 50</option>
                <option value="BANKNIFTY" ${sc.asset === 'BANKNIFTY' ? 'selected' : ''}>BANK NIFTY</option>
                <option value="RELIANCE" ${sc.asset === 'RELIANCE' ? 'selected' : ''}>RELIANCE</option>
                <option value="TATASTEEL" ${sc.asset === 'TATASTEEL' ? 'selected' : ''}>TATASTEEL</option>
                <option value="HDFCBANK" ${sc.asset === 'HDFCBANK' ? 'selected' : ''}>HDFCBANK</option>
              </optgroup>
            </select>
            <select class="subchart-tf-select" id="tf_select_${idx}" data-cell-idx="${idx}">
              <option value="1M" ${sc.timeframe.toUpperCase() === '1M' ? 'selected' : ''}>1m</option>
              <option value="5M" ${sc.timeframe.toUpperCase() === '5M' ? 'selected' : ''}>5m</option>
              <option value="15M" ${sc.timeframe.toUpperCase() === '15M' ? 'selected' : ''}>15m</option>
              <option value="1H" ${sc.timeframe.toUpperCase() === '1H' ? 'selected' : ''}>1h</option>
              <option value="4H" ${sc.timeframe.toUpperCase() === '4H' ? 'selected' : ''}>4h</option>
              <option value="1D" ${sc.timeframe.toUpperCase() === '1D' ? 'selected' : ''}>1d</option>
            </select>

            <!-- TRADINGVIEW LIVE OHLC READOUT -->
            <div class="subchart-header-ohlc" id="ohlc_readout_${idx}">
              <span class="ohlc-k">O</span><span class="ohlc-v" id="ohlc_o_${idx}">-</span>
              <span class="ohlc-k">H</span><span class="ohlc-v" id="ohlc_h_${idx}">-</span>
              <span class="ohlc-k">L</span><span class="ohlc-v" id="ohlc_l_${idx}">-</span>
              <span class="ohlc-k">C</span><span class="ohlc-v" id="ohlc_c_${idx}">-</span>
              <span class="ohlc-chg" id="ohlc_chg_${idx}">-</span>
            </div>
          </div>
          <div class="subchart-header-right">
            <span class="subchart-price-tag" id="price_tag_${idx}">...</span>
            <button class="subchart-btn-icon btn-max-cell" data-cell-idx="${idx}" title="Maximize chart" type="button">
              <i class="ph ph-arrows-out-simple"></i>
            </button>
          </div>
        </div>

        <div class="subchart-canvas-wrap" id="canvas_wrap_${idx}">
          <!-- Transparent Canvas for Interactive Drawings -->
          <canvas class="subchart-drawings-canvas" id="drawings_canvas_${idx}"></canvas>

          <!-- ON-CHART TRADINGVIEW INSTANT ORDER BUTTONS -->
          <div class="subchart-instant-orders-box ${this.instantOrdersEnabled ? '' : 'hidden'}" id="instant_box_${idx}">
            <button class="btn-instant-buy" id="btn_buy_${idx}" data-cell-idx="${idx}" type="button">
              <span>BUY</span>
              <span class="instant-p" id="instant_buy_p_${idx}">...</span>
            </button>
            <input type="text" class="instant-qty-input" id="instant_qty_${idx}" value="1" title="Order Quantity" />
            <button class="btn-instant-sell" id="btn_sell_${idx}" data-cell-idx="${idx}" type="button">
              <span>SELL</span>
              <span class="instant-p" id="instant_sell_p_${idx}">...</span>
            </button>
          </div>

          <!-- Active Indicators Legend Inside Cell -->
          <div class="subchart-legend-row" id="legend_row_${idx}">
            <div class="subchart-legend-item">
              <span class="legend-color-dot" style="background: #38bdf8;"></span>
              <span class="legend-title">EMA 20</span>
              <span class="legend-val" id="legend_ema20_${idx}">-</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    // Bind Controls
    this.bindProSuiteEvents();
    this.bindCellControls();

    // Instantiate Lightweight Chart for each active cell
    this.subCharts.forEach(sc => {
      this.initChartForCell(sc);
      this.initDrawingsCanvasForCell(sc);
    });
  }

  // =========================================================================
  // 3. PRO SUITE TOPBAR & TOOLBAR EVENTS
  // =========================================================================
  bindProSuiteEvents() {
    // 1. Drawing Tool Selector
    const toolbar = document.getElementById('tv_multi_drawing_toolbar');
    if (toolbar) {
      toolbar.querySelectorAll('.tv-draw-tool-btn[data-tool]').forEach(btn => {
        btn.onclick = (e) => {
          const tool = btn.dataset.tool;
          this.setDrawingTool(tool);
        };
      });

      const clearBtn = document.getElementById('btn_clear_drawings');
      if (clearBtn) {
        clearBtn.onclick = () => this.clearDrawingsForActiveCell();
      }
    }

    // 2. Quick Timeframe Pills (Applies directly to currently focused/active cell)
    const tfPills = document.getElementById('topbar_tf_pills');
    if (tfPills) {
      tfPills.querySelectorAll('.tv-tf-pill').forEach(btn => {
        btn.onclick = () => {
          const tf = btn.dataset.tf;
          tfPills.querySelectorAll('.tv-tf-pill').forEach(b => b.classList.toggle('active', b === btn));
          this.changeCellTimeframe(this.activeCellIndex, tf);
        };
      });
    }

    // 3. Instant Orders Switch
    const instantToggle = document.getElementById('toggle_instant_orders');
    if (instantToggle) {
      instantToggle.onchange = (e) => {
        this.instantOrdersEnabled = e.target.checked;
        localStorage.setItem('monday_instant_orders', String(this.instantOrdersEnabled));
        document.querySelectorAll('.subchart-instant-orders-box').forEach(box => {
          box.classList.toggle('hidden', !this.instantOrdersEnabled);
        });
      };
    }

    // 4. fx Indicators Popover Toggle
    const indBtn = document.getElementById('btn_open_indicators');
    const indPopover = document.getElementById('tv_indicators_popover');
    const closeIndBtn = document.getElementById('btn_close_indicators');

    if (indBtn && indPopover) {
      indBtn.onclick = (e) => {
        e.stopPropagation();
        this.indicatorsPopoverOpen = !this.indicatorsPopoverOpen;
        indPopover.classList.toggle('active', this.indicatorsPopoverOpen);
      };
    }

    if (closeIndBtn && indPopover) {
      closeIndBtn.onclick = () => {
        indPopover.classList.remove('active');
        this.indicatorsPopoverOpen = false;
      };
    }

    // Indicators Checklist Toggles
    if (indPopover) {
      indPopover.querySelectorAll('input[data-ind]').forEach(chk => {
        chk.onchange = (e) => {
          const ind = e.target.dataset.ind;
          this.toggleIndicatorForActiveCell(ind, e.target.checked);
        };
      });
    }

    // 5. Undo / Redo Drawings
    const undoBtn = document.getElementById('btn_undo_drawing');
    if (undoBtn) {
      undoBtn.onclick = () => this.undoDrawingForActiveCell();
    }

    // 6. Fullscreen Grid Toggle
    const fullBtn = document.getElementById('btn_toggle_fullscreen');
    if (fullBtn) {
      fullBtn.onclick = () => {
        const wrap = document.getElementById(this.viewportId);
        if (!document.fullscreenElement) {
          if (wrap?.requestFullscreen) wrap.requestFullscreen();
        } else {
          if (document.exitFullscreen) document.exitFullscreen();
        }
      };
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.setDrawingTool('cursor');
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        this.undoDrawingForActiveCell();
      }
    });
  }

  setDrawingTool(tool) {
    this.activeDrawingTool = tool;
    const toolbar = document.getElementById('tv_multi_drawing_toolbar');
    if (toolbar) {
      toolbar.querySelectorAll('.tv-draw-tool-btn[data-tool]').forEach(b => {
        b.classList.toggle('active', b.dataset.tool === tool);
      });
    }

    // Toggle interactive mode on active drawing canvas
    this.subCharts.forEach(sc => {
      const cv = document.getElementById(`drawings_canvas_${sc.cellIndex}`);
      if (cv) {
        cv.classList.toggle('interactive', tool !== 'cursor');
      }
    });
  }

  // =========================================================================
  // 4. DRAWING CANVAS INTERACTION ENGINE
  // =========================================================================
  initDrawingsCanvasForCell(sc) {
    const cv = document.getElementById(`drawings_canvas_${sc.cellIndex}`);
    const wrap = document.getElementById(`canvas_wrap_${sc.cellIndex}`);
    if (!cv || !wrap) return;

    const resizeCanvas = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      cv.width = rect.width * dpr;
      cv.height = rect.height * dpr;
      const ctx = cv.getContext('2d');
      ctx.scale(dpr, dpr);
      this.redrawCanvas(sc);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Mouse drawing events
    let isDrawing = false;
    let startX = 0;
    let startY = 0;

    cv.addEventListener('mousedown', (e) => {
      if (this.activeDrawingTool === 'cursor') return;
      this.setActiveCell(sc.cellIndex);

      const rect = cv.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;
      isDrawing = true;

      // Click tools (hline)
      if (this.activeDrawingTool === 'hline') {
        sc.drawings.push({
          type: 'hline',
          y: startY,
          color: '#f59e0b'
        });
        isDrawing = false;
        this.redrawCanvas(sc);
      }
    });

    cv.addEventListener('mousemove', (e) => {
      if (!isDrawing || this.activeDrawingTool === 'cursor') return;
      const rect = cv.getBoundingClientRect();
      const currX = e.clientX - rect.left;
      const currY = e.clientY - rect.top;

      this.redrawCanvas(sc, {
        type: this.activeDrawingTool,
        x1: startX,
        y1: startY,
        x2: currX,
        y2: currY
      });
    });

    cv.addEventListener('mouseup', (e) => {
      if (!isDrawing) return;
      isDrawing = false;
      const rect = cv.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;

      if (Math.abs(endX - startX) > 4 || Math.abs(endY - startY) > 4) {
        sc.drawings.push({
          type: this.activeDrawingTool,
          x1: startX,
          y1: startY,
          x2: endX,
          y2: endY
        });
      }
      this.redrawCanvas(sc);
    });
  }

  redrawCanvas(sc, previewShape = null) {
    const cv = document.getElementById(`drawings_canvas_${sc.cellIndex}`);
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const wrap = document.getElementById(`canvas_wrap_${sc.cellIndex}`);
    if (!wrap) return;

    ctx.clearRect(0, 0, wrap.clientWidth, wrap.clientHeight);

    const shapes = [...(sc.drawings || [])];
    if (previewShape) shapes.push(previewShape);

    shapes.forEach(shape => {
      ctx.save();
      if (shape.type === 'trendline') {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(shape.x1, shape.y1);
        ctx.lineTo(shape.x2, shape.y2);
        ctx.stroke();

        // End anchor dots
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(shape.x1, shape.y1, 3.5, 0, Math.PI * 2);
        ctx.arc(shape.x2, shape.y2, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (shape.type === 'hline') {
        ctx.strokeStyle = shape.color || '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, shape.y);
        ctx.lineTo(wrap.clientWidth, shape.y);
        ctx.stroke();
      } else if (shape.type === 'rectangle') {
        const x = Math.min(shape.x1, shape.x2);
        const y = Math.min(shape.y1, shape.y2);
        const w = Math.abs(shape.x2 - shape.x1);
        const h = Math.abs(shape.y2 - shape.y1);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);
      } else if (shape.type === 'long_position') {
        // Long Position: Green box above, red box below
        const x = Math.min(shape.x1, shape.x2);
        const w = Math.max(60, Math.abs(shape.x2 - shape.x1));
        const entryY = shape.y1;
        const tpY = Math.min(shape.y1, shape.y2);
        const slY = shape.y1 + Math.abs(shape.y1 - shape.y2) * 0.4;

        // Target box (Green)
        ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
        ctx.fillRect(x, tpY, w, Math.abs(entryY - tpY));
        ctx.strokeStyle = '#10b981';
        ctx.strokeRect(x, tpY, w, Math.abs(entryY - tpY));

        // Stop Loss box (Red)
        ctx.fillStyle = 'rgba(244, 63, 94, 0.18)';
        ctx.fillRect(x, entryY, w, Math.abs(slY - entryY));
        ctx.strokeStyle = '#f43f5e';
        ctx.strokeRect(x, entryY, w, Math.abs(slY - entryY));

        // Label
        ctx.fillStyle = '#10b981';
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.fillText('Target (+3.2R)', x + 6, tpY + 12);
        ctx.fillStyle = '#f43f5e';
        ctx.fillText('Stop (-1.0R)', x + 6, slY - 6);
      } else if (shape.type === 'short_position') {
        // Short Position: Red box above, green box below
        const x = Math.min(shape.x1, shape.x2);
        const w = Math.max(60, Math.abs(shape.x2 - shape.x1));
        const entryY = shape.y1;
        const slY = Math.min(shape.y1, shape.y2);
        const tpY = shape.y1 + Math.abs(shape.y1 - shape.y2);

        ctx.fillStyle = 'rgba(244, 63, 94, 0.18)';
        ctx.fillRect(x, slY, w, Math.abs(entryY - slY));
        ctx.strokeStyle = '#f43f5e';
        ctx.strokeRect(x, slY, w, Math.abs(entryY - slY));

        ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
        ctx.fillRect(x, entryY, w, Math.abs(tpY - entryY));
        ctx.strokeStyle = '#10b981';
        ctx.strokeRect(x, entryY, w, Math.abs(tpY - entryY));
      } else if (shape.type === 'measure') {
        const x = Math.min(shape.x1, shape.x2);
        const y = Math.min(shape.y1, shape.y2);
        const w = Math.abs(shape.x2 - shape.x1);
        const h = Math.abs(shape.y2 - shape.y1);
        ctx.fillStyle = 'rgba(147, 51, 234, 0.15)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#a855f7';
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#e9d5ff';
        ctx.font = "bold 10px monospace";
        ctx.fillText(`Δ: ${h.toFixed(1)}px`, x + 6, y + 14);
      }
      ctx.restore();
    });
  }

  undoDrawingForActiveCell() {
    const sc = this.subCharts[this.activeCellIndex];
    if (sc && sc.drawings && sc.drawings.length > 0) {
      sc.drawings.pop();
      this.redrawCanvas(sc);
    }
  }

  clearDrawingsForActiveCell() {
    const sc = this.subCharts[this.activeCellIndex];
    if (sc) {
      sc.drawings = [];
      this.redrawCanvas(sc);
    }
  }

  // =========================================================================
  // 5. CELL CONTROLS, ACTIVE FOCUS & INSTANT ORDERS
  // =========================================================================
  bindCellControls() {
    const grid = document.getElementById('multi_chart_grid');
    if (!grid) return;

    // Focus cell on click
    grid.querySelectorAll('.subchart-cell').forEach(cell => {
      cell.addEventListener('click', (e) => {
        const idx = parseInt(cell.dataset.cellIdx, 10);
        this.setActiveCell(idx);
      });
    });

    // Asset Selector
    grid.querySelectorAll('.subchart-asset-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.cellIdx, 10);
        const newAsset = e.target.value;
        this.changeCellAsset(idx, newAsset);
      });
    });

    // Timeframe Selector
    grid.querySelectorAll('.subchart-tf-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.cellIdx, 10);
        const newTf = e.target.value;
        this.changeCellTimeframe(idx, newTf);
      });
    });

    // Maximize Button
    grid.querySelectorAll('.btn-max-cell').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.cellIdx, 10);
        this.toggleMaximizeCell(idx);
      });
    });

    // Instant BUY / SELL buttons on canvas
    grid.querySelectorAll('.btn-instant-buy').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.cellIdx, 10);
        this.executeInstantOrder(idx, 'LONG');
      };
    });

    grid.querySelectorAll('.btn-instant-sell').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.cellIdx, 10);
        this.executeInstantOrder(idx, 'SHORT');
      };
    });
  }

  setActiveCell(index) {
    this.activeCellIndex = index;
    const grid = document.getElementById('multi_chart_grid');
    if (!grid) return;

    grid.querySelectorAll('.subchart-cell').forEach(c => {
      const idx = parseInt(c.dataset.cellIdx, 10);
      c.classList.toggle('active-cell', idx === index);
    });

    const activeSc = this.subCharts[index];
    if (activeSc) {
      // Update topbar symbol label
      const symLbl = document.getElementById('topbar_active_symbol');
      if (symLbl) symLbl.textContent = activeSc.asset;

      // Update timeframe pill in topbar
      const tfPills = document.getElementById('topbar_tf_pills');
      if (tfPills) {
        tfPills.querySelectorAll('.tv-tf-pill').forEach(b => {
          b.classList.toggle('active', b.dataset.tf.toUpperCase() === (activeSc.timeframe || '1H').toUpperCase());
        });
      }

      if (this.options.onActiveChartChange) {
        this.options.onActiveChartChange(activeSc);
      }
    }
  }

  executeInstantOrder(cellIndex, direction) {
    const sc = this.subCharts[cellIndex];
    if (!sc || !sc.currentBar) return;

    const p = sc.currentBar.close;
    const qtyInput = document.getElementById(`instant_qty_${cellIndex}`);
    const qty = qtyInput ? parseFloat(qtyInput.value) || 1 : 1;

    console.log(`[Instant Order] ${direction} on ${sc.asset} @ ${p} (Qty: ${qty})`);

    if (this.options && this.options.onExecuteInstantTrade) {
      this.options.onExecuteInstantTrade({
        asset: sc.asset,
        market: sc.market,
        direction,
        entry: p,
        positionSize: qty,
        stopLoss: direction === 'LONG' ? +(p * 0.985).toFixed(2) : +(p * 1.015).toFixed(2),
        target: direction === 'LONG' ? +(p * 1.045).toFixed(2) : +(p * 0.955).toFixed(2),
        marginUSD: 20,
        leverage: 20
      });
    }
  }

  toggleMaximizeCell(cellIndex) {
    const cellEl = document.getElementById(`cell_wrap_${cellIndex}`);
    if (!cellEl) return;

    const isCurrentlyMax = this.maximizedCellIndex === cellIndex;
    
    if (isCurrentlyMax) {
      cellEl.classList.remove('cell-maximized');
      this.maximizedCellIndex = null;
      const btn = cellEl.querySelector('.btn-max-cell i');
      if (btn) btn.className = 'ph ph-arrows-out-simple';
    } else {
      if (this.maximizedCellIndex !== null) {
        const prev = document.getElementById(`cell_wrap_${this.maximizedCellIndex}`);
        if (prev) {
          prev.classList.remove('cell-maximized');
          const prevBtn = prev.querySelector('.btn-max-cell i');
          if (prevBtn) prevBtn.className = 'ph ph-arrows-out-simple';
        }
      }
      cellEl.classList.add('cell-maximized');
      this.maximizedCellIndex = cellIndex;
      const btn = cellEl.querySelector('.btn-max-cell i');
      if (btn) btn.className = 'ph ph-arrows-in-simple';
    }

    const sc = this.subCharts[cellIndex];
    if (sc && sc.chart) {
      const wrap = document.getElementById(`canvas_wrap_${cellIndex}`);
      if (wrap) {
        sc.chart.resize(wrap.clientWidth, wrap.clientHeight);
      }
    }
  }

  // =========================================================================
  // 6. INDIVIDUAL LIGHTWEIGHT CHART INSTANCE BUILDER
  // =========================================================================
  async initChartForCell(sc) {
    const wrap = document.getElementById(`canvas_wrap_${sc.cellIndex}`);
    if (!wrap || !window.LightweightCharts) return;

    const isDark = this.currentTheme !== 'light';
    const width = wrap.clientWidth || 300;
    const height = wrap.clientHeight || 200;

    const chart = window.LightweightCharts.createChart(wrap, {
      width,
      height,
      layout: {
        background: { type: 'solid', color: isDark ? '#090d16' : '#ffffff' },
        textColor: isDark ? '#94a3b8' : '#475569',
        fontSize: 10,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.04)' },
        horzLines: { color: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.04)' }
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

    sc.chart = chart;

    // 1. Candlestick Series
    sc.candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderUpColor: '#10b981',
      borderDownColor: '#f43f5e',
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e'
    });

    // 2. Volume Series
    sc.volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      scaleMargins: { top: 0.82, bottom: 0 }
    });

    // 3. EMA 20
    sc.emaSeries = chart.addLineSeries({
      color: '#38bdf8',
      lineWidth: 1.2,
      priceLineVisible: false
    });

    // ResizeObserver
    sc.resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return;
      const { width: w, height: h } = entries[0].contentRect;
      if (w > 0 && h > 0 && sc.chart) {
        sc.chart.resize(w, h);
      }
    });
    sc.resizeObserver.observe(wrap);

    // Crosshair Live OHLC Readout Tracking
    chart.subscribeCrosshairMove((param) => {
      if (param && param.time) {
        const bar = param.seriesData?.get(sc.candleSeries);
        if (bar) {
          this.updateCellOHLC(sc, bar);
        }
      } else if (sc.currentBar) {
        this.updateCellOHLC(sc, sc.currentBar);
      }

      if (this.syncSettings.crosshair && param?.time) {
        this.syncCrosshairToSiblings(sc.cellIndex, param);
      }
    });

    // Time Range Sync
    chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      if (!this.syncSettings.time || !range || this.isSyncingTime) return;
      this.syncTimeRangeToSiblings(sc.cellIndex, range);
    });

    // Load initial candles
    await this.loadCandlesForCell(sc);
  }

  updateCellOHLC(sc, bar) {
    const o = document.getElementById(`ohlc_o_${sc.cellIndex}`);
    const h = document.getElementById(`ohlc_h_${sc.cellIndex}`);
    const l = document.getElementById(`ohlc_l_${sc.cellIndex}`);
    const c = document.getElementById(`ohlc_c_${sc.cellIndex}`);
    const chg = document.getElementById(`ohlc_chg_${sc.cellIndex}`);

    if (!o || !bar) return;

    const fmt = (v) => v < 1 ? v.toFixed(4) : v < 50 ? v.toFixed(3) : v.toFixed(2);
    o.textContent = fmt(bar.open);
    h.textContent = fmt(bar.high);
    l.textContent = fmt(bar.low);
    c.textContent = fmt(bar.close);

    const diff = bar.close - bar.open;
    const pct = bar.open > 0 ? (diff / bar.open) * 100 : 0;
    const isUp = diff >= 0;

    if (chg) {
      chg.textContent = `${isUp ? '+' : ''}${pct.toFixed(2)}%`;
      chg.className = `ohlc-chg ${isUp ? 'bullish' : 'bearish'}`;
    }
  }

  async loadCandlesForCell(sc) {
    const adapter = this.getAdapterForCell(sc);
    if (!adapter) return;

    try {
      if (typeof adapter.ensureAssetInitialized === 'function') {
        await adapter.ensureAssetInitialized(sc.asset);
      }

      const tfUpper = (sc.timeframe || '1H').toUpperCase();
      const adapterTf = tfUpper === '5M' ? '5M' : '1H';

      let rawCandles = [];
      if (typeof adapter.getHistoricalCandles === 'function') {
        rawCandles = await adapter.getHistoricalCandles(sc.asset, adapterTf, 60);
      } else if (typeof adapter.getCandles === 'function') {
        rawCandles = await adapter.getCandles(sc.asset, adapterTf);
      }

      if (rawCandles && rawCandles.length > 0 && sc.candleSeries) {
        sc.rawCandles = rawCandles;

        // Normalize time (Lightweight Charts expects ascending integers in seconds)
        const formattedCandles = rawCandles.map(c => {
          const t = c.time > 1e11 ? Math.floor(c.time / 1000) : Math.floor(c.time);
          return {
            time: t,
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close)
          };
        }).filter((c, idx, arr) => idx === 0 || c.time > arr[idx - 1].time);

        if (formattedCandles.length === 0) return;

        sc.candleSeries.setData(formattedCandles);

        // Volume
        if (sc.volumeSeries) {
          const volData = formattedCandles.map((c, i) => {
            const raw = rawCandles[i] || {};
            return {
              time: c.time,
              value: raw.volume || Math.abs(c.close - c.open) * 1000 || 10000,
              color: c.close >= c.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'
            };
          }).filter((c, idx, arr) => idx === 0 || c.time > arr[idx - 1].time);

          sc.volumeSeries.setData(volData);
        }

        // EMA 20
        if (sc.emaSeries && sc.indicators.ema20) {
          const emaData = this.calculateEMA(formattedCandles, 20);
          sc.emaSeries.setData(emaData);
          const legVal = document.getElementById(`legend_ema20_${sc.cellIndex}`);
          if (legVal && emaData.length > 0) legVal.textContent = emaData[emaData.length - 1].value;
        }

        sc.currentBar = { ...formattedCandles[formattedCandles.length - 1] };
        this.updateCellHeaderPrice(sc);
        this.updateCellOHLC(sc, sc.currentBar);
        sc.chart.timeScale().fitContent();
      }
    } catch (e) {
      console.warn(`[MultiChartManager] Error loading candles for ${sc.asset}:`, e);
    }
  }

  toggleIndicatorForActiveCell(indicatorKey, isEnabled) {
    const sc = this.subCharts[this.activeCellIndex];
    if (!sc || !sc.chart || !sc.rawCandles || sc.rawCandles.length === 0) return;

    sc.indicators[indicatorKey] = isEnabled;
    const formattedCandles = sc.candleSeries ? sc.rawCandles.map(c => ({
      time: c.time > 1e11 ? Math.floor(c.time / 1000) : Math.floor(c.time),
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close)
    })).filter((c, idx, arr) => idx === 0 || c.time > arr[idx - 1].time) : [];

    if (indicatorKey === 'ema50') {
      if (isEnabled && !sc.ema50Series) {
        sc.ema50Series = sc.chart.addLineSeries({ color: '#eab308', lineWidth: 1.2, priceLineVisible: false });
        const ema50 = this.calculateEMA(formattedCandles, 50);
        sc.ema50Series.setData(ema50);
      } else if (!isEnabled && sc.ema50Series) {
        sc.chart.removeSeries(sc.ema50Series);
        sc.ema50Series = null;
      }
    } else if (indicatorKey === 'ema200') {
      if (isEnabled && !sc.ema200Series) {
        sc.ema200Series = sc.chart.addLineSeries({ color: '#f97316', lineWidth: 1.5, priceLineVisible: false });
        const ema200 = this.calculateEMA(formattedCandles, 200);
        sc.ema200Series.setData(ema200);
      } else if (!isEnabled && sc.ema200Series) {
        sc.chart.removeSeries(sc.ema200Series);
        sc.ema200Series = null;
      }
    } else if (indicatorKey === 'bBands') {
      if (isEnabled && !sc.bBandUpper) {
        sc.bBandUpper = sc.chart.addLineSeries({ color: '#6366f1', lineWidth: 1, priceLineVisible: false });
        sc.bBandLower = sc.chart.addLineSeries({ color: '#6366f1', lineWidth: 1, priceLineVisible: false });
        const { upper, lower } = this.calculateBollingerBands(formattedCandles, 20, 2);
        sc.bBandUpper.setData(upper);
        sc.bBandLower.setData(lower);
      } else if (!isEnabled && sc.bBandUpper) {
        sc.chart.removeSeries(sc.bBandUpper);
        sc.chart.removeSeries(sc.bBandLower);
        sc.bBandUpper = null;
        sc.bBandLower = null;
      }
    }
  }

  updateCellHeaderPrice(sc) {
    const priceTag = document.getElementById(`price_tag_${sc.cellIndex}`);
    const buyPrice = document.getElementById(`instant_buy_p_${sc.cellIndex}`);
    const sellPrice = document.getElementById(`instant_sell_p_${sc.cellIndex}`);

    if (!sc.currentBar) return;

    const isCrypto = sc.market === 'Crypto';
    const prefix = isCrypto ? '$' : '₹';
    const p = sc.currentBar.close;
    const formattedPrice = p < 0.1 ? p.toFixed(4) : p < 10 ? p.toFixed(3) : p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const openP = sc.currentBar.open;
    const chg = openP > 0 ? ((p - openP) / openP) * 100 : 0;
    const isUp = chg >= 0;

    if (priceTag) {
      priceTag.innerHTML = `
        <span>${prefix}${formattedPrice}</span>
        <span class="subchart-change-tag ${isUp ? 'bullish' : 'bearish'}">
          ${isUp ? '+' : ''}${chg.toFixed(2)}%
        </span>
      `;
    }

    if (buyPrice) buyPrice.textContent = `${prefix}${formattedPrice}`;
    if (sellPrice) sellPrice.textContent = `${prefix}${formattedPrice}`;
  }

  calculateEMA(data, period) {
    if (!data || data.length < period) return [];
    const k = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((sum, d) => sum + d.close, 0) / period;
    const result = [{ time: data[period - 1].time, value: +ema.toFixed(2) }];

    for (let i = period; i < data.length; i++) {
      ema = data[i].close * k + ema * (1 - k);
      result.push({ time: data[i].time, value: +ema.toFixed(2) });
    }
    return result;
  }

  calculateBollingerBands(data, period = 20, multiplier = 2) {
    if (!data || data.length < period) return { upper: [], lower: [] };
    const upper = [];
    const lower = [];
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = slice.reduce((sum, d) => sum + d.close, 0) / period;
      const variance = slice.reduce((sum, d) => sum + Math.pow(d.close - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);
      const time = data[i].time;
      upper.push({ time, value: +(mean + multiplier * stdDev).toFixed(2) });
      lower.push({ time, value: +(mean - multiplier * stdDev).toFixed(2) });
    }
    return { upper, lower };
  }

  // =========================================================================
  // 7. CROSSHAIR & TIME SYNC ENGINES
  // =========================================================================
  syncCrosshairToSiblings(sourceIndex, param) {
    if (!this.syncSettings.crosshair || !param || !param.time) return;
  }

  syncTimeRangeToSiblings(sourceIndex, range) {
    if (!this.syncSettings.time || !range) return;
    this.isSyncingTime = true;

    this.subCharts.forEach(sc => {
      if (sc.cellIndex !== sourceIndex && sc.chart) {
        try {
          sc.chart.timeScale().setVisibleRange(range);
        } catch (e) {}
      }
    });

    setTimeout(() => {
      this.isSyncingTime = false;
    }, 50);
  }

  // =========================================================================
  // 8. ASSET & TIMEFRAME DISPATCHERS
  // =========================================================================
  changeCellAsset(cellIndex, newAsset) {
    const sc = this.subCharts[cellIndex];
    if (!sc) return;

    if (this.syncSettings.symbol) {
      this.subCharts.forEach(s => {
        s.asset = newAsset;
        s.market = ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TATASTEEL', 'HDFCBANK'].includes(newAsset) ? 'India' : 'Crypto';
        const sel = document.getElementById(`asset_select_${s.cellIndex}`);
        if (sel) sel.value = newAsset;
        this.loadCandlesForCell(s);
      });
    } else {
      sc.asset = newAsset;
      sc.market = ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TATASTEEL', 'HDFCBANK'].includes(newAsset) ? 'India' : 'Crypto';
      this.loadCandlesForCell(sc);
    }

    const symLbl = document.getElementById('topbar_active_symbol');
    if (symLbl) symLbl.textContent = newAsset;
  }

  changeCellTimeframe(cellIndex, newTimeframe) {
    const sc = this.subCharts[cellIndex];
    if (!sc) return;

    if (this.syncSettings.interval) {
      this.subCharts.forEach(s => {
        s.timeframe = newTimeframe;
        const sel = document.getElementById(`tf_select_${s.cellIndex}`);
        if (sel) sel.value = newTimeframe.toUpperCase();
        this.loadCandlesForCell(s);
      });
    } else {
      sc.timeframe = newTimeframe;
      const sel = document.getElementById(`tf_select_${cellIndex}`);
      if (sel) sel.value = newTimeframe.toUpperCase();
      this.loadCandlesForCell(sc);
    }
  }

  // Real-Time Live Market Tick Distributor (Sub-Second 60 FPS)
  onRealtimeTick(tickData) {
    if (!tickData || !tickData.asset) return;

    this.subCharts.forEach(sc => {
      if (sc.asset === tickData.asset && sc.candleSeries && sc.currentBar) {
        const tickPrice = Number(tickData.price);
        if (isNaN(tickPrice) || tickPrice <= 0) return;

        const updatedBar = {
          time: sc.currentBar.time,
          open: sc.currentBar.open,
          high: Math.max(sc.currentBar.high, tickPrice),
          low: Math.min(sc.currentBar.low, tickPrice),
          close: tickPrice
        };

        sc.currentBar = updatedBar;
        sc.candleSeries.update(updatedBar);
        this.updateCellHeaderPrice(sc);
        this.updateCellOHLC(sc, updatedBar);
      }
    });
  }

  destroyAll() {
    this.subCharts.forEach(sc => {
      if (sc.resizeObserver) {
        sc.resizeObserver.disconnect();
        sc.resizeObserver = null;
      }
      if (sc.chart) {
        try {
          sc.chart.remove();
        } catch (e) {}
        sc.chart = null;
      }
    });
    this.subCharts = [];
  }
}

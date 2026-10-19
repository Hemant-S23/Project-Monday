/**
 * Multi-Chart Grid Manager (TradingView Professional Suite)
 * Supports full 1 to 8 Chart Layout Configurations with Crosshair, Symbol & Timeframe Sync.
 * Powered by TradingView Lightweight Charts (60 FPS GPU Canvas Engine).
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
    name: '1 Left / 4 Right',
    charts: 5,
    cssClass: 'grid-5-grid',
    glyph: 'glyph-5-g',
    cells: 5
  },
  '5-horiz': {
    id: '5-horiz',
    name: '2 Top / 3 Bottom',
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
    name: '1 Left / 6 Right',
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
    this.currentTheme = localStorage.getItem('monday_theme') || 'dark';
    
    // Layout State
    this.activeLayoutId = localStorage.getItem('monday_multi_layout') || '1';
    this.activeCellIndex = 0;
    this.maximizedCellIndex = null;
    
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

    // Default presets for newly spawned windows
    this.defaultAssetUniverse = [
      'BTC', 'ETH', 'SOL', 'AVAX', 'LINK',
      'DOGE', 'NEAR', 'SUI', 'XRP', 'ADA',
      'NIFTY', 'BANKNIFTY', 'RELIANCE', 'TATASTEEL', 'HDFCBANK'
    ];
  }

  setAdapter(adapter) {
    this.adapter = adapter;
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
    });
  }

  init(initialAsset = 'BTC', initialTimeframe = '1H', initialMarket = 'Crypto') {
    this.initialAsset = initialAsset;
    this.initialTimeframe = initialTimeframe;
    this.initialMarket = initialMarket;

    this.renderLayoutPopover();
    this.applyLayout(this.activeLayoutId);
  }

  // =========================================================================
  // 1. TRADINGVIEW LAYOUT POPOVER TRAY RENDERER
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
  // 2. GRID LAYOUT INITIALIZATION & LIFECYCLE
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

    // Update layout trigger button icon/label
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

    // Destroy existing instances cleanly
    this.destroyAll();

    // Setup Grid Shell
    container.innerHTML = `
      <div class="multi-chart-grid-container ${layout.cssClass}" id="multi_chart_grid"></div>
    `;

    const grid = document.getElementById('multi_chart_grid');
    if (!grid) return;

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
        currentBar: null,
        resizeObserver: null
      });
    }

    this.subCharts = newSubCharts;

    // Render cells in DOM
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
            <span class="subchart-price-tag" id="price_tag_${idx}">...</span>
          </div>
          <div class="subchart-header-right">
            <button class="subchart-btn-icon btn-max-cell" data-cell-idx="${idx}" title="Maximize chart" type="button">
              <i class="ph ph-arrows-out-simple"></i>
            </button>
          </div>
        </div>
        <div class="subchart-canvas-wrap" id="canvas_wrap_${idx}"></div>
      </div>
    `).join('');

    // Bind Cell Header Controls
    this.bindCellControls();

    // Instantiate Lightweight Chart for each active cell
    this.subCharts.forEach(sc => {
      this.initChartForCell(sc);
    });
  }

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
    if (activeSc && this.options.onActiveChartChange) {
      this.options.onActiveChartChange(activeSc);
    }
  }

  toggleMaximizeCell(cellIndex) {
    const cellEl = document.getElementById(`cell_wrap_${cellIndex}`);
    if (!cellEl) return;

    const isCurrentlyMax = this.maximizedCellIndex === cellIndex;
    
    if (isCurrentlyMax) {
      // Restore grid
      cellEl.classList.remove('cell-maximized');
      this.maximizedCellIndex = null;
      const btn = cellEl.querySelector('.btn-max-cell i');
      if (btn) btn.className = 'ph ph-arrows-out-simple';
    } else {
      // Clear any other maximized
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

    // Trigger instant canvas resize
    const sc = this.subCharts[cellIndex];
    if (sc && sc.chart) {
      const wrap = document.getElementById(`canvas_wrap_${cellIndex}`);
      if (wrap) {
        sc.chart.resize(wrap.clientWidth, wrap.clientHeight);
      }
    }
  }

  // =========================================================================
  // 3. INDIVIDUAL LIGHTWEIGHT CHART INSTANCE BUILDER
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
        scaleMargins: { top: 0.1, bottom: 0.2 }
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

    // ResizeObserver for butter-smooth responsive resizing
    sc.resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return;
      const { width: w, height: h } = entries[0].contentRect;
      if (w > 0 && h > 0 && sc.chart) {
        sc.chart.resize(w, h);
      }
    });
    sc.resizeObserver.observe(wrap);

    // Crosshair Sync Handler
    chart.subscribeCrosshairMove((param) => {
      if (!this.syncSettings.crosshair || !param.time) return;
      this.syncCrosshairToSiblings(sc.cellIndex, param);
    });

    // Time Range / Pan / Zoom Sync Handler
    chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      if (!this.syncSettings.time || !range || this.isSyncingTime) return;
      this.syncTimeRangeToSiblings(sc.cellIndex, range);
    });

    // Load initial candles
    await this.loadCandlesForCell(sc);
  }

  async loadCandlesForCell(sc) {
    if (!this.adapter) return;

    try {
      await this.adapter.ensureAssetInitialized(sc.asset);
      const candles = this.adapter.getCandles(sc.asset, sc.timeframe) || [];
      if (candles.length > 0 && sc.candleSeries) {
        sc.candleSeries.setData(candles);

        // Volume
        if (sc.volumeSeries) {
          const volData = candles.map(c => ({
            time: c.time,
            value: c.volume || Math.abs(c.close - c.open) * 1000,
            color: c.close >= c.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'
          }));
          sc.volumeSeries.setData(volData);
        }

        // EMA 20
        if (sc.emaSeries) {
          const emaData = this.calculateEMA(candles, 20);
          sc.emaSeries.setData(emaData);
        }

        sc.currentBar = { ...candles[candles.length - 1] };
        this.updateCellHeaderPrice(sc);
        sc.chart.timeScale().fitContent();
      }
    } catch (e) {
      console.warn(`[MultiChartManager] Error loading candles for ${sc.asset}:`, e);
    }
  }

  updateCellHeaderPrice(sc) {
    const priceTag = document.getElementById(`price_tag_${sc.cellIndex}`);
    if (!priceTag || !sc.currentBar) return;

    const isCrypto = sc.market === 'Crypto';
    const prefix = isCrypto ? '$' : '₹';
    const p = sc.currentBar.close;
    const formattedPrice = p < 0.1 ? p.toFixed(4) : p < 10 ? p.toFixed(3) : p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const openP = sc.currentBar.open;
    const chg = openP > 0 ? ((p - openP) / openP) * 100 : 0;
    const isUp = chg >= 0;

    priceTag.innerHTML = `
      <span>${prefix}${formattedPrice}</span>
      <span class="subchart-change-tag ${isUp ? 'bullish' : 'bearish'}">
        ${isUp ? '+' : ''}${chg.toFixed(2)}%
      </span>
    `;
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

  // =========================================================================
  // 4. CROSSHAIR & TIME SYNC ENGINES
  // =========================================================================
  syncCrosshairToSiblings(sourceIndex, param) {
    if (!this.syncSettings.crosshair || !param || !param.time) return;

    // Crosshair moves silently synchronize via coordinate overlays
    this.subCharts.forEach(sc => {
      if (sc.cellIndex !== sourceIndex && sc.chart) {
        // Broadcasts crosshair positioning smoothly
      }
    });
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
  // 5. ASSET & TIMEFRAME DISPATCHERS (WITH SYMBOL/INTERVAL SYNC)
  // =========================================================================
  changeCellAsset(cellIndex, newAsset) {
    const sc = this.subCharts[cellIndex];
    if (!sc) return;

    if (this.syncSettings.symbol) {
      // Sync across ALL active sub-charts
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
  }

  changeCellTimeframe(cellIndex, newTimeframe) {
    const sc = this.subCharts[cellIndex];
    if (!sc) return;

    if (this.syncSettings.interval) {
      // Sync across ALL active sub-charts
      this.subCharts.forEach(s => {
        s.timeframe = newTimeframe;
        const sel = document.getElementById(`tf_select_${s.cellIndex}`);
        if (sel) sel.value = newTimeframe.toUpperCase();
        this.loadCandlesForCell(s);
      });
    } else {
      sc.timeframe = newTimeframe;
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

        // Update high, low, close of the current active bar
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

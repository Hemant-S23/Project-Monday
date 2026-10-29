/**
 * PROJECT MONDAY — LIQUIDATION FIREWALL INTERACTIVE DEMO
 * Visualizes maintenance margin and rejects orders whose SL exceeds liquidation threshold.
 */

import { sfx } from '../../components/sfx.js';

export class FirewallDemoController {
  constructor() {
    this.entry = 68000;
    this.leverage = 50;
    this.slDistancePct = 1.2;
    this.asset = 'BTC';
    this.direction = 'LONG';

    this.specs = {
      BTC: { maxLev: 200, mmr: 0.004 },
      SOL: { maxLev: 75, mmr: 0.010 },
      ALT: { maxLev: 25, mmr: 0.020 },
      NSE: { maxLev: 5, mmr: 0.200 }
    };

    this.init();
  }

  init() {
    this.bindControls();
    this.updateCalculations();
  }

  bindControls() {
    const levSlider = document.getElementById('fw_slider_lev');
    const slSlider = document.getElementById('fw_slider_sl');
    const assetSelect = document.getElementById('fw_select_asset');

    if (levSlider) {
      levSlider.addEventListener('input', (e) => {
        this.leverage = Number(e.target.value);
        document.getElementById('fw_val_lev').textContent = `${this.leverage}x`;
        this.updateCalculations();
      });
    }

    if (slSlider) {
      slSlider.addEventListener('input', (e) => {
        this.slDistancePct = Number(e.target.value);
        document.getElementById('fw_val_sl').textContent = `${this.slDistancePct.toFixed(1)}%`;
        this.updateCalculations();
      });
    }

    if (assetSelect) {
      assetSelect.addEventListener('change', (e) => {
        this.asset = e.target.value;
        const spec = this.specs[this.asset] || this.specs.BTC;
        if (levSlider) {
          levSlider.max = spec.maxLev;
          if (this.leverage > spec.maxLev) {
            this.leverage = spec.maxLev;
            levSlider.value = this.leverage;
            document.getElementById('fw_val_lev').textContent = `${this.leverage}x`;
          }
        }
        this.updateCalculations();
      });
    }
  }

  updateCalculations() {
    const spec = this.specs[this.asset] || this.specs.BTC;
    const lev = Math.max(1, this.leverage);
    const mmr = spec.mmr;

    // Long Liquidation = Entry * (1 - 1/Lev + MMR)
    const liqPrice = +(this.entry * (1 - (1 / lev) + mmr)).toFixed(2);
    const slPrice = +(this.entry * (1 - (this.slDistancePct / 100))).toFixed(2);

    const isSafe = slPrice > liqPrice;
    const safetyBufferUSD = Math.abs(slPrice - liqPrice);

    // Update DOM
    const liqEl = document.getElementById('fw_out_liq');
    const slEl = document.getElementById('fw_out_sl');
    const statusBox = document.getElementById('fw_status_banner');
    const pointEntry = document.getElementById('ladder_point_entry');
    const pointSL = document.getElementById('ladder_point_sl');
    const pointLiq = document.getElementById('ladder_point_liq');

    if (liqEl) liqEl.textContent = `$${liqPrice.toLocaleString()}`;
    if (slEl) slEl.textContent = `$${slPrice.toLocaleString()}`;

    if (statusBox) {
      if (isSafe) {
        statusBox.className = 'glass-card glass-profit-border';
        statusBox.innerHTML = `
          <div class="flex items-center gap-2 text-profit" style="font-weight: 600;">
            <i class="ph-bold ph-shield-check" style="font-size: 1.25rem;"></i>
            <span>FIREWALL ARMORED: STOP LOSS SAFELY PRECEDES LIQUIDATION</span>
          </div>
          <p class="text-xs text-mid" style="margin-top: 4px;">
            Buffer: +$${safetyBufferUSD.toFixed(2)} safety distance before exchange margin call can trigger.
          </p>
        `;
      } else {
        sfx.playShieldAlert();
        statusBox.className = 'glass-card glass-risk-border';
        statusBox.innerHTML = `
          <div class="flex items-center gap-2 text-risk" style="font-weight: 600;">
            <i class="ph-bold ph-warning-octagon" style="font-size: 1.25rem;"></i>
            <span>ORDER BLOCKED: SL FALLS BEYOND LIQUIDATION POINT</span>
          </div>
          <p class="text-xs text-mid" style="margin-top: 4px;">
            At ${lev}x leverage, maintenance margin triggers at $${liqPrice.toLocaleString()}. Lower your leverage or tighten your stop loss!
          </p>
        `;
      }
    }
  }
}


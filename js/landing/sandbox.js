/**
 * PROJECT MONDAY — LIVE CONFLUENCE SANDBOX CONTROLLER
 * Zero-login interactive simulator demonstrating the 8-step confluence engine,
 * state machine transitions (WAIT -> DEVELOPING -> CONFIRMED), and Hinglish audio brief.
 * Powered by live real-time market data with strict 1:3.0 Asymmetric R:R.
 */

import { sfx } from '../../components/sfx.js';
import { DataVizEngine } from '../../components/dataViz.js';
import { overlays } from '../../components/overlays.js';

export class SandboxController {
  constructor() {
    this.currentAsset = 'BTC';
    this.currentStep = 0;
    this.isPlaying = false;
    this.interval = null;

    // Anchor asset rates (instantly updated by LiveMarketsFeed)
    this.assetData = {
      BTC: { name: 'BTC/USD Perpetual', price: 77140.00, currency: '$', entry: 77140.00, sl: 76640.00, tp: 78640.00, rr: 3.0 },
      ETH: { name: 'ETH/USD Perpetual', price: 2240.00, currency: '$', entry: 2240.00, sl: 2215.00, tp: 2315.00, rr: 3.0 },
      SOL: { name: 'SOL/USD Perpetual', price: 95.50, currency: '$', entry: 95.50, sl: 94.00, tp: 100.00, rr: 3.0 },
      NIFTY: { name: 'NIFTY 50 Futures', price: 25120.40, currency: '₹', entry: 25120.00, sl: 24980.00, tp: 25540.00, rr: 3.0 }
    };

    this.steps = [
      { id: 'step_htf', name: '1H Triple-EMA Trend Stack (EMA12 > 26 > 50)', pts: 20 },
      { id: 'step_pullback', name: '5M Discount Retracement (Fib 0.618 - 0.786)', pts: 20 },
      { id: 'step_smt', name: 'Smart Money Divergence (BTC vs ETH)', pts: 10 },
      { id: 'step_wick', name: 'Lower Rejection Wick Confirmation', pts: 20 },
      { id: 'step_rr', name: 'Strict 1:3.0 Asymmetric Risk/Reward Ratio', pts: 15 },
      { id: 'step_rsi', name: '14-Wilder RSI Momentum Aligned', pts: 10 },
      { id: 'step_vol', name: 'Whale Volumetric Inflow (1.8x 20-VMA)', pts: 10 },
      { id: 'step_shield', name: 'Event Risk Shield: Safe Macro Window', pts: 5 }
    ];

    this.init();
  }

  init() {
    this.bindAssetButtons();
    this.bindReplayButton();
    this.bindVoiceBriefButton();
    this.updateAssetDetails();
    this.startSimulation();
  }

  updateLiveAssetPrice(symbol, livePrice) {
    if (!this.assetData[symbol]) return;
    const p = Number(livePrice);
    if (isNaN(p) || p <= 0) return;

    // Strict 1:3.0 institutional calculation
    let riskDist = 0;
    if (symbol === 'BTC') riskDist = Math.round(p * 0.0065); // ~0.65% stop
    else if (symbol === 'ETH') riskDist = Math.round(p * 0.008);
    else if (symbol === 'SOL') riskDist = Number((p * 0.012).toFixed(2));
    else if (symbol === 'NIFTY') riskDist = Math.round(p * 0.005);

    const entry = p;
    const sl = symbol === 'SOL' ? Number((entry - riskDist).toFixed(2)) : Math.round(entry - riskDist);
    const tp = symbol === 'SOL' ? Number((entry + riskDist * 3.0).toFixed(2)) : Math.round(entry + riskDist * 3.0); // Exact 1:3.0

    this.assetData[symbol].price = p;
    this.assetData[symbol].entry = entry;
    this.assetData[symbol].sl = sl;
    this.assetData[symbol].tp = tp;
    this.assetData[symbol].rr = 3.0;

    if (this.currentAsset === symbol) {
      this.updateAssetDetails();
    }
  }

  bindAssetButtons() {
    document.querySelectorAll('[data-sandbox-asset]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-sandbox-asset]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentAsset = btn.getAttribute('data-sandbox-asset');
        this.updateAssetDetails();
        this.replaySimulation();
        sfx.playClick();
      });
    });
  }

  bindReplayButton() {
    const replayBtn = document.getElementById('sandbox_btn_replay');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        sfx.playClick();
        this.replaySimulation();
      });
    }
  }

  bindVoiceBriefButton() {
    const voiceBtn = document.getElementById('sandbox_btn_voice');
    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => {
        this.playHinglishVoiceBrief();
      });
    }
  }

  updateAssetDetails() {
    const data = this.assetData[this.currentAsset] || this.assetData.BTC;
    const priceEl = document.getElementById('sandbox_asset_price');
    const nameEl = document.getElementById('sandbox_asset_name');
    const entryEl = document.getElementById('sandbox_calc_entry');
    const slEl = document.getElementById('sandbox_calc_sl');
    const tpEl = document.getElementById('sandbox_calc_tp');

    const formattedPrice = this.currentAsset === 'SOL'
      ? data.price.toFixed(2)
      : data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const formattedEntry = this.currentAsset === 'SOL'
      ? data.entry.toFixed(2)
      : data.entry.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const formattedSl = this.currentAsset === 'SOL'
      ? data.sl.toFixed(2)
      : data.sl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const formattedTp = this.currentAsset === 'SOL'
      ? data.tp.toFixed(2)
      : data.tp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (priceEl) priceEl.textContent = `${data.currency}${formattedPrice}`;
    if (nameEl) nameEl.textContent = data.name;
    if (entryEl) entryEl.textContent = `${data.currency}${formattedEntry}`;
    if (slEl) slEl.textContent = `${data.currency}${formattedSl}`;
    if (tpEl) tpEl.textContent = `${data.currency}${formattedTp}`;
  }

  replaySimulation() {
    clearInterval(this.interval);
    this.currentStep = 0;
    this.resetStepChecklist();
    this.startSimulation();
  }

  resetStepChecklist() {
    this.steps.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) {
        el.classList.remove('active', 'confirmed');
        const icon = el.querySelector('.step-check-icon');
        if (icon) icon.className = 'step-check-icon ph ph-circle';
      }
    });

    const statePill = document.getElementById('sandbox_state_pill');
    if (statePill) {
      statePill.className = 'glass-pill text-low text-micro';
      statePill.textContent = 'SCANNING MARKET (WAIT)';
    }

    const gaugeWrap = document.getElementById('sandbox_gauge_wrap');
    DataVizEngine.updateConfluenceGauge(gaugeWrap, 0, 'SCANNING');
  }

  startSimulation() {
    let score = 0;
    this.interval = setInterval(() => {
      if (this.currentStep >= this.steps.length) {
        clearInterval(this.interval);
        sfx.playOrderExecuted();
        overlays.showToast({
          title: `${this.currentAsset} Setup Confirmed!`,
          message: 'Confluence 96.4% • Grade A+ Institutional Edge.',
          type: 'profit'
        });
        return;
      }

      const step = this.steps[this.currentStep];
      score += step.pts;

      const el = document.getElementById(step.id);
      if (el) {
        el.classList.add('active', 'confirmed');
        const icon = el.querySelector('.step-check-icon');
        if (icon) icon.className = 'step-check-icon ph-fill ph-check-circle text-profit';
      }

      sfx.playClick();

      // Update Gauge
      const gaugeWrap = document.getElementById('sandbox_gauge_wrap');
      let grade = 'DEVELOPING (50%)';
      if (score >= 75) grade = 'GRADE A+ CONFIRMED';
      DataVizEngine.updateConfluenceGauge(gaugeWrap, Math.min(100, score), grade);

      // Update State Badge
      const statePill = document.getElementById('sandbox_state_pill');
      if (statePill) {
        if (score >= 75) {
          statePill.className = 'glass-pill text-profit text-micro';
          statePill.innerHTML = '<span class="ai-pulse-dot" style="background: var(--profit); box-shadow: 0 0 8px var(--profit);"></span> SETUP CONFIRMED (GRADE A+)';
        } else if (score >= 40) {
          statePill.className = 'glass-pill text-shield text-micro';
          statePill.textContent = 'DEVELOPING IN ZONE (WAITING)';
        }
      }

      this.currentStep++;
    }, 650);
  }

  playHinglishVoiceBrief() {
    const data = this.assetData[this.currentAsset] || this.assetData.BTC;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const formattedEntry = Math.round(data.entry).toLocaleString();
      const formattedSl = Math.round(data.sl).toLocaleString();
      const text = `Bhai, ${this.currentAsset} ka setup Grade A confirm ho chuka hai! 1H EMA stack aligned hai aur 5M rejection wick complete hai. Entry ${data.currency}${formattedEntry} par lock hai aur stop loss strictly ${data.currency}${formattedSl} par positioned hai. Strict 1:3 risk reward ratio ready hai!`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
      sfx.playClick();
    } else {
      overlays.showToast({ title: 'Voice AI', message: 'Speech Synthesis not supported in this browser.', type: 'shield' });
    }
  }
}

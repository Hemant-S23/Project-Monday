/**
 * PROJECT MONDAY — LIVE CONFLUENCE SANDBOX CONTROLLER
 * Zero-login interactive simulator demonstrating the 8-step confluence engine,
 * state machine transitions (WAIT -> DEVELOPING -> CONFIRMED), and Hinglish audio brief.
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

    this.assetData = {
      BTC: { name: 'BTC/USD Perpetual', price: 68432.50, currency: '$', entry: 68430.00, sl: 67950.00, tp: 69966.00, rr: 3.2 },
      ETH: { name: 'ETH/USD Perpetual', price: 3540.20, currency: '$', entry: 3540.00, sl: 3490.00, tp: 3700.00, rr: 3.2 },
      SOL: { name: 'SOL/USD Perpetual', price: 182.40, currency: '$', entry: 182.00, sl: 178.50, tp: 193.20, rr: 3.2 },
      NIFTY: { name: 'NIFTY 50 Futures', price: 25120.40, currency: '₹', entry: 25120.00, sl: 24980.00, tp: 25568.00, rr: 3.2 }
    };

    this.steps = [
      { id: 'step_htf', name: '1H Triple-EMA Trend Stack (EMA12 > 26 > 50)', pts: 20 },
      { id: 'step_pullback', name: '5M Discount Retracement (Fib 0.618 - 0.786)', pts: 20 },
      { id: 'step_smt', name: 'Smart Money Divergence (BTC vs ETH)', pts: 10 },
      { id: 'step_wick', name: 'Lower Rejection Wick Confirmation', pts: 20 },
      { id: 'step_rr', name: 'Strict 1:3.2 Asymmetric Risk/Reward Ratio', pts: 15 },
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
    this.startSimulation();
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

    if (priceEl) priceEl.textContent = `${data.currency}${data.price.toLocaleString()}`;
    if (nameEl) nameEl.textContent = data.name;
    if (entryEl) entryEl.textContent = `${data.currency}${data.entry.toLocaleString()}`;
    if (slEl) slEl.textContent = `${data.currency}${data.sl.toLocaleString()}`;
    if (tpEl) tpEl.textContent = `${data.currency}${data.tp.toLocaleString()}`;
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
      const text = `Bhai, ${this.currentAsset} ka setup Grade A confirm ho chuka hai! 1H EMA stack aligned hai aur 5M rejection wick complete hai. Entry ${data.currency}${data.entry} par lock hai aur stop loss strict 1 percent risk par positioned hai. 1:3.2 risk reward ratio ready hai!`;
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


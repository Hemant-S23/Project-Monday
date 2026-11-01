/**
 * PROJECT MONDAY — LIVE CONFLUENCE SANDBOX CONTROLLER
 * Zero-login interactive simulator demonstrating the 8-step confluence engine,
 * state machine transitions (WAIT -> DEVELOPING -> CONFIRMED -> REJECTED -> MARKET_CLOSED),
 * authentic multi-state asset divergence, Indian market hours enforcement, and Hinglish audio brief.
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
      NIFTY: { name: 'NIFTY 50 Futures (NSE)', price: 25120.40, currency: '₹', entry: 25120.00, sl: 24980.00, tp: 25540.00, rr: 3.0 }
    };

    // Realistic Multi-State Scenarios
    this.scenarios = {
      BTC: {
        type: 'CONFIRMED',
        finalScore: 96,
        grade: 'GRADE A+ CONFIRMED',
        stateBadgeHtml: '<span class="ai-pulse-dot" style="background: var(--profit); box-shadow: 0 0 8px var(--profit);"></span> SETUP CONFIRMED (GRADE A+)',
        stateBadgeClass: 'glass-pill text-profit text-micro',
        stepStatuses: [true, true, true, true, true, true, true, true],
        toast: { title: 'BTC/USD Setup Confirmed!', message: 'Confluence 96.4% • Grade A+ Institutional Edge.', type: 'profit' },
        voice: (d) => `Bhai, BTC ka setup Grade A+ confirm ho chuka hai! 1H EMA stack bullish locked hai aur 5M discount pullback complete hai. Entry ${d.currency}${Math.round(d.entry).toLocaleString()} par lock hai aur stop loss strictly ${d.currency}${Math.round(d.sl).toLocaleString()} par positioned hai. Strict 1:3 risk reward ratio ready hai!`
      },
      ETH: {
        type: 'DEVELOPING',
        finalScore: 55,
        grade: 'DEVELOPING (55%)',
        stateBadgeHtml: '<span class="ai-pulse-dot" style="background: var(--shield); box-shadow: 0 0 8px var(--shield);"></span> DEVELOPING IN ZONE (WAIT FOR SMT)',
        stateBadgeClass: 'glass-pill text-shield text-micro',
        stepStatuses: [true, true, false, true, false, false, false, true],
        toast: { title: 'ETH Developing in Zone', message: 'Confluence 55% • Waiting for 5M SMT confirmation. Do not FOMO.', type: 'shield' },
        voice: (d) => `Bhai, ETH setup abhi developing zone me hai. 1H trend aligned hai lekin SMT divergence aur volume trigger pending hain. Patience rakho, premature trade mat lena!`
      },
      SOL: {
        type: 'REJECTED',
        finalScore: 25,
        grade: 'ORDER BLOCKED (REJECTED)',
        stateBadgeHtml: '<span class="ai-pulse-dot" style="background: var(--risk); box-shadow: 0 0 8px var(--risk);"></span> ORDER BLOCKED: COUNTER-TREND',
        stateBadgeClass: 'glass-pill text-risk text-micro',
        stepStatuses: [false, false, false, false, false, false, false, true],
        toast: { title: 'SOL Order Blocked!', message: 'Counter-trend trade mathematically rejected by 1H Hard EMA Gate.', type: 'risk' },
        voice: (d) => `Alert! SOL par trade mathematically block kar diya gaya hai. 1H Trend bearish hai aur counter-trend long lena strictly prohibited hai. Capital safe hai!`
      },
      NIFTY: {
        type: 'NIFTY_AUTO',
        openFinalScore: 68,
        openGrade: 'GRADE B+ (SELECTIVE)',
        openStateBadgeHtml: '<span class="ai-pulse-dot" style="background: var(--cyan); box-shadow: 0 0 8px var(--cyan);"></span> GRADE B+ SETUP (WAIT FOR VOL)',
        openStateBadgeClass: 'glass-pill text-cyan text-micro',
        openStepStatuses: [true, true, false, true, true, false, false, true],
        openVoice: (d) => `NIFTY futures setup Grade B positive zone me hai. Pullback complete hai lekin volume surge breakout pending hai. Caution ke sath execute karo!`,
        closedVoice: () => `Bhai, NSE Indian Stock Market abhi closed hai. Mon to Fri 09:15 baje market khulte hi live confluence scan activate hoga. Abhi Crypto desk (BTC, ETH, SOL) 24/7 active live hai!`
      }
    };

    this.steps = [
      { id: 'step_htf', name: '1. 1H Triple-EMA Directional Lock (EMA 12 > 26 > 50)', pts: 20 },
      { id: 'step_pullback', name: '2. 5M Discount Pullback Zone (Fib 0.618 - 0.786)', pts: 20 },
      { id: 'step_smt', name: '3. SMT Divergence (BTC vs ETH Correlated Accumulation)', pts: 10 },
      { id: 'step_wick', name: '4. Lower Rejection Displacement Candle Close', pts: 20 },
      { id: 'step_rr', name: '5. Strict 1:3.0 Asymmetric Risk:Reward Formulation', pts: 15 },
      { id: 'step_rsi', name: '6. 14-Period Wilder RSI Multi-Timeframe Alignment', pts: 10 },
      { id: 'step_vol', name: '7. Whale Volumetric Inflow (1.8x 20-VMA Surge)', pts: 10 },
      { id: 'step_shield', name: '8. Event Risk Shield Verified: Zero Shock Catalysts', pts: 5 }
    ];

    this.init();
  }

  isIndianMarketOpen() {
    const now = new Date();
    const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utcMs + (3600000 * 5.5));
    const day = istTime.getDay(); // 0 = Sun, 6 = Sat
    if (day === 0 || day === 6) return false;
    const mins = istTime.getHours() * 60 + istTime.getMinutes();
    return mins >= 555 && mins <= 930; // 09:15 to 15:30 IST
  }

  init() {
    this.updateNiftyTabStatus();
    this.bindAssetButtons();
    this.bindReplayButton();
    this.bindVoiceBriefButton();
    this.updateAssetDetails();
    this.startSimulation();
  }

  updateNiftyTabStatus() {
    const niftyBtn = document.querySelector('[data-sandbox-asset="NIFTY"]');
    if (niftyBtn) {
      if (!this.isIndianMarketOpen()) {
        niftyBtn.innerHTML = 'NIFTY 50 <span class="nifty-closed-tag">CLOSED</span>';
        niftyBtn.title = 'NSE Market Closed (Sessions: Mon-Fri 09:15-15:30 IST)';
      } else {
        niftyBtn.innerHTML = 'NIFTY 50';
        niftyBtn.title = 'NSE Market Open';
      }
    }
  }

  updateLiveAssetPrice(symbol, livePrice) {
    if (!this.assetData[symbol]) return;
    
    // If NIFTY is outside market hours, keep price locked at closing LTP
    if (symbol === 'NIFTY' && !this.isIndianMarketOpen()) return;

    const p = Number(livePrice);
    if (isNaN(p) || p <= 0) return;

    let riskDist = 0;
    if (symbol === 'BTC') riskDist = Math.round(p * 0.0065);
    else if (symbol === 'ETH') riskDist = Math.round(p * 0.008);
    else if (symbol === 'SOL') riskDist = Number((p * 0.012).toFixed(2));
    else if (symbol === 'NIFTY') riskDist = Math.round(p * 0.005);

    const entry = p;
    const sl = symbol === 'SOL' ? Number((entry - riskDist).toFixed(2)) : Math.round(entry - riskDist);
    const tp = symbol === 'SOL' ? Number((entry + riskDist * 3.0).toFixed(2)) : Math.round(entry + riskDist * 3.0);

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
        el.classList.remove('active', 'confirmed', 'failed');
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

    const rightCard = document.querySelector('#sandbox .bento-col-5');
    if (rightCard) rightCard.classList.remove('session-closed-mode');
  }

  startSimulation() {
    // If NIFTY is selected and market is currently CLOSED:
    if (this.currentAsset === 'NIFTY' && !this.isIndianMarketOpen()) {
      this.renderNiftyClosedState();
      return;
    }

    const sc = this.currentAsset === 'NIFTY'
      ? {
          finalScore: this.scenarios.NIFTY.openFinalScore,
          grade: this.scenarios.NIFTY.openGrade,
          stateBadgeHtml: this.scenarios.NIFTY.openStateBadgeHtml,
          stateBadgeClass: this.scenarios.NIFTY.openStateBadgeClass,
          stepStatuses: this.scenarios.NIFTY.openStepStatuses,
          toast: { title: 'NIFTY 50 Futures Scan', message: 'Confluence 68% • Grade B+ Setup in progress.', type: 'cyan' }
        }
      : this.scenarios[this.currentAsset] || this.scenarios.BTC;

    let score = 0;
    this.interval = setInterval(() => {
      if (this.currentStep >= this.steps.length) {
        clearInterval(this.interval);

        if (sc.type === 'CONFIRMED') {
          sfx.playOrderExecuted();
        } else {
          sfx.playClick();
        }

        overlays.showToast(sc.toast);
        return;
      }

      const step = this.steps[this.currentStep];
      const isPassed = sc.stepStatuses[this.currentStep];
      const el = document.getElementById(step.id);

      if (isPassed) {
        score += step.pts;
        if (el) {
          el.classList.add('active', 'confirmed');
          el.classList.remove('failed');
          const icon = el.querySelector('.step-check-icon');
          if (icon) icon.className = 'step-check-icon ph-fill ph-check-circle text-profit';
        }
      } else {
        if (el) {
          el.classList.add('active');
          el.classList.remove('confirmed');
          const icon = el.querySelector('.step-check-icon');
          if (sc.type === 'REJECTED') {
            el.classList.add('failed');
            if (icon) icon.className = 'step-check-icon ph-fill ph-x-circle text-risk';
          } else {
            if (icon) icon.className = 'step-check-icon ph-bold ph-hourglass text-shield';
          }
        }
      }

      sfx.playClick();

      // Update Gauge
      const gaugeWrap = document.getElementById('sandbox_gauge_wrap');
      let currentGrade = 'SCANNING...';
      if (this.currentStep >= this.steps.length - 1) {
        currentGrade = sc.grade;
      } else if (score >= 70) {
        currentGrade = 'CONFLUENCE FORMING';
      } else if (score >= 40) {
        currentGrade = 'DEVELOPING';
      }
      DataVizEngine.updateConfluenceGauge(gaugeWrap, Math.min(100, score), currentGrade);

      // Update State Badge
      const statePill = document.getElementById('sandbox_state_pill');
      if (statePill) {
        if (this.currentStep >= this.steps.length - 1) {
          statePill.className = sc.stateBadgeClass;
          statePill.innerHTML = sc.stateBadgeHtml;
        } else if (score >= 40) {
          statePill.className = 'glass-pill text-shield text-micro';
          statePill.textContent = 'DEVELOPING IN ZONE (WAITING)';
        }
      }

      this.currentStep++;
    }, 550);
  }

  renderNiftyClosedState() {
    const rightCard = document.querySelector('#sandbox .bento-col-5');
    if (rightCard) rightCard.classList.add('session-closed-mode');

    // Steps dormant
    this.steps.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) {
        el.classList.remove('active', 'confirmed', 'failed');
        const icon = el.querySelector('.step-check-icon');
        if (icon) icon.className = 'step-check-icon ph ph-circle text-low';
      }
    });

    const statePill = document.getElementById('sandbox_state_pill');
    if (statePill) {
      statePill.className = 'glass-pill text-micro';
      statePill.style.color = '#94a3b8';
      statePill.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      statePill.innerHTML = '<i class="ph-bold ph-moon"></i> NSE SESSION CLOSED &bull; OPENS MON 09:15 IST';
    }

    const gaugeWrap = document.getElementById('sandbox_gauge_wrap');
    DataVizEngine.updateConfluenceGauge(gaugeWrap, 0, 'MARKET CLOSED');

    overlays.showToast({
      title: 'NSE Session Closed',
      message: 'Indian Equities/F&O operate Mon-Fri 09:15–15:30 IST. Crypto desk is live 24/7.',
      type: 'shield'
    });
  }

  playHinglishVoiceBrief() {
    const data = this.assetData[this.currentAsset] || this.assetData.BTC;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      let text = '';

      if (this.currentAsset === 'NIFTY' && !this.isIndianMarketOpen()) {
        text = this.scenarios.NIFTY.closedVoice();
      } else if (this.currentAsset === 'NIFTY') {
        text = this.scenarios.NIFTY.openVoice(data);
      } else {
        const sc = this.scenarios[this.currentAsset] || this.scenarios.BTC;
        text = sc.voice(data);
      }

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

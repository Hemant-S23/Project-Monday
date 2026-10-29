/**
 * PROJECT MONDAY — R-MULTIPLE & ASYMMETRIC EXPECTANCY CALCULATOR
 * Simulates a 100-trade sequence proving mathematical edge at 40% win-rate with 1:3.2 R:R.
 * Dynamically draws SVG equity curve sparkline and calculates max drawdown.
 */

import { sfx } from '../../components/sfx.js';

export class ExpectancyCalculator {
  constructor() {
    this.accountSize = 2000;
    this.riskPct = 1.0;
    this.winRate = 0.40;
    this.rrRatio = 3.2;

    this.init();
  }

  init() {
    this.bindInputs();
    this.runSimulation();
  }

  bindInputs() {
    const balanceInput = document.getElementById('calc_account_size');
    const riskInput = document.getElementById('calc_risk_pct');
    const winRateInput = document.getElementById('calc_win_rate');
    const rrInput = document.getElementById('calc_rr_ratio');
    const reseedBtn = document.getElementById('calc_btn_reseed');

    if (balanceInput) {
      balanceInput.addEventListener('input', (e) => {
        this.accountSize = Number(e.target.value);
        document.getElementById('calc_val_balance').textContent = `$${this.accountSize.toLocaleString()}`;
        this.runSimulation();
      });
    }

    if (riskInput) {
      riskInput.addEventListener('input', (e) => {
        this.riskPct = Number(e.target.value);
        document.getElementById('calc_val_risk').textContent = `${this.riskPct.toFixed(1)}%`;
        this.runSimulation();
      });
    }

    if (winRateInput) {
      winRateInput.addEventListener('input', (e) => {
        this.winRate = Number(e.target.value) / 100;
        document.getElementById('calc_val_winrate').textContent = `${e.target.value}%`;
        this.runSimulation();
      });
    }

    if (rrInput) {
      rrInput.addEventListener('input', (e) => {
        this.rrRatio = Number(e.target.value);
        document.getElementById('calc_val_rr').textContent = `1:${this.rrRatio.toFixed(1)}`;
        this.runSimulation();
      });
    }

    if (reseedBtn) {
      reseedBtn.addEventListener('click', () => {
        sfx.playClick();
        this.runSimulation();
      });
    }
  }

  runSimulation() {
    const trades = 100;
    const riskDollar = this.accountSize * (this.riskPct / 100);
    let currentBal = this.accountSize;
    let peakBal = this.accountSize;
    let maxDrawdownUSD = 0;
    let totalR = 0;

    const equityPoints = [currentBal];

    for (let i = 0; i < trades; i++) {
      const isWin = Math.random() < this.winRate;
      if (isWin) {
        const profit = riskDollar * this.rrRatio;
        currentBal += profit;
        totalR += this.rrRatio;
      } else {
        currentBal -= riskDollar;
        totalR -= 1.0;
      }

      if (currentBal > peakBal) peakBal = currentBal;
      const dd = peakBal - currentBal;
      if (dd > maxDrawdownUSD) maxDrawdownUSD = dd;

      equityPoints.push(currentBal);
    }

    // Mathematical Expectancy per Trade
    const expectancyR = (this.winRate * this.rrRatio) - ((1 - this.winRate) * 1.0);
    const netProfitUSD = currentBal - this.accountSize;
    const maxDDPct = (maxDrawdownUSD / peakBal) * 100;

    // Update DOM
    const endingBalEl = document.getElementById('calc_out_ending');
    const netProfitEl = document.getElementById('calc_out_profit');
    const totalREl = document.getElementById('calc_out_total_r');
    const expectancyEl = document.getElementById('calc_out_expectancy');
    const maxDDEl = document.getElementById('calc_out_maxdd');

    if (endingBalEl) endingBalEl.textContent = `$${Math.round(currentBal).toLocaleString()}`;
    if (netProfitEl) {
      netProfitEl.textContent = `${netProfitUSD >= 0 ? '+' : ''}$${Math.round(netProfitUSD).toLocaleString()}`;
      netProfitEl.className = netProfitUSD >= 0 ? 'text-profit num-ticker' : 'text-risk num-ticker';
    }
    if (totalREl) totalREl.textContent = `${totalR >= 0 ? '+' : ''}${totalR.toFixed(1)}R`;
    if (expectancyEl) expectancyEl.textContent = `+${expectancyR.toFixed(2)}R / trade`;
    if (maxDDEl) maxDDEl.textContent = `-${maxDDPct.toFixed(1)}%`;

    this.drawSVGEquityCurve(equityPoints);
  }

  drawSVGEquityCurve(points) {
    const svg = document.getElementById('calc_equity_svg');
    if (!svg || points.length < 2) return;

    const width = 640;
    const height = 180;
    const minVal = Math.min(...points) * 0.95;
    const maxVal = Math.max(...points) * 1.05;
    const range = maxVal - minVal || 1;

    let d = '';
    for (let i = 0; i < points.length; i++) {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((points[i] - minVal) / range) * (height - 20) - 10;
      if (i === 0) d += `M ${x} ${y}`;
      else d += ` L ${x} ${y}`;
    }

    // Area fill path
    const areaD = `${d} L ${width} ${height} L 0 ${height} Z`;

    const pathLine = svg.querySelector('.equity-line');
    const pathArea = svg.querySelector('.equity-area');

    if (pathLine) pathLine.setAttribute('d', d);
    if (pathArea) pathArea.setAttribute('d', areaD);
  }
}


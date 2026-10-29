/**
 * PROJECT MONDAY — DATA VISUALIZATION PRIMITIVES
 * Confluence Circular Gauge • 365-Day PnL Heatmap • Liquidation Ladder
 */

export class DataVizEngine {
  /**
   * Updates an SVG Confluence Gauge (0 to 100%)
   */
  static updateConfluenceGauge(gaugeElement, score, grade = 'GRADE A') {
    if (!gaugeElement) return;

    const progressRing = gaugeElement.querySelector('.gauge-progress');
    const scoreVal = gaugeElement.querySelector('.gauge-score');
    const gradeVal = gaugeElement.querySelector('.gauge-grade');

    const radius = 56;
    const circumference = 2 * Math.PI * radius; // ~351.85px

    const clamped = Math.max(0, Math.min(100, Number(score) || 0));
    const offset = circumference - (clamped / 100) * circumference;

    if (progressRing) {
      progressRing.style.strokeDasharray = `${circumference}`;
      progressRing.style.strokeDashoffset = `${offset}`;

      // Color tiering
      if (clamped >= 75) {
        progressRing.style.stroke = 'var(--profit)';
        progressRing.style.filter = 'drop-shadow(0 0 10px var(--profit))';
        if (gradeVal) gradeVal.style.color = 'var(--profit)';
      } else if (clamped >= 50) {
        progressRing.style.stroke = 'var(--shield)';
        progressRing.style.filter = 'drop-shadow(0 0 10px var(--shield))';
        if (gradeVal) gradeVal.style.color = 'var(--shield)';
      } else {
        progressRing.style.stroke = 'var(--text-low)';
        progressRing.style.filter = 'none';
        if (gradeVal) gradeVal.style.color = 'var(--text-mid)';
      }
    }

    if (scoreVal) scoreVal.textContent = `${Math.round(clamped)}%`;
    if (gradeVal) gradeVal.textContent = grade;
  }

  /**
   * Generates a 365-day (52 weeks x 7 days) GitHub-style contribution matrix
   */
  static render365Heatmap(containerElement, onCellClick = null) {
    if (!containerElement) return;
    containerElement.innerHTML = '';

    // Generate 52 columns x 7 rows = 364 cells
    const days = 52 * 7;
    const now = Date.now();

    for (let i = 0; i < days; i++) {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';

      // Seed realistic trading distribution: 45% win days, 25% loss days, 30% neutral/no trade
      const rand = Math.random();
      let dayPnLR = 0;
      let cellClass = '';

      if (rand > 0.65) {
        dayPnLR = +(Math.random() * 4.5 + 0.5).toFixed(1);
        if (dayPnLR >= 3.0) cellClass = 'win-3';
        else if (dayPnLR >= 1.5) cellClass = 'win-2';
        else cellClass = 'win-1';
      } else if (rand > 0.45) {
        dayPnLR = -(Math.random() * 1.5 + 0.5).toFixed(1);
        if (dayPnLR <= -1.0) cellClass = 'loss-2';
        else cellClass = 'loss-1';
      }

      if (cellClass) cell.classList.add(cellClass);
      cell.setAttribute('data-r', dayPnLR);
      cell.setAttribute('title', `Day ${i + 1}: ${dayPnLR >= 0 ? '+' : ''}${dayPnLR}R`);

      if (onCellClick) {
        cell.addEventListener('click', () => onCellClick({ day: i + 1, pnlR: dayPnLR }));
      }

      containerElement.appendChild(cell);
    }
  }

  /**
   * Computes Liquidation Ladder levels
   */
  static calculateLiquidationLadder({ entry, leverage, direction = 'LONG', mmr = 0.005 }) {
    const e = Number(entry) || 68000;
    const lev = Math.max(1, Number(leverage) || 20);
    const isLong = direction.toUpperCase() === 'LONG';

    let liqPrice = 0;
    let slPrice = 0;
    let tpPrice = 0;

    if (isLong) {
      liqPrice = +(e * (1 - (1 / lev) + mmr)).toFixed(2);
      slPrice = +(e * 0.985).toFixed(2); // Strict 1.5% SL
      tpPrice = +(e + (e - slPrice) * 3.2).toFixed(2); // 1:3.2 Asymmetry
    } else {
      liqPrice = +(e * (1 + (1 / lev) - mmr)).toFixed(2);
      slPrice = +(e * 1.015).toFixed(2);
      tpPrice = +(e - (slPrice - e) * 3.2).toFixed(2);
    }

    return {
      entry: e,
      liquidation: liqPrice,
      stopLoss: slPrice,
      target: tpPrice,
      isFirewallSafe: isLong ? (slPrice > liqPrice) : (slPrice < liqPrice)
    };
  }
}


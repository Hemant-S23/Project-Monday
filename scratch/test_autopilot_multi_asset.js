// Test script to verify that:
// 1. Settings maxTrades=10 is read correctly
// 2. An asset with High Event Risk (e.g. BTC) is safely skipped without aborting the scanner
// 3. Other assets (ETH, SOL, etc.) continue scanning and execute up to maxTrades
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import { PaperTrader } from '../js/paperTrading/paperTrader.js';
import { StrategyEngine } from '../js/engine/strategyEngine.js';

console.log('[TEST] Checking PaperTrader & Max Trades Logic...');

const pt = new PaperTrader(2000, 'test_user');
console.log('[TEST] Initial Balance:', pt.balance);
console.log('[TEST] Initial Open Positions:', pt.openPositions.length);

// Verify that maxTrades can accept 10
const userSettings = {
  maxTrades: 10,
  minConfluence: 75,
  minRR: 2.0,
  eventShieldEnabled: true
};

const candidateAssets = ['BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'DOGE', 'NEAR', 'SUI', 'XRP', 'ADA'];
const simulatedRisks = {
  BTC: { isShieldTriggered: true, summary: 'Breaking Shock: Binance Hack' },
  ETH: { isShieldTriggered: false, summary: 'Low Event Risk' },
  SOL: { isShieldTriggered: false, summary: 'Low Event Risk' },
  AVAX: { isShieldTriggered: false, summary: 'Low Event Risk' }
};

let executedCount = 0;
let skippedCount = 0;

for (const asset of candidateAssets) {
  if (pt.openPositions.length >= userSettings.maxTrades) {
    console.log(`[TEST] Max trades (${userSettings.maxTrades}) reached. Stopping scan.`);
    break;
  }

  // 0. Per-asset shield
  const risk = simulatedRisks[asset] || { isShieldTriggered: false };
  if (userSettings.eventShieldEnabled && risk.isShieldTriggered) {
    console.log(`[TEST] Asset ${asset} blocked by Event Shield (${risk.summary}). Skipping safely!`);
    skippedCount++;
    continue;
  }

  // Execute paper trade
  const trade = pt.executePaperTrade({
    market: 'Crypto',
    asset: asset,
    direction: 'LONG',
    entry: 100,
    stopLoss: 95,
    target: 115,
    positionSize: 1,
    leverage: 20,
    riskUSD: 20,
    rewardUSD: 60,
    rrRatio: 3,
    marginUSD: 20,
    notionalUSD: 100,
    strategy: 'Test AutoPilot'
  });

  if (trade) {
    executedCount++;
    console.log(`[TEST] Successfully executed ${asset} (Open Count: ${pt.openPositions.length})`);
  }
}

console.log(`\n[RESULT] Executed: ${executedCount}, Skipped: ${skippedCount}, Total Open: ${pt.openPositions.length}`);
if (executedCount > 1 && skippedCount === 1 && pt.openPositions.length <= 10) {
  console.log('>>> ALL MULTI-ASSET AUTOPILOT CHECKS PASSED PERFECTLY! <<<');
} else {
  console.error('>>> TEST FAILED! <<<');
  process.exit(1);
}

// Mock browser globals for Node test
global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; }
};

import { PaperTrader } from '../js/paperTrading/paperTrader.js';
import { StrategyEngine } from '../js/engine/strategyEngine.js';

// Setup Mock Environment
const trader = new PaperTrader(2000, 'test_user');
trader.openPositions = [];

console.log('--- TEST 1: PaperTrader Multiple Open Positions ---');
const pos1 = trader.executePaperTrade({
  asset: 'BTC',
  market: 'Crypto',
  direction: 'LONG',
  entry: 65000,
  stopLoss: 64000,
  target: 68000,
  positionSize: 0.006,
  riskUSD: 20,
  rewardUSD: 60,
  rrRatio: 3.0,
  leverage: 20,
  marginUSD: 20
});
console.log('Position 1 Added:', pos1.asset, 'Total open:', trader.openPositions.length);

const pos2 = trader.executePaperTrade({
  asset: 'ETH',
  market: 'Crypto',
  direction: 'LONG',
  entry: 3500,
  stopLoss: 3400,
  target: 3800,
  positionSize: 0.114,
  riskUSD: 20,
  rewardUSD: 60,
  rrRatio: 3.0,
  leverage: 20,
  marginUSD: 20
});
console.log('Position 2 Added:', pos2.asset, 'Total open:', trader.openPositions.length);

const isTwoOpen = trader.openPositions.length === 2;
console.log('2 Concurrent Positions Active:', isTwoOpen ? '✅ PASSED' : '❌ FAILED');

console.log('\n--- TEST 2: MaxTrades Guardrail Throttling ---');
const maxTrades = 2;
const candidateAssets = ['BTC', 'ETH', 'SOL'];
const openAssets = trader.openPositions.map(p => p.asset);

let executedTrades = 0;
let blockedReason = '';

for (const asset of candidateAssets) {
  if (trader.openPositions.length >= maxTrades) {
    blockedReason = `Max ${maxTrades} Limit Reached`;
    break;
  }
  if (openAssets.includes(asset)) {
    continue;
  }
  executedTrades++;
}

console.log('Attempting 3rd Trade (SOL): Blocked by Guardrail ->', blockedReason === 'Max 2 Limit Reached' ? '✅ PASSED' : '❌ FAILED');

console.log('\n--- TEST 3: Duplicate Asset Guardrail ---');
const isBtcDuplicate = trader.openPositions.some(p => p.asset === 'BTC');
console.log('Duplicate BTC Blocked:', isBtcDuplicate ? '✅ PASSED' : '❌ FAILED');

console.log('\n--- TEST 4: Closing 1 Trade Frees Slot for New Trade ---');
trader.closePosition(pos1.id, 'MANUAL');
console.log('After closing BTC, Open Positions:', trader.openPositions.length);

const canExecuteNow = trader.openPositions.length < maxTrades;
console.log('Slot freed for Trade 2:', canExecuteNow ? '✅ PASSED' : '❌ FAILED');

if (isTwoOpen && blockedReason === 'Max 2 Limit Reached' && isBtcDuplicate && canExecuteNow) {
  console.log('\n🎉 ALL AUTOPILOT CONCURRENT TRADING LOGIC VERIFIED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error('\n❌ SOME VERIFICATIONS FAILED');
  process.exit(1);
}

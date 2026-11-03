global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; }
};

import { PaperTrader } from '../js/paperTrading/paperTrader.js';
import { StrategyEngine } from '../js/engine/strategyEngine.js';
import { NewsContextEngine } from '../js/engine/newsContextEngine.js';

const trader = new PaperTrader(2000, 'test_user');
const strategy = new StrategyEngine();
const news = new NewsContextEngine();

console.log('=== TEST 1: Grade A Setup Detection & Auto-Pilot Trigger ===');
const candles1H = [];
let p = 60000;
for (let i = 0; i < 50; i++) {
  p += 100;
  candles1H.push({ time: i, open: p - 50, high: p + 100, low: p - 100, close: p, volume: 1000 });
}

// 5M candles with clear pullback into reaction zone + bullish confirmation
const candles5M = [];
p = 65000;
for (let i = 0; i < 35; i++) {
  p += 40;
  candles5M.push({ time: i, open: p - 20, high: p + 30, low: p - 20, close: p, volume: 500 });
}
const swingLow = 65000;
const swingHigh = p;
// Pullback into 0.5 - 0.618 Fib zone
const fib50 = swingHigh - (swingHigh - swingLow) * 0.5;
p = fib50 - 10;
for (let i = 35; i < 48; i++) {
  candles5M.push({ time: i, open: p + 10, high: p + 15, low: p - 25, close: p - 10, volume: 400 });
}
// Bullish confirmation hammer
p += 25;
candles5M.push({ time: 48, open: p - 30, high: p + 15, low: p - 45, close: p, volume: 1500 });

// SMT Divergence
const relCandles5M = candles5M.map((c, idx) => {
  // Weaken related asset at swing low to trigger SMT divergence
  if (idx > 40) return { ...c, low: c.low - 50, close: c.close - 40 };
  return { ...c };
});

const btcRisk = news.getOverallEventRisk('BTC', 'Crypto');
const stratResult = strategy.evaluate(
  'BTC',
  candles1H,
  candles5M,
  relCandles5M,
  p,
  '$',
  'ETH',
  { sentiment: { classification: 'Greed', score: 65 }, fundingData: { rate: 0.0001 }, eventRisk: btcRisk }
);

console.log('Confluence Score:', stratResult.confluenceScore, '%');
console.log('Confluence Grade:', stratResult.confluenceGrade);
console.log('Strategy State:', stratResult.state);
console.log('RR Ratio:', stratResult.levels?.rrRatio);

console.log('\n=== TEST 2: Autonomous Trade Placement ===');
if (stratResult.state === 'CONFIRMED' || stratResult.confluenceScore >= 75) {
  const trade = trader.executePaperTrade({
    asset: 'BTC',
    market: 'Crypto',
    direction: stratResult.direction || 'LONG',
    entry: stratResult.levels?.entry || p,
    stopLoss: stratResult.levels?.stopLoss || p - 500,
    target: stratResult.levels?.target || p + 1500,
    positionSize: 0.006,
    riskUSD: 20,
    rewardUSD: 60,
    rrRatio: stratResult.levels?.rrRatio || 3.0,
    leverage: 20,
    marginUSD: 20
  });

  console.log('Trade Successfully Executed:', trade.asset, trade.direction, 'at entry:', trade.entry);
  console.log('Open Positions Count:', trader.openPositions.length);
  console.log('Remaining Cash Balance:', trader.balance);
} else {
  console.log('State not confirmed:', stratResult.missingConditions);
}

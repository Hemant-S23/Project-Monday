global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; }
};

import { NewsContextEngine } from '../js/engine/newsContextEngine.js';
import { StrategyEngine } from '../js/engine/strategyEngine.js';

const news = new NewsContextEngine();
const strategy = new StrategyEngine();

console.log('=== STEP 1: Check News Context Engine Event Risk ===');
const btcRisk = news.getOverallEventRisk('BTC', 'Crypto');
console.log('BTC Event Risk Level:', btcRisk.level);
console.log('BTC isShieldTriggered:', btcRisk.isShieldTriggered);
console.log('BTC Summary:', btcRisk.summary);

const niftyRisk = news.getOverallEventRisk('NIFTY', 'India');
console.log('NIFTY Event Risk Level:', niftyRisk.level);
console.log('NIFTY isShieldTriggered:', niftyRisk.isShieldTriggered);

console.log('\n=== STEP 2: Check Strategy Engine Confluence & State under this Risk ===');
// Create realistic mock candles with bullish trend
const candles1H = [];
let p = 60000;
for (let i = 0; i < 50; i++) {
  p += 100;
  candles1H.push({ time: i, open: p - 50, high: p + 100, low: p - 100, close: p, volume: 1000 });
}
const candles5M = [];
p = 65000;
for (let i = 0; i < 50; i++) {
  p += 20;
  candles5M.push({ time: i, open: p - 10, high: p + 20, low: p - 20, close: p, volume: 500 });
}

const stratResult = strategy.evaluate(
  'BTC',
  candles1H,
  candles5M,
  candles5M,
  66000,
  '$',
  'ETH',
  { sentiment: { classification: 'Greed', score: 65 }, fundingData: { rate: 0.0001 }, eventRisk: btcRisk }
);

console.log('Strategy State:', stratResult.state);
console.log('Confluence Score:', stratResult.confluenceScore);
console.log('Missing Conditions:', stratResult.missingConditions);

global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; }
};

import { StrategyEngine } from '../js/engine/strategyEngine.js';

const strategy = new StrategyEngine();

// Test candles that form a proper Grade A pullback setup
const candles1H = [];
let p = 60000;
for (let i = 0; i < 50; i++) {
  p += 100;
  candles1H.push({ time: i, open: p - 50, high: p + 100, low: p - 100, close: p, volume: 1000 });
}

// 5M candles: initial impulse up, then pullback into reaction zone (0.382 - 0.618 Fib), then a bullish confirmation candle
const candles5M = [];
p = 65000;
for (let i = 0; i < 40; i++) {
  p += 50;
  candles5M.push({ time: i, open: p - 20, high: p + 30, low: p - 20, close: p, volume: 500 });
}
// Pullback 5 candles
for (let i = 40; i < 48; i++) {
  p -= 30;
  candles5M.push({ time: i, open: p + 10, high: p + 15, low: p - 25, close: p - 15, volume: 400 });
}
// Bullish confirmation hammer / engulfing candle
p += 40;
candles5M.push({ time: 48, open: p - 40, high: p + 20, low: p - 50, close: p, volume: 1200 });

// Related candles for SMT
const relCandles5M = candles5M.map(c => ({ ...c }));

console.log('--- TEST: Strategy evaluation WITHOUT stuck Event Shield ---');
const cleanEventRisk = {
  level: 'Low',
  badge: 'Low Event Risk',
  isShieldTriggered: false,
  summary: 'Normal market conditions',
  activeEvents: []
};

const res = strategy.evaluate(
  'BTC',
  candles1H,
  candles5M,
  relCandles5M,
  p,
  '$',
  'ETH',
  { sentiment: { classification: 'Greed', score: 65 }, fundingData: { rate: 0.0001 }, eventRisk: cleanEventRisk }
);

console.log('Result State:', res.state);
console.log('Confluence Score:', res.confluenceScore, '%');
console.log('Confluence Grade:', res.confluenceGrade);
console.log('RR Ratio:', res.levels?.rrRatio);
console.log('Missing Conditions:', res.missingConditions);

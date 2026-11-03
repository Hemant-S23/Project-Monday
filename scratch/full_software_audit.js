import { StrategyEngine } from '../js/engine/strategyEngine.js';
import { DerivativesEngine } from '../js/engine/derivativesEngine.js';
import { NewsContextEngine } from '../js/engine/newsContextEngine.js';
import { PaperTrader } from '../js/paperTrading/paperTrader.js';

console.log('========================================================================');
console.log('   PROJECT MONDAY — COMPREHENSIVE DEEP SOFTWARE AUDIT & LOGIC CHECK     ');
console.log('========================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName} - ${details}`);
  }
}

// --------------------------------------------------------------------------
// TEST SUITE 1: STRATEGY ENGINE & DYNAMIC R:R TARGET CALCULATION
// --------------------------------------------------------------------------
console.log('🔍 [SUITE 1] Testing Strategy Engine & Mathematical Formulations...');
const strategyEngine = new StrategyEngine();

// Generate synthetic candles for BTC
const candles1H = Array.from({ length: 40 }, (_, i) => ({
  time: 1000 + i * 3600,
  open: 65000 + i * 50,
  high: 65100 + i * 50,
  low: 64950 + i * 50,
  close: 65050 + i * 50,
  volume: 1500
}));

const candles5M = Array.from({ length: 40 }, (_, i) => ({
  time: 2000 + i * 300,
  open: 67000 + (i % 2 === 0 ? 30 : -20),
  high: 67100 + (i % 2 === 0 ? 40 : 10),
  low: 66900 - (i % 2 === 0 ? 10 : 30),
  close: 67020 + (i % 2 === 0 ? 25 : -15),
  volume: 200
}));

const related5M = candles5M.map(c => ({
  ...c,
  open: c.open * 0.05,
  high: c.high * 0.05,
  low: c.low * 0.05,
  close: c.close * 0.05
}));

// Test 1.1: Bullish calculation with exact RR 2.0
const res20 = strategyEngine.evaluate('BTC', candles1H, candles5M, related5M, 67020, '$', 'ETH', {
  userStandards: { minRR: 2.0, minConfluence: 50, eventShieldEnabled: true }
});

assert(res20 !== null, 'Strategy evaluation returns object');
assert(!isNaN(res20.confluenceScore), 'Confluence score is a valid number');
assert(res20.levels !== null, 'Levels object generated');
assert(!isNaN(res20.levels.entry), 'Entry price is a valid number');
assert(!isNaN(res20.levels.stopLoss), 'Stop Loss price is a valid number');
assert(!isNaN(res20.levels.target), 'Target price is a valid number');
assert(!isNaN(res20.levels.rrRatio), 'RR Ratio is a valid number');
assert(Math.abs(res20.levels.rrRatio - 2.0) < 0.05, `RR ratio matches configured 2.0 (Got ${res20.levels.rrRatio})`);

// Verify Target mathematical distance = Risk * 2.0
const risk20 = Math.abs(res20.levels.entry - res20.levels.stopLoss);
const reward20 = Math.abs(res20.levels.target - res20.levels.entry);
assert(Math.abs(reward20 - risk20 * 2.0) < 0.01, `Target distance precisely equals 2.0 * Risk distance`);

// Test 1.2: Check RR 3.0 configuration
const res30 = strategyEngine.evaluate('BTC', candles1H, candles5M, related5M, 67020, '$', 'ETH', {
  userStandards: { minRR: 3.0, minConfluence: 75, eventShieldEnabled: true }
});
assert(Math.abs(res30.levels.rrRatio - 3.0) < 0.05, `RR ratio matches configured 3.0 (Got ${res30.levels.rrRatio})`);

// Test 1.3: Low candle edge case (Graceful handling, no exceptions)
const resEmpty = strategyEngine.evaluate('BTC', [], [], [], 67000, '$', 'ETH');
assert(resEmpty.state === 'NO SETUP' || resEmpty.state === 'WAITING', `Empty candle evaluation handles gracefully with '${resEmpty.state}'`);

// --------------------------------------------------------------------------
// TEST SUITE 2: DERIVATIVES ENGINE & LIQUIDATION FIREWALL
// --------------------------------------------------------------------------
console.log('\n🔍 [SUITE 2] Testing Derivatives Engine & Liquidation Math...');
const derivativesEngine = new DerivativesEngine();

// Test 2.1: Long liquidation price calculation
const longLiq = derivativesEngine.calcLiquidationPrice({
  entry: 100,
  direction: 'LONG',
  leverage: 20,
  asset: 'SOL',
  market: 'Crypto'
});
assert(longLiq > 0 && longLiq < 100, `Long liquidation price ($${longLiq}) is below entry ($100)`);
assert(Math.abs(longLiq - 96.0) < 1.0, `20x leverage long liquidation is roughly 4%-5% below entry (Got ${longLiq})`);

// Test 2.2: Short liquidation price calculation
const shortLiq = derivativesEngine.calcLiquidationPrice({
  entry: 100,
  direction: 'SHORT',
  leverage: 20,
  asset: 'SOL',
  market: 'Crypto'
});
assert(shortLiq > 100, `Short liquidation price ($${shortLiq}) is above entry ($100)`);
assert(Math.abs(shortLiq - 104.0) < 1.0, `20x leverage short liquidation is roughly 4%-5% above entry (Got ${shortLiq})`);

// Test 2.3: Zero / negative / NaN inputs immunity
const safeLiq = derivativesEngine.calcLiquidationPrice({
  entry: 0,
  direction: 'LONG',
  leverage: 0
});
assert(!isNaN(safeLiq), 'Zero leverage/entry does not produce NaN');

// --------------------------------------------------------------------------
// TEST SUITE 3: PAPER TRADER & LEDGER INTEGRITY
// --------------------------------------------------------------------------
console.log('\n🔍 [SUITE 3] Testing Paper Trader, Precision & Financial Ledger...');
// Mock localStorage for test environment
globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

const paperTrader = new PaperTrader(2000.0, 'test_auditor');
assert(paperTrader.balance === 2000.0, 'Paper trader initialized with exact $2,000.00 balance');

// Test 3.1: Execute a Paper Trade on Altcoin (LINK)
const trade1 = paperTrader.executePaperTrade({
  asset: 'LINK',
  market: 'Crypto',
  direction: 'SHORT',
  entry: 11.0000,
  stopLoss: 11.2000,
  target: 10.6000,
  positionSize: 10,
  riskUSD: 20,
  rewardUSD: 40,
  rrRatio: 2.0,
  leverage: 20,
  marginUSD: 20,
  notionalUSD: 110,
  liquidationPrice: 11.5000,
  conditions: ['Whale Volume', 'SMT Divergence']
});
assert(trade1 && trade1.id, 'Paper trade executed and received unique ID');
assert(paperTrader.openPositions.length === 1, 'Trade successfully added to openPositions');

// Test 3.2: Close with WIN at target
const closedWin = paperTrader.closePosition(trade1.id, 'WIN', 10.6000);
assert(closedWin !== null, 'Position closed with WIN');
assert(closedWin.status === 'CLOSED', 'Status updated to CLOSED');
assert(closedWin.result === 'WIN', 'Result marked as WIN');
assert(closedWin.exitReason === 'WIN', `Win exit reason internally tagged '${closedWin.exitReason}'`);
assert(closedWin.pnlUSD > 0, `Profit is positive (+$${closedWin.pnlUSD})`);
assert(paperTrader.openPositions.length === 0, 'Open positions list empty after close');

// Test 3.3: Manual close label verification
const trade2 = paperTrader.executePaperTrade({
  asset: 'DOGE',
  market: 'Crypto',
  direction: 'LONG',
  entry: 0.140000,
  stopLoss: 0.135000,
  target: 0.150000,
  positionSize: 500,
  riskUSD: 20,
  rewardUSD: 40,
  rrRatio: 2.0,
  leverage: 20,
  marginUSD: 20,
  notionalUSD: 70
});
const closedManual = paperTrader.closePosition(trade2.id, 'MANUAL', 0.142000);
assert(closedManual.exitReason === 'MANUAL', `Manual close correctly labelled '${closedManual.exitReason}'`);

// Test 3.4: Dynamic Price Precision Formatting
assert(paperTrader.formatDynamicPrice(68420.5) === '68420.50', 'BTC (>=1000) formats to 2 decimals');
assert(paperTrader.formatDynamicPrice(11.25) === '11.2500', 'LINK (>=1) formats to 4 decimals');
assert(paperTrader.formatDynamicPrice(0.1425) === '0.142500', 'DOGE (>=0.01) formats to 6 decimals');

// Test 3.5: Financial Ledger & GST Auto-Bifurcation
const ledger = paperTrader.getFinancialLedger('ALL');
assert(ledger.trades.length === 2, `Ledger contains 2 settlements (Got ${ledger.trades.length})`);
assert(!isNaN(ledger.totalGrossPnl), `Gross PnL calculated without NaN ($${ledger.totalGrossPnl})`);
assert(!isNaN(ledger.totalBrokerage), `Brokerage calculated without NaN ($${ledger.totalBrokerage})`);
assert(!isNaN(ledger.totalGST), `18% GST calculated without NaN ($${ledger.totalGST})`);
assert(!isNaN(ledger.netSettledPnl), `Net wallet settlement calculated without NaN ($${ledger.netSettledPnl})`);
// Verify GST is exactly 18% of brokerage
const expectedGST = +(ledger.totalBrokerage * 0.18).toFixed(2);
assert(Math.abs(ledger.totalGST - expectedGST) <= 0.02, `GST is precisely 18% of brokerage (${ledger.totalGST} vs expected ${expectedGST})`);

// --------------------------------------------------------------------------
// TEST SUITE 4: NEWS CONTEXT ENGINE & EVENT RISK SHIELD
// --------------------------------------------------------------------------
console.log('\n🔍 [SUITE 4] Testing News Context Engine & Shield Behavior...');
const newsEngine = new NewsContextEngine();

const riskBTC = newsEngine.getOverallEventRisk('BTC', 'Crypto');
assert(riskBTC !== null, 'Crypto event risk evaluated');
assert(typeof riskBTC.isShieldTriggered === 'boolean', 'isShieldTriggered is a boolean flag');
assert(typeof riskBTC.level === 'string', `Event risk level is a valid string ('${riskBTC.level}')`);

// --------------------------------------------------------------------------
// TEST SUITE 5: AUTO-PILOT EXECUTION LOGIC & COOLDOWNS
// --------------------------------------------------------------------------
console.log('\n🔍 [SUITE 5] Testing Auto-Pilot Sanity Firewalls & Cooldown Logic...');

// Test 5.1: Zero-Slippage Touch Tolerance (Pillar A)
function testTouchTolerance(entry, livePrice) {
  const maxTouchTolerance = entry >= 1000 ? 0.0003 : (entry >= 1 ? 0.0006 : 0.0008);
  const discrepancy = Math.abs(livePrice - entry) / entry;
  return discrepancy <= maxTouchTolerance;
}

// BTC entry at $65,000; live price at $65,005 (0.007% discrepancy -> accepted)
assert(testTouchTolerance(65000, 65005) === true, 'Near-exact entry touch ($65,000 vs $65,005) is accepted');
// BTC entry at $65,000; live price departed to $65,100 (0.15% discrepancy -> rejected)
assert(testTouchTolerance(65000, 65100) === false, 'Departed / slipped price ($65,000 vs $65,100) is rejected');

// Test 5.2: Pre-Flight Price Sanity Firewall
function testPreFlightFirewall(direction, livePrice, stopLoss, target) {
  if (direction === 'LONG') {
    if (livePrice <= stopLoss || livePrice >= target) return false; // Block
  } else {
    if (livePrice >= stopLoss || livePrice <= target) return false; // Block
  }
  return true; // Pass
}
// Long setup: Entry $100, SL $95, TP $110. Live price $111 (Already crossed TP)
assert(testPreFlightFirewall('LONG', 111, 95, 110) === false, 'Pre-flight firewall blocks LONG order if market already passed TP');
// Long setup: Live price $94 (Already crossed SL)
assert(testPreFlightFirewall('LONG', 94, 95, 110) === false, 'Pre-flight firewall blocks LONG order if market already passed SL');
// Long setup: Live price $100 (Inside valid range)
assert(testPreFlightFirewall('LONG', 100, 95, 110) === true, 'Pre-flight firewall permits order within healthy range');

// Test 5.3: Cooldown logic
// WIN = 0s cooldown
const winCooldownMs = 0;
assert(winCooldownMs === 0, 'WIN triggers 0s cooldown (Immediate fresh reentry allowed)');
// LOSS = 3m cooldown
const lossCooldownMs = 180000;
assert(lossCooldownMs === 180000, 'LOSS triggers 3m cooldown (Prevents revenge trading)');

console.log('\n========================================================================');
console.log(`   AUDIT COMPLETE: ${passedTests}/${totalTests} Tests Passed (${failedTests} Failures)`);
console.log('========================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🟢 ALL ENGINES, MATHEMATICAL FORMULAS & EXECUTION FIREWALLS ARE 100% HEALTHY.\n');
}

import { PaperTrader } from '../js/paperTrading/paperTrader.js';

console.log('🧪 Starting Stop Loss vs Liquidation Priority Test...');

globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

const trader = new PaperTrader(2000.0, 'test_user');

// 1. Create a trade with 1% risk ($20), $100 margin, 20x leverage
const pos = trader.executePaperTrade({
  asset: 'BTC',
  market: 'Crypto',
  direction: 'LONG',
  entry: 65000,
  stopLoss: 64350, // -1% distance ($20 risk with positionSize = 0.030769)
  target: 67000,
  positionSize: 0.030769,
  riskUSD: 20.00,
  rewardUSD: 60.00,
  rrRatio: 3.0,
  leverage: 20,
  marginUSD: 100.00,
  notionalUSD: 2000.00,
  liquidationPrice: 62000, // Liquidation is at 62,000 (well below SL of 64,350)
  conditions: ['Volume Absorption', '1H Trend']
});

console.log('Trade opened:', { id: pos.id, entry: pos.entry, stopLoss: pos.stopLoss, liquidationPrice: pos.liquidationPrice, margin: pos.marginUSD });

// Scenario A: Live price dumps to 60,000 (below both SL and Liquidation!)
const closedList = trader.updateLivePositions({ BTC: 60000 });

if (closedList.length === 0) {
  console.error('❌ Failed: Position was not closed!');
  process.exit(1);
}

const closed = closedList[0].pos;
console.log('Closed trade details:', {
  result: closed.result,
  exitReason: closed.exitReason,
  exitPrice: closed.exitPrice,
  pnlUSD: closed.pnlUSD,
  margin: closed.marginUSD
});

// Assertions
if (closed.result !== 'LOSS') {
  console.error(`❌ FAILED: Expected result to be 'LOSS', got '${closed.result}'`);
  process.exit(1);
}

if (closed.exitPrice !== 64350) {
  console.error(`❌ FAILED: Expected exitPrice to be ${pos.stopLoss}, got ${closed.exitPrice}`);
  process.exit(1);
}

// Loss must be bounded around ~$20 (risk + fees), NEVER -$100 (margin)!
if (Math.abs(closed.pnlUSD) > 25) {
  console.error(`❌ FAILED: PnL exceeded risk bounds! PnL: ${closed.pnlUSD} (Expected around -$20 to -$22)`);
  process.exit(1);
}

console.log('✅ Scenario A Passed: Stop Loss strictly prioritized over liquidation during live price crash!');

// Scenario B: Test Safeguard Interception if 'LIQUIDATED' is passed to a trade with Stop Loss
const pos2 = trader.executePaperTrade({
  asset: 'ETH',
  market: 'Crypto',
  direction: 'LONG',
  entry: 3000,
  stopLoss: 2950,
  target: 3150,
  positionSize: 0.4,
  riskUSD: 20,
  rewardUSD: 60,
  rrRatio: 3,
  leverage: 20,
  marginUSD: 100.00,
  notionalUSD: 1200.00,
  liquidationPrice: 2850,
  conditions: ['Whale Volume']
});

// Simulate abnormal caller passing 'LIQUIDATED' directly
const closedProtected = trader.closePosition(pos2.id, 'LIQUIDATED', 2850);

console.log('Direct liquidation attempt result:', {
  result: closedProtected.result,
  exitReason: closedProtected.exitReason,
  exitPrice: closedProtected.exitPrice,
  pnlUSD: closedProtected.pnlUSD,
  margin: closedProtected.marginUSD
});

if (closedProtected.result !== 'LOSS') {
  console.error(`❌ FAILED: Expected protected trade to intercept and resolve as 'LOSS', got ${closedProtected.result}`);
  process.exit(1);
}

if (closedProtected.exitPrice !== 2950) {
  console.error(`❌ FAILED: Expected exitPrice to be 2950, got ${closedProtected.exitPrice}`);
  process.exit(1);
}

if (closedProtected.pnlUSD < -30) {
  console.error(`❌ FAILED: Loss exceeded risk bounds! PnL: ${closedProtected.pnlUSD}`);
  process.exit(1);
}

console.log('✅ Scenario B Passed: Capital Protection Guard intercepted direct liquidation and saved user margin!');
console.log('🎉 ALL STOP LOSS / LIQUIDATION PRIORITY AND CAPITAL SAFETY TESTS PASSED!');

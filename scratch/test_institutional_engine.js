import { StrategyEngine } from '../js/engine/strategyEngine.js';

console.log('🧪 Starting Project Monday Institutional Engine Verification Suite...\n');

const engine = new StrategyEngine();

// --- TEST 1: ATR & Volatility Breathing Room ---
console.log('--- TEST 1: ATR Dynamic Stop Loss Validation ---');
const mock5MCandles = [];
let basePrice = 60000;
for (let i = 0; i < 25; i++) {
  const noise = (Math.random() - 0.48) * 400;
  basePrice += noise;
  mock5MCandles.push({
    open: basePrice - 50,
    high: basePrice + 150,
    low: basePrice - 180,
    close: basePrice,
    volume: 100
  });
}

const currentPrice = 60000;
const levelsLong = engine.calculateLevelsAndRR(mock5MCandles, 'BULLISH', currentPrice, 2.5);
const slDistanceLongPct = ((currentPrice - levelsLong.stopLoss) / currentPrice) * 100;
const rewardDistanceLongPct = ((levelsLong.target - currentPrice) / currentPrice) * 100;

console.log(`BULLISH Levels: Entry: $${levelsLong.entry} | SL: $${levelsLong.stopLoss.toFixed(1)} (-${slDistanceLongPct.toFixed(2)}%) | TP: $${levelsLong.target.toFixed(1)} (+${rewardDistanceLongPct.toFixed(2)}%) | RR: 1:${levelsLong.rrRatio}`);
if (slDistanceLongPct < 1.5) {
  console.error('❌ FAIL: Stop loss is too tight (< 1.5%)!');
  process.exit(1);
} else {
  console.log('✅ PASS: Stop loss has institutional volatility breathing room (>= 1.5%).');
}

if (levelsLong.rrRatio < 2.0) {
  console.error('❌ FAIL: Risk:Reward is below 2.0!');
  process.exit(1);
} else {
  console.log(`✅ PASS: Risk:Reward standard verified at 1:${levelsLong.rrRatio}.`);
}

// --- TEST 2: Macro 1H Regime Anchor (No Counter-Trend Shorts in Bull Market) ---
console.log('\n--- TEST 2: 1H Trend 200 EMA Macro Anchor ---');
const mock1HCandles = [];
// Build a strong macro bull trend starting from $50,000 to $65,000 over 80 candles
let p = 50000;
for (let i = 0; i < 80; i++) {
  p += 200;
  mock1HCandles.push({
    open: p - 100,
    high: p + 150,
    low: p - 120,
    close: p,
    volume: 500
  });
}
// Now add a temporary 2-candle pullback (e.g. -400 points)
mock1HCandles.push({ open: p, high: p + 50, low: p - 250, close: p - 200, volume: 300 });
mock1HCandles.push({ open: p - 200, high: p - 150, low: p - 450, close: p - 400, volume: 350 });

const htfResult = engine.calculateHTFTrend(mock1HCandles);
console.log(`1H Macro Evaluation during Bull Market Pullback: Direction = ${htfResult.direction} (Confidence: ${htfResult.confidence})`);
if (htfResult.direction === 'BEARISH') {
  console.error('❌ FAIL: Minor pullback tricked engine into BEARISH! Counter-trend short trap detected!');
  process.exit(1);
} else {
  console.log('✅ PASS: Engine correctly protected macro bull trend. Direction is not BEARISH (No Short traps).');
}

// --- TEST 3: Zero-Tolerance DEVELOPING Leak Verification ---
console.log('\n--- TEST 3: Security Leak Check (DEVELOPING Gate) ---');
import { SignalEngine } from '../js/engine/signalEngine.js';
const sigEngine = new SignalEngine();

const fakeDevelopingResult = {
  strategyResult: {
    state: 'DEVELOPING', // Pullback in zone but unconfirmed!
    confluenceScore: 45, // Low confluence
    levels: {
      entry: 60000,
      stopLoss: 58800,
      target: 63000,
      rrRatio: 2.5
    }
  },
  currentPrice: 60000,
  currencySymbol: '$'
};

const processed = sigEngine.processStrategyResult('BTC', fakeDevelopingResult);
if (processed !== null) {
  console.error('❌ FAIL: DEVELOPING state leaked through Signal Engine!');
  process.exit(1);
} else {
  console.log('✅ PASS: DEVELOPING setup successfully BLOCKED. Zero unconfirmed signals allowed.');
}

const fakeConfirmedResult = {
  strategyResult: {
    state: 'CONFIRMED',
    confluenceScore: 85, // Grade A+
    levels: {
      entry: 60000,
      stopLoss: 58800,
      target: 63000,
      rrRatio: 2.5
    }
  },
  currentPrice: 60000,
  currencySymbol: '$'
};

const confirmedProcessed = sigEngine.processStrategyResult('SOL', fakeConfirmedResult);
if (!confirmedProcessed || confirmedProcessed.asset !== 'SOL') {
  console.error('❌ FAIL: Valid CONFIRMED setup was rejected!');
  process.exit(1);
} else {
  console.log('✅ PASS: Valid CONFIRMED setup with Grade A Confluence successfully issued.');
}

console.log('\n🎉 ALL 3 INSTITUTIONAL ENGINES PASSED 100% OF VERIFICATION CHECKS!');

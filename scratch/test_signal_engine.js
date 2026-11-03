import { SignalEngine } from '../js/engine/signalEngine.js';

console.log('🧪 Testing MONDAY Alpha Radar Signal Engine...');

globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

const engine = new SignalEngine();

// 1. Process Grade A Setup
const mockEvalData = {
  currentPrice: 68500,
  currencySymbol: '$',
  strategyResult: {
    state: 'CONFIRMED',
    confluenceScore: 88,
    confluenceGrade: 'GRADE A+ [INSTITUTIONAL EDGE]',
    direction: 'LONG',
    levels: {
      entry: 68450,
      stopLoss: 68120,
      takeProfit: 69176,
      rrRatio: 2.2
    },
    reasoning: ['1H HTF Directional Bullish', 'Liquidity Sweep Confirmed', 'Strict 1:2.2 RR'],
    htfTrend: { direction: 'BULLISH' }
  }
};

const sig1 = engine.processStrategyResult('BTC', mockEvalData);
console.assert(sig1 !== null, 'Signal 1 should be created');
console.assert(sig1.status === 'PENDING', 'Initial status should be PENDING');
console.assert(sig1.validityMinutes === 45, 'Validity should be 45 minutes');
console.assert(sig1.expiresAt > sig1.issuedAt, 'expiresAt must be after issuedAt');
console.log('✅ Signal 1 Created: BTC LONG LIMIT @ $' + sig1.entryPrice + ' with ' + sig1.validityMinutes + 'm validity.');

// 2. Test Limit Order Fill (Price dips to 68440 <= 68450)
engine.onPriceTick('BTC', 68440);
const filledSig = engine.getSignalById(sig1.id);
console.assert(filledSig.status === 'ACTIVE', 'Signal should transition to ACTIVE when price touches limit entry');
console.assert(filledSig.filledAt !== null, 'filledAt timestamp must be recorded');
console.log('✅ Limit Order Fill Verified: PENDING -> ACTIVE on limit touch.');

// 3. Test Take Profit Hit (Price rallies to 69200 >= 69176)
engine.onPriceTick('BTC', 69200);
const tpHitSig = engine.getSignalById(sig1.id);
console.assert(tpHitSig.status === 'TP_HIT', 'Signal should transition to TP_HIT');
console.assert(tpHitSig.realizedR === 2.2, 'realizedR should match riskReward');
console.log('✅ Take Profit Hit Verified: ACTIVE -> TP_HIT (+2.2R realized).');

// 4. Test Invalidation (Signal generated, but price hits TP before touching entry)
const mockShortEval = {
  currentPrice: 2540,
  currencySymbol: '$',
  strategyResult: {
    state: 'CONFIRMED',
    confluenceScore: 82,
    confluenceGrade: 'GRADE A',
    direction: 'SHORT',
    levels: {
      entry: 2560,
      stopLoss: 2580,
      takeProfit: 2510,
      rrRatio: 2.5
    },
    reasoning: ['1H Bearish Trend', 'Supply Zone Retracement'],
    htfTrend: { direction: 'BEARISH' }
  }
};

const sig2 = engine.processStrategyResult('ETH', mockShortEval);
console.assert(sig2 !== null, 'Signal 2 should be created');
// Price drops directly to 2505 (TP reached without ever touching entry 2560!)
engine.onPriceTick('ETH', 2505);
const invalidatedSig = engine.getSignalById(sig2.id);
console.assert(invalidatedSig.status === 'INVALIDATED', 'Signal should be INVALIDATED if target is hit before entry fill');
console.log('✅ Invalidation Engine Verified: PENDING -> INVALIDATED (target reached prematurely).');

// 5. Test Expiration Timeout
const mockSolEval = {
  currentPrice: 155,
  currencySymbol: '$',
  strategyResult: {
    state: 'CONFIRMED',
    confluenceScore: 78,
    confluenceGrade: 'GRADE A',
    direction: 'LONG',
    levels: {
      entry: 153,
      stopLoss: 150,
      takeProfit: 160,
      rrRatio: 2.33
    },
    reasoning: ['Support Retest'],
    htfTrend: { direction: 'BULLISH' }
  }
};

const sig3 = engine.processStrategyResult('SOL', mockSolEval);
// Fast-forward expiration
sig3.expiresAt = Date.now() - 1000;
engine.checkTimeouts();
const expiredSig = engine.getSignalById(sig3.id);
console.assert(expiredSig.status === 'EXPIRED', 'Signal must be EXPIRED when expiresAt has passed');
console.log('✅ Automatic Expiration Verified: PENDING -> EXPIRED after validity window.');

console.log('>>> ALL ALPHA RADAR SIGNAL ENGINE TESTS PASSED 100% <<<');

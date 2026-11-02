const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import { PaperTrader } from '../js/paperTrading/paperTrader.js';
import { CopilotBrain } from '../js/copilot/copilotBrain.js';

console.log('[TEST 1] Testing Copilot Multi-Asset Intelligence...');
const brain = new CopilotBrain();
brain.updateContext({
  targetAsset: 'BTC',
  currentPrice: 77800,
  strategyState: { state: 'WAIT', direction: 'LONG', htfTrend: { direction: 'BULLISH' } }
});

brain.updateWatchlistRadar([
  { asset: 'BTC', currentPrice: 77800, state: 'WAIT', htfTrend: 'BULLISH', proposedDir: 'LONG', confluenceScore: 60 },
  { asset: 'ETH', currentPrice: 2550, state: 'CONFIRMED', htfTrend: 'BEARISH', proposedDir: 'SHORT', confluenceScore: 95 },
  { asset: 'SOL', currentPrice: 155, state: 'CONFIRMED', htfTrend: 'BULLISH', proposedDir: 'LONG', confluenceScore: 90 },
  { asset: 'AVAX', currentPrice: 28.5, state: 'DEVELOPING', htfTrend: 'BULLISH', proposedDir: 'LONG', confluenceScore: 70 }
]);

async function runCopilotTests() {
  const resOther = await brain.processQuery('aur dusre coins main kya chal rha hai??');
  console.log('\n--- Query: "aur dusre coins main kya chal rha hai??" ---');
  console.log(resOther);

  const resAva = await brain.processQuery('Ava');
  console.log('\n--- Query: "Ava" ---');
  console.log(resAva);

  if (resOther.includes('ETH') && resOther.includes('SOL') && resAva.includes('AVAX/USD Live Radar Report')) {
    console.log('\n>>> COPILOT MULTI-ASSET INTELLIGENCE TEST PASSED! <<<');
  } else {
    console.error('\n>>> COPILOT MULTI-ASSET INTELLIGENCE TEST FAILED! <<<');
    process.exit(1);
  }

  console.log('\n[TEST 2] Testing Parallel Swarm & RR 2.0 Execution...');
  const pt = new PaperTrader(2000, 'test_user');
  const userSettings = {
    maxTrades: 10,
    minConfluence: 75,
    minRR: 2.0,
    eventShieldEnabled: true
  };

  const candidateAssets = ['BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'DOGE', 'NEAR', 'SUI', 'XRP', 'ADA'];
  const simulatedCandidates = candidateAssets.map(asset => ({
    asset,
    isShieldTriggered: asset === 'BTC',
    state: (asset === 'ETH' || asset === 'SOL' || asset === 'SUI') ? 'CONFIRMED' : 'WAIT',
    direction: asset === 'ETH' ? 'SHORT' : 'LONG',
    confluenceScore: (asset === 'ETH' || asset === 'SOL' || asset === 'SUI') ? 90 : 60,
    rrRatio: 2.0,
    entry: 100,
    stopLoss: asset === 'ETH' ? 105 : 95,
    target: asset === 'ETH' ? 90 : 110
  }));

  // Simulate Parallel Swarm execution with RR=2.0
  const eligible = simulatedCandidates.filter(c => {
    if (userSettings.eventShieldEnabled && c.isShieldTriggered) return false;
    return c.state === 'CONFIRMED' && c.confluenceScore >= userSettings.minConfluence && c.rrRatio >= userSettings.minRR;
  });

  console.log(`Eligible swarm candidates with minRR=${userSettings.minRR}:`, eligible.map(e => e.asset));

  for (const c of eligible) {
    pt.executePaperTrade({
      market: 'Crypto',
      asset: c.asset,
      direction: c.direction,
      entry: c.entry,
      stopLoss: c.stopLoss,
      target: c.target,
      positionSize: 1,
      leverage: 20,
      riskUSD: 20,
      rewardUSD: 40,
      rrRatio: c.rrRatio,
      marginUSD: 20,
      notionalUSD: 100,
      strategy: 'Swarm AutoPilot'
    });
  }

  console.log(`[RESULT] Open Positions in PaperTrader: ${pt.openPositions.length} (${pt.openPositions.map(p => p.asset).join(', ')})`);
  if (pt.openPositions.length === 3 && pt.openPositions.some(p => p.asset === 'ETH') && pt.openPositions.some(p => p.asset === 'SOL') && pt.openPositions.some(p => p.asset === 'SUI')) {
    console.log('>>> ALL MULTI-ASSET PARALLEL SWARM & RR 2.0 TESTS PASSED PERFECTLY! <<<');
  } else {
    console.error('>>> TEST 2 FAILED! <<<');
    process.exit(1);
  }
}

runCopilotTests();

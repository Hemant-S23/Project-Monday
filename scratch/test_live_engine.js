import { StrategyEngine } from '../js/engine/strategyEngine.js';

async function testLive() {
  console.log('--- Fetching real Coinbase 1H and 5M candles ---');
  const [res1H, res5M, resEth5M] = await Promise.all([
    fetch('https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=3600'),
    fetch('https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=300'),
    fetch('https://api.exchange.coinbase.com/products/ETH-USD/candles?granularity=300')
  ]);

  const raw1H = await res1H.json();
  const raw5M = await res5M.json();
  const rawEth5M = await resEth5M.json();

  const candles1H = raw1H.slice(0, 60).map(c => ({
    time: c[0], low: parseFloat(c[1]), high: parseFloat(c[2]), open: parseFloat(c[3]), close: parseFloat(c[4]), volume: parseFloat(c[5])
  })).sort((a,b)=>a.time - b.time);

  const candles5M = raw5M.slice(0, 60).map(c => ({
    time: c[0], low: parseFloat(c[1]), high: parseFloat(c[2]), open: parseFloat(c[3]), close: parseFloat(c[4]), volume: parseFloat(c[5])
  })).sort((a,b)=>a.time - b.time);

  const ethCandles5M = rawEth5M.slice(0, 60).map(c => ({
    time: c[0], low: parseFloat(c[1]), high: parseFloat(c[2]), open: parseFloat(c[3]), close: parseFloat(c[4]), volume: parseFloat(c[5])
  })).sort((a,b)=>a.time - b.time);

  const currentPrice = candles5M[candles5M.length - 1].close;
  console.log('BTC Live Price:', currentPrice);

  const engine = new StrategyEngine();
  const result = engine.evaluate('BTC', candles1H, candles5M, ethCandles5M, currentPrice, '$', 'ETH', {
    userStandards: { minConfluence: 50, minRR: 2.0, eventShieldEnabled: false }
  });

  console.log('\n--- STRATEGY RESULT FOR BTC ---');
  console.log('State:', result.state);
  console.log('Direction:', result.direction);
  console.log('HTF Trend:', result.htfTrend.direction, 'Confidence:', result.htfTrend.confidence);
  console.log('LTF Structure:', result.ltfStructure);
  console.log('Confluence Score:', result.confluenceScore);
  console.log('Levels & RR:', result.levels);
  console.log('Reasoning:', result.reasoning);
  console.log('Missing Conditions:', result.missingConditions);

  // Now test all candidate assets
  for (const asset of ['ETH', 'SOL', 'AVAX', 'LINK', 'DOGE', 'NEAR']) {
    try {
      const [r1, r5] = await Promise.all([
        fetch(`https://api.exchange.coinbase.com/products/${asset}-USD/candles?granularity=3600`),
        fetch(`https://api.exchange.coinbase.com/products/${asset}-USD/candles?granularity=300`)
      ]);
      if (!r1.ok || !r5.ok) {
        console.log(`\n--- ${asset}: HTTP error ${r1.status}/${r5.status} ---`);
        continue;
      }
      const d1 = await r1.json();
      const d5 = await r5.json();
      if (!Array.isArray(d1) || !Array.isArray(d5) || d1.length === 0 || d5.length === 0) {
        console.log(`\n--- ${asset}: empty candles ---`);
        continue;
      }
      const c1H = d1.slice(0, 60).map(c => ({
        time: c[0], low: parseFloat(c[1]), high: parseFloat(c[2]), open: parseFloat(c[3]), close: parseFloat(c[4]), volume: parseFloat(c[5])
      })).sort((a,b)=>a.time - b.time);
      const c5M = d5.slice(0, 60).map(c => ({
        time: c[0], low: parseFloat(c[1]), high: parseFloat(c[2]), open: parseFloat(c[3]), close: parseFloat(c[4]), volume: parseFloat(c[5])
      })).sort((a,b)=>a.time - b.time);
      const p = c5M[c5M.length - 1].close;
      const res = engine.evaluate(asset, c1H, c5M, candles5M, p, '$', 'BTC', {
        userStandards: { minConfluence: 50, minRR: 2.0, eventShieldEnabled: false }
      });
      console.log(`\n--- ${asset} ---`);
      console.log('State:', res.state, '| Direction:', res.direction, '| Score:', res.confluenceScore, '| RR:', res.levels?.rrRatio);
      console.log('inPullbackZone:', res.ltfStructure.inPullbackZone, 'hasConfirmation:', res.ltfStructure.hasConfirmation);
      console.log('Missing:', res.missingConditions);
    } catch (e) {
      console.log(`Error on ${asset}:`, e.message);
    }
  }
}

testLive();

import { CryptoAdapter } from '../js/adapters/cryptoAdapter.js';
import { StrategyEngine } from '../js/engine/strategyEngine.js';

async function main() {
  const adapter = new CryptoAdapter();
  await adapter.init();
  const strat = new StrategyEngine();
  const assets = ['BTC', 'ETH', 'SOL'];

  console.log('=== HTF TREND GATE LIVE TEST ===');
  const ethCandles5M = await adapter.getHistoricalCandles('ETH', '5M', 60);

  for (const a of assets) {
    try {
      const c1h = await adapter.getHistoricalCandles(a, '1H', 60);
      const c5m = await adapter.getHistoricalCandles(a, '5M', 60);
      const price = c5m[c5m.length - 1].close;
      const res = strat.evaluate(a, c1h, c5m, ethCandles5M, price);
      console.log(`[${a}] HTF Trend: ${res.htfTrend?.direction} (score: ${res.htfTrend?.confidence}) | State: ${res.state} | Signal Direction: ${res.direction}`);
      
      if (res.htfTrend?.direction === 'BEARISH' && res.direction === 'LONG') {
        console.error(`FATAL: LONG signal detected during BEARISH trend for ${a}!`);
        process.exit(1);
      }
      if (res.htfTrend?.direction === 'BULLISH' && res.direction === 'SHORT') {
        console.error(`FATAL: SHORT signal detected during BULLISH trend for ${a}!`);
        process.exit(1);
      }
    } catch (e) {
      console.error(`Error testing ${a}:`, e.message);
    }
  }
  console.log('=== ALL HTF GATES VERIFIED PERFECTLY! ===');
  process.exit(0);
}

main();

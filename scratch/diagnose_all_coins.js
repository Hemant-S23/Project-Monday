const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import { CryptoAdapter } from '../js/adapters/cryptoAdapter.js';
import { StrategyEngine } from '../js/engine/strategyEngine.js';
import { NewsContextEngine } from '../js/engine/newsContextEngine.js';
import { DerivativesEngine } from '../js/engine/derivativesEngine.js';

async function diagnoseAllCoins() {
  const adapter = new CryptoAdapter();
  await adapter.init();
  const strategyEngine = new StrategyEngine();
  const newsEngine = new NewsContextEngine();
  const derivativesEngine = new DerivativesEngine();

  const coins = ['BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'DOGE', 'NEAR', 'SUI', 'XRP', 'ADA'];
  console.log(`[AUDIT] Evaluating all ${coins.length} coins at the same time...`);

  const results = await Promise.all(coins.map(async (asset) => {
    try {
      await adapter.ensureAssetInitialized(asset);
      const currentPrice = adapter.getCurrentPrice(asset);
      const relatedAsset = asset === 'BTC' ? 'ETH' : 'BTC';
      const [candles1H, candles5M, relatedCandles5M, sentiment, fundingData] = await Promise.all([
        adapter.getHistoricalCandles(asset, '1H'),
        adapter.getHistoricalCandles(asset, '5M'),
        adapter.getHistoricalCandles(relatedAsset, '5M'),
        newsEngine.fetchFearAndGreed(),
        derivativesEngine.fetchLiveFundingRate(asset, 'Crypto')
      ]);

      const eventRisk = newsEngine.getOverallEventRisk(asset, 'Crypto');
      const strat = strategyEngine.evaluate(
        asset,
        candles1H,
        candles5M,
        relatedCandles5M,
        currentPrice,
        '$',
        relatedAsset,
        { sentiment, fundingData, eventRisk, userStandards: { minConfluence: 75, minRR: 2.0 } }
      );

      return {
        asset,
        price: currentPrice,
        state: strat.state,
        direction: strat.direction,
        htf: strat.htfTrend?.direction,
        confluence: strat.confluenceScore,
        rr: strat.levels?.rrRatio,
        eventRisk: eventRisk.level,
        isShield: eventRisk.isShieldTriggered
      };
    } catch (e) {
      return { asset, error: e.message };
    }
  }));

  console.table(results);
}

diagnoseAllCoins();


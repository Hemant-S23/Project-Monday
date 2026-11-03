import { StrategyEngine } from '../js/engine/strategyEngine.js';

async function replayLast7Hours() {
  console.log('--- REPLAYING LAST 10 HOURS OF 5M CANDLES ---');
  // Granularity 300 = 5M
  const res = await fetch('https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=300');
  const raw5M = await res.json();
  const res1H = await fetch('https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=3600');
  const raw1H = await res1H.json();

  const allCandles5M = raw5M.map(c => ({
    time: c[0], low: parseFloat(c[1]), high: parseFloat(c[2]), open: parseFloat(c[3]), close: parseFloat(c[4]), volume: parseFloat(c[5])
  })).sort((a,b)=>a.time - b.time);

  const allCandles1H = raw1H.map(c => ({
    time: c[0], low: parseFloat(c[1]), high: parseFloat(c[2]), open: parseFloat(c[3]), close: parseFloat(c[4]), volume: parseFloat(c[5])
  })).sort((a,b)=>a.time - b.time);

  console.log(`Total 5M candles: ${allCandles5M.length}`);
  const engine = new StrategyEngine();

  // Test across different threshold settings
  const configs = [
    { name: 'Default Strict (75% Conf, 1:3.0 RR, Shield ON)', minConf: 75, minRR: 3.0, shield: true },
    { name: 'User Current (50% Conf, 1:3.0 RR, Shield ON)', minConf: 50, minRR: 3.0, shield: true },
    { name: 'User Current (50% Conf, 1:3.0 RR, Shield OFF)', minConf: 50, minRR: 3.0, shield: false },
    { name: 'Flexible (50% Conf, 1:2.0 RR, Shield OFF)', minConf: 50, minRR: 2.0, shield: false }
  ];

  for (const cfg of configs) {
    console.log(`\n========================================`);
    console.log(`CONFIG: ${cfg.name}`);
    console.log(`========================================`);

    let confirmedCount = 0;
    let developingCount = 0;
    let waitCount = 0;

    // Simulate stepping through candles from 100 candles ago to latest
    for (let i = 40; i < allCandles5M.length; i++) {
      const window5M = allCandles5M.slice(0, i + 1);
      const curr = window5M[window5M.length - 1];
      const candleTime = new Date(curr.time * 1000).toLocaleTimeString();

      // Find 1H candles up to this point
      const window1H = allCandles1H.filter(c => c.time <= curr.time);

      const result = engine.evaluate('BTC', window1H, window5M, window5M, curr.close, '$', 'ETH', {
        userStandards: { minConfluence: cfg.minConf, minRR: cfg.minRR, eventShieldEnabled: cfg.shield },
        eventRisk: { isShieldTriggered: cfg.shield }
      });

      if (result.state === 'CONFIRMED') {
        confirmedCount++;
        console.log(`[CONFIRMED] at ${candleTime} (Price: $${curr.close}) | Dir: ${result.direction} | Score: ${result.confluenceScore}% | RR: ${result.levels?.rrRatio}`);
      } else if (result.state === 'DEVELOPING') {
        developingCount++;
      } else {
        waitCount++;
      }
    }

    console.log(`Summary: CONFIRMED=${confirmedCount}, DEVELOPING=${developingCount}, WAIT=${waitCount}`);
  }
}

replayLast7Hours().catch(console.error);

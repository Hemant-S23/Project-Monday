import { CopilotBrain } from '../js/copilot/copilotBrain.js';

async function run() {
  const brain = new CopilotBrain();
  console.log('[TEST] Brain getAutoPilotConfig fallback:', brain.getAutoPilotConfig());

  // Mock localStorage with user's settings ($100 margin, 20x, 10 trades, 2.0 RR)
  global.localStorage = {
    getItem: (key) => key === 'monday_autopilot_settings' ? JSON.stringify({ marginUSD: 100, leverage: 20, maxTrades: 10, minRR: 2.0 }) : null
  };

  console.log('[TEST] Brain getAutoPilotConfig with configured margin:', brain.getAutoPilotConfig());

  brain.updateContext({
    targetAsset: 'LINK',
    currentPrice: 11.12,
    strategyState: {
      state: 'CONFIRMED',
      direction: 'SHORT',
      confluenceScore: 85,
      confluenceGrade: 'GRADE A'
    },
    historicalContext: { contextTag: 'Supportive' },
    eventRisk: { level: 'Low' },
    riskParams: {
      entry: 11.12,
      stopLoss: 11.1756,
      target: 11.0088,
      rrRatio: 2.0
    }
  });

  const briefing = brain.generateMarketBriefing();
  console.log('\n--- CONFIRMED BRIEFING OUTPUT ---\n' + briefing);

  const riskReply = await brain.processQuery('sl kaha lagaye aur kitna risk hai');
  console.log('\n--- RISK QUERY REPLY ---\n' + riskReply);

  const rReply = await brain.processQuery('r kya hota hai');
  console.log('\n--- R EXPLAINER REPLY ---\n' + rReply);

  if (briefing.includes('Configured Margin: $100.00') && riskReply.includes('$100.00') && rReply.includes('planned per-trade margin **$100.00**')) {
    console.log('\n>>> DYNAMIC CONFIGURATION BINDING TEST PASSED 100%! <<<');
  } else {
    console.error('MISMATCH IN DYNAMIC BINDING!');
    process.exit(1);
  }
}

run();

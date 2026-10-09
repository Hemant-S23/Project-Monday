/**
 * News and Market Context Engine (PRD Section 23)
 * Tracks active macroeconomic and crypto-specific events, classifies impact,
 * and assesses event risk (Low / Medium / High).
 */
export class NewsContextEngine {
  constructor() {
    this.events = [
      {
        id: 'EVT-01',
        title: 'US CPI Inflation Data Release',
        category: 'Macroeconomic',
        impact: 'Market Moving',
        riskLevel: 'High',
        timeWindow: 'Today, 18:00 UTC (In 3 hours)',
        affectedAssets: ['BTC', 'ETH', 'SOL', 'US Markets'],
        details: 'Expected 2.9% YoY. Volatility expansion probable across risk assets. Wide spreads anticipated.'
      },
      {
        id: 'EVT-02',
        title: 'Spot Bitcoin ETF Net Inflow Surge (+$340M)',
        category: 'Institutional Flows',
        impact: 'Relevant',
        riskLevel: 'Low',
        timeWindow: 'Last 12 hours',
        affectedAssets: ['BTC'],
        details: 'Institutional net absorption provides positive order flow baseline during Asian session.'
      },
      {
        id: 'EVT-03',
        title: 'Solana Breakpoint Ecosystem Conference Announcements',
        category: 'Ecosystem',
        impact: 'Relevant',
        riskLevel: 'Medium',
        timeWindow: 'Ongoing this week',
        affectedAssets: ['SOL'],
        details: 'Elevated developer activity and network upgrade proposals driving higher SOL relative beta.'
      },
      {
        id: 'EVT-04',
        title: 'Federal Reserve FOMC Minutes Discussion',
        category: 'Monetary Policy',
        impact: 'Market Moving',
        riskLevel: 'Medium',
        timeWindow: 'Tomorrow, 19:30 UTC',
        affectedAssets: ['BTC', 'ETH', 'SOL'],
        details: 'Rate cut expectations steady. Macro positioning cautious ahead of minutes release.'
      }
    ];
  }

  getEventsForAsset(asset) {
    return this.events.filter(e => e.affectedAssets.includes(asset) || e.affectedAssets.includes('All'));
  }

  getOverallEventRisk(asset) {
    const relevant = this.getEventsForAsset(asset);
    const hasHigh = relevant.some(e => e.riskLevel === 'High');
    const hasMedium = relevant.some(e => e.riskLevel === 'Medium');

    if (hasHigh) {
      return {
        level: 'High',
        badge: 'High Event Risk',
        summary: 'Major market-moving event (US CPI) approaching. Expect sharp liquidity sweeps.',
        activeEvents: relevant
      };
    }
    if (hasMedium) {
      return {
        level: 'Medium',
        badge: 'Medium Event Risk',
        summary: 'Moderate ecosystem/macro catalyst active. Exercise normal disciplined stop placement.',
        activeEvents: relevant
      };
    }
    return {
      level: 'Low',
      badge: 'Low Event Risk',
      summary: 'No immediate high-impact catalysts scheduled. Favorable technical clarity.',
      activeEvents: relevant
    };
  }
}

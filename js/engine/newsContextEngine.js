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
        affectedAssets: ['BTC', 'ETH', 'SOL', 'Crypto'],
        details: 'Rate cut expectations steady. Macro positioning cautious ahead of minutes release.'
      },
      // --- INDIAN MACROECONOMIC & F&O EVENTS ---
      {
        id: 'IND-01',
        title: 'RBI Monetary Policy Committee (MPC) Rate Decision',
        category: 'Monetary Policy',
        impact: 'Market Moving',
        riskLevel: 'High',
        timeWindow: 'This Week, 10:00 IST',
        affectedAssets: ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'HDFCBANK', 'SBIN', 'ICICIBANK', 'India'],
        details: 'Repo rate steady at 6.50%. RBI neutral stance maintaining headline inflation target. High volatility in Bank Nifty.'
      },
      {
        id: 'IND-02',
        title: 'India CPI Inflation Prints at 3.65% (Within RBI Band)',
        category: 'Macroeconomic',
        impact: 'Relevant',
        riskLevel: 'Low',
        timeWindow: 'Last 24 hours',
        affectedAssets: ['NIFTY', 'BANKNIFTY', 'SENSEX', 'India'],
        details: 'Retail inflation comfortably within RBI 4% tolerance band. Solid baseline supporting Indian corporate capex.'
      },
      {
        id: 'IND-03',
        title: 'FII/DII Net Flow: Domestic DIIs Absorb +₹3,450 Cr',
        category: 'Institutional Flows',
        impact: 'Relevant',
        riskLevel: 'Low',
        timeWindow: 'Daily Cash Market',
        affectedAssets: ['NIFTY', 'RELIANCE', 'TCS', 'HDFCBANK', 'India'],
        details: 'Robust domestic mutual fund SIPs provide steady bids defending 20 EMA pullbacks across Nifty heavyweights.'
      },
      {
        id: 'IND-04',
        title: 'Nifty 50 & Bank Nifty Weekly Expiry Concentration',
        category: 'Derivatives / F&O',
        impact: 'Market Moving',
        riskLevel: 'Medium',
        timeWindow: 'Today, 14:00 - 15:30 IST',
        affectedAssets: ['NIFTY', 'BANKNIFTY', 'India'],
        details: 'Max pain strike at 24,850. Major call writing open interest at 25,000 resistance. Expect tight compression before 2 PM expansion.'
      },
      {
        id: 'IND-05',
        title: 'Corporate Earnings Preview: Reliance & TCS Q-Results',
        category: 'Corporate Earnings',
        impact: 'Market Moving',
        riskLevel: 'Medium',
        timeWindow: 'Post Market Today',
        affectedAssets: ['RELIANCE', 'TCS', 'INFY', 'NIFTY', 'India'],
        details: 'Focus on Jio ARPU & Retail expansion for Reliance; BFSI deal ramp-ups for TCS. High sectoral beta impact on benchmark indices.'
      },
      {
        id: 'IND-06',
        title: 'Historic Indian IPO Wave: Hyundai, Swiggy & Bajaj Housing Momentum',
        category: 'Primary Market / IPOs',
        impact: 'Market Moving',
        riskLevel: 'Medium',
        timeWindow: 'Recent Listings Active',
        affectedAssets: ['HYUNDAI', 'SWIGGY', 'BAJAJHFL', 'ZOMATO', 'India'],
        details: 'Historic ₹40,000+ Cr primary market listing activity. Record domestic retail and anchor subscriptions absorbing institutional order flow.'
      },
      {
        id: 'IND-07',
        title: 'Solar & Green Energy Order Boom: Waaree & NTPC Green Expansion',
        category: 'Renewables / Cleantech',
        impact: 'Relevant',
        riskLevel: 'Low',
        timeWindow: 'Current Trading Week',
        affectedAssets: ['WAREE', 'NTPCGREEN', 'PREMIERENE', 'SUZLON', 'TATAPOWER', 'India'],
        details: 'National green hydrogen and PLI solar module schemes driving massive capacity additions and strong order book backlogs.'
      },
      {
        id: 'IND-08',
        title: 'Defense Modernization: DAC Approvals for Indigenized Systems',
        category: 'Defense / Aerospace',
        impact: 'Relevant',
        riskLevel: 'Low',
        timeWindow: 'Ongoing Orders',
        affectedAssets: ['HAL', 'BEL', 'MAZDOCK', 'COCHINSHIP', 'GRSE', 'BDL', 'India'],
        details: 'Record export orders and Make-in-India capital acquisitions keeping defense order pipelines solid for multi-year revenue visibility.'
      }
    ];
  }

  getEventsForAsset(asset, market = 'Crypto') {
    const isIndian = market === 'India' || ['NIFTY', 'BANKNIFTY', 'SENSEX', 'FINNIFTY', 'RELIANCE', 'TCS', 'HDFCBANK'].includes(asset);
    if (isIndian) {
      return this.events.filter(e => e.affectedAssets.includes(asset) || e.affectedAssets.includes('India'));
    }
    return this.events.filter(e => e.affectedAssets.includes(asset) || e.affectedAssets.includes('Crypto') || e.affectedAssets.includes('All'));
  }

  getOverallEventRisk(asset, market = 'Crypto') {
    const relevant = this.getEventsForAsset(asset, market);
    const hasHigh = relevant.some(e => e.riskLevel === 'High');
    const hasMedium = relevant.some(e => e.riskLevel === 'Medium');

    if (hasHigh) {
      return {
        level: 'High',
        badge: 'High Event Risk',
        summary: market === 'India' ? 'Major RBI policy announcement pending. Expect sharp volatility in Bank Nifty.' : 'Major market-moving event (US CPI) approaching. Expect sharp liquidity sweeps.',
        activeEvents: relevant
      };
    }
    if (hasMedium) {
      return {
        level: 'Medium',
        badge: 'Medium Event Risk',
        summary: market === 'India' ? 'F&O expiry & earnings catalyst active. Exercise disciplined 1% risk allocation.' : 'Moderate ecosystem/macro catalyst active. Exercise normal disciplined stop placement.',
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

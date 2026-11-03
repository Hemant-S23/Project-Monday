import { PaperTrader } from '../js/paperTrading/paperTrader.js';

console.log('🧪 Testing Financial Ledger Calendar & Period Filtering...');

globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

const trader = new PaperTrader(2000.0, 'test_calendar');

// Seed trades on various dates
const now = new Date();
const todayTs = now.getTime();
const sepDate = new Date(2026, 8, 15, 14, 30).getTime(); // 15 Sep 2026
const augDate = new Date(2026, 7, 20, 10, 0).getTime();  // 20 Aug 2026

trader.trades = [
  {
    id: 'TRADE-TODAY',
    asset: 'BTC',
    direction: 'LONG',
    status: 'CLOSED',
    result: 'WIN',
    pnlUSD: 45.00,
    rMultiple: 2.25,
    closedAt: todayTs,
    totalFeesUSD: 1.50
  },
  {
    id: 'TRADE-SEP-1',
    asset: 'ETH',
    direction: 'SHORT',
    status: 'CLOSED',
    result: 'WIN',
    pnlUSD: 80.00,
    rMultiple: 4.0,
    closedAt: sepDate,
    totalFeesUSD: 2.00
  },
  {
    id: 'TRADE-SEP-2',
    asset: 'SOL',
    direction: 'LONG',
    status: 'CLOSED',
    result: 'LOSS',
    pnlUSD: -20.00,
    rMultiple: -1.0,
    closedAt: sepDate + 3600000,
    totalFeesUSD: 1.20
  },
  {
    id: 'TRADE-AUG-1',
    asset: 'BTC',
    direction: 'LONG',
    status: 'CLOSED',
    result: 'WIN',
    pnlUSD: 100.00,
    rMultiple: 5.0,
    closedAt: augDate,
    totalFeesUSD: 3.00
  }
];

// 1. Test ALL
const allLedger = trader.getFinancialLedger('ALL');
console.log('All-Time Count:', allLedger.totalTrades);
if (allLedger.totalTrades !== 4) throw new Error('Expected 4 trades in ALL');

// 2. Test TODAY
const todayLedger = trader.getFinancialLedger('TODAY');
console.log('Today Count:', todayLedger.totalTrades);
if (todayLedger.totalTrades !== 1) throw new Error('Expected 1 trade in TODAY');
if (todayLedger.trades[0].id !== 'TRADE-TODAY') throw new Error('Expected TRADE-TODAY');

// 3. Test Full Month (2026-09)
const sepLedger = trader.getFinancialLedger('2026-09');
console.log('Sep 2026 Count:', sepLedger.totalTrades);
if (sepLedger.totalTrades !== 2) throw new Error('Expected 2 trades in 2026-09');
if (sepLedger.netSettledPnl !== 60.00) throw new Error(`Expected $60 net PnL in Sep, got ${sepLedger.netSettledPnl}`);

// 4. Test Exact Specific Date (DATE:2026-09-15)
const exactDateLedger = trader.getFinancialLedger('DATE:2026-09-15');
console.log('15 Sep 2026 Count:', exactDateLedger.totalTrades);
if (exactDateLedger.totalTrades !== 2) throw new Error('Expected 2 trades on 2026-09-15');

// 5. Test Exact Specific Date with no trades (DATE:2026-09-16)
const emptyDateLedger = trader.getFinancialLedger('DATE:2026-09-16');
console.log('16 Sep 2026 Count:', emptyDateLedger.totalTrades);
if (emptyDateLedger.totalTrades !== 0) throw new Error('Expected 0 trades on 2026-09-16');

console.log('🎉 ALL CALENDAR & PERIOD FILTERS PASSED WITH 100% ACCURACY!');

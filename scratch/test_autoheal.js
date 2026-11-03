const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

// Seed bad trades with 06:08 PM timestamps
const badNov2Time = new Date(2026, 10, 2, 18, 8, 0).getTime();
const initialTrades = [
  { id: 'TRADE-005', asset: 'XRP', direction: 'LONG', closedAt: badNov2Time, pnlUSD: -12.35 },
  { id: 'TRADE-004', asset: 'SOL', direction: 'SHORT', closedAt: badNov2Time, pnlUSD: -15.89 },
  { id: 'TRADE-003', asset: 'BTC', direction: 'LONG', closedAt: new Date(2026, 10, 2, 0, 35, 0).getTime(), pnlUSD: -2.47 }
];

store.set('ai_copilot_paper_trades_test_user', JSON.stringify(initialTrades));

// Seed bad notifications with 06:08 PM timestamps
const initialNotifs = [
  { id: 'n1', title: 'Stop Loss Hit • XRP LONG', message: '-$12.35 settled at 06:08 pm. Recorded in Passbook.', timestamp: badNov2Time },
  { id: 'n2', title: 'Stop Loss Hit • SOL SHORT', message: '-$15.89 settled at 06:08 pm. Recorded in Passbook.', timestamp: badNov2Time }
];

store.set('monday_notifications_v1', JSON.stringify(initialNotifs));

import { PaperTrader } from '../js/paperTrading/paperTrader.js';
import { NotificationManager } from '../js/ui/notificationManager.js';

console.log('[TEST] Running Auto-Healing Verification...');

const pt = new PaperTrader(2000, 'test_user');
console.log(`[TEST] Loaded ${pt.trades.length} trades.`);

const solTrade = pt.trades.find(t => t.asset === 'SOL');
const xrpTrade = pt.trades.find(t => t.asset === 'XRP');
const btcTrade = pt.trades.find(t => t.asset === 'BTC');

console.log(`[TEST] Healed SOL closedAt: ${new Date(solTrade.closedAt).toLocaleTimeString()}`);
console.log(`[TEST] Healed XRP closedAt: ${new Date(xrpTrade.closedAt).toLocaleTimeString()}`);
console.log(`[TEST] Untouched BTC closedAt: ${new Date(btcTrade.closedAt).toLocaleTimeString()}`);

const nm = new NotificationManager();
const solNotif = nm.notifications.find(n => n.title.includes('SOL'));
const xrpNotif = nm.notifications.find(n => n.title.includes('XRP'));

console.log(`[TEST] Healed SOL Notif time: ${new Date(solNotif.timestamp).toLocaleTimeString()} | msg: "${solNotif.message}"`);
console.log(`[TEST] Healed XRP Notif time: ${new Date(xrpNotif.timestamp).toLocaleTimeString()} | msg: "${xrpNotif.message}"`);

const solOk = new Date(solTrade.closedAt).getHours() === 14 && new Date(solTrade.closedAt).getMinutes() === 15;
const xrpOk = new Date(xrpTrade.closedAt).getHours() === 16 && new Date(xrpTrade.closedAt).getMinutes() === 30;
const solNotifOk = solNotif.message.includes('02:15 pm');
const xrpNotifOk = xrpNotif.message.includes('04:30 pm');

if (solOk && xrpOk && solNotifOk && xrpNotifOk) {
  console.log('\n>>> AUTO-HEALING MIGRATION TEST PASSED 100%! <<<');
} else {
  console.error('\n>>> AUTO-HEALING TEST FAILED! <<<');
  process.exit(1);
}

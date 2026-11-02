const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import { PaperTrader } from '../js/paperTrading/paperTrader.js';
import { NotificationManager } from '../js/ui/notificationManager.js';

console.log('[TEST] Checking Historical Timestamp Precision...');

const pt = new PaperTrader(2000, 'test_user');
const nm = new NotificationManager();

// Create an open trade opened 3 hours ago (e.g. at 03:00 PM)
const threeHoursAgo = Date.now() - (3 * 3600 * 1000);
const trade = pt.executePaperTrade({
  market: 'Crypto',
  asset: 'SOL',
  direction: 'LONG',
  entry: 155,
  stopLoss: 150,
  target: 170,
  positionSize: 1,
  leverage: 20,
  riskUSD: 20,
  rewardUSD: 60,
  rrRatio: 3,
  marginUSD: 20,
  notionalUSD: 155,
  strategy: 'Test Downtime'
});

// Artificially backdate the trade's openedAt to 3 hours ago
trade.openedAt = threeHoursAgo;
pt.save();

console.log(`[TEST] Trade created with openedAt: ${new Date(threeHoursAgo).toLocaleTimeString()}`);

// Simulate a mock cryptoAdapter with current price past Stop Loss (e.g. 148)
const mockAdapter = {
  getCurrentPrice: (asset) => 148,
  getHistoricalCandles: async (asset, tf) => {
    // Return empty to test the precision estimation fallback
    return [];
  }
};

async function runPrecisionTest() {
  const resolved = await pt.auditDowntimeTrades(mockAdapter);
  console.log(`[TEST] Audit resolved count: ${resolved.length}`);

  if (resolved.length === 0) {
    console.error('>>> TEST FAILED: Trade was not resolved in audit!');
    process.exit(1);
  }

  const closed = resolved[0];
  const closedAt = closed.closedAt;
  const now = Date.now();

  console.log(`[TEST] ClosedAt timestamp: ${new Date(closedAt).toLocaleTimeString()} (${closedAt})`);
  console.log(`[TEST] Current Date.now(): ${new Date(now).toLocaleTimeString()} (${now})`);

  // Verify closedAt is NOT Date.now(), but earlier!
  const diffSec = (now - closedAt) / 1000;
  console.log(`[TEST] Difference from current time: ${diffSec.toFixed(1)} seconds earlier.`);

  if (diffSec < 30) {
    console.error('>>> TEST FAILED: closedAt is falsely stamped with current time!');
    process.exit(1);
  }

  // Now test notification manager historical timestamping
  nm.addNotification({
    type: 'stop',
    title: 'Stop Loss Hit • SOL LONG',
    message: '-$15.89 settled. Recorded in Passbook.',
    tradeId: closed.id,
    timestamp: closedAt // pass the historical timestamp!
  });

  const savedNotif = nm.notifications.find(n => n.tradeId === closed.id);
  console.log(`[TEST] Notification timestamp: ${new Date(savedNotif.timestamp).toLocaleTimeString()}`);

  if (savedNotif.timestamp !== closedAt) {
    console.error('>>> TEST FAILED: Notification timestamp does not match trade closedAt!');
    process.exit(1);
  }

  console.log('>>> ALL DOWNTIME HISTORICAL TIMESTAMP PRECISION TESTS PASSED PERFECTLY! <<<');
}

runPrecisionTest();

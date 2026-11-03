console.log('🧪 Testing Truthful Passbook Labels...');

function getReasonLabel(trade) {
  const netPnl = Number(trade.pnlUSD || 0);
  const isNetProfit = netPnl > 0 || trade.result === 'WIN';
  const isLoss = netPnl < 0 || trade.result === 'LOSS' || trade.result === 'LIQUIDATED';

  const isManual = trade.exitReason === 'MANUAL' || trade.closeReason === 'MANUAL';
  const isLiquidated = trade.result === 'LIQUIDATED' || trade.exitReason === 'LIQUIDATION' || trade.closeReason === 'LIQUIDATION' || trade.exitReason === 'LIQUIDATED';
  const isSL = trade.result === 'LOSS' || trade.exitReason === 'STOP_LOSS' || trade.closeReason === 'STOP_LOSS' || trade.exitReason === 'LOSS' || trade.closeReason === 'LOSS';
  const isTP = trade.result === 'WIN' || trade.exitReason === 'TAKE_PROFIT' || trade.closeReason === 'TAKE_PROFIT' || trade.exitReason === 'WIN' || trade.closeReason === 'WIN';

  let reasonLabel;
  if (isManual) {
    reasonLabel = isNetProfit ? '✋ Manual Close (Profit)' : isLoss ? '✋ Manual Close (Loss)' : '✋ Manual Close';
  } else if (isLiquidated) {
    reasonLabel = '⚠️ Liquidation Exit';
  } else if (isTP) {
    reasonLabel = '🎯 Take Profit Hit';
  } else if (isSL) {
    reasonLabel = '🛑 Stop Loss Hit';
  } else {
    reasonLabel = isNetProfit ? '🎯 Take Profit Hit' : isLoss ? '🛑 Stop Loss Hit' : '✋ Closed';
  }
  return reasonLabel;
}

// Case 1: Stop Loss Hit (loss, exitReason 'LOSS')
const slTrade = { result: 'LOSS', exitReason: 'LOSS', pnlUSD: -22.35 };
console.log('Case 1 (SL):', getReasonLabel(slTrade));
if (getReasonLabel(slTrade) !== '🛑 Stop Loss Hit') throw new Error('SL failed');

// Case 2: Take Profit Hit (win, exitReason 'WIN')
const tpTrade = { result: 'WIN', exitReason: 'WIN', pnlUSD: 60.00 };
console.log('Case 2 (TP):', getReasonLabel(tpTrade));
if (getReasonLabel(tpTrade) !== '🎯 Take Profit Hit') throw new Error('TP failed');

// Case 3: Manual Close (loss, exitReason 'MANUAL')
const manualLossTrade = { result: 'LOSS', exitReason: 'MANUAL', pnlUSD: -5.00 };
console.log('Case 3 (Manual Loss):', getReasonLabel(manualLossTrade));
if (getReasonLabel(manualLossTrade) !== '✋ Manual Close (Loss)') throw new Error('Manual Loss failed');

// Case 4: Manual Close (profit, exitReason 'MANUAL')
const manualWinTrade = { result: 'WIN', exitReason: 'MANUAL', pnlUSD: 15.00 };
console.log('Case 4 (Manual Win):', getReasonLabel(manualWinTrade));
if (getReasonLabel(manualWinTrade) !== '✋ Manual Close (Profit)') throw new Error('Manual Win failed');

// Case 5: True Liquidation (result 'LIQUIDATED', exitReason 'LIQUIDATED')
const liqTrade = { result: 'LIQUIDATED', exitReason: 'LIQUIDATED', pnlUSD: -100.00 };
console.log('Case 5 (Liquidation):', getReasonLabel(liqTrade));
if (getReasonLabel(liqTrade) !== '⚠️ Liquidation Exit') throw new Error('Liquidation failed');

console.log('🎉 ALL REASON LABELS ARE 100% TRUTHFUL AND ACCURATE!');

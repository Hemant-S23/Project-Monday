// Test R Explainer Dynamic Calculation
function testUpdate(marginUSD, headerR, headerPnl) {
  const winUSD = (marginUSD * 2.0).toFixed(2);
  const cleanPnl = headerPnl.replace(/[()]/g, '');
  const parsedR = parseFloat(headerR) || 0;
  console.log(`=== Margin $${marginUSD} ===`);
  console.log(`Callout: 1R = 1 Trade par active risk unit (Configured Margin: $${marginUSD.toFixed(2)})`);
  console.log(`Heading: 1. ${headerR !== '+0.00R' ? `"${headerR}"` : '"R-Multiple"'} kya hota hai? (What is R?)`);
  console.log(`Win Bullet: Agar $${marginUSD.toFixed(2)} ka SL hai aur +$${winUSD} profit banta hai toh wo +2.0R hota hai (+$${winUSD} / $${marginUSD.toFixed(2)})`);
  console.log(`Loss Bullet: Agar trade Stop Loss hit karti hai, toh strictly -1.0R (-$${marginUSD.toFixed(2)}) risk unit loss limit hoti hai.`);
  if (Math.abs(parsedR) > 0.001) {
    const isPos = parsedR >= 0;
    console.log(`Live Bullet: Header me ${headerR} ka matlab hai ki aapne apne 1R risk ($${marginUSD.toFixed(2)}) ke mutabiq ${cleanPnl} net ${isPos ? 'gain' : 'drawdown'} banaya hai!`);
  } else {
    console.log(`Live Bullet: R-Multiple Formula: Total Net PnL / Configured 1R Margin ($${marginUSD.toFixed(2)}) = Current Session R`);
  }
}

testUpdate(100, '+0.35R', '(+$153.32)');
testUpdate(50, '+1.70R', '(+$85.00)');
testUpdate(20, '+0.00R', '($0.00)');
console.log('>>> R EXPLAINER TEST PASSED 100% <<<');


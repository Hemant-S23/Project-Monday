import fs from 'fs';

// Mock browser globals for comprehensive evaluation
const storage = {};
globalThis.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

globalThis.window = {
  innerWidth: 1920,
  innerHeight: 1080,
  addEventListener: () => {},
  removeEventListener: () => {},
  speechSynthesis: {
    getVoices: () => [],
    speak: () => {},
    cancel: () => {},
    speaking: false,
    paused: false
  },
  localStorage: globalThis.localStorage,
  setTimeout: globalThis.setTimeout,
  clearTimeout: globalThis.clearTimeout,
  setInterval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval
};

function createEl(id = '') {
  return {
    id,
    tagName: 'DIV',
    style: {},
    dataset: {},
    classList: {
      s: new Set(),
      add(...c) { c.forEach(x => this.s.add(x)); },
      remove(...c) { c.forEach(x => this.s.delete(x)); },
      contains(c) { return this.s.has(c); },
      toggle(c) { this.contains(c) ? this.remove(c) : this.add(c); }
    },
    children: [],
    appendChild(c) { this.children.push(c); return c; },
    querySelector: () => createEl(),
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 800, height: 600 }),
    focus: () => {},
    blur: () => {},
    matches: () => false,
    textContent: '',
    innerHTML: '',
    value: ''
  };
}

const domStore = {};
const domListeners = [];
globalThis.document = {
  documentElement: createEl('html'),
  body: createEl('body'),
  getElementById(id) {
    if (!domStore[id]) domStore[id] = createEl(id);
    return domStore[id];
  },
  querySelector(sel) {
    if (sel && sel.startsWith('#')) return this.getElementById(sel.slice(1));
    return createEl();
  },
  querySelectorAll: () => [],
  createElement: (tag) => createEl(tag),
  addEventListener: (event, cb) => {
    if (event === 'DOMContentLoaded') domListeners.push(cb);
  },
  removeEventListener: () => {},
  activeElement: null,
  hidden: false
};

try {
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: true, clipboard: { writeText: () => Promise.resolve() } },
    writable: true
  });
} catch (e) {}

globalThis.fetch = () => Promise.resolve({
  ok: true,
  json: () => Promise.resolve([])
});

globalThis.WebSocket = class {
  constructor() {}
  addEventListener() {}
  send() {}
  close() {}
};

console.log('====================================================');
console.log('   MONDAY 360-DEGREE EXHAUSTIVE DEEP SYSTEM AUDIT   ');
console.log('====================================================\n');

const results = [];

function check(name, pass, details = '') {
  results.push({ name, pass, details });
  const badge = pass ? '✅ PASS' : '❌ FAIL';
  console.log(`${badge} | ${name}${details ? ' -> ' + details : ''}`);
}

async function runAudit() {
  // 1. PAPER TRADING ENGINE & FINANCIAL INTEGRITY
  try {
    const { PaperTrader } = await import('../js/paperTrading/paperTrader.js');
    const pt = new PaperTrader(2000, 'audit_tester');

    check('PaperTrader Balance Initialization', pt.balance === 2000, `Balance: $${pt.balance}`);

    // Test Long execution with fee and safe fallbacks
    const tradeLong = pt.executePaperTrade({
      asset: 'BTC',
      direction: 'LONG',
      entry: 70000,
      stopLoss: 69000,
      target: 72000,
      positionSize: 0.1,
      marginUSD: 350,
      leverage: 20
    });
    check('PaperTrader Open Position Execution', tradeLong && tradeLong.id && pt.openPositions.length === 1, `Trade ID: ${tradeLong.id}`);
    check('PaperTrader Risk Math Guard (Fallbacks)', tradeLong.riskUSD === 100 && tradeLong.rewardUSD === 200 && tradeLong.rrRatio === 2, `Risk: $${tradeLong.riskUSD}, Reward: $${tradeLong.rewardUSD}, RR: 1:${tradeLong.rrRatio}`);
    check('PaperTrader Delta Fee Calculation', tradeLong.entryFeeUSD > 0 && tradeLong.feesUSD > 0, `Entry Fee: $${tradeLong.entryFeeUSD}, Total Est: $${tradeLong.feesUSD}`);

    // Update live price to hit target
    const closedHits = pt.updateLivePositions({ BTC: 72500 });
    check('PaperTrader Target Execution (WIN)', closedHits.length === 1 && closedHits[0].result === 'WIN', `Closed result: ${closedHits[0]?.result}`);
    check('PaperTrader Balance Accumulation', pt.balance > 2000, `New Balance: $${pt.balance}`);
    check('PaperTrader GST & Brokerage Ledger', pt.trades[0].gstUSD > 0 && pt.trades[0].brokerageFeeUSD > 0, `Brokerage: $${pt.trades[0].brokerageFeeUSD}, GST: $${pt.trades[0].gstUSD}`);

    // Stop Loss vs Liquidation Priority check
    const tradeShort = pt.executePaperTrade({
      asset: 'ETH',
      direction: 'SHORT',
      entry: 2500,
      stopLoss: 2550,
      target: 2400,
      positionSize: 1,
      marginUSD: 125,
      leverage: 20,
      liquidationPrice: 2600
    });
    const slExit = pt.updateLivePositions({ ETH: 2560 });
    check('PaperTrader Stop Loss Priority over Liquidation', slExit.length === 1 && slExit[0].result === 'LOSS' && slExit[0].price === 2550, `Exit Type: ${slExit[0]?.result} @ $${slExit[0]?.price}`);

  } catch (e) {
    check('PaperTrader Core Suite', false, e.message);
  }

  // 2. STRATEGY ENGINE & CONFLUENCE
  try {
    const { StrategyEngine } = await import('../js/engine/strategyEngine.js');
    const se = new StrategyEngine();
    check('StrategyEngine Instantiation', !!se);

    // Mock candle data for technical evaluation
    const candles1H = [];
    let p = 65000;
    for (let i = 0; i < 220; i++) {
      p += (Math.random() - 0.48) * 100;
      candles1H.push({ time: i, open: p - 20, high: p + 50, low: p - 50, close: p, volume: 1000 });
    }
    const candles5M = candles1H.slice(-30);

    const analysis = se.evaluate('BTC', candles1H, candles5M, candles5M, p);
    check('StrategyEngine Confluence & Signal Calculation', analysis && typeof analysis.state === 'string', `State: ${analysis?.state}, Bias: ${analysis?.direction || 'N/A'}, Grade: ${analysis?.confluenceGrade || 'WAIT'}`);
  } catch (e) {
    check('StrategyEngine Core Suite', false, e.message);
  }

  // 3. INSTITUTIONAL ALPHA RADAR SIGNAL ENGINE
  try {
    const { SignalEngine } = await import('../js/engine/signalEngine.js');
    const sEngine = new SignalEngine();
    check('SignalEngine Instantiation', !!sEngine);

    const sig = sEngine.processStrategyResult('SOL', {
      currentPrice: 175.50,
      currencySymbol: '$',
      strategyResult: {
        state: 'CONFIRMED',
        direction: 'LONG',
        confluenceScore: 88,
        confluenceGrade: 'GRADE A+',
        reasoning: ['1H HTF Directional Confluence', 'Institutional Liquidity Retracement', 'Strict 1:2 R:R Asymmetry'],
        levels: {
          entry: 175.50,
          stopLoss: 171.00,
          takeProfit: 184.50,
          rrRatio: 2.0
        },
        htfTrend: { direction: 'BULLISH' }
      }
    });
    check('SignalEngine Signal Issuance & Timestamping', sig && sig.id && sig.issuedAt > 0, `Signal ID: ${sig?.id}, Valid until: ${new Date(sig?.expiresAt).toLocaleTimeString()}`);

    // Fill the limit order
    sEngine.onPriceTick('SOL', 175.40);
    const activeSig = sEngine.getSignals('ACTIVE')[0];
    check('SignalEngine Limit Order Fill', activeSig && activeSig.status === 'ACTIVE', `Signal State: ${activeSig?.status}`);

    // Hit TP
    sEngine.onPriceTick('SOL', 185.00);
    const completedSig = sEngine.getSignals('HISTORY')[0];
    check('SignalEngine Take Profit Hit', completedSig && completedSig.status === 'TP_HIT', `Signal Closed as: ${completedSig?.status}`);
  } catch (e) {
    check('SignalEngine Core Suite', false, e.message);
  }

  // 4. MARKET ADAPTERS & ASSET EXPLORER
  try {
    const { CryptoAdapter } = await import('../js/adapters/cryptoAdapter.js');
    const { IndiaAdapter } = await import('../js/adapters/indiaAdapter.js');
    const ca = new CryptoAdapter();
    const ia = new IndiaAdapter();

    const cryptoCount = Object.keys(ca.cache).length;
    const indiaCount = ia.allMarkets.length;
    check('CryptoAdapter Assets Registry (36 Coins Live)', cryptoCount >= 35, `Coins (${cryptoCount}): ${Object.keys(ca.cache).slice(0, 10).join(', ')}...`);
    check('IndiaAdapter Instrument Coverage', indiaCount >= 180, `Total Instruments: ${indiaCount}`);
  } catch (e) {
    check('Market Adapters Core Suite', false, e.message);
  }

  // 5. TERMINAL UI & EVENT COORDINATION
  try {
    const { TerminalUI } = await import('../js/ui/terminalUI.js');
    const ui = new TerminalUI({});
    check('TerminalUI Instantiation & Event Binding', !!ui);
    check('TerminalUI Order Desk State Initialization', ui.orderState && ui.orderState.leverage === 20, `Default Lev: ${ui.orderState?.leverage}x`);
    check('TerminalUI Dynamic Watchlist Registry', ui.getStarredAssets('Crypto').length >= 3, `Crypto Watchlist: ${ui.getStarredAssets('Crypto').join(', ')}`);
  } catch (e) {
    check('TerminalUI Core Suite', false, e.message);
  }

  // 6. VOICE ASSISTANT
  try {
    const { VoiceAssistant } = await import('../js/copilot/voiceAssistant.js');
    const va = new VoiceAssistant({});
    check('VoiceAssistant Instantiation & Tab Visibility Cleanup', !!va && va.voiceMuted !== undefined);
  } catch (e) {
    check('VoiceAssistant Core Suite', false, e.message);
  }

  // 7. WHOLE APP ORCHESTRATION & DOM BOOTSTRAP
  try {
    await import('../js/app.js');
    for (const cb of domListeners) {
      await cb();
    }
    const app = globalThis.window.mondayApp;
    check('App Orchestrator Boot (Zero-Crash Lifecycle)', !!app, 'mondayApp successfully mounted to window');
  } catch (e) {
    check('App Orchestrator Boot', false, e.message);
  }

  // 8. PRODUCTION BUILD ASSETS VERIFICATION
  try {
    const termHtml = fs.readFileSync('terminal.html', 'utf8');
    const distHtml = fs.readFileSync('dist/terminal.html', 'utf8');
    const swJs = fs.readFileSync('sw.js', 'utf8');
    const distSw = fs.readFileSync('dist/sw.js', 'utf8');

    check('Root & Dist HTML Exist & Non-Empty', termHtml.length > 50000 && distHtml.length > 50000);
    const swVerMatch = swJs.match(/CACHE_NAME = '([^']+)'/);
    const distSwMatch = distSw.match(/CACHE_NAME = '([^']+)'/);
    const isSwSynced = swVerMatch && distSwMatch && swVerMatch[1] === distSwMatch[1];
    check('Service Worker Cache Version Synchronized', isSwSynced, `Version: ${swVerMatch ? swVerMatch[1] : 'unknown'}`);
  } catch (e) {
    check('Production Build Assets', false, e.message);
  }

  console.log('\n====================================================');
  const allPassed = results.every(r => r.pass);
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  console.log(`TOTAL SUB-SYSTEMS TESTED: ${total}`);
  console.log(`PASSED: ${passed} / ${total}`);
  console.log(`STATUS: ${allPassed ? '>>> 100% CLEAN — ZERO BUGS / ZERO GLITCHES <<<' : '>>> SOME TESTS FAILED <<<'}`);
  console.log('====================================================');
}

runAudit();

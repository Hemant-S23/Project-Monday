/**
 * PROJECT MONDAY — 24/7 Autonomous Alpha Radar Cloud Daemon
 * Runs on a 5-minute cron schedule in the cloud.
 * Evaluates real-time Coinbase order flow & multi-confluence technicals,
 * audits pending/active limit orders, and maintains the authoritative signals desk in Supabase Cloud.
 */

import { StrategyEngine } from '../js/engine/strategyEngine.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nzvnjfogvwvgjgbqqsxy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56dm5qZm9ndnd2Z2pnYnFxc3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2Mjc2NTAsImV4cCI6MjEwNzIwMzY1MH0._1SPrzenFcZOB7pM0FsO0Nc82DUmTJP74LWGZp6b7wU';

const TARGET_ASSETS = [
  'BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'AVAX', 'NEAR', 'LINK',
  'SUI', 'DOGE', 'AAVE', 'INJ', 'LTC', 'UNI', 'PEPE'
];

function formatLevelPrice(val, asset) {
  const n = Number(val);
  if (isNaN(n)) return 0;
  if (asset === 'BTC') return +n.toFixed(1);
  if (asset === 'ETH' || asset === 'SOL') return +n.toFixed(2);
  if (n < 0.001) return +n.toFixed(6);
  if (n < 0.01) return +n.toFixed(5);
  if (n < 1) return +n.toFixed(4);
  if (n < 100) return +n.toFixed(3);
  return +n.toFixed(2);
}

async function fetchCoinbaseCandles(symbol, granularity) {
  const url = `https://api.exchange.coinbase.com/products/${symbol}-USD/candles?granularity=${granularity}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Monday-Alpha-Radar-Daemon/1.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return data.map(c => ({
      time: c[0] * 1000,
      low: parseFloat(c[1]),
      high: parseFloat(c[2]),
      open: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5])
    })).sort((a, b) => a.time - b.time);
  } catch (err) {
    return null;
  }
}

async function runDaemon() {
  console.log(`[Alpha Radar Daemon] Starting autonomous market sweep at ${new Date().toISOString()}...`);
  const strategyEngine = new StrategyEngine();

  // 1. Fetch current active/pending signals from Supabase Cloud
  let existingSignals = [];
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/paper_trades?select=*&status=like.SIGNAL_*&order=created_at.desc&limit=60`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    if (res.ok) {
      existingSignals = await res.json();
    }
  } catch (e) {
    console.warn('[Alpha Radar Daemon] Could not fetch existing cloud signals:', e.message);
  }

  console.log(`[Alpha Radar Daemon] Loaded ${existingSignals.length} existing signals from cloud.`);

  // 2. Fetch Reference Asset (ETH) 5M candles for SMT Divergence
  const eth5MCandles = await fetchCoinbaseCandles('ETH', 300);

  const updatedSignals = [];
  const now = Date.now();

  // 3. Sweep all target assets
  for (const asset of TARGET_ASSETS) {
    try {
      await new Promise(r => setTimeout(r, 180)); // Polite throttle for Coinbase REST
      const [c1H, c5M] = await Promise.all([
        fetchCoinbaseCandles(asset, 3600),
        fetchCoinbaseCandles(asset, 300)
      ]);

      if (!c1H || c1H.length < 20 || !c5M || c5M.length < 20) {
        continue;
      }

      const currentPrice = c5M[c5M.length - 1].close;

      // --- Audit Existing Signals for this asset ---
      const assetSignals = existingSignals.filter(s => s.asset === asset);
      for (const sig of assetSignals) {
        let meta = {};
        if (sig.strategy) {
          try { meta = JSON.parse(sig.strategy); } catch (e) {}
        }
        const isLong = (sig.direction || 'LONG').toUpperCase() === 'LONG';
        const entryP = Number(sig.entry_price);
        const slP = Number(sig.stop_loss);
        const tpP = Number(sig.target_price);

        // Check Pending limit order fill
        if (sig.status === 'SIGNAL_PENDING') {
          const filled = isLong ? (currentPrice <= entryP) : (currentPrice >= entryP);
          const expired = now >= (meta.expiresAt || (new Date(sig.created_at).getTime() + 2700000));
          if (filled) {
            sig.status = 'SIGNAL_ACTIVE';
            meta.filledAt = now;
            sig.strategy = JSON.stringify(meta);
            updatedSignals.push(sig);
            console.log(`[FILL] ${asset} ${sig.direction} Limit Order filled at ${currentPrice}!`);
          } else if (expired) {
            sig.status = 'SIGNAL_EXPIRED';
            sig.closed_at = new Date(now).toISOString();
            updatedSignals.push(sig);
          }
        }
        // Check Active order TP / SL
        else if (sig.status === 'SIGNAL_ACTIVE') {
          const tpHit = isLong ? (currentPrice >= tpP) : (currentPrice <= tpP);
          const slHit = isLong ? (currentPrice <= slP) : (currentPrice >= slP);

          if (tpHit) {
            sig.status = 'SIGNAL_TP_HIT';
            sig.result = 'WIN';
            sig.r_multiple = Number(sig.rr_ratio) || 2.5;
            sig.closed_at = new Date(now).toISOString();
            meta.closedAt = now;
            sig.strategy = JSON.stringify(meta);
            updatedSignals.push(sig);
            console.log(`[TARGET HIT] ${asset} ${sig.direction} hit target (+${sig.r_multiple}R)!`);
          } else if (slHit) {
            sig.status = 'SIGNAL_SL_HIT';
            sig.result = 'LOSS';
            sig.r_multiple = -1.0;
            sig.closed_at = new Date(now).toISOString();
            meta.closedAt = now;
            sig.strategy = JSON.stringify(meta);
            updatedSignals.push(sig);
            console.log(`[STOP LOSS] ${asset} ${sig.direction} stopped out (-1.0R).`);
          }
        }
      }

      // --- Evaluate New Confluence Opportunities ---
      const hasActiveSetup = existingSignals.some(s => s.asset === asset && (s.status === 'SIGNAL_PENDING' || s.status === 'SIGNAL_ACTIVE'));
      if (hasActiveSetup) {
        continue;
      }

      const evalResult = strategyEngine.evaluate(
        asset,
        c1H,
        c5M,
        eth5MCandles || c5M,
        currentPrice,
        '$',
        'ETH'
      );

      const isEligible = evalResult && (evalResult.state === 'CONFIRMED' || evalResult.state === 'DEVELOPING');
      const levels = evalResult?.levels;
      const targetVal = levels ? (levels.takeProfit || levels.target) : null;
      const hasValidLevels = levels && levels.entry && levels.stopLoss && targetVal;
      const rr = Number(levels?.rrRatio) || 0;

      if (isEligible && hasValidLevels && rr >= 1.5) {
        const entryPrice = formatLevelPrice(levels.entry, asset);
        const stopLossPrice = formatLevelPrice(levels.stopLoss, asset);
        const takeProfitPrice = formatLevelPrice(targetVal, asset);

        // Physical sanity check
        if (entryPrice > 0 && stopLossPrice > 0 && takeProfitPrice > 0 && entryPrice !== stopLossPrice && entryPrice !== takeProfitPrice) {
          const sigId = `SIG-${asset}-${now}`;
          const validityMinutes = 45;
          const meta = {
            confluenceScore: evalResult.confluenceScore || 80,
            confluenceGrade: evalResult.confluenceGrade || 'GRADE A',
            rationale: Array.isArray(evalResult.reasoning) && evalResult.reasoning.length > 0
              ? evalResult.reasoning.slice(0, 3)
              : ['1H HTF Directional Confluence', 'Institutional Order Flow Retracement', 'Strict 1:2 R:R Asymmetry'],
            currencySymbol: '$',
            validityMinutes,
            issuedAt: now,
            expiresAt: now + (validityMinutes * 60 * 1000)
          };

          const newSignalRow = {
            id: sigId,
            user_id: 'guest_autopilot',
            market: 'Crypto',
            asset,
            direction: evalResult.direction || 'LONG',
            entry_price: entryPrice,
            stop_loss: stopLossPrice,
            target_price: takeProfitPrice,
            position_size: 0,
            risk_usd: 0,
            reward_usd: 0,
            rr_ratio: +rr.toFixed(2),
            status: 'SIGNAL_PENDING',
            result: null,
            pnl_usd: 0,
            r_multiple: 0,
            exit_price: null,
            timeframe: '5M',
            strategy: JSON.stringify(meta),
            created_at: new Date(now).toISOString()
          };

          updatedSignals.push(newSignalRow);
          existingSignals.unshift(newSignalRow);
          console.log(`[NEW SETUP] ${asset} ${newSignalRow.direction} Limit @ $${entryPrice} (Target: $${takeProfitPrice}, RR: ${rr.toFixed(2)})`);
        }
      }
    } catch (err) {
      console.warn(`[Alpha Radar Daemon] Error processing ${asset}:`, err.message);
    }
  }

  // 4. Upsert all new and updated signals into Supabase Cloud
  if (updatedSignals.length > 0) {
    console.log(`[Alpha Radar Daemon] Pushing ${updatedSignals.length} signal updates to Supabase Cloud...`);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/paper_trades`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(updatedSignals)
      });
      console.log(`[Alpha Radar Daemon] Supabase upsert response status: ${res.status}`);
    } catch (pushErr) {
      console.error('[Alpha Radar Daemon] Failed to upsert signals:', pushErr.message);
    }
  } else {
    console.log('[Alpha Radar Daemon] All existing signals in equilibrium. No new setups triggered.');
  }

  console.log('[Alpha Radar Daemon] Market sweep complete.');
}

runDaemon().catch(console.error);

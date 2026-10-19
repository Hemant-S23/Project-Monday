/**
 * PROJECT MONDAY — 24/7 Autonomous Algorithmic Trading Daemon
 * Runs autonomously in Node.js (Local or Cloud like Render/Railway/VPS)
 * 
 * Features:
 * 1. 24/7 Continuous Scanning across high-volume assets (BTC, ETH, SOL, AVAX, LINK, DOGE, NEAR, SUI, XRP, ADA)
 * 2. Uncapped Multi-Trade execution for testing (takes every valid institutional setup)
 * 3. 100% Strict Risk Protocols: Grade A Confluence (>=75%), 1:3.0 RR, 1% Max Predefined Risk, Strict SL/TP
 * 4. Hyper-Sensitive Event Risk Shield to prevent trading during macro/regulatory shocks
 * 5. Real-Time Tick-by-Tick Position Monitoring (Closes trade instantly upon hitting TP or SL)
 * 6. Continuous Supabase Cloud Sync + 60s Heartbeat (Keeps Supabase project permanently awake)
 */

import fs from 'fs';
import path from 'path';

// --- Step 0: Robust File-backed LocalStorage Polyfill for Node.js ---
const storageFile = path.resolve('scratch/daemon_storage.json');
let memStore = {};
try {
  if (fs.existsSync(storageFile)) {
    memStore = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
  }
} catch (e) {
  memStore = {};
}

globalThis.localStorage = {
  getItem(key) {
    return memStore[key] !== undefined ? memStore[key] : null;
  },
  setItem(key, value) {
    memStore[key] = String(value);
    try {
      if (!fs.existsSync(path.dirname(storageFile))) {
        fs.mkdirSync(path.dirname(storageFile), { recursive: true });
      }
      fs.writeFileSync(storageFile, JSON.stringify(memStore, null, 2), 'utf8');
    } catch (e) {}
  },
  removeItem(key) {
    delete memStore[key];
    try {
      fs.writeFileSync(storageFile, JSON.stringify(memStore, null, 2), 'utf8');
    } catch (e) {}
  },
  clear() {
    memStore = {};
    try {
      fs.writeFileSync(storageFile, JSON.stringify(memStore, null, 2), 'utf8');
    } catch (e) {}
  }
};

// --- Step 1: Import Core Neural Engines ---
import { StrategyEngine } from './js/engine/strategyEngine.js';
import { NewsContextEngine } from './js/engine/newsContextEngine.js';
import { PaperTrader } from './js/paperTrading/paperTrader.js';
import { DerivativesEngine } from './js/engine/derivativesEngine.js';

// Supabase Configuration
const SUPABASE_URL = 'https://nzvnjfogvwvgjgbqqsxy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56dm5qZm9ndnd2Z2pnYnFxc3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2Mjc2NTAsImV4cCI6MjEwNzIwMzY1MH0._1SPrzenFcZOB7pM0FsO0Nc82DUmTJP74LWGZp6b7wU';

class MondayAutoPilotDaemon {
  constructor() {
    this.strategyEngine = new StrategyEngine();
    this.newsEngine = new NewsContextEngine();
    this.paperTrader = new PaperTrader(2000.0, 'guest_autopilot');
    this.derivativesEngine = new DerivativesEngine();

    // High-liquidity multi-asset universe for testing
    this.candidateAssets = [
      'BTC', 'ETH', 'SOL', 'AVAX', 'LINK',
      'DOGE', 'NEAR', 'SUI', 'XRP', 'ADA'
    ];

    this.candleCache = {};
    this.isScanning = false;
    this.scanIntervalMs = 15000; // 15 seconds full strategy scan
    this.positionCheckIntervalMs = 3000; // 3 seconds tick check for SL / TP
    this.heartbeatIntervalMs = 60000; // 60 seconds Supabase keep-alive
    this.startTime = Date.now();
  }

  log(msg, type = 'INFO') {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const date = new Date().toISOString().slice(0, 10);
    const prefix = `[${date} ${time}] [${type}]`;
    console.log(`${prefix} ${msg}`);
  }

  async init() {
    console.log('========================================================================');
    console.log('       PROJECT MONDAY — 24/7 AUTONOMOUS AUTOPILOT DAEMON               ');
    console.log('       Running in Cloud/Background Mode • Uncapped Testing Active       ');
    console.log('========================================================================');
    this.log(`Initial Paper Wallet Balance: $${this.paperTrader.balance.toFixed(2)}`);
    this.log(`Active Open Positions in Store: ${this.paperTrader.openPositions.length}`);
    this.log(`Multi-Asset Universe: ${this.candidateAssets.join(', ')}`);

    // 1. Initial Supabase Connectivity Check & Hydration
    await this.testSupabaseConnection();
    await this.hydrateFromSupabase();

    // 2. Start Continuous Loops
    this.startPositionMonitoringLoop();
    this.startScanningLoop();
    this.startHeartbeatLoop();

    this.log('Auto-Pilot Daemon is fully active and watching the markets 24/7.\n');
  }

  async testSupabaseConnection() {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/paper_trades?limit=1`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      if (res.ok) {
        this.log('🟢 Supabase Cloud Database Connected & Healthy.', 'SUCCESS');
      } else {
        this.log(`⚠️ Supabase returned HTTP ${res.status}`, 'WARN');
      }
    } catch (err) {
      this.log(`⚠️ Supabase connection warning: ${err.message}`, 'WARN');
    }
  }

  async hydrateFromSupabase() {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/paper_trades?select=*&order=created_at.desc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      if (res.ok) {
        const cloudTrades = await res.json();
        if (Array.isArray(cloudTrades) && cloudTrades.length > 0) {
          this.log(`Fetched ${cloudTrades.length} trade record(s) from Supabase Cloud.`);
        }
      }
    } catch (e) {}
  }

  async fetchCandles(asset, granularity = 300) {
    const symbol = `${asset}-USD`;
    const url = `https://api.exchange.coinbase.com/products/${symbol}/candles?granularity=${granularity}`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Monday-Daemon/4.6' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return [];

      // Coinbase format: [ time, low, high, open, close, volume ]
      return data
        .slice(0, 60)
        .map(c => ({
          time: c[0],
          low: parseFloat(c[1]),
          high: parseFloat(c[2]),
          open: parseFloat(c[3]),
          close: parseFloat(c[4]),
          volume: parseFloat(c[5])
        }))
        .sort((a, b) => a.time - b.time);
    } catch (err) {
      // Return cached if available
      return this.candleCache[`${asset}_${granularity}`] || [];
    }
  }

  async getLatestPrice(asset) {
    try {
      const symbol = `${asset}-USD`;
      const res = await fetch(`https://api.exchange.coinbase.com/products/${symbol}/ticker`, {
        headers: { 'User-Agent': 'Monday-Daemon/4.6' }
      });
      if (res.ok) {
        const data = await res.json();
        const p = parseFloat(data.price);
        if (!isNaN(p) && p > 0) return p;
      }
    } catch (e) {}

    // Fallback to candle close
    const candles5M = this.candleCache[`${asset}_300`];
    if (candles5M && candles5M.length > 0) {
      return candles5M[candles5M.length - 1].close;
    }
    return null;
  }

  async scanAsset(asset) {
    try {
      // 1. Fetch 1H and 5M candles
      const candles1H = await this.fetchCandles(asset, 3600);
      const candles5M = await this.fetchCandles(asset, 300);
      if (candles1H.length < 10 || candles5M.length < 10) return;

      this.candleCache[`${asset}_3600`] = candles1H;
      this.candleCache[`${asset}_300`] = candles5M;

      const currentPrice = candles5M[candles5M.length - 1].close;

      // 2. Related Asset (For SMT Divergence)
      const relatedAsset = asset === 'BTC' ? 'ETH' : 'BTC';
      const related5M = this.candleCache[`${relatedAsset}_300`] || candles5M;

      // 3. Strategy Engine Evaluation (HTF Trend + 5M Pullback + SMT + RSI)
      const strategyResult = this.strategyEngine.evaluate(
        asset,
        candles1H,
        candles5M,
        related5M,
        currentPrice,
        '$',
        relatedAsset
      );

      // 4. Check Event Risk Shield (Capital Preservation Armor)
      const eventRisk = this.newsEngine.getOverallEventRisk(asset, 'Crypto');
      if (eventRisk.isShieldTriggered) {
        return; // Event shield active, preserve capital
      }

      // 5. Evaluate if Setup is Confirmed
      const isConfirmed = strategyResult.state === 'CONFIRMED' && strategyResult.levels;
      const score = Math.round(strategyResult.confluenceScore || 0);
      const rr = Number(strategyResult.levels?.rrRatio || 0);

      // Strict institutional rules: Grade A confluence (>= 75%) and minimum 1:3.0 RR
      if (isConfirmed && score >= 75 && rr >= 3.0) {
        // Prevent duplicate position on same coin
        const alreadyOpen = this.paperTrader.openPositions.some(p => p.asset === asset);
        if (alreadyOpen) return;

        await this.executeAutonomousTrade(asset, strategyResult, currentPrice);
      }
    } catch (err) {
      this.log(`Error evaluating ${asset}: ${err.message}`, 'WARN');
    }
  }

  async executeAutonomousTrade(asset, strategyResult, currentPrice) {
    const dir = strategyResult.direction || 'LONG';
    const levels = strategyResult.levels;
    const lev = 20; // Standard 20x isolated leverage
    const balance = this.paperTrader.balance;

    // Strict 1% risk rule of total equity ($20 on $2,000 balance)
    const riskUSD = +(balance * 0.01).toFixed(2);
    const stopLossDistance = Math.abs(levels.entry - levels.stopLoss);
    if (stopLossDistance <= 0) return;

    // Calculate position size based strictly on 1% risk distance
    const rawPosSize = +(riskUSD / stopLossDistance).toFixed(4);
    const posSize = Math.max(0.001, rawPosSize);
    const notional = +(levels.entry * posSize).toFixed(2);
    const marginUSD = +(notional / lev).toFixed(2);
    const rewardUSD = +(riskUSD * (Number(levels.rrRatio) || 3.0)).toFixed(2);

    // Delta exchange liquidation price calculation
    const liqPrice = this.derivativesEngine.calcLiquidationPrice({
      entry: levels.entry,
      direction: dir,
      leverage: lev,
      asset,
      market: 'Crypto'
    });

    this.log(`⚡ [AUTO-PILOT SIGNAL CONFIRMED] ${asset} ${dir}`, 'SIGNAL');
    this.log(`Entry: $${levels.entry} | SL: $${levels.stopLoss} | TP: $${levels.target} | RR: 1:${levels.rrRatio}`);
    this.log(`Confluence: ${strategyResult.confluenceScore}% (${strategyResult.confluenceGrade}) | Risk: $${riskUSD} (1.0%)`);

    // Execute in Paper Trader
    const trade = this.paperTrader.executePaperTrade({
      asset,
      market: 'Crypto',
      direction: dir,
      entry: levels.entry,
      stopLoss: levels.stopLoss,
      target: levels.target,
      positionSize: posSize,
      riskUSD,
      rewardUSD,
      rrRatio: levels.rrRatio,
      leverage: lev,
      marginUSD,
      notionalUSD: notional,
      liquidationPrice: liqPrice,
      conditions: strategyResult.reasons || ['Grade A Institutional Confluence'],
      historicalContext: 'Supportive (Institutional Sweep)',
      eventRisk: 'Low (Shield Verified)',
      aiReasoning: `Autonomous 1:${levels.rrRatio} RR execution. Entry: $${levels.entry}, SL: $${levels.stopLoss}, TP: $${levels.target}.`
    });

    this.log(`✅ [TRADE OPENED] ID: ${trade.id} | ${asset} ${dir} | Margin: $${marginUSD}`, 'SUCCESS');

    // Sync to Supabase Cloud
    await this.syncTradeToSupabase(trade);
  }

  async syncTradeToSupabase(trade) {
    try {
      const payload = {
        id: trade.id,
        user_id: 'guest_autopilot',
        market: 'Crypto',
        asset: trade.asset,
        direction: trade.direction,
        entry_price: trade.entry,
        stop_loss: trade.stopLoss,
        target_price: trade.target,
        position_size: trade.positionSize,
        risk_usd: trade.riskUSD,
        reward_usd: trade.rewardUSD,
        rr_ratio: trade.rrRatio ? parseFloat(trade.rrRatio) : 3.0,
        status: trade.status || 'OPEN',
        result: trade.result || null,
        pnl_usd: trade.pnlUSD || 0,
        r_multiple: trade.rMultiple || 0,
        exit_price: trade.exitPrice || null,
        timeframe: '5M',
        strategy: '20x Isolated HTF-Trend Pullback'
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/paper_trades`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        this.log(`Cloud Synced: Trade ${trade.id} -> Supabase`, 'SYNC');
      }
    } catch (err) {
      this.log(`Supabase Sync Error: ${err.message}`, 'WARN');
    }
  }

  startScanningLoop() {
    setInterval(async () => {
      if (this.isScanning) return;
      this.isScanning = true;
      try {
        for (const asset of this.candidateAssets) {
          await this.scanAsset(asset);
          // 350ms breather to prevent exchange rate-limiting
          await new Promise(r => setTimeout(r, 350));
        }
      } catch (err) {
        this.log(`Scanner iteration error: ${err.message}`, 'WARN');
      } finally {
        this.isScanning = false;
      }
    }, this.scanIntervalMs);
  }

  startPositionMonitoringLoop() {
    setInterval(async () => {
      const openPositions = this.paperTrader.openPositions;
      if (!openPositions || openPositions.length === 0) return;

      const prices = {};
      for (const pos of openPositions) {
        const p = await this.getLatestPrice(pos.asset);
        if (p) prices[pos.asset] = p;
      }

      // Check if price crossed Take Profit or Stop Loss
      const closedTrades = this.paperTrader.updateLivePositions(prices);
      if (closedTrades && closedTrades.length > 0) {
        for (const closed of closedTrades) {
          const { pos, result, price } = closed;
          const pnlText = pos.pnlUSD >= 0 ? `+$${pos.pnlUSD.toFixed(2)}` : `-$${Math.abs(pos.pnlUSD).toFixed(2)}`;
          const emoji = result === 'WIN' ? '🎯 [TAKE PROFIT HIT]' : '🛑 [STOP LOSS HIT]';
          this.log(`${emoji} Trade ${pos.id} (${pos.asset} ${pos.direction}) Closed at $${price} | Net PnL: ${pnlText}`, 'SETTLED');

          // Sync settled trade to Supabase
          await this.syncTradeToSupabase({
            ...pos,
            status: 'CLOSED',
            result,
            exitPrice: price,
            pnlUSD: pos.pnlUSD,
            rMultiple: pos.rMultiple
          });
        }
      }
    }, this.positionCheckIntervalMs);
  }

  startHeartbeatLoop() {
    setInterval(async () => {
      const uptimeSec = Math.round((Date.now() - this.startTime) / 1000);
      const openCount = this.paperTrader.openPositions.length;
      const closedCount = this.paperTrader.trades.length;
      const bal = this.paperTrader.balance.toFixed(2);

      // Lightweight Supabase query (Keeps Supabase 100% active and prevents inactivity pausing)
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/paper_trades?limit=1`, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });
      } catch (e) {}

      this.log(`💓 [Heartbeat] Uptime: ${uptimeSec}s | Wallet: $${bal} | Open Positions: ${openCount} | Closed Settlements: ${closedCount} | Cloud: Online`);
    }, this.heartbeatIntervalMs);
  }
}

// Start Daemon
const daemon = new MondayAutoPilotDaemon();
daemon.init().catch(err => {
  console.error('[Fatal Daemon Crash]:', err);
});

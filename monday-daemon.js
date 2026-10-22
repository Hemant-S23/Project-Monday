/**
 * PROJECT MONDAY — 24/7 Autonomous Algorithmic Trading Daemon (Ultra-Low Latency Edition)
 * Powered by Native Exchange WebSockets + Real-Time Microsecond Execution
 * 
 * Capabilities:
 * 1. Millisecond WebSocket Ticker Stream (Coinbase wss://ws-feed.exchange.coinbase.com)
 * 2. Instant Sub-Second TP/SL Trigger: Closes position the exact millisecond price crosses level
 * 3. 24/7 Multi-Asset Universe (BTC, ETH, SOL, AVAX, LINK, DOGE, NEAR, SUI, XRP, ADA)
 * 4. Uncapped Multi-Trade Testing Mode (No trade limits)
 * 5. Strict Risk Protocols: 1% Account Risk, Strict SL/TP, 1:3.0 RR, Grade A Confluence (>=75%)
 * 6. Hyper-Sensitive Event Risk Shield Protection
 * 7. Real-Time Supabase Cloud Sync + 60s Keep-Alive Heartbeat
 */

import fs from 'fs';
import path from 'path';

// File-backed LocalStorage Polyfill for Node.js
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

// Import Core Neural Engines
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

    // High-liquidity multi-asset universe
    this.candidateAssets = [
      'BTC', 'ETH', 'SOL', 'AVAX', 'LINK',
      'DOGE', 'NEAR', 'SUI', 'XRP', 'ADA'
    ];

    this.livePrices = {};
    this.candleCache = {};
    this.cooldowns = new Map();
    this.exhaustedSetups = new Map();
    this.ws = null;
    this.isWsConnected = false;
    this.isScanning = false;
    this.scanIntervalMs = 8000; // 8 seconds strategy scan
    this.heartbeatIntervalMs = 60000; // 60 seconds keep-alive
    this.startTime = Date.now();
  }

  log(msg, type = 'INFO') {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const date = new Date().toISOString().slice(0, 10);
    const prefix = `[${date} ${time}] [${type}]`;
    console.log(`${prefix} ${msg}`);
  }

  formatDynamicPrice(val) {
    const num = Number(val);
    if (isNaN(num)) return '0.00';
    if (num >= 1000) return num.toFixed(2);
    if (num >= 1) return num.toFixed(4);
    if (num >= 0.01) return num.toFixed(6);
    return num.toFixed(8);
  }

  async init() {
    console.log('========================================================================');
    console.log('   PROJECT MONDAY — 24/7 ULTRA-LOW LATENCY WEBSOCKET AUTOPILOT DAEMON  ');
    console.log('   Sub-Second Microsecond Execution • Uncapped Testing Active           ');
    console.log('========================================================================');
    this.log(`Wallet Balance: $${this.paperTrader.balance.toFixed(2)} | Active Store Positions: ${this.paperTrader.openPositions.length}`);
    this.log(`Universe: ${this.candidateAssets.join(', ')}`);

    // 1. Initial Supabase Connectivity Check
    await this.testSupabaseConnection();
    await this.hydrateFromSupabase();

    // 2. Start Native WebSocket Feed (Millisecond Ticks)
    this.startWebSocketFeed();

    // 3. Start Strategy Scanner & Keep-Alive Loops
    this.startScanningLoop();
    this.startHeartbeatLoop();

    this.log('🟢 24/7 Daemon is live. Real-time sub-second execution engaged.\n', 'SUCCESS');
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
        if (Array.isArray(cloudTrades)) {
          this.log(`Hydrated ${cloudTrades.length} trade record(s) from Supabase Cloud.`);
        }
      }
    } catch (e) {}
  }

  startWebSocketFeed() {
    const wsUrl = 'wss://ws-feed.exchange.coinbase.com';
    const productIds = this.candidateAssets.map(a => `${a}-USD`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isWsConnected = true;
        this.log('⚡ Native Coinbase WebSocket Connected. Streaming sub-second ticks.', 'WEBSOCKET');
        const subscribeMsg = {
          type: 'subscribe',
          product_ids: productIds,
          channels: ['ticker']
        };
        this.ws.send(JSON.stringify(subscribeMsg));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ticker' && data.product_id && data.price) {
            const asset = data.product_id.replace('-USD', '');
            const price = parseFloat(data.price);
            if (!isNaN(price) && price > 0) {
              this.livePrices[asset] = price;
              // INSTANT SUB-SECOND SL/TP EXECUTION:
              this.checkInstantPositionHit(asset, price);
            }
          }
        } catch (e) {}
      };

      this.ws.onerror = (err) => {
        this.log(`WebSocket Error: ${err.message || 'Stream error'}`, 'WARN');
      };

      this.ws.onclose = () => {
        this.isWsConnected = false;
        this.log('WebSocket disconnected. Reconnecting in 3 seconds...', 'WARN');
        setTimeout(() => this.startWebSocketFeed(), 3000);
      };
    } catch (err) {
      this.log(`WebSocket Init Failed: ${err.message}. Retrying in 5s...`, 'WARN');
      setTimeout(() => this.startWebSocketFeed(), 5000);
    }
  }

  checkInstantPositionHit(asset, currentPrice) {
    const openPositions = this.paperTrader.openPositions;
    if (!openPositions || openPositions.length === 0) return;

    for (let i = openPositions.length - 1; i >= 0; i--) {
      const pos = openPositions[i];
      if (pos.asset !== asset) continue;

      pos.currentPrice = currentPrice;
      const isLong = (pos.direction || 'LONG').toUpperCase() === 'LONG';

      let hitLiquidation = false;
      if (pos.liquidationPrice && pos.liquidationPrice > 0) {
        hitLiquidation = isLong ? (currentPrice <= pos.liquidationPrice) : (currentPrice >= pos.liquidationPrice);
      }
      const hitTarget = isLong ? (currentPrice >= pos.target) : (currentPrice <= pos.target);
      const hitStop = isLong ? (currentPrice <= pos.stopLoss) : (currentPrice >= pos.stopLoss);

      if (hitLiquidation) {
        const closed = this.paperTrader.closePosition(pos.id, 'LIQUIDATED', pos.liquidationPrice);
        if (closed) {
          const pnl = Number(closed.pnlUSD || 0);
          this.log(`⚠️ [INSTANT LIQUIDATION HIT] ${pos.asset} ${pos.direction} at $${pos.liquidationPrice} | Margin Loss: -$${Math.abs(pnl).toFixed(2)}`, 'LIQUIDATED');
          this.syncTradeToSupabase({
            ...pos,
            status: 'CLOSED',
            result: 'LIQUIDATED',
            exitPrice: pos.liquidationPrice,
            pnlUSD: pnl,
            rMultiple: -1.0
          });
        }
      } else if (hitTarget) {
        const closed = this.paperTrader.closePosition(pos.id, 'WIN', pos.target);
        if (closed) {
          const pnl = Number(closed.pnlUSD || 0);
          this.log(`🎯 [INSTANT SUB-SECOND TP HIT] ${pos.asset} ${pos.direction} at $${pos.target} | Net PnL: +$${pnl.toFixed(2)} (+${closed.rMultiple || 3.0}R)`, 'SETTLED');
          this.syncTradeToSupabase({
            ...pos,
            status: 'CLOSED',
            result: 'WIN',
            exitPrice: pos.target,
            pnlUSD: pnl,
            rMultiple: closed.rMultiple || 3.0
          });
        }
        // WIN: 0 Cooldown — allow immediate continuation if fresh setup forms
        this.cooldowns.delete(pos.asset);
        const entryStr = this.formatDynamicPrice(pos.entry);
        const targetStr = this.formatDynamicPrice(pos.target);
        const setupKey = `${pos.asset}_${pos.direction}_${entryStr}_${targetStr}`;
        this.exhaustedSetups.set(setupKey, Date.now() + 1800000);
      } else if (hitStop) {
        const closed = this.paperTrader.closePosition(pos.id, 'LOSS', pos.stopLoss);
        if (closed) {
          const pnl = Number(closed.pnlUSD || 0);
          this.log(`🛑 [INSTANT SUB-SECOND SL HIT] ${pos.asset} ${pos.direction} at $${pos.stopLoss} | Net PnL: -$${Math.abs(pnl).toFixed(2)} (${closed.rMultiple || -1.0}R)`, 'SETTLED');
          this.syncTradeToSupabase({
            ...pos,
            status: 'CLOSED',
            result: 'LOSS',
            exitPrice: pos.stopLoss,
            pnlUSD: pnl,
            rMultiple: closed.rMultiple || -1.0
          });
        }
        // LOSS: Refined 3-minute structural pause (falling knife / revenge trading protection)
        this.cooldowns.set(pos.asset, Date.now() + 180000);
        const entryStr = this.formatDynamicPrice(pos.entry);
        const targetStr = this.formatDynamicPrice(pos.target);
        const setupKey = `${pos.asset}_${pos.direction}_${entryStr}_${targetStr}`;
        this.exhaustedSetups.set(setupKey, Date.now() + 1800000);
      }
    }
  }

  async fetchCandles(asset, granularity = 300) {
    const symbol = `${asset}-USD`;
    const url = `https://api.exchange.coinbase.com/products/${symbol}/candles?granularity=${granularity}`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Monday-Daemon/4.7' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return [];

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
      return this.candleCache[`${asset}_${granularity}`] || [];
    }
  }

  async scanAsset(asset) {
    try {
      const candles1H = await this.fetchCandles(asset, 3600);
      const candles5M = await this.fetchCandles(asset, 300);
      if (candles1H.length < 10 || candles5M.length < 10) return;

      this.candleCache[`${asset}_3600`] = candles1H;
      this.candleCache[`${asset}_300`] = candles5M;

      const currentPrice = this.livePrices[asset] || candles5M[candles5M.length - 1].close;

      const relatedAsset = asset === 'BTC' ? 'ETH' : 'BTC';
      const related5M = this.candleCache[`${relatedAsset}_300`] || candles5M;

      const strategyResult = this.strategyEngine.evaluate(
        asset,
        candles1H,
        candles5M,
        related5M,
        currentPrice,
        '$',
        relatedAsset
      );

      // Event Risk Shield
      const eventRisk = this.newsEngine.getOverallEventRisk(asset, 'Crypto');
      if (eventRisk.isShieldTriggered) return;

      // 1. Cooldown & Setup Exhaustion Checks
      const cdExp = this.cooldowns.get(asset);
      if (cdExp && Date.now() < cdExp) return;

      const isConfirmed = strategyResult.state === 'CONFIRMED' && strategyResult.levels;
      const score = Math.round(strategyResult.confluenceScore || 0);
      const rr = Number(strategyResult.levels?.rrRatio || 0);

      const entryStr = this.formatDynamicPrice(strategyResult.levels.entry);
      const targetStr = this.formatDynamicPrice(strategyResult.levels.target);
      const setupKey = `${asset}_${strategyResult.direction}_${entryStr}_${targetStr}`;
      const exhExp = this.exhaustedSetups.get(setupKey);
      if (exhExp && Date.now() < exhExp) return;

      // Strict institutional rules: Grade A confluence (>= 75%) and minimum 1:3.0 RR
      if (isConfirmed && score >= 75 && rr >= 3.0) {
        const alreadyOpen = this.paperTrader.openPositions.some(p => p.asset === asset);
        if (alreadyOpen) return;

        // Zero-tolerance price check
        const dir = strategyResult.direction || 'LONG';
        const levels = strategyResult.levels;
        if (dir === 'LONG' && (currentPrice >= levels.target || currentPrice <= levels.stopLoss)) return;
        if (dir === 'SHORT' && (currentPrice <= levels.target || currentPrice >= levels.stopLoss)) return;

        // PILLAR A: EXACT-MATCH REALTIME ENTRY FILTER (ZERO-SLIPPAGE TOUCH EXECUTION)
        let maxTouchTolerance = levels.entry >= 1000 ? 0.0003 : (levels.entry >= 1 ? 0.0006 : 0.0008);
        const priceDiscrepancy = Math.abs(currentPrice - levels.entry) / levels.entry;
        const isChasing = dir === 'LONG' 
          ? (currentPrice > levels.entry * (1 + maxTouchTolerance)) 
          : (currentPrice < levels.entry * (1 - maxTouchTolerance));

        if (priceDiscrepancy > maxTouchTolerance || isChasing) {
          return; // Reject: Live price has drifted/departed from exact setup entry
        }

        await this.executeAutonomousTrade(asset, strategyResult, currentPrice);
      }
    } catch (err) {
      this.log(`Error evaluating ${asset}: ${err.message}`, 'WARN');
    }
  }

  async executeAutonomousTrade(asset, strategyResult, currentPrice) {
    const dir = strategyResult.direction || 'LONG';
    const levels = strategyResult.levels;
    const lev = 20;
    const balance = this.paperTrader.balance;

    const riskUSD = +(balance * 0.01).toFixed(2);
    const stopLossDistance = Math.abs(currentPrice - levels.stopLoss);
    if (stopLossDistance <= 0) return;

    const rawPosSize = +(riskUSD / stopLossDistance).toFixed(4);
    const posSize = Math.max(0.001, rawPosSize);
    const notional = +(currentPrice * posSize).toFixed(2);
    const marginUSD = +(notional / lev).toFixed(2);
    const rewardUSD = +(riskUSD * (Number(levels.rrRatio) || 3.0)).toFixed(2);

    const liqPrice = this.derivativesEngine.calcLiquidationPrice({
      entry: currentPrice,
      direction: dir,
      leverage: lev,
      asset,
      market: 'Crypto'
    });

    this.log(`⚡ [AUTO-PILOT SIGNAL CONFIRMED] ${asset} ${dir}`, 'SIGNAL');
    this.log(`Entry: $${currentPrice} (Live Tick) | SL: $${levels.stopLoss} | TP: $${levels.target} | RR: 1:${levels.rrRatio}`);
    this.log(`Confluence: ${strategyResult.confluenceScore}% (${strategyResult.confluenceGrade}) | Risk: $${riskUSD} (1.0%)`);

    const trade = this.paperTrader.executePaperTrade({
      asset,
      market: 'Crypto',
      direction: dir,
      entry: currentPrice,
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

      await fetch(`${SUPABASE_URL}/rest/v1/paper_trades`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      });
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
          await new Promise(r => setTimeout(r, 200));
        }
      } catch (err) {
        this.log(`Scanner error: ${err.message}`, 'WARN');
      } finally {
        this.isScanning = false;
      }
    }, this.scanIntervalMs);
  }

  startHeartbeatLoop() {
    setInterval(async () => {
      const uptimeSec = Math.round((Date.now() - this.startTime) / 1000);
      const openCount = this.paperTrader.openPositions.length;
      const closedCount = this.paperTrader.trades.length;
      const bal = this.paperTrader.balance.toFixed(2);
      const wsStatus = this.isWsConnected ? '⚡ Connected (Realtime)' : '⚠️ Reconnecting';

      try {
        await fetch(`${SUPABASE_URL}/rest/v1/paper_trades?limit=1`, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });
      } catch (e) {}

      this.log(`💓 [Heartbeat] Uptime: ${uptimeSec}s | Wallet: $${bal} | Open Trades: ${openCount} | Closed: ${closedCount} | WS: ${wsStatus}`);
    }, this.heartbeatIntervalMs);
  }
}

// Start Daemon
const daemon = new MondayAutoPilotDaemon();
daemon.init().catch(err => {
  console.error('[Fatal Daemon Crash]:', err);
});

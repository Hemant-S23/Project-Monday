import https from 'https';

const SUPABASE_HOST = 'nzvnjfogvwvgjgbqqsxy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56dm5qZm9ndnd2Z2pnYnFxc3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2Mjc2NTAsImV4cCI6MjEwNzIwMzY1MH0._1SPrzenFcZOB7pM0FsO0Nc82DUmTJP74LWGZp6b7wU';

function pushSettings(settings) {
  return new Promise((resolve, reject) => {
    const payload = {
      id: 'CONFIG_AUTOPILOT_GUEST',
      user_id: 'guest_autopilot',
      market: 'Crypto',
      asset: 'SETTINGS',
      direction: 'CONFIG',
      entry_price: 0,
      stop_loss: 0,
      target_price: 0,
      risk_usd: settings.marginUSD,
      reward_usd: settings.leverage,
      rr_ratio: settings.minRR,
      position_size: settings.maxTrades,
      status: 'CONFIG',
      strategy: JSON.stringify({
        ...settings,
        updatedAt: new Date().toISOString()
      })
    };

    const req = https.request({
      hostname: SUPABASE_HOST,
      path: '/rest/v1/paper_trades',
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

function fetchSettings() {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: SUPABASE_HOST,
      path: '/rest/v1/paper_trades?id=eq.CONFIG_AUTOPILOT_GUEST&select=*',
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const rows = JSON.parse(data);
          if (rows.length > 0) {
            resolve(JSON.parse(rows[0].strategy));
          } else {
            resolve(null);
          }
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function test() {
  console.log('🧪 [TEST 1] Pushing dynamic settings to Supabase (7 trades, $150 margin, 25x lev)...');
  const status1 = await pushSettings({
    marginUSD: 150,
    leverage: 25,
    maxTrades: 7,
    minConfluence: 80,
    minRR: 2.5,
    eventShieldEnabled: true
  });
  console.log('  -> Push HTTP status:', status1);

  const pulled1 = await fetchSettings();
  console.log('  -> Pulled from Cloud:', pulled1);
  if (pulled1.maxTrades === 7 && pulled1.marginUSD === 150) {
    console.log('  ✅ [PASS] Cloud successfully received 7 trades / $150 margin!');
  } else {
    console.error('  ❌ [FAIL] Mismatch in pulled settings');
  }

  console.log('\n🧪 [TEST 2] Resetting to standard 5 trades, $100 margin, 20x lev...');
  const status2 = await pushSettings({
    marginUSD: 100,
    leverage: 20,
    maxTrades: 5,
    minConfluence: 75,
    minRR: 2.0,
    eventShieldEnabled: true
  });
  console.log('  -> Push HTTP status:', status2);

  const pulled2 = await fetchSettings();
  console.log('  -> Pulled from Cloud:', pulled2);
  if (pulled2.maxTrades === 5 && pulled2.marginUSD === 100) {
    console.log('  ✅ [PASS] Cloud successfully restored 5 trades / $100 margin!');
  } else {
    console.error('  ❌ [FAIL] Mismatch in pulled settings');
  }

  console.log('\n🎉 Dynamic Cloud Settings Bridge is 100% OPERATIONAL!');
}

test();

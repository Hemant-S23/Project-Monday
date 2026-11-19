import https from 'https';

function check() {
  return new Promise((resolve) => {
    const req = https.get('https://project-monday.onrender.com', (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        try {
          resolve({ ok: true, status: res.statusCode, body: JSON.parse(d) });
        } catch(e) {
          resolve({ ok: false, status: res.statusCode, raw: d });
        }
      });
    });
    req.on('error', err => resolve({ ok: false, error: err.message }));
  });
}

async function monitor() {
  console.log('⏳ Polling Render for deployment of commit 7e13c1b...');
  const maxAttempts = 15;
  for (let i = 1; i <= maxAttempts; i++) {
    const res = await check();
    if (res.ok && res.body) {
      console.log(`[Attempt ${i}/${maxAttempts}] Uptime: ${res.body.uptimeSeconds}s | Open: ${res.body.openPositionsCount} | Settings:`, res.body.activeSettings || 'Old build');
      if (res.body.activeSettings) {
        console.log('\n🎉 NEW DEPLOYMENT IS LIVE ON RENDER!');
        console.log('   • Daemon Status    :', res.body.status);
        console.log('   • Open Positions   :', res.body.openPositionsCount);
        console.log('   • Active Settings  :', res.body.activeSettings);
        console.log('   • WebSocket Feed   :', res.body.wsConnected ? '⚡ Connected' : 'Connecting');
        return true;
      }
    } else {
      console.log(`[Attempt ${i}/${maxAttempts}] Waiting for server:`, res.error || res.status);
    }
    await new Promise(r => setTimeout(r, 12000));
  }
  console.log('Deployment still building on Render (can take 2-3 mins on free tier).');
  return false;
}

monitor();


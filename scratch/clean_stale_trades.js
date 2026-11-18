import https from 'https';

const SUPABASE_HOST = 'nzvnjfogvwvgjgbqqsxy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56dm5qZm9ndnd2Z2pnYnFxc3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2Mjc2NTAsImV4cCI6MjEwNzIwMzY1MH0._1SPrzenFcZOB7pM0FsO0Nc82DUmTJP74LWGZp6b7wU';

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, data });
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error('Request timed out after 30s'));
    });
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('🔄 Checking open trades in Supabase...');
  try {
    const getRes = await request({
      hostname: SUPABASE_HOST,
      path: '/rest/v1/paper_trades?status=eq.OPEN&select=id,user_id,asset',
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    });

    console.log('GET Status:', getRes.status);
    const trades = JSON.parse(getRes.data);
    console.log('Found open trades:', trades.length);

    if (trades.length > 0) {
      console.log('Settle-closing all open ghost trades...');
      const patchRes = await request({
        hostname: SUPABASE_HOST,
        path: '/rest/v1/paper_trades?status=eq.OPEN',
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        }
      }, JSON.stringify({
        status: 'CLOSED',
        result: 'SETTLED_CLOUD_RESET'
      }));

      console.log('PATCH Status:', patchRes.status);
      console.log('PATCH Headers:', patchRes.headers['content-range'] || patchRes.data);
      console.log('✅ Successfully settled ghost trades in Supabase!');
    } else {
      console.log('No open ghost trades found. Clean state!');
    }
  } catch (err) {
    console.error('Error during cleanup:', err.message);
  }
}

run();

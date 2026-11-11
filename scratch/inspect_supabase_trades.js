const url = 'https://nzvnjfogvwvgjgbqqsxy.supabase.co/rest/v1/paper_trades?select=*&order=created_at.desc';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56dm5qZm9ndnd2Z2pnYnFxc3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2Mjc2NTAsImV4cCI6MjEwNzIwMzY1MH0._1SPrzenFcZOB7pM0FsO0Nc82DUmTJP74LWGZp6b7wU';

async function main() {
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });

    if (!res.ok) {
      console.error('Fetch error:', res.status, res.statusText);
      const text = await res.text();
      console.error(text);
      return;
    }

    const trades = await res.json();
    console.log(`Total trades found in Supabase: ${trades.length}`);

    if (trades.length === 0) {
      console.log('No trades found in paper_trades table.');
      return;
    }

    // Group by user_id
    const userGroups = {};
    for (const t of trades) {
      const uid = t.user_id || 'unknown';
      if (!userGroups[uid]) {
        userGroups[uid] = {
          count: 0,
          assets: new Set(),
          minTime: t.created_at,
          maxTime: t.created_at,
          totalPnl: 0,
          sampleTrades: []
        };
      }
      const g = userGroups[uid];
      g.count++;
      if (t.asset) g.assets.add(t.asset);
      if (t.created_at < g.minTime) g.minTime = t.created_at;
      if (t.created_at > g.maxTime) g.maxTime = t.created_at;
      g.totalPnl += Number(t.pnl_usd || t.pnlUSD || 0);
      if (g.sampleTrades.length < 5) {
        g.sampleTrades.push({
          id: t.id,
          asset: t.asset,
          direction: t.direction,
          pnlUSD: t.pnl_usd || t.pnlUSD,
          status: t.status,
          created_at: t.created_at,
          closed_at: t.closed_at
        });
      }
    }

    console.log('\n--- Distinct User Sessions Summary ---');
    for (const [uid, g] of Object.entries(userGroups)) {
      console.log(`\nUser ID: ${uid}`);
      console.log(`Trade Count: ${g.count}`);
      console.log(`Assets: ${Array.from(g.assets).join(', ')}`);
      console.log(`Date Range: ${g.minTime} -> ${g.maxTime}`);
      console.log(`Total PnL: $${g.totalPnl.toFixed(2)}`);
      console.log(`Sample Trades:`, JSON.stringify(g.sampleTrades, null, 2));
    }
  } catch (err) {
    console.error('Error in main:', err);
  }
}

main();

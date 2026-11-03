const SUPABASE_URL = 'https://nzvnjfogvwvgjgbqqsxy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56dm5qZm9ndnd2Z2pnYnFxc3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2Mjc2NTAsImV4cCI6MjEwNzIwMzY1MH0._1SPrzenFcZOB7pM0FsO0Nc82DUmTJP74LWGZp6b7wU';

async function check() {
  const res = await fetch(SUPABASE_URL + '/rest/v1/paper_trades?select=*&order=created_at.desc', {
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
  });
  const data = await res.json();
  console.log('Total trades in Supabase:', data.length);
  data.forEach((d, i) => {
    console.log(`${i+1}. ID: ${d.id} | Asset: ${d.asset} | Dir: ${d.direction} | Status: ${d.status} | Created: ${d.created_at} | PnL: ${d.pnl_usd}`);
  });
}

check();

// test_fetch.js
import fetch from 'node-fetch'; // if node v22, built-in fetch available; otherwise install node-fetch
(async () => {
  try {
    const url = 'https://yrgmfzkfrezfminbdfnz.supabase.co';
    const r = await fetch(url, { method: 'GET', timeout: 5000 });
    console.log('status', r.status, 'ok', r.ok);
    const txt = await r.text();
    console.log('resp len', txt.length);
  } catch (e) {
    console.error('fetch error:', e);
  }
})();

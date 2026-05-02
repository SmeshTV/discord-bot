const fetch = require('node-fetch');

const API_URL = 'https://cuycmwfqaywlsxeqcbrm.supabase.co/rest/v1/durak_rooms?select=*';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1eWNtd2ZxYXl3bHN4ZXFjYnJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTYzNjExMSwiZXhwIjoyMDkxMjEyMTExfQ.HG2NxFA3BQGoKYnrZL2wyQ35l6XTUkm5lJL9q7Y1CUs';

async function check() {
  try {
    const res = await fetch(API_URL, {
      headers: {
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`
      }
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Data:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

check();
const API_URL = 'https://cuycmwfqaywlsxeqcbrm.supabase.co/rest/v1/durak_rooms';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1eWNtd2ZxYXl3bHN4ZXFjYnJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTYzNjExMSwiZXhwIjoyMDkxMjEyMTExfQ.HG2NxFA3BQGoKYnrZL2wyQ35l6XTUkm5lJL9q7Y1CUs';

async function cleanup() {
  const res = await fetch(`${API_URL}?select=id,name,players`, {
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`
    }
  });
  const rooms = await res.json();
  console.log('Found rooms:', rooms.length);

  for (const room of rooms) {
    const playerCount = room.players?.length || 0;
    console.log(`Deleting "${room.name}" (${room.id}) - ${playerCount} players`);
    
    await fetch(`${API_URL}?id=eq.${room.id}`, {
      method: 'DELETE',
      headers: {
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`
      }
    });
  }
  
  console.log('Done!');
}

cleanup();
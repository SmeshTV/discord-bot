import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const JUNIPER_API_URL = 'https://api.juniperbot.com/api';
const JUNIPER_TOKEN = Deno.env.get('JUNIPER_BOT_TOKEN') || '';
const DISCORD_SERVER_ID = Deno.env.get('DISCORD_SERVER_ID') || '';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await req.json();
  const { discordId } = body;

  if (!discordId) {
    return new Response(JSON.stringify({ error: 'discordId required' }), { status: 400 });
  }

  if (!JUNIPER_TOKEN || !DISCORD_SERVER_ID) {
    return new Response(JSON.stringify({
      error: 'JuniperBot not configured',
      discord_xp: 0,
      discord_level: 1,
    }), { status: 200 });
  }

  try {
    const res = await fetch(
      `${JUNIPER_API_URL}/v4/discord/guild/${DISCORD_SERVER_ID}/member/${discordId}/stats`,
      {
        headers: {
          'Authorization': `Bearer ${JUNIPER_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      return new Response(JSON.stringify({
        error: 'JuniperBot API error',
        discord_xp: 0,
        discord_level: 1,
      }), { status: 200 });
    }

    const data = await res.json();
    const xp = data?.stats?.totalXp || data?.stats?.experience || 0;
    const level = data?.stats?.level || 1;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase
      .from('users')
      .update({
        discord_xp: xp,
        discord_level: level,
        last_sync: new Date().toISOString(),
      })
      .eq('discord_id', discordId);

    return new Response(JSON.stringify({
      discord_xp: xp,
      discord_level: level,
      synced_at: new Date().toISOString(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: e.message,
      discord_xp: 0,
      discord_level: 1,
    }), { status: 500 });
  }
});
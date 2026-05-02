// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const DISCORD_API = 'https://discord.com/api/v10';
const GUILD_ID = '1463228311118549124';
const MUTE_ROLE_ID = '1468562550265483406';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'content-type',
      },
    });
  }

  try {
    const body = await req.json();
    const { discordId, days, warningIds, action } = body;

    console.log('Mute request:', { discordId, days, warningIds, action });

    if (!discordId) {
      return new Response(
        JSON.stringify({ error: 'Missing discordId' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
    if (!botToken) {
      return new Response(
        JSON.stringify({ error: 'Bot token not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    if (action === 'remove') {
      // Удаляем роль мута
      const removeUrl = `${DISCORD_API}/guilds/${GUILD_ID}/members/${discordId}/roles/${MUTE_ROLE_ID}`;
      const removeResponse = await fetch(removeUrl, {
        method: 'DELETE',
        headers: { Authorization: `Bot ${botToken}` },
      });

      console.log('Remove mute response:', removeResponse.status);

      return new Response(
        JSON.stringify({ success: true, message: 'Mute removed' }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Выдаём мут
    const addUrl = `${DISCORD_API}/guilds/${GUILD_ID}/members/${discordId}/roles/${MUTE_ROLE_ID}`;
    const addResponse = await fetch(addUrl, {
      method: 'PUT',
      headers: { Authorization: `Bot ${botToken}` },
    });

    console.log('Add mute response:', addResponse.status);

    if (!addResponse.ok) {
      const errorText = await addResponse.text();
      console.log('Discord error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to add role', detail: errorText }),
        { status: addResponse.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: days ? `Muted for ${days} days` : 'Muted',
        muteUntil: days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null
      }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (error) {
    console.log('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
});

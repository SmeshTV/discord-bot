// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const DISCORD_API = 'https://discord.com/api/v10';
const GUILD_ID = '1463228311118549124';

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, authorization, x-client-info, apikey',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
  if (!botToken) {
    return new Response(JSON.stringify({ error: 'Bot token not configured' }), { status: 500, headers: corsHeaders });
  }

  try {
    const { discordId, roleId, action } = await req.json();

    if (!discordId || !roleId) {
      return new Response(
        JSON.stringify({ error: 'Missing discordId or roleId' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Проверить пользователя на сервере
    const memberUrl = `${DISCORD_API}/guilds/${GUILD_ID}/members/${discordId}`;
    const memberRes = await fetch(memberUrl, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!memberRes.ok) {
      return new Response(
        JSON.stringify({ error: 'User not found on server' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Выдать или удалить роль
    const roleUrl = `${DISCORD_API}/guilds/${GUILD_ID}/members/${discordId}/roles/${roleId}`;
    const method = action === 'remove' ? 'DELETE' : 'PUT';
    
    const roleRes = await fetch(roleUrl, {
      method,
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!roleRes.ok) {
      const errorText = await roleRes.text();
      console.log('Role error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to update role', detail: errorText }),
        { status: roleRes.status, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: action === 'remove' ? 'Role removed' : 'Role assigned'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.log('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
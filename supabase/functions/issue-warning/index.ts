// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const DISCORD_API = 'https://discord.com/api/v10';
const GUILD_ID = '1463228311118549124';
const BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'content-type, authorization, x-client-info, apikey',
      },
    });
  }

  if (!BOT_TOKEN) {
    return new Response(JSON.stringify({ error: 'Bot token not configured' }), { status: 500 });
  }

  try {
    const { discordId, action, reason, issuedBy, warningsCount } = await req.json();

    if (!discordId) return new Response(JSON.stringify({ error: 'Missing discordId' }), { status: 400 });

    // 1. Отправка сообщения в ЛС
    try {
      // Создаем DM канал
      const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
        method: 'POST',
        headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_id: discordId }),
      });

      if (dmRes.ok) {
        const channel = await dmRes.json();
        
        let message = '';
        if (action === 'warn') {
          message = `⚠️ **Вам выдан варн на сервере LOLA!**\n\n**Причина:** ${reason}\n**Выдал:** ${issuedBy}\n**Всего варнов:** ${warningsCount}/3`;
          if (warningsCount >= 3) {
            message += `\n\n⛔ У вас 3 варна. Вы получили автоматический мут на 1 день.`;
          }
        } else if (action === 'mute') {
          message = `🚫 **Вам выдан мут на сервере LOLA!**\n\n**Длительность:** 24 часа\n**Причина:** 3 варна.`;
        }

        await fetch(`${DISCORD_API}/channels/${channel.id}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: message }),
        });
      }
    } catch (e) {
      console.error('Failed to send DM:', e);
    }

    // 2. Если 3 варна - выдаем МУТ (Timeout) на 1 день
    if (warningsCount >= 3) {
      const timeoutUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      const muteRes = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/members/${discordId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ communication_disabled_until: timeoutUntil }),
      });

      if (!muteRes.ok) {
        const err = await muteRes.text();
        return new Response(JSON.stringify({ error: 'Failed to mute', discord_error: err }), { status: 500 });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

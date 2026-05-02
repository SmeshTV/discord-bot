// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const DISCORD_API = 'https://discord.com/api/v10';
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
    const { action, discordId, username, reason, totalWarnings, days } = await req.json();

    if (!discordId) {
      return new Response(JSON.stringify({ error: 'Missing discordId' }), { status: 400 });
    }

    // Отправка DM
    try {
      // Создаем DM канал
      const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
        method: 'POST',
        headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_id: discordId }),
      });

      let embed = null;
      let customContent = '';

      if (action === 'warning') {
        customContent = `⚠️ **Вам выдано предупреждение на сервере LOLA!**`;
        embed = {
          title: '📢 Предупреждение',
          description: reason,
          color: 0xFFAA00,
          fields: [
            {
              name: '📊 Всего предупреждений',
              value: `${totalWarnings}/3`,
              inline: true,
            },
            {
              name: '⚠️ Внимание',
              value: 'При 3-х предупреждениях выдаётся мут!',
              inline: false,
            },
          ],
          footer: {
            text: 'Сервер LOLA • Не отвечайте на это сообщение',
          },
          timestamp: new Date().toISOString(),
        };
      } else if (action === 'mute') {
        customContent = `🚫 **Вы были замучены на сервере LOLA!**`;
        embed = {
          title: '🚫 Мут',
          description: `**Причина:** ${reason}\n\n**Длительность:** ${days} дней\n\n⚠️ При накоплении 3-х предупреждений выдаётся автоматический мут.`,
          color: 0xFF4444,
          fields: [
            {
              name: '⏰ Срок мута',
              value: `${days} дней`,
              inline: true,
            },
            {
              name: '📋 Причина',
              value: '3 предупреждения',
              inline: true,
            },
          ],
          footer: {
            text: 'Сервер LOLA • Не отвечайте на это сообщение',
          },
          timestamp: new Date().toISOString(),
        };
      }

      if (embed && dmRes.ok) {
        const channel = await dmRes.json();
        
        await fetch(`${DISCORD_API}/channels/${channel.id}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            embeds: [embed],
            content: customContent
          }),
        });
        
        return new Response(JSON.stringify({ success: true, message: 'Notification sent' }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      return new Response(JSON.stringify({ error: 'Failed to create DM channel' }), { status: 500 });
    } catch (e) {
      console.error('DM error:', e);
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
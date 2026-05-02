// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const DISCORD_API = 'https://discord.com/api/v10';

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
    const { action, channelId, content, after } = body;

    const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
    if (!botToken) {
      return new Response(
        JSON.stringify({ error: 'Bot token not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    if (action === 'send') {
      const displayName = body.username || 'User';
      const senderId = body.senderId || '';

      // Отправляем как embed с ID отправителя в footer
      const response = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [{
            description: content,
            color: 0x00FF87,
            author: {
              name: displayName,
            },
            footer: senderId ? { text: `uid:${senderId}` } : undefined,
            timestamp: new Date().toISOString(),
          }],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return new Response(
          JSON.stringify({ error: 'Failed to send message', detail: err }),
          { status: response.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }

      const msg = await response.json();
      return new Response(
        JSON.stringify({ success: true, messageId: msg.id }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );

    } else if (action === 'fetch') {
      // Получить сообщения канала
      const url = `${DISCORD_API}/channels/${channelId}/messages?limit=50${after ? `&after=${after}` : ''}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bot ${botToken}` },
      });

      if (!response.ok) {
        const err = await response.text();
        return new Response(
          JSON.stringify({ error: 'Failed to fetch messages', detail: err }),
          { status: response.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }

      const messages = await response.json();

      const formatted = messages.reverse().map((m: any) => {
        let authorId = m.author?.id || '';
        let author = m.author?.username || m.author?.global_name || 'Unknown';
        let content = m.content || '';

        // If it's a bot message with embed, check footer for sender ID
        if (m.author?.bot && m.embeds && m.embeds.length > 0) {
          const embed = m.embeds[0];
          if (embed.author?.name) {
            author = embed.author.name;
          }
          if (embed.description) {
            content = embed.description;
          }
          // Extract sender ID from footer
          if (embed.footer?.text && embed.footer.text.startsWith('uid:')) {
            authorId = embed.footer.text.replace('uid:', '');
          }
        }

        return {
          id: m.id,
          author,
          authorId,
          content,
          timestamp: m.timestamp,
          isBot: m.author?.bot || false,
        };
      });

      return new Response(
        JSON.stringify({ messages: formatted }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Unknown action' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
});

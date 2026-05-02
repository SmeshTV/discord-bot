// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const DISCORD_API = 'https://discord.com/api/v10';
const GUILD_ID = Deno.env.get('DISCORD_GUILD_ID') || '1463228311118549124';
const EVENTS_CHANNEL_ID = Deno.env.get('DISCORD_EVENTS_CHANNEL_ID') || '1474409280349274397';
const BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');
const ROLE_ID = Deno.env.get('DISCORD_EVENT_ROLE_ID') || '1467975816297054512';

// CORS заголовки
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, x-client-info, apikey',
};

serve(async (req) => {
  // Обработка preflight запросов
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Проверка токена
  if (!BOT_TOKEN) {
    return new Response(JSON.stringify({ error: 'DISCORD_BOT_TOKEN not configured' }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await req.json();
    const { action, event, rolePing, createDiscordEvent, embedSettings, highlight } = body;

    console.log(`[event-discord] Action: ${action}, Event ID: ${event?.id}`);

    // === ЭМОДЗИ ИГР ===
    const gameEmojis: Record<string, string> = { 
      'Among Us': '🚀', 'Шахматы': '♟️', 'Дурак': '🃏', 'Clash Royale': '👑', 
      'Brawl Stars': '⭐', 'Minecraft': '⛏️', 'JackBox': '📦', 'Бункер': '🏚️', 
      'Шпион': '🕵️', 'Codenames': '🔤', 'Alias': '🗣️', 'Gartic Phone': '🎨', 
      'Roblox': '🟢', 'Другие': '🎮'
    };
    const emoji = gameEmojis[event.game] || event.game_emoji || '🎮';
    
    // === НАСТРОЙКИ EMBED ===
    let userColor = 0x00D4FF; // Default cyan
    try {
      if (embedSettings?.color) {
        const c = embedSettings.color.replace('#', '');
        userColor = parseInt(c, 16);
      }
    } catch { /* fallback to default */ }

    const botName = embedSettings?.botName || 'LOLA Events';
    const botAvatar = embedSettings?.botAvatar || 'https://cdn.discordapp.com/icons/1463228311118549124/a_1463228311118549124.png';
    const footer = embedSettings?.footer || '✨ LOLA Server';
    const thumbnail = embedSettings?.thumbnail || 'https://cdn.discordapp.com/icons/1463228311118549124/a_1463228311118549124.png';

    // === СТАТУСЫ ===
    const statusLabel: Record<string, string> = {
      upcoming: '📅 Предстоящий',
      completed: '✅ Завершён', 
      cancelled: '❌ Отменён',
      live: '🔴 Идёт сейчас'
    };

    // === 🔥 ЖЁЛТЫЙ ЖИРНЫЙ ТЕКСТ ДЛЯ ХАЙЛАЙТОВ ===
    let content: string | null = null;
    let finalColor = userColor;
    const timestamp = Math.floor(Date.now() / 1000);
    
    if (highlight === 'cancelled') {
      // Жёлтый жирный текст при отмене
      content = `### :warning: **<t:${timestamp}:R> — МЕРОПРИЯТИЕ ОТМЕНЕНО!** :warning:`;
      finalColor = 0xFFD700; // Gold/Yellow
    } else if (highlight === 'edited') {
      // Жёлтый жирный текст при редактировании
      content = `### :pencil: **ОБНОВЛЕНО!** <t:${timestamp}:R>`;
      finalColor = 0xFFD700; // Gold/Yellow
    } else if (event.status === 'cancelled') {
      // Красный для отменённых без хайлайта
      finalColor = 0xFF4444;
    }

    // === СОЗДАНИЕ EMBED ===
    const embed: Record<string, any> = {
      title: `${emoji} ${event.title}`,
      description: event.description || '—',
      color: finalColor,
      thumbnail: thumbnail ? { url: thumbnail } : undefined,
      fields: [
        { name: '🎮 Игра', value: `\`${event.game}\``, inline: true },
        { name: '🗓️ Дата', value: `\`${event.date}\``, inline: true },
        { name: '⏰ Время', value: `\`${event.time}\``, inline: true },
        { name: '👥 Участники', value: `\`${(event.registered_players?.length || 0)}/${event.max_players}\``, inline: true },
        { name: '👤 Ведущий', value: event.host_name || 'Admin', inline: true },
        { name: '📊 Статус', value: statusLabel[event.status] || '📋 Неизвестно', inline: true },
      ],
      footer: { text: footer },
      timestamp: new Date().toISOString(),
    };

    // Ссылка на регистрацию только для активных событий
    if (event.status !== 'cancelled') {
      embed.fields.push({ 
        name: '🔗 Регистрация', 
        value: '[Нажмите здесь](https://loolaa.netlify.app/events)', 
        inline: false 
      });
    }

    let scheduledEventId = event.discord_scheduled_event_id;

    // ========================================
    // === ACTION: CREATE ===
    // ========================================
    if (action === 'create') {
      // Создаём Scheduled Event в Discord (опционально)
      if (createDiscordEvent) {
        try {
          const startDate = new Date(`${event.date}T${event.time}`).toISOString();
          const endDate = new Date(new Date(startDate).getTime() + 2 * 60 * 60 * 1000).toISOString(); // +2 часа
          
          const schRes = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/scheduled-events`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bot ${BOT_TOKEN}`, 
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
              name: `${emoji} ${event.title}`,
              description: event.description || 'Ивент на сайте LOLA',
              scheduled_start_time: startDate,
              scheduled_end_time: endDate,
              privacy_level: 2, // Guild only
              entity_type: 3, // External
              entity_metadata: { location: 'https://loolaa.netlify.app/events' }
            })
          });
          
          if (schRes.ok) {
            const schData = await schRes.json();
            scheduledEventId = schData.id;
            console.log(`[event-discord] Created scheduled event: ${scheduledEventId}`);
          } else {
            const err = await schRes.text();
            console.error(`[event-discord] Scheduled event error: ${schRes.status} ${err}`);
          }
        } catch (e: any) {
          console.error('[event-discord] Scheduled event exception:', e.message);
        }
      }

      // Создаём сообщение в канале
      const payload: Record<string, any> = {
        content: rolePing ? `<@&${rolePing}>` : null,
        embeds: [embed],
        username: botName,
        avatar_url: botAvatar,
      };

      const msgRes = await fetch(`${DISCORD_API}/channels/${EVENTS_CHANNEL_ID}/messages`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bot ${BOT_TOKEN}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(payload)
      });
      
      if (!msgRes.ok) {
        const err = await msgRes.text();
        throw new Error(`Failed to create message: ${msgRes.status} ${err}`);
      }
      
      const msgData = await msgRes.json();
      console.log(`[event-discord] Created message: ${msgData.id}`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        messageId: msgData.id, 
        scheduledEventId: scheduledEventId 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // ========================================
    // === ACTION: UPDATE ===
    // ========================================
    if (action === 'update' && event.discord_message_id) {
      const payload: Record<string, any> = {
        content: content, // 🔥 Жёлтый жирный текст при highlight
        embeds: [embed],
        username: botName,
        avatar_url: botAvatar,
      };

      const msgRes = await fetch(`${DISCORD_API}/channels/${EVENTS_CHANNEL_ID}/messages/${event.discord_message_id}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bot ${BOT_TOKEN}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(payload)
      });

      if (!msgRes.ok) {
        const err = await msgRes.text();
        console.error(`[event-discord] Update message error: ${msgRes.status} ${err}`);
      } else {
        console.log(`[event-discord] Updated message: ${event.discord_message_id}`);
      }

      // Обновляем Scheduled Event если есть
      if (event.discord_scheduled_event_id) {
        try {
          const startDate = new Date(`${event.date}T${event.time}`).toISOString();
          const endDate = new Date(new Date(startDate).getTime() + 2 * 60 * 60 * 1000).toISOString();
          // Статус: 1=active, 2=completed, 3=canceled, 4=canceled (internal), 5=completed (internal)
          const schStatus = event.status === 'cancelled' ? 3 : 1;
          
          const schRes = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/scheduled-events/${event.discord_scheduled_event_id}`, {
            method: 'PATCH',
            headers: { 
              'Authorization': `Bot ${BOT_TOKEN}`, 
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
              name: `${emoji} ${event.title}`,
              description: event.description,
              scheduled_start_time: startDate,
              scheduled_end_time: endDate,
              status: schStatus
            })
          });
          
          if (!schRes.ok) {
            const err = await schRes.text();
            console.error(`[event-discord] Update scheduled event error: ${schRes.status} ${err}`);
          }
        } catch (e: any) {
          console.error('[event-discord] Update scheduled event exception:', e.message);
        }
      }
      
      return new Response(JSON.stringify({ success: true, updated: true }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // ========================================
    // === ACTION: DELETE (message) ===
    // ========================================
    if (action === 'delete' && event.discord_message_id) {
      const delRes = await fetch(`${DISCORD_API}/channels/${EVENTS_CHANNEL_ID}/messages/${event.discord_message_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bot ${BOT_TOKEN}` }
      });

      if (!delRes.ok && delRes.status !== 404) {
        const err = await delRes.text();
        console.error(`[event-discord] Delete message error: ${delRes.status} ${err}`);
      } else {
        console.log(`[event-discord] Deleted message: ${event.discord_message_id}`);
      }
      
      return new Response(JSON.stringify({ success: true, deleted: true }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // ========================================
    // === ACTION: DELETE_SCHEDULED ===
    // ========================================
    if (action === 'delete_scheduled' && event.discord_scheduled_event_id) {
      const delRes = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/scheduled-events/${event.discord_scheduled_event_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bot ${BOT_TOKEN}` }
      });

      if (!delRes.ok && delRes.status !== 404) {
        const err = await delRes.text();
        console.error(`[event-discord] Delete scheduled event error: ${delRes.status} ${err}`);
      } else {
        console.log(`[event-discord] Deleted scheduled event: ${event.discord_scheduled_event_id}`);
      }
      
      return new Response(JSON.stringify({ success: true, deleted: true }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // ========================================
    // === UNKNOWN ACTION ===
    // ========================================
    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { 
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error('[event-discord] Critical error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BANNED_ROLE_ID = Deno.env.get('BANNED_ROLE_ID') || '1493620000000004';
const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN')!;
const GUILD_ID = Deno.env.get('GUILD_ID')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, data, webhookUrl, discordId, username } = await req.json();
    
    const DISCORD_WEBHOOK = webhookUrl;

    if (!DISCORD_WEBHOOK) {
      throw new Error("Webhook URL missing");
    }

    if (action === 'create_event') {
      const { title, description, date, creator, eventId } = data;
      
      const embed = {
        title: "📅 Новое мероприятие!",
        description: description,
        color: 0x00D4FF,
        fields: [
          { name: "Организатор", value: creator, inline: true },
          { name: "Дата", value: date, inline: true },
          { name: "Регистрация", value: "[Нажмите здесь](https://loolaa.netlify.app/events)", inline: false }
        ],
        footer: { text: `ID: ${eventId}` }
      };

      const payload = {
        content: "📅 **НОВОЕ МЕРОПРИЯТИЕ!**",
        embeds: [embed]
      };

      await fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (action === 'cancel_event') {
      const { title } = data;
      
      const cancelEmbed = {
        title: "⚠️ МЕРОПРИЯТИЕ ОТМЕНЕНО",
        description: `Событие **${title}** было отменено.`,
        color: 0xFF4444,
        footer: { text: "Проверьте сайт для подробностей" }
      };

      const payload = {
        content: "⚠️ **МЕРОПРИЯТИЕ ОТМЕНЕНО!** ⚠️",
        embeds: [cancelEmbed]
      };

      await fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (action === 'update_event') {
      const { title, description, participants, maxPlayers, date, time } = data;
      
      const updateEmbed = {
        title: "🔄 Мероприятие обновлено",
        description: description,
        color: 0x00D4FF,
        fields: [
          { name: "👥 Участники", value: `${participants}/${maxPlayers}`, inline: true },
          { name: "📅 Дата", value: `${date} ${time}`, inline: true }
        ]
      };

      const payload = {
        content: "🔄 **Мероприятие обновлено!**",
        embeds: [updateEmbed]
      };

      await fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (action === 'ban_user' || action === 'unban_user') {
      const { discordId, username } = data;
      
      if (!discordId) {
        throw new Error("discordId required");
      }

      // Получаем member из Discord
      const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordId}`, {
        headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` }
      });

      if (!guildResponse.ok) {
        throw new Error("User not found on server");
      }

      const member = await guildResponse.json();

      // Добавляем или убираем роль бана
      const roleAction = action === 'ban_user' ? 'add' : 'remove';
      
      await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordId}/roles/${BANNED_ROLE_ID}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      const embed = action === 'ban_user' ? {
        title: "🚫 Пользователь заблокирован",
        description: `Пользователь **${username}** был заблокирован на сайте и Discord.`,
        color: 0xFF4444
      } : {
        title: "✅ Пользователь разблокирован",
        description: `Пользователь **${username}** был разблокирован.`,
        color: 0x00FF00
      };

      return new Response(JSON.stringify({ 
        success: true, 
        action: action,
        username: username
      }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
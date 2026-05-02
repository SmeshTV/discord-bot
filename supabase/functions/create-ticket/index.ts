import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, data, webhookUrl } = await req.json();
    
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

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
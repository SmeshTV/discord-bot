// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const DISCORD_API = 'https://discord.com/api/v10';
const GUILD_ID = '1463228311118549124';

async function checkChannelPrivate(channelId: string, botToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (!res.ok) return false;
    const ch = await res.json();
    
    if (ch.permission_overwrites) {
      for (const ow of ch.permission_overwrites) {
        // Проверяем @everyone (id совпадает с guild id)
        if (ow.id === GUILD_ID && ow.type === 0) {
          const deny = BigInt(ow.deny || '0');
          const viewChannel = BigInt(1024);
          if ((deny & viewChannel) === viewChannel) {
            return true;
          }
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'content-type',
      },
    });
  }

  try {
    const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
    if (!botToken) {
      return new Response(
        JSON.stringify({ error: 'Bot token not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Получаем информацию о сервере
    const [guildRes, channelsRes] = await Promise.all([
      fetch(`${DISCORD_API}/guilds/${GUILD_ID}?with_counts=true`, {
        headers: { Authorization: `Bot ${botToken}` },
      }),
      fetch(`${DISCORD_API}/guilds/${GUILD_ID}/channels`, {
        headers: { Authorization: `Bot ${botToken}` },
      }),
    ]);

    if (!guildRes.ok) {
      const err = await guildRes.text();
      console.error('Guild fetch error:', err);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch guild', status: guildRes.status }),
        { status: guildRes.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const guild = await guildRes.json();

    let channels = [];
    if (channelsRes.ok) {
      const raw = await channelsRes.json();
      const textVoiceChannels = raw.filter((ch: any) => ch.type === 0 || ch.type === 2);
      
      // Проверяем приватность параллельно
      const privacyChecks = textVoiceChannels.map(async (ch: any) => {
        const isPrivate = await checkChannelPrivate(ch.id, botToken);
        return {
          id: ch.id,
          name: ch.name,
          type: ch.type === 2 ? 'voice' : 'text',
          position: ch.position,
          parent_id: ch.parent_id,
          is_private: isPrivate,
        };
      });
      
      channels = await Promise.all(privacyChecks);
    }

    // Получаем категории
    const categoriesRes = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/channels`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    let categories: any[] = [];
    if (categoriesRes.ok) {
      const raw = await categoriesRes.json();
      categories = raw
        .filter((ch: any) => ch.type === 4)
        .map((ch: any) => ({
          id: ch.id,
          name: ch.name,
        }));
    }

    return new Response(
      JSON.stringify({
        name: guild.name,
        memberCount: guild.member_count,
        approximatePresenceCount: guild.approximate_presence_count,
        approximateMemberCount: guild.approximate_member_count,
        channels,
        categories,
        icon: guild.icon,
        verificationLevel: guild.verification_level,
      }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
});
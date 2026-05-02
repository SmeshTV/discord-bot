// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const DISCORD_API = 'https://discord.com/api/v10';
const GUILD_ID = '1463228311118549124';

const SITE_ADMIN_ROLES = [
  '1463230825041756302', // Lola
  '1463271031501357067', // Main Moderator
  '1464965472704266414', // Grand Mod
  '1478351837835825235', // Admin
  '1466565907857014825', // Tech Admin
  '1464964592575709309', // Mod
  '1464787504183115816', // Helper
];

const SITE_EVENT_MAKER_ROLES = [
  '1465825700031234172', // Event Maker
  '1469686860627447931', // Game Architect
  '1478094359332126812', // Minecraft
  '1475558835035963602', // Clash Royale
  '1485703963280937181', // Brawl Stars
];

const SITE_SPECIAL_ROLES = [
  '1464915038564515993', // Grandmaster
  '1464898072000598058', // Media
  '1465258626552696892', // Special guest
];

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
    const { userId } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
    if (!botToken) {
      return new Response(
        JSON.stringify({ error: 'Bot token not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Получаем роли участника сервера
    const memberRes = await fetch(
      `${DISCORD_API}/guilds/${GUILD_ID}/members/${userId}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      }
    );

    if (!memberRes.ok) {
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch member',
          status: memberRes.status,
        }),
        {
          status: memberRes.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const member = await memberRes.json();
    const roleIds = member.roles || [];

    // Получаем все роли сервера чтобы маппить ID → название
    const rolesRes = await fetch(
      `${DISCORD_API}/guilds/${GUILD_ID}/roles`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      }
    );

    const roleNameMap = {};
    if (rolesRes.ok) {
      const guildRoles = await rolesRes.json();
      // Создаём мапу: id → name
      guildRoles.forEach((role) => {
        roleNameMap[role.id] = role.name;
      });
    }

    // Преобразуем ID ролей в названия. Если название не найдено — остаётся ID.
    const roleNames = roleIds
      .map((id) => roleNameMap[id] || id)
      .filter((name) => name !== '@everyone');

    const hasRole = (list) => list.some((r) => roleIds.includes(r));

    return new Response(
      JSON.stringify({
        isAdmin: hasRole(SITE_ADMIN_ROLES),
        isEventMaker: hasRole(SITE_EVENT_MAKER_ROLES),
        isSpecial: hasRole(SITE_SPECIAL_ROLES),
        roles: roleNames,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

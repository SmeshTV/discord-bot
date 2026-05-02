// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const DISCORD_API = 'https://discord.com/api/v10';
const GUILD_ID = '1463228311118549124';

const SITE_ADMIN_ROLES = [
  '1463230825041756302',
  '1463271031501357067',
  '1464965472704266414',
  '1478351837835825235',
  '1466565907857014825',
  '1464964592575709309',
  '1464787504183115816',
];

const SITE_EVENT_MAKER_ROLES = [
  '1465825700031234172',
  '1469686860627447931',
  '1478094359332126812',
  '1475558835035963602',
  '1485703963280937181',
];

const SITE_SPECIAL_ROLES = [
  '1464915038564515993',
  '1464898072000598058',
  '1465258626552696892',
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

    console.log('Received userId:', userId);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
    console.log('Bot token exists:', !!botToken);
    console.log('Token starts with:', botToken ? botToken.substring(0, 10) + '...' : 'NONE');

    if (!botToken) {
      return new Response(
        JSON.stringify({ error: 'Bot token not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    const url = `${DISCORD_API}/guilds/${GUILD_ID}/members/${userId}`;
    console.log('Fetching:', url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    });

    console.log('Discord API status:', response.status);

    if (!response.ok) {
      const errorBody = await response.text();
      console.log('Discord API error:', errorBody);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch member',
          status: response.status,
          detail: errorBody,
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    const member = await response.json();
    const roleIds = member.roles || [];

    console.log('User roles:', roleIds);

    // Получаем все роли сервера для сопоставления ID с названиями
    const guildRolesRes = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/roles`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    const guildRoles = guildRolesRes.ok ? await guildRolesRes.json() : [];
    
    // Создаём мапу ID → название
    const roleNames: Record<string, string> = {};
    if (Array.isArray(guildRoles)) {
      for (const role of guildRoles) {
        roleNames[role.id] = role.name;
      }
    }

    console.log('Guild role names:', roleNames);

    const hasRole = (list: string[]) => list.some((r) => roleIds.includes(r));

    return new Response(
      JSON.stringify({
        isAdmin: hasRole(SITE_ADMIN_ROLES),
        isEventMaker: hasRole(SITE_EVENT_MAKER_ROLES),
        isSpecial: hasRole(SITE_SPECIAL_ROLES),
        roles: roleIds,
        roleNames,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.log('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
});

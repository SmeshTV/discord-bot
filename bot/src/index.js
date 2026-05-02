import { Client, GatewayIntentBits, ActivityType, EmbedBuilder, REST, Routes } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// ===== Конфигурация =====
const CONFIG = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  // XP настройки
  voiceXpInterval: 60,        // секунд в voice для +1 XP
  voiceXpAmount: 1,           // XP за интервал
  voiceMushroomInterval: 900, // 15 минут в voice для +1 гриб
  voiceMushroomAmount: 1,     // грибов за интервал
  messageXpRange: [1, 3],     // XP за сообщение (мин, макс)
  messageXpCooldown: 180,     // 3 минуты между начислением XP за сообщения
  // Синхронизация
  syncInterval: 300000,       // 5 минут — отправка XP на сайт
};

// ===== Роли (замените на реальные ID) =====
const ROLE_IDS = {
  vip: process.env.DISCORD_VIP_ROLE_ID || '1493185937050701915',
  mute: process.env.DISCORD_MUTE_ROLE_ID || '1468562550265483406',
  xp_boost_x2: '1493613632385192199',
  xp_boost_x3: '1493615286845309090',
  frame_bronze: '1493620000000000001',
  frame_silver: '1493620000000000002',
  frame_gold: '1493620000000000003',
  banned: '1493620000000000004',
};

// Сроки действия покупок (в днях)
const ROLE_DURATIONS = {
  'vip-role': 30,
  'custom-color': 90,
  'xp-boost-x2': 0.5,   // 12 часов
  'xp-boost-x3': 0.5,
  'insurance': 1,
  'lucky-hour': 1/24,   // 1 час
};

// ===== Supabase клиент =====
const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

// ===== Discord клиент =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

// ===== Хранилище состояния =====
const voiceSessions = new Map();      // userId -> { joinedAt, intervalId, mushroomIntervalId }
const messageCooldown = new Map();    // userId -> lastXpTimestamp
const xpBuffer = new Map();           // userId -> { xp, mushrooms, messages, username, log }
const processedPurchases = new Set(); // purchase_id -> true
const rainbowColorState = new Map();  // roleId -> { colorIndex, color1, color2 }

// ===== XP Система =====

function addToBuffer(userId, username, xpGain, mushroomGain, reason) {
  const current = xpBuffer.get(userId) || { xp: 0, mushrooms: 0, messages: 0, username };
  if (xpGain > 0) current.xp += xpGain;
  if (mushroomGain > 0) current.mushrooms += mushroomGain;
  current.messages += 1;
  current.username = username;
  if (!current.log) current.log = [];
  current.log.push({ xp: xpGain, mushrooms: mushroomGain, reason, time: Date.now() });
  xpBuffer.set(userId, current);
}

async function flushXpBuffer() {
  if (xpBuffer.size === 0) return;
  console.log(`📊 Flush XP буфер: ${xpBuffer.size} пользователей`);

  for (const [userId, data] of xpBuffer) {
    let ok = true;

    if (data.xp > 0) {
      const { error } = await supabase.rpc('add_site_xp', {
        p_user_id: userId,
        p_xp_amount: data.xp,
        p_messages: data.messages,
      });
      if (error) {
        console.error(`❌ Ошибка XP для ${data.username}:`, error.message);
        ok = false;
      }
    }

    if (data.mushrooms > 0) {
      const { error: mushError } = await supabase.rpc('add_mushrooms_voice', {
        p_user_id: userId,
        p_mushrooms: data.mushrooms,
      });
      if (mushError) {
        console.error(`❌ Ошибка грибов для ${data.username}:`, mushError.message);
        ok = false;
      }
    }

    if (ok) {
      console.log(`✅ ${data.username}: +${data.xp} XP, +${data.mushrooms} 🍄 (${data.messages} событий)`);
    }
  }
  xpBuffer.clear();
}

async function getOrCreateUser(userId, username) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('discord_id', userId)
    .single();

  if (data) return data;

  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert([{
      id: userId,
      discord_id: userId,
      username,
      level: 1,
      xp: 0,
      mushrooms: 100,
      games_played: 0,
      wins: 0,
    }])
    .select()
    .single();

  if (insertError) {
    console.error('Ошибка создания пользователя:', insertError);
    return null;
  }
  return newUser;
}

// ===== Voice XP =====

function startVoiceTimer(userId, username) {
  if (voiceSessions.has(userId)) return;

  const session = {
    joinedAt: Date.now(),
    mushroomsEarned: 0,
    intervalId: setInterval(() => {
      addToBuffer(userId, username, CONFIG.voiceXpAmount, 0, 'voice_xp');
    }, CONFIG.voiceXpInterval * 1000),
    mushroomIntervalId: setInterval(() => {
      addToBuffer(userId, username, 0, CONFIG.voiceMushroomAmount, 'voice_mushroom');
      session.mushroomsEarned += CONFIG.voiceMushroomAmount;
    }, CONFIG.voiceMushroomInterval * 1000),
  };

  voiceSessions.set(userId, session);
  console.log(`🎧 ${username} подключился к голосовому каналу (+${CONFIG.voiceMushroomAmount}🍄 каждые ${CONFIG.voiceMushroomInterval}с)`);
}

function stopVoiceTimer(userId, username) {
  const session = voiceSessions.get(userId);
  if (!session) return;

  clearInterval(session.intervalId);
  clearInterval(session.mushroomIntervalId);

  const secondsInVoice = Math.floor((Date.now() - session.joinedAt) / 1000);
  const xpEarned = Math.floor(secondsInVoice / CONFIG.voiceXpInterval) * CONFIG.voiceXpAmount;
  const mushroomsSession = session.mushroomsEarned;

  if (xpEarned > 0) {
    addToBuffer(userId, username, xpEarned, 0, `voice_session_${secondsInVoice}s`);
  }

  voiceSessions.delete(userId);
  console.log(`🎧 ${username} отключился (${Math.floor(secondsInVoice / 60)}мин, ${xpEarned} XP, +${mushroomsSession}🍄)`);
}

// ===== Event Handlers =====

client.on('voiceStateUpdate', (oldState, newState) => {
  const userId = newState.id || oldState.id;
  const username = newState.member?.user.username || oldState.member?.user.username || userId;

  if (!oldState.channelId && newState.channelId) {
    startVoiceTimer(userId, username);
  }
  if (oldState.channelId && !newState.channelId) {
    stopVoiceTimer(userId, username);
  }
  if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    stopVoiceTimer(userId, username);
    startVoiceTimer(userId, username);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild || message.guild.id !== CONFIG.guildId) return;

  const userId = message.author.id;
  const username = message.author.username;
  const now = Date.now();
  const lastTime = messageCooldown.get(userId) || 0;

  if (now - lastTime < CONFIG.messageXpCooldown * 1000) return;
  messageCooldown.set(userId, now);

  const [min, max] = CONFIG.messageXpRange;
  const xpGain = Math.floor(Math.random() * (max - min + 1)) + min;
  addToBuffer(userId, username, xpGain, 0, 'message');
});

// ===== Команды =====

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName, user } = interaction;

  if (commandName === 'rank') {
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('discord_id', user.id)
      .single();

    if (!userData) {
      await interaction.reply({ content: '🍄 Ты пока не привязан к сайту! Используй `/link` чтобы привязать.', ephemeral: true });
      return;
    }

    const xpToNext = userData.level * 200;
    const embed = new EmbedBuilder()
      .setColor(0x00FF87)
      .setTitle(`🍄 ${userData.username} — Ранг`)
      .addFields(
        { name: '🎮 Сайт уровень', value: `${userData.level}`, inline: true },
        { name: '🎮 Сайт XP', value: `${userData.xp}/${xpToNext}`, inline: true },
        { name: '🍄 Грибы', value: `${userData.mushrooms}`, inline: true },
        { name: '🎮 Игр сыграно', value: `${userData.games_played}`, inline: true },
        { name: '🏆 Побед', value: `${userData.wins}`, inline: true },
        { name: '💬 Discord XP', value: userData.discord_xp > 0 ? `${userData.discord_xp}` : 'Не синхронизировано', inline: true },
      )
      .setFooter({ text: 'LOLA Discord Server' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'leaderboard') {
    const { data: leaders } = await supabase
      .from('users')
      .select('username, level, xp, mushrooms, games_played, wins')
      .order('xp', { ascending: false })
      .limit(10);

    if (!leaders || leaders.length === 0) {
      await interaction.reply({ content: 'Пока нет данных', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00FF87)
      .setTitle('🏆 Топ-10 игроков LOLA')
      .setDescription(leaders.map((u, i) => {
        const medals = ['🥇', '🥈', '🥉'];
        return `${medals[i] || `**${i + 1}.**`} **${u.username}** — Lvl ${u.level} (${u.xp} XP) | 🍄${u.mushrooms}`;
      }).join('\n'))
      .setFooter({ text: 'LOLA Discord Server' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'link') {
    await interaction.deferReply({ ephemeral: true });
    console.log(`🔗 Link: ищем discord_id=${user.id}, ник=${user.username}`);

    const { data: existingUser } = await supabase
      .from('users')
      .select('id, username, discord_id')
      .eq('discord_id', user.id)
      .single();

    if (existingUser) {
      console.log(`🔗 Уже привязан: ${existingUser.username}`);
      await interaction.editReply(`✅ Ты уже привязан как **${existingUser.username}**!`);
      return;
    }

    const username = user.username;
    const { data: foundUsers, error } = await supabase
      .from('users')
      .select('id, username, discord_id')
      .ilike('username', username)
      .limit(5);

    console.log(`🔗 Поиск по нику "${username}": найдено=${foundUsers?.length || 0}, error=${error?.message || 'нет'}`);

    if (error) {
      console.error('🔗 Link error:', error);
      await interaction.editReply(`❌ Ошибка поиска: ${error.message}`);
      return;
    }

    if (!foundUsers || foundUsers.length === 0) {
      await interaction.editReply(`❌ Не нашёл аккаунт с ником **${username}** на сайте.\n\nУбедись что зашёл на сайт через Discord!`);
      return;
    }

    const target = foundUsers[0];
    console.log(`🔗 Привязываем: ${target.username} (id=${target.id}) → discord_id=${user.id}`);

    const { error: updateError } = await supabase
      .from('users')
      .update({ discord_id: user.id })
      .eq('id', target.id);

    if (updateError) {
      console.error('🔗 Ошибка обновления:', updateError);
      await interaction.editReply(`❌ Ошибка привязки: ${updateError.message}`);
      return;
    }

    console.log(`✅ Привязан: ${target.username} → discord_id=${user.id}`);
    await interaction.editReply(`✅ Привязан к аккаунту **${target.username}**!\n\nТеперь бот будет начислять XP за voice и сообщения.`);
  }

  if (commandName === 'sync') {
    await interaction.deferReply({ ephemeral: true });
    if (xpBuffer.size === 0) {
      await interaction.editReply('⚠️ Буфер пустой — никто не был в voice и не писал сообщения.\nЗайди в голосовой канал или напиши что-нибудь в чат!');
      return;
    }
    const bufInfo = [...xpBuffer.entries()].map(([uid, d]) => `${d.username}: +${d.xp} XP, +${d.mushrooms} 🍄`).join('\n');
    console.log(`📊 Буфер перед отправкой:\n${bufInfo}`);
    await flushXpBuffer();
    await interaction.editReply(`✅ XP буфер отправлен!\n\n${bufInfo}`);
  }

  if (commandName === 'restore-role') {
    await interaction.deferReply({ ephemeral: true });
    const roleType = interaction.options.getString('role');

    if (roleType === 'vip') {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('discord_id', user.id)
        .single();

      if (!userData) {
        await interaction.editReply('❌ Ты не привязан к сайту! Используй `/link`.');
        return;
      }

      const { data: purchaseData } = await supabase
        .from('shop_purchases')
        .select('*')
        .eq('user_id', userData.id)
        .eq('item_id', 'vip-role')
        .order('purchased_at', { ascending: false })
        .limit(1)
        .single();

      if (!purchaseData) {
        await interaction.editReply('❌ У тебя нет покупки VIP роли. Купи её в магазине на сайте!');
        return;
      }

      if (purchaseData.expires_at && new Date(purchaseData.expires_at) < new Date()) {
        await interaction.editReply('❌ Срок действия VIP роли истёк. Купи снова в магазине!');
        return;
      }

      const guild = await client.guilds.fetch(CONFIG.guildId);
      const member = await guild.members.fetch(user.id).catch(() => null);

      if (!member) {
        await interaction.editReply('❌ Не удалось найти тебя на сервере.');
        return;
      }

      if (member.roles.cache.has(ROLE_IDS.vip)) {
        await interaction.editReply('✅ У тебя уже есть VIP роль!');
        return;
      }

      await member.roles.add(ROLE_IDS.vip);
      await interaction.editReply('✅ VIP роль восстановлена! 🎉');
      console.log(`✅ Восстановлена VIP роль для ${user.username}`);
    }
  }
});

// ===== Slash команды =====
const commands = [
  { name: 'rank', description: 'Показать твой ранг и XP' },
  { name: 'leaderboard', description: 'Топ-10 игроков сервера' },
  { name: 'link', description: 'Привязать Discord аккаунт к сайту' },
  { name: 'sync', description: 'Синхронизировать XP (только для админов)' },
  {
    name: 'restore-role',
    description: 'Получить роль повторно если она пропала',
    options: [{
      type: 3,
      name: 'role',
      description: 'Какую роль восстановить',
      required: true,
      choices: [{ name: 'VIP', value: 'vip' }],
    }],
  },
];

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(CONFIG.token);
  try {
    console.log('📝 Регистрация команд...');
    await rest.put(Routes.applicationGuildCommands(CONFIG.clientId, CONFIG.guildId), { body: commands });
    console.log('✅ Команды зарегистрированы!');
  } catch (error) {
    console.error('❌ Ошибка регистрации команд:', error.message);
  }
}

// ===== Выдача ролей =====

async function giveRole(discordId, roleId, roleName, expiresAt) {
  if (!roleId) {
    console.log(`ℹ️ Роль "${roleName}" не настроена (нет ID)`);
    return true;
  }
  try {
    const guild = await client.guilds.fetch(CONFIG.guildId);
    const member = await guild.members.fetch(discordId).catch(() => null);

    if (!member) {
      console.error(`❌ Пользователь ${discordId} не найден на сервере`);
      return false;
    }

    if (member.roles.cache.has(roleId)) {
      console.log(`✅ Роль "${roleName}" уже есть у ${member.user.tag}`);
      return true;
    }

    await member.roles.add(roleId);
    console.log(`✅ Выдана роль "${roleName}" пользователю ${member.user.tag}`);

    const expiryDate = expiresAt ? new Date(expiresAt).toLocaleDateString('ru-RU') : 'навсегда';
    try {
      await member.send(`🎉 Поздравляем! Тебе выдана роль **${roleName}**!\n⏰ Срок действия: до ${expiryDate}`);
    } catch {}

    return true;
  } catch (error) {
    console.error(`❌ Ошибка выдачи роли ${roleId}:`, error.message);
    return false;
  }
}

async function createRainbowRole(discordId, username, color1, color2, purchaseId) {
  try {
    const guild = await client.guilds.fetch(CONFIG.guildId);
    const rainbowRoles = guild.roles.cache.filter(r => r.name.endsWith('🎨'));
    
    if (rainbowRoles.size >= 50) {
      console.error(`❌ Лимит rainbow ролей достигнут (${rainbowRoles.size}/50)`);
      return { success: false, reason: 'limit' };
    }

    const member = await guild.members.fetch(discordId).catch(() => null);
    if (!member) {
      console.error(`❌ Пользователь ${discordId} не найден`);
      return { success: false, reason: 'not_found' };
    }

    // Удалить старую rainbow роль
    const oldRole = guild.roles.cache.find(r => r.name.endsWith('🎨') && member.roles.cache.has(r.id));
    if (oldRole) {
      await member.roles.remove(oldRole);
      await oldRole.delete();
      console.log(`🗑️ Удалена старая rainbow роль у ${member.user.tag}`);
    }

    const role = await guild.roles.create({
      name: `${username} 🎨`,
      color: parseInt(color1.replace('#', ''), 16),
      reason: 'Rainbow name purchase',
    });

    const botHighestRole = guild.members.me.roles.highest;
    const targetPosition = Math.max(0, botHighestRole.position - 1);
    await role.setPosition(targetPosition, { reason: 'Move rainbow role to top' });

    await member.roles.add(role);
    console.log(`🎨 Создана rainbow роль "${role.name}" для ${member.user.tag}`);

    rainbowColorState.set(role.id, { colorIndex: 0, color1, color2 });

    await supabase
      .from('users')
      .update({ rainbow_color1: color1, rainbow_color2: color2, rainbow_role_id: role.id })
      .eq('discord_id', discordId);

    try {
      await member.send(`🎨 Твой переливающийся ник активирован!\nЦвета: ${color1} ↔ ${color2}\n⏰ Срок: 90 дней`);
    } catch {}

    return { success: true, roleId: role.id };
  } catch (error) {
    console.error(`❌ Ошибка создания rainbow роли:`, error.message);
    return { success: false, reason: 'error', error };
  }
}

async function revokeRole(discordId, roleId, roleName, sendNotify = true) {
  if (!roleId) return true;
  try {
    const guild = await client.guilds.fetch(CONFIG.guildId);
    const member = await guild.members.fetch(discordId).catch(() => null);

    if (!member) {
      console.log(`ℹ️ Пользователь ${discordId} не найден (роль не забрана)`);
      return true;
    }

    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      console.log(`🗑️ Забрана роль "${roleName}" у ${member.user.tag}`);

      if (sendNotify) {
        try {
          await member.send(`⏰ Срок действия роли **${roleName}** истёк. Купи снова в магазине!`);
        } catch {}
      }
    }
    return true;
  } catch (error) {
    console.error(`❌ Ошибка забирания роли ${roleId}:`, error.message);
    return false;
  }
}

// ===== Проверка просроченных ролей =====

async function checkExpiredRoles() {
  try {
    console.log('⏰ Проверка просроченных ролей...');

    const { data: expiredPurchases, error } = await supabase
      .from('shop_purchases')
      .select('*')
      .lt('expires_at', new Date().toISOString())
      .in('item_id', ['vip-role', 'custom-color', 'xp-boost-x2', 'xp-boost-x3', 'frame-bronze', 'frame-silver', 'frame-gold']);

    if (error) {
      console.error('❌ Ошибка проверки просроченных:', error.message);
      return;
    }

    if (!expiredPurchases || expiredPurchases.length === 0) return;
    console.log(`🔴 Найдено ${expiredPurchases.length} просроченных покупок`);

    for (const purchase of expiredPurchases) {
      const { data: userData } = await supabase
        .from('users')
        .select('discord_id')
        .eq('id', purchase.user_id)
        .single();

      if (!userData) continue;

      switch (purchase.item_id) {
        case 'vip-role':
          await revokeRole(userData.discord_id, ROLE_IDS.vip, 'VIP');
          break;
        case 'custom-color':
          const { data: rainbowData } = await supabase
            .from('users')
            .select('rainbow_role_id')
            .eq('id', purchase.user_id)
            .single();
          if (rainbowData?.rainbow_role_id) {
            await revokeRole(userData.discord_id, rainbowData.rainbow_role_id, 'Rainbow');
            try {
              const guild = await client.guilds.fetch(CONFIG.guildId);
              const role = await guild.roles.fetch(rainbowData.rainbow_role_id);
              if (role) await role.delete();
            } catch {}
            await supabase
              .from('users')
              .update({ rainbow_role_id: null, rainbow_color1: null, rainbow_color2: null })
              .eq('id', purchase.user_id);
          }
          break;
        case 'xp-boost-x2':
          await revokeRole(userData.discord_id, ROLE_IDS.xp_boost_x2, 'XP Буст x2');
          break;
        case 'xp-boost-x3':
          await revokeRole(userData.discord_id, ROLE_IDS.xp_boost_x3, 'XP Буст x3');
          break;
        case 'frame-bronze':
          await revokeRole(userData.discord_id, ROLE_IDS.frame_bronze, 'Рамка 🥉');
          await supabase.from('users').update({ avatar_frame: null }).eq('id', purchase.user_id);
          break;
        case 'frame-silver':
          await revokeRole(userData.discord_id, ROLE_IDS.frame_silver, 'Рамка 🥈');
          await supabase.from('users').update({ avatar_frame: null }).eq('id', purchase.user_id);
          break;
        case 'frame-gold':
          await revokeRole(userData.discord_id, ROLE_IDS.frame_gold, 'Рамка 🥇');
          await supabase.from('users').update({ avatar_frame: null }).eq('id', purchase.user_id);
          break;
      }
    }
  } catch (err) {
    console.error('❌ Ошибка проверки просроченных ролей:', err.message);
  }
}

// ===== Переключение цветов rainbow =====

async function toggleRainbowColors() {
  try {
    const guild = await client.guilds.fetch(CONFIG.guildId);
    for (const [roleId, state] of rainbowColorState) {
      const role = await guild.roles.fetch(roleId).catch(() => null);
      if (!role) continue;
      state.colorIndex = state.colorIndex === 0 ? 1 : 0;
      const newColor = state.colorIndex === 0 ? state.color1 : state.color2;
      await role.edit({ color: parseInt(newColor.replace('#', ''), 16) });
    }
  } catch (err) {
    console.error('❌ Ошибка переключения rainbow:', err.message);
  }
}

// ===== Обработка покупок =====

async function handlePurchase(purchase) {
  const { id: purchaseId, user_id, item_id, item_name } = purchase;
  if (processedPurchases.has(purchaseId)) return;
  processedPurchases.add(purchaseId);

  console.log(`🛒 Новая покупка: ${item_name} (user: ${user_id})`);

  const { data: userData, error } = await supabase
    .from('users')
    .select('discord_id, username')
    .eq('id', user_id)
    .single();

  if (error || !userData) {
    console.error(`❌ Не удалось найти пользователя ${user_id}:`, error?.message);
    return;
  }

  const discordId = userData.discord_id;
  const username = userData.username;

  switch (item_id) {
    case 'vip-role':
      await giveRole(discordId, ROLE_IDS.vip, 'VIP', purchase.expires_at);
      break;
    case 'custom-color':
      const { data: rainbowData } = await supabase
        .from('users')
        .select('rainbow_color1, rainbow_color2')
        .eq('id', user_id)
        .single();
      if (!rainbowData?.rainbow_color1 || !rainbowData?.rainbow_color2) {
        console.log(`⏳ Custom color для ${username} — ожидает выбора цветов на сайте`);
        return;
      }
      await createRainbowRole(discordId, username, rainbowData.rainbow_color1, rainbowData.rainbow_color2, purchaseId);
      break;
    case 'tournament-reserve':
      try {
        const guild = await client.guilds.fetch(CONFIG.guildId);
        const member = await guild.members.fetch(discordId).catch(() => null);
        if (member) {
          await member.send(`🏆 Поздравляем! Ты купил резерв на турнир!\n⏰ Срок действия: 30 дней`);
        }
      } catch {}
      break;
    case 'xp-boost-x2':
      const member2 = await (await client.guilds.fetch(CONFIG.guildId)).members.fetch(discordId).catch(() => null);
      if (member2?.roles.cache.has(ROLE_IDS.xp_boost_x3)) {
        await revokeRole(discordId, ROLE_IDS.xp_boost_x3, 'XP Буст x3', false);
        await giveRole(discordId, ROLE_IDS.xp_boost_x2, 'XP Буст x2', purchase.expires_at);
        try {
          await member2.send(`⬇️ Твой XP Буст понижен до **XP Буст x2**!\n⏰ Срок: 12 часов`);
        } catch {}
      } else {
        await giveRole(discordId, ROLE_IDS.xp_boost_x2, 'XP Буст x2', purchase.expires_at);
      }
      break;
    case 'xp-boost-x3':
      await revokeRole(discordId, ROLE_IDS.xp_boost_x2, 'XP Буст x2', false);
      await giveRole(discordId, ROLE_IDS.xp_boost_x3, 'XP Буст x3', purchase.expires_at);
      try {
        const member3 = await (await client.guilds.fetch(CONFIG.guildId)).members.fetch(discordId).catch(() => null);
        if (member3) {
          await member3.send(`⬆️ Твой XP Буст обновлён до **XP Буст x3**!\n⏰ Срок: 12 часов`);
        }
      } catch {}
      break;
    case 'frame-bronze':
      await giveRole(discordId, ROLE_IDS.frame_bronze, 'Рамка 🥉', null);
      break;
    case 'frame-silver':
      await giveRole(discordId, ROLE_IDS.frame_silver, 'Рамка 🥈', null);
      break;
    case 'frame-gold':
      await giveRole(discordId, ROLE_IDS.frame_gold, 'Рамка 🥇', null);
      break;
    default:
      console.log(`ℹ️ Предмет "${item_name}" не требует выдачи роли`);
  }
}

async function checkNewPurchases() {
  try {
    const { data, error } = await supabase
      .from('shop_purchases')
      .select('*')
      .order('purchased_at', { ascending: false })
      .limit(10);

    if (error) {
      const isHtml = error.message && error.message.includes('<!DOCTYPE');
      if (isHtml) {
        console.error('❌ Supabase временно недоступен (SSL ошибка). Ждём...');
      } else {
        console.error('❌ Ошибка проверки покупок:', error.message);
      }
      return;
    }

    if (!data || data.length === 0) return;
    for (const purchase of data) {
      if (!processedPurchases.has(purchase.id)) {
        await handlePurchase(purchase);
      }
    }
  } catch (err) {
    const isHtml = err.message && err.message.includes('<!DOCTYPE');
    if (isHtml) {
      console.error('❌ Supabase временно недоступен. Повтор через 10 сек...');
    } else {
      console.error('❌ Ошибка polling покупок:', err.message);
    }
  }
}

// ===== Авто-снятие мутов =====

async function checkExpiredMutes() {
  try {
    console.log('⏰ Проверка истёкших мутов...');
    
    // Если у вас есть таблица user_mutes с mute_until:
    const { data: expiredMutes, error } = await supabase
      .from('user_mutes')
      .select('user_id, discord_id, username')
      .lt('mute_until', new Date().toISOString())
      .eq('is_active', true);

    if (error) {
      console.error('❌ Ошибка проверки мутов:', error.message);
      return;
    }

    if (!expiredMutes || expiredMutes.length === 0) return;

    for (const mute of expiredMutes) {
      try {
        const guild = await client.guilds.fetch(CONFIG.guildId);
        const member = await guild.members.fetch(mute.discord_id).catch(() => null);
        
        if (member && ROLE_IDS.mute) {
          if (member.roles.cache.has(ROLE_IDS.mute)) {
            await member.roles.remove(ROLE_IDS.mute);
            console.log(`✅ Снят мут у ${mute.username}`);
            try {
              await member.send('✅ Ваш мут на сервере LOLA истёк. Добро пожаловать обратно!');
            } catch {}
          }
        }
        
        await supabase
          .from('user_mutes')
          .update({ is_active: false })
          .eq('user_id', mute.user_id);
          
      } catch (err) {
        console.error(`❌ Ошибка снятия мута у ${mute.username}:`, err.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка checkExpiredMutes:', error.message);
  }
}

// ===== Синхронизация банов =====

async function syncBannedUsers() {
  try {
    console.log('🔍 Проверка забанненных пользователей...');
    
    const { data: bannedUsers } = await supabase
      .from('users')
      .select('id, discord_id, username, is_banned')
      .eq('is_banned', true)
      .not('discord_id', 'is', null);

    if (!bannedUsers || bannedUsers.length === 0) {
      console.log('✅ Нет забанненных пользователей');
      return;
    }

    for (const user of bannedUsers) {
      try {
        const guild = await client.guilds.fetch(CONFIG.guildId);
        const member = await guild.members.fetch(user.discord_id).catch(() => null);
        
        if (member && ROLE_IDS.banned) {
          if (!member.roles.cache.has(ROLE_IDS.banned)) {
            await member.roles.add(ROLE_IDS.banned);
            console.log(`🚫 Забанен пользователь: ${user.username}`);
          }
        }
      } catch (err) {
        console.error(`❌ Ошибка бана ${user.username}:`, err.message);
      }
    }

    console.log(`✅ Проверка завершена: ${bannedUsers.length} забанненных`);
  } catch (error) {
    console.error('❌ Ошибка syncBannedUsers:', error.message);
  }
}

async function syncBanStatus(discordId, username, shouldBan) {
  try {
    const guild = await client.guilds.fetch(CONFIG.guildId);
    const member = await guild.members.fetch(discordId).catch(() => null);
    
    if (!member) {
      console.log(`⚠️ Пользователь ${username} не найден на сервере`);
      return;
    }

    if (shouldBan && ROLE_IDS.banned) {
      await member.roles.add(ROLE_IDS.banned);
      console.log(`🚫 Пользователь ${username} забанен`);
    } else if (ROLE_IDS.banned) {
      await member.roles.remove(ROLE_IDS.banned);
      console.log(`✅ Пользователь ${username} разбанен`);
    }
  } catch (error) {
    console.error(`❌ Ошибка syncBanStatus:`, error.message);
  }
}

// ===== Готовность =====

client.once('clientReady', () => {
  console.log(`✅ Бот ${client.user.tag} запущен!`);
  console.log(`   Сервер: ${CONFIG.guildId}`);
  console.log(`   XP за voice: +${CONFIG.voiceXpAmount} каждые ${CONFIG.voiceXpInterval}с`);
  console.log(`   🍄 за voice: +${CONFIG.voiceMushroomAmount} каждые ${CONFIG.voiceMushroomInterval}с`);
  console.log(`   XP за сообщение: ${CONFIG.messageXpRange[0]}-${CONFIG.messageXpRange[1]} (кд ${CONFIG.messageXpCooldown / 60} мин)`);
  console.log(`   Синхронизация: каждые ${CONFIG.syncInterval / 60000} мин`);

  client.user.setActivity('LOLA Server', { type: ActivityType.Watching });

  // Автоматический flush XP
  setInterval(flushXpBuffer, CONFIG.syncInterval);

  // Polling покупок каждые 10 секунд
  setInterval(checkNewPurchases, 10000);
  checkNewPurchases();
  console.log('🛒 Polling покупок запущен (каждые 10 сек)');

  // Проверка просроченных ролей каждые 30 минут
  setInterval(checkExpiredRoles, 30 * 60 * 1000);
  console.log('⏰ Проверка просроченных ролей запущена (каждые 30 мин)');

  // Переключение rainbow цветов каждые 5 минут
  setInterval(toggleRainbowColors, 5 * 60 * 1000);
  console.log('🎨 Rainbow переключение запущено (каждые 5 мин)');

  // Авто-снятие мутов каждые 5 минут
  setInterval(checkExpiredMutes, 5 * 60 * 1000);
  console.log('⏰ Авто-снятие мутов запущено (каждые 5 мин)');

  // Проверка забанненных при старте
  syncBannedUsers();
});

// ===== Логин =====

registerCommands().then(() => {
  client.login(CONFIG.token).catch(err => {
    console.error('❌ Ошибка логина:', err.message);
    process.exit(1);
  });
});

// ===== Экспорт для использования в других модулях =====
export { syncBanStatus, giveRole, revokeRole };
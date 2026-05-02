import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export interface User {
  id: string;
  discord_id: string;
  username: string;
  avatar_url: string | null;
  level: number;
  xp: number;
  mushrooms: number;
  games_played: number;
  wins: number;
  discord_xp: number;
  discord_level: number;
  last_sync: string | null;
  discord_roles: string[] | null;
  // Кастомизация профиля
  avatar_frame: string | null;
  custom_avatar_url: string | null;
  custom_badge_text: string | null;
  custom_badge_emoji: string | null;
  profile_banner_url: string | null;
  avatar_effect: string | null;
  has_crown: boolean;
  rainbow_color1: string | null;
  rainbow_color2: string | null;
  rainbow_role_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  user_id: string;
  game_type: string;
  bet: number;
  result: string;
  mushrooms_change: number;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_url: string | null;
  level: number;
  mushrooms: number;
  games_played: number;
  wins: number;
  avatar_frame: string | null;
  custom_avatar_url: string | null;
  custom_badge_text: string | null;
  custom_badge_emoji: string | null;
  avatar_effect: string | null;
  has_crown: boolean;
}

// Получить или создать пользователя
// supabaseId — UUID от Supabase Auth
// discordId — Discord snowflake ID
// username, avatarUrl — данные пользователя
export async function getOrCreateUser(supabaseId: string, discordId: string | null, username: string, avatarUrl?: string): Promise<User | null> {
  try {
    // Сначала ищем по discord_id (если он есть)
    if (discordId) {
      const { data: existingByDiscord } = await supabase
        .from('users')
        .select('*')
        .eq('discord_id', discordId)
        .single();

      if (existingByDiscord) {
        // Обновляем username/avatar если изменились
        if (existingByDiscord.username !== username || existingByDiscord.avatar_url !== avatarUrl) {
          await supabase
            .from('users')
            .update({ username, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
            .eq('discord_id', discordId);
          existingByDiscord.username = username;
          existingByDiscord.avatar_url = avatarUrl;
        }
        return existingByDiscord;
      }
    }

    // Ищем по Supabase ID
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', supabaseId)
      .single();

    if (existingUser) {
      if (existingUser.username !== username || existingUser.avatar_url !== avatarUrl) {
        await supabase
          .from('users')
          .update({ username, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
          .eq('id', supabaseId);
        existingUser.username = username;
        existingUser.avatar_url = avatarUrl;
      }
      // Обновляем discord_id если его ещё нет
      if (discordId && !existingUser.discord_id) {
        await supabase
          .from('users')
          .update({ discord_id: discordId })
          .eq('id', supabaseId);
        existingUser.discord_id = discordId;
      }
      return existingUser;
    }

    // Создаём нового
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        id: supabaseId,
        discord_id: discordId,
        username,
        avatar_url: avatarUrl,
        level: 1,
        xp: 0,
        mushrooms: 25,
        games_played: 0,
        wins: 0,
      }])
      .select()
      .single();

    if (insertError) {
      logger.error('Error creating user:', insertError);
      return null;
    }

    return newUser;
  } catch (error) {
    logger.error('Error in getOrCreateUser:', error);
    return null;
  }
}

// Обновить данные пользователя (используется для обновления профиля)
export async function updateUserProfile(
  userId: string,
  updates: { username?: string; avatar_url?: string }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId);

    return !error;
  } catch (error) {
    console.error('Error updating profile:', error);
    return false;
  }
}

// Записать результат игры (атомарно через RPC функцию)
export async function recordGame(
  userId: string,
  gameType: string,
  bet: number,
  result: string,
  mushroomsChange: number
): Promise<boolean> {
  try {
    // Сначала обновляем грибы
    if (mushroomsChange !== 0) {
      const { error: mushError } = await supabase.rpc('add_mushrooms', {
        user_id: userId,
        amount: mushroomsChange,
      });
      if (mushError) {
        logger.error('Error adding mushrooms:', mushError);
        // Не возвращаем false — запишем игру даже если грибы не обновились
      }
    }

    // Записываем игру
    const { error } = await supabase
      .from('games')
      .insert([{
        user_id: userId,
        game_type: gameType,
        bet: bet,
        result: result,
        mushrooms_change: mushroomsChange,
      }]);

    if (error) {
      logger.error('Error recording game:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error in recordGame:', error);
    return false;
  }
}

// Получить последние игры пользователя
export async function getRecentGames(userId: string, limit: number = 10): Promise<Game[]> {
  try {
    const { data: games } = await supabase
      .from('games')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return games || [];
  } catch (error) {
    logger.error('Error fetching recent games:', error);
    return [];
  }
}

// Получить таблицу лидеров
export async function getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
  try {
    const { data } = await supabase
      .from('users')
      .select('id, username, avatar_url, level, mushrooms, games_played, wins, avatar_frame, custom_avatar_url, custom_badge_text, custom_badge_emoji, avatar_effect, has_crown')
      .order('mushrooms', { ascending: false })
      .limit(limit);

    return data || [];
  } catch (error) {
    logger.error('Error fetching leaderboard:', error);
    return [];
  }
}

// Получить статистику сервера
export async function getServerStats() {
  try {
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: totalGames } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true });

    const { data: topUser } = await supabase
      .from('users')
      .select('mushrooms')
      .order('mushrooms', { ascending: false })
      .limit(1)
      .single();

    return {
      totalUsers: totalUsers || 0,
      totalGames: totalGames || 0,
      topMushrooms: topUser?.mushrooms || 0,
    };
  } catch (error) {
    logger.error('Error fetching server stats:', error);
    return { totalUsers: 0, totalGames: 0, topMushrooms: 0 };
  }
}

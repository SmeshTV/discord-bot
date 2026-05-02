import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Gamepad2, Sprout, Shield, RefreshCw, Calendar, Clock, Zap, Palette, Crown, Sparkles, Flame, LayoutDashboard, Users, ShoppingBag, CalendarDays, TrendingUp } from 'lucide-react';
import { getRecentGames, Game, User } from '../lib/database';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { getRoleName, getRoleColor, sortRolesByPriority, sortRolesByHierarchy, ROLE_CATEGORIES, getRoleCategory } from '../lib/roles';
import { getCached, setCached } from '../lib/cache';
import { createNotification } from '../lib/notifications';
import { addToast } from '../components/NotificationToast';
import ProfileCustomizer from '../components/ProfileCustomizer';

// Эмодзи для уровней
const getLevelEmoji = (level: number): string => {
  const tiers = [
    { min: 1, max: 5, emoji: '🌱' },
    { min: 6, max: 10, emoji: '🍄' },
    { min: 11, max: 15, emoji: '🌿' },
    { min: 16, max: 20, emoji: '🌲' },
    { min: 21, max: 25, emoji: '⚔️' },
    { min: 26, max: 30, emoji: '🛡️' },
    { min: 31, max: 35, emoji: '🗡️' },
    { min: 36, max: 40, emoji: '🏹' },
    { min: 41, max: 45, emoji: '🔮' },
    { min: 46, max: 50, emoji: '⚡' },
    { min: 51, max: 55, emoji: '👑' },
    { min: 56, max: 60, emoji: '🏆' },
    { min: 61, max: 65, emoji: '💎' },
    { min: 66, max: 70, emoji: '🌟' },
    { min: 71, max: 75, emoji: '🔥' },
    { min: 76, max: 80, emoji: '💀' },
    { min: 81, max: 85, emoji: '🐉' },
    { min: 86, max: 90, emoji: '🌀' },
    { min: 91, max: 95, emoji: '☄️' },
    { min: 96, max: 100, emoji: '🌌' },
  ];
  for (const t of tiers) {
    if (level >= t.min && level <= t.max) return t.emoji;
  }
  return '🌌';
};

// Эффекты для аватара
const getAvatarEffectClass = (effect: string | null | undefined): string => {
  if (effect === 'sparkles') return 'avatar-sparkles';
  if (effect === 'fire') return 'avatar-fire';
  return '';
};

interface TournamentReservation {
  id: string;
  item_name: string;
  purchased_at: string;
  expires_at: string;
  days_remaining: number;
  days_count: number;
}

interface XPBoost {
  id: string;
  item_id: string;
  item_name: string;
  purchased_at: string;
  expires_at: string;
  hours_remaining: number;
  multiplier: number;
}

const Dashboard = () => {
  const { user, permissions, loading: authLoading, refreshUser } = useAuth();
  const [recentGames, setRecentGames] = useState<Game[]>(() => getCached<Game[]>('dashboard_games') || []);
  const [tournamentReservations, setTournamentReservations] = useState<TournamentReservation[]>([]);
  const [xpBoosts, setXPBoosts] = useState<XPBoost[]>([]);
  const [purchased, setPurchased] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProfileCustomizer, setShowProfileCustomizer] = useState(false);

  const prevLevel = useRef(user?.discord_level ?? 1);
  const prevMushrooms = useRef(user?.mushrooms ?? 100);

  useEffect(() => {
    if (!user) return;
    if (user.discord_level > prevLevel.current) {
      createNotification('levelUp', { level: user.discord_level });
      addToast({
        title: `🎉 Уровень ${user.discord_level}!`,
        message: `Ты достиг уровня ${user.discord_level} в Discord!`,
        icon: '🏆',
        duration: 8000,
      });
    }
    const mushDiff = user.mushrooms - prevMushrooms.current;
    if (mushDiff >= 50) {
      addToast({
        title: '🍀 Крупный выигрыш!',
        message: `+${mushDiff} грибов!`,
        icon: '💰',
        duration: 6000,
      });
    }
    prevLevel.current = user.discord_level ?? 1;
    prevMushrooms.current = user.mushrooms ?? 100;
  }, [user?.discord_level, user?.mushrooms]);

  useEffect(() => {
    if (authLoading || !user) return;
    const loadData = async () => {
      try {
        const games = await getRecentGames(user.id, 5);
        setRecentGames(games);
        setCached('dashboard_games', games);
      } catch {
        setError('Ошибка загрузки данных');
      }
    };
    loadData();
  }, [user, authLoading]);

  // Загрузка резервов на турнир
  useEffect(() => {
    if (!user) return;
    const loadReservations = async () => {
      const { data, error } = await supabase
        .from('shop_purchases')
        .select('*')
        .eq('user_id', user.id)
        .eq('item_id', 'tournament-reserve')
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('purchased_at', { ascending: true });
      if (error) {
        console.error('Error loading reservations:', error);
        return;
      }
      if (data && data.length > 0) {
        const withRemaining = data.map(res => {
          const expiresAt = res.expires_at 
            ? new Date(res.expires_at) 
            : new Date(new Date(res.purchased_at).getTime() + 30 * 24 * 60 * 60 * 1000);
          const purchasedAt = new Date(res.purchased_at);
          const now = new Date();
          const diffDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const totalCount = 30;
          return {
            id: res.id,
            item_name: res.item_name,
            purchased_at: res.purchased_at,
            expires_at: expiresAt.toISOString(),
            days_remaining: Math.max(0, diffDays),
            days_count: totalCount,
          };
        });
        setTournamentReservations(withRemaining);
      } else {
        setTournamentReservations([]);
      }
    };
    loadReservations();
  }, [user]);

  // Загрузка покупок
  useEffect(() => {
    if (!user) return;
    const loadPurchases = async () => {
      const { data } = await supabase
        .from('shop_purchases')
        .select('item_id, expires_at')
        .eq('user_id', user.id);
      if (data) {
        const now = new Date();
        const activePurchases = data.filter(p => !p.expires_at || new Date(p.expires_at) > now);
        setPurchased(activePurchases.map(p => p.item_id));
      }
    };
    loadPurchases();
  }, [user]);

  // Загрузка XP бустов
  useEffect(() => {
    if (!user) return;
    const loadXPBoosts = async () => {
      const { data, error } = await supabase
        .from('shop_purchases')
        .select('*')
        .eq('user_id', user.id)
        .in('item_id', ['xp-boost-x2', 'xp-boost-x3'])
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true });
      if (error) {
        console.error('Error loading XP boosts:', error);
        return;
      }
      if (data) {
        const boosts = data.map(boost => {
          const expiresAt = new Date(boost.expires_at);
          const now = new Date();
          const diffHours = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));
          const multiplier = boost.item_id === 'xp-boost-x3' ? 3 : 2;
          return {
            id: boost.id,
            item_id: boost.item_id,
            item_name: boost.item_name,
            purchased_at: boost.purchased_at,
            expires_at: boost.expires_at,
            hours_remaining: Math.max(0, diffHours),
            multiplier,
          };
        });
        setXPBoosts(boosts);
      }
    };
    loadXPBoosts();
  }, [user]);

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      await refreshUser();
      const games = await getRecentGames(user.id, 5);
      setRecentGames(games);
      setCached('dashboard_games', games);
      const { data } = await supabase
        .from('shop_purchases')
        .select('*')
        .eq('user_id', user.id)
        .eq('item_id', 'tournament-reserve')
        .gt('expires_at', new Date().toISOString())
        .order('purchased_at', { ascending: true });
      if (data) {
        const withRemaining = data.map(res => {
          const expiresAt = new Date(res.expires_at);
          const purchasedAt = new Date(res.purchased_at);
          const now = new Date();
          const diffDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const totalCount = Math.ceil((expiresAt.getTime() - purchasedAt.getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: res.id,
            item_name: res.item_name,
            purchased_at: res.purchased_at,
            expires_at: res.expires_at,
            days_remaining: Math.max(0, diffDays),
            days_count: totalCount,
          };
        });
        setTournamentReservations(withRemaining);
      }
      const { data: boostData } = await supabase
        .from('shop_purchases')
        .select('*')
        .eq('user_id', user.id)
        .in('item_id', ['xp-boost-x2', 'xp-boost-x3'])
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true });
      if (boostData) {
        const boosts = boostData.map(boost => {
          const expiresAt = new Date(boost.expires_at);
          const now = new Date();
          const diffHours = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));
          const multiplier = boost.item_id === 'xp-boost-x3' ? 3 : 2;
          return {
            id: boost.id,
            item_id: boost.item_id,
            item_name: boost.item_name,
            purchased_at: boost.purchased_at,
            expires_at: boost.expires_at,
            hours_remaining: Math.max(0, diffHours),
            multiplier,
          };
        });
        setXPBoosts(boosts);
      }
      setError(null);
    } catch {
      setError('Ошибка обновления');
    }
    setRefreshing(false);
  };

  if (authLoading) return null;
  if (!user) {
    return (
      <div className="pt-24 pb-20 px-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-2xl text-gray-400 mb-4">Войдите через Discord для просмотра дашборда</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="pt-24 pb-20 px-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-2xl text-red-500 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary px-6 py-3">Попробовать снова</button>
        </div>
      </div>
    );
  }

  const xpToNext = user.level * 200;
  const achievements = [
    { icon: '🏆', name: 'Первая победа', unlocked: user.wins > 0 },
    { icon: '🎮', name: 'Геймер', unlocked: user.games_played >= 10 },
    { icon: '🍄', name: 'Грибной охотник', unlocked: user.mushrooms >= 200 },
    { icon: '⚡', name: 'Быстрый старт', unlocked: user.level >= 5 },
    { icon: '🔥', name: 'На огне', unlocked: user.wins >= 20 },
    { icon: '💎', name: 'Элита', unlocked: user.level >= 25 },
  ];

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="text-5xl font-bold gradient-text mb-2">Дашборд</h1>
            <p className="text-gray-400">Твой прогресс</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={refreshing ? 'animate-spin' : ''} size={18} />
          </button>
        </motion.div>

        {/* 🔥 Profile Card с баннером */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card mb-8 overflow-hidden relative"
        >
          {/* 🔥 Баннер профиля */}
          {user.profile_banner_url && (
            <div className="relative h-32 md:h-40 w-full overflow-hidden">
              <img 
                src={user.profile_banner_url} 
                alt="Profile banner" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
            </div>
          )}
          
          <div className={`p-8 ${user.profile_banner_url ? '-mt-16 relative z-10' : ''}`}>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative">
                {user.has_crown && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20">
                    <Crown size={28} className="text-yellow-400 drop-shadow-lg" />
                  </div>
                )}
                {user.avatar_effect === 'sparkles' && (
                  <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-yellow-400/30 via-pink-400/30 to-purple-400/30 animate-pulse z-0" />
                )}
                {user.avatar_effect === 'fire' && (
                  <div className="absolute -inset-4 rounded-full bg-gradient-to-t from-orange-500/50 via-red-500/30 to-transparent animate-pulse z-0" />
                )}
                {user.avatar_frame === 'frame-gold' && (
                  <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-500 z-0" />
                )}
                {user.avatar_frame === 'frame-silver' && (
                  <div className="absolute -inset-2.5 rounded-full bg-gradient-to-br from-gray-300 via-gray-400 to-slate-400 z-0" style={{ animation: 'spin 3s linear infinite' }} />
                )}
                {user.avatar_frame === 'frame-bronze' && (
                  <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-amber-600 via-amber-700 to-orange-800 z-0" />
                )}
                <div className={`w-32 h-32 rounded-full overflow-hidden flex items-center justify-center relative z-10 ${
                  user.avatar_frame === 'frame-gold' ? 'border-4 border-yellow-400' :
                  user.avatar_frame === 'frame-silver' ? 'border-4 border-gray-300' :
                  user.avatar_frame === 'frame-bronze' ? 'border-4 border-amber-700' :
                  'border-4 border-mushroom-neon'
                }`}>
                  {user.custom_avatar_url ? (
                    <img src={user.custom_avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-mushroom-neon to-mushroom-purple flex items-center justify-center text-6xl">
                      {user.username.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 z-20 bg-[#0f0f1a] border-2 border-mushroom-neon text-white px-2 py-0.5 rounded-full font-bold text-xs flex items-center gap-1 shadow-lg">
                  {getLevelEmoji(user.level)} {user.level}
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <h2 className="text-3xl font-bold">{user.username}</h2>
                  {purchased.includes('frame-bronze') && (
                    <button
                      onClick={() => setShowProfileCustomizer(true)}
                      className="px-4 py-2 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all border border-purple-500/30 shadow-lg shadow-purple-500/20"
                      title="Магазин кастомизации"
                    >
                      🎨 Магазин
                    </button>
                  )}
                </div>
                {user.custom_badge_text && (
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-mushroom-neon/20 border border-mushroom-neon/30 rounded-full text-sm mb-4">
                    {user.custom_badge_emoji && <span>{user.custom_badge_emoji}</span>}
                    <span className="text-mushroom-neon font-bold">{user.custom_badge_text}</span>
                  </div>
                )}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>🎮 XP: {user.xp}/{xpToNext}</span>
                    <span>Уровень {user.level}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((user.xp / xpToNext) * 100, 100)}%` }}
                      transition={{ delay: 0.5, duration: 1 }}
                      className="h-full bg-gradient-to-r from-mushroom-neon to-transparent"
                    />
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ delay: 1, duration: 1.5, repeat: Infinity }}
                      className="absolute left-0 top-0 h-full w-1 bg-mushroom-neon blur-sm"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>💬 Discord: {user.discord_xp || 0}/{Math.max((user.discord_level || 1) * 30, 30)}</span>
                    <span>Уровень {user.discord_level || 1}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(((user.discord_xp || 0) / Math.max((user.discord_level || 1) * 30, 30)) * 100, 100)}%` }}
                      transition={{ delay: 0.6, duration: 1 }}
                      className="h-full bg-gradient-to-r from-indigo-400 to-transparent"
                    />
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ delay: 1.2, duration: 1.5, repeat: Infinity }}
                      className="absolute left-0 top-0 h-full w-1 bg-indigo-400 blur-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <div className="flex items-center gap-2">
                    <Sprout className="text-mushroom-neon" size={20} />
                    <span className="font-bold">{user.mushrooms} 🍄</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="text-blue-500" size={20} />
                    <span className="font-bold">{user.games_played} игр</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="text-yellow-500" size={20} />
                    <span className="font-bold">{user.wins} побед</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="text-purple-500" size={20} />
                    <span className="font-bold">{achievements.filter(a => a.unlocked).length} достижений</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Roles */}
        {permissions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card p-6 mb-8"
          >
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Shield className="text-mushroom-neon" size={20} />
              Роли на сервере
            </h3>
            {permissions.roles.length > 0 ? (
              <div className="space-y-4">
                {(() => {
                  const sorted = sortRolesByHierarchy(permissions.roles);
                  const byCategory: { [key: string]: string[] } = {};
                  sorted.forEach(roleId => {
                    const cat = getRoleCategory(roleId);
                    if (!byCategory[cat]) byCategory[cat] = [];
                    byCategory[cat].push(roleId);
                  });
                  return ROLE_CATEGORIES
                    .filter(cat => byCategory[cat.key] && byCategory[cat.key].length > 0)
                    .map(cat => (
                      <div key={cat.key}>
                        <h4 className="text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
                          {cat.emoji} {cat.label}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {byCategory[cat.key].map(roleId => (
                            <span
                              key={roleId}
                              className={`px-3 py-1.5 bg-gradient-to-r ${getRoleColor(roleId)} rounded-full text-xs font-bold text-white`}
                            >
                              {getRoleName(roleId, permissions.roleNames)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ));
                })()}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Роли пока не назначены. Обратись к администрации.</p>
            )}
          </motion.div>
        )}

        {/* Tournament Reservations */}
        {tournamentReservations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }}
            className="glass-card p-6 mb-8 border-2 border-yellow-500/30"
          >
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Trophy className="text-yellow-500" size={20} />
              🏆 Резерв на турнир
            </h3>
            <p className="text-gray-400 text-sm mb-4">Регистрация раньше остальных на турниры</p>
            <div className="space-y-3">
              {tournamentReservations.map((reservation, index) => (
                <div
                  key={reservation.id}
                  className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">🏆</div>
                      <div>
                        <p className="font-bold text-white">Резерв на турнир</p>
                        <p className="text-sm text-gray-400">
                          Куплен {new Date(reservation.purchased_at).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-yellow-500" />
                        <span className="font-bold text-yellow-500">{reservation.days_count} дней</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={16} className="text-green-500" />
                        <span className="font-bold text-green-500">
                          {reservation.days_remaining === 0 ? 'Истекает сегодня' : `Осталось ${reservation.days_remaining} дн.`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* XP Boosts */}
        {xpBoosts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="glass-card p-6 mb-8 border-2 border-purple-500/30"
          >
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Zap className="text-purple-500" size={20} />
              ⚡ XP Бусты
            </h3>
            <p className="text-gray-400 text-sm mb-4">Активные множители XP</p>
            <div className="space-y-3">
              {xpBoosts.map((boost) => (
                <div
                  key={boost.id}
                  className={`p-4 rounded-xl border ${
                    boost.multiplier === 3
                      ? 'bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/30'
                      : 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{boost.multiplier === 3 ? '🔥' : '⚡'}</div>
                      <div>
                        <p className="font-bold text-white">{boost.item_name}</p>
                        <p className="text-sm text-gray-400">
                          Множитель: <span className={`font-bold ${boost.multiplier === 3 ? 'text-orange-500' : 'text-blue-500'}`}>x{boost.multiplier}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className={boost.hours_remaining <= 2 ? 'text-red-500' : 'text-green-500'} />
                        <span className={`font-bold ${boost.hours_remaining <= 2 ? 'text-red-500' : 'text-green-500'}`}>
                          {boost.hours_remaining === 0 ? 'Менее часа' : `Осталось ${boost.hours_remaining} ч.`}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        До {new Date(boost.expires_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Как начать получать XP */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 mb-8"
        >
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            🚀 Как начать получать XP
          </h3>
          <ol className="text-sm text-gray-400 space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-mushroom-neon font-bold text-lg">1.</span>
              <div>
                <span className="text-white font-medium">Привяжи Discord</span>
                <span className="block mt-0.5">Используй команду <code className="px-1.5 py-0.5 bg-white/10 rounded text-mushroom-neon">/link</code> в Discord</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-mushroom-neon font-bold text-lg">2.</span>
              <div>
                <span className="text-white font-medium">Зайди в голосовой канал</span>
                <span className="block mt-0.5">На сервере Discord войди в любой голосовой канал</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-mushroom-neon font-bold text-lg">3.</span>
              <div>
                <span className="text-white font-medium">Подожди 1-2 минуты</span>
                <span className="block mt-0.5">Начнёт капать XP и грибы 🍄 автоматически</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-mushroom-neon font-bold text-lg">4.</span>
              <div>
                <span className="text-white font-medium">Проверь прогресс</span>
                <span className="block mt-0.5">Команда <code className="px-1.5 py-0.5 bg-white/10 rounded text-mushroom-neon">/rank</code> в Discord или обнови эту страницу</span>
              </div>
            </li>
          </ol>
          <div className="mt-4 p-3 bg-mushroom-neon/5 border border-mushroom-neon/20 rounded-xl text-xs text-gray-500">
            💡 Подробности про XP, грибы и систему уровней — в разделе <a href="/faq" className="text-mushroom-neon underline">FAQ</a>
          </div>
        </motion.div>

        {/* Последние игры + Достижения */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Games */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card p-6"
          >
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Gamepad2 className="text-mushroom-neon" size={20} />
              Последние игры
            </h3>
            <div className="space-y-3">
              {recentGames.length > 0 ? (
                recentGames.map((game, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-sm">{game.game_type}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(game.created_at).toLocaleString('ru-RU')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          game.result === 'win'
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-red-500/20 text-red-500'
                        }`}
                      >
                        {game.result === 'win' ? 'Победа' : 'Поражение'}
                      </span>
                      <p className={`text-xs mt-1 ${game.mushrooms_change > 0 ? 'text-mushroom-neon' : 'text-red-500'}`}>
                        {game.mushrooms_change > 0 ? '+' : ''}{game.mushrooms_change} 🍄
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-8 text-sm">Пока нет сыгранных игр. Начни играть!</p>
              )}
            </div>
          </motion.div>

          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6"
          >
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Star className="text-yellow-500" size={20} />
              Достижения
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {achievements.map((achievement, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-xl text-center transition-all ${
                    achievement.unlocked
                      ? 'bg-gradient-to-br from-mushroom-neon/20 to-mushroom-purple/20 border border-mushroom-neon/50'
                      : 'bg-gray-800/50 opacity-50'
                  }`}
                >
                  <div className="text-3xl mb-1">{achievement.icon}</div>
                  <p className="text-[10px] font-medium">{achievement.name}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Profile Customizer Modal */}
      <AnimatePresence>
        {showProfileCustomizer && user && (
          <ProfileCustomizer
            isOpen={showProfileCustomizer}
            onClose={() => setShowProfileCustomizer(false)}
            user={user}
            onUpdate={refreshUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
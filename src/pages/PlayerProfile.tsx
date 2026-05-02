import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Star, Gamepad2, Sprout, Crown, Sparkles, Flame, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getRoleName, getRoleColor } from '../lib/roles';
import { getCached, setCached } from '../lib/cache';
import { useAuth } from '../hooks/useAuth';

const getLevelEmoji = (level: number): string => {
  if (level >= 26) return '🐉';
  if (level >= 21) return '💎';
  if (level >= 16) return '👑';
  if (level >= 11) return '🛡️';
  if (level >= 6) return '⚔️';
  return '🌱';
};

interface ProfileUser {
  id: string;
  username: string;
  avatar_url: string | null;
  level: number;
  xp: number;
  mushrooms: number;
  games_played: number;
  wins: number;
  discord_roles: string[] | null;
  avatar_frame: string | null;
  custom_avatar_url: string | null;
  custom_badge_text: string | null;
  custom_badge_emoji: string | null;
  profile_banner_url: string | null;
  avatar_effect: string | null;
  has_crown: boolean;
  created_at: string;
}

const PlayerProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const [player, setPlayer] = useState<ProfileUser | null>(() => getCached(`player_profile_${userId}`));
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [playerReservation, setPlayerReservation] = useState<{expires_at: string} | null>(null);

  useEffect(() => {
    if (!userId) return;
    const loadPlayer = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('users')
        .select('*')
        .or(`id.eq.${userId},username.ilike.${userId}`)
        .single();
      setPlayer(data);
      if (data) setCached(`player_profile_${userId}`, data);
      
      if (data?.id) {
        const { data: resData } = await supabase
          .from('shop_purchases')
          .select('id, expires_at, purchased_at')
          .eq('user_id', data.id)
          .eq('item_id', 'tournament-reserve')
          .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
          .limit(1);
        
        if (resData && resData.length > 0) {
          const res = resData[0];
          const expiresAt = res.expires_at 
            ? new Date(res.expires_at) 
            : new Date(new Date(res.purchased_at).getTime() + 30 * 24 * 60 * 60 * 1000);
          setPlayerReservation({ expires_at: expiresAt.toISOString() });
        }
      }
      setLoading(false);
    };
    loadPlayer();
  }, [userId]);

  const searchPlayers = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from('users')
      .select('*')
      .ilike('username', `%${searchTerm}%`)
      .order('mushrooms', { ascending: false })
      .limit(10);
    setSearchResults(data || []);
    setSearching(false);
  };

  if (!userId) return null;
  if (loading && !player) return null;

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Back button */}
        <Link
          to="/leaderboard"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-mushroom-neon mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Назад к лидерам
        </Link>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 mb-8"
        >
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Search className="text-mushroom-neon" size={18} />
            Найти игрока
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchPlayers()}
              placeholder="Введи никнейм..."
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3"
            />
            <button
              onClick={searchPlayers}
              disabled={searching || !searchTerm.trim()}
              className="btn-primary px-6 disabled:opacity-50"
            >
              {searching ? '...' : 'Найти'}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((u) => (
                <Link
                  key={u.id}
                  to={`/profile/${u.id}`}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-mushroom-neon to-mushroom-purple flex items-center justify-center text-sm font-bold text-black">
                      {u.username.charAt(0)}
                    </div>
                    <span className="font-medium">{u.username}</span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-mushroom-neon">{u.mushrooms} 🍄</span>
                    <span className="text-gray-400">Lvl {u.level}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {searchTerm && searchResults.length === 0 && !searching && (
            <p className="text-gray-500 text-center py-4">Игрок не найден</p>
          )}
        </motion.div>

        {/* 🔥 Player Profile с баннером */}
        {player ? (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card mb-8 overflow-hidden relative"
            >
              {/* 🔥 Баннер профиля */}
              {player.profile_banner_url && (
                <div className="relative h-32 md:h-40 w-full overflow-hidden">
                  <img 
                    src={player.profile_banner_url} 
                    alt="Profile banner" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
                </div>
              )}
              
              <div className={`p-8 ${player.profile_banner_url ? '-mt-16 relative z-10' : ''}`}>
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="relative">
                    {player.has_crown && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20">
                        <Crown size={28} className="text-yellow-400 drop-shadow-lg" />
                      </div>
                    )}
                    {player.avatar_effect === 'sparkles' && (
                      <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-yellow-400/30 via-pink-400/30 to-purple-400/30 animate-pulse z-0" />
                    )}
                    {player.avatar_effect === 'fire' && (
                      <div className="absolute -inset-4 rounded-full bg-gradient-to-t from-orange-500/50 via-red-500/30 to-transparent animate-pulse z-0" />
                    )}
                    {player.avatar_frame === 'frame-gold' && (
                      <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-500 z-0" />
                    )}
                    {player.avatar_frame === 'frame-silver' && (
                      <div className="absolute -inset-2.5 rounded-full bg-gradient-to-br from-gray-300 via-gray-400 to-slate-400 z-0" style={{ animation: 'spin 3s linear infinite' }} />
                    )}
                    {player.avatar_frame === 'frame-bronze' && (
                      <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-amber-600 via-amber-700 to-orange-800 z-0" />
                    )}
                    <div className={`w-32 h-32 rounded-full overflow-hidden flex items-center justify-center relative z-10 ${
                      player.avatar_frame === 'frame-gold' ? 'border-4 border-yellow-400' :
                      player.avatar_frame === 'frame-silver' ? 'border-4 border-gray-300' :
                      player.avatar_frame === 'frame-bronze' ? 'border-4 border-amber-700' :
                      'border-4 border-mushroom-neon'
                    }`}>
                      {player.custom_avatar_url ? (
                        <img src={player.custom_avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-mushroom-neon to-mushroom-purple flex items-center justify-center text-6xl">
                          {player.username.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 z-20 bg-[#0f0f1a] border-2 border-mushroom-neon text-white px-2 py-0.5 rounded-full font-bold text-xs flex items-center gap-1 shadow-lg">
                      {getLevelEmoji(player.level)} {player.level}
                    </div>
                    {player.discord_roles && player.discord_roles.length > 0 && (
                      <Crown className="absolute -top-2 -right-2 text-yellow-500" size={28} />
                    )}
                  </div>

                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-3xl font-bold mb-2">
                      {player.username}
                      {playerReservation && (
                        <Trophy className="inline ml-2 text-yellow-400" size={20} title="Резерв на турнир" />
                      )}
                    </h2>
                    {playerReservation && (
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-sm mb-2">
                        <Trophy className="text-yellow-400" size={14} />
                        <span className="text-yellow-400 font-medium">Резерв до {new Date(playerReservation.expires_at).toLocaleDateString('ru-RU')}</span>
                      </div>
                    )}
                    {player.custom_badge_text && (
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-mushroom-neon/20 border border-mushroom-neon/30 rounded-full text-sm mb-4">
                        {player.custom_badge_emoji && <span>{player.custom_badge_emoji}</span>}
                        <span className="text-mushroom-neon font-bold">{player.custom_badge_text}</span>
                      </div>
                    )}
                    {player.discord_roles && player.discord_roles.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-400 mb-2">Роли:</p>
                        <div className="flex flex-wrap gap-2">
                          {player.discord_roles.map((roleId) => (
                            <span
                              key={roleId}
                              className={`px-3 py-1.5 bg-gradient-to-r ${getRoleColor(roleId)} rounded-full text-xs font-bold text-white`}
                            >
                              {getRoleName(roleId)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-400 mb-1">
                        <span>XP: {player.xp}/{player.level * 200}</span>
                        <span>Уровень {player.level}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(player.xp / (player.level * 200)) * 100}%` }}
                          transition={{ delay: 0.5, duration: 1 }}
                          className="h-full bg-gradient-to-r from-mushroom-neon to-mushroom-glow"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                      <div className="flex items-center gap-2">
                        <Sprout className="text-mushroom-neon" size={20} />
                        <span className="font-bold">{player.mushrooms} грибов</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Gamepad2 className="text-blue-500" size={20} />
                        <span className="font-bold">{player.games_played} игр</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Trophy className="text-yellow-500" size={20} />
                        <span className="font-bold">{player.wins} побед</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="text-purple-500" size={20} />
                        <span className="font-bold">
                          {player.games_played > 0
                            ? `${((player.wins / player.games_played) * 100).toFixed(1)}% побед`
                            : '0% побед'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Achievements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6"
            >
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Star className="text-yellow-500" />
                Достижения
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {[
                  { icon: '🏆', name: 'Первая победа', unlocked: player.wins > 0 },
                  { icon: '🎮', name: 'Геймер', unlocked: player.games_played >= 10 },
                  { icon: '🍄', name: 'Грибной охотник', unlocked: player.mushrooms >= 200 },
                  { icon: '⚡', name: 'Быстрый старт', unlocked: player.level >= 5 },
                  { icon: '🔥', name: 'На огне', unlocked: player.wins >= 20 },
                  { icon: '💎', name: 'Элита', unlocked: player.level >= 25 },
                ].map((a, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-xl text-center transition-all ${
                      a.unlocked
                        ? 'bg-gradient-to-br from-mushroom-neon/20 to-mushroom-purple/20 border border-mushroom-neon/50'
                        : 'bg-gray-800/50 opacity-50'
                    }`}
                  >
                    <div className="text-3xl mb-2">{a.icon}</div>
                    <p className="text-xs font-medium">{a.name}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <p className="text-2xl text-gray-400 mb-4">Игрок не найден</p>
            <Link to="/leaderboard" className="btn-primary inline-block">
              К таблице лидеров
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PlayerProfile;
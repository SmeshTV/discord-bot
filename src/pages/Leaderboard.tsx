import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Sprout, RefreshCw, Medal, Sparkles, Flame, Trophy } from 'lucide-react';
import { getLeaderboard, LeaderboardEntry } from '../lib/database';
import { getCached, setCached } from '../lib/cache';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Skeleton from '../components/Skeleton';

const getLevelEmoji = (level: number): string => {
  if (level >= 26) return '🐉';
  if (level >= 21) return '💎';
  if (level >= 16) return '👑';
  if (level >= 11) return '🛡️';
  if (level >= 6) return '⚔️';
  return '🌱';
};

const Leaderboard = () => {
  const { user: currentUser } = useAuth();
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>(() => {
    return getCached<LeaderboardEntry[]>('leaderboard') || [];
  });
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserReservation, setCurrentUserReservation] = useState<{expires_at: string} | null>(null);

  // Загрузка резерва текущего пользователя
  useEffect(() => {
    if (!currentUser) return;
    
    const loadReservation = async () => {
      const { data } = await supabase
        .from('shop_purchases')
        .select('id, expires_at, purchased_at')
        .eq('user_id', currentUser.id)
        .eq('item_id', 'tournament-reserve')
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .limit(1);
      
      if (data && data.length > 0) {
        const res = data[0];
        const expiresAt = res.expires_at 
          ? new Date(res.expires_at) 
          : new Date(new Date(res.purchased_at).getTime() + 30 * 24 * 60 * 60 * 1000);
        setCurrentUserReservation({ expires_at: expiresAt.toISOString() });
      }
    };
    
    loadReservation();
  }, [currentUser]);

  useEffect(() => {
    const loadLeaderboard = async () => {
      const data = await getLeaderboard(50);
      setLeaders(data);
      setCached('leaderboard', data);
    };
    loadLeaderboard();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    const data = await getLeaderboard(50);
    setLeaders(data);
    setCached('leaderboard', data);
    setRefreshing(false);
  };

  if (leaders.length === 0) {
    return (
      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-8">
            <div className="h-12 bg-white/10 rounded-xl w-2/3 animate-pulse mb-2" />
            <div className="h-4 bg-white/10 rounded-xl w-1/3 animate-pulse" />
          </div>
          <Skeleton variant="card" count={5} />
        </div>
      </div>
    );
  }

  const topThree = leaders.slice(0, 3);
  const restLeaders = leaders.slice(3);

  // Порядок для пьедестала: 2-1-3 (серебро слева, золото центр, бронза справа)
  const podiumOrder = [
    topThree[1] || null,  // 2nd place (left)
    topThree[0] || null,  // 1st place (center)
    topThree[2] || null,  // 3rd place (right)
  ];
  const podiumPositions = [2, 1, 3];
  const podiumHeights = ['h-32', 'h-44', 'h-24'];
  const podiumColors = [
    'from-gray-300 to-gray-400',
    'from-yellow-400 to-amber-500',
    'from-amber-600 to-amber-700',
  ];
  const borderColors = ['border-gray-400', 'border-yellow-400', 'border-amber-600'];
  const crownSizes = ['text-4xl', 'text-6xl', 'text-3xl'];

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-5xl font-bold gradient-text mb-2">🏆 Таблица лидеров</h1>
            <p className="text-gray-400">Лучшие игроки сервера LOLA</p>
          </div>
          
          <div className="flex items-center gap-4">
            {currentUserReservation && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-3 text-center"
              >
                <Trophy className="text-yellow-400 mx-auto mb-1" size={20} />
                <p className="text-yellow-400 font-bold text-sm">Резерв на турнир</p>
                <p className="text-gray-400 text-xs">
                  до {new Date(currentUserReservation.expires_at).toLocaleDateString('ru-RU')}
                </p>
              </motion.div>
            )}
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={refreshing ? 'animate-spin' : ''} size={18} />
            </button>
          </div>
        </motion.div>

        {/* ПЬЕДЕСТАЛ */}
        <div className="mb-16">
          <div className="flex items-end justify-center gap-3 md:gap-6">
            {podiumOrder.map((player, index) => {
              if (!player) return null;
              const position = podiumPositions[index];
              const isFirst = position === 1;

              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2, duration: 0.6 }}
                  className={`flex-1 flex flex-col items-center text-center ${isFirst ? '-mt-8 md:-mt-12' : ''}`}
                >
                  {/* Аватар */}
                  <div className={`relative mb-3 ${isFirst ? 'w-24 h-24' : 'w-16 h-16'}`}>
                    {/* Crown */}
                    {(player as any).has_crown && isFirst && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
                        <Crown size={20} className="text-yellow-400 drop-shadow-lg" />
                      </div>
                    )}
                    {/* Avatar Effects */}
                    {(player as any).avatar_effect === 'sparkles' && (
                      <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-yellow-400/30 via-pink-400/30 to-purple-400/30 animate-pulse z-0" />
                    )}
                    {/* Frame */}
                    {(player as any).avatar_frame === 'frame-gold' && (
                      <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-500 z-0" />
                    )}
                    {(player as any).avatar_frame === 'frame-silver' && (
                      <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-gray-300 via-gray-400 to-slate-400 z-0" />
                    )}
                    {(player as any).avatar_frame === 'frame-bronze' && (
                      <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-amber-600 via-amber-700 to-orange-800 z-0" />
                    )}
                    <div className={`w-full h-full rounded-full overflow-hidden border-4 ${
                      (player as any).avatar_frame === 'frame-gold' ? 'border-yellow-400' :
                      (player as any).avatar_frame === 'frame-silver' ? 'border-gray-300' :
                      (player as any).avatar_frame === 'frame-bronze' ? 'border-amber-700' :
                      borderColors[index]
                    } bg-gradient-to-br from-mushroom-neon/30 to-mushroom-purple/30 flex items-center justify-center relative z-10`}>
                      {(player as any).custom_avatar_url ? (
                        <img src={(player as any).custom_avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className={isFirst ? 'text-4xl' : 'text-2xl'}>
                          {player.avatar_url ? '👤' : ['🥈', '🥇', '🥉'][index]}
                        </span>
                      )}
                    </div>
                    {isFirst && !((player as any).has_crown) && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <Crown size={28} className="text-yellow-400 drop-shadow-lg" />
                      </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 z-20 ${isFirst ? 'w-8 h-8' : 'w-6 h-6'} rounded-full bg-gradient-to-br ${podiumColors[index]} flex items-center justify-center text-black font-bold ${isFirst ? 'text-sm' : 'text-xs'} shadow-lg`}>
                      #{position}
                    </div>
                  </div>

                  {/* Имя */}
                  <Link
                    to={`/profile/${player.id}`}
                    className={`font-bold mb-1 hover:text-mushroom-neon transition-colors ${isFirst ? 'text-2xl' : 'text-sm md:text-base'}`}
                  >
                    {player.username}
                  </Link>

                  {/* Статистика */}
                  <div className={`flex items-center gap-2 mb-2 text-xs ${isFirst ? 'text-sm' : ''}`}>
                    <Sprout size={isFirst ? 16 : 12} className="text-mushroom-neon" />
                    <span className="font-bold">{player.mushrooms} 🍄</span>
                  </div>
                  <p className={`text-gray-500 mb-3 ${isFirst ? 'text-sm' : 'text-xs'}`}>
                    Lvl {player.level} • {player.wins}🏆
                  </p>

                  {/* Пьедестал блок */}
                  <div
                    className={`w-full rounded-t-2xl bg-gradient-to-t ${podiumColors[index]} border-t-2 ${borderColors[index]} ${podiumHeights[index]} flex items-center justify-center shadow-lg`}
                  >
                    <span className={`font-black text-black/30 ${crownSizes[index]}`}>
                      {position}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Остальные игроки */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-6"
        >
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Medal size={20} className="text-gray-400" />
            Остальные игроки
          </h3>
          <div className="space-y-2">
            {restLeaders.length > 0 ? (
              restLeaders.map((player, index) => (
                <Link
                  key={player.id}
                  to={`/profile/${player.id}`}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-mushroom-neon/20 to-mushroom-purple/20 flex items-center justify-center font-bold text-mushroom-neon text-sm border border-white/10">
                      {index + 4}
                    </div>
                    <div>
                      <p className="font-bold hover:text-mushroom-neon transition-colors">{player.username}</p>
                      <p className="text-xs text-gray-400">Уровень {player.level} • {player.wins}/{player.games_played} побед</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-mushroom-neon">{player.mushrooms} 🍄</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-gray-400 text-center py-8">Пока нет других игроков</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Leaderboard;

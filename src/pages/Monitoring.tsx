import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, MessageSquare, Mic, Hash, Volume2, Folder,
  RefreshCw, Radio, Crown, Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { logger } from '../lib/logger';
import { getCached, setCached } from '../lib/cache';

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  position: number;
  parent_id: string | null;
  is_private?: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface ServerInfo {
  name: string;
  memberCount: number;
  approximatePresenceCount: number;
  approximateMemberCount: number;
  channels: Channel[];
  categories: Category[];
  icon: string | null;
  verificationLevel: number;
}

interface TopPlayer {
  id: string;
  username: string;
  mushrooms: number;
  level: number;
  games_played: number;
}

interface MonitoringCache {
  serverInfo: ServerInfo | null;
  topPlayers: TopPlayer[];
  totalUsers: number;
  totalGames: number;
}

const Monitoring = () => {
  const { loading: authLoading, permissions } = useAuth();
  const cachedData = getCached<MonitoringCache>('monitoring');
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(cachedData?.serverInfo ?? null);
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>(cachedData?.topPlayers ?? []);
  const [totalUsers, setTotalUsers] = useState(cachedData?.totalUsers ?? 0);
  const [totalGames, setTotalGames] = useState(cachedData?.totalGames ?? 0);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = permissions?.isAdmin;
  const isEventMaker = permissions?.isEventMaker;
  const isSpecial = permissions?.isSpecial;
  const hasAdminAccess = isAdmin || isEventMaker || isSpecial;

  // Фильтрация приватных каналов (видны только админам)
  const filterChannels = (channels: Channel[]) => {
    if (hasAdminAccess) return channels;
    return channels.filter(ch => !ch.is_private);
  };

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);

    try {
      // Server info from Edge Function
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, '')}/functions/v1/get-server-info`;
      const serverRes = await fetch(apiUrl);
      let info: ServerInfo | null = serverInfo;
      if (serverRes.ok) {
        const data = await serverRes.json();
        setServerInfo(data);
        info = data;
      }

      // Stats from Supabase
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      const newTotalUsers = usersCount || 0;
      setTotalUsers(newTotalUsers);

      const { count: gamesCount } = await supabase
        .from('games')
        .select('*', { count: 'exact', head: true });
      const newTotalGames = gamesCount || 0;
      setTotalGames(newTotalGames);

      const { data: players } = await supabase
        .from('users')
        .select('id, username, mushrooms, level, games_played')
        .order('mushrooms', { ascending: false })
        .limit(10);
      const newPlayers = players || [];
      setTopPlayers(newPlayers);

      // Cache everything
      setCached('monitoring', {
        serverInfo: info,
        topPlayers: newPlayers,
        totalUsers: newTotalUsers,
        totalGames: newTotalGames,
      });
    } catch (e) {
      logger.error('Fetch error:', e);
    }

    if (isRefresh) setRefreshing(false);
  };

  useEffect(() => {
    if (!authLoading) {
      const controller = new AbortController();
      const initFetch = async () => {
        try {
          const apiUrl = `${import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, '')}/functions/v1/get-server-info`;
          const serverRes = await fetch(apiUrl, { signal: controller.signal });
          if (serverRes.ok) {
            const data = await serverRes.json();
            setServerInfo(data);
          }

          const { count: usersCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
          setTotalUsers(usersCount || 0);

          const { count: gamesCount } = await supabase
            .from('games')
            .select('*', { count: 'exact', head: true });
          setTotalGames(gamesCount || 0);

          const { data: players } = await supabase
            .from('users')
            .select('id, username, mushrooms, level, games_played')
            .order('mushrooms', { ascending: false })
            .limit(10);
          setTopPlayers(players || []);
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          logger.error('Fetch error:', e);
        }
      };
      initFetch();
      return () => controller.abort();
    }
  }, [authLoading]);

  // Auto-refresh каждые 60 секунд
  useEffect(() => {
    const controller = new AbortController();

    const fetchDataWithAbort = async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);

      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, '')}/functions/v1/get-server-info`;
        const serverRes = await fetch(apiUrl, { signal: controller.signal });
        if (serverRes.ok) {
          const data = await serverRes.json();
          setServerInfo(data);
        }

        const { count: usersCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
        setTotalUsers(usersCount || 0);

        const { count: gamesCount } = await supabase
          .from('games')
          .select('*', { count: 'exact', head: true });
        setTotalGames(gamesCount || 0);

        const { data: players } = await supabase
          .from('users')
          .select('id, username, mushrooms, level, games_played')
          .order('mushrooms', { ascending: false })
          .limit(10);
        setTopPlayers(players || []);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        logger.error('Fetch error:', e);
      }

      if (isRefresh) setRefreshing(false);
    };

    fetchDataWithAbort();
    const interval = setInterval(() => fetchDataWithAbort(true), 60000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Без категории';
    const cat = serverInfo?.categories.find(c => c.id === categoryId);
    return cat ? cat.name : 'Без категории';
  };

  if (authLoading) return null;

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-5xl font-bold gradient-text mb-2">📡 Мониторинг</h1>
            <p className="text-gray-400">
              {serverInfo?.name || 'Сервер'} • Обновлено только что
            </p>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={refreshing ? 'animate-spin' : ''} size={18} />
            Обновить
          </button>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 text-center"
          >
            <Users className="mx-auto text-blue-400 mb-3" size={32} />
            <p className="text-3xl font-bold text-blue-400">
              {serverInfo?.approximateMemberCount?.toLocaleString() || '—'}
            </p>
            <p className="text-sm text-gray-400">Всего участников</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 }}
            className="glass-card p-6 text-center"
          >
            <Radio className="mx-auto text-green-400 mb-3" size={32} />
            <p className="text-3xl font-bold text-green-400">
              {serverInfo?.approximatePresenceCount?.toLocaleString() || '—'}
            </p>
            <p className="text-sm text-gray-400">Онлайн</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 text-center"
          >
            <Hash className="mx-auto text-purple-400 mb-3" size={32} />
            <p className="text-3xl font-bold text-purple-400">
              {filterChannels(serverInfo?.channels || []).filter(c => c.type === 'text').length || 0}
            </p>
            <p className="text-sm text-gray-400">Текстовых каналов</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="glass-card p-6 text-center"
          >
            <Mic className="mx-auto text-yellow-400 mb-3" size={32} />
            <p className="text-3xl font-bold text-yellow-400">
              {filterChannels(serverInfo?.channels || []).filter(c => c.type === 'voice').length || 0}
            </p>
            <p className="text-sm text-gray-400">Голосовых каналов</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Channels List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6"
          >
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Folder className="text-mushroom-neon" size={20} />
              Каналы сервера
            </h3>

            {serverInfo?.channels && serverInfo.channels.length > 0 ? (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {/* Group by category */}
                {Object.entries(
                  filterChannels(serverInfo.channels).reduce((acc, ch) => {
                    const cat = getCategoryName(ch.parent_id);
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(ch);
                    return acc;
                  }, {} as { [key: string]: Channel[] })
                ).map(([catName, chs]) => (
                  <div key={catName}>
                    <p className="text-sm text-gray-500 uppercase tracking-wider mb-2 font-bold">
                      {catName}
                    </p>
                    <div className="space-y-1">
                      {chs.sort((a, b) => a.position - b.position).map(ch => (
                        <div
                          key={ch.id}
                          className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          {ch.type === 'text' ? (
                            <MessageSquare className="text-gray-500 flex-shrink-0" size={18} />
                          ) : (
                            <Volume2 className="text-gray-500 flex-shrink-0" size={18} />
                          )}
                          <span className="text-gray-300">{ch.name}</span>
                          {ch.type === 'voice' && (
                            <span className="ml-auto text-xs text-gray-500">Голосовой</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Не удалось загрузить каналы</p>
            )}
          </motion.div>

          {/* Top Players */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6"
          >
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Crown className="text-yellow-400" size={20} />
              Топ игроков
            </h3>

            <div className="space-y-3 mb-6">
              {topPlayers.length > 0 ? (
                topPlayers.slice(0, 5).map((player, i) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-black ${
                        i === 0 ? 'bg-yellow-400' :
                        i === 1 ? 'bg-gray-400' :
                        i === 2 ? 'bg-orange-400' :
                        'bg-gray-600'
                      }`}>
                        #{i + 1}
                      </div>
                      <div>
                        <p className="font-bold">{player.username}</p>
                        <p className="text-xs text-gray-400">Lvl {player.level} • {player.games_played} игр</p>
                      </div>
                    </div>
                    <span className="text-mushroom-neon font-bold">{player.mushrooms} 🍄</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">Пока нет данных</p>
              )}
            </div>

            {/* Site Stats */}
            <div className="border-t border-white/10 pt-6 space-y-3">
              <h4 className="font-bold text-gray-300 flex items-center gap-2">
                <Zap className="text-mushroom-neon" size={16} />
                Статистика сайта
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-sm text-gray-400">Зарегистрировано</p>
                  <p className="text-xl font-bold text-mushroom-neon">{totalUsers}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-sm text-gray-400">Сыграно игр</p>
                  <p className="text-xl font-bold text-mushroom-neon">{totalGames}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Monitoring;

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, AlertCircle, Trophy, Ticket, Activity, TrendingUp, Zap, Clock, Star, Gamepad2, DollarSign, ArrowUp, ArrowDown, Loader2, Calendar, MessageSquare, ShoppingCart, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OverviewTabProps {
  stats: {
    users: number;
    games: number;
    warnings: number;
    tickets: number;
  };
}

interface DashboardStats {
  totalUsers: number;
  totalGames: number;
  totalWarnings: number;
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  totalRevenue: number;
  totalSales: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  activeUsers: number;
  bannedUsers: number;
}

const OverviewTab = ({ stats }: OverviewTabProps) => {
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalGames: 0,
    totalWarnings: 0,
    totalTickets: 0,
    openTickets: 0,
    closedTickets: 0,
    totalRevenue: 0,
    totalSales: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
    activeUsers: 0,
    bannedUsers: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const [
        usersCount,
        gamesCount,
        warningsCount,
        ticketsCount,
        openTicketsCount,
        closedTicketsCount,
        newUsersWeek,
        newUsersMonth,
        bannedUsers,
        recentUsers,
        recentWarnings,
        recentTickets
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('games').select('*', { count: 'exact', head: true }),
        supabase.from('warnings').select('*', { count: 'exact', head: true }),
        supabase.from('tickets').select('*', { count: 'exact', head: true }),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'closed'),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', monthAgo.toISOString()),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_banned', true),
        supabase.from('users').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('warnings').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(5),
      ]);

      setDashboardStats({
        totalUsers: usersCount.count || 0,
        totalGames: gamesCount.count || 0,
        totalWarnings: warningsCount.count || 0,
        totalTickets: ticketsCount.count || 0,
        openTickets: openTicketsCount.count || 0,
        closedTickets: closedTicketsCount.count || 0,
        totalRevenue: 0,
        totalSales: 0,
        newUsersThisWeek: newUsersWeek.count || 0,
        newUsersThisMonth: newUsersMonth.count || 0,
        activeUsers: (usersCount.count || 0) - (bannedUsers.count || 0),
        bannedUsers: bannedUsers.count || 0,
      });

      const activities = [
        ...(recentUsers.data || []).map((u: any) => ({
          type: 'user',
          action: 'new_user',
          user: u.username,
          time: u.created_at,
          icon: Users,
          color: 'blue'
        })),
        ...(recentWarnings.data || []).map((w: any) => ({
          type: 'warning',
          action: 'new_warning',
          user: w.user_id,
          time: w.created_at,
          icon: AlertCircle,
          color: 'red'
        })),
        ...(recentTickets.data || []).map((t: any) => ({
          type: 'ticket',
          action: t.status,
          user: t.user_id,
          time: t.created_at,
          icon: Ticket,
          color: t.status === 'open' ? 'green' : 'gray'
        }))
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);

      setRecentActivity(activities);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    return `${days} дн назад`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  const statCards = [
    { icon: Users, label: 'Всего игроков', value: dashboardStats.totalUsers, color: 'blue', change: dashboardStats.newUsersThisWeek, suffix: 'за неделю' },
    { icon: AlertCircle, label: 'Варнов', value: dashboardStats.totalWarnings, color: 'red', change: null },
    { icon: Ticket, label: 'Тикетов', value: dashboardStats.totalTickets, color: 'purple', open: dashboardStats.openTickets },
    { icon: Trophy, label: 'Игр сыграно', value: dashboardStats.totalGames, color: 'yellow', change: null },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Обзор панели</h2>
          <p className="text-gray-400">Реаль-time статистика сервера</p>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          Обновить
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="relative overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-2xl border border-gray-700/50 hover:border-gray-600 transition-all group">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500/10 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500`} />
            <div className={`w-12 h-12 rounded-xl bg-${stat.color}-500/20 flex items-center justify-center mb-3`}>
              <stat.icon className={`text-${stat.color}-400`} size={24} />
            </div>
            <p className="text-3xl font-bold text-white mb-1">{stat.value.toLocaleString('ru')}</p>
            <p className="text-gray-400 text-sm">{stat.label}</p>
            {stat.change !== null && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${stat.change > 0 ? 'text-green-400' : stat.change < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                {stat.change > 0 ? <ArrowUp size={12} /> : stat.change < 0 ? <ArrowDown size={12} /> : null}
                {stat.change > 0 ? `+${stat.change}` : stat.change} {stat.suffix}
              </div>
            )}
            {stat.open !== undefined && (
              <div className="flex items-center gap-1 mt-2 text-xs text-green-400">
                <MessageSquare size={12} />
                {stat.open} открыто
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl border border-gray-700/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Activity className="text-green-400" size={20} />
              </div>
              <h3 className="text-lg font-bold">Активность</h3>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Users className="text-blue-400" size={18} />
                <span className="text-gray-300">Активных игроков</span>
              </div>
              <span className="font-bold text-white">{dashboardStats.activeUsers}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Calendar className="text-green-400" size={18} />
                <span className="text-gray-300">Новых за неделю</span>
              </div>
              <span className="font-bold text-green-400">+{dashboardStats.newUsersThisWeek}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Calendar className="text-purple-400" size={18} />
                <span className="text-gray-300">Новых за месяц</span>
              </div>
              <span className="font-bold text-purple-400">+{dashboardStats.newUsersThisMonth}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Users className="text-red-400" size={18} />
                <span className="text-gray-300">Заблокировано</span>
              </div>
              <span className="font-bold text-red-400">{dashboardStats.bannedUsers}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl border border-gray-700/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <TrendingUp className="text-cyan-400" size={20} />
              </div>
              <h3 className="text-lg font-bold">Тикеты</h3>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <MessageSquare className="text-green-400" size={18} />
                <span className="text-gray-300">Открытых</span>
              </div>
              <span className="font-bold text-green-400">{dashboardStats.openTickets}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <MessageSquare className="text-gray-400" size={18} />
                <span className="text-gray-300">Закрытых</span>
              </div>
              <span className="font-bold text-gray-400">{dashboardStats.closedTickets}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Ticket className="text-purple-400" size={18} />
                <span className="text-gray-300">Всего тикетов</span>
              </div>
              <span className="font-bold text-white">{dashboardStats.totalTickets}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-red-400" size={18} />
                <span className="text-gray-300">Всего варнов</span>
              </div>
              <span className="font-bold text-red-400">{dashboardStats.totalWarnings}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Clock className="text-purple-400" size={20} />
            </div>
            <h3 className="text-lg font-bold">Последняя активность</h3>
          </div>
        </div>
        <div className="space-y-2">
          {recentActivity.length > 0 ? recentActivity.map((activity, i) => (
            <div key={i} className="flex items-center gap-4 p-3 bg-gray-800/30 rounded-xl hover:bg-gray-800/50 transition-colors">
              <div className={`w-8 h-8 rounded-lg bg-${activity.color}-500/20 flex items-center justify-center`}>
                <activity.icon className={`text-${activity.color}-400`} size={16} />
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  {activity.type === 'user' && 'Новый пользователь'}
                  {activity.type === 'warning' && 'Выдан варн'}
                  {activity.type === 'ticket' && activity.action === 'open' && 'Создан тикет'}
                  {activity.type === 'ticket' && activity.action === 'closed' && 'Закрыт тикет'}
                  {' '}<span className="text-white font-medium">{activity.user?.slice(0, 8) || 'Unknown'}</span>
                </p>
              </div>
              <span className="text-gray-500 text-sm">{formatTimeAgo(activity.time)}</span>
            </div>
          )) : (
            <div className="text-center py-8 text-gray-500">
              <Activity size={32} className="mx-auto mb-2 opacity-50" />
              <p>Пока нет активности</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-900/20 to-gray-900 p-6 rounded-2xl border border-purple-500/20">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="text-purple-400" size={24} />
          <h3 className="text-lg font-bold">Быстрые действия</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Создать ивент', icon: Star, color: 'yellow', href: '/events' },
            { label: 'Выдать варн', icon: AlertCircle, color: 'red', href: '/admin?tab=warnings' },
            { label: 'Новый тикет', icon: Ticket, color: 'purple', href: '/tickets' },
            { label: 'Все игроки', icon: Users, color: 'blue', href: '/admin?tab=users' },
          ].map((action, i) => (
            <a 
              key={i}
              href={action.href}
              className="flex items-center gap-2 p-3 bg-gray-800/50 hover:bg-purple-600/20 rounded-xl transition-colors group"
            >
              <action.icon className={`text-${action.color}-400 group-hover:scale-110 transition-transform`} size={18} />
              <span className="text-sm text-gray-300 group-hover:text-white">{action.label}</span>
            </a>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default OverviewTab;
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Ban, Search, Filter, MoreVertical, UserCheck, UserX, MessageSquare, Gift, Crown, Zap, Loader2, X, Save, Trash2, Download, ChevronLeft, ChevronRight, RefreshCw, AlertCircle, CheckCircle, Clock, ArrowUpDown, ArrowUp, ArrowDown, Minus, Plus, Coins, Shield, Sparkles, Sprout } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface User {
  id: string;
  username: string;
  discord_id: string | null;
  discord_level: number;
  mushrooms: number;
  is_vip: boolean;
  is_verified: boolean;
  is_banned: boolean;
  discord_roles: string[];
  created_at: string;
  updated_at?: string;
  rainbow_color1?: string;
  rainbow_color2?: string;
  avatar_frame?: string;
}

const UsersTab = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'username' | 'mushrooms' | 'level' | 'created_at' | 'vip' | 'verified'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [giftAmount, setGiftAmount] = useState(100);
  const [giftType, setGiftType] = useState<'mushrooms' | 'vip' | 'level'>('mushrooms');
  const [giftMode, setGiftMode] = useState<'add' | 'remove'>('add');
  const [banReason, setBanReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showVIPModal, setShowVIPModal] = useState(false);
  const [vipDuration, setVipDuration] = useState(30);

  const pageSize = 20;

  useEffect(() => {
    fetchUsers();
  }, [search, filter, sortBy, sortOrder, page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase.from('users').select('*', { count: 'exact' });

      if (search) {
        query = query.ilike('username', `%${search}%`);
      }

      if (filter === 'vip') {
        query = query.eq('is_vip', true);
      } else if (filter === 'verified') {
        query = query.eq('is_verified', true);
      } else if (filter === 'banned') {
        query = query.eq('is_banned', true);
      } else if (filter === 'active') {
        query = query.eq('is_banned', false);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let orderColumn = sortBy;
      if (sortBy === 'level') orderColumn = 'discord_level';
      if (sortBy === 'vip') orderColumn = 'is_vip';
      if (sortBy === 'verified') orderColumn = 'is_verified';

      const { data, count, error } = await query
        .order(orderColumn as any, { ascending: sortOrder === 'asc', nullsFirst: false })
        .range(from, to);

      if (error) throw error;
      setUsers(data || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    }
    setLoading(false);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const getLevelColor = (level: number) => {
    if (level >= 50) return 'text-red-400';
    if (level >= 30) return 'text-orange-400';
    if (level >= 15) return 'text-yellow-400';
    return 'text-gray-400';
  };

  // 🔥 Обновление пользователя в БД + синхронизация с Discord
  const syncUserWithDiscord = async (userId: string, updates: Partial<User>) => {
    try {
      // 1. Обновляем в БД
      await supabase.from('users').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', userId);

      // 2. Если меняли VIP — синхронизируем с Discord через бота
      if (updates.is_vip !== undefined) {
        const user = users.find(u => u.id === userId);
        if (user?.discord_id) {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/discord-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: updates.is_vip ? 'give_vip' : 'revoke_vip',
              discordId: user.discord_id,
              username: user.username,
              durationDays: updates.is_vip ? vipDuration : 0,
            }),
          });
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await syncUserWithDiscord(editingUser.id, {
        username: editingUser.username,
        discord_level: editingUser.discord_level,
        is_vip: editingUser.is_vip,
        is_verified: editingUser.is_verified,
      });
      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert('Ошибка: ' + error.message);
    }
    setSaving(false);
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const newBannedStatus = !selectedUser.is_banned;
      
      // 1. Обновляем в БД
      await supabase.from('users').update({
        is_banned: newBannedStatus,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedUser.id);

      // 2. Синхронизация с Discord
      if (selectedUser?.discord_id) {
        try {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/discord-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: newBannedStatus ? 'ban_user' : 'unban_user',
              discordId: selectedUser.discord_id,
              username: selectedUser.username,
            }),
          });
        } catch (discordError) {
          console.error('Discord sync error:', discordError);
        }
      }

      setShowBanModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error banning user:', error);
      alert('Ошибка: ' + error.message);
    }
    setSaving(false);
  };

  // 🔥 Универсальная функция выдачи/отнятия ресурсов
  const handleGift = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const updates: Partial<User> = { updated_at: new Date().toISOString() };

      if (giftType === 'mushrooms') {
        const newAmount = giftMode === 'add'
          ? (selectedUser.mushrooms || 0) + giftAmount
          : Math.max(0, (selectedUser.mushrooms || 0) - giftAmount);
        updates.mushrooms = newAmount;
      }

      if (giftType === 'vip') {
        updates.is_vip = giftMode === 'add';
      }

      if (giftType === 'level') {
        const newLevel = giftMode === 'add'
          ? (selectedUser.discord_level || 1) + giftAmount
          : Math.max(1, (selectedUser.discord_level || 1) - giftAmount);
        updates.discord_level = newLevel;
      }

      await syncUserWithDiscord(selectedUser.id, updates);

      setShowGiftModal(false);
      setSelectedUser(null);
      setGiftAmount(100);
      setGiftMode('add');
      fetchUsers();
    } catch (error: any) {
      console.error('Error gifting:', error);
      alert('Ошибка: ' + error.message);
    }
    setSaving(false);
  };

  // 🔥 Быстрое переключение VIP (для админов)
  const toggleVIP = async (user: User) => {
    setActionLoading(user.id);
    try {
      await syncUserWithDiscord(user.id, { is_vip: !user.is_vip });
      fetchUsers();
    } catch (error: any) {
      console.error('Error toggling VIP:', error);
      alert('Ошибка: ' + error.message);
    }
    setActionLoading(null);
  };

  const handleExport = async () => {
    try {
      const { data } = await supabase.from('users').select('*');
      if (!data) return;

      const csv = [
        ['ID', 'Username', 'Discord ID', 'Level', 'Mushrooms', 'VIP', 'Verified', 'Banned', 'Created'],
        ...data.map(u => [
          u.id,
          u.username,
          u.discord_id || '',
          u.discord_level || 1,
          u.mushrooms || 0,
          u.is_vip ? 'Yes' : 'No',
          u.is_verified ? 'Yes' : 'No',
          u.is_banned ? 'Yes' : 'No',
          u.created_at
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const sortOptions = [
    { id: 'created_at', label: 'Дата регистрации', icon: Clock },
    { id: 'username', label: 'Никнейм', icon: ArrowUpDown },
    { id: 'mushrooms', label: 'Грибы', icon: Coins },
    { id: 'level', label: 'Уровень', icon: Zap },
    { id: 'vip', label: 'VIP статус', icon: Crown },
    { id: 'verified', label: 'Верификация', icon: UserCheck },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* === ФИЛЬТРЫ И ПОИСК === */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Поиск по нику..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
        
        {/* Фильтры */}
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'all', label: 'Все' },
            { id: 'active', label: 'Активные' },
            { id: 'banned', label: 'Заблокированные' },
            { id: 'vip', label: 'VIP 👑' },
            { id: 'verified', label: 'Верифицированные ✓' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); setPage(1); }}
              className={`px-4 py-2 rounded-xl transition-colors ${
                filter === f.id 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Сортировка */}
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-gray-800 border border-gray-700 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:border-purple-500"
          >
            {sortOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
            title={sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}
          >
            {sortOrder === 'asc' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
          </button>
        </div>

        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors text-gray-400"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* === ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ === */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800/50">
                <th className="px-4 py-4 text-left text-gray-400 font-medium text-sm">Игрок</th>
                <th className="px-4 py-4 text-left text-gray-400 font-medium text-sm cursor-pointer hover:text-white" onClick={() => { setSortBy('level'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>
                  Уровень {sortBy === 'level' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-4 text-left text-gray-400 font-medium text-sm cursor-pointer hover:text-white" onClick={() => { setSortBy('mushrooms'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>
                  Грибы {sortBy === 'mushrooms' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-4 text-left text-gray-400 font-medium text-sm">Статус</th>
                <th className="px-4 py-4 text-left text-gray-400 font-medium text-sm">Покупки</th>
                <th className="px-4 py-4 text-left text-gray-400 font-medium text-sm">Дата</th>
                <th className="px-4 py-4 text-left text-gray-400 font-medium text-sm">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <Loader2 className="animate-spin text-purple-500 mx-auto" size={32} />
                  </td>
                </tr>
              ) : (
                users.map((u, i) => (
                  <motion.tr 
                    key={u.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-t border-gray-700/50 hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                          {u.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-white flex items-center gap-2">
                            {u.username}
                            {/* 🔥 VIP иконка — загорается когда is_vip = true */}
                            {u.is_vip && <Crown size={14} className="text-yellow-400 animate-pulse" />}
                            {u.is_verified && <UserCheck size={14} className="text-green-400" />}
                            {u.avatar_frame && <Sparkles size={14} className="text-purple-400" />}
                          </p>
                          <p className="text-xs text-gray-500">ID: {u.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Zap size={16} className={getLevelColor(u.discord_level || 1)} />
                        <span className={`font-bold ${getLevelColor(u.discord_level || 1)}`}>
                          {u.discord_level || 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-mushroom-neon font-bold">🍄{u.mushrooms?.toLocaleString('ru') || 0}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        u.is_banned 
                          ? 'bg-red-500/20 text-red-400' 
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {u.is_banned ? '🚫 Заблокирован' : '✓ Активен'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {u.is_vip && <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs">VIP</span>}
                        {u.avatar_frame === 'frame-bronze' && <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 text-xs">🥉</span>}
                        {u.avatar_frame === 'frame-silver' && <span className="px-2 py-0.5 rounded bg-gray-400/20 text-gray-300 text-xs">🥈</span>}
                        {u.avatar_frame === 'frame-gold' && <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs">🥇</span>}
                        {u.rainbow_color1 && <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-400 text-xs">🎨</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-400 text-sm">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('ru') : '-'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => { setEditingUser({ ...u }); setShowEditModal(true); }}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
                          title="Редактировать"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => { setSelectedUser(u); setShowGiftModal(true); }}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-yellow-400"
                          title="Выдать/Отнять"
                        >
                          <Gift size={16} />
                        </button>
                        {/* 🔥 Быстрое переключение VIP */}
                        <button 
                          onClick={() => toggleVIP(u)}
                          disabled={actionLoading === u.id}
                          className={`p-2 hover:bg-gray-700 rounded-lg transition-colors ${u.is_vip ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-400 hover:text-yellow-400'}`}
                          title={u.is_vip ? 'Забрать VIP' : 'Выдать VIP'}
                        >
                          {actionLoading === u.id ? <Loader2 size={16} className="animate-spin" /> : <Crown size={16} />}
                        </button>
                        <button 
                          onClick={() => { setSelectedUser(u); setShowBanModal(true); }}
                          className={`p-2 hover:bg-gray-700 rounded-lg transition-colors ${u.is_banned ? 'text-green-400 hover:text-white' : 'text-gray-400 hover:text-red-400'}`}
                          title={u.is_banned ? 'Разблокировать' : 'Заблокировать'}
                        >
                          {u.is_banned ? <UserX size={16} /> : <Ban size={16} />}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Пагинация */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-800/50 flex items-center justify-between">
            <span className="text-gray-400 text-sm">
              Страница {page} из {totalPages} ({totalCount} пользователей)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {users.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <UserX size={48} className="mx-auto mb-4 opacity-50" />
          <p>Пользователи не найдены</p>
        </div>
      )}

      {/* === МОДАЛКА: РЕДАКТИРОВАНИЕ === */}
      <AnimatePresence>
        {showEditModal && editingUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Редактирование игрока</h3>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm">Никнейм</label>
                  <input
                    type="text"
                    value={editingUser.username}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Уровень</label>
                  <input
                    type="number"
                    min="1"
                    value={editingUser.discord_level || 1}
                    onChange={(e) => setEditingUser({ ...editingUser, discord_level: parseInt(e.target.value) || 1 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Грибы</label>
                  <input
                    type="number"
                    min="0"
                    value={editingUser.mushrooms || 0}
                    onChange={(e) => setEditingUser({ ...editingUser, mushrooms: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                  />
                </div>

                {/* 🔥 Переключатели статусов */}
                <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Crown size={18} className="text-yellow-400" />
                    <span>VIP статус</span>
                  </div>
                  <button
                    onClick={() => setEditingUser({ ...editingUser, is_vip: !editingUser.is_vip })}
                    className={`w-12 h-6 rounded-full transition-colors ${editingUser.is_vip ? 'bg-yellow-500' : 'bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${editingUser.is_vip ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <UserCheck size={18} className="text-green-400" />
                    <span>Верификация</span>
                  </div>
                  <button
                    onClick={() => setEditingUser({ ...editingUser, is_verified: !editingUser.is_verified })}
                    className={`w-12 h-6 rounded-full transition-colors ${editingUser.is_verified ? 'bg-green-500' : 'bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${editingUser.is_verified ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Ban size={18} className="text-red-400" />
                    <span>Забанен</span>
                  </div>
                  <button
                    onClick={() => setEditingUser({ ...editingUser, is_banned: !editingUser.is_banned })}
                    className={`w-12 h-6 rounded-full transition-colors ${editingUser.is_banned ? 'bg-red-500' : 'bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${editingUser.is_banned ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <div className="p-3 bg-gray-700/30 rounded-xl">
                  <p className="text-gray-400 text-sm mb-1">Discord ID</p>
                  <p className="font-mono text-sm">{editingUser.discord_id || 'Не привязан'}</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleEditUser}
                  disabled={saving}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Сохранить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* === МОДАЛКА: ВЫДАЧА/ОТНЯТИЕ === */}
        {showGiftModal && selectedUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Выдать / Отнять</h3>
                <button onClick={() => setShowGiftModal(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                  {selectedUser.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-bold">{selectedUser.username}</p>
                  <p className="text-gray-400 text-sm">🍄{selectedUser.mushrooms?.toLocaleString('ru') || 0} • Lvl {selectedUser.discord_level || 1}</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Тип ресурса */}
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Что изменить</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setGiftType('mushrooms')}
                      className={`p-3 rounded-xl transition-colors flex flex-col items-center gap-1 ${giftType === 'mushrooms' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                    >
                      <Coins size={20} />
                      <span className="text-xs">Грибы</span>
                    </button>
                    <button
                      onClick={() => setGiftType('vip')}
                      className={`p-3 rounded-xl transition-colors flex flex-col items-center gap-1 ${giftType === 'vip' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                    >
                      <Crown size={20} />
                      <span className="text-xs">VIP</span>
                    </button>
                    <button
                      onClick={() => setGiftType('level')}
                      className={`p-3 rounded-xl transition-colors flex flex-col items-center gap-1 ${giftType === 'level' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                    >
                      <Zap size={20} />
                      <span className="text-xs">Уровень</span>
                    </button>
                  </div>
                </div>

                {/* Режим: дать или отнять */}
                <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                  <span className="text-gray-300">Режим</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setGiftMode('add')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${giftMode === 'add' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-400'}`}
                    >
                      <Plus size={16} />
                      Дать
                    </button>
                    <button
                      onClick={() => setGiftMode('remove')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${giftMode === 'remove' ? 'bg-red-600 text-white' : 'bg-gray-600 text-gray-400'}`}
                    >
                      <Minus size={16} />
                      Отнять
                    </button>
                  </div>
                </div>

                {/* Количество */}
                {giftType !== 'vip' && (
                  <div>
                    <label className="text-gray-400 text-sm">Количество</label>
                    <input
                      type="number"
                      min="1"
                      value={giftAmount}
                      onChange={(e) => setGiftAmount(Math.abs(parseInt(e.target.value) || 1))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                    />
                  </div>
                )}

                {/* Быстрые значения для грибов */}
                {giftType === 'mushrooms' && (
                  <div className="grid grid-cols-4 gap-2">
                    {[100, 500, 1000, 5000].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setGiftAmount(amount)}
                        className={`py-2 rounded-xl transition-colors ${giftAmount === amount ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                      >
                        {giftMode === 'add' ? '+' : '-'}{amount}
                      </button>
                    ))}
                  </div>
                )}

                {/* Длительность для VIP */}
                {giftType === 'vip' && (
                  <div>
                    <label className="text-gray-400 text-sm">Срок действия (дни)</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={vipDuration}
                      onChange={(e) => setVipDuration(parseInt(e.target.value) || 30)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                    />
                  </div>
                )}

                {/* Превью результата */}
                <div className="p-3 bg-gray-700/30 rounded-xl">
                  <p className="text-gray-400 text-sm">Результат:</p>
                  {giftType === 'mushrooms' && (
                    <p className={`text-lg font-bold ${giftMode === 'add' ? 'text-green-400' : 'text-red-400'}`}>
                      {giftMode === 'add' ? '+' : '-'}{giftAmount} 🍄 → {giftMode === 'add' ? (selectedUser.mushrooms || 0) + giftAmount : Math.max(0, (selectedUser.mushrooms || 0) - giftAmount)}
                    </p>
                  )}
                  {giftType === 'vip' && (
                    <p className={`text-lg font-bold ${giftMode === 'add' ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {giftMode === 'add' ? `✓ Выдать VIP на ${vipDuration} дней` : '✗ Забрать VIP'}
                    </p>
                  )}
                  {giftType === 'level' && (
                    <p className={`text-lg font-bold ${giftMode === 'add' ? 'text-blue-400' : 'text-red-400'}`}>
                      {giftMode === 'add' ? '+' : '-'}{giftAmount} lvl → {giftMode === 'add' ? (selectedUser.discord_level || 1) + giftAmount : Math.max(1, (selectedUser.discord_level || 1) - giftAmount)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowGiftModal(false); setGiftMode('add'); }}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleGift}
                  disabled={saving || (giftType !== 'vip' && giftAmount <= 0)}
                  className={`flex-1 py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                    giftMode === 'add' 
                      ? giftType === 'vip' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : giftMode === 'add' ? <Plus size={20} /> : <Minus size={20} />}
                  {giftMode === 'add' ? 'Выдать' : 'Отнять'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* === МОДАЛКА: БАН === */}
        {showBanModal && selectedUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedUser.is_banned ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  {selectedUser.is_banned ? <UserCheck className="text-green-400" size={24} /> : <Ban className="text-red-400" size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedUser.is_banned ? 'Разблокировать' : 'Заблокировать'}</h3>
                  <p className="text-gray-400">{selectedUser.username}</p>
                </div>
              </div>

              <p className="text-gray-400 mb-6">
                {selectedUser.is_banned 
                  ? 'Вы уверены, что хотите разблокировать этого пользователя?' 
                  : 'Вы уверены, что хотите заблокировать этого пользователя? Он не сможет войти на сайт.'}
              </p>

              {!selectedUser.is_banned && (
                <div className="mb-4">
                  <label className="text-gray-400 text-sm">Причина (опционально)</label>
                  <input
                    type="text"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Нарушение правил..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowBanModal(false)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleBanUser}
                  disabled={saving}
                  className={`flex-1 py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                    selectedUser.is_banned 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : selectedUser.is_banned ? <UserCheck size={20} /> : <Ban size={20} />}
                  {selectedUser.is_banned ? 'Разблокировать' : 'Заблокировать'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default UsersTab;
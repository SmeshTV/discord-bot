import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2, Search, Filter, Trash2, CheckCircle, XCircle, Clock, User, MessageSquare, Ban, Send, Shield, RefreshCw, Volume2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

const WarningsTab = () => {
  const { user: currentUser } = useAuth();
  const [warnings, setWarnings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [muteDays, setMuteDays] = useState(1);
  const [muting, setMuting] = useState(false);
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [showAddWarning, setShowAddWarning] = useState(false);
  const [newWarningReason, setNewWarningReason] = useState('');
  const [addingWarning, setAddingWarning] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, '')}/functions/v1`;

  // Live search users
  useEffect(() => {
    const searchUsers = async () => {
      if (userSearch.length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      const { data } = await supabase
        .from('users')
        .select('id, username, discord_id, is_banned')
        .ilike('username', `%${userSearch}%`)
        .limit(10);
      setSearchResults(data || []);
      setSearching(false);
    };
    const timeout = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeout);
  }, [userSearch]);

  const fetchWarnings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('warnings')
        .select('*')
        .order('created_at', { ascending: false });
      setWarnings(data || []);
      
      const userIds = [...new Set((data || []).map((w: any) => w.user_id))];
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .in('id', userIds);
        setUsers(usersData || []);
      }
    } catch (error) {
      console.error('Error fetching warnings:', error);
    }
    setLoading(false);
  };

  useEffect(() => { fetchWarnings(); }, []);

  const warningsByUser: { [key: string]: any[] } = {};
  warnings.forEach((w: any) => {
    if (!warningsByUser[w.user_id]) warningsByUser[w.user_id] = [];
    warningsByUser[w.user_id].push(w);
  });

  const usersWithWarnings = users.map(u => ({
    ...u,
    warningCount: warningsByUser[u.id]?.filter(w => w.status !== 'deleted')?.length || 0,
    userWarnings: warningsByUser[u.id]?.filter(w => w.status !== 'deleted') || []
  })).sort((a, b) => b.warningCount - a.warningCount);

  const filteredUsers = usersWithWarnings.filter(u => 
    u.username?.toLowerCase().includes(search.toLowerCase())
  );

  const usersWith3Plus = filteredUsers.filter(u => u.warningCount >= 3);
  const otherUsers = filteredUsers.filter(u => u.warningCount < 3);

  const getWarningCount = (userId: string) => {
    return warnings.filter(w => w.user_id === userId && w.status !== 'deleted').length;
  };

  // 🔥 ВЫДАЧА/СНЯТИЕ МУТА
  const handleMute = async () => {
    if (!selectedUser?.discord_id) {
      alert('❌ У пользователя нет привязанного Discord аккаунта');
      return;
    }
    
    setMuting(true);
    const warningCount = getWarningCount(selectedUser.id);
    
    try {
      // 1. Выдаём мут через Edge Function
      const muteResponse = await fetch(`${FUNCTIONS_URL}/apply-mute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId: selectedUser.discord_id,
          days: muteDays,
          action: 'add',
          warningIds: selectedUser.userWarnings?.map((w: any) => w.id) || []
        })
      });
      
      const muteResult = await muteResponse.json();
      
      if (!muteResult.success) {
        if (muteResult.error?.includes('hierarchy')) {
          throw new Error('Роль бота должна быть ВЫШЕ роли мута в настройках сервера');
        }
        if (muteResult.error?.includes('not found')) {
          throw new Error('Пользователь не найден на сервере Discord');
        }
        throw new Error(muteResult.error || 'Не удалось выдать мут');
      }
      
      // 2. Отправляем уведомление (не блокируем если не отправится)
      try {
        await fetch(`${FUNCTIONS_URL}/discord-notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'mute',
            discordId: selectedUser.discord_id,
            username: selectedUser.username,
            days: muteDays,
            reason: `${warningCount} предупреждений на сервере LOLA`
          }),
        });
      } catch (dmError) {
        console.warn('⚠️ Не удалось отправить уведомление в ЛС');
      }
      
      alert(`✅ Мут выдан на ${muteDays} дней!`);
      setShowMuteModal(false);
      setSelectedUser(null);
      fetchWarnings();
      
    } catch (error: any) {
      console.error('❌ Mute error:', error);
      alert('❌ Ошибка: ' + (error.message || 'Не удалось выдать мут'));
    }
    setMuting(false);
  };

  // 🔥 СНЯТИЕ МУТА
  const handleUnmute = async (user: any) => {
    if (!user.discord_id) {
      alert('❌ У пользователя нет привязанного Discord аккаунта');
      return;
    }
    
    if (!confirm(`Снять мут с ${user.username}?`)) return;
    
    setActionLoading(`unmute-${user.id}`);
    try {
      const response = await fetch(`${FUNCTIONS_URL}/apply-mute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId: user.discord_id,
          action: 'remove'
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Не удалось снять мут');
      }
      
      alert('✅ Мут снят!');
      fetchWarnings();
    } catch (error: any) {
      console.error('❌ Unmute error:', error);
      alert('❌ Ошибка: ' + error.message);
    }
    setActionLoading(null);
  };

  // 🔥 ВЫДАЧА ПРЕДУПРЕЖДЕНИЯ
  const handleAddWarning = async () => {
    if (!selectedUser || !newWarningReason.trim()) {
      alert('Заполните причину предупреждения');
      return;
    }
    
    setAddingWarning(true);
    const warningCount = getWarningCount(selectedUser.id);
    
    try {
      // 1. Сохраняем варн в БД
      const { error: dbError } = await supabase.from('warnings').insert({
        user_id: selectedUser.id,
        username: selectedUser.username,
        discord_id: selectedUser.discord_id,
        reason: newWarningReason.trim(),
        issued_by: currentUser?.username || 'admin',
        severity: 'medium',
        status: 'active',
        created_at: new Date().toISOString()
      });

      if (dbError) throw dbError;

      // 2. Отправляем уведомление (не критично если не отправится)
      if (selectedUser.discord_id) {
        try {
          await fetch(`${FUNCTIONS_URL}/discord-notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'warning',
              discordId: selectedUser.discord_id,
              username: selectedUser.username,
              reason: newWarningReason.trim(),
              totalWarnings: warningCount + 1,
            }),
          });
        } catch (dmError) {
          console.warn('⚠️ Не удалось отправить уведомление о варне');
        }
      }

      // 3. Если 3 варна — предупреждаем админа
      if (warningCount + 1 >= 3) {
        alert(`⚠️ У пользователя теперь 3 предупреждения!\nРекомендуется выдать мут.`);
      } else {
        alert('✅ Предупреждение выдано');
      }

      // 4. Сброс формы
      setNewWarningReason('');
      setShowAddWarning(false);
      setSelectedUser(null);
      setUserSearch('');
      setSearchResults([]);
      fetchWarnings();
      
    } catch (error: any) {
      console.error('❌ Warning error:', error);
      alert('❌ Ошибка: ' + (error.message || 'Не удалось выдать предупреждение'));
    }
    setAddingWarning(false);
  };

  // 🔥 УДАЛЕНИЕ ПРЕДУПРЕЖДЕНИЯ
  const handleRemoveWarning = async (warningId: string) => {
    if (!confirm('Удалить это предупреждение?')) return;
    
    try {
      await supabase.from('warnings').update({ status: 'deleted' }).eq('id', warningId);
      fetchWarnings();
    } catch (error: any) {
      console.error('❌ Delete warning error:', error);
      alert('❌ Ошибка: ' + error.message);
    }
  };

  // 🔥 СБРОС ВСЕХ ВАРНОВ ПОЛЬЗОВАТЕЛЯ
  const handleResetWarnings = async (user: any) => {
    if (!confirm(`Сбросить ВСЕ предупреждения у ${user.username}?`)) return;
    
    setActionLoading(`reset-${user.id}`);
    try {
      const { error } = await supabase
        .from('warnings')
        .update({ status: 'deleted', reviewed_by: currentUser?.username, reviewed_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .neq('status', 'deleted');
      
      if (error) throw error;
      
      alert('✅ Все предупреждения сброшены');
      fetchWarnings();
    } catch (error: any) {
      console.error('❌ Reset warnings error:', error);
      alert('❌ Ошибка: ' + error.message);
    }
    setActionLoading(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="animate-spin text-purple-500" size={40} />
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* === ФИЛЬТРЫ И ПОИСК === */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Поиск пользователя..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelectedUser(null); setShowAddWarning(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-xl transition-colors"
          >
            <AlertCircle size={18} />
            <span>Выдать варн</span>
          </button>
          <div className="px-4 py-2 bg-red-500/20 rounded-xl text-red-400 flex items-center gap-2">
            <AlertCircle size={18} />
            <span className="font-bold">{usersWith3Plus.length}</span>
            <span className="text-sm">требуют мута</span>
          </div>
        </div>
      </div>

      {/* === БЛОК: ТРЕБУЮТ МУТА (3+ варна) === */}
      <AnimatePresence>
        {usersWith3Plus.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gradient-to-br from-red-900/30 to-gray-900 rounded-2xl border-2 border-red-500/30 overflow-hidden"
          >
            <div className="bg-red-900/20 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Ban className="text-red-400" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-400">🚫 Требуют мута</h3>
                  <p className="text-sm text-red-400/70">Пользователи с 3+ варнами</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-red-500/20 rounded-full text-red-400 text-sm font-bold">
                {usersWith3Plus.length}
              </span>
            </div>
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {usersWith3Plus.map(u => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                      {u.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-bold text-white flex items-center gap-2">
                        {u.username}
                        {u.is_banned && <Ban size={14} className="text-red-400" />}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <AlertCircle size={14} className="text-red-400" />
                        <span className="text-red-400 font-bold">{u.warningCount} варнов</span>
                        {u.discord_id && (
                          <span className="text-xs text-gray-500">• Discord: {u.discord_id.slice(0, 10)}...</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setSelectedUser(u); setShowAddWarning(true); }}
                      className="p-2 hover:bg-yellow-500/20 rounded-lg transition-colors text-yellow-400 hover:text-yellow-300"
                      title="Добавить варн"
                    >
                      <AlertCircle size={18} />
                    </button>
                    {/* Индикаторы варнов */}
                    <div className="flex items-center gap-1">
                      {u.userWarnings.slice(0, 3).map((w: any, i: number) => (
                        <div key={i} className="w-3 h-3 rounded-full bg-red-500" title={w.reason} />
                      ))}
                      {u.userWarnings.length > 3 && (
                        <span className="text-xs text-red-400">+{u.userWarnings.length - 3}</span>
                      )}
                    </div>
                    {/* Кнопки действий */}
                    <button
                      onClick={() => { setSelectedUser(u); setShowMuteModal(true); }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl transition-colors text-sm"
                    >
                      <Ban size={16} />
                      Мут
                    </button>
                    <button
                      onClick={() => handleResetWarnings(u)}
                      disabled={actionLoading === `reset-${u.id}`}
                      className="p-2 hover:bg-gray-600 rounded-lg transition-colors text-gray-400"
                      title="Сбросить все варны"
                    >
                      {actionLoading === `reset-${u.id}` ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    </button>
                    <button
                      onClick={() => handleUnmute(u)}
                      disabled={actionLoading === `unmute-${u.id}`}
                      className="p-2 hover:bg-green-600 rounded-lg transition-colors text-green-400"
                      title="Снять мут"
                    >
                      {actionLoading === `unmute-${u.id}` ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === БЛОК: ВСЕ ПРЕДУПРЕЖДЕНИЯ === */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 overflow-hidden">
        <div className="px-6 py-4 bg-gray-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <AlertCircle className="text-yellow-400" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Все предупреждения</h3>
              <p className="text-sm text-gray-400">{otherUsers.length} пользователей</p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-700/50">
          {otherUsers.map(u => (
            <div key={u.id} className="p-4 hover:bg-gray-800/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                    {u.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-bold text-white flex items-center gap-2">
                      {u.username}
                      {u.is_vip && <span className="text-yellow-400">👑</span>}
                    </p>
                    <p className="text-sm text-gray-400 flex items-center gap-2">
                      <AlertCircle size={14} /> {u.warningCount} варнов
                      {u.discord_id && <span className="text-gray-600">• ID: {u.discord_id.slice(0, 10)}...</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setSelectedUser(u); setShowAddWarning(true); }}
                    className="p-2 hover:bg-yellow-500/20 rounded-lg transition-colors text-yellow-400 hover:text-yellow-300"
                    title="Добавить варн"
                  >
                    <AlertCircle size={18} />
                  </button>
                  {u.warningCount > 0 && (
                    <button
                      onClick={() => handleResetWarnings(u)}
                      disabled={actionLoading === `reset-${u.id}`}
                      className="p-2 hover:bg-gray-600 rounded-lg transition-colors text-gray-400"
                      title="Сбросить варны"
                    >
                      {actionLoading === `reset-${u.id}` ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    </button>
                  )}
                  <button
                    onClick={() => handleUnmute(u)}
                    disabled={actionLoading === `unmute-${u.id}`}
                    className="p-2 hover:bg-green-600 rounded-lg transition-colors text-green-400"
                    title="Снять мут"
                  >
                    {actionLoading === `unmute-${u.id}` ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
                  </button>
                </div>
              </div>
              {u.userWarnings.length > 0 && (
                <div className="mt-3 ml-16 space-y-2">
                  {u.userWarnings.map((w: any, i: number) => (
                    <div key={w.id || i} className="flex items-center gap-3 text-sm bg-gray-800/30 p-2 rounded-lg">
                      <Clock size={14} className="text-gray-500" />
                      <span className="text-gray-300">{w.reason}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-500">{new Date(w.created_at).toLocaleDateString('ru')}</span>
                      {w.issued_by && <span className="text-gray-600">• Выдал: {w.issued_by}</span>}
                      <button 
                        onClick={() => handleRemoveWarning(w.id)}
                        className="p-1 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400 ml-auto"
                        title="Удалить варн"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {otherUsers.length === 0 && usersWith3Plus.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
          <p>Нет пользователей с предупреждениями</p>
        </div>
      )}

      {/* === МОДАЛКА: ВЫДАТЬ МУТ === */}
      <AnimatePresence>
        {showMuteModal && selectedUser && (
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
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-xl">
                  {selectedUser.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <h3 className="text-xl font-bold">Выдать мут</h3>
                  <p className="text-gray-400">{selectedUser.username}</p>
                  {selectedUser.discord_id && (
                    <p className="text-xs text-gray-500">Discord ID: {selectedUser.discord_id}</p>
                  )}
                </div>
              </div>

              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl mb-4">
                <p className="text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  ⚠️ У игрока {selectedUser.warningCount} предупреждений!
                </p>
              </div>

              <p className="text-gray-400 mb-4">Выберите срок мута:</p>
              <div className="grid grid-cols-5 gap-2 mb-6">
                {[1, 3, 7, 14, 30].map(d => (
                  <button
                    key={d}
                    onClick={() => setMuteDays(d)}
                    className={`py-3 rounded-xl transition-all ${
                      muteDays === d 
                        ? 'bg-purple-600 text-white scale-105' 
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    <span className="block text-lg font-bold">{d}</span>
                    <span className="text-xs">дн</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowMuteModal(false); setSelectedUser(null); }}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleMute}
                  disabled={muting || !selectedUser.discord_id}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {muting ? <Loader2 className="animate-spin" size={20} /> : <Ban size={20} />}
                  {selectedUser.discord_id ? 'Выдать мут' : 'Нет Discord'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* === МОДАЛКА: ВЫДАТЬ ВАРН === */}
        {showAddWarning && (
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
                <h3 className="text-xl font-bold">Выдать предупреждение</h3>
                <button
                  onClick={() => { setShowAddWarning(false); setSelectedUser(null); setNewWarningReason(''); setUserSearch(''); setSearchResults([]); }}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircle size={24} />
                </button>
              </div>

              {/* Поиск пользователя */}
              {!selectedUser ? (
                <>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Поиск пользователя (мин. 2 символа)..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {searching && (
                      <div className="text-center py-4 text-gray-500">Поиск...</div>
                    )}
                    {searchResults.map(user => (
                      <button
                        key={user.id}
                        onClick={() => { setSelectedUser(user); setSearchResults([]); setUserSearch(''); }}
                        className="w-full flex items-center gap-3 p-3 bg-gray-700/50 hover:bg-gray-700 rounded-xl transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                          {user.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1">
                          <span className="text-white">{user.username}</span>
                          {user.is_banned && <span className="ml-2 text-xs text-red-400">🚫 Забанен</span>}
                        </div>
                        {user.discord_id && <span className="text-xs text-gray-500">✓ Discord</span>}
                      </button>
                    ))}
                    {userSearch.length >= 2 && !searching && searchResults.length === 0 && (
                      <div className="text-center py-4 text-gray-500">Пользователь не найден</div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-6 p-3 bg-gray-700/50 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                      {selectedUser.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white">{selectedUser.username}</p>
                      <p className="text-sm text-gray-400">
                        {selectedUser.discord_id ? '✓ Discord привязан' : '⚠️ Нет Discord'}
                      </p>
                      <button
                        onClick={() => { setSelectedUser(null); setUserSearch(selectedUser.username); }}
                        className="text-sm text-purple-400 hover:text-purple-300"
                      >
                        Изменить пользователя
                      </button>
                    </div>
                  </div>

                  <textarea
                    placeholder="Причина предупреждения..."
                    value={newWarningReason}
                    onChange={(e) => setNewWarningReason(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors mb-6 resize-none"
                    autoFocus
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowAddWarning(false); setSelectedUser(null); setNewWarningReason(''); setUserSearch(''); }}
                      className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleAddWarning}
                      disabled={addingWarning || !newWarningReason.trim() || !selectedUser.discord_id}
                      className="flex-1 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {addingWarning ? <Loader2 className="animate-spin" size={20} /> : <AlertCircle size={20} />}
                      {selectedUser.discord_id ? 'Выдать' : 'Нет Discord'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WarningsTab;
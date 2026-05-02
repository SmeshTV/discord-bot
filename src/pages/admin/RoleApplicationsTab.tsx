import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, CheckCircle, XCircle, Clock, Loader2, Send, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { getRoleName, getRoleColor, SERVER_ROLES, APPLICABLE_ROLES } from '../../lib/roles';

const RoleApplicationsTab = () => {
  const { user: currentUser } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const fetchApplications = async () => {
    setLoading(true);
    let query = supabase
      .from('role_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data } = await query;
    setApplications(data || []);
    setLoading(false);

    // Загрузить данные пользователей
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((app: any) => app.user_id))];
      const { data: usersData } = await supabase
        .from('users')
        .select('id, username, discord_id')
        .in('id', userIds);

      const usersMap = new Map((usersData || []).map((u: any) => [u.id, u]));
      
      setApplications(prev => prev.map((app: any) => ({
        ...app,
        user: usersMap.get(app.user_id)
      })));
    }
  };

  const handleApprove = async (app: any) => {
    if (!app.user?.discord_id) {
      alert('У пользователя нет Discord аккаунта');
      return;
    }

    setProcessing(true);
    try {
      // Выдать роль через Edge Function
      const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
      const response = await fetch(`${FUNCTIONS_URL}/assign-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId: app.user.discord_id,
          roleId: app.desired_role,
          action: 'add'
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Не удалось выдать роль');
      }

      // Обновить статус заявки
      await supabase
        .from('role_applications')
        .update({ 
          status: 'approved', 
          reviewed_by: currentUser?.username,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', app.id);

      alert('✅ Роль выдана!');
      fetchApplications();
    } catch (error: any) {
      console.error('Error:', error);
      alert('❌ Ошибка: ' + error.message);
    }
    setProcessing(false);
  };

  const handleReject = async (app: any) => {
    setProcessing(true);
    try {
      await supabase
        .from('role_applications')
        .update({ 
          status: 'rejected', 
          reviewed_by: currentUser?.username,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', app.id);

      alert('Заявка отклонена');
      fetchApplications();
    } catch (error: any) {
      alert('❌ Ошиб��а: ' + error.message);
    }
    setProcessing(false);
  };

  const filteredApps = applications.filter(app => 
    app.user?.username?.toLowerCase().includes(search.toLowerCase()) ||
    getRoleName(app.desired_role)?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingApps = applications.filter(app => app.status === 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Поиск по никнейму или роли..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl transition-colors ${
                filter === f 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f === 'all' ? 'Все' : f === 'pending' ? 'На рассмотрении' : f === 'approved' ? 'Одобрено' : 'Отклонено'}
              {f === 'pending' && pendingApps.length > 0 && (
                <span className="ml-2 bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full">
                  {pendingApps.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Список заявок */}
      <div className="space-y-3">
        {filteredApps.map(app => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${getRoleColor(app.desired_role) || 'from-purple-500 to-pink-500'} flex items-center justify-center text-white font-bold text-lg`}>
                  {app.user?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-bold text-white">{app.user?.username || 'Unknown'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      app.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {app.status === 'pending' ? 'На рассмотрении' :
                       app.status === 'approved' ? 'Одобрено' : 'Отклонено'}
                    </span>
                    <span className="text-gray-500 text-sm">
                      {getRoleName(app.desired_role) || app.desired_role}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {app.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(app)}
                      disabled={processing}
                      className="p-2 hover:bg-green-600 rounded-lg transition-colors text-green-400"
                      title="Одобрить и выдать роль"
                    >
                      {processing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                    </button>
                    <button
                      onClick={() => handleReject(app)}
                      disabled={processing}
                      className="p-2 hover:bg-red-600 rounded-lg transition-colors text-red-400"
                      title="Отклонить"
                    >
                      <XCircle size={18} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedApp(app)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400"
                  title="Подробнее"
                >
                  <Clock size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredApps.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Users size={48} className="mx-auto mb-4 opacity-50" />
          <p>Нет заявок на роли</p>
        </div>
      )}

      {/* Модалка деталей */}
      <AnimatePresence>
        {selectedApp && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedApp(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4">Детали заявки</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm">Пользователь</p>
                  <p className="font-bold">{selectedApp.user?.username}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Роль</p>
                  <p className="font-bold">{getRoleName(selectedApp.desired_role)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Причина</p>
                  <p className="bg-gray-700 p-3 rounded-xl">{selectedApp.reason}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Статус</p>
                  <p className={`px-2 py-1 rounded-full text-xs inline-block ${
                    selectedApp.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    selectedApp.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {selectedApp.status}
                  </p>
                </div>
                {selectedApp.reviewed_by && (
                  <div>
                    <p className="text-gray-400 text-sm">Рассмотрел</p>
                    <p>{selectedApp.reviewed_by}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setSelectedApp(null)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
                >
                  Закрыть
                </button>
                {selectedApp.status === 'pending' && (
                  <>
                    <button
                      onClick={() => { handleReject(selectedApp); setSelectedApp(null); }}
                      disabled={processing}
                      className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
                    >
                      Отклонить
                    </button>
                    <button
                      onClick={() => { handleApprove(selectedApp); setSelectedApp(null); }}
                      disabled={processing}
                      className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-xl transition-colors"
                    >
                      Одобрить
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RoleApplicationsTab;
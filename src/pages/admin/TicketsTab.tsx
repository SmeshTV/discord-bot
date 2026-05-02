import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Loader2, Search, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, User, Send, MoreVertical, Trash2, Edit3, X, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const TicketsTab = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at'>('created_at');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const pageSize = 20;

  useEffect(() => {
    loadTickets();
  }, [filter, sortBy, page]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      let query = supabase.from('tickets').select('*', { count: 'exact' });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count } = await query
        .order(sortBy, { ascending: false })
        .range(from, to);

      setTickets(data || []);
      setTotalCount(count || 0);

      const userIds = [...new Set((data || []).map((t: any) => t.user_id))];
      if (userIds.length > 0) {
        const { data: usersData } = await supabase.from('users').select('*').in('id', userIds);
        setUsers(usersData || []);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
    setLoading(false);
  };

  const getUser = (userId: string) => users.find(u => u.id === userId);

  const filteredTickets = tickets.filter(t => {
    const user = getUser(t.user_id);
    const username = user?.username || '';
    return username.toLowerCase().includes(search.toLowerCase()) || 
      t.subject?.toLowerCase().includes(search.toLowerCase()) ||
      t.id?.toString().includes(search);
  });

  const stats = {
    open: totalCount,
    closed: 0,
    pending: 0,
  };

  const handleCloseTicket = async (ticketId: string) => {
    setActionLoading(ticketId);
    try {
      await supabase.from('tickets').update({ status: 'closed' }).eq('id', ticketId);
      loadTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: 'closed' });
      }
    } catch (error) {
      console.error('Error closing ticket:', error);
    }
    setActionLoading(null);
  };

  const handleAddReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: selectedTicket.id,
        user_id: 'admin',
        message: replyMessage.trim(),
        is_admin: true,
      });

      if (error) throw error;

      await supabase.from('tickets').update({ 
        status: 'open',
        updated_at: new Date().toISOString()
      }).eq('id', selectedTicket.id);

      setReplyMessage('');
      setShowReplyModal(false);
      loadTickets();
    } catch (error) {
      console.error('Error adding reply:', error);
    }
    setSaving(false);
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот тикет?')) return;
    setActionLoading(ticketId);
    try {
      await supabase.from('tickets').delete().eq('id', ticketId);
      loadTickets();
    } catch (error) {
      console.error('Error deleting ticket:', error);
    }
    setActionLoading(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'closed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle size={14} />;
      case 'closed': return <CheckCircle size={14} />;
      case 'pending': return <Clock size={14} />;
      default: return null;
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: 'Открытых', count: stats.open, color: 'green', status: 'open' },
          { label: 'В ожидании', count: stats.pending, color: 'yellow', status: 'pending' },
          { label: 'Закрытых', count: stats.closed, color: 'gray', status: 'closed' },
        ].map((stat, i) => (
          <button
            key={i}
            onClick={() => { setFilter(stat.status); setPage(1); }}
            className={`p-4 rounded-xl border transition-colors ${
              filter === stat.status 
                ? `bg-${stat.color}-500/20 border-${stat.color}-500/30` 
                : 'bg-gray-800 border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className={`flex items-center gap-2 text-${stat.color}-400`}>
              {getStatusIcon(stat.status)}
              <span className="font-bold">{stat.count}</span>
            </div>
            <p className="text-gray-400 text-sm mt-1">{stat.label}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Поиск по ID или теме..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'all', label: 'Все' },
            { id: 'open', label: 'Открытые' },
            { id: 'pending', label: 'Ожидающие' },
            { id: 'closed', label: 'Закрытые' },
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
        <button 
          onClick={loadTickets}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors text-gray-400"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-purple-500" size={40} />
        </div>
      ) : (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800/50">
                  <th className="px-4 py-4 text-left text-gray-400 font-medium text-sm">ID</th>
                  <th className="px-4 py-4 text-left text-gray-400 font-medium text-sm">Игрок</th>
                  <th className="px-4 py-4 text-left text-gray-400 font-medium text-sm">Тема</th>
                  <th className="px-4 py-4 text-left text-gray-400 font-medium text-sm">Статус</th>
                  <th className="px-4 py-4 text-left text-gray-400 font-medium text-sm">Дата</th>
                  <th className="px-4 py-4 text-left text-gray-400 font-medium text-sm">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((t, i) => {
                  const user = getUser(t.user_id);
                  return (
                    <motion.tr 
                      key={t.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-t border-gray-700/50 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <span className="text-gray-500 font-mono">#{t.id}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                            {user?.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span className="font-medium">{user?.username || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-gray-300">{t.subject || 'Общий вопрос'}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${getStatusColor(t.status)}`}>
                          {getStatusIcon(t.status)}
                          {t.status === 'open' ? 'Открыт' : t.status === 'closed' ? 'Закрыт' : 'В ожидании'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-400 text-sm">
                        {t.created_at ? new Date(t.created_at).toLocaleString('ru') : '-'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => { setSelectedTicket(t); setShowReplyModal(true); }}
                            className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors text-purple-400"
                            title="Ответить"
                          >
                            <MessageSquare size={16} />
                          </button>
                          {t.status !== 'closed' && (
                            <button 
                              onClick={() => handleCloseTicket(t.id)}
                              disabled={actionLoading === t.id}
                              className="p-2 hover:bg-green-500/20 rounded-lg transition-colors text-green-400"
                              title="Закрыть"
                            >
                              {actionLoading === t.id ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteTicket(t.id)}
                            disabled={actionLoading === t.id}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                            title="Удалить"
                          >
                            {actionLoading === t.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-4 py-3 bg-gray-800/50 flex items-center justify-between">
              <span className="text-gray-400 text-sm">
                Страница {page} из {totalPages} ({totalCount} тикетов)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {filteredTickets.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <Ticket size={48} className="mx-auto mb-4 opacity-50" />
          <p>Тикеты не найдены</p>
        </div>
      )}

      <AnimatePresence>
        {showReplyModal && selectedTicket && (
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
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Ответ на тикет #{selectedTicket.id}</h3>
                <button onClick={() => setShowReplyModal(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-gray-700/30 rounded-xl">
                  <p className="text-gray-400 text-sm">От:</p>
                  <p className="font-medium">{getUser(selectedTicket.user_id)?.username || 'Unknown'}</p>
                </div>

                <div className="p-3 bg-gray-700/30 rounded-xl">
                  <p className="text-gray-400 text-sm">Тема:</p>
                  <p className="font-medium">{selectedTicket.subject || 'Общий вопрос'}</p>
                </div>

                <div className="p-3 bg-gray-700/30 rounded-xl">
                  <p className="text-gray-400 text-sm">Сообщение:</p>
                  <p className="mt-1">{selectedTicket.message || '-'}</p>
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Ваш ответ:</label>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Напишите ответ..."
                    rows={4}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl py-3 px-4 text-white placeholder-gray-500 mt-1 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowReplyModal(false)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddReply}
                  disabled={saving || !replyMessage.trim()}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  Отправить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TicketsTab;
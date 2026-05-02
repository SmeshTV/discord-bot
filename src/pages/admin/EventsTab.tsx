import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, Edit3, Trash2, Search, Filter, Users, Clock, Gamepad2, Loader2, X, Save, Send, Zap, AlertTriangle, CheckCircle, RefreshCw, ExternalLink, Settings, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface Event {
  id: string;
  title: string;
  description: string;
  game: string;
  game_emoji?: string;
  date: string;
  time: string;
  max_players: number;
  registered_players: string[];
  host_id?: string;
  host_name?: string;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  discord_message_id?: string;
  discord_scheduled_event_id?: string;
  discord_channel_id?: string;
  embed_settings?: {
    color?: string;
    botName?: string;
    botAvatar?: string;
    footer?: string;
    thumbnail?: string;
  };
  exclusive_enabled?: boolean;
  exclusive_duration?: number;
  exclusive_until?: string;
  created_at: string;
}

const EVENTS_CHANNEL_ID = '1474409280349274397';
const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, '')}/functions/v1`;

const games = [
  'Among Us', 'Шахматы', 'Дурак', 'Clash Royale', 'Brawl Stars', 
  'Minecraft', 'JackBox', 'Бункер', 'Шпион', 'Codenames', 
  'Alias', 'Gartic Phone', 'Roblox', 'Другие'
];

const gameEmojis: { [key: string]: string } = { 
  'Among Us': '🚀', 'Шахматы': '♟️', 'Дурак': '🃏', 'Clash Royale': '👑', 
  'Brawl Stars': '⭐', 'Minecraft': '⛏️', 'JackBox': '📦', 'Бункер': '🏚️', 
  'Шпион': '🕵️', 'Codenames': '🔤', 'Alias': '🗣️', 'Gartic Phone': '🎨', 'Roblox': '🟢',
  'Другие': '🎮'
};

const EventsTab = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [discordSettings, setDiscordSettings] = useState({
    sendToDiscord: true,
    createDiscordEvent: true,
    rolePing: false,
    channelId: EVENTS_CHANNEL_ID,
  });

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    game: 'Among Us',
    date: '',
    time: '',
    max_players: 8,
    exclusive_enabled: false,
    exclusive_duration: 60,
  });

  const [eventSettings, setEventSettings] = useState(() => {
    const saved = localStorage.getItem('eventSettings');
    return saved ? JSON.parse(saved) : {
      color: '#00D4FF',
      botName: 'LOLA Events',
      botAvatar: '',
      footer: '✨ LOLA Server',
      thumbnail: '',
    };
  });

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    localStorage.setItem('eventSettings', JSON.stringify(eventSettings));
  }, [eventSettings]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    }
    setLoading(false);
  };

  // 🔥 ИСПРАВЛЕННАЯ ФУНКЦИЯ СОЗДАНИЯ
  const handleCreateEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.date || !newEvent.time) {
      alert('Заполните обязательные поля: название, дата и время');
      return;
    }
    
    setSending(true);
    try {
      // Полные данные события для БД
const eventData: any = {
        title: newEvent.title,
        description: newEvent.description,
        game: newEvent.game,
        game_emoji: gameEmojis[newEvent.game],
        date: newEvent.date,
        time: newEvent.time,
        max_players: newEvent.max_players,
        registered_players: [],
        status: 'upcoming' as const,
        host_id: user?.id || null,
        host_name: user?.username || 'Admin',
      };

      if (newEvent.exclusive_enabled && newEvent.exclusive_duration > 0) {
        const exclusiveUntil = new Date(newEvent.date + 'T' + newEvent.time);
        exclusiveUntil.setMinutes(exclusiveUntil.getMinutes() - newEvent.exclusive_duration);
        eventData.exclusive_enabled = true;
        eventData.exclusive_duration = newEvent.exclusive_duration;
        eventData.exclusive_until = exclusiveUntil.toISOString();
        eventData.exclusive_description = `⏳ Резерв на ${newEvent.exclusive_duration} мин`;
      }

      // 1. Сохраняем в Supabase
      const { data: savedEvent, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;
      if (!savedEvent) throw new Error('Не удалось создать событие');

      // 2. Отправляем в Discord (если включено)
      if (discordSettings.sendToDiscord) {
        try {
          const response = await fetch(`${FUNCTIONS_URL}/event-discord`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create',
              event: savedEvent,
              rolePing: discordSettings.rolePing ? '1467975816297054512' : null,
              createDiscordEvent: discordSettings.createDiscordEvent,
              embedSettings: eventSettings,
            })
          });
          
          const result = await response.json();
          
          // 3. 🔥 Сохраняем messageId и scheduledEventId в БД!
          if (result.messageId || result.scheduledEventId) {
            await supabase
              .from('events')
              .update({
                discord_message_id: result.messageId || null,
                discord_scheduled_event_id: result.scheduledEventId || null,
              })
              .eq('id', savedEvent.id);
          }
        } catch (discordError) {
          console.error('Discord sync error:', discordError);
          // Не прерываем — событие создано в БД
        }
      }

      // Сброс формы и обновление списка
      setNewEvent({
        title: '',
        description: '',
        game: 'Among Us',
        date: '',
        time: '',
        max_players: 8,
      });
      setShowAddModal(false);
      loadEvents();
      
    } catch (error: any) {
      console.error('Error creating event:', error);
      alert('Ошибка: ' + (error.message || 'Не удалось создать событие'));
    }
    setSending(false);
  };

  // 🔥 ИСПРАВЛЕННАЯ ФУНКЦИЯ ОБНОВЛЕНИЯ
  const handleUpdateEvent = async () => {
    if (!selectedEvent) return;
    
    setSending(true);
    try {
      // Определяем тип хайлайта
      const highlight = selectedEvent.status === 'cancelled' ? 'cancelled' : 'edited';
      
      // 1. Обновляем в БД
      const updateData: any = {
        title: selectedEvent.title,
        description: selectedEvent.description,
        game: selectedEvent.game,
        game_emoji: gameEmojis[selectedEvent.game] || selectedEvent.game_emoji,
        date: selectedEvent.date,
        time: selectedEvent.time,
        max_players: selectedEvent.max_players,
        status: selectedEvent.status,
      };

      // Добавляем эксклюзивные настройки
      if (selectedEvent.exclusive_enabled && selectedEvent.exclusive_duration) {
        const exclusiveUntil = new Date(selectedEvent.date + 'T' + selectedEvent.time);
        exclusiveUntil.setMinutes(exclusiveUntil.getMinutes() - selectedEvent.exclusive_duration);
        updateData.exclusive_enabled = true;
        updateData.exclusive_duration = selectedEvent.exclusive_duration;
        updateData.exclusive_until = exclusiveUntil.toISOString();
        updateData.exclusive_description = `⏳ Резерв на ${selectedEvent.exclusive_duration} мин`;
      } else {
        updateData.exclusive_enabled = false;
        updateData.exclusive_duration = null;
        updateData.exclusive_until = null;
        updateData.exclusive_description = null;
      }

      const { error: dbError } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', selectedEvent.id);

      if (dbError) throw dbError;

      // 2. Обновляем в Discord (если есть discord_message_id)
      if (discordSettings.sendToDiscord && selectedEvent.discord_message_id) {
        try {
          // Подготавливаем event данные для Discord
          const eventForDiscord = {
            ...selectedEvent,
            exclusive_enabled: selectedEvent.exclusive_enabled,
            exclusive_duration: selectedEvent.exclusive_duration,
            exclusive_until: updateData.exclusive_until,
            exclusive_description: updateData.exclusive_description,
          };
          
          await fetch(`${FUNCTIONS_URL}/event-discord`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update',
              event: eventForDiscord,
              embedSettings: eventSettings,
              highlight: highlight,
            })
          });
        } catch (discordError) {
          console.error('Discord update error:', discordError);
        }
      }

      setShowEditModal(false);
      setSelectedEvent(null);
      loadEvents();
      
    } catch (error: any) {
      console.error('Error updating event:', error);
      alert('Ошибка: ' + (error.message || 'Не удалось обновить'));
    }
    setSending(false);
  };

  // 🔥 ИСПРАВЛЕННАЯ ФУНКЦИЯ ОТМЕНЫ
  const handleCancelEvent = async (event: Event) => {
    if (!confirm(`Вы уверены, что хотите ОТМЕНИТЬ мероприятие "${event.title}"?`)) return;
    
    setSending(true);
    try {
      // 1. Обновляем статус в БД
      const { error: dbError } = await supabase
        .from('events')
        .update({ status: 'cancelled' })
        .eq('id', event.id);

      if (dbError) throw dbError;

      // 2. Обновляем сообщение в Discord с ЖЁЛТЫМ текстом (если есть ID)
      if (discordSettings.sendToDiscord && event.discord_message_id) {
        try {
          await fetch(`${FUNCTIONS_URL}/event-discord`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update',
              event: { ...event, status: 'cancelled' },
              embedSettings: eventSettings,
              highlight: 'cancelled', // 🔥 Флаг для жёлтого текста
            })
          });
        } catch (discordError) {
          console.error('Discord cancel error:', discordError);
        }
      }

      loadEvents();
    } catch (error: any) {
      console.error('Error cancelling event:', error);
      alert('Ошибка: ' + (error.message || 'Не удалось отменить'));
    }
    setSending(false);
  };

  // 🔥 ИСПРАВЛЕННАЯ ФУНКЦИЯ УДАЛЕНИЯ
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Вы уверены, что хотите удалить это мероприятие? Это действие необратимо.')) return;
    
    setSending(true);
    try {
      const event = events.find(e => e.id === eventId);
      
      // 1. 🔥 Сначала удаляем сообщение в Discord (если есть ID)
      if (discordSettings.sendToDiscord && event?.discord_message_id) {
        try {
          await fetch(`${FUNCTIONS_URL}/event-discord`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'delete',
              event: { id: event.id, discord_message_id: event.discord_message_id },
            })
          });
        } catch (discordError) {
          console.error('Discord delete error:', discordError);
        }
      }

      // 2. Удаляем scheduled event если есть
      if (event?.discord_scheduled_event_id) {
        try {
          await fetch(`${FUNCTIONS_URL}/event-discord`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'delete_scheduled',
              event: { id: event.id, discord_scheduled_event_id: event.discord_scheduled_event_id },
            })
          });
        } catch (err) {
          console.error('Failed to delete scheduled event:', err);
        }
      }

      // 3. Удаляем из БД
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      loadEvents();
      
    } catch (error: any) {
      console.error('Error deleting event:', error);
      alert('Ошибка: ' + (error.message || 'Не удалось удалить'));
    }
    setSending(false);
  };

  // 🔥 ФУНКЦИЯ ВОССТАНОВЛЕНИЯ
  const handleRestoreEvent = async (event: Event) => {
    setSending(true);
    try {
      // 1. Обновляем статус в БД
      const { error: dbError } = await supabase
        .from('events')
        .update({ status: 'upcoming' })
        .eq('id', event.id);

      if (dbError) throw dbError;

      // 2. Обновляем в Discord (если есть ID)
      if (discordSettings.sendToDiscord && event.discord_message_id) {
        try {
          await fetch(`${FUNCTIONS_URL}/event-discord`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update',
              event: { ...event, status: 'upcoming' },
              embedSettings: eventSettings,
              highlight: 'edited',
            })
          });
        } catch (discordError) {
          console.error('Discord restore error:', discordError);
        }
      }

      loadEvents();
    } catch (error: any) {
      console.error('Error restoring event:', error);
      alert('Ошибка: ' + (error.message || 'Не удалось восстановить'));
    }
    setSending(false);
  };

  const filteredEvents = events.filter(e => {
    const matchesSearch = e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.game?.toLowerCase().includes(search.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    if (filter === 'upcoming') return matchesSearch && e.status === 'upcoming';
    if (filter === 'live') return matchesSearch && e.status === 'live';
    if (filter === 'completed') return matchesSearch && e.status === 'completed';
    if (filter === 'cancelled') return matchesSearch && e.status === 'cancelled';
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'live': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'cancelled': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

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
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* === ФИЛЬТРЫ И ПОИСК === */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Поиск мероприятий..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'all', label: 'Все' },
            { id: 'upcoming', label: 'Предстоящие' },
            { id: 'live', label: 'Идут' },
            { id: 'completed', label: 'Завершённые' },
            { id: 'cancelled', label: 'Отменённые' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
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
          onClick={() => setShowSettingsModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors text-gray-400"
          title="Настройки"
        >
          <Settings size={18} />
        </button>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-xl transition-colors"
        >
          <Plus size={18} />
          Создать
        </button>
      </div>

      {/* === СПИСОК СОБЫТИЙ === */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEvents.map((event, i) => (
          <motion.div 
            key={event.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-2xl border border-gray-700/50 hover:border-purple-500/30 transition-all group ${event.status === 'cancelled' ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl">
                  {event.game_emoji || gameEmojis[event.game] || '🎮'}
                </div>
                <div>
                  <h3 className="font-bold">{event.title}</h3>
                  <p className="text-gray-400 text-sm">{event.game}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(event.status)}`}>
                {event.status === 'upcoming' && '📅'}
                {event.status === 'live' && '🔴'}
                {event.status === 'completed' && '✅'}
                {event.status === 'cancelled' && '❌'}
                {event.status === 'upcoming' ? 'Предстоящее' : 
                 event.status === 'live' ? 'Идёт' : 
                 event.status === 'completed' ? 'Завершено' : 'Отменено'}
              </span>
            </div>

            {event.description && (
              <p className="text-gray-400 text-sm mb-3 line-clamp-2">{event.description}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>{event.date}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{event.time}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm mb-4">
              <div className="flex items-center gap-1 text-gray-400">
                <Users size={14} />
                <span>{event.registered_players?.length || 0}/{event.max_players}</span>
              </div>
              {event.discord_message_id && (
                <div className="flex items-center gap-1 text-green-400">
                  <ExternalLink size={14} />
                  <span>Discord</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {event.status !== 'cancelled' && (
                <>
                  <button 
                    onClick={() => { 
                      setSelectedEvent({ 
                        ...event, 
                        exclusive_enabled: event.exclusive_enabled || false,
                        exclusive_duration: event.exclusive_duration || 60,
                      }); 
                      setShowEditModal(true); 
                    }}
                    className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors text-sm flex items-center justify-center gap-1"
                  >
                    <Edit3 size={14} /> Изменить
                  </button>
                  <button 
                    onClick={() => handleCancelEvent(event)}
                    className="py-2 px-3 bg-yellow-600/20 hover:bg-yellow-600/30 rounded-xl transition-colors text-yellow-400"
                    title="Отменить"
                  >
                    <AlertTriangle size={14} />
                  </button>
                </>
              )}
              {event.status === 'cancelled' && (
                <button 
                  onClick={() => handleRestoreEvent(event)}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-xl transition-colors text-sm flex items-center justify-center gap-1"
                >
                  <RefreshCw size={14} /> Восстановить
                </button>
              )}
              <button 
                onClick={() => handleDeleteEvent(event.id)}
                className="py-2 px-3 bg-red-500/20 hover:bg-red-500/30 rounded-xl transition-colors text-red-400"
                title="Удалить"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </motion.div>
        ))}

        {filteredEvents.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-500">
            <Calendar size={48} className="mx-auto mb-4 opacity-50" />
            <p>Мероприятия не найдены</p>
          </div>
        )}
      </div>

      {/* === МОДАЛКА: СОЗДАНИЕ === */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Создать мероприятие</h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm">Название *</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Например: Турнир по Among Us"
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Описание</label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Описание мероприятия..."
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm">Игра *</label>
                    <select
                      value={newEvent.game}
                      onChange={(e) => setNewEvent({ ...newEvent, game: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                    >
                      {games.map(g => (
                        <option key={g} value={g}>{gameEmojis[g]} {g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Макс. игроков *</label>
                    <input
                      type="number"
                      min="1"
                      value={newEvent.max_players}
                      onChange={(e) => setNewEvent({ ...newEvent, max_players: parseInt(e.target.value) || 8 })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm">Дата *</label>
                    <input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Время *</label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4 mt-4">
                  <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Trophy size={18} className="text-yellow-400" />
                      <span>Эксклюзивный доступ (резерв)</span>
                    </div>
                    <button
                      onClick={() => setNewEvent({ ...newEvent, exclusive_enabled: !newEvent.exclusive_enabled })}
                      className={`w-12 h-6 rounded-full transition-colors flex items-center ${newEvent.exclusive_enabled ? 'bg-green-500' : 'bg-gray-600'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${newEvent.exclusive_enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  {newEvent.exclusive_enabled && (
                    <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                      <label className="text-yellow-400 text-sm">Длительность (минут)</label>
                      <div className="flex gap-2 mt-2">
                        {[15, 30, 60, 120].map(mins => (
                          <button
                            key={mins}
                            onClick={() => setNewEvent({ ...newEvent, exclusive_duration: mins })}
                            className={`flex-1 py-2 rounded-lg transition-colors ${
                              newEvent.exclusive_duration === mins
                                ? 'bg-yellow-500 text-black'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                          >
                            {mins} мин
                          </button>
                        ))}
                      </div>
                      <p className="text-gray-400 text-xs mt-2">
                        Только обладатели резерва смогут записаться за {newEvent.exclusive_duration} минут до начала. Остальные — после.
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-700 pt-4 mt-4">
                  <h4 className="font-bold mb-3 flex items-center gap-2">
                    <Send size={16} className="text-purple-400" /> Настройки Discord
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                      <span>Отправить в Discord</span>
                      <button
                        onClick={() => setDiscordSettings(s => ({ ...s, sendToDiscord: !s.sendToDiscord }))}
                        className={`w-12 h-6 rounded-full transition-colors flex items-center ${discordSettings.sendToDiscord ? 'bg-green-500' : 'bg-gray-600'}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${discordSettings.sendToDiscord ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>

                    {discordSettings.sendToDiscord && (
                      <>
                        <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                          <span>Создать Discord ивент</span>
                          <button
                            onClick={() => setDiscordSettings(s => ({ ...s, createDiscordEvent: !s.createDiscordEvent }))}
                            className={`w-12 h-6 rounded-full transition-colors flex items-center ${discordSettings.createDiscordEvent ? 'bg-green-500' : 'bg-gray-600'}`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${discordSettings.createDiscordEvent ? 'translate-x-6' : 'translate-x-0.5'}`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                          <span>Ping роли</span>
                          <button
                            onClick={() => setDiscordSettings(s => ({ ...s, rolePing: !s.rolePing }))}
                            className={`w-12 h-6 rounded-full transition-colors flex items-center ${discordSettings.rolePing ? 'bg-green-500' : 'bg-gray-600'}`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${discordSettings.rolePing ? 'translate-x-6' : 'translate-x-0.5'}`} />
                          </button>
                        </div>

                        <div>
                          <label className="text-gray-400 text-sm">Цвет Embed</label>
                          <div className="flex gap-2 mt-1">
                            <input
                              type="color"
                              value={eventSettings.color}
                              onChange={(e) => setEventSettings(s => ({ ...s, color: e.target.value }))}
                              className="w-12 h-10 rounded-lg border border-gray-600"
                            />
                            <input
                              type="text"
                              value={eventSettings.color}
                              onChange={(e) => setEventSettings(s => ({ ...s, color: e.target.value }))}
                              className="flex-1 bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-gray-400 text-sm">Имя бота</label>
                          <input
                            type="text"
                            value={eventSettings.botName}
                            onChange={(e) => setEventSettings(s => ({ ...s, botName: e.target.value }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreateEvent}
                  disabled={sending || !newEvent.title.trim() || !newEvent.date || !newEvent.time}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  Создать
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* === МОДАЛКА: РЕДАКТИРОВАНИЕ === */}
        {showEditModal && selectedEvent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Изменить мероприятие</h3>
                <button onClick={() => { setShowEditModal(false); setSelectedEvent(null); }} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm">Название</label>
                  <input
                    type="text"
                    value={selectedEvent.title}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, title: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Описание</label>
                  <textarea
                    value={selectedEvent.description || ''}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, description: e.target.value })}
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm">Игра</label>
                    <select
                      value={selectedEvent.game}
                      onChange={(e) => setSelectedEvent({ ...selectedEvent, game: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                    >
                      {games.map(g => (
                        <option key={g} value={g}>{gameEmojis[g]} {g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Статус</label>
                    <select
                      value={selectedEvent.status}
                      onChange={(e) => setSelectedEvent({ ...selectedEvent, status: e.target.value as Event['status'] })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                    >
                      <option value="upcoming">📅 Предстоящее</option>
                      <option value="live">🔴 Идёт сейчас</option>
                      <option value="completed">✅ Завершено</option>
                      <option value="cancelled">❌ Отменено</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm">Дата</label>
                    <input
                      type="date"
                      value={selectedEvent.date}
                      onChange={(e) => setSelectedEvent({ ...selectedEvent, date: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Время</label>
                    <input
                      type="time"
                      value={selectedEvent.time}
                      onChange={(e) => setSelectedEvent({ ...selectedEvent, time: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Макс. игроков</label>
                  <input
                    type="number"
                    min="1"
                    value={selectedEvent.max_players}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, max_players: parseInt(e.target.value) || 8 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                  />
                </div>

                <div className="border-t border-gray-700 pt-4 mt-4">
                  <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Trophy size={18} className="text-yellow-400" />
                      <span>Эксклюзивный доступ (резерв)</span>
                    </div>
                    <button
                      onClick={() => setSelectedEvent({ ...selectedEvent, exclusive_enabled: !selectedEvent.exclusive_enabled })}
                      className={`w-12 h-6 rounded-full transition-colors flex items-center ${selectedEvent.exclusive_enabled ? 'bg-green-500' : 'bg-gray-600'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${selectedEvent.exclusive_enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  {selectedEvent.exclusive_enabled && (
                    <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                      <label className="text-yellow-400 text-sm">Длительность (минут)</label>
                      <div className="flex gap-2 mt-2">
                        {[15, 30, 60, 120].map(mins => (
                          <button
                            key={mins}
                            onClick={() => setSelectedEvent({ ...selectedEvent, exclusive_duration: mins })}
                            className={`flex-1 py-2 rounded-lg transition-colors ${
                              selectedEvent.exclusive_duration === mins
                                ? 'bg-yellow-500 text-black'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                          >
                            {mins} мин
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-700 pt-4 mt-4">
                  <h4 className="font-bold mb-3 flex items-center gap-2">
                    <Send size={16} className="text-purple-400" /> Настройки Discord
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                      <span>Отправить в Discord</span>
                      <button
                        onClick={() => setDiscordSettings(s => ({ ...s, sendToDiscord: !s.sendToDiscord }))}
                        className={`w-12 h-6 rounded-full transition-colors flex items-center ${discordSettings.sendToDiscord ? 'bg-green-500' : 'bg-gray-600'}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${discordSettings.sendToDiscord ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>

                    {discordSettings.sendToDiscord && (
                      <>
                        <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                          <span>Создать Discord ивент</span>
                          <button
                            onClick={() => setDiscordSettings(s => ({ ...s, createDiscordEvent: !s.createDiscordEvent }))}
                            className={`w-12 h-6 rounded-full transition-colors flex items-center ${discordSettings.createDiscordEvent ? 'bg-green-500' : 'bg-gray-600'}`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${discordSettings.createDiscordEvent ? 'translate-x-6' : 'translate-x-0.5'}`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                          <span>Ping роли</span>
                          <button
                            onClick={() => setDiscordSettings(s => ({ ...s, rolePing: !s.rolePing }))}
                            className={`w-12 h-6 rounded-full transition-colors flex items-center ${discordSettings.rolePing ? 'bg-green-500' : 'bg-gray-600'}`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${discordSettings.rolePing ? 'translate-x-6' : 'translate-x-0.5'}`} />
                          </button>
                        </div>

                        <div>
                          <label className="text-gray-400 text-sm">Цвет Embed</label>
                          <div className="flex gap-2 mt-1">
                            <input
                              type="color"
                              value={eventSettings.color}
                              onChange={(e) => setEventSettings(s => ({ ...s, color: e.target.value }))}
                              className="w-12 h-10 rounded-lg border border-gray-600"
                            />
                            <input
                              type="text"
                              value={eventSettings.color}
                              onChange={(e) => setEventSettings(s => ({ ...s, color: e.target.value }))}
                              className="flex-1 bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-gray-400 text-sm">Имя бота</label>
                          <input
                            type="text"
                            value={eventSettings.botName}
                            onChange={(e) => setEventSettings(s => ({ ...s, botName: e.target.value }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowEditModal(false); setSelectedEvent(null); }}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleUpdateEvent}
                  disabled={sending}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sending ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Сохранить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* === МОДАЛКА: НАСТРОЙКИ === */}
        {showSettingsModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Настройки Discord</h3>
                <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm">Цвет Embed по умолчанию</label>
                  <input
                    type="color"
                    value={eventSettings.color}
                    onChange={(e) => setEventSettings(s => ({ ...s, color: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-gray-600 mt-1"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Имя бота</label>
                  <input
                    type="text"
                    value={eventSettings.botName}
                    onChange={(e) => setEventSettings(s => ({ ...s, botName: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Footer текст</label>
                  <input
                    type="text"
                    value={eventSettings.footer}
                    onChange={(e) => setEventSettings(s => ({ ...s, footer: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default EventsTab;1
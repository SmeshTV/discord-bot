import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, Users, Star, ChevronDown,
  ExternalLink, Gamepad2, CheckCircle, CalendarDays, Trophy
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

// Discord Markdown → HTML конвертер
const renderDiscordMarkdown = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-black/30 rounded px-2 py-1 text-sm font-mono my-1">$1</pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-white/10 rounded px-1 py-0.5 font-mono text-sm text-mushroom-neon">$1</code>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/\|\|(.+?)\|\|/g, '<span class="bg-gray-600 text-transparent hover:text-white rounded px-1 cursor-pointer transition-colors">$1</span>')
    .replace(/^[\s]*[-•]\s+(.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-2">$1</h1>');
};

// Display MSK time directly as string
const formatMSK = (dateStr: string, timeStr: string): string => {
  const parts = dateStr.split('-').map(Number);
  const timeParts = timeStr.split(':').map(Number);
  const day = parts[2];
  const month = parts[1];
  const hour = timeParts[0];
  const minute = timeParts[1];
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return day + ' ' + months[month - 1] + ', ' + String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
};

interface Event {
  id: string;
  title: string;
  description: string;
  game: string;
  game_emoji: string;
  date: string;
  time: string;
  host_id: string;
  host_name: string;
  max_players: number;
  registered_players: string[];
  status: string;
  created_at: string;
  discord_message_id?: string;
  exclusive_access_duration?: number;
  exclusive_until?: string;
  exclusive_description?: string;
}

const EVENTS_WEBHOOK = 'https://discord.com/api/webhooks/1492929379573956658/mYSn3oq9_EilPtNt4ih7O3Oyc8Qafhy0duNr62lOTLZChLuE2aXoOhc5CBqT9YTu7own';
const webhookParts = EVENTS_WEBHOOK.split('/');
const WEBHOOK_ID = webhookParts[webhookParts.length - 2];
const WEBHOOK_TOKEN = webhookParts[webhookParts.length - 1];

interface EventReview {
  id: string;
  event_id: string;
  user_id: string;
  username: string;
  rating: number;
  text: string;
  created_at: string;
}

const gameOptions = [
  { name: 'Among Us', emoji: '🚀' },
  { name: 'Шахматы', emoji: '♟️' },
  { name: 'Дурак', emoji: '🃏' },
  { name: 'Clash Royale', emoji: '👑' },
  { name: 'Brawl Stars', emoji: '⭐' },
  { name: 'Minecraft', emoji: '⛏️' },
  { name: 'JackBox', emoji: '📦' },
  { name: 'Бункер', emoji: '🏚️' },
  { name: 'Шпион', emoji: '🕵️' },
  { name: 'Codenames', emoji: '🔤' },
  { name: 'Alias', emoji: '🗣️' },
  { name: 'Gartic Phone', emoji: '🎨' },
  { name: 'Roblox', emoji: '🟢' },
];

const syncEventToDiscord = async (event: Event) => {
  if (!event.discord_message_id) return;
  try {
    await supabase.functions.invoke('event-discord', {
      body: {
        action: 'update',
        event: event,
        embedSettings: {
          botName: 'LOLA Events',
          footer: '✨ LOLA Server',
          color: '#00D4FF'
        }
      }
    });
  } catch (e) {
    console.error('Discord sync error:', e);
  }
};

const PageHeader = ({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) => (
  <motion.div 
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-4 mb-8"
  >
    {icon && (
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
        {icon}
      </div>
    )}
    <div>
      <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
        {title}
      </h1>
      {subtitle && (
        <p className="text-gray-400 text-sm">{subtitle}</p>
      )}
    </div>
  </motion.div>
);

const EventsPage = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventReviews, setEventReviews] = useState<{ [key: string]: EventReview[] }>({});
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [loading, setLoading] = useState(true);
  const [userReservations, setUserReservations] = useState<{id: string, expires_at: string}[]>([]);

  useEffect(() => {
    loadEvents();
    loadUserReservations();

    const channel = supabase
      .channel('events-public-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          loadEvents();
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      setEvents(prev => [...prev]);
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const loadUserReservations = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('shop_purchases')
      .select('id, expires_at, purchased_at')
      .eq('user_id', user.id)
      .eq('item_id', 'tournament-reserve')
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .limit(1);

    if (error) {
      console.error('Error loading reservations:', error);
      return;
    }

    if (data && data.length > 0) {
      const reservation = data[0];
      const expiresAt = reservation.expires_at 
        ? new Date(reservation.expires_at) 
        : new Date(reservation.purchased_at.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      setUserReservations([{
        id: reservation.id,
        expires_at: expiresAt.toISOString()
      }]);
    } else {
      setUserReservations([]);
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Events load error:', error);
    setEvents(data || []);

    if (data && data.length > 0) {
      const { data: reviews } = await supabase.from('event_reviews').select('*');
      if (reviews) {
        const byEvent: { [key: string]: EventReview[] } = {};
        reviews.forEach(r => {
          if (!byEvent[r.event_id]) byEvent[r.event_id] = [];
          byEvent[r.event_id].push(r);
        });
        setEventReviews(byEvent);
      }
    }

    setLoading(false);
  };

  const canRegisterForEvent = (event: Event): { canRegister: boolean; isExclusive: boolean; message?: string } => {
    if (!user) return { canRegister: false, isExclusive: false };

    if (!event.exclusive_until) {
      return { canRegister: true, isExclusive: false };
    }

    const exclusiveUntil = new Date(event.exclusive_until);
    const now = new Date();

    const hasReservation = userReservations.length > 0;

    if (now < exclusiveUntil) {
      if (hasReservation) {
        return { canRegister: true, isExclusive: true, message: '🏆 Ранняя регистрация (резерв)' };
      } else {
        return {
          canRegister: false,
          isExclusive: true,
          message: '⏳ Регистрация відкроється ' + exclusiveUntil.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        };
      }
    }

    return { canRegister: true, isExclusive: false };
  };

  const handleRegister = async (eventId: string) => {
    if (!user) return;
    const event = events.find(e => e.id === eventId);
    if (!event || event.registered_players.includes(user.id)) return;

    const newPlayers = [...event.registered_players, user.id];
    const { error } = await supabase
      .from('events')
      .update({ registered_players: newPlayers })
      .eq('id', eventId);

    if (error) return;
    setEvents(prev => prev.map(e =>
      e.id === eventId ? { ...e, registered_players: newPlayers } : e
    ));

    syncEventToDiscord({ ...event, registered_players: newPlayers });
  };

  const handleUnregister = async (eventId: string) => {
    if (!user) return;
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const newPlayers = event.registered_players.filter((id: string) => id !== user.id);
    const { error } = await supabase
      .from('events')
      .update({ registered_players: newPlayers })
      .eq('id', eventId);

    if (error) return;
    setEvents(prev => prev.map(e =>
      e.id === eventId ? { ...e, registered_players: newPlayers } : e
    ));

    syncEventToDiscord({ ...event, registered_players: newPlayers });
  };

  const handleSubmitReview = async () => {
    if (!user || !selectedEvent || !reviewText.trim()) return;

    const { data, error } = await supabase
      .from('event_reviews')
      .insert([{
        event_id: selectedEvent.id,
        user_id: user.id,
        username: user.username,
        rating: reviewRating,
        text: reviewText.trim(),
      }])
      .select()
      .single();

    if (error) return;

    setEventReviews(prev => ({
      ...prev,
      [selectedEvent.id]: [...(prev[selectedEvent.id] || []), data],
    }));
    setSelectedEvent({ ...selectedEvent });
    setReviewText('');
    setReviewRating(5);
  };

  const getEventStatus = (event: Event): { status: 'upcoming' | 'live' | 'completed' | 'cancelled', label: string, color: string } => {
    if (event.status === 'cancelled') return { status: 'cancelled', label: 'Отменён', color: 'bg-red-500/20 text-red-400' };

    // Время в БД хранится как MSK. Конвертируем в UTC для сравнения с текущим временем.
    const [year, month, day] = event.date.split('-').map(Number);
    const [hour, minute] = (event.time || '00:00').split(':').map(Number);
    // Date.UTC дает время в UTC. Вычитаем 3 часа, так как в БД время записано как MSK (UTC+3)
    const eventUtcTimestamp = Date.UTC(year, month - 1, day, hour - 3, minute);
    
    const nowUtc = Date.now(); // Текущее время в UTC (миллисекунды)
    const diffMs = eventUtcTimestamp - nowUtc;
    const diffMinutes = diffMs / (1000 * 60);
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < -2) {
      return { status: 'completed', label: 'Завершено', color: 'bg-gray-500/20 text-gray-400' };
    }

    if (diffMinutes <= 0 && diffHours >= -2) {
      return { status: 'live', label: '🔴 Идёт сейчас', color: 'bg-green-500/20 text-green-400 animate-pulse' };
    }

    if (diffMinutes > 0 && diffMinutes <= 60) {
      return { status: 'upcoming', label: '⚡ Скоро почнеться', color: 'bg-orange-500/20 text-orange-400' };
    }

    const todayStr = now.toISOString().split('T')[0];
    if (event.date === todayStr) {
      return { status: 'upcoming', label: '📅 Сьогодня', color: 'bg-blue-500/20 text-blue-400' };
    }

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    if (event.date === tomorrowStr) {
      return { status: 'upcoming', label: '📅 Завтра', color: 'bg-blue-500/20 text-blue-400' };
    }

    if (diffMinutes > 60) {
      return { status: 'upcoming', label: 'Скоро', color: 'bg-blue-500/20 text-blue-400' };
    }

    return { status: 'completed', label: 'Завершено', color: 'bg-gray-500/20 text-gray-400' };
  };

    const filteredEvents = events.filter(e => {
    const dynamicStatus = getEventStatus(e).status;
    if (filter === 'all') return true;
    return dynamicStatus === filter;
  }).sort((a, b) => {
    // Сортируем по UTC времени (MSK минус 3 часа)
    const [yA, mA, dA] = a.date.split('-').map(Number);
    const [hA, minA] = a.time.split(':').map(Number);
    const [yB, mB, dB] = b.date.split('-').map(Number);
    const [hB, minB] = b.time.split(':').map(Number);
    
    const utcA = Date.UTC(yA, mA - 1, dA, hA - 3, minA);
    const utcB = Date.UTC(yB, mB - 1, dB, hB - 3, minB);
    return utcB - utcA; // Сначала новые
  });

  const stats = {
    total: events.length,
    upcoming: events.filter(e => getEventStatus(e).status === 'upcoming' || getEventStatus(e).status === 'live').length,
    completed: events.filter(e => getEventStatus(e).status === 'completed').length,
    totalPlayers: events.reduce((sum, e) => sum + e.registered_players.length, 0),
  };

  if (loading) {
    return (
      <div className="pt-24 pb-20 px-4 flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Завантаження подій...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-20 pb-20 px-4">
      <div className="max-w-5xl mx-auto relative">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>
        
        <PageHeader 
          title="Події" 
          subtitle="Розклад подій на сервері LOLA"
          icon={<CalendarDays className="w-7 h-7 text-white" />}
        />

        {userReservations.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.05 }}
            className="mb-6 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="text-yellow-400" size={24} />
                <div>
                  <p className="font-bold text-yellow-400">🏆 У тебе є резерв на турнір!</p>
                  <p className="text-gray-400 text-sm">
                    Діє до: {new Date(userReservations[0].expires_at).toLocaleString('ru-RU', { 
                      day: 'numeric', 
                      month: 'long', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4 text-center"><div className="text-2xl font-bold text-mushroom-neon">{stats.total}</div><div className="text-gray-400 text-sm">Всього</div></div>
          <div className="glass-card p-4 text-center"><div className="text-2xl font-bold text-blue-400">{stats.upcoming}</div><div className="text-gray-400 text-sm">Предстоящі</div></div>
          <div className="glass-card p-4 text-center"><div className="text-2xl font-bold text-green-400">{stats.completed}</div><div className="text-gray-400 text-sm">Завершені</div></div>
          <div className="glass-card p-4 text-center"><div className="text-2xl font-bold text-yellow-400">{stats.totalPlayers}</div><div className="text-gray-400 text-sm">Учасників</div></div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex gap-2 mb-8">
          {[{ value: 'all', label: 'Всі' }, { value: 'upcoming', label: 'Предстоячі' }, { value: 'completed', label: 'Завершені' }].map(opt => (
            <button key={opt.value} onClick={() => setFilter(opt.value as typeof filter)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === opt.value ? 'bg-mushroom-neon/20 text-mushroom-neon border border-mushroom-neon/30' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'}`}>
              {opt.label}
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div key={filter} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {filteredEvents.length > 0 ? filteredEvents.map((event, index) => {
              const isRegistered = user && event.registered_players.includes(user.id);
              const game = gameOptions.find(g => g.name === event.game);
              const emoji = game?.emoji || event.game_emoji || '🎮';
              const reviews = eventReviews[event.id] || [];
              const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
              const dynamicStatus = getEventStatus(event);

              return (
                <motion.div key={event.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="glass-card overflow-hidden">
                  <button onClick={() => setSelectedEvent(event)} className="w-full p-6 text-left hover:bg-white/5 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <span className="text-4xl">{emoji}</span>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-bold">{event.title}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${dynamicStatus.color}`}>{dynamicStatus.label}</span>
                          </div>
                          <p className="text-gray-400 text-sm mb-2 line-clamp-1" dangerouslySetInnerHTML={{ __html: renderDiscordMarkdown(event.description) }} />
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Calendar size={12} /> {formatMSK(event.date, event.time).split(',')[0]}</span>
                            <span className="flex items-center gap-1"><Clock size={12} /> {formatMSK(event.date, event.time).split(',')[1].trim()}</span>
                            <span className="flex items-center gap-1"><Users size={12} />{event.registered_players.length}/{event.max_players}</span>
                            <span className="flex items-center gap-1"><Gamepad2 size={12} />{event.game}</span>
                            <span>Ведучий: {event.host_name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isRegistered && <CheckCircle size={18} className="text-green-400" />}
                        {avgRating > 0 && (
                          <div className="flex items-center gap-1 text-yellow-400 text-sm">
                            <Star size={14} className="fill-yellow-400" />
                            {avgRating.toFixed(1)}
                          </div>
                        )}
                        <ChevronDown size={18} className="text-gray-500" />
                      </div>
                    </div>
                  </button>

                  {(dynamicStatus.status === 'upcoming' || dynamicStatus.status === 'live') && user && (
                    <div className="px-6 pb-4">
                      {(() => {
                        const isRegistered = user && event.registered_players.includes(user.id);
                        const { canRegister, isExclusive, message } = canRegisterForEvent(event);

                        if (isRegistered) {
                          return (
                            <button
                              onClick={() => handleUnregister(event.id)}
                              className="w-full px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm transition-all border border-red-500/20"
                            >
                              Скасувати реєстрацію
                            </button>
                          );
                        }

                        if (!canRegister && isExclusive) {
                          return (
                            <div className="text-center">
                              <div className="px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                                <div className="text-sm text-yellow-400 font-medium">🏆 Ранняя реєстрація</div>
                                <div className="text-xs text-gray-400 mt-1">{message}</div>
                                <a href="/shop" className="inline-block mt-2 text-xs text-mushroom-neon hover:underline">
                                  Купити резерв на турнір →
                                </a>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <button
                            onClick={() => handleRegister(event.id)}
                            className={`w-full btn-primary text-sm flex items-center justify-center gap-2 ${
                              isExclusive ? 'border-2 border-yellow-500' : ''
                            }`}
                          >
                            <Users size={14} />
                            {isExclusive ? '🏆 Участвовать (резерв)' : 'Участвовать'}
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </motion.div>
              );
            }) : (
              <div className="text-center py-16">
                <Calendar size={48} className="mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400 text-lg mb-2">Немає подій</p>
                <p className="text-gray-500 text-sm">Стекни за анонсами в Discord!</p>
                <a href="https://discord.gg/lolaamongus" target="_blank" rel="noopener noreferrer" className="btn-discord inline-flex items-center gap-2 mt-6"><ExternalLink size={16} /> Discord сервер</a>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {selectedEvent && (() => {
            const modalStatus = getEventStatus(selectedEvent);
            return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()} className="glass-card max-w-2xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
                <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white"><ChevronDown size={20} className="rotate-90" /></button>
                
                <span className="text-5xl mb-4 block">{gameOptions.find(g => g.name === selectedEvent.game)?.emoji || selectedEvent.game_emoji}</span>
                <h2 className="text-3xl font-bold mb-2">{selectedEvent.title}</h2>
                
                <div className="flex flex-wrap gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${modalStatus.color}`}>
                    {modalStatus.label}
                  </span>
                  <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-gray-300 border border-white/10">{selectedEvent.game}</span>
                </div>

                <p className="text-gray-300 mb-6 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: renderDiscordMarkdown(selectedEvent.description) }} />

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 bg-white/5 rounded-xl"><div className="flex items-center gap-2 text-sm text-gray-400 mb-1"><Calendar size={14} />Дата</div><div className="font-bold">{selectedEvent.date}</div></div>
                  <div className="p-3 bg-white/5 rounded-xl"><div className="flex items-center gap-2 text-sm text-gray-400 mb-1"><Clock size={14} />Час</div><div className="font-bold">{selectedEvent.time}</div></div>
                  <div className="p-3 bg-white/5 rounded-xl"><div className="flex items-center gap-2 text-sm text-gray-400 mb-1"><Users size={14} />Учасники</div><div className="font-bold">{selectedEvent.registered_players.length}/{selectedEvent.max_players}</div></div>
                  <div className="p-3 bg-white/5 rounded-xl"><div className="flex items-center gap-2 text-sm text-gray-400 mb-1">Ведучий</div><div className="font-bold">{selectedEvent.host_name}</div></div>
                </div>

                {(eventReviews[selectedEvent.id] || []).length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-bold mb-3 flex items-center gap-2"><Star size={16} className="text-yellow-400" /> Відгуки ({eventReviews[selectedEvent.id]?.length || 0})</h4>
                    <div className="space-y-3">
                      {eventReviews[selectedEvent.id]?.map(review => (
                        <div key={review.id} className="p-3 bg-white/5 rounded-xl">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-sm">{review.username}</span>
                            <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} size={12} className={s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'} />)}</div>
                          </div>
                          <p className="text-gray-300 text-sm">{review.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {modalStatus.status === 'completed' && user && (
                  <div className="p-4 bg-white/5 rounded-xl mb-6">
                    <h4 className="font-bold mb-3 text-sm">Залишити відгук про івент</h4>
                    <div className="flex gap-1 mb-3">{[1,2,3,4,5].map(star => (<button key={star} onClick={() => setReviewRating(star)}><Star size={24} className={star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'} /></button>))}</div>
                    <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Як пройшов івент?" rows={2} maxLength={300} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:border-mushroom-neon focus:outline-none resize-none text-white placeholder-gray-500" />
                    <button onClick={handleSubmitReview} disabled={!reviewText.trim()} className="mt-2 btn-primary text-sm w-full disabled:opacity-50">Відправити відгук</button>
                  </div>
                )}

                {(modalStatus.status === 'upcoming' || modalStatus.status === 'live') && user && (() => {
                  const isRegistered = selectedEvent.registered_players.includes(user.id);
                  const { canRegister, isExclusive, message } = canRegisterForEvent(selectedEvent);

                  if (isRegistered) {
                    return (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUnregister(selectedEvent.id)}
                          className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-medium transition-all border border-red-500/20"
                        >
                          Скасувати реєстрацію
                        </button>
                      </div>
                    );
                  }

                  if (!canRegister && isExclusive) {
                    return (
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-center">
                        <div className="text-lg mb-2">🏆</div>
                        <div className="text-sm text-yellow-400 font-medium mb-1">Ранняя реєстрація</div>
                        <div className="text-xs text-gray-400">{message}</div>
                        <a href="/shop" className="inline-block mt-3 px-4 py-2 bg-mushroom-neon/20 text-mushroom-neon rounded-xl text-sm font-medium hover:bg-mushroom-neon/30 transition-all">
                          Купити резерв на турнір →
                        </a>
                      </div>
                    );
                  }

                  return (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRegister(selectedEvent.id)}
                        className={`btn-primary flex-1 flex items-center justify-center gap-2 ${
                          isExclusive ? 'border-2 border-yellow-500' : ''
                        }`}
                      >
                        <Users size={16} />
                        {isExclusive ? '🏆 Участвовать (резерв)' : 'Участвовать'}
                      </button>
                    </div>
                  );
                })()}
              </motion.div>
            </motion.div>
          );
          })()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default memo(EventsPage);

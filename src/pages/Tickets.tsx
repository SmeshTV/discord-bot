import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket, Plus, CheckCircle, XCircle,
  Loader2, Send, Volume2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { logger } from '../lib/logger';
import { getCached, setCached, clearCached } from '../lib/cache';

const TICKET_CATEGORIES = [
  { id: 'general', name: 'Общий', emoji: '💬', description: 'Общие вопросы по серверу' },
  { id: 'report', name: 'Жалоба', emoji: '🚨', description: 'Жалоба на игрока' },
  { id: 'bug', name: 'Баг', emoji: '🐛', description: 'Сообщить об ошибке' },
  { id: 'appeal', name: 'Апелляция', emoji: '📝', description: 'Обжаловать наказание' },
  { id: 'suggestion', name: 'Предложение', emoji: '💡', description: 'Идеи для улучшения сервера' },
  { id: 'other', name: 'Другое', emoji: '📌', description: 'Всё остальное' },
];

interface ChatMessage {
  id: string;
  author: string;
  authorId: string;
  content: string;
  timestamp: string;
  isBot: boolean;
  isSystem?: boolean;
}

interface StoredTicket {
  id: string;
  channelId: string;
  channelUrl: string;
  category: string;
  subject: string;
  description: string;
  messages: ChatMessage[];
  createdAt: string;
  closed: boolean;
}

interface TicketFormData {
  category: string;
  subject: string;
  description: string;
}

interface CreateTicketResponse {
  channelId: string;
  channelUrl: string;
}

interface TicketMessagesResponse {
  messages: ChatMessage[];
}

const TicketsPage = () => {
  const { user, supabaseUser, loading: authLoading } = useAuth();
  const [activeTicket, setActiveTicket] = useState<StoredTicket | null>(() => getCached('tickets_active'));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TicketFormData>({
    category: 'general',
    subject: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [closing, setClosing] = useState(false);

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, '')}/functions/v1`;

  // Load active ticket from localStorage
  useEffect(() => {
    if (!user || authLoading) return;

    const tickets: StoredTicket[] = JSON.parse(localStorage.getItem('lola_tickets') || '[]');
    const openTicket = tickets.find(t => !t.closed);

    if (openTicket) {
      setActiveTicket(openTicket);
      setCached('tickets_active', openTicket);
    }
  }, [user, authLoading]);

  // Poll for new messages
  useEffect(() => {
    if (!activeTicket || activeTicket.closed) return;

    const controller = new AbortController();

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${FUNCTIONS_URL}/ticket-messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'fetch',
            channelId: activeTicket.channelId,
          }),
          signal: controller.signal,
        });

        if (res.status === 404) {
          setActiveTicket(null);
          localStorage.removeItem('lola_tickets');
          setResult({ success: true, message: '✅ Тикет закрыт модератором.' });
          return;
        }

        if (res.ok) {
          const data = await res.json() as TicketMessagesResponse;
          if (data.messages && data.messages.length > 0) {
            const updated = {
              ...activeTicket,
              messages: data.messages,
            };
            setActiveTicket(updated);
            saveTicket(updated);
          }
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        logger.error('Fetch error:', e);
      }
    };

    // Initial fetch
    fetchMessages();

    // Poll every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [activeTicket?.channelId, activeTicket?.closed, FUNCTIONS_URL]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [activeTicket?.messages]);

  const saveTicket = useCallback((ticket: StoredTicket) => {
    const tickets: StoredTicket[] = JSON.parse(localStorage.getItem('lola_tickets') || '[]');
    const idx = tickets.findIndex(t => t.id === ticket.id);
    if (idx >= 0) {
      tickets[idx] = ticket;
    } else {
      tickets.unshift(ticket);
    }
    localStorage.setItem('lola_tickets', JSON.stringify(tickets));
    setCached('tickets_active', ticket);
  }, []);

  const createTicket = async () => {
    if (!form.subject.trim() || !form.description.trim()) return;

    setSubmitting(true);
    setResult(null);

    const discordId = supabaseUser?.user_metadata?.provider_id;
    if (!discordId) {
      setResult({ success: false, message: 'Ошибка: не удалось определить Discord ID. Перезайди.' });
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`${FUNCTIONS_URL}/create-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'open',
          userId: discordId,
          subject: form.subject,
          description: form.description,
        }),
      });

      const data = await res.json() as CreateTicketResponse;

      if (!res.ok) {
        const errorData = data as unknown as { error?: string; detail?: string };
        const errorMessage = errorData.error || errorData.detail || 'Ошибка создания';
        throw new Error(errorMessage);
      }

      const ticket: StoredTicket = {
        id: Date.now().toString(),
        channelId: data.channelId,
        channelUrl: data.channelUrl,
        category: form.category,
        subject: form.subject,
        description: form.description,
        messages: [],
        createdAt: new Date().toISOString(),
        closed: false,
      };

      saveTicket(ticket);
      setActiveTicket(ticket);
      setForm({ category: 'general', subject: '', description: '' });
      setShowForm(false);
      setResult({ success: true, message: '🎫 Тикет создан! Начни общение ниже.' });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Ошибка создания.';
      setResult({ success: false, message });
    }

    setSubmitting(false);
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !activeTicket || activeTicket.closed) return;

    setSending(true);
    const discordId = supabaseUser?.user_metadata?.provider_id || '';
    const myName = user?.username || 'User';

    try {
      const res = await fetch(`${FUNCTIONS_URL}/ticket-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          channelId: activeTicket.channelId,
          content: chatInput.trim(),
          username: myName,
          senderId: discordId,
        }),
      });

      if (!res.ok) throw new Error('Ошибка отправки');

      setChatInput('');
      // Сообщение появится через поллинг из Discord
    } catch (e: unknown) {
      logger.error('Send error:', e);
    }
    setSending(false);
  };

  const closeTicket = async () => {
    if (!activeTicket?.channelId) return;

    setClosing(true);
    try {
      const res = await fetch(`${FUNCTIONS_URL}/create-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close',
          ticketChannelId: activeTicket.channelId,
        }),
      });

      if (!res.ok) throw new Error('Ошибка закрытия');

      // Тикет удалён — убираем полностью
      setActiveTicket(null);
      localStorage.removeItem('lola_tickets');
      clearCached('tickets_active');
      setResult({ success: true, message: '✅ Тикет закрыт!' });
    } catch (e: unknown) {
      logger.error('Close error:', e);
    }
    setClosing(false);
  };

  const getCategoryInfo = (id: string) => {
    return TICKET_CATEGORIES.find(c => c.id === id) || TICKET_CATEGORIES[0];
  };

  const isOwnMessage = (msg: ChatMessage) => {
    const myId = supabaseUser?.user_metadata?.provider_id || '';
    // Только если authorId явно совпадает с моим Discord ID
    return msg.authorId === myId && myId !== '';
  };

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="pt-24 pb-20 px-4 flex items-center justify-center min-h-screen">
        <p className="text-2xl text-gray-400">Войдите через Discord</p>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-5xl font-bold gradient-text mb-2">🎫 Тикеты</h1>
            <p className="text-gray-400">Общение с администрацией</p>
          </div>
          {!activeTicket && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              Новый тикет
            </button>
          )}
        </motion.div>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex items-center gap-2 p-4 mb-6 rounded-xl ${
                result.success
                  ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}
            >
              {result.success ? <CheckCircle /> : <XCircle />}
              <span>{result.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card p-6 mb-8 overflow-hidden"
            >
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Ticket className="text-mushroom-neon" />
                Создать тикет
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 mb-2">Категория</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {TICKET_CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setForm({ ...form, category: cat.id })}
                        className={`p-3 rounded-xl border transition-colors text-left ${
                          form.category === cat.id
                            ? 'border-mushroom-neon bg-mushroom-neon/10'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-2xl">{cat.emoji}</span>
                        <p className="font-bold text-sm mt-1">{cat.name}</p>
                        <p className="text-xs text-gray-400">{cat.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 mb-2">Тема</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="Кратко опиши суть..."
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-2">Описание</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Подробно опиши проблему..."
                    rows={5}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 resize-none"
                    maxLength={2000}
                  />
                </div>

                <button
                  onClick={createTicket}
                  disabled={submitting || !form.subject.trim() || !form.description.trim()}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  {submitting ? 'Создание...' : 'Создать тикет'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat or No Ticket */}
        {activeTicket ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card overflow-hidden"
          >
            {/* Ticket Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getCategoryInfo(activeTicket.category).emoji}</span>
                <div>
                  <p className="font-bold">{activeTicket.subject}</p>
                  <p className="text-xs text-gray-400">
                    {activeTicket.closed ? '🔒 Закрыт' : '🟢 Открыт'} • {new Date(activeTicket.createdAt).toLocaleString('ru-RU')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activeTicket.channelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors flex items-center gap-1"
                >
                  <Volume2 size={14} />
                  <span className="hidden sm:inline">Discord</span>
                </a>
                {!activeTicket.closed && (
                  <button
                    onClick={closeTicket}
                    disabled={closing}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm text-red-400 transition-colors disabled:opacity-50"
                  >
                    {closing ? '...' : '🔒 Закрыть'}
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div ref={chatRef} className="h-96 overflow-y-auto p-4 space-y-3">
              {/* System message */}
              <div className="text-center text-sm text-gray-500 py-2">
                🎫 Тикет создан: {activeTicket.description}
              </div>

              {activeTicket.messages.map((msg) => {
                const own = isOwnMessage(msg);
                return (
                  <div key={msg.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      own
                        ? 'bg-mushroom-neon/20 text-white rounded-br-sm'
                        : msg.isBot
                        ? 'bg-white/5 text-gray-300 rounded-bl-sm'
                        : 'bg-purple-500/20 text-white rounded-bl-sm'
                    }`}>
                      {!own && (
                        <p className="text-xs font-bold text-mushroom-neon mb-1">{msg.author}</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        {new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        <span className="ml-2 text-gray-700">id:{msg.authorId.slice(0, 8)}</span>
                        <span className="ml-1">{own ? '→' : '←'}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input */}
            {!activeTicket.closed ? (
              <div className="p-4 border-t border-white/10 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !sending && sendMessage()}
                  placeholder="Напиши сообщение..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3"
                  maxLength={2000}
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !chatInput.trim()}
                  className="btn-primary px-4 disabled:opacity-50 flex items-center"
                >
                  {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                </button>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500 border-t border-white/10">
                🔒 Тикет закрыт. Создай новый для обращения.
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-12 text-center"
          >
            <Ticket className="mx-auto text-gray-500 mb-4" size={48} />
            <p className="text-xl text-gray-400 mb-2">Нет открытых тикетов</p>
            <p className="text-gray-500 mb-6">Создай тикет чтобы обратиться к администрации</p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus size={18} />
              Создать тикет
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TicketsPage;

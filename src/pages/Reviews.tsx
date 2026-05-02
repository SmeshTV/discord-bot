import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, Send, ThumbsUp, Trash2, AlertTriangle,
  Filter, ChevronDown, MessageSquare, Calendar
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { addToast } from '../components/NotificationToast';

interface Review {
  id: string;
  user_id: string;
  username: string;
  avatar: string;
  rating: number;
  text: string;
  likes: string[];
  created_at: string;
}

const ReviewsPage = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newText, setNewText] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [filter, setFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');
  const [showForm, setShowForm] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(true);

  // Загрузка отзывов из Supabase
  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Reviews load error:', error);
    }

    setReviews(data || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user) {
      addToast({ title: 'Требуется авторизация', message: 'Войди через Discord', icon: '🔒', duration: 4000 });
      return;
    }
    if (!newText.trim()) {
      addToast({ title: 'Ошибка', message: 'Напиши текст отзыва', icon: '⚠️', duration: 3000 });
      return;
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert([{
        user_id: user.id,
        username: user.username,
        avatar: user.username.charAt(0).toUpperCase(),
        rating: newRating,
        text: newText.trim(),
        likes: [],
      }])
      .select()
      .single();

    if (error) {
      addToast({ title: 'Ошибка', message: 'Не удалось опубликовать', icon: '❌', duration: 4000 });
      return;
    }

    setReviews(prev => [data, ...prev]);
    setNewText('');
    setNewRating(5);
    setShowForm(false);

    addToast({ title: 'Отзыв опубликован! ✅', message: 'Спасибо за твой отзыв!', icon: '⭐', duration: 4000 });
  };

  const handleLike = async (reviewId: string) => {
    if (!user) {
      addToast({ title: 'Требуется авторизация', message: 'Войди через Discord', icon: '🔒', duration: 4000 });
      return;
    }

    const review = reviews.find(r => r.id === reviewId);
    if (!review) return;

    const liked = review.likes.includes(user.id);
    const newLikes = liked
      ? review.likes.filter((id: string) => id !== user.id)
      : [...review.likes, user.id];

    const { error } = await supabase
      .from('reviews')
      .update({ likes: newLikes })
      .eq('id', reviewId);

    if (error) return;

    setReviews(prev => prev.map(r =>
      r.id === reviewId ? { ...r, likes: newLikes } : r
    ));
  };

  const handleDelete = async (reviewId: string) => {
    if (!user) return;
    const review = reviews.find(r => r.id === reviewId);
    if (!review) return;

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (error) return;

    setReviews(prev => prev.filter(r => r.id !== reviewId));
    addToast({ title: 'Отзыв удалён', message: 'Отзыв успешно удалён', icon: '🗑️', duration: 3000 });
  };

  const handleReport = () => {
    addToast({ title: 'Жалоба отправлена', message: 'Администрация рассмотрит отзыв', icon: '📋', duration: 3000 });
  };

  // Фильтрация
  const filteredReviews = reviews.filter(r => {
    if (filter === 'all') return true;
    return r.rating === parseInt(filter);
  });

  // Сортировка
  const sortedReviews = [...filteredReviews].sort((a, b) => {
    switch (sortBy) {
      case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'popular': return b.likes.length - a.likes.length;
      default: return 0;
    }
  });

  // Статистика
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  const totalLikes = reviews.reduce((sum, r) => sum + r.likes.length, 0);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'только что';
    if (mins < 60) return `${mins} мин. назад`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ч. назад`;
    return `${Math.floor(hours / 24)} дн. назад`;
  };

  if (loading) {
    return (
      <div className="pt-24 pb-20 px-4 flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Загрузка отзывов...</div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Заголовок */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-5xl font-bold gradient-text mb-4">⭐ Отзывы игроков</h1>
          <p className="text-gray-400 text-lg">Поделись своим мнением о сервере LOLA</p>
        </motion.div>

        {/* Статистика */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 mb-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-mushroom-neon">{reviews.length}</div>
              <div className="text-gray-400 text-sm">Отзывов</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-400 flex items-center justify-center gap-1">
                {avgRating.toFixed(1)}
                <Star size={20} className="fill-yellow-400 text-yellow-400" />
              </div>
              <div className="text-gray-400 text-sm">Средний рейтинг</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-pink-400">{totalLikes}</div>
              <div className="text-gray-400 text-sm">Лайков</div>
            </div>
          </div>
        </motion.div>

        {/* Кнопка написать отзыв */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
          {!showForm ? (
            <button
              onClick={() => {
                if (!user) {
                  addToast({ title: 'Требуется авторизация', message: 'Войди через Discord', icon: '🔒', duration: 4000 });
                  return;
                }
                setShowForm(true);
              }}
              className="w-full glass-card p-6 flex items-center gap-4 card-hover text-left"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-mushroom-neon/20 to-mushroom-purple/20 flex items-center justify-center">
                <MessageSquare size={24} className="text-mushroom-neon" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">Написать отзыв</h3>
                <p className="text-gray-400 text-sm">Поделись своим мнением о сервере</p>
              </div>
            </button>
          ) : (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-300">Твоя оценка</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => setNewRating(star)} className="transition-transform hover:scale-110">
                      <Star size={32} className={star <= newRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'} />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={newText}
                onChange={e => setNewText(e.target.value)}
                placeholder="Расскажи о своём опыте на сервере..."
                rows={4}
                maxLength={500}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-mushroom-neon focus:outline-none focus:ring-2 focus:ring-mushroom-neon/20 transition-all resize-none text-white placeholder-gray-500"
              />
              <div className="text-right text-xs text-gray-500 mt-1">{newText.length}/500</div>

              <div className="flex gap-3 mt-4">
                <button onClick={handleSubmit} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Send size={18} /> Опубликовать
                </button>
                <button onClick={() => { setShowForm(false); setNewText(''); setNewRating(5); }} className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
                  Отмена
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Фильтры */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-wrap gap-3 mb-6">
          <div className="relative">
            <button onClick={() => setShowFilter(!showFilter)} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 hover:bg-white/10">
              <Filter size={14} />
              {filter === 'all' ? 'Все' : `${filter} ★`}
              <ChevronDown size={14} className={`transition-transform ${showFilter ? 'rotate-180' : ''}`} />
            </button>
            {showFilter && (
              <div className="absolute top-full left-0 mt-2 py-2 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl z-10">
                {[{ value: 'all', label: 'Все' }, { value: '5', label: '★★★★★' }, { value: '4', label: '★★★★' }, { value: '3', label: '★★★' }, { value: '2', label: '★★' }, { value: '1', label: '★' }].map(opt => (
                  <button key={opt.value} onClick={() => { setFilter(opt.value as typeof filter); setShowFilter(false); }}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-white/5 ${filter === opt.value ? 'text-mushroom-neon' : 'text-gray-300'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {[{ value: 'newest', label: 'Новые' }, { value: 'oldest', label: 'Старые' }, { value: 'popular', label: 'Популярные' }].map(opt => (
              <button key={opt.value} onClick={() => setSortBy(opt.value as typeof sortBy)}
                className={`px-3 py-2 rounded-xl text-sm transition-all ${sortBy === opt.value ? 'bg-mushroom-neon/20 text-mushroom-neon border border-mushroom-neon/30' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Список отзывов */}
        <AnimatePresence mode="wait">
          <motion.div key={filter + sortBy} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {sortedReviews.length > 0 ? sortedReviews.map((review, index) => {
              const isOwner = user && review.user_id === user.id;
              const isLiked = user && review.likes.includes(user.id);

              return (
                <motion.div key={review.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="glass-card p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-mushroom-neon/20 to-mushroom-purple/20 flex items-center justify-center text-sm font-bold">{review.avatar}</div>
                      <div>
                        <h4 className="font-bold text-sm">{review.username}</h4>
                        <div className="flex items-center gap-1 text-xs text-gray-500"><Calendar size={10} />{timeAgo(review.created_at)}</div>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} size={14} className={star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'} />
                      ))}
                    </div>
                  </div>

                  <p className="text-gray-300 text-sm leading-relaxed mb-4">{review.text}</p>

                  <div className="flex items-center gap-4">
                    <button onClick={() => handleLike(review.id)} className={`flex items-center gap-1.5 text-sm transition-colors ${isLiked ? 'text-mushroom-neon' : 'text-gray-500 hover:text-gray-300'}`}>
                      <ThumbsUp size={14} />
                      {review.likes.length > 0 && <span>{review.likes.length}</span>}
                    </button>
                    {isOwner && (
                      <button onClick={() => handleDelete(review.id)} className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors">
                        <Trash2 size={14} /> Удалить
                      </button>
                    )}
                    {!isOwner && (
                      <button onClick={handleReport} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-yellow-400 transition-colors">
                        <AlertTriangle size={14} /> Жалоба
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            }) : (
              <div className="text-center py-16">
                <MessageSquare size={48} className="mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400 text-lg">Нет отзывов с таким фильтром</p>
                <button onClick={() => { setFilter('all'); setSortBy('newest'); }} className="mt-4 text-mushroom-neon hover:underline text-sm">Сбросить фильтры</button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default memo(ReviewsPage);

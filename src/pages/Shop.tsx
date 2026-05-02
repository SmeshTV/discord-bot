import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Crown, Palette, Trophy, Zap, Flame, Shield, Gift, Clock, Image, Frame, CheckCircle, XCircle, Target } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { getCached, setCached } from '../lib/cache';
import Skeleton from '../components/Skeleton';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: typeof Crown;
  emoji: string;
  rarity: 'legendary' | 'epic' | 'rare';
  category: 'role' | 'boost' | 'customization' | 'casino' | 'premium' | 'tournament';
}

const SHOP_ITEMS: ShopItem[] = [
  // ===== Роли Discord (сложно реализовать — дорого) =====
  {
    id: 'vip-role',
    name: 'VIP Роль',
    description: 'Эксклюзивный доступ к VIP-зоне. Общение со стаффом! (90 дней)',
    price: 800,
    icon: Crown,
    emoji: '👑',
    rarity: 'legendary',
    category: 'role',
  },
  {
    id: 'custom-color',
    name: 'Переливающийся ник',
    description: 'Выбери 2 цвета — ник переливается в Discord! (90 дней, макс. 50 чел.)',
    price: 1200,
    icon: Palette,
    emoji: '🎨',
    rarity: 'legendary',
    category: 'role',
  },
  {
    id: 'tournament-reserve',
    name: 'Резерв на турнир',
    description: 'Ранняя регистрация на турниры (30 дней)',
    price: 250,
    icon: Trophy,
    emoji: '🏆',
    rarity: 'epic',
    category: 'tournament',
  },
  // ===== XP бусты =====
  {
    id: 'xp-boost-x2',
    name: 'XP Буст x2 (12ч)',
    description: 'Прокачка в Discord в 2 раза быстрее на 12 часов',
    price: 350,
    icon: Zap,
    emoji: '⚡',
    rarity: 'epic',
    category: 'boost',
  },
  {
    id: 'xp-boost-x3',
    name: 'XP Буст x3 (12ч)',
    description: 'Мощный спринт — x3 XP на 12 часов',
    price: 450,
    icon: Flame,
    emoji: '🔥',
    rarity: 'legendary',
    category: 'boost',
  },
  // ===== Рамки (покупаются навсегда) =====
  {
    id: 'frame-bronze',
    name: 'Рамка аватара 🥉',
    description: 'Бронзовая рамка для аватара в профиле. Открывает магазин кастомизации!',
    price: 250,
    icon: Frame,
    emoji: '🥉',
    rarity: 'rare',
    category: 'customization',
  },
  {
    id: 'frame-silver',
    name: 'Рамка аватара 🥈',
    description: 'Серебряная анимированная рамка. Открывает Tier 2 предметы!',
    price: 500,
    icon: Frame,
    emoji: '🥈',
    rarity: 'epic',
    category: 'customization',
  },
  {
    id: 'frame-gold',
    name: 'Рамка аватара 🥇',
    description: 'Золотая рамка с эффектом частиц. Только #1 в лидерборде!',
    price: 1000,
    icon: Frame,
    emoji: '🥇',
    rarity: 'legendary',
    category: 'customization',
  },
  // ===== Казино-бонусы =====
  {
    id: 'insurance',
    name: 'Страховка (24ч)',
    description: 'Возврат 30% грибов при проигрыше в играх. Действует 24 часа.',
    price: 300,
    icon: Shield,
    emoji: '🛡️',
    rarity: 'epic',
    category: 'casino',
  },
  {
    id: 'lucky-hour',
    name: 'Удачный час',
    description: '+30% к шансу победы в казино на 60 минут!',
    price: 500,
    icon: Clock,
    emoji: '🍀',
    rarity: 'legendary',
    category: 'casino',
  },
  // ===== Премиум =====
  {
    id: 'lootbox',
    name: 'Грибной лутбокс',
    description: 'Случайный предмет из магазина! Может выпасть что угодно...',
    price: 850,
    icon: Gift,
    emoji: '🎁',
    rarity: 'legendary',
    category: 'premium',
  },
];

const Shop = () => {
  const { user, refreshUser } = useAuth();
  const [purchased, setPurchased] = useState<string[]>(() => getCached('shop_purchases') || []);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('default');
  const [rainbowModal, setRainbowModal] = useState<{ open: boolean; item: ShopItem | null; editMode: boolean }>({ open: false, item: null, editMode: false });
  const [color1, setColor1] = useState('#FF5733');
  const [color2, setColor2] = useState('#33FF57');
  const [rainbowLimitReached, setRainbowLimitReached] = useState(false);
  const [isTopOne, setIsTopOne] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);

  const balance = user?.mushrooms ?? 0;

  // Загружаем текущие цвета пользователя
  useEffect(() => {
    if (!user) return;
    if (user.rainbow_color1) setColor1(user.rainbow_color1);
    if (user.rainbow_color2) setColor2(user.rainbow_color2);
  }, [user]);

  // Проверяем позицию в лидерборде
  useEffect(() => {
    if (!user) return;
    const checkRank = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, mushrooms')
        .order('mushrooms', { ascending: false });
      if (data && !error) {
        const rank = data.findIndex(u => u.id === user.id) + 1;
        setUserRank(rank > 0 ? rank : null);
        setIsTopOne(rank === 1);
      }
    };
    checkRank();
  }, [user]);

  const CATEGORIES = [
    { id: 'all', name: 'Все', emoji: '🛒' },
    { id: 'role', name: 'Роли', emoji: '🎭' },
    { id: 'tournament', name: 'Турниры', emoji: '🏆' },
    { id: 'boost', name: 'Бусты', emoji: '⚡' },
    { id: 'customization', name: 'Кастомизация', emoji: '🎨' },
    { id: 'casino', name: 'Казино', emoji: '🎰' },
    { id: 'premium', name: 'Премиум', emoji: '💎' },
  ];

  const RARITY_ORDER = { legendary: 0, epic: 1, rare: 2 };

  const getFilteredAndSortedItems = () => {
    let items = selectedCategory === 'all'
      ? SHOP_ITEMS
      : SHOP_ITEMS.filter(item => item.category === selectedCategory);

    switch (sortBy) {
      case 'price-asc':
        items = [...items].sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        items = [...items].sort((a, b) => b.price - a.price);
        break;
      case 'rarity':
        items = [...items].sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);
        break;
      case 'name':
        items = [...items].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
        break;
      default:
        break;
    }

    return items;
  };

  const filteredItems = getFilteredAndSortedItems();

  // Загружаем покупки пользователя
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadPurchases = async () => {
      setLoading(true);

      // Загружаем только активные (не просроченные) покупки
      const { data } = await supabase
        .from('shop_purchases')
        .select('item_id, expires_at')
        .eq('user_id', user.id);

      if (data) {
        // Фильтруем: только не просроченные покупки
        const now = new Date();
        const activePurchases = data.filter(p => {
          if (!p.expires_at) return true; // без срока — активна навсегда
          return new Date(p.expires_at) > now;
        });

        const ids = activePurchases.map(p => p.item_id);
        setPurchased(ids);
        setCached('shop_purchases', ids);
      }
      setLoading(false);
    };

    loadPurchases();
  }, [user]);

  const handlePurchase = async (itemId: string, price: number) => {
    if (!user) return;
    if (purchased.includes(itemId)) return;
    if (balance < price) {
      setResult({ success: false, message: 'Недостаточно грибов' });
      return;
    }

    // XP Буст x3 требует купленный x2
    if (itemId === 'xp-boost-x3' && !purchased.includes('xp-boost-x2')) {
      setResult({ success: false, message: '⚡ Сначала купи XP Буст x2! Нужен x2 чтобы купить x3.' });
      return;
    }

    // Рамка Серебро требует купленную Бронзу
    if (itemId === 'frame-silver' && !purchased.includes('frame-bronze')) {
      setResult({ success: false, message: '🥉 Сначала купи бронзовую рамку! Нужно 🥉 → 🥈 → 🥇.' });
      return;
    }

    // Рамка Золото требует купленную Серебро + топ-1
    if (itemId === 'frame-gold') {
      if (!purchased.includes('frame-silver')) {
        setResult({ success: false, message: '🥈 Сначала купи серебряную рамку! Нужно 🥉 → 🥈 → 🥇.' });
        return;
      }
      if (!isTopOne) {
        setResult({ success: false, message: `🥇 Золотая рамка доступна только #1 в лидерборде! Ты сейчас #${userRank}.` });
        return;
      }
    }

    // Custom color требует модалку с выбором цветов
    if (itemId === 'custom-color') {
      const item = SHOP_ITEMS.find(i => i.id === itemId);
      if (!item) return;
      setRainbowModal({ open: true, item });
      return;
    }

    setPurchasing(itemId);
    setResult(null);

    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return;

    // Рассчитываем срок действия
    let expiresAt: string | null = null;
    if (itemId === 'xp-boost-x2' || itemId === 'xp-boost-x3') {
      const d = new Date(); d.setHours(d.getHours() + 12); expiresAt = d.toISOString();
    } else if (itemId === 'vip-role') {
      const d = new Date(); d.setDate(d.getDate() + 30); expiresAt = d.toISOString();
    } else if (itemId === 'custom-color') {
      const d = new Date(); d.setDate(d.getDate() + 90); expiresAt = d.toISOString();
    } else if (itemId === 'tournament-reserve') {
      const d = new Date(); d.setDate(d.getDate() + 30); expiresAt = d.toISOString();
    } else if (itemId === 'insurance') {
      const d = new Date(); d.setHours(d.getHours() + 24); expiresAt = d.toISOString();
    } else if (itemId === 'lucky-hour') {
      const d = new Date(); d.setHours(d.getHours() + 1); expiresAt = d.toISOString();
    }
    // Кастомизации, рамки, резерв, лутбокс — навсегда (без expires_at)

    // ЛУТБОКС — сразу выдаём случайный предмет!
    if (itemId === 'lootbox') {
      return await handleLootboxPurchase();
    }

    // Записываем покупку
    const purchaseData = {
      user_id: user.id,
      item_id: itemId,
      item_name: item.name,
      price,
    };
    if (expiresAt) {
      purchaseData.expires_at = expiresAt;
    }

    const { error: purchaseError } = await supabase
      .from('shop_purchases')
      .insert([purchaseData]);

    if (purchaseError) {
      setResult({ success: false, message: 'Ошибка покупки. Попробуйте снова.' });
      setPurchasing(null);
      return;
    }

    // Списываем грибы и сохраняем рамку
    const updateData = {
      mushrooms: balance - price,
      updated_at: new Date().toISOString(),
    };
    if (itemId === 'frame-bronze' || itemId === 'frame-silver' || itemId === 'frame-gold') {
      updateData.avatar_frame = itemId;
    }
    if (itemId === 'vip-role') {
      updateData.is_vip = true;
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      setResult({ success: false, message: 'Ошибка списания грибов. Попробуйте снова.' });
      setPurchasing(null);
      return;
    }

    setPurchased([...purchased, itemId]);
    setCached('shop_purchases', [...purchased, itemId]);
    await refreshUser();
    setResult({ success: true, message: `Вы купили "${item.name}"!` });
    setPurchasing(null);
  };

  // ===== ЛУТБОКС =====
  const handleLootboxPurchase = async () => {
    if (!user) return;
    if (balance < 850) {
      setResult({ success: false, message: 'Недостаточно грибов!' });
      return;
    }

    setPurchasing('lootbox');

    // Записываем покупку лутбокса
    const { error: lootError } = await supabase
      .from('shop_purchases')
      .insert([{ user_id: user.id, item_id: 'lootbox', item_name: 'Грибной лутбокс', price: 850 }]);

    if (lootError) {
      setResult({ success: false, message: 'Ошибка открытия лутбокса!' });
      setPurchasing(null);
      return;
    }

    // Определяем доступные предметы по тиеру
    let maxTier = 0;
    if (purchased.includes('frame-bronze')) maxTier = 1;
    if (purchased.includes('frame-silver')) maxTier = 2;
    if (purchased.includes('frame-gold')) maxTier = 3;

    // Все предметы кроме лутбокса, фильтруем по тиеру
    const availableRewards = SHOP_ITEMS.filter(i => {
      if (i.id === 'lootbox') return false;
      if (i.category === 'customization') {
        // Кастомизации из магазина — только если tier разблокирован
        if (i.price <= 200) return maxTier >= 1; // Tier 1
        if (i.price <= 400) return maxTier >= 2; // Tier 2
        return maxTier >= 3; // Tier 3
      }
      // Остальные предметы всегда доступны
      return true;
    });

    const reward = availableRewards[Math.floor(Math.random() * availableRewards.length)];

    // Выдаём предмет (навсегда)
    const { error: rewardError } = await supabase
      .from('shop_purchases')
      .insert([{ user_id: user.id, item_id: reward.id, item_name: reward.name + ' (лутбокс)', price: 0 }]);

    // Списываем грибы
    await supabase.from('users').update({ mushrooms: balance - 850, updated_at: new Date().toISOString() }).eq('id', user.id);

    // Обновляем рамку если выпала
    if (reward.id === 'frame-bronze' || reward.id === 'frame-silver' || reward.id === 'frame-gold') {
      await supabase.from('users').update({ avatar_frame: reward.id }).eq('id', user.id);
    }

    if (rewardError) {
      setResult({ success: true, message: `🎁 Лутбокс: ${reward.emoji} ${reward.name}!` });
    } else {
      setResult({ success: true, message: `🎁 ЛУТБОКС! Вам выпало: ${reward.emoji} ${reward.name}!` });
    }

    setPurchased([...purchased, reward.id]);
    await refreshUser();
    setPurchasing(null);
  };

  const handleRainbowPurchase = async () => {
    if (!user || !rainbowModal.item) return;

    setPurchasing('custom-color');
    setResult(null);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Записываем покупку с цветами
    const { error: purchaseError } = await supabase
      .from('shop_purchases')
      .insert([{
        user_id: user.id,
        item_id: 'custom-color',
        item_name: rainbowModal.item.name,
        price: rainbowModal.item.price,
        expires_at: expiresAt.toISOString(),
      }]);

    if (purchaseError) {
      setResult({ success: false, message: 'Ошибка покупки. Попробуйте снова.' });
      setPurchasing(null);
      setRainbowModal({ open: false, item: null });
      return;
    }

    // Сохраняем цвета в users
    const { error: updateError } = await supabase
      .from('users')
      .update({
        mushrooms: balance - rainbowModal.item.price,
        rainbow_color1: color1,
        rainbow_color2: color2,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      setResult({ success: false, message: 'Ошибка сохранения. Попробуйте снова.' });
      setPurchasing(null);
      setRainbowModal({ open: false, item: null });
      return;
    }

    setPurchased([...purchased, 'custom-color']);
    setCached('shop_purchases', [...purchased, 'custom-color']);
    await refreshUser();
    setResult({ success: true, message: `🎨 Переливающийся ник активирован! Цвета: ${color1} → ${color2}. Бот применит их в течение 5 минут.` });
    setPurchasing(null);
    setRainbowModal({ open: false, item: null });
  };

  const handleUpdateRainbowColors = async () => {
    if (!user) return;

    setPurchasing('custom-color');
    setResult(null);

    // Обновляем цвета в БД
    const { error: updateError } = await supabase
      .from('users')
      .update({
        rainbow_color1: color1,
        rainbow_color2: color2,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      setResult({ success: false, message: 'Ошибка сохранения. Попробуйте снова.' });
      setPurchasing(null);
      setRainbowModal({ open: false, item: null });
      return;
    }

    await refreshUser();
    setResult({ success: true, message: `🎨 Цвета обновлены! Бот применит новые цвета в течение 5 минут.` });
    setPurchasing(null);
    setRainbowModal({ open: false, item: null });
  };

  const openRainbowEditor = () => {
    const item = SHOP_ITEMS.find(i => i.id === 'custom-color');
    if (!item) return;
    setRainbowModal({ open: true, item, editMode: true });
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'from-yellow-500 to-orange-500 border-yellow-500';
      case 'epic':
        return 'from-purple-500 to-pink-500 border-purple-500';
      case 'rare':
        return 'from-blue-500 to-cyan-500 border-blue-500';
      default:
        return 'from-gray-500 to-gray-600 border-gray-500';
    }
  };

  if (!user) {
    return (
      <div className="pt-24 pb-20 px-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-2xl text-gray-400 mb-4">Войдите через Discord для просмотра магазина</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-5xl font-bold gradient-text mb-2">🛒 Магазин</h1>
          <p className="text-gray-400">Потрать свои грибы на крутые предметы!</p>
        </motion.div>

        {/* Balance Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-6 mb-8 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <ShoppingBag className="text-mushroom-neon" size={32} />
            <div>
              <p className="text-gray-400">Твой баланс</p>
              <p className="text-3xl font-bold text-mushroom-neon">{balance} 🍄</p>
            </div>
          </div>
          {purchased.includes('custom-color') && user?.rainbow_color1 && (
            <button
              onClick={openRainbowEditor}
              className="px-4 py-2 rounded-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 transition-all"
            >
              🎨 Настроить цвета
            </button>
          )}
        </motion.div>

        {/* Category Filter & Sort */}
        <div className="flex flex-wrap gap-2 mb-6 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl font-bold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-mushroom-neon text-black'
                    : 'glass-card text-gray-400 hover:text-white'
                }`}
              >
                {cat.emoji} {cat.name}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Сортировка:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="glass-card px-3 py-2 rounded-xl text-sm text-gray-300 bg-transparent border border-gray-600 cursor-pointer focus:outline-none focus:border-mushroom-neon"
            >
              <option value="default" className="bg-gray-800">По умолчанию</option>
              <option value="price-asc" className="bg-gray-800">💰 Цена: по возрастанию</option>
              <option value="price-desc" className="bg-gray-800">💰 Цена: по убыванию</option>
              <option value="rarity" className="bg-gray-800">⭐ По редкости</option>
              <option value="name" className="bg-gray-800">🔤 По названию</option>
            </select>
          </div>
        </div>

        {/* Result Message */}
        <AnimatePresence>
          {result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex items-center gap-2 p-4 mb-6 rounded-xl ${
                result.success
                  ? 'bg-green-500/10 border border-green-500/30 text-green-500'
                  : 'bg-red-500/10 border border-red-500/30 text-red-500'
              }`}
            >
              {result.success ? <CheckCircle /> : <XCircle />}
              <span>{result.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rainbow Name Modal */}
        <AnimatePresence>
          {rainbowModal.open && rainbowModal.item && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
              onClick={() => setRainbowModal({ open: false, item: null })}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-card p-8 max-w-md w-full"
              >
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">🎨</div>
                  <h2 className="text-2xl font-bold mb-2">Переливающийся ник</h2>
                  <p className="text-gray-400 text-sm">Выбери 2 цвета для ника</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Цвет 1</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={color1}
                        onChange={(e) => setColor1(e.target.value)}
                        className="w-12 h-12 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={color1}
                        onChange={(e) => setColor1(e.target.value)}
                        className="flex-1 bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Цвет 2</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={color2}
                        onChange={(e) => setColor2(e.target.value)}
                        className="w-12 h-12 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={color2}
                        onChange={(e) => setColor2(e.target.value)}
                        className="flex-1 bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-black/30 rounded-xl p-4 mb-6 text-center">
                  <p className="text-xs text-gray-400 mb-2">Превью ника:</p>
                  <p
                    className="text-xl font-bold"
                    style={{
                      background: `linear-gradient(90deg, ${color1}, ${color2})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {user?.username || 'Никнейм'}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setRainbowModal({ open: false, item: null })}
                    className="flex-1 py-3 rounded-xl font-bold bg-gray-700 hover:bg-gray-600 transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={rainbowModal.editMode ? handleUpdateRainbowColors : handleRainbowPurchase}
                    disabled={purchasing !== null}
                    className="flex-1 py-3 rounded-xl font-bold btn-primary disabled:opacity-50"
                  >
                    {purchasing === 'custom-color'
                      ? 'Сохранение...'
                      : rainbowModal.editMode
                      ? '💾 Сохранить цвета'
                      : `Купить за ${rainbowModal.item.price} 🍄`}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Items Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton variant="card" count={6} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item, index) => {
              const isPurchased = purchased.includes(item.id);
              const canAfford = balance >= item.price;

              // Проверки блокировок
              let isLocked = false;
              let lockReason = '';

              if (item.id === 'xp-boost-x3' && !purchased.includes('xp-boost-x2')) {
                isLocked = true;
                lockReason = '⚡ Нужен XP Буст x2';
              }
              if (item.id === 'frame-silver' && !purchased.includes('frame-bronze')) {
                isLocked = true;
                lockReason = '🥉 Нужна бронзовая рамка';
              }
              if (item.id === 'frame-gold' && (!purchased.includes('frame-silver') || !isTopOne)) {
                isLocked = true;
                lockReason = purchased.includes('frame-silver') ? `🥇 Нужно быть #1 (сейчас #${userRank})` : '🥈 Нужна серебряная рамка';
              }

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`glass-card p-6 card-hover border-2 flex flex-col ${
                    isPurchased ? 'border-mushroom-neon' : 'border-transparent'
                  }`}
                >
                  <div className="text-center flex flex-col flex-1">
                    <div className="text-6xl mb-4">{item.emoji}</div>
                    <div className="flex justify-center mb-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${getRarityColor(
                          item.rarity
                        )} text-white`}
                      >
                        {item.rarity.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                    <p className="text-gray-400 text-sm mb-4 flex-1">{item.description}</p>

                    <div className="flex items-center justify-center gap-3 mb-4">
                      <span className="text-2xl font-bold text-mushroom-neon">
                        {item.price} 🍄
                      </span>
                      {isPurchased && (
                        <span className="text-green-500 font-bold">✓ Куплено</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handlePurchase(item.id, item.price)}
                    disabled={isPurchased || !canAfford || purchasing !== null || isLocked}
                    className={`w-full py-3 rounded-xl font-bold transition-all ${
                      isPurchased
                        ? 'bg-gray-700 cursor-not-allowed'
                        : isLocked
                        ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 cursor-not-allowed'
                        : canAfford
                        ? 'btn-primary'
                        : 'bg-gray-700 cursor-not-allowed opacity-50'
                    } disabled:opacity-50`}
                  >
                    {purchasing === item.id
                      ? 'Покупка...'
                      : isPurchased
                      ? '✓ Куплено'
                      : isLocked
                      ? '🔒 ' + lockReason
                      : canAfford
                      ? 'Купить'
                      : 'Недостаточно грибов'}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Shop;

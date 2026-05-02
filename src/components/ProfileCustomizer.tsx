import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Image, Tag, Sparkles, Palette, Flame, Crown, Save, Lock, Star, Zap, Shield, Wand2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { User } from '../lib/database';

interface ProfileCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdate: () => void;
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: typeof Star;
  emoji: string;
  tier: 1 | 2 | 3;
  type: 'avatar' | 'badge' | 'effect' | 'banner' | 'crown' | 'frame';
}

const SHOP_ITEMS: ShopItem[] = [
  // ===== TIER 1 (после рамки 🥉) =====
  {
    id: 'custom-avatar',
    name: 'Своя аватарка',
    description: 'URL изображения для профиля',
    price: 150,
    icon: Image,
    emoji: '🖼️',
    tier: 1,
    type: 'avatar',
  },
  {
    id: 'custom-badge',
    name: 'Личный бейдж',
    description: 'Эмодзи + текст под именем',
    price: 100,
    icon: Tag,
    emoji: '🏷️',
    tier: 1,
    type: 'badge',
  },
  {
    id: 'avatar-effect-sparkles',
    name: 'Искорки',
    description: 'Мерцание вокруг аватара',
    price: 200,
    icon: Sparkles,
    emoji: '✨',
    tier: 1,
    type: 'effect',
  },

  // ===== TIER 2 (после рамки 🥈) =====
  {
    id: 'profile-banner',
    name: 'Баннер профиля',
    description: 'Фон в шапке профиля (URL)',
    price: 300,
    icon: Palette,
    emoji: '🎭',
    tier: 2,
    type: 'banner',
  },
  {
    id: 'avatar-effect-fire',
    name: 'Огонь',
    description: 'Пламя вокруг аватара',
    price: 350,
    icon: Flame,
    emoji: '🔥',
    tier: 2,
    type: 'effect',
  },
  {
    id: 'crown-badge',
    name: 'Корона',
    description: 'Корона над аватаром',
    price: 400,
    icon: Crown,
    emoji: '👑',
    tier: 2,
    type: 'crown',
  },

  // ===== TIER 3 (после рамки 🥇) =====
  {
    id: 'avatar-effect-void',
    name: 'Пустота',
    description: 'Тёмная аура поглощающая свет',
    price: 500,
    icon: Shield,
    emoji: '🌑',
    tier: 3,
    type: 'effect',
  },
  {
    id: 'avatar-effect-rune',
    name: 'Руны',
    description: 'Древние руны вращаются вокруг аватара',
    price: 600,
    icon: Wand2,
    emoji: '🔮',
    tier: 3,
    type: 'effect',
  },
  {
    id: 'profile-banner-animated',
    name: 'Живой баннер',
    description: 'Анимированный баннер с эффектом частиц',
    price: 700,
    icon: Zap,
    emoji: '⚡',
    tier: 3,
    type: 'banner',
  },
];

const TIER_INFO = {
  1: { label: 'Начало', emoji: '🥉', desc: 'Открыто с бронзовой рамкой' },
  2: { label: 'Сила', emoji: '🥈', desc: 'Открыто с серебряной рамкой' },
  3: { label: 'Тьма', emoji: '🥇', desc: 'Открыто с золотой рамкой' },
};

const TIER_COLORS = {
  1: 'from-amber-600 to-amber-800',
  2: 'from-gray-300 to-gray-500',
  3: 'from-yellow-400 to-amber-500',
};

const ProfileCustomizer = ({ isOpen, onClose, user, onUpdate }: ProfileCustomizerProps) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'shop'>('shop');
  const [purchased, setPurchased] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [customAvatarUrl, setCustomAvatarUrl] = useState(user.custom_avatar_url || '');
  const [customBadgeText, setCustomBadgeText] = useState(user.custom_badge_text || '');
  const [customBadgeEmoji, setCustomBadgeEmoji] = useState(user.custom_badge_emoji || '');
  const [profileBannerUrl, setProfileBannerUrl] = useState(user.profile_banner_url || '');
  const [avatarEffect, setAvatarEffect] = useState(user.avatar_effect || 'none');
  const [hasCrown, setHasCrown] = useState(user.has_crown || false);
  const [activeFrame, setActiveFrame] = useState(user.avatar_frame || null);

  const [maxTier, setMaxTier] = useState(1);
  const balance = user?.mushrooms ?? 0;

  useEffect(() => {
    if (!isOpen || !user) return;
    
    const loadData = async () => {
      setLoading(true);
      const { data: purchases } = await supabase
        .from('shop_purchases')
        .select('item_id')
        .eq('user_id', user.id);

      const ids = purchases ? purchases.map(p => p.item_id) : [];
      setPurchased(ids);

      // Определяем максимальный tier по рамкам
      let tier = 0;
      if (ids.includes('frame-bronze')) tier = 1;
      if (ids.includes('frame-silver')) tier = 2;
      if (ids.includes('frame-gold')) tier = 3;
      setMaxTier(tier);

      setCustomAvatarUrl(user.custom_avatar_url || '');
      setCustomBadgeText(user.custom_badge_text || '');
      setCustomBadgeEmoji(user.custom_badge_emoji || '');
      setProfileBannerUrl(user.profile_banner_url || '');
      setAvatarEffect(user.avatar_effect || 'none');
      setHasCrown(user.has_crown || false);
      setActiveFrame(user.avatar_frame || null);
      
      setLoading(false);
    };
    loadData();
  }, [isOpen, user]);

  const handlePurchase = async (item: ShopItem) => {
    if (purchased.includes(item.id)) return;
    if (balance < item.price) {
      setResult({ success: false, message: 'Недостаточно грибов!' });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('shop_purchases')
      .insert([{
        user_id: user.id,
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        // без expires_at = навсегда
      }]);

    if (error) {
      setResult({ success: false, message: 'Ошибка покупки!' });
      setSaving(false);
      return;
    }

    await supabase
      .from('users')
      .update({ mushrooms: balance - item.price, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    setPurchased([...purchased, item.id]);
    setResult({ success: true, message: `${item.emoji} ${item.name} куплено навсегда!` });
    setSaving(false);
    onUpdate();
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    const updateData: { [key: string]: any } = { updated_at: new Date().toISOString() };

    if (customAvatarUrl && purchased.includes('custom-avatar')) updateData.custom_avatar_url = customAvatarUrl;
    if (purchased.includes('custom-badge')) {
      updateData.custom_badge_text = customBadgeText;
      updateData.custom_badge_emoji = customBadgeEmoji;
    }
    if (profileBannerUrl && purchased.includes('profile-banner')) updateData.profile_banner_url = profileBannerUrl;
    if (purchased.includes('avatar-effect-sparkles') || purchased.includes('avatar-effect-fire') || purchased.includes('avatar-effect-void') || purchased.includes('avatar-effect-rune')) {
      updateData.avatar_effect = avatarEffect;
    }
    if (purchased.includes('crown-badge')) updateData.has_crown = hasCrown;
    if (activeFrame) updateData.avatar_frame = activeFrame;

    const { error } = await supabase.from('users').update(updateData).eq('id', user.id);

    if (error) {
      setResult({ success: false, message: 'Ошибка сохранения!' });
      setSaving(false);
      return;
    }

    setResult({ success: true, message: 'Профиль обновлён!' });
    setSaving(false);
    onUpdate();
  };

  const ownedEffects = SHOP_ITEMS.filter(i => i.type === 'effect' && purchased.includes(i.id));
  const ownedBanners = SHOP_ITEMS.filter(i => i.type === 'banner' && purchased.includes(i.id));

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0f0f1a] border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0f0f1a]/95 backdrop-blur-xl p-6 border-b border-white/10 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-white">🎨 Магазин кастомизации</h2>
            <p className="text-sm text-gray-500">Твой баланс: <span className="text-mushroom-neon font-bold">{balance} 🍄</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4 border-b border-white/5">
          <button onClick={() => setActiveTab('shop')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'shop' ? 'bg-mushroom-neon text-black' : 'bg-white/5 text-gray-500 hover:text-white'}`}>
            🛒 Магазин
          </button>
          <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'settings' ? 'bg-mushroom-neon text-black' : 'bg-white/5 text-gray-500 hover:text-white'}`}>
            ⚙️ Мой профиль
          </button>
        </div>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`flex items-center gap-2 p-3 mx-4 mt-4 rounded-xl ${result.success ? 'bg-green-500/10 border border-green-500/30 text-green-500' : 'bg-red-500/10 border border-red-500/30 text-red-500'}`}>
              <CheckCircle size={16} /><span className="text-sm">{result.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-6">
          {/* ===== SHOP TAB ===== */}
          {activeTab === 'shop' && (
            <div className="space-y-8">
              {/* Tier Progress */}
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(tier => {
                  const unlocked = tier <= maxTier;
                  const info = TIER_INFO[tier];
                  return (
                    <div key={tier} className={`p-3 rounded-xl border text-center transition-all ${unlocked ? `bg-gradient-to-br ${TIER_COLORS[tier]} border-white/10` : 'bg-white/5 border-white/5 opacity-40'}`}>
                      <div className="text-2xl mb-1">{info.emoji}</div>
                      <div className="font-bold text-sm text-white">{info.label}</div>
                      <div className="text-xs text-white/70">{unlocked ? '✅ Открыто' : '🔒 Закрыто'}</div>
                    </div>
                  );
                })}
              </div>

              {/* Items by tier */}
              {[1, 2, 3].map(tier => {
                if (tier > maxTier) return null;
                const items = SHOP_ITEMS.filter(i => i.tier === tier);
                const info = TIER_INFO[tier];
                
                return (
                  <div key={tier}>
                    <h3 className="font-bold mb-3 flex items-center gap-2 text-white">
                      <span className="text-xl">{info.emoji}</span> {info.label}
                      <span className="text-xs text-gray-500 ml-auto">{info.desc}</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {items.map(item => {
                        const isPurchased = purchased.includes(item.id);
                        const canAfford = balance >= item.price;
                        
                        return (
                          <div key={item.id} className={`p-4 rounded-xl border flex items-center justify-between ${isPurchased ? 'border-green-500/30 bg-green-500/5' : 'border-white/10 bg-white/5'}`}>
                            <div className="flex items-center gap-3">
                              <div className="text-3xl">{item.emoji}</div>
                              <div>
                                <p className="font-bold text-sm text-white">{item.name}</p>
                                <p className="text-xs text-gray-500">{item.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              {isPurchased ? (
                                <span className="text-green-500 text-xs font-bold">✓ Куплено</span>
                              ) : (
                                <button onClick={() => handlePurchase(item)} disabled={!canAfford || saving}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${canAfford ? 'bg-mushroom-neon text-black hover:opacity-90' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}>
                                  {item.price} 🍄
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ===== SETTINGS TAB ===== */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Preview */}
              <div className="text-center p-6 bg-white/5 rounded-xl border border-white/10">
                <p className="text-sm text-gray-500 mb-4">Предпросмотр</p>
                <div className="relative inline-block">
                  {hasCrown && purchased.includes('crown-badge') && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20"><Crown size={28} className="text-yellow-400" /></div>
                  )}
                  {avatarEffect === 'sparkles' && purchased.includes('avatar-effect-sparkles') && (
                    <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-yellow-400/30 via-pink-400/30 to-purple-400/30 animate-pulse z-0" />
                  )}
                  {avatarEffect === 'fire' && purchased.includes('avatar-effect-fire') && (
                    <div className="absolute -inset-4 rounded-full bg-gradient-to-t from-orange-500/50 via-red-500/30 to-transparent animate-pulse z-0" />
                  )}
                  {(avatarEffect === 'void' && purchased.includes('avatar-effect-void')) && (
                    <div className="absolute -inset-5 rounded-full bg-gradient-to-br from-black via-gray-900 to-black animate-pulse z-0" />
                  )}
                  {(avatarEffect === 'rune' && purchased.includes('avatar-effect-rune')) && (
                    <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-purple-500/20 via-indigo-500/30 to-blue-500/20 animate-pulse z-0" />
                  )}
                  {activeFrame === 'frame-gold' && <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-500 z-0" />}
                  {activeFrame === 'frame-silver' && <div className="absolute -inset-2.5 rounded-full bg-gradient-to-br from-gray-300 via-gray-400 to-slate-400 z-0" />}
                  {activeFrame === 'frame-bronze' && <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-amber-600 via-amber-700 to-orange-800 z-0" />}
                  <div className={`relative w-24 h-24 rounded-full overflow-hidden z-10 ${activeFrame === 'frame-gold' ? 'border-4 border-yellow-400' : activeFrame === 'frame-silver' ? 'border-4 border-gray-300' : activeFrame === 'frame-bronze' ? 'border-4 border-amber-700' : 'border-4 border-mushroom-neon'}`}>
                    {customAvatarUrl && purchased.includes('custom-avatar') ? (
                      <img src={customAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-mushroom-neon to-mushroom-purple flex items-center justify-center text-3xl">{user.username.charAt(0)}</div>
                    )}
                  </div>
                </div>
                {customBadgeText && purchased.includes('custom-badge') && (
                  <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-mushroom-neon/20 border border-mushroom-neon/30 rounded-full text-sm">
                    {customBadgeEmoji && <span>{customBadgeEmoji}</span>}
                    <span className="text-mushroom-neon font-bold">{customBadgeText}</span>
                  </div>
                )}
              </div>

              {/* Avatar URL */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2 text-white"><Image size={16} className="text-mushroom-neon" /> Аватарка (URL)</label>
                <input type="text" value={customAvatarUrl} onChange={e => setCustomAvatarUrl(e.target.value)} placeholder="https://..." disabled={!purchased.includes('custom-avatar')} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm disabled:opacity-30 text-white placeholder-gray-600" />
                {!purchased.includes('custom-avatar') && <p className="text-xs text-gray-600 mt-1">🔒 Купи в магазине</p>}
              </div>

              {/* Badge */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2 text-white"><Tag size={16} className="text-mushroom-neon" /> Бейдж</label>
                <div className="flex gap-2">
                  <input type="text" value={customBadgeEmoji} onChange={e => setCustomBadgeEmoji(e.target.value)} placeholder="🎮" maxLength={2} disabled={!purchased.includes('custom-badge')} className="w-16 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-lg disabled:opacity-30 text-white" />
                  <input type="text" value={customBadgeText} onChange={e => setCustomBadgeText(e.target.value)} placeholder="Текст..." maxLength={20} disabled={!purchased.includes('custom-badge')} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm disabled:opacity-30 text-white placeholder-gray-600" />
                </div>
              </div>

              {/* Effect */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2 text-white"><Sparkles size={16} className="text-mushroom-neon" /> Эффект аватара</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[{ value: 'none', label: 'Нет', emoji: '❌', requires: null },
                    ...ownedEffects.map(e => ({ value: e.id.replace('avatar-effect-', ''), label: e.name, emoji: e.emoji, requires: e.id }))
                  ].map(effect => (
                    <button key={effect.value} onClick={() => setAvatarEffect(effect.value)}
                      className={`p-3 rounded-xl text-center transition-all ${avatarEffect === effect.value ? 'bg-mushroom-neon/20 border-2 border-mushroom-neon' : 'bg-white/5 border border-white/5 hover:bg-white/10'}`}>
                      <div className="text-xl mb-1">{effect.emoji}</div>
                      <div className="text-xs text-white">{effect.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Crown */}
              {purchased.includes('crown-badge') && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold mb-2 text-white"><Crown size={16} className="text-yellow-400" /> Корона</label>
                  <button onClick={() => setHasCrown(!hasCrown)} className={`w-full p-3 rounded-xl text-center transition-all ${hasCrown ? 'bg-yellow-500/20 border-2 border-yellow-400' : 'bg-white/5 border border-white/5 hover:bg-white/10'}`}>
                    {hasCrown ? '👑 Включена' : 'Выключена'}
                  </button>
                </div>
              )}

              {/* Banner */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2 text-white"><Palette size={16} className="text-mushroom-neon" /> Баннер (URL)</label>
                <input type="text" value={profileBannerUrl} onChange={e => setProfileBannerUrl(e.target.value)} placeholder="https://..." disabled={!purchased.includes('profile-banner')} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm disabled:opacity-30 text-white placeholder-gray-600" />
              </div>

              {/* Frame */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2 text-white"><Palette size={16} className="text-mushroom-neon" /> Рамка</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{ v: null, l: 'Стандарт', e: '⭕', r: null },
                    { v: 'frame-bronze', l: 'Бронза', e: '🥉', r: 'frame-bronze' },
                    { v: 'frame-silver', l: 'Серебро', e: '🥈', r: 'frame-silver' },
                    { v: 'frame-gold', l: 'Золото', e: '🥇', r: 'frame-gold' }
                  ].map(f => (
                    <button key={f.v || 'none'} onClick={() => (!f.r || purchased.includes(f.r)) && setActiveFrame(f.v)}
                      disabled={f.r !== null && !purchased.includes(f.r)}
                      className={`p-3 rounded-xl text-center transition-all ${activeFrame === f.v ? 'bg-mushroom-neon/20 border-2 border-mushroom-neon' : 'bg-white/5 border border-white/5 hover:bg-white/10'} ${(f.r && !purchased.includes(f.r)) ? 'opacity-30' : ''}`}>
                      <div className="text-xl mb-1">{f.e}</div>
                      <div className="text-xs text-white">{f.l}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleSaveSettings} disabled={saving} className="w-full py-3 rounded-xl font-bold bg-mushroom-neon text-black flex items-center justify-center gap-2 disabled:opacity-50">
                <Save size={18} /> {saving ? '...' : '💾 Сохранить'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProfileCustomizer;

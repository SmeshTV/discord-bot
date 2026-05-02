import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, AlertTriangle, Link2, Image, Hash, Users, Clock, Trash2, Edit3, Save, Zap, MessageCircle, Bot, Loader2, X, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ChatTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [settings, setSettings] = useState({
    badWordsFilter: true,
    autoModeration: true,
    logging: false,
    linksAllowed: true,
    imagesAllowed: true,
    maxMessageLength: 2000,
    slowMode: 0,
  });

  const [badWords, setBadWords] = useState<any[]>([]);
  const [showAddWord, setShowAddWord] = useState(false);
  const [newWord, setNewWord] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('chat_settings').select('*').limit(1);
      if (data && data.length > 0) {
        setSettings(data[0]);
      }

      const { data: words } = await supabase.from('bad_words').select('*').order('created_at', { ascending: false });
      setBadWords(words || []);
    } catch (error) {
      console.error('Error loading settings:', error);
      setBadWords([
        { id: '1', word: 'мат1', active: true },
        { id: '2', word: 'мат2', active: true },
        { id: '3', word: 'мат3', active: false },
      ]);
    }
    setLoading(false);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const existing = await supabase.from('chat_settings').select('id').limit(1);
      
      if (existing.data && existing.data.length > 0) {
        await supabase.from('chat_settings').update(settings).eq('id', existing.data[0].id);
      } else {
        await supabase.from('chat_settings').insert(settings);
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
    setSaving(false);
  };

  const handleAddWord = async () => {
    if (!newWord.trim()) return;
    
    const word = {
      word: newWord.trim().toLowerCase(),
      active: true,
    };
    
    try {
      const { data, error } = await supabase.from('bad_words').insert(word).select();
      if (error) throw error;
      
      if (data) {
        setBadWords([...badWords, data[0]]);
      }
    } catch (error) {
      console.error('Error adding word:', error);
      setBadWords([...badWords, { id: String(Date.now()), ...word }]);
    }
    
    setNewWord('');
    setShowAddWord(false);
  };

  const handleToggleWord = async (wordId: string) => {
    const word = badWords.find(w => w.id === wordId);
    if (!word) return;

    const newActive = !word.active;
    
    try {
      await supabase.from('bad_words').update({ active: newActive }).eq('id', wordId);
    } catch (error) {
      console.error('Error toggling word:', error);
    }
    
    setBadWords(badWords.map(w => w.id === wordId ? { ...w, active: newActive } : w));
  };

  const handleDeleteWord = async (wordId: string) => {
    try {
      await supabase.from('bad_words').delete().eq('id', wordId);
    } catch (error) {
      console.error('Error deleting word:', error);
    }
    
    setBadWords(badWords.filter(w => w.id !== wordId));
  };

  const Toggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button 
      onClick={onToggle} 
      className={`w-12 h-6 rounded-full transition-colors flex items-center ${enabled ? 'bg-green-500' : 'bg-gray-600'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  );

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
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <AlertTriangle className="text-yellow-400" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold">Фильтр матов</h3>
              <p className="text-gray-400 text-sm">Автоматическое удаление</p>
            </div>
            <Toggle enabled={settings.badWordsFilter} onToggle={() => setSettings(s => ({ ...s, badWordsFilter: !s.badWordsFilter }))} />
          </div>
          
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {badWords.map(word => (
              <div key={word.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                <span className={word.active ? 'text-white' : 'text-gray-500'}>{word.word}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleWord(word.id)}
                    className={`w-10 h-5 rounded-full transition-colors flex items-center ${word.active ? 'bg-green-500' : 'bg-gray-600'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${word.active ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  <button 
                    onClick={() => handleDeleteWord(word.id)}
                    className="p-1 hover:bg-red-500/20 rounded text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setShowAddWord(true)}
            className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors text-gray-400 flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Добавить слово
          </button>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Bot className="text-purple-400" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold">Авто-модерация</h3>
              <p className="text-gray-400 text-sm">Удаление спама и ссылок</p>
            </div>
            <Toggle enabled={settings.autoModeration} onToggle={() => setSettings(s => ({ ...s, autoModeration: !s.autoModeration }))} />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
              <div className="flex items-center gap-3">
                <Link2 size={18} className="text-gray-400" />
                <span>Блокировка ссылок</span>
              </div>
              <Toggle enabled={!settings.linksAllowed} onToggle={() => setSettings(s => ({ ...s, linksAllowed: !s.linksAllowed }))} />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
              <div className="flex items-center gap-3">
                <Image size={18} className="text-gray-400" />
                <span>Блокировка картинок</span>
              </div>
              <Toggle enabled={!settings.imagesAllowed} onToggle={() => setSettings(s => ({ ...s, imagesAllowed: !s.imagesAllowed }))} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Hash className="text-blue-400" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold">Настройки каналов</h3>
            <p className="text-gray-400 text-sm">Ограничения чата</p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-700/30 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <MessageCircle size={18} className="text-gray-400" />
              <span className="text-gray-400">Макс. длина сообщения</span>
            </div>
            <input
              type="number"
              value={settings.maxMessageLength}
              onChange={(e) => setSettings(s => ({ ...s, maxMessageLength: parseInt(e.target.value) || 2000 }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white"
            />
          </div>
          <div className="p-4 bg-gray-700/30 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <Clock size={18} className="text-gray-400" />
              <span className="text-gray-400">Slow mode (сек)</span>
            </div>
            <input
              type="number"
              value={settings.slowMode}
              onChange={(e) => setSettings(s => ({ ...s, slowMode: parseInt(e.target.value) || 0 }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white"
            />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <MessageSquare className="text-green-400" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold">Логирование</h3>
            <p className="text-gray-400 text-sm">Запись всех сообщений</p>
          </div>
          <Toggle enabled={settings.logging} onToggle={() => setSettings(s => ({ ...s, logging: !s.logging }))} />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={loadSettings}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
        >
          Сбросить
        </button>
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : saved ? <Zap size={20} /> : <Save size={20} />}
          {saved ? 'Сохранено!' : 'Сохранить настройки'}
        </button>
      </div>

      {showAddWord && (
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
              <h3 className="text-xl font-bold">Добавить слово</h3>
              <button onClick={() => setShowAddWord(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div>
              <label className="text-gray-400 text-sm">Слово для фильтра</label>
              <input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="Введите слово..."
                className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddWord(false)}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleAddWord}
                disabled={!newWord.trim()}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Добавить
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ChatTab;
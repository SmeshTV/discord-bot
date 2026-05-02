import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Image, Video, Upload, Play, Trash2, Edit3, Search, Grid, List, Plus, Music, User, Loader2, X, Save, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const MediaTab = () => {
  const [activeCategory, setActiveCategory] = useState('banners');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [media, setMedia] = useState({
    banners: [
      { id: '1', name: 'Главный баннер', url: '/banner-main.png', size: '1920x1080', views: 1234 },
      { id: '2', name: 'Баннер ивента', url: '/banner-event.png', size: '1920x1080', views: 567 },
    ],
    videos: [
      { id: '1', name: 'Трейлер сервера', duration: '2:30', views: 234 },
      { id: '2', name: 'Гайд по играм', duration: '5:45', views: 567 },
    ],
    audio: [
      { id: '1', name: 'Фоновая музыка', duration: '3:45', plays: 1234 },
      { id: '2', name: 'Звук победы', duration: '0:15', plays: 567 },
      { id: '3', name: 'Звук поражения', duration: '0:12', plays: 234 },
    ],
    avatars: [
      { id: '1', name: 'Пользователь', type: 'default' },
      { id: '2', name: 'VIP', type: 'vip' },
      { id: '3', name: 'Модератор', type: 'mod' },
      { id: '4', name: 'Администратор', type: 'admin' },
    ],
  });

  const [editingItem, setEditingItem] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const currentMedia = media[activeCategory as keyof typeof media] || [];

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    for (const file of Array.from(files)) {
      const newId = String(Date.now());
      const newItem = {
        id: newId,
        name: file.name.replace(/\.[^/.]+$/, ''),
        url: URL.createObjectURL(file),
        size: activeCategory === 'audio' ? `${Math.round(file.size / 1024)}KB` : `${file.size}`,
        views: 0,
        plays: 0,
        ...(activeCategory === 'audio' ? { duration: '0:00' } : {}),
        ...(activeCategory === 'avatars' ? { type: 'custom' } : {}),
      };

      setMedia(prev => ({
        ...prev,
        [activeCategory]: [...prev[activeCategory as keyof typeof prev], newItem],
      }));
    }

    setUploading(false);
  };

  const handleDelete = (itemId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот файл?')) return;
    
    setMedia(prev => ({
      ...prev,
      [activeCategory]: prev[activeCategory as keyof typeof prev].filter((item: any) => item.id !== itemId),
    }));
  };

  const handleEdit = (item: any) => {
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    
    setMedia(prev => ({
      ...prev,
      [activeCategory]: prev[activeCategory as keyof typeof prev].map((item: any) => 
        item.id === editingItem.id ? editingItem : item
      ),
    }));
    
    setShowEditModal(false);
    setEditingItem(null);
  };

  const categories = [
    { id: 'banners', label: 'Баннеры', icon: Image, count: media.banners.length },
    { id: 'videos', label: 'Видео', icon: Video, count: media.videos.length },
    { id: 'audio', label: 'Аудио', icon: Music, count: media.audio.length },
    { id: 'avatars', label: 'Аватарки', icon: User, count: media.avatars.length },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                activeCategory === cat.id 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <cat.icon size={18} />
              {cat.label}
              <span className="px-2 py-0.5 bg-gray-700 rounded-full text-xs">
                {cat.count}
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            <Grid size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept={
          activeCategory === 'banners' ? 'image/*' :
          activeCategory === 'videos' ? 'video/*' :
          activeCategory === 'audio' ? 'audio/*' :
          'image/*'
        }
        onChange={handleFileUpload}
      />

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {activeCategory === 'banners' && <Image className="text-pink-400" size={24} />}
            {activeCategory === 'videos' && <Video className="text-red-400" size={24} />}
            {activeCategory === 'audio' && <Music className="text-blue-400" size={24} />}
            {activeCategory === 'avatars' && <User className="text-purple-400" size={24} />}
            <h3 className="text-lg font-bold">
              {categories.find(c => c.id === activeCategory)?.label}
            </h3>
          </div>
          <button 
            onClick={handleUploadClick}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
            Загрузить
          </button>
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentMedia.map((item: any, i: number) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="group relative bg-gray-700/30 rounded-xl overflow-hidden hover:bg-gray-700/50 transition-colors cursor-pointer"
              >
                {activeCategory === 'banners' && (
                  <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                    <Image className="text-gray-500" size={32} />
                  </div>
                )}
                {activeCategory === 'videos' && (
                  <div className="aspect-video bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center relative">
                    <Play className="text-gray-500" size={32} />
                    <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 rounded text-xs">
                      {item.duration}
                    </span>
                  </div>
                )}
                {activeCategory === 'audio' && (
                  <div className="aspect-square bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                    <Music className="text-gray-500" size={32} />
                  </div>
                )}
                {activeCategory === 'avatars' && (
                  <div className="aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button 
                    onClick={() => handleEdit(item)}
                    className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/40 text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  {(item.size || item.duration || item.plays || item.views) && (
                    <p className="text-gray-500 text-xs mt-1">
                      {item.size || item.duration || `${item.plays || item.views} ♪`}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: currentMedia.length * 0.05 }}
              onClick={handleUploadClick}
              className="aspect-square bg-gray-700/20 border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center cursor-pointer hover:border-purple-500/30 hover:bg-purple-500/10 transition-colors group"
            >
              <div className="text-center">
                <Plus className="text-gray-500 group-hover:text-purple-400 mx-auto mb-2" size={24} />
                <p className="text-gray-500 text-sm group-hover:text-white">Добавить</p>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="space-y-2">
            {currentMedia.map((item: any, i: number) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 p-3 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-600 flex items-center justify-center">
                  {activeCategory === 'banners' && <Image size={18} className="text-gray-400" />}
                  {activeCategory === 'videos' && <Video size={18} className="text-gray-400" />}
                  {activeCategory === 'audio' && <Music size={18} className="text-gray-400" />}
                  {activeCategory === 'avatars' && <User size={18} className="text-gray-400" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-gray-500 text-sm">{item.size || item.duration || 'Аватарка'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {item.views && <span className="text-gray-400 text-sm">{item.views} просм.</span>}
                  {item.plays && <span className="text-gray-400 text-sm">{item.plays} воспр.</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(item)} className="p-2 hover:bg-gray-600 rounded-lg">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {showEditModal && editingItem && (
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
              <h3 className="text-xl font-bold">Редактировать</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Название</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Save size={20} />
                Сохранить
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default MediaTab;
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, TrendingUp, Users, Clock, Trophy, Star, Zap, Play, Pause, Edit3, Trash2, Plus, Square, Loader2, X, Save, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const GamesTab = () => {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newGame, setNewGame] = useState({
    name: '',
    description: '',
    max_players: 4,
    is_active: true,
  });
  const [statistics, setStatistics] = useState({
    totalGames: 0,
    activeGames: 0,
    totalPlayers: 0,
    popularGame: '',
  });

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    setLoading(true);
    try {
      const { data: gamesData, count } = await supabase
        .from('games')
        .select('*', { count: 'exact' })
        .order('name');

      setGames(gamesData || []);
      setStatistics({
        totalGames: count || 0,
        activeGames: (gamesData || []).filter((g: any) => g.is_active).length,
        totalPlayers: (gamesData || []).reduce((acc: number, g: any) => acc + (g.current_players || 0), 0),
        popularGame: (gamesData || []).sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))[0]?.name || '-',
      });
    } catch (error) {
      console.error('Error loading games:', error);
    }
    setLoading(false);
  };

  const handleAddGame = async () => {
    if (!newGame.name.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('games').insert({
        name: newGame.name.trim(),
        description: newGame.description,
        max_players: newGame.max_players,
        is_active: newGame.is_active,
        current_players: 0,
        popularity: 0,
      });

      if (error) throw error;

      setNewGame({ name: '', description: '', max_players: 4, is_active: true });
      setShowAddModal(false);
      loadGames();
    } catch (error) {
      console.error('Error adding game:', error);
    }
    setSaving(false);
  };

  const handleUpdateGame = async () => {
    if (!selectedGame) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('games').update({
        name: selectedGame.name,
        description: selectedGame.description,
        max_players: selectedGame.max_players,
        is_active: selectedGame.is_active,
      }).eq('id', selectedGame.id);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedGame(null);
      loadGames();
    } catch (error) {
      console.error('Error updating game:', error);
    }
    setSaving(false);
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту игру?')) return;
    try {
      await supabase.from('games').delete().eq('id', gameId);
      loadGames();
    } catch (error) {
      console.error('Error deleting game:', error);
    }
  };

  const handleToggleActive = async (game: any) => {
    try {
      await supabase.from('games').update({ is_active: !game.is_active }).eq('id', game.id);
      loadGames();
    } catch (error) {
      console.error('Error toggling game:', error);
    }
  };

  const filteredGames = games.filter(g => {
    if (filter === 'all') return true;
    if (filter === 'active') return g.is_active;
    if (filter === 'inactive') return !g.is_active;
    return true;
  });

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Всего игр', value: statistics.totalGames, icon: Gamepad2, color: 'purple' },
          { label: 'Активных', value: statistics.activeGames, icon: Play, color: 'green' },
          { label: 'Онлайн', value: statistics.totalPlayers, icon: Users, color: 'blue' },
          { label: 'Популярная', value: statistics.popularGame, icon: Trophy, color: 'yellow', small: true },
        ].map((stat, i) => (
          <div key={i} className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-2xl border border-gray-700/50">
            <div className={`w-10 h-10 rounded-xl bg-${stat.color}-500/20 flex items-center justify-center mb-3`}>
              <stat.icon className={`text-${stat.color}-400`} size={20} />
            </div>
            <p className={`text-2xl font-bold text-white ${stat.small ? 'text-sm' : ''}`}>
              {stat.small ? stat.value : stat.value.toLocaleString('ru')}
            </p>
            <p className="text-gray-400 text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {['all', 'active', 'inactive'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl transition-colors ${
              filter === f 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'Неактивные'}
          </button>
        ))}
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-xl transition-colors ml-auto"
        >
          <Plus size={18} />
          Добавить игру
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {filteredGames.map((game, i) => (
          <motion.div 
            key={game.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-2xl border border-gray-700/50 hover:border-purple-500/30 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Square className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{game.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${game.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {game.is_active ? 'Активна' : 'Неактивна'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => { setSelectedGame({ ...game }); setShowEditModal(true); }}
                  className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
                >
                  <Edit3 size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteGame(game.id)}
                  className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {game.description && (
              <p className="text-gray-400 text-sm mb-4">{game.description}</p>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Игроков</span>
                <span className="font-medium">{game.current_players || 0} / {game.max_players || 4}</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(((game.current_players || 0) / (game.max_players || 4)) * 100, 100)}%` }}
                  transition={{ delay: i * 0.1 + 0.3 }}
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <TrendingUp size={14} />
                  <span className="text-sm">Популярность</span>
                </div>
                <span className="font-bold text-purple-400">{game.popularity || 0}%</span>
              </div>
            </div>

            <button 
              onClick={() => handleToggleActive(game)}
              className={`w-full mt-4 py-2 rounded-xl transition-colors flex items-center justify-center gap-2 ${
                game.is_active 
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' 
                  : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
              }`}
            >
              {game.is_active ? <Pause size={16} /> : <Play size={16} />}
              {game.is_active ? 'Деактивировать' : 'Активировать'}
            </button>
          </motion.div>
        ))}

        {filteredGames.length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-500">
            <Gamepad2 size={48} className="mx-auto mb-4 opacity-50" />
            <p>Игры не найдены</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Добавить игру</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Название</label>
                <input
                  type="text"
                  value={newGame.name}
                  onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
                  placeholder="Шашки, Дурак, Шахматы..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm">Описание</label>
                <textarea
                  value={newGame.description}
                  onChange={(e) => setNewGame({ ...newGame, description: e.target.value })}
                  placeholder="Описание игры..."
                  rows={3}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1 resize-none"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm">Макс. игроков</label>
                <input
                  type="number"
                  value={newGame.max_players}
                  onChange={(e) => setNewGame({ ...newGame, max_players: parseInt(e.target.value) || 2 })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                <span>Активна</span>
                <button
                  onClick={() => setNewGame({ ...newGame, is_active: !newGame.is_active })}
                  className={`w-12 h-6 rounded-full transition-colors ${newGame.is_active ? 'bg-green-500' : 'bg-gray-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${newGame.is_active ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
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
                onClick={handleAddGame}
                disabled={saving || !newGame.name.trim()}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                Добавить
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {showEditModal && selectedGame && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Редактировать игру</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Название</label>
                <input
                  type="text"
                  value={selectedGame.name}
                  onChange={(e) => setSelectedGame({ ...selectedGame, name: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm">Описание</label>
                <textarea
                  value={selectedGame.description || ''}
                  onChange={(e) => setSelectedGame({ ...selectedGame, description: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1 resize-none"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm">Макс. игроков</label>
                <input
                  type="number"
                  value={selectedGame.max_players || 4}
                  onChange={(e) => setSelectedGame({ ...selectedGame, max_players: parseInt(e.target.value) || 2 })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                <span>Активна</span>
                <button
                  onClick={() => setSelectedGame({ ...selectedGame, is_active: !selectedGame.is_active })}
                  className={`w-12 h-6 rounded-full transition-colors ${selectedGame.is_active ? 'bg-green-500' : 'bg-gray-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${selectedGame.is_active ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
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
                onClick={handleUpdateGame}
                disabled={saving}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Сохранить
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default GamesTab;
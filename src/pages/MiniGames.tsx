import { memo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Users, Coins, ChevronRight, Crown, Swords } from 'lucide-react';

interface MiniGame {
  id: string;
  name: string;
  emoji: string;
  description: string;
  players: string;
  hasBet: boolean;
  path: string;
  status: 'online' | 'coming-soon';
  betInfo?: string;
}

const games: MiniGame[] = [
  {
    id: 'rps',
    name: 'Камень-ножницы-бумага',
    emoji: '✊✋✌️',
    description: 'Классическая КНБ со ставками грибов. Создай комнату или присоединись к игре!',
    players: '1 на 1',
    hasBet: true,
    path: '/rps',
    status: 'online',
    betInfo: 'Ставки от 10 до 500 🍄',
  },
  {
    id: 'checkers',
    name: 'Шашки онлайн',
    emoji: '⚪⚫',
    description: 'Классические шашки. Создай онлайн-комнату, пригласи друга и играй!',
    players: '1 на 1',
    hasBet: false,
    path: '/checkers-online/new',
    status: 'online',
  },
  {
    id: 'poker',
    name: 'Покер Texas Hold\'em',
    emoji: '🃏',
    description: 'Классический покер с комнатами и ставками. Создай стол и пригласи друзей!',
    players: '2-6 игроков',
    hasBet: true,
    path: '/poker',
    status: 'online',
    betInfo: 'Ставки от 1 до 1000 🍄',
  },
  {
    id: 'durak',
    name: 'Дурак',
    emoji: '🃏',
    description: 'Подкидной/переводной дурак онлайн. Временно недоступен.',
    players: '2-6 игроков',
    hasBet: false,
    path: '/durak',
    status: 'maintenance',
  },
];

const MiniGames = () => {
  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold gradient-text mb-4">
            🎮 Мини-игры
          </h1>
          <p className="text-gray-400 text-lg">
            Играй против друзей — создавай комнаты и соревнуйся!
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {games.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-6 card-hover group"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-5xl">{game.emoji}</span>
                {game.status === 'online' ? (
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold border border-green-500/30">
                    ● Играбельно
                  </span>
                ) : game.status === 'maintenance' ? (
                  <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold border border-red-500/30">
                    ✕ Недоступно
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold border border-yellow-500/30">
                    Скоро
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold mb-2 group-hover:text-mushroom-neon transition-colors">
                {game.name}
              </h3>
              <p className="text-gray-400 text-sm mb-4">{game.description}</p>

              <div className="flex flex-wrap gap-3 mb-4">
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-white/5 rounded-lg text-gray-300 border border-white/10">
                  <Users size={12} />
                  {game.players}
                </span>
                {game.hasBet && game.betInfo && (
                  <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-mushroom-neon/10 rounded-lg text-mushroom-neon border border-mushroom-neon/20">
                    <Coins size={12} />
                    {game.betInfo}
                  </span>
                )}
              </div>

              <Link
                to={game.path}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                  game.status === 'online'
                    ? 'btn-primary text-sm'
                    : game.status === 'maintenance'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20 cursor-not-allowed'
                    : 'bg-white/5 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Swords size={16} />
                  {game.status === 'online' ? 'Играть' : game.status === 'maintenance' ? 'Недоступно' : 'В разработке'}
                </span>
                {game.status === 'online' && <ChevronRight size={16} />}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Как это работает */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-8"
        >
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Crown size={24} className="text-mushroom-neon" />
            Как это работает
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-mushroom-neon/20 to-mushroom-neon/5 border border-mushroom-neon/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-mushroom-neon">1</span>
              </div>
              <h4 className="font-bold mb-1">Выбери игру</h4>
              <p className="text-gray-400 text-sm">КНБ со ставками или шашки — оффлайн против бота или онлайн с другом</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-blue-400">2</span>
              </div>
              <h4 className="font-bold mb-1">Создай комнату</h4>
              <p className="text-gray-400 text-sm">Для онлайн-игры создай комнату и отправь ссылку сопернику</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-green-400">3</span>
              </div>
              <h4 className="font-bold mb-1">Побеждай!</h4>
              <p className="text-gray-400 text-sm">Выигрывай грибы в КНБ или просто наслаждайся игрой в шашки</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default memo(MiniGames);

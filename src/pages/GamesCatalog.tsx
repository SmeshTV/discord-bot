import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Users, Calendar, Trophy, ChevronRight, X } from 'lucide-react';

interface GameData {
  id: string;
  name: string;
  emoji: string;
  description: string;
  details: string[];
  hasEvents: boolean;
  image?: string;
}

interface GameCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  games: GameData[];
}

const categories: GameCategory[] = [
  {
    id: 'among-us',
    label: 'Among Us',
    icon: Gamepad2,
    games: [
      {
        id: 'au-skeld',
        name: 'The Skeld',
        emoji: '🚀',
        description: 'Классическая карта — космический корабль с 4 углами и тесными коридорами.',
        details: ['10 игроков', 'Классическая карта', 'Быстрые раунды'],
        hasEvents: false,
      },
      {
        id: 'au-mira',
        name: 'Mira HQ',
        emoji: '🏢',
        description: 'Штаб-квартира на вершине горы — минимум камер, максимум напряжения.',
        details: ['10 игроков', 'Нет камер', 'Много задач рядом'],
        hasEvents: false,
      },
      {
        id: 'au-polus',
        name: 'Polus',
        emoji: '🌋',
        description: 'Исследовательская база на вулканической планете с открытым пространством.',
        details: ['=11 игроков', 'Открытая карта', 'Сложные задачи'],
        hasEvents: false,
      },
      {
        id: 'au-airship',
        name: 'The Airship',
        emoji: '🎈',
        description: 'Огромный дирижабль — самая большая карта с множеством комнат и секретов.',
        details: ['15 игроков', 'Самая большая карта', 'Новые роли'],
        hasEvents: false,
      },
      {
        id: 'au-fungle',
        name: 'The Fungle',
        emoji: '🍄',
        description: 'Грибной остров — уникальная карта с прыжками и интересными локациями.',
        details: ['>15 игроков', 'Система прыжков', 'Уникальные задачи'],
        hasEvents: false,
      },
    ],
  },
  {
    id: 'strategy',
    label: 'Стратегические',
    icon: Trophy,
    games: [
      {
        id: 'chess',
        name: 'Шахматы',
        emoji: '♟️',
        description: 'Классические шахматы с турнирами и рейтинговой системой. Проводим регулярные ивенты с призами!',
        details: ['1 на 1', 'Турниры', 'Рейтинговая система', 'Призовые фонды'],
        hasEvents: true,
      },
      {
        id: 'durak',
        name: 'Дурак',
        emoji: '🃏',
        description: 'Классическая карточная игра. Проводим ивенты с турнирами и призами для участников.',
        details: ['2-6 игроков', 'Турниры', 'Ивенты'],
        hasEvents: true,
      },
    ],
  },
  {
    id: 'mobile',
    label: 'Мобильные и онлайн',
    icon: Gamepad2,
    games: [
      {
        id: 'clash-royale',
        name: 'Clash Royale',
        emoji: '👑',
        description: 'Стратегия в реальном времени. Собираем лобби для PvP-баталий и турниров.',
        details: ['1 на 1', '2 на 2', 'Турниры'],
        hasEvents: true,
      },
      {
        id: 'brawl-stars',
        name: 'Brawl Stars',
        emoji: '⭐',
        description: 'Динамичные бои в разных режимах. Собираем команду для совместной игры.',
        details: ['3 на 3', 'Королевская битва', 'Ивенты'],
        hasEvents: true,
      },
      {
        id: 'minecraft',
        name: 'Minecraft',
        emoji: '⛏️',
        description: 'Строим, выживаем и исследуем миры вместе. Сервер с модами и ванилла.',
        details: ['Сервер', 'Выживание', 'Мини-игры'],
        hasEvents: true,
      },
      {
        id: 'roblox',
        name: 'Roblox',
        emoji: '🟢',
        description: 'Платформа с тысячами игр. Играем в Horror, Obby, Tycoon и другие режимы.',
        details: ['Разные режимы', 'Хоррор', 'Паркур'],
        hasEvents: false,
      },
    ],
  },
  {
    id: 'party',
    label: 'Вечеринки',
    icon: Users,
    games: [
      {
        id: 'jackbox',
        name: 'JackBox Party Pack 1-9, 11',
        emoji: '📦',
        description: 'Набор весёлых мини-игр для компании. Quiplash, Fibbage, Drawful и многое другое!',
        details: ['3-8+ игроков', 'Много режимов', 'Для вечеринок'],
        hasEvents: false,
      },
      {
        id: 'bunker',
        name: 'Бункер',
        emoji: '🏚️',
        description: 'Социальная игра — кто заслуживает место в бункере после апокалипсиса? Уникальные профессии и навыки.',
        details: ['4-12 игроков', 'Дебаты', 'Голосования'],
        hasEvents: false,
      },
      {
        id: 'spy',
        name: 'Шпион (Spyfall)',
        emoji: '🕵️',
        description: 'Один из игроков — шпион. Остальные пытаются его вычислить задавая вопросы.',
        details: ['4-12 игроков', 'Дедукция', 'Блеф'],
        hasEvents: false,
      },
      {
        id: 'codenames',
        name: 'Codenames',
        emoji: '🔤',
        description: 'Командная игра со словами. Капитаны дают подсказки, команда угадывает.',
        details: ['4+ игроков', '2 команды', 'Слова'],
        hasEvents: false,
      },
      {
        id: 'alias',
        name: 'Alias',
        emoji: '🗣️',
        description: 'Объясни слово не называя его! Классическая игра на скорость и ассоциации.',
        details: ['4+ игроков', 'Команды', 'Таймер'],
        hasEvents: false,
      },
      {
        id: 'gartic-phone',
        name: 'Gartic Phone',
        emoji: '🎨',
        description: 'Испорченный телефон с рисованием. Рисуй, угадывай и смейся!',
        details: ['4-12 игроков', 'Рисование', 'Весёлые результаты'],
        hasEvents: false,
      },
    ],
  },
];

const GamesPage = () => {
  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const [selectedGame, setSelectedGame] = useState<GameData | null>(null);

  const currentCategory = categories.find((c) => c.id === activeCategory)!;

  return (
    <div className="pt-20 sm:pt-24 pb-16 sm:pb-20 px-3 sm:px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Заголовок */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h1 className="text-3xl sm:text-4xl sm:text-5xl font-bold gradient-text mb-4">
            🎮 Игры на сервере
          </h1>
          <p className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto">
            Более 15 игр — от Among Us до вечериночных. Выбирай и присоединяйся!
          </p>
        </motion.div>

        {/* Вкладки категорий */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 justify-center mb-8 sm:mb-10"
        >
          {categories.map((cat) => {
            const Icon = cat.icon;
            const active = cat.id === activeCategory;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSelectedGame(null);
                }}
                className={`flex items-center gap-2 px-4 sm:px-5 py-3 rounded-xl font-medium text-sm transition-all min-h-[48px] ${
                  active
                    ? 'bg-mushroom-neon/20 text-mushroom-neon border border-mushroom-neon/30'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
                }`}
              >
                <Icon size={16} />
                <span className="hidden xs:inline">{cat.label}</span>
              </button>
            );
          })}
        </motion.div>

        {/* Карточки игр */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
          >
            {currentCategory.games.map((game, index) => (
              <motion.button
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedGame(game)}
                className="glass-card p-5 sm:p-6 card-hover text-left group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl sm:text-4xl">{game.emoji}</span>
                  {game.hasEvents && (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full">
                      <Calendar size={10} />
                      Ивенты
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-bold mb-2 group-hover:text-mushroom-neon transition-colors">
                  {game.name}
                </h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {game.description}
                </p>
                <div className="flex items-center gap-1 text-mushroom-neon text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Подробнее
                  <ChevronRight size={16} />
                </div>
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Модальное окно с деталями */}
        <AnimatePresence>
          {selectedGame && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
              onClick={() => setSelectedGame(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-card max-w-lg w-full p-5 sm:p-8 relative"
              >
                <button
                  onClick={() => setSelectedGame(null)}
                  className="absolute top-3 sm:top-4 right-3 sm:right-4 p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X size={20} />
                </button>

                <span className="text-4xl sm:text-5xl mb-4 block">{selectedGame.emoji}</span>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">{selectedGame.name}</h2>

                {selectedGame.hasEvents && (
                  <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-full mb-4">
                    <Calendar size={12} />
                    Проводятся ивенты
                  </span>
                )}

                <p className="text-gray-300 mb-5 sm:mb-6 leading-relaxed text-sm sm:text-base">
                  {selectedGame.description}
                </p>

                <div className="space-y-3 mb-5 sm:mb-6">
                  <h4 className="font-bold text-sm text-gray-400 uppercase tracking-wide">
                    Особенности
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedGame.details.map((detail, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-white/5 rounded-lg text-sm text-gray-300 border border-white/10"
                      >
                        {detail}
                      </span>
                    ))}
                  </div>
                </div>

                <a
                  href="https://discord.gg/lolaamongus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-discord w-full flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <Gamepad2 size={18} />
                  Присоединиться в Discord
                </a>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8 sm:mt-12"
        >
          <p className="text-gray-400 mb-4 text-sm sm:text-base">
            Не нашёл свою любимую игру? Предложи её в Discord!
          </p>
          <a
            href="https://discord.com/channels/1463228311118549124/1464007284870086878"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2 min-h-[48px]"
          >
            <Users size={18} />
            Предложить игру
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default memo(GamesPage);

import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Shield, Wrench, Calendar, Star, Gamepad2, Award, Users, MessageSquare, ChevronDown } from 'lucide-react';

interface RoleGroup {
  title: string;
  icon: React.ElementType;
  color: string;
  roles: RoleData[];
}

interface RoleData {
  name: string;
  emoji: string;
  description: string;
  permissions: string[];
}

const roleGroups: RoleGroup[] = [
  {
    title: 'Руководство',
    icon: Crown,
    color: 'from-yellow-500 to-amber-500',
    roles: [
      {
        name: 'Lola',
        emoji: '👑',
        description: 'Создатель сервера. Полный контроль над всеми аспектами сервера.',
        permissions: ['Все права'],
      },
      {
        name: 'Admin',
        emoji: '🛡️',
        description: 'Совладелец сервера. Все права кроме прав Администратора.',
        permissions: ['Все права кроме прав Администратора'],
      },
    ],
  },
  {
    title: 'Техническая команда',
    icon: Wrench,
    color: 'from-blue-500 to-cyan-500',
    roles: [
      {
        name: 'Tech Admin',
        emoji: '⚙️',
        description: 'Технический администратор. Отвечает за все технические вопросы на сервере.',
        permissions: ['Права администратора', 'Техническая поддержка', 'Настройка ботов'],
      },
      {
        name: 'Tech Helper',
        emoji: '🔧',
        description: 'Техническая команда. Выполняет поручения Tech Admin.',
        permissions: ['Техническая поддержка', 'Помощь с ботами'],
      },
    ],
  },
  {
    title: 'Модерация',
    icon: Shield,
    color: 'from-red-500 to-pink-500',
    roles: [
      {
        name: 'Main Moderator',
        emoji: '🔰',
        description: 'Главный модератор. Следит за работой Grand Mod и ниже.',
        permissions: ['Права администратора', 'Координация модераторов', 'Решение сложных ситуаций'],
      },
      {
        name: 'Grand Mod',
        emoji: '⚜️',
        description: 'Помощник Main Moderator. Следит за работой Mod и ниже.',
        permissions: ['Права администратора', 'Координация Mod', 'Управление наказаниями'],
      },
      {
        name: 'Mod',
        emoji: '🔨',
        description: 'Модератор. Следит за работой хелперов и Game Architect. Просматривает тикеты.',
        permissions: [
          'Просмотр журнала аудита',
          'Управление никнеймами',
          'Отправка в тайм-аут',
          'Управление сообщениями',
          'Отключение микрофона',
          'Перемещение участников (включая переполненные войсы)',
          'Выдача предупреждения через Juniper Bot',
        ],
      },
      {
        name: 'Helper',
        emoji: '💚',
        description: 'Хелпер. Следит за работой Game Architect.',
        permissions: [
          'Управление никнеймами',
          'Управление сообщениями',
          'Отключение микрофона',
          'Выдача предупреждения через Juniper Bot',
        ],
      },
    ],
  },
  {
    title: 'Игры и ивенты',
    icon: Calendar,
    color: 'from-purple-500 to-mushroom-neon',
    roles: [
      {
        name: 'Event Maker',
        emoji: '🎉',
        description: 'Человек, проводящий события на сервере на регулярной основе.',
        permissions: [
          'Упоминание всех ролей',
          'Создание опросов',
          'Перемещение участников (включая переполненные войсы)',
          'Создание событий',
        ],
      },
      {
        name: 'Game Architect',
        emoji: '🎮',
        description: 'Человек, собирающий лобби для игр в Among Us.',
        permissions: [
          'Упоминание всех ролей',
          'Отключение микрофона',
          'Перемещение участников (включая переполненные войсы)',
        ],
      },
      {
        name: 'Clash Royale, Brawl Stars, Minecraft — ивентмейкеры',
        emoji: '🎯',
        description: 'Организаторы ивентов по конкретным играм.',
        permissions: ['Права Event Maker для своей игры'],
      },
    ],
  },
  {
    title: 'Особые роли',
    icon: Star,
    color: 'from-pink-500 to-rose-500',
    roles: [
      {
        name: 'Special Guest',
        emoji: '🌟',
        description: 'Медиа-личности, чьё присутствие на сервере необходимо дополнительно отметить.',
        permissions: ['Права King'],
      },
      {
        name: 'Media',
        emoji: '📺',
        description: 'Медиа-личности, сотрудничающие с сервером.',
        permissions: ['Права King'],
      },
      {
        name: 'Grand Master',
        emoji: '🏆',
        description: 'Пиарщик сервера.',
        permissions: ['Права King'],
      },
      {
        name: 'Server Booster',
        emoji: '💎',
        description: 'Бустер сервера. Благодарность за поддержку.',
        permissions: ['Права King'],
      },
      {
        name: 'Chosen',
        emoji: '✨',
        description: 'Секретная роль. Только её владельцы знают о её значении.',
        permissions: ['Секретные права'],
      },
    ],
  },
  {
    title: 'Кастомные и ивентовые роли',
    icon: Award,
    color: 'from-emerald-500 to-teal-500',
    roles: [
      {
        name: 'Ⅰ Chess Winner / Ⅰ Chess Player',
        emoji: '♟️',
        description: 'Кастомная роль, выданная за победу или участие в первом турнире по шахматам сервера.',
        permissions: ['Декоративная'],
      },
      {
        name: 'Troll King',
        emoji: '🤡',
        description: 'Кастомная роль. Выдана особо отметившимся игрокам на ивенте в честь 1 апреля 2026 года.',
        permissions: ['Декоративная'],
      },
      {
        name: 'Роли за ивенты',
        emoji: '🎖️',
        description: '5 таких ролей можно обменять на кастомную роль.',
        permissions: ['Обмен на кастомную роль'],
      },
    ],
  },
  {
    title: 'Прочие роли',
    icon: Users,
    color: 'from-gray-500 to-slate-500',
    roles: [
      {
        name: 'Мут',
        emoji: '🔇',
        description: 'Роль, получаемая участником при наличии 3 предупреждений через Juniper Bot.',
        permissions: ['Без прав'],
      },
      {
        name: 'Роли уведомлений',
        emoji: '🔔',
        description: 'Подписка на уведомления о событиях и ивентах.',
        permissions: ['Уведомления'],
      },
    ],
  },
];

const Team = () => {
  const [openGroup, setOpenGroup] = useState<number | null>(0);

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Заголовок */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold gradient-text mb-4">
            Роли на сервере
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Полная иерархия ролей Discord-сервера LOLA — от руководства до кастомных ролей
          </p>
        </motion.div>

        {/* Как решать вопросы */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 mb-8 bg-yellow-500/5 border-yellow-500/20"
        >
          <h3 className="text-lg font-bold mb-3 text-yellow-400 flex items-center gap-2">
            <MessageSquare size={18} />
            Важно: Как решать вопросы
          </h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            <b className="text-white">Связаться напрямую с Создателем сервера (Lola) нельзя.</b> Все вопросы
            решаются через стафф: начни с <b className="text-white">Main Moderator</b>, далее по иерархии.
            Тикеты на сайте и в Discord — основной способ связи с командой.
          </p>
        </motion.div>

        {/* Группы ролей — аккордеон */}
        <div className="space-y-4 mb-12">
          {roleGroups.map((group, groupIndex) => {
            const Icon = group.icon;
            const isOpen = openGroup === groupIndex;

            return (
              <motion.div
                key={group.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.05 }}
                className="glass-card overflow-hidden"
              >
                <button
                  onClick={() => setOpenGroup(isOpen ? null : groupIndex)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${group.color} flex items-center justify-center text-white`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{group.title}</h3>
                      <p className="text-xs text-gray-400">{group.roles.length} {group.roles.length === 1 ? 'роль' : group.roles.length < 5 ? 'роли' : 'ролей'}</p>
                    </div>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <motion.div
                  initial={false}
                  animate={{
                    height: isOpen ? 'auto' : 0,
                    opacity: isOpen ? 1 : 0,
                  }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 space-y-3 border-t border-white/5 pt-4">
                    {group.roles.map((role) => (
                      <div
                        key={role.name}
                        className="p-4 bg-white/5 rounded-xl border border-white/5"
                      >
                        <div className="flex items-start gap-3 mb-2">
                          <span className="text-2xl">{role.emoji}</span>
                          <div className="flex-1">
                            <h4 className="font-bold text-mushroom-neon">{role.name}</h4>
                            <p className="text-sm text-gray-400 mt-1">{role.description}</p>
                          </div>
                        </div>
                        {role.permissions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {role.permissions.map((perm, i) => (
                              <span
                                key={i}
                                className="text-xs px-2.5 py-1 bg-white/5 rounded-lg text-gray-300 border border-white/10"
                              >
                                {perm}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA — присоединиться к команде */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="glass-card p-8 text-center"
        >
          <h3 className="text-2xl font-bold mb-4">Хочешь получить роль?</h3>
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            Будь активным на сервере, участвуй в ивентах, помогай другим!
            Роли выдаются за активность и вклад в комьюнити.
            Для получения роли — создай тикет или обратись к модератору.
          </p>
          <a
            href="https://discord.gg/lolaamongus"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-discord inline-flex items-center gap-2"
          >
            <Gamepad2 size={18} />
            Присоединиться к серверу
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default memo(Team);

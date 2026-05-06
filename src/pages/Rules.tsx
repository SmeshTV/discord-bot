import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Shield, MessageSquare, Gamepad2, User, Crown, AlertTriangle, Heart, Volume2, Lock, Mic, Users } from 'lucide-react';

interface RuleSection {
  title: string;
  icon: React.ReactNode;
  rules: { text: string; punishment?: string }[];
}

const rulesData: RuleSection[] = [
  {
    title: 'I. Правила платформы Discord',
    icon: <Shield size={20} className="text-discord" />,
    rules: [
      { text: 'Все участники обязаны соблюдать официальные правила Discord.', punishment: 'https://discord.com/terms' },
      { text: 'Discord Community Guidelines обязательны к соблюдению.', punishment: 'https://discord.com/guidelines' },
      { text: 'При противоречиях между правилами сервера и Discord — приоритет всегда за правилами Discord.', punishment: '' },
    ],
  },
  {
    title: 'II. Общие положения',
    icon: <Shield size={20} className="text-mushroom-neon" />,
    rules: [
      { text: 'Правила обязательны для всех участников без исключений.' },
      { text: 'Администрация вправе изменять и дополнять правила без предварительного уведомления.' },
      { text: 'Цель правил — поддержание комфортной, безопасной и уважительной атмосферы.' },
      { text: 'Незнание правил не освобождает от ответственности.' },
    ],
  },
  {
    title: 'III. Общение и поведение',
    icon: <MessageSquare size={20} className="text-blue-400" />,
    rules: [
      { text: 'Запрещены оскорбления, унижения, угрозы, провокации, травля и агрессия.', punishment: '⚠️ Варн → Мут' },
      { text: 'Токсичное поведение, троллинг и намеренное создание конфликтов запрещены.', punishment: '⚠️ Варн → Мут' },
      { text: 'Публичные ссоры и выяснение отношений недопустимы.', punishment: '⚠️ Варн' },
      { text: 'Все спорные ситуации решаются исключительно через администрацию.', punishment: '' },
    ],
  },
  {
    title: 'IV. Темы и контент',
    icon: <AlertTriangle size={20} className="text-red-400" />,
    rules: [
      { text: 'Запрещены обсуждения политики, религии, идеологий и радикальных движений.', punishment: '⚠️ Варн → Мут' },
      { text: 'Контент 18+ (NSFW / NSFL) строго запрещён.', punishment: '🚫 Бан' },
    ],
  },
  {
    title: 'V. Сообщения и активность',
    icon: <MessageSquare size={20} className="text-yellow-400" />,
    rules: [
      { text: 'Спам, флуд, повтор сообщений и CAPS запрещены.', punishment: '⚠️ Варн → Мут' },
      { text: 'Массовые упоминания участников и администрации запрещены.', punishment: '⚠️ Варн' },
      { text: 'Распространение дезинформации запрещено.', punishment: '⚠️ Варн' },
    ],
  },
  {
    title: 'VI. Реклама и сторонние ресурсы',
    icon: <Lock size={20} className="text-purple-400" />,
    rules: [
      { text: 'Реклама, ссылки, инвайты и коммерческий контент допускаются только с разрешения администрации.', punishment: '⚠️ Варн → Бан' },
      { text: 'Обход модерации и наказаний запрещён.', punishment: '🚫 Бан' },
    ],
  },
  {
    title: 'VII. Голосовые каналы',
    icon: <Volume2 size={20} className="text-cyan-400" />,
    rules: [
      { text: 'Запрещены громкие, резкие и посторонние звуки (саундборды, музыка без согласия).', punishment: '⚠️ Варн → Мут' },
      { text: 'Музыка и звуковые эффекты допускаются только с согласия всех участников канала.', punishment: '' },
    ],
  },
  {
    title: 'VIII. Конфиденциальность',
    icon: <Lock size={20} className="text-pink-400" />,
    rules: [
      { text: 'Распространение личных данных без согласия владельца запрещено.', punishment: '⚠️ Варн → Бан' },
      { text: 'Приватные комнаты с пометкой «[M]» в названии модерируются администрацией. В таких комнатах обязательны правила сервера и Discord.', punishment: '⚠️ Варн → Мут' },
      { text: 'Приватные комнаты без «[M]» не модерируются, но правила Discord обязательны.', punishment: '' },
    ],
  },
  {
    title: 'IX. Администрация',
    icon: <Crown size={20} className="text-mushroom-neon" />,
    rules: [
      { text: 'Запрещено неуважение, давление, провокации и оскорбления администрации.', punishment: '⚠️ Варн → Мут' },
      { text: 'Решения администрации и модераторов обязательны к исполнению.', punishment: '' },
      { text: 'Писать напрямую Создателю (Lola) нельзя — вопросы решаются через стафф.', punishment: '' },
    ],
  },
  {
    title: 'X. Профиль пользователя',
    icon: <User size={20} className="text-green-400" />,
    rules: [
      { text: 'Никнеймы, аватары, баннеры и статусы не должны содержать NSFW/NSFL, оскорбления или рекламу.', punishment: '⚠️ Варн' },
      { text: 'Запрещена имитация администрации.', punishment: '⚠️ Варн → Бан' },
      { text: 'Запрещено выдавать себя за другого участника, модератора или администратора.', punishment: '🚫 Бан' },
      { text: 'Негативные обсуждения серверов Among Us и их администрации запрещены.', punishment: '⚠️ Варн' },
    ],
  },
  {
    title: 'XI. Правила игры',
    icon: <Gamepad2 size={20} className="text-orange-400" />,
    rules: [
      { text: 'Любые сговоры (322), влияющие на игровой процесс, запрещены.', punishment: '⚠️ Варн → Бан' },
      { text: 'Во время обсуждений игроки обязаны говорить по очереди.', punishment: '⚠️ Предупреждение' },
      { text: 'Игрок с рупором имеет приоритет слова.', punishment: '' },
      { text: 'Запрещено кикать игроков без веской причины и согласия участников лобби.', punishment: '⚠️ Варн' },
      { text: 'Запрещено злоупотребление правами ролей.', punishment: '⚠️ Варн → Снятие роли' },
      { text: 'Запрещено намеренно выдавать себя за AFK или оправдывать бездействие статусом AFK.', punishment: '⚠️ Предупреждение' },
      { text: 'Запрещено во время игры стоять на информационных точках (панель администрации, камеры, пульты и т.п.) более 30 секунд, если вы не делаете задания.', punishment: '⚠️ Предупреждение' },
    ],
  },
  {
    title: 'XII. Правило о разрешении на обсуждение личности',
    icon: <Heart size={20} className="text-red-400" />,
    rules: [
      { text: 'Оскорбления, унижения и токсичные высказывания в адрес любого участника запрещены по умолчанию.', punishment: '⚠️ Варн → Мут' },
      { text: 'Исключение — только если участник лично и явно оповестил Helper/Модератора/Администратора о разрешении.', punishment: '' },
      { text: 'Разрешение должно быть зафиксировано в письменном виде (в тикете или ЛС администрации).', punishment: '' },
      { text: 'Разрешение даётся только на конкретного человека и не распространяется на остальных.', punishment: '' },
      { text: 'Администрация вправе в любой момент отменить данное разрешение.', punishment: '' },
      { text: 'Без официального подтверждения любые гадости, даже «с разрешения», караются по общим правилам.', punishment: '⚠️ Варн → Мут' },
    ],
  },
];

const punishments = [
  { type: 'Предупреждение', icon: '⚠️', description: 'Официальное предупреждение через Juniper Bot' },
  { type: 'Мут', icon: '🔇', description: 'Выдаётся при 3 варнах — без прав на сервере' },
  { type: 'Бан', icon: '🚫', description: 'Полная блокировка на сервере' },
  { type: 'Снятие роли', icon: '📛', description: 'Лишение особой роли или привилегии' },
];

const RulesPage = () => {
  const [openSection, setOpenSection] = useState<number | null>(0);

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Заголовок */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-bold gradient-text mb-4">
            📜 Правила сервера
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Находясь на сервере, вы подтверждаете, что ознакомились с правилами, понимаете их и обязуетесь соблюдать
          </p>
        </motion.div>

        {/* Важно */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 mb-10 bg-yellow-500/5 border-yellow-500/20"
        >
          <h3 className="text-lg font-bold mb-3 text-yellow-400">💌 Добро пожаловать на сервер!</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p>• Находясь на сервере, вы подтверждаете, что ознакомились с правилами, понимаете их и обязуетесь соблюдать.</p>
            <p>• <b className="text-white">Незнание правил не освобождает от ответственности.</b></p>
            <p>• При приоритетах — правила Discord всегда важнее правил сервера.</p>
          </div>
        </motion.div>

        {/* Система наказаний */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-6 mb-10"
        >
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-400" />
            Система наказаний
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {punishments.map((p) => (
              <div key={p.type} className="p-4 bg-white/5 rounded-xl text-center">
                <div className="text-3xl mb-2">{p.icon}</div>
                <h4 className="font-bold text-sm text-white mb-1">{p.type}</h4>
                <p className="text-xs text-gray-400">{p.description}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Жалобы и обращения принимаются в канале <a href="/tickets" className="text-mushroom-neon underline">Tickets</a>
          </p>
        </motion.div>

        {/* Правила — аккордеон */}
        <div className="space-y-4">
          {rulesData.map((section, index) => {
            const Icon = section.icon;
            const isOpen = openSection === index;

            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="glass-card overflow-hidden"
              >
                <button
                  onClick={() => setOpenSection(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                      {Icon}
                    </div>
                    <h3 className="text-lg font-bold">{section.title}</h3>
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
                  <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-4">
                    {section.rules.map((rule, ruleIndex) => (
                      <div
                        key={ruleIndex}
                        className="p-4 bg-white/5 rounded-xl border border-white/5"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-mushroom-neon font-bold text-sm flex-shrink-0 mt-0.5">
                            {index + 1}.{ruleIndex + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-gray-300 text-sm leading-relaxed">{rule.text}</p>
                            {rule.punishment && (
                              <p className="text-xs text-red-400 mt-2 font-medium">
                                Наказание: {rule.punishment}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-8 mt-10 text-center"
        >
          <h3 className="text-2xl font-bold mb-4">Хочешь роль на сервере?</h3>
          <p className="text-gray-400 mb-6">
            Перейди во вкладку "Сообщество" и подай заявку на интересующую роль!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/community" className="btn-primary inline-flex items-center gap-2">
              <Users size={18} />
              Сообщество
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-8"
        >
          <h3 className="text-2xl font-bold mb-4">Есть вопросы по правилам?</h3>
          <p className="text-gray-400 mb-6">
            Если что-то непонятно — создай тикет или обратись к модератору
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/tickets" className="btn-primary inline-flex items-center gap-2">
              <Mic size={18} />
              Создать тикет
            </a>
            <a href="/faq" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 hover:text-white transition-all inline-flex items-center gap-2">
              Частые вопросы
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default memo(RulesPage);



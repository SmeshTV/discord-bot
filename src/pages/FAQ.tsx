import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, HelpCircle, Zap, Sprout, Gamepad2, Shield, Users, MessageCircle, Crown, Calendar, Star } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  icon: React.ReactNode;
}

const FAQPage = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      icon: <HelpCircle size={20} className="text-mushroom-neon" />,
      question: 'Что такое LOLA?',
      answer: 'LOLA — это Discord-сообщество с системой ролей, играми, турнирами и дружным комьюнити. У нас играют в Among Us, Clash Royale, Minecraft, шахматы, Дурак, JackBox и многое другое. Активные участники получают роли и привилегии.',
    },
    {
      icon: <Shield size={20} className="text-purple-400" />,
      question: 'Как устроены роли на сервере?',
      answer: 'Роли делятся на несколько категорий:\n\n• Руководство: Lola (создатель), Admin (совладелец)\n• Модерация: Mod → Grand Mod → Main Moderator\n• Техническая команда: Tech Admin\n• Игры и ивенты: Event Maker, Game Architect, ивентмейкеры по играм\n• Особые: Special Guest, Media, Grand Master, Server Booster, Chosen\n• Кастомные: за турниры, ивенты, обмен ролей за ивенты на кастомную\n• Прочие: Мут (3 варна), роли уведомлений, роли за ивенты',
    },
    {
      icon: <Crown size={20} className="text-yellow-400" />,
      question: 'Можно ли написать напрямую Создателю (Lola)?',
      answer: 'Нет, связь с Создателем сервера напрямую запрещена. Все вопросы решаются через стафф — начни с Mod, затем Grand Mod, и только потом Main Moderator. Также можно создать тикет. Стафф разберётся и при необходимости передаст вопрос выше.',
    },
    {
      icon: <MessageCircle size={20} className="text-blue-400" />,
      question: 'Как связаться с администрацией?',
      answer: 'Есть три способа:\n1. Тикеты в Discord — основной способ для решения вопросов\n2. Тикеты на сайте — раздел «Тикеты»\n3. Обратиться к модератору — напрямую в Discord\n\nПорядок обращения: Mod → Grand Mod → Main Moderator.\n\nСреднее время ответа — до 24 часов.',
    },
    {
      icon: <Gamepad2 size={20} className="text-green-400" />,
      question: 'Какие игры есть на сервере?',
      answer: 'У нас более 15 игр:\n\n• Among Us — все карты: Skeld, Mira HQ, Polus, Airship, Fungle\n• Стратегические: Шахматы, Дурак\n• Мобильные: Clash Royale, Brawl Stars, Minecraft, Roblox\n• Вечеринки: JackBox Party Pack 1-9 и 11, Бункер, Шпион, Codenames, Alias, Gartic Phone\n\nИвенты проводятся по Among Us, Clash Royale, Brawl Stars, Minecraft, шахматам и Дураку.',
    },
    {
      icon: <Calendar size={20} className="text-purple-400" />,
      question: 'Что значит значок «Ивенты» на карточке игры?',
      answer: 'Значок «📅 Ивенты» означает что по этой игре проводятся официальные мероприятия и турниры от администрации сервера.\n\n• Турнир — официальное соревнование с призовым фондом, которое проводит администрация (Event Maker). Участники регистрируются, играют по правилам, победители получают награды.\n\n• Свободная игра — если у игры нет значка «Ивенты», это значит что ты можешь просто зайти и играть в любое время с другими участниками без организации.\n\nСледи за расписанием в разделе «Мероприятия» на сайте или в Discord!',
    },
    {
      icon: <Star size={20} className="text-yellow-400" />,
      question: 'Что такое достижения и как они работают?',
      answer: 'Достижения — это награды за твои действия на сайте. Они отображаются в дашборде и показывают твой прогресс.\n\n🏆 Первая победа — выиграй любую игру на сайте\n🎮 Геймер — сыграй 10 игр (любых)\n🍄 Грибной охотник — накопи 200 грибов\n⚡ Быстрый старт — достигни 5 уровня на сайте\n🔥 На огне — одержи 20 побед\n💎 Элита — достигни 25 уровня на сайте\n\nДостижения разблокируются автоматически — тебе не нужно ничего делать кроме игры!',
    },
    {
      icon: <Zap size={20} className="text-yellow-400" />,
      question: 'Как получить роль?',
      answer: 'Роли выдаются за:\n\n• Активность — будь заметен в комьюнити\n• Ивенты — участвуй и побеждай\n• Помощь другим — помогай новичкам\n• Буст — Server Booster за буст сервера\n• Обмен — 5 ролей за ивенты можно обменять на кастомную роль\n\nДля получения роли создай тикет или обратись к модератору.',
    },
    {
      icon: <Sprout size={20} className="text-mushroom-neon" />,
      question: 'Что такое грибы (🍄) и XP?',
      answer: 'Грибы — внутриигровая валюта сайта. Начисляются за активность в Discord (голосовые каналы) и игры на сайте. XP — уровень на сайте, растёт за игры. Начальный баланс — 100 грибов.',
    },
    {
      icon: <Shield size={20} className="text-red-400" />,
      question: 'Что такое варны и Мут?',
      answer: 'Варны — предупреждения за нарушение правил. Их выдаёт модерация через Juniper Bot. При получении 3 варнов выдаётся роль Мут — без прав на сервере. Проверить свои варны можно в разделе «Варны» на сайте.',
    },
    {
      icon: <Star size={20} className="text-yellow-400" />,
      question: 'Как работает уровневая система?',
      answer: 'На сервере работает автоматическая уровневая система через Juniper Bot. Роли выдаются автоматически при достижении нужного уровня:\n\n• Уровень 2 — Pawn: реакции на сообщения, внешние стикеры и эмодзи, встраивание ссылок\n\n• Уровень 20 — Knight: отправка файлов, публикация селфи в ⁠⁠🦋・селфи, возможность включать камеру\n\n• Уровень 45 — Bishop: использование звуковой панели и внешних звуков\n\n• Уровень 75 — Rook: создание собственных реакций и эмоций, установка статуса голосового канала\n\n• Уровень 100 — Queen: отправка голосовых сообщений, создание опросов\n\n• Уровень 120 — King: упоминание всех ролей, обход медленного режима, отключение микрофона участникам, вход в переполненные комнаты, перемещение участников\n\nНастраивать ничего не нужно — роли выдаются автоматически за активность в голосовых каналах Discord.',
    },
    {
      icon: <Users size={20} className="text-pink-400" />,
      question: 'Как стать модератором или ивентмейкером?',
      answer: 'Будь активным, помогай комьюнити, участвуй в жизни сервера. Модераторы и ивентмейкеры выбираются из числа активных участников. Если чувствуешь, что готов — создай тикет с заявкой.',
    },
    {
      icon: <Gamepad2 size={20} className="text-cyan-400" />,
      question: 'Как вступить в игру или ивент?',
      answer: 'Следи за анонсами в Discord — Event Maker публикуют расписание. Также можно самому собрать лобби и позвать людей. Game Architect помогают собирать лобби для Among Us.',
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold gradient-text mb-4">
            Часто задаваемые вопросы
          </h1>
          <p className="text-gray-400 text-lg">
            Всё, что нужно знать о сервере LOLA — в одном месте
          </p>
        </motion.div>

        {/* Важно */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 mb-8 bg-yellow-500/5 border-yellow-500/20"
        >
          <h3 className="text-lg font-bold mb-2 text-yellow-400 flex items-center gap-2">
            <Shield size={18} />
            Важно
          </h3>
          <p className="text-gray-300 text-sm">
            <b className="text-white">Писать Создателю сервера (Lola) нельзя.</b> Все вопросы решаются через стафф:
            <b className="text-white"> Mod</b> → <b className="text-white">Grand Mod</b> → <b className="text-white">Main Moderator</b>.
            Используй тикеты для связи с администрацией.
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {faq.icon}
                  <span className="text-lg font-semibold">{faq.question}</span>
                </div>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={20} className="text-gray-400 flex-shrink-0" />
                </motion.div>
              </button>
              <motion.div
                initial={false}
                animate={{
                  height: openIndex === index ? 'auto' : 0,
                  opacity: openIndex === index ? 1 : 0,
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 pt-2 text-gray-300 leading-relaxed border-t border-white/5 whitespace-pre-line">
                  {faq.answer}
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Call to action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-8 mt-12 text-center"
        >
          <h3 className="text-2xl font-bold mb-4">Не нашёл ответ?</h3>
          <p className="text-gray-400 mb-6">
            Свяжись с нами через тикеты или Discord — мы всегда рады помочь!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/tickets"
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              <MessageCircle size={18} />
              Создать тикет
            </a>
            <a
              href="https://discord.gg/lolaamongus"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-discord inline-flex items-center justify-center gap-2"
            >
              Discord сервер
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default memo(FAQPage);

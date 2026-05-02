import { memo } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Shield, ExternalLink, Crown } from 'lucide-react';

const Contact = () => {
  const contactMethods = [
    {
      icon: <MessageCircle size={24} className="text-discord" />,
      title: 'Discord сервер',
      description: 'Самый быстрый способ связаться с нами. Следи за анонсами и ивентами.',
      action: 'Перейти на сервер',
      link: 'https://discord.gg/lolaamongus',
      external: true,
    },
    {
      icon: <Shield size={24} className="text-mushroom-neon" />,
      title: 'Система тикетов',
      description: 'Создай обращение — администрация ответит. Основной способ для решения вопросов.',
      action: 'Создать тикет',
      link: '/tickets',
      external: false,
    },
  ];

  return (
    <div className="pt-20 sm:pt-24 pb-16 sm:pb-20 px-3 sm:px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 sm:mb-12"
        >
          <h1 className="text-3xl sm:text-4xl sm:text-5xl font-bold gradient-text mb-4">
            Связаться с нами
          </h1>
          <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
            Есть вопрос или проблема? Мы всегда на связи!
          </p>
        </motion.div>

        {/* Важно */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 sm:p-6 mb-8 sm:mb-10 bg-yellow-500/5 border-yellow-500/20"
        >
          <h3 className="text-base sm:text-lg font-bold mb-3 text-yellow-400 flex items-center gap-2">
            <Crown size={18} />
            Важно: Связь с администрацией
          </h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            <b className="text-white">Писать напрямую Создателю сервера (Lola) нельзя.</b> Все вопросы
            решаются через стафф. <b className="text-white">Без тикета:</b> начни с <b className="text-white">Helper</b>.
            <b className="text-white"> С тикетом:</b> <b className="text-white">Mod</b> → <b className="text-white">Grand Mod</b> → <b className="text-white">Main Moderator</b> → <b className="text-white">Lola</b>.
            Стафф разберётся и при необходимости передаст вопрос выше по иерархии.
          </p>
        </motion.div>

        {/* Способы связи */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {contactMethods.map((method, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-5 sm:p-6 card-hover"
            >
              <div className="mb-4">{method.icon}</div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">{method.title}</h3>
              <p className="text-gray-400 text-sm mb-4">{method.description}</p>
              {method.external ? (
                <a
                  href={method.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-discord w-full flex items-center justify-center gap-2 text-sm min-h-[48px]"
                >
                  {method.action}
                  <ExternalLink size={14} />
                </a>
              ) : (
                <a
                  href={method.link}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-sm min-h-[48px]"
                >
                  {method.action}
                </a>
              )}
            </motion.div>
          ))}
        </div>

        {/* Иерархия */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-5 sm:p-8"
        >
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Иерархия решения вопросов</h2>
          <div className="space-y-3 sm:space-y-4">
            {[
              { role: 'Helper', desc: 'Без тикета — первый контакт для обычных вопросов', level: 1 },
              { role: 'Mod', desc: 'С тикетом — решает вопросы через систему обращений', level: 2 },
              { role: 'Grand Mod', desc: 'Помощник Main Moderator — если вопрос не решён', level: 3 },
              { role: 'Main Moderator', desc: 'Главный модератор — для сложных ситуаций', level: 4 },
              { role: 'Lola', desc: 'Создатель сервера — последний уровень иерархии', level: 5 },
            ].map((item) => (
              <div key={item.role} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 rounded-xl">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-mushroom-neon/20 to-mushroom-purple/20 flex items-center justify-center text-xs sm:text-sm font-bold text-mushroom-neon">
                  {item.level}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm sm:text-base">{item.role}</h4>
                  <p className="text-xs sm:text-sm text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8 sm:mt-10"
        >
          <a
            href="https://discord.gg/lolaamongus"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-discord inline-flex items-center gap-2 min-h-[48px]"
          >
            <MessageCircle size={18} />
            Присоединиться к Discord
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default memo(Contact);

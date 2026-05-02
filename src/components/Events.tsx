import { memo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Trophy, Gamepad2, Gift, Clock, Users } from 'lucide-react';

interface Event {
  title: string;
  description: string;
  icon: React.ReactNode;
  date: string;
  participants: string;
  reward: string;
  color: string;
}

const Events = memo(() => {
  const events: Event[] = [
    {
      title: 'Турнир по шашкам',
      description: 'Еженедельный турнир с призовым фондом в 500 грибов. Покажи свои стратегические навыки!',
      icon: <Gamepad2 size={24} className="text-mushroom-neon" />,
      date: 'Каждую субботу',
      participants: '16 участников',
      reward: '500 🍄',
      color: 'from-mushroom-neon to-mushroom-glow',
    },
    {
      title: 'Among Us Night',
      description: 'Классические вечера Among Us с новыми картами и ролями. Присоединяйся!',
      icon: <Users size={24} className="text-red-400" />,
      date: 'Пятница 20:00',
      participants: '10-15 игроков',
      reward: 'XP бонус x2',
      color: 'from-red-500 to-pink-500',
    },
    {
      title: 'Розыгрыш VIP',
      description: 'Ежемесячный розыгрыш VIP-статуса для активных участников сервера.',
      icon: <Gift size={24} className="text-purple-400" />,
      date: '1 число каждого месяца',
      participants: 'Все участники',
      reward: 'VIP на 30 дней',
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Chess Royale Championship',
      description: 'Масштабный турнир по шахматам с системой плей-офф и финалом.',
      icon: <Trophy size={24} className="text-yellow-400" />,
      date: 'Раз в месяц',
      participants: '32 игрока',
      reward: '1000 🍄 + роль',
      color: 'from-yellow-500 to-orange-500',
    },
  ];

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Мероприятия и события</span>
          </h2>
          <p className="text-gray-400 text-lg">Присоединяйся к нашим событиям и получай награды</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((event, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="glass-card p-6 card-hover"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${event.color} flex items-center justify-center flex-shrink-0`}>
                  {event.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">{event.title}</h3>
                  <p className="text-gray-400 text-sm mb-4">{event.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={14} className="text-mushroom-neon" />
                  <span className="text-gray-300">{event.date}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users size={14} className="text-blue-400" />
                  <span className="text-gray-300">{event.participants}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={14} className="text-yellow-400" />
                  <span className="text-mushroom-neon font-bold">{event.reward}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <a
            href="https://discord.gg/lolaamongus"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-discord inline-flex items-center gap-2"
          >
            <Calendar size={18} />
            Расписание в Discord
          </a>
        </motion.div>
      </div>
    </section>
  );
});

export default Events;

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, Gamepad2, MessageCircle, AlertTriangle, Crown } from 'lucide-react';

const RulesSection = () => {
  const rules = [
    {
      number: '01',
      title: 'Уважение',
      description: 'Уважай всех участников сервера. Оскорбления, токсичность, дискриминация и буллинг запрещены. Мы — дружное комьюнити.',
      icon: <Users size={24} className="text-blue-400" />,
    },
    {
      number: '02',
      title: 'Порядок в чатах',
      description: 'Не спамь в чатах и голосовых каналах. Одно сообщение за раз. Используй подходящие каналы для тем.',
      icon: <MessageCircle size={24} className="text-green-400" />,
    },
    {
      number: '03',
      title: 'Контент',
      description: 'Запрещён NSFW и неприемлемый контент. Сервер для всех возрастов. Реклама без разрешения запрещена.',
      icon: <Shield size={24} className="text-purple-400" />,
    },
    {
      number: '04',
      title: 'Честная игра',
      description: 'Читерство, использование багов и нечестные методы в играх запрещены. Честность — ключ к победе!',
      icon: <Gamepad2 size={24} className="text-yellow-400" />,
    },
    {
      number: '05',
      title: 'Система предупреждений',
      description: 'За нарушения выдаются варны через Juniper Bot. 3 варна = роль Мут (без прав). Серьёзные нарушения могут привести к бану.',
      icon: <AlertTriangle size={24} className="text-red-400" />,
    },
    {
      number: '06',
      title: 'Администрация',
      description: 'Слушай модераторов и админов. Вопросы решаются через стафф — писать напрямую Создателю (Lola) нельзя.',
      icon: <Crown size={24} className="text-mushroom-neon" />,
    },
  ];

  return (
    <section className="py-20 px-4 bg-black/30">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Правила сервера</span>
          </h2>
          <p className="text-gray-400 text-lg">Следуй этим правилам для комфортной игры</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rules.map((rule, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="glass-card p-6 card-hover"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-mushroom-neon/20 to-mushroom-purple/20 flex items-center justify-center text-mushroom-neon font-bold text-xl">
                  {rule.number}
                </div>
                {rule.icon}
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">{rule.title}</h3>
              <p className="text-gray-400 text-sm">{rule.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(RulesSection);

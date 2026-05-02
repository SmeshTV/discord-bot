import { memo } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Shield, Users, Trophy, Calendar, Award } from 'lucide-react';

const AboutSection = () => {
  const features = [
    {
      icon: Gamepad2,
      title: '15+ игр',
      description: 'Among Us (все карты), Clash Royale, Minecraft, Шахматы, Дурак, JackBox, Бункер, Шпион, Codenames, Alias, Gartic Phone и другие',
      emoji: '🎮'
    },
    {
      icon: Calendar,
      title: 'Регулярные ивенты',
      description: 'Турниры по шахматам, ивенты по Among Us, Clash Royale, Brawl Stars и Minecraft. Активное расписание событий',
      emoji: '📅'
    },
    {
      icon: Shield,
      title: 'Система ролей',
      description: '20+ ролей: от руководства до кастомных. Получай роли за активность, ивенты и вклад в комьюнити',
      emoji: '🛡️'
    },
    {
      icon: Trophy,
      title: 'Система прогресса',
      description: 'Зарабатывай грибы (🍄) и XP за активность в Discord и игры на сайте. Обменивай на предметы в магазине',
      emoji: '🍄'
    },
    {
      icon: Users,
      title: 'Дружное комьюнити',
      description: 'Активные участники, дружелюбная атмосфера, помощь новичкам. Модерация следит за порядком',
      emoji: '👥'
    },
    {
      icon: Award,
      title: 'Турниры и призы',
      description: 'Регулярные турниры с призовыми фондами. Шахматы, Дурак, Clash Royale — побеждай и получай награды',
      emoji: '🏆'
    },
  ];

  return (
    <section id="about" className="py-12 sm:py-16 lg:py-20 px-3 sm:px-4">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-16"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">О сервере LOLA</span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-2xl lg:max-w-3xl mx-auto">
            Мы — дружное комьюнити геймеров с 15+ играми, регулярными турнирами
            и уникальной системой ролей. Каждый найдёт что-то для себя!
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature, index) => {
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="glass-card p-5 sm:p-8 card-hover"
              >
                <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="text-3xl sm:text-4xl">{feature.emoji}</div>
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-bold mb-2 text-mushroom-neon">
                      {feature.title}
                    </h3>
                    <p className="text-gray-400 text-sm">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default memo(AboutSection);

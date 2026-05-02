import { memo } from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

interface Testimonial {
  name: string;
  role: string;
  avatar: string;
  text: string;
  rating: number;
}

const Testimonials = memo(() => {
  const testimonials: Testimonial[] = [
    {
      name: 'Алексей',
      role: 'Участник 6 мес.',
      avatar: '🎮',
      text: 'Лучшее комьюнити, в котором я был! Тут нашёл крутых тиммейтов для Among Us и постоянных соперников по шахматам. Система грибов — просто огонь! 🔥',
      rating: 5,
    },
    {
      name: 'Мария',
      role: 'Игрок',
      avatar: '🌟',
      text: 'Очень дружелюбная атмосфера. Новичкам всегда помогают, модераторы быстро реагируют. А ещё тут классное казино — уже удвоила свои грибы! 🍄',
      rating: 5,
    },
    {
      name: 'Дмитрий',
      role: 'Тимлид',
      avatar: '👑',
      text: 'Сижу тут уже больше года. За это время сообщество сильно выросло, но сохранило свою ламповость. Ивенты проводятся регулярно, всегда весело!',
      rating: 5,
    },
    {
      name: 'Анна',
      role: 'Стример',
      avatar: '🎬',
      text: 'Пришла сюда по рекомендации друзей и не пожалела. Тут не только играют, но и общаются. Уже провела несколько совместных стримов с ребятами!',
      rating: 4,
    },
    {
      name: 'Кирилл',
      role: 'Геймер',
      avatar: '⚔️',
      text: 'Система XP реально мотивирует! Каждый день захожу, чтобы поднять рейтинг. А магазин — отдельная песня, уже купил VIP-статус! 💎',
      rating: 5,
    },
    {
      name: 'Елена',
      role: 'Модератор',
      avatar: '🛡️',
      text: 'Как модератор, могу сказать: здесь действительно заботятся о комьюнити. Мы постоянно работаем над улучшением атмосферы и контента.',
      rating: 5,
    },
  ];

  return (
    <section className="py-20 px-4 bg-black/30">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Отзывы участников</span>
          </h2>
          <p className="text-gray-400 text-lg">Что говорят наши геймеры о LOLA</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="glass-card p-6 card-hover relative"
            >
              <Quote className="absolute top-4 right-4 text-mushroom-neon/20" size={32} />
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-mushroom-neon/20 to-mushroom-purple/20 flex items-center justify-center text-2xl">
                  {testimonial.avatar}
                </div>
                <div>
                  <h4 className="font-bold">{testimonial.name}</h4>
                  <p className="text-xs text-gray-400">{testimonial.role}</p>
                </div>
              </div>

              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={i < testimonial.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
                  />
                ))}
              </div>

              <p className="text-gray-300 text-sm leading-relaxed">
                "{testimonial.text}"
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});

export default Testimonials;

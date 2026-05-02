import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { Users, Gamepad2, MessageCircle, Trophy } from 'lucide-react';
import { getServerStats } from '../lib/database';
import { getCached, setCached } from '../lib/cache';

interface ServerStats {
  totalUsers: number;
  totalGames: number;
  topMushrooms: number;
}

const StatsSection = memo(() => {
  const [stats, setStats] = useState<ServerStats>(() => {
    const cached = getCached<ServerStats>('server_stats');
    return cached || { totalUsers: 0, totalGames: 0, topMushrooms: 0 };
  });

  useEffect(() => {
    const loadStats = async () => {
      const data = await getServerStats();
      setStats(data);
      setCached('server_stats', data);
    };

    loadStats();
  }, []);

  const displayStats = [
    { icon: Users, value: stats.totalUsers.toString(), label: 'Участников', color: 'from-blue-500 to-purple-500' },
    { icon: Gamepad2, value: stats.totalGames.toString(), label: 'Игр проведено', color: 'from-green-500 to-emerald-500' },
    { icon: MessageCircle, value: '10K+', label: 'Сообщений', color: 'from-pink-500 to-red-500' },
    { icon: Trophy, value: stats.topMushrooms.toString(), label: 'Топ грибов', color: 'from-yellow-500 to-orange-500' },
  ];

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Статистика сервера</span>
          </h2>
          <p className="text-gray-400 text-lg">Наше комьюнити растёт каждый день</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="glass-card p-6 card-hover"
              >
                <div className={`w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <Icon size={32} className="text-white" />
                </div>
                <h3 className="text-3xl font-bold text-mushroom-neon mb-2">{stat.value}</h3>
                <p className="text-gray-400">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
});

export default StatsSection;

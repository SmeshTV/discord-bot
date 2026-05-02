import { motion } from 'framer-motion';
import { memo } from 'react';

interface ActivityDay {
  day: string;
  xp: number;
  mushrooms: number;
}

const MOCK_DATA: ActivityDay[] = [
  { day: 'Пн', xp: 45, mushrooms: 12 },
  { day: 'Вт', xp: 120, mushrooms: 35 },
  { day: 'Ср', xp: 80, mushrooms: 20 },
  { day: 'Чт', xp: 200, mushrooms: 55 },
  { day: 'Пт', xp: 150, mushrooms: 40 },
  { day: 'Сб', xp: 300, mushrooms: 80 },
  { day: 'Вс', xp: 180, mushrooms: 45 },
];

const ActivityChart = memo(({ data = MOCK_DATA }: { data?: ActivityDay[] }) => {
  const maxXp = Math.max(...data.map(d => d.xp), 1);
  const maxMush = Math.max(...data.map(d => d.mushrooms), 1);

  return (
    <div className="glass-card p-6">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="text-mushroom-neon">📊</span>
        Активность за неделю
      </h3>

      {/* XP Chart */}
      <div className="mb-6">
        <p className="text-sm text-gray-400 mb-3">Discord XP</p>
        <div className="flex items-end gap-2 h-32">
          {data.map((d, i) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500">{d.xp}</span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(d.xp / maxXp) * 100}%` }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="w-full bg-gradient-to-t from-discord/50 to-discord rounded-t-lg min-h-[4px]"
              />
              <span className="text-xs text-gray-500">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mushrooms Chart */}
      <div>
        <p className="text-sm text-gray-400 mb-3">Грибы 🍄</p>
        <div className="flex items-end gap-2 h-32">
          {data.map((d, i) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500">{d.mushrooms}</span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(d.mushrooms / maxMush) * 100}%` }}
                transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }}
                className="w-full bg-gradient-to-t from-mushroom-neon/50 to-mushroom-neon rounded-t-lg min-h-[4px]"
              />
              <span className="text-xs text-gray-500">{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default ActivityChart;

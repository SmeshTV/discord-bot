import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Shield, Send, Users, Star, Crown, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { addToast } from '../components/NotificationToast';

const roleOptions = [
  'Game Architect',
  'Event Maker',
  'Helper',
  'Mod',
  'Tech Admin',
  'Media',
  'Grand Master',
  'Clash Royale — ивентмейкер',
  'Brawl Stars — ивентмейкер',
  'Minecraft — ивентмейкер',
];

const rolesDescriptions: { [key: string]: string } = {
  'Game Architect': 'Собирает лобби для Among Us. Права: упоминание всех ролей, отключение микрофона, перемещение.',
  'Event Maker': 'Проводит события на регулярной основе. Права: упоминание всех ролей, создание опросов и событий.',
  'Helper': 'Следит за Game Architect. Права: управление сообщениями, отключение микрофона, выдача варнов через бота.',
  'Mod': 'Следит за Helper и Game Architect, просматривает тикеты. Права: аудит, тайм-ауты, управление сообщениями.',
  'Tech Admin': 'Технический администратор. Отвечает за технические вопросы.',
  'Media': 'Медиа-личность, сотрудничающая с сервером.',
  'Grand Master': 'Пиарщик сервера.',
  'Clash Royale — ивентмейкер': 'Организатор ивентов по Clash Royale.',
  'Brawl Stars — ивентмейкер': 'Организатор ивентов по Brawl Stars.',
  'Minecraft — ивентмейкер': 'Организатор ивентов по Minecraft.',
};

const ApplicationsPage = () => {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState('');
  const [reason, setReason] = useState('');
  const [experience, setExperience] = useState('');
  const [activityHours, setActivityHours] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  if (!user) {
    return (
      <div className="pt-24 pb-20 px-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-2xl text-gray-400 mb-4">Войди через Discord чтобы подать заявку</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!selectedRole || !reason || !experience || !activityHours || !aboutMe) {
      addToast({
        title: 'Заполни все поля',
        message: 'Все поля анкеты обязательны',
        icon: '⚠️',
        duration: 3000,
      });
      return;
    }

    setSending(true);

    const { error } = await supabase
      .from('role_applications')
      .insert([{
        user_id: user.id,
        username: user.username,
        discord_id: user.discord_id,
        desired_role: selectedRole,
        reason,
        experience,
        activity_hours: activityHours,
        about_me: aboutMe,
        status: 'pending',
        admin_note: '',
      }]);

    if (error) {
      addToast({ title: 'Ошибка', message: 'Не удалось отправить заявку', icon: '❌', duration: 4000 });
      setSending(false);
      return;
    }

    setSubmitted(true);
    setSending(false);

    addToast({
      title: 'Заявка отправлена! ✅',
      message: `Заявка на роль "${selectedRole}" отправлена. Ожидай ответа.`,
      icon: '📨',
      duration: 5000,
    });
  };

  if (submitted) {
    return (
      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <CheckCircle size={64} className="mx-auto text-green-400 mb-6" />
            <h1 className="text-4xl font-bold gradient-text mb-4">Заявка отправлена!</h1>
            <p className="text-gray-400 text-lg mb-2">
              Заявка на роль <b className="text-mushroom-neon">{selectedRole}</b> отправлена на рассмотрение.
            </p>
            <p className="text-gray-500 mb-8">
              Администрация рассмотрит заявку в течение нескольких дней. Результат будет сообщён через тикет или Discord.
            </p>
            <button onClick={() => { setSubmitted(false); setSelectedRole(''); setReason(''); setExperience(''); setActivityHours(''); setAboutMe(''); }} className="btn-primary">
              Подать ещё одну заявку
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-5xl font-bold gradient-text mb-4">
            📋 Подача на роль
          </h1>
          <p className="text-gray-400 text-lg">
            Заполни анкету чтобы претендовать на роль
          </p>
        </motion.div>

        {/* Информация */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 mb-8 bg-blue-500/5 border-blue-500/20"
        >
          <h3 className="text-lg font-bold mb-3 text-blue-400 flex items-center gap-2">
            <AlertCircle size={18} />
            Важная информация
          </h3>
          <ul className="text-gray-300 text-sm space-y-2">
            <li>• Заявки рассматриваются администрацией в течение нескольких дней</li>
            <li>• Для ролей Helper+ нужен активный опыт модерации</li>
            <li>• Для ивентмейкеров — опыт проведения мероприятий</li>
            <li>• Честно отвечай на все вопросы</li>
            <li>• Связаться с создателем нельзя — всё через стафф</li>
          </ul>
        </motion.div>

        {/* Анкета */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-8"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Users className="text-mushroom-neon" size={24} />
            Анкета
          </h2>

          <div className="space-y-6">
            {/* Выбор роли */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                <Crown size={14} className="inline mr-1" />
                На какую роль подаёшь заявку? *
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-mushroom-neon focus:outline-none focus:ring-2 focus:ring-mushroom-neon/20 transition-all text-white"
              >
                <option value="" className="bg-gray-900">Выбери роль...</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role} className="bg-gray-900">{role}</option>
                ))}
              </select>
              {selectedRole && rolesDescriptions[selectedRole] && (
                <p className="text-xs text-gray-400 mt-2 p-3 bg-white/5 rounded-lg">{rolesDescriptions[selectedRole]}</p>
              )}
            </div>

            {/* Мотивация */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Почему ты хочешь получить эту роль? *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Расскажи почему ты хочешь именно эту роль и чем она тебе интересна..."
                rows={3}
                maxLength={500}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-mushroom-neon focus:outline-none focus:ring-2 focus:ring-mushroom-neon/20 transition-all resize-none text-white placeholder-gray-500"
              />
              <div className="text-right text-xs text-gray-500 mt-1">{reason.length}/500</div>
            </div>

            {/* Опыт */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                <Star size={14} className="inline mr-1" />
                Какой у тебя опыт/опыт? *
              </label>
              <textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="Опиши свой опыт модерации, проведения ивентов, игры на сервере..."
                rows={3}
                maxLength={500}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-mushroom-neon focus:outline-none focus:ring-2 focus:ring-mushroom-neon/20 transition-all resize-none text-white placeholder-gray-500"
              />
              <div className="text-right text-xs text-gray-500 mt-1">{experience.length}/500</div>
            </div>

            {/* Активность */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Сколько часов в день ты активен на сервере? *
              </label>
              <input
                type="text"
                value={activityHours}
                onChange={(e) => setActivityHours(e.target.value)}
                placeholder="Например: 3-5 часов вечером, весь день в выходные"
                maxLength={100}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-mushroom-neon focus:outline-none focus:ring-2 focus:ring-mushroom-neon/20 transition-all text-white placeholder-gray-500"
              />
            </div>

            {/* О себе */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Расскажи о себе *
              </label>
              <textarea
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                placeholder="Расскажи о себе: возраст (примерно), интересы, чем занимаешься на сервере..."
                rows={4}
                maxLength={500}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-mushroom-neon focus:outline-none focus:ring-2 focus:ring-mushroom-neon/20 transition-all resize-none text-white placeholder-gray-500"
              />
              <div className="text-right text-xs text-gray-500 mt-1">{aboutMe.length}/500</div>
            </div>

            {/* Отправить */}
            <button
              onClick={handleSubmit}
              disabled={sending}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send size={18} />
              {sending ? 'Отправка...' : 'Отправить заявку'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default memo(ApplicationsPage);

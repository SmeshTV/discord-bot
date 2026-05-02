import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, Crown, Gamepad2, Star, Send, Loader2, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { getRoleName, getRoleColor, getRoleCategory, APPLICABLE_ROLES } from '../lib/roles';

export default function Community() {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [myApplications, setMyApplications] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadMyApplications();
    }
  }, [user]);

  const loadMyApplications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('role_applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setMyApplications(data || []);
  };

  const submitApplication = async () => {
    if (!user || !selectedRole || !reason.trim()) return;
    setSubmitting(true);

    const { data, error } = await supabase.from('role_applications').insert({
      user_id: user.id,
      username: user.username,
      desired_role: selectedRole,
      reason: reason.trim(),
      experience: '',
      activity_hours: '',
      about_me: '',
    }).select();

    if (!error) {
      setSubmitted(true);
      setSelectedRole(null);
      setReason('');
      loadMyApplications();
    }

    setSubmitting(false);
  };

  const rolesByCategory = APPLICABLE_ROLES.reduce((acc, role) => {
    const cat = role.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(role);
    return acc;
  }, {} as { [key: string]: typeof APPLICABLE_ROLES[] });

  const categoryLabels: { [key: string]: { label: string; emoji: string } } = {
    admin: { label: 'Администрация', emoji: '🛡️' },
    rank: { label: 'Ранговая система', emoji: '⚔️' },
    special: { label: 'Особые роли', emoji: '⭐' },
    game: { label: 'Игровые роли', emoji: '🎮' },
    tag: { label: 'Уведомления', emoji: '🔔' },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-5xl font-bold gradient-text mb-2">Сообщество</h1>
          <p className="text-gray-400">Подай заявку на роль и стань частью команды LOLA</p>
        </motion.div>

        {myApplications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 mb-8"
          >
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Star className="text-yellow-400" size={20} />
              Мои заявки
            </h3>
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              {myApplications.map((app) => (
                <motion.div 
                  key={app.id} 
                  variants={itemVariants}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-mushroom-neon font-medium">
                      {getRoleName(app.role_id)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      app.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {app.status === 'pending' ? 'На рассмотрении' :
                       app.status === 'approved' ? 'Одобрено' : 'Отклонено'}
                    </span>
                  </div>
                  <span className="text-gray-500 text-sm">
                    {new Date(app.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 mb-8"
        >
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Send className="text-mushroom-neon" size={20} />
            Подать заявку на роль
          </h3>

          {!user ? (
            <p className="text-gray-400">Войди через Discord, чтобы подать заявку</p>
          ) : submitted ? (
            <div className="text-center py-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mb-4"
              >
                <CheckCircle className="text-green-400 mx-auto" size={48} />
              </motion.div>
              <p className="text-green-400 font-bold text-lg">Заявка отправлена!</p>
              <p className="text-gray-400 mt-2">Мы рассмотрим её в ближайшее время</p>
              <button
                onClick={() => setSubmitted(false)}
                className="btn-primary mt-4"
              >
                Подать ещё одну
              </button>
            </div>
          ) : (
            <>
              <p className="text-gray-400 mb-4">Выбери роль, на которую хочешь подать заявку:</p>

              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3 mb-6"
              >
                {Object.entries(rolesByCategory).map(([category, roles]) => (
                  <motion.div key={category} variants={itemVariants}>
                    <button
                      onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{categoryLabels[category]?.emoji}</span>
                        <span className="font-medium">{categoryLabels[category]?.label}</span>
                        <span className="text-xs text-gray-500">({roles.length})</span>
                      </div>
                      {expandedCategory === category ? (
                        <ChevronDown className="text-mushroom-neon" size={20} />
                      ) : (
                        <ChevronRight className="text-gray-500" size={20} />
                      )}
                    </button>
                    
                    <AnimatePresence>
                      {expandedCategory === category && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <motion.div 
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="flex flex-wrap gap-2 mt-3 pl-2"
                          >
                            {roles.map((role) => (
                              <motion.button
                                key={role.id}
                                variants={itemVariants}
                                onClick={() => setSelectedRole(role.id)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                  selectedRole === role.id
                                    ? `bg-gradient-to-r ${role.color} text-white shadow-lg`
                                    : 'bg-white/10 hover:bg-white/20 text-gray-300'
                                }`}
                              >
                                {role.name}
                              </motion.button>
                            ))}
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </motion.div>

              <AnimatePresence>
                {selectedRole && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mb-4 p-4 bg-mushroom-neon/10 border border-mushroom-neon/30 rounded-xl">
                      <label className="text-gray-300 text-sm">Почему ты хочешь эту роль?</label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Расскажи о себе и почему ты подходишь..."
                        rows={4}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 px-4 text-white mt-2 resize-none focus:border-mushroom-neon focus:outline-none transition-colors"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                onClick={submitApplication}
                disabled={!selectedRole || !reason.trim() || submitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Send size={20} />
                )}
                Отправить заявку
              </motion.button>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Shield className="text-blue-400" size={20} />
            Как получить роль
          </h3>
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3 text-gray-300"
          >
            <motion.p variants={itemVariants} className="flex items-start gap-3">
              <span className="text-mushroom-neon font-bold">1.</span>
              <span><span className="text-white font-bold">Выбери роль</span> — нажми на нужную роль выше</span>
            </motion.p>
            <motion.p variants={itemVariants} className="flex items-start gap-3">
              <span className="text-mushroom-neon font-bold">2.</span>
              <span><span className="text-white font-bold">Напиши мотивацию</span> — объясни, почему ты хочешь эту роль</span>
            </motion.p>
            <motion.p variants={itemVariants} className="flex items-start gap-3">
              <span className="text-mushroom-neon font-bold">3.</span>
              <span><span className="text-white font-bold">Отправь заявку</span> — администрация рассмотрит её</span>
            </motion.p>
            <motion.p variants={itemVariants} className="flex items-start gap-3">
              <span className="text-mushroom-neon font-bold">4.</span>
              <span><span className="text-white font-bold">Жди решения</span> — мы свяжемся с тобой</span>
            </motion.p>
          </motion.div>
          <p className="text-gray-500 text-sm mt-4">
            ⚠️ Заявки рассматриваются администрацией. Не спами — одна заявка на роль.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

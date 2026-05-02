import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Shield, Ban } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { getCached, setCached } from '../lib/cache';

interface Warning {
  id: string;
  user_id: string;
  username: string;
  reason: string;
  severity: string;
  status: string;
  created_at: string;
}

const WarningsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [warnings, setWarnings] = useState<Warning[]>(() => getCached('warnings_list_my') || []);

  useEffect(() => {
    if (authLoading || !user) return;

    const loadWarnings = async () => {
      const { data } = await supabase
        .from('warnings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setWarnings(data || []);
      setCached('warnings_list_my', data || []);
    };

    loadWarnings();
  }, [user, authLoading]);

  const activeWarnings = warnings.filter(w => w.status === 'pending' || w.status === 'accepted');

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-gray-900 pt-20 pb-20 px-4">
      <div className="max-w-3xl mx-auto relative">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>
        
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/30">
            <AlertTriangle className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Предупреждения</h1>
            <p className="text-gray-400 text-sm">Система варнов LOLA</p>
          </div>
        </motion.div>

        {user && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`glass-card p-6 mb-8 border-l-4 ${
              activeWarnings.length >= 3 ? 'border-red-500 bg-red-500/5' :
              activeWarnings.length >= 1 ? 'border-orange-500 bg-orange-500/5' :
              'border-green-500 bg-green-500/5'
            }`}
          >
            <div className="flex items-center gap-4">
              {activeWarnings.length >= 3 ? <Ban className="text-red-500" size={40} /> :
               activeWarnings.length >= 1 ? <AlertTriangle className="text-orange-500" size={40} /> :
               <CheckCircle className="text-green-500" size={40} />}
              <div>
                <p className="text-lg font-bold">
                  {activeWarnings.length >= 1 ? `⚠️ Выдано: ${activeWarnings.length}` : '✅ Нет предупреждений'}
                </p>
                <p className="text-gray-400">
                  {activeWarnings.length}/3 предупреждений
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
            <Shield className="text-orange-400" />
            Ваши предупреждения
          </h3>
          
          {warnings.length > 0 ? (
            <div className="space-y-3">
              {warnings.map(w => (
                <div key={w.id} className={`p-4 rounded-xl border ${
                  w.status === 'pending' || w.status === 'accepted' 
                    ? 'bg-orange-500/5 border-orange-500/20' 
                    : 'bg-green-500/5 border-green-500/20'
                }`}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-orange-400 flex-shrink-0 mt-0.5" size={18} />
                    <div className="flex-1">
                      <p className="font-medium">{w.reason}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Выдано: {new Date(w.created_at).toLocaleString('ru-RU')}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      w.severity === 'high' ? 'bg-red-500/20 text-red-400' : 
                      w.severity === 'medium' ? 'bg-orange-500/20 text-orange-400' : 
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {w.severity === 'high' ? 'Серьёзно' : w.severity === 'medium' ? 'Средне' : 'Легко'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto text-green-500 mb-3" size={40} />
              <p className="text-green-400 font-bold">У вас нет предупреждений</p>
              <p className="text-gray-500 text-sm mt-1">Так держать!</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default WarningsPage;
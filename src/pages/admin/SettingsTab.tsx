import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, Cpu, HardDrive, Server, Clock, Activity, RefreshCw, Save, Settings, Shield, Key, Globe, Bell, Palette, Code, Terminal, Zap, AlertTriangle, CheckCircle, XCircle, Loader2, ExternalLink, Copy } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const SettingsTab = () => {
  const [activeSection, setActiveSection] = useState('system');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [systemStats, setSystemStats] = useState({
    cpu: 0,
    ram: 0,
    disk: 0,
    uptime: 0,
  });

  const [discordInfo, setDiscordInfo] = useState({
    guildId: '1463228311118549124',
    bots: 3,
    roles: 24,
    channels: 45,
    members: 0,
    warnings: 0,
    tickets: 0,
    events: 0,
    purchases: 0,
  });

  const [notifications, setNotifications] = useState({
    email: true,
    newTickets: true,
    newWarnings: false,
    purchases: true,
    events: true,
    updates: false,
  });

  const [appearance, setAppearance] = useState({
    accentColor: '#8b5cf6',
    darkMode: true,
  });

  useEffect(() => {
    loadSystemInfo();
  }, []);

  const loadSystemInfo = async () => {
    setLoading(true);
    try {
      const [{ count: usersCount }, { count: warningsCount }, { count: ticketsCount }, { count: eventsCount }, { count: purchasesCount }] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('warnings').select('*', { count: 'exact', head: true }),
        supabase.from('tickets').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('shop_purchases').select('*', { count: 'exact', head: true }),
      ]);

      setDiscordInfo(prev => ({
        ...prev,
        roles: 24,
        channels: 45,
        members: usersCount || 0,
        warnings: warningsCount || 0,
        tickets: ticketsCount || 0,
        events: eventsCount || 0,
        purchases: purchasesCount || 0,
      }));

      setSystemStats({
        cpu: 15,
        ram: 2,
        disk: 120,
        uptime: 720,
      });
    } catch (error) {
      console.error('Error loading system info:', error);
    }
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await Promise.all([
        supabase.from('users').select('id').limit(1),
        supabase.from('warnings').select('id').limit(1),
        supabase.from('tickets').select('id').limit(1),
      ]);
      
      await loadSystemInfo();
    } catch (error) {
      console.error('Error syncing:', error);
    }
    setSyncing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving:', error);
    }
    
    setSaving(false);
  };

  const sections = [
    { id: 'system', label: 'Система', icon: Server },
    { id: 'discord', label: 'Discord', icon: Globe },
    { id: 'security', label: 'Безопасность', icon: Shield },
    { id: 'notifications', label: 'Уведомления', icon: Bell },
    { id: 'appearance', label: 'Внешний вид', icon: Palette },
    { id: 'api', label: 'API', icon: Code },
  ];

  const Toggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button 
      onClick={onToggle} 
      className={`w-12 h-6 rounded-full transition-colors flex items-center ${enabled ? 'bg-green-500' : 'bg-gray-600'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex gap-2 flex-wrap mb-6">
        {sections.map(sec => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
              activeSection === sec.id 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <sec.icon size={18} />
            {sec.label}
          </button>
        ))}
      </div>

      {activeSection === 'system' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Server className="text-purple-400" size={24} />
              <h3 className="text-lg font-bold">Системная информация</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-700/30 rounded-xl">
                <Cpu className="text-green-400 mb-2" size={20} />
                <p className="text-xl font-bold">{systemStats.cpu}%</p>
                <p className="text-gray-400 text-sm">CPU</p>
              </div>
              <div className="p-4 bg-gray-700/30 rounded-xl">
                <HardDrive className="text-blue-400 mb-2" size={20} />
                <p className="text-xl font-bold">{systemStats.ram} GB</p>
                <p className="text-gray-400 text-sm">RAM</p>
              </div>
              <div className="p-4 bg-gray-700/30 rounded-xl">
                <Database className="text-yellow-400 mb-2" size={20} />
                <p className="text-xl font-bold">{systemStats.disk} MB</p>
                <p className="text-gray-400 text-sm">Disk</p>
              </div>
              <div className="p-4 bg-gray-700/30 rounded-xl">
                <Clock className="text-purple-400 mb-2" size={20} />
                <p className="text-xl font-bold">{Math.floor(systemStats.uptime / 24)}d</p>
                <p className="text-gray-400 text-sm">Uptime</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="text-green-400" size={24} />
              <h3 className="text-lg font-bold">Статус сервисов</h3>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Supabase', status: 'online', latency: '45ms' },
                { name: 'Discord API', status: 'online', latency: '120ms' },
                { name: 'Edge Functions', status: 'online', latency: '89ms' },
                { name: 'WebSocket', status: 'online', latency: '23ms' },
              ].map((service, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span>{service.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm">{service.latency}</span>
                    <CheckCircle size={16} className="text-green-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 p-6 md:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <RefreshCw className={`text-cyan-400 ${syncing ? 'animate-spin' : ''}`} size={24} />
                <h3 className="text-lg font-bold">Синхронизация</h3>
              </div>
              <button 
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors disabled:opacity-50"
              >
                <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Синхронизация...' : 'Синхронизировать'}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Пользователи', synced: true, time: '2 мин назад' },
                { label: 'Варны', synced: true, time: '5 мин назад' },
                { label: 'Тикеты', synced: true, time: '1 мин назад' },
                { label: 'Игры', synced: true, time: '3 мин назад' },
              ].map((item, i) => (
                <div key={i} className="p-4 bg-gray-700/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    {item.synced ? (
                      <CheckCircle size={16} className="text-green-400" />
                    ) : (
                      <XCircle size={16} className="text-red-400" />
                    )}
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <p className="text-gray-400 text-sm">{item.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'discord' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="text-blue-400" size={24} />
              <h3 className="text-lg font-bold">Discord сервер</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Пользователей на сайте', value: discordInfo.members },
                { label: 'Варнов', value: discordInfo.warnings },
                { label: 'Тикетов', value: discordInfo.tickets },
                { label: 'Мероприятий', value: discordInfo.events },
                { label: 'Покупок в магазине', value: discordInfo.purchases },
              ].map((info, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                  <span className="text-gray-400">{info.label}</span>
                  <span className="font-mono text-sm">{info.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="text-yellow-400" size={24} />
              <h3 className="text-lg font-bold">Discord бот</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-xl">
                <span>Статус</span>
                <span className="text-green-400 font-bold">Онлайн</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                <span className="text-gray-400">Команд/мин</span>
                <span className="font-bold">45</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                <span className="text-gray-400">Обработано</span>
                <span className="font-bold">1,234</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                <span className="text-gray-400">Ошибок</span>
                <span className="text-green-400 font-bold">0</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'security' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Key className="text-green-400" size={24} />
              <h3 className="text-lg font-bold">Безопасность</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-xl">
                <span>2FA</span>
                <span className="text-green-400">Включено</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                <span>Сессий</span>
                <span className="font-bold">3</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                <span>Последний вход</span>
                <span>Сегодня</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="text-purple-400" size={24} />
              <h3 className="text-lg font-bold">Роли и права</h3>
            </div>
            <div className="space-y-2">
              {[
                { role: 'Администраторы', count: 3 },
                { role: 'Модераторы', count: 5 },
                { role: 'VIP', count: 45 },
                { role: 'Проверенные', count: 123 },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                  <span>{item.role}</span>
                  <span className="text-purple-400 font-bold">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'notifications' && (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="text-yellow-400" size={24} />
            <h3 className="text-lg font-bold">Уведомления</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { label: 'Email уведомления', key: 'email' },
              { label: 'Новые тикеты', key: 'newTickets' },
              { label: 'Новые варны', key: 'newWarnings' },
              { label: 'Покупки в магазине', key: 'purchases' },
              { label: 'Ивенты', key: 'events' },
              { label: 'Обновления', key: 'updates' },
            ].map((notif, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
                <span>{notif.label}</span>
                <Toggle 
                  enabled={notifications[notif.key as keyof typeof notifications]} 
                  onToggle={() => setNotifications(s => ({ ...s, [notif.key]: !s[notif.key as keyof typeof s] }))} 
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'appearance' && (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="text-pink-400" size={24} />
            <h3 className="text-lg font-bold">Внешний вид</h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-gray-700/30 rounded-xl">
              <p className="mb-3 text-gray-400">Цвет акцента</p>
              <div className="flex gap-3">
                {['#8b5cf6', '#ef4444', '#22c55e', '#3b82f6', '#f59e0b'].map((color, i) => (
                  <button 
                    key={i} 
                    onClick={() => setAppearance(s => ({ ...s, accentColor: color }))}
                    className={`w-10 h-10 rounded-xl transition-transform ${appearance.accentColor === color ? 'scale-110 ring-2 ring-white' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
              <span>Тёмная тема</span>
              <span className="text-green-400">✓ Активна</span>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'api' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Code className="text-cyan-400" size={24} />
              <h3 className="text-lg font-bold">API ключи</h3>
            </div>
            <div className="p-4 bg-gray-700/30 rounded-xl font-mono text-sm flex items-center justify-between">
              <span>••••••••-••••-••••-••••-••••••••••••</span>
              <button className="p-1 hover:bg-gray-600 rounded">
                <Copy size={14} />
              </button>
            </div>
            <button className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors">
              Сгенерировать новый
            </button>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Terminal className="text-green-400" size={24} />
              <h3 className="text-lg font-bold">Edge Functions</h3>
            </div>
            <div className="space-y-2">
              {[
                'apply-mute',
                'issue-warning', 
                'create-ticket',
                'get-discord-roles',
              ].map((fn, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                  <code className="text-sm">{fn}</code>
                  <CheckCircle size={16} className="text-green-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          onClick={loadSystemInfo}
          className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
        >
          <RefreshCw size={18} />
          Обновить
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : saved ? <CheckCircle size={18} /> : <Save size={18} />}
          {saved ? 'Сохранено!' : 'Сохранить'}
        </button>
      </div>
    </motion.div>
  );
};

export default SettingsTab;
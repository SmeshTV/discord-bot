import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, AlertCircle, Trophy, Settings, BarChart3, Ticket, Package, Image, MessageSquare, Calendar, UserCheck, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import {
  OverviewTab,
  UsersTab,
  WarningsTab,
  TicketsTab,
  ShopTab,
  MediaTab,
  ChatTab,
  EventsTab,
  RoleApplicationsTab,
  SettingsTab,
  PermissionsTab
} from './admin';

const ROLE_LOLA = '1463230825041756302';
const ROLE_MAIN_MOD = '1463271031501357067';
const ROLE_GRAND_MOD = '1464965472704266414';
const ROLE_EVENT_MAKER = '1465825700031234172';

const ROLE_WARNINGS_TICKETS = [ROLE_LOLA, ROLE_GRAND_MOD];
const ROLE_FULL_ACCESS = [ROLE_MAIN_MOD];
const ROLE_EVENTS_ONLY = [ROLE_EVENT_MAKER];

interface TabAccess {
  id: string;
  label: string;
  icon: any;
  allowedRoles: string[];
}

const ADMIN_TABS: TabAccess[] = [
  { id: 'overview', label: 'Обзор', icon: BarChart3, allowedRoles: [...ROLE_FULL_ACCESS] },
  { id: 'events', label: 'Мероприятия', icon: Calendar, allowedRoles: [...ROLE_FULL_ACCESS, ...ROLE_EVENTS_ONLY] },
  { id: 'users', label: 'Игроки', icon: Users, allowedRoles: [...ROLE_FULL_ACCESS] },
  { id: 'warnings', label: 'Варны', icon: AlertCircle, allowedRoles: [...ROLE_FULL_ACCESS, ...ROLE_WARNINGS_TICKETS] },
  { id: 'tickets', label: 'Тикеты', icon: Ticket, allowedRoles: [...ROLE_FULL_ACCESS, ...ROLE_WARNINGS_TICKETS] },
  { id: 'shop', label: 'Магазин', icon: Package, allowedRoles: [...ROLE_FULL_ACCESS] },
  { id: 'media', label: 'Медиа', icon: Image, allowedRoles: [...ROLE_FULL_ACCESS] },
  { id: 'chat', label: 'Чат', icon: MessageSquare, allowedRoles: [...ROLE_FULL_ACCESS] },
  { id: 'roleapps', label: 'Заявки на роль', icon: UserCheck, allowedRoles: [...ROLE_FULL_ACCESS] },
  { id: 'settings', label: 'Настройки', icon: Settings, allowedRoles: [...ROLE_FULL_ACCESS] },
  { id: 'permissions', label: 'Права', icon: Shield, allowedRoles: [...ROLE_FULL_ACCESS] },
];

const AdminPanel = () => {
  const { permissions } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, games: 0, warnings: 0, tickets: 0, events: 0 });
  const [loading, setLoading] = useState(true);

  const userRoles = permissions?.roles || [];

  const hasAnyAccess = userRoles.some((r: string) => 
    ROLE_FULL_ACCESS.includes(r) || 
    ROLE_WARNINGS_TICKETS.includes(r) || 
    ROLE_EVENTS_ONLY.includes(r)
  );

  const hasFullAccess = userRoles.some((r: string) => ROLE_FULL_ACCESS.includes(r));

  const getAllowedTabs = () => {
    return ADMIN_TABS.filter(tab => 
      tab.allowedRoles.some(roleId => userRoles.includes(roleId))
    );
  };

  const allowedTabs = getAllowedTabs();

  useEffect(() => {
    if (!hasAnyAccess) return;
    loadData();
  }, [hasAnyAccess]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ count: u }, { count: g }, { count: w }, { count: t }, { count: e }, { data: usersData }] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('games').select('*', { count: 'exact', head: true }),
        supabase.from('warnings').select('*', { count: 'exact', head: true }),
        supabase.from('tickets').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*').order('mushrooms', { ascending: false }).limit(20)
      ]);
      setStats({ users: u || 0, games: g || 0, warnings: w || 0, tickets: t || 0, events: e || 0 });
      setUsers(usersData || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  if (!hasAnyAccess) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 pb-20 px-4">
        <div className="text-center text-gray-400 py-20">
          <Lock size={64} className="mx-auto mb-4 text-gray-600" />
          <p>Доступ запрещён</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 pb-20 px-4 flex items-center justify-center">
        <Shield className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-20 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="text-purple-500" size={32} />
          <h1 className="text-3xl font-bold">Админ-панель</h1>
          {hasFullAccess && (
            <span className="px-2 py-1 bg-purple-600/20 rounded text-xs text-purple-400">Полный доступ</span>
          )}
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {allowedTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && <OverviewTab stats={stats} />}
          {activeTab === 'events' && <EventsTab />}
          {activeTab === 'users' && hasFullAccess && <UsersTab users={users} />}
          {activeTab === 'warnings' && <WarningsTab />}
          {activeTab === 'tickets' && <TicketsTab />}
          {activeTab === 'shop' && hasFullAccess && <ShopTab />}
          {activeTab === 'media' && hasFullAccess && <MediaTab />}
          {activeTab === 'chat' && hasFullAccess && <ChatTab />}
          {activeTab === 'roleapps' && hasFullAccess && <RoleApplicationsTab />}
          {activeTab === 'settings' && hasFullAccess && <SettingsTab />}
          {activeTab === 'permissions' && hasFullAccess && <PermissionsTab />}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminPanel;

export { ROLE_LOLA, ROLE_MAIN_MOD, ROLE_GRAND_MOD, ROLE_EVENT_MAKER, ROLE_WARNINGS_TICKETS, ROLE_FULL_ACCESS, ROLE_EVENTS_ONLY };
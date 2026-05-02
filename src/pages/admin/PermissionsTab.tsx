import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, RotateCcw, Shield, Lock, Unlock, AlertTriangle, Plus, Trash2, ArrowUp, ArrowDown, Users, Settings, Edit3, Ticket, ShoppingCart, MessageSquare, Calendar, Award, Search, RefreshCw, Crown, Zap } from 'lucide-react';
import { SERVER_ROLES, getRoleById } from '../../lib/roles';
import { AVAILABLE_PAGES, loadRolePermissions, saveRolePermission, checkAdminAccess } from '../../lib/permissions';
import { useAuth } from '../../hooks/useAuth';

const RESTRICTED_ADMIN_ROLES = [
  '1463230825041756302',
  '1463271031501357067',
  '1464965472704266414',
  '1478351837835825235',
];

interface RolePerms {
  roleId: string;
  roleName: string;
  permissions: { [key: string]: boolean };
  priority: number;
}

export function PermissionsTab() {
  const { user, permissions: authPerms } = useAuth();
  const [roles, setRoles] = useState<RolePerms[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('admin');

  useEffect(() => {
    if (!authPerms?.roles?.length) return;
    const { allowed } = checkAdminAccess(authPerms.roles);
    if (!allowed) {
      setLoading(false);
    }
  }, [authPerms?.roles]);

  useEffect(() => {
    const loadRoles = async () => {
      setLoading(true);
      const loaded: RolePerms[] = [];

      const sortedRoles = [...SERVER_ROLES].sort((a, b) => b.priority - a.priority);

      for (const role of sortedRoles) {
        const perms = await loadRolePermissions(role.id);
        loaded.push({
          roleId: role.id,
          roleName: role.name,
          permissions: perms,
          priority: role.priority,
        });
      }

      setRoles(loaded);
      if (loaded.length > 0 && !selectedRoleId) {
        setSelectedRoleId(loaded[0].roleId);
      }
      setLoading(false);
    };
    loadRoles();
  }, []);

  const handleToggle = useCallback((roleId: string, pageId: string) => {
    setRoles(prev =>
      prev.map(r => {
        if (r.roleId === roleId) {
          return {
            ...r,
            permissions: {
              ...r.permissions,
              [pageId]: !r.permissions[pageId],
            },
          };
        }
        return r;
      })
    );
    setSaved(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedRoleId) return;

    setSaving(true);
    const roleData = roles.find(r => r.roleId === selectedRoleId);
    if (!roleData) {
      setSaving(false);
      return;
    }

    for (const [pageId, allowed] of Object.entries(roleData.permissions)) {
      await saveRolePermission(selectedRoleId, pageId, allowed);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [selectedRoleId, roles]);

  const handlePriorityChange = useCallback((roleId: string, delta: number) => {
    setRoles(prev =>
      prev.map(r => {
        if (r.roleId === roleId) {
          return { ...r, priority: Math.max(0, Math.min(200, r.priority + delta)) };
        }
        return r;
      })
    );
    setSaved(false);
  }, []);

  const handleReset = useCallback(() => {
    setLoading(true);
    window.location.reload();
  }, []);

  const selectedRole = roles.find(r => r.roleId === selectedRoleId);
  const isAdminRole = selectedRole?.priority && selectedRole.priority >= 120;

  const categories = {
    admin: { label: 'Админ-панель', icon: Shield, color: 'purple' },
    games: { label: 'Мини-игры', icon: Zap, color: 'green' },
    profile: { label: 'Профиль', icon: Users, color: 'blue' },
    other: { label: 'Другие', icon: Settings, color: 'gray' },
  };

  const filteredRoles = roles.filter(r => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return r.roleId.toLowerCase().includes(query) || r.roleName.toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RotateCcw className="text-purple-500" size={32} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="text-purple-500" size={28} />
        <h2 className="text-2xl font-bold">Управление правами и ролями</h2>
        <AnimatePresence>
          {saved && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-green-400 text-sm ml-auto flex items-center gap-1"
            >
              <Crown size={14} /> Сохранено
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-gray-800/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Все роли сервера ({roles.length})</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Поиск по ID или имени..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm w-64 focus:border-purple-500 focus:outline-none transition-colors"
              />
            </div>
            <button
              onClick={handleReset}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              title="Обновить"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2">
          {filteredRoles
            .sort((a, b) => b.priority - a.priority)
            .map(role => (
              <motion.div
                key={role.roleId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  setSelectedRoleId(role.roleId);
                  setSaved(false);
                }}
                className={`p-3 rounded-lg cursor-pointer transition-all flex items-center gap-3 ${
                  selectedRoleId === role.roleId
                    ? 'bg-purple-600/20 ring-2 ring-purple-500'
                    : 'bg-gray-700/50 hover:bg-gray-700'
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={e => { e.stopPropagation(); handlePriorityChange(role.roleId, 10); }}
                    className="p-1 hover:bg-gray-600 rounded transition-colors"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handlePriorityChange(role.roleId, -10); }}
                    className="p-1 hover:bg-gray-600 rounded transition-colors"
                  >
                    <ArrowDown size={12} />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{role.roleName}</div>
                  <div className="text-xs text-gray-500 font-mono">ID: {role.roleId}</div>
                </div>

                <div className="text-center px-2">
                  <div className={`text-xl font-bold ${
                    role.priority >= 120 ? 'text-red-400' : 
                    role.priority >= 100 ? 'text-yellow-400' : 
                    'text-gray-400'
                  }`}>{role.priority}</div>
                  <div className="text-[10px] text-gray-600">приор.</div>
                </div>

                {role.priority >= 120 && (
                  <span className="px-2 py-0.5 bg-red-900/50 rounded text-[10px] text-red-400 font-bold">ADMIN</span>
                )}
              </motion.div>
            ))}
        </div>
      </div>

      {selectedRole && (
        <motion.div
          key={selectedRole.roleId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Shield size={20} className="text-purple-500" />
              Права для: <span className="text-purple-400">{selectedRole.roleName}</span>
              <span className="text-xs text-gray-500 font-mono">({selectedRole.roleId})</span>
              {isAdminRole && <span className="px-2 py-0.5 bg-red-900/50 rounded text-xs">ADMIN</span>}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
              >
                <RotateCcw size={14} />
                Сбросить
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm disabled:opacity-50 transition-colors"
              >
                {saving ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><RotateCcw size={14} /></motion.div> : <Save size={14} />}
                Сохранить
              </button>
            </div>
          </div>

          <div className="text-xs text-yellow-500/70 mb-4 flex items-center gap-2">
            <AlertTriangle size={12} />
            Приоритет: {selectedRole.priority}. Высшая роль = больше прав.
            {isAdminRole && ' Имеет доступ к админ-панели.'}
          </div>

          <div className="flex gap-2 mb-4 flex-wrap">
            {Object.entries(categories).map(([catId, cat]) => {
              const Icon = cat.icon;
              const count = AVAILABLE_PAGES.filter(p => p.category === catId).length;
              return (
                <button
                  key={catId}
                  onClick={() => setActiveTab(catId)}
                  className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${
                    activeTab === catId 
                      ? 'bg-purple-600/20 border border-purple-500/50 text-purple-400' 
                      : 'bg-gray-700/50 hover:bg-gray-700 text-gray-400'
                  }`}
                >
                  <Icon size={14} />
                  {cat.label}
                  <span className="text-xs opacity-60">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {AVAILABLE_PAGES.filter(p => p.category === activeTab).map(page => {
              const isAllowed = selectedRole.permissions[page.id] !== false;
              const isDisabled = page.category === 'admin' && (selectedRole.priority || 0) < 120;

              return (
                <motion.button
                  key={page.id}
                  whileHover={!isDisabled ? { scale: 1.05 } : {}}
                  whileTap={!isDisabled ? { scale: 0.95 } : {}}
                  onClick={() => !isDisabled && handleToggle(selectedRole.roleId, page.id)}
                  disabled={isDisabled}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                    isDisabled
                      ? 'bg-gray-900/50 opacity-40 cursor-not-allowed'
                      : isAllowed
                      ? 'bg-green-500/10 border border-green-500/30 hover:bg-green-500/20'
                      : 'bg-red-500/10 border border-red-500/30 hover:bg-red-500/20'
                  }`}
                >
                  <span className="text-xs">{page.name}</span>
                  {isDisabled ? (
                    <Lock size={14} className="text-gray-500" />
                  ) : isAllowed ? (
                    <Unlock size={14} className="text-green-400" />
                  ) : (
                    <Lock size={14} className="text-red-400" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default PermissionsTab;

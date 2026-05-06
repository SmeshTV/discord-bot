import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Gamepad2, Home, Trophy, ShoppingBag, LayoutDashboard,
  LogIn, LogOut, Shield, Menu, X,
  ChevronDown, Radio, Dice1, Ticket, AlertTriangle,
  HelpCircle, Users, Mail, Star, Calendar, ScrollText
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { loadRolePermissions } from '../lib/permissions';

interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
}

interface NavCategory {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

const Navbar = () => {
  const location = useLocation();
  const { user, permissions, signInWithDiscord, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [rolePermissions, setRolePermissions] = useState<{ [key: string]: { [key: string]: boolean } }>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setOpenDropdown(null);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user || !permissions?.roles?.length) return;
    const loadPerms = async () => {
      const perms: { [key: string]: { [key: string]: boolean } } = {};
      for (const roleId of permissions.roles) {
        perms[roleId] = await loadRolePermissions(roleId);
      }
      setRolePermissions(perms);
    };
    loadPerms();
  }, [user, permissions?.roles]);

  const pathToPageId: { [key: string]: string } = {
    '/': 'home',
    '/dashboard': 'dashboard',
    '/games': 'games',
    '/play': 'play',
    '/casino': 'casino',
    '/rps': 'rps',
    '/checkers': 'checkers',
    '/checkers-online': 'checkers_online',
    '/durak': 'durak',
    '/shop': 'shop',
    '/leaderboard': 'leaderboard',
    '/events': 'events',
    '/community': 'community',
    '/team': 'team',
    '/faq': 'faq',
    '/rules': 'rules',
    '/apply': 'apply',
    '/contact': 'contact',
    '/reviews': 'reviews',
    '/monitoring': 'monitoring',
    '/tickets': 'tickets',
    '/warnings': 'warnings',
    '/profile': 'profile',
    '/admin': 'admin',
  };

  const checkMenuAccess = (path: string): boolean => {
    const pageId = pathToPageId[path];
    if (!pageId) return true;
    if (!permissions?.roles?.length) return true;
    for (const roleId of permissions.roles) {
      const perms = rolePermissions[roleId];
      if (perms && pageId in perms) {
        return perms[pageId];
      }
    }
    return true;
  };

  const ROLE_MAIN_MOD = '1463271031501357067';
  const ROLE_WARNINGS_TICKETS = ['1463230825041756302', '1464965472704266414'];
  const ROLE_EVENT_MAKER = '1465825700031234172';
  
  const userRoles = permissions?.roles || [];
  const hasFullAdmin = userRoles.includes(ROLE_MAIN_MOD);
  const hasWarningsTickets = userRoles.some(r => ROLE_WARNINGS_TICKETS.includes(r));
  const hasEvents = userRoles.includes(ROLE_EVENT_MAKER);
  
  const showAdmin = hasFullAdmin || hasWarningsTickets || hasEvents;

  const mainItems: NavItem[] = [
    { path: '/', icon: Home, label: 'Главная' },
    { path: '/dashboard', icon: LayoutDashboard, label: 'Дашборд' },
  ];

  const categories: NavCategory[] = [
    {
      label: 'Игры',
      icon: Gamepad2,
      items: [
        { path: '/games', icon: Gamepad2, label: 'Все игры' },
        { path: '/play', icon: Gamepad2, label: 'Мини-игры' },
        { path: '/casino', icon: Dice1, label: 'Казино' },
      ],
    },
    {
      label: 'Сообщество',
      icon: Trophy,
      items: [
        { path: '/events', icon: Calendar, label: 'Мероприятия' },
        { path: '/leaderboard', icon: Trophy, label: 'Лидеры' },
        { path: '/community', icon: Users, label: 'Роли' },
        { path: '/shop', icon: ShoppingBag, label: 'Магазин' },
        { path: '/reviews', icon: Star, label: 'Отзывы' },
        { path: '/monitoring', icon: Radio, label: 'Мониторинг' },
      ],
    },
    {
      label: 'Информация',
      icon: HelpCircle,
      items: [
        { path: '/rules', icon: ScrollText, label: 'Правила' },
        { path: '/faq', icon: HelpCircle, label: 'FAQ' },
        { path: '/team', icon: Users, label: 'Команда' },
        { path: '/contact', icon: Mail, label: 'Контакты' },
      ],
    },
  ];

  const supportItems: NavItem[] = [
    { path: '/tickets', icon: Ticket, label: 'Тикеты' },
    { path: '/warnings', icon: AlertTriangle, label: 'Варны' },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isCategoryActive = (cat: NavCategory) => cat.items.some(item => isActive(item.path));

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-gray-700/50 safe-area-top">
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Логотип */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-mushroom-neon to-purple-500 flex items-center justify-center">
              <span className="text-xl">🍄</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-mushroom-neon to-purple-400 bg-clip-text text-transparent hidden sm:block">
              LOLA
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1" ref={dropdownRef}>
            {mainItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-sm font-medium ${
                    active
                      ? 'bg-mushroom-neon/20 text-mushroom-neon'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}

            {categories.map((cat) => {
              const Icon = cat.icon;
              const open = openDropdown === cat.label;
              const active = isCategoryActive(cat);

              return (
                <div key={cat.label} className="relative">
                  <button
                    onClick={() => setOpenDropdown(open ? null : cat.label)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-sm font-medium ${
                      active || open
                        ? 'bg-mushroom-neon/20 text-mushroom-neon'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon size={16} />
                    {cat.label}
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {open && (
                    <div className="absolute top-full left-0 mt-2 w-48 py-2 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50">
                      {cat.items.map((item) => {
                        const ItemIcon = item.icon;
                        const itemActive = isActive(item.path);
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                              itemActive
                                ? 'bg-mushroom-neon/10 text-mushroom-neon'
                                : 'text-gray-300 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <ItemIcon size={16} />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="w-px h-6 bg-white/10 mx-2" />

            {supportItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-sm font-medium ${
                    active
                      ? 'bg-mushroom-neon/20 text-mushroom-neon'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Правая часть */}
          <div className="flex items-center gap-2">
            {showAdmin && (
              <Link
                to="/admin"
                className={`p-2 rounded-xl transition-all hidden sm:flex items-center gap-1 ${
                  isActive('/admin')
                    ? 'bg-mushroom-neon/20 text-mushroom-neon border border-mushroom-neon/30'
                    : 'text-gray-300 hover:text-mushroom-neon hover:bg-white/5'
                }`}
                title="Админ-панель"
              >
                <Shield size={16} />
              </Link>
            )}

            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-mushroom-neon to-mushroom-purple flex items-center justify-center text-xs font-bold text-black">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={signOut}
                  className="text-sm text-gray-300 hover:text-white hover:bg-white/5 px-3 py-2 rounded-xl transition-all flex items-center gap-1.5"
                  title="Выйти"
                >
                  <LogOut size={14} />
                  <span className="hidden lg:inline">Выйти</span>
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithDiscord}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-discord hover:bg-discord-dark text-white text-sm font-medium rounded-xl transition-all"
              >
                <LogIn size={14} />
                <span className="hidden lg:inline">Войти</span>
              </button>
            )}

            {/* Мобильное меню кнопка */}
            <button
              onClick={() => setMobileOpen(prev => !prev)}
              className="lg:hidden p-2.5 rounded-xl text-gray-300 hover:text-mushroom-neon hover:bg-white/5 min-h-[48px] min-w-[48px] flex items-center justify-center"
              aria-label="Меню"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden pb-4 space-y-1 overflow-y-auto max-h-[80vh] border-t border-white/10 mt-2 pt-3">
            {mainItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all font-medium min-h-[48px] ${
                    active
                      ? 'bg-mushroom-neon/20 text-mushroom-neon'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <Icon size={22} />
                  {item.label}
                </Link>
              );
            })}

            {categories.map((cat) => {
              const Icon = cat.icon;
              const open = openDropdown === cat.label;
              const active = isCategoryActive(cat);

              return (
                <div key={cat.label}>
                  <button
                    onClick={() => setOpenDropdown(open ? null : cat.label)}
                    className={`w-full flex items-center justify-between px-4 py-4 rounded-xl transition-all font-medium min-h-[48px] ${
                      active || open
                        ? 'bg-mushroom-neon/20 text-mushroom-neon'
                        : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-4">
                      <Icon size={22} />
                      {cat.label}
                    </span>
                    <ChevronDown
                      size={18}
                      className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {open && (
                    <div className="ml-6 mt-1 space-y-1">
                      {cat.items.map((item) => {
                        const ItemIcon = item.icon;
                        const itemActive = isActive(item.path);
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-base min-h-[44px] ${
                              itemActive
                                ? 'text-mushroom-neon bg-mushroom-neon/10'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <ItemIcon size={18} />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="border-t border-white/10 my-2 mx-4" />
            {supportItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all font-medium min-h-[48px] ${
                    active
                      ? 'bg-mushroom-neon/20 text-mushroom-neon'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <Icon size={22} />
                  {item.label}
                </Link>
              );
            })}

            <div className="flex gap-3 pt-4 px-4 pb-2">
              {showAdmin && (
                <Link
                  to="/admin"
                  className="flex-1 btn-primary text-center text-base flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <Shield size={18} />
                  Админ
                </Link>
              )}
              {user ? (
                <button
                  onClick={() => { signOut(); setMobileOpen(false); }}
                  className="flex-1 btn-discord text-base flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <LogOut size={18} />
                  Выйти
                </button>
              ) : (
                <button
                  onClick={() => { signInWithDiscord(); setMobileOpen(false); }}
                  className="flex-1 btn-discord text-base flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <LogIn size={18} />
                  Войти
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
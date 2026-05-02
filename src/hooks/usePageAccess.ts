import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { loadRolePermissions, checkPageAccess, checkAdminAccess } from '../lib/permissions';
import { supabase } from '../lib/supabase';

const pathToPageId: Record<string, string> = {
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
  '/admin_overview': 'admin_overview',
  '/admin_events': 'admin_events',
  '/admin_users': 'admin_users',
  '/admin_warnings': 'admin_warnings',
  '/admin_tickets': 'admin_tickets',
  '/admin_shop': 'admin_shop',
  '/admin_media': 'admin_media',
  '/admin_chat': 'admin_chat',
  '/admin_roleapps': 'admin_roleapps',
  '/admin_settings': 'admin_settings',
};

export function usePageAccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, permissions } = useAuth();
  const [isAllowed, setIsAllowed] = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      setChecking(true);
      
      const pageId = pathToPageId[location.pathname];
      const isAdminPage = location.pathname.startsWith('/admin');

      // === АДМИН СТРАНИЦЫ ===
      if (isAdminPage) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          setIsAllowed(false);
          setChecking(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role_ids')
          .eq('id', session.user.id)
          .single();

        const userRoles = profile?.role_ids || [];
        
        // Используем новую функцию с учётом иерархии
        const { allowed } = checkAdminAccess(userRoles);
        
        setIsAllowed(allowed);
        setChecking(false);
        return;
      }

      // === ОБЫЧНЫЕ СТРАНИЦЫ ===
      
      // Не авторизован — доступ запрещён
      if (!user || !permissions?.roles?.length) {
        setIsAllowed(false);
        setChecking(false);
        return;
      }

      // Неизвестная страница — разрешаем
      if (!pageId) {
        setIsAllowed(true);
        setChecking(false);
        return;
      }

      // Загружаем права для ролей пользователя
      const rolePerms: Record<string, Record<string, boolean>> = {};
      for (const roleId of permissions.roles) {
        rolePerms[roleId] = await loadRolePermissions(roleId);
      }

      // Проверяем доступ с учётом высшей роли
      const allowed = checkPageAccess(rolePerms, permissions.roles, pageId);
      setIsAllowed(allowed);
      setChecking(false);
    };

    checkAccess();
  }, [location.pathname, user, permissions?.roles]);

  // Редирект если доступ запрещён
  useEffect(() => {
    if (!checking && !isAllowed && location.pathname !== '/') {
      navigate('/');
    }
  }, [checking, isAllowed, location.pathname, navigate]);

  return { isAllowed, checking };
}

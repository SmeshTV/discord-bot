import { supabase } from './supabase';
import { getCached, setCached } from './cache';
import { getRoleById, type ServerRole } from './roles';

// IDs админ-ролей (дублируем чтобы избежать циклической зависимости)
const ADMIN_ROLES_FULL_IDS = [
  '1463230825041756302',
  '1463271031501357067',
  '1464965472704266414',
  '1478351837835825235',
  '1466565907857014825',
  '1464964592575709309',
];

const ADMIN_ROLES_EVENT_IDS = [
  '1465825700031234172',
];

const ADMIN_ROLES_MOD_IDS = [
  '1466565907857014825',
  '1495546881953104014',
  '1464787504183115816',
];

// Экспорт для совместимости
export const ADMIN_ROLES = [...ADMIN_ROLES_FULL_IDS, ...ADMIN_ROLES_EVENT_IDS, ...ADMIN_ROLES_MOD_IDS];

export interface PagePermission {
  id: string;
  name: string;
  category: 'admin' | 'games' | 'profile' | 'other';
}

export const AVAILABLE_PAGES: PagePermission[] = [
  { id: 'admin', name: 'Админ-панель', category: 'admin' },
  { id: 'admin_overview', name: 'Обзор (Админ)', category: 'admin' },
  { id: 'admin_events', name: 'Мероприятия (Админ)', category: 'admin' },
  { id: 'admin_users', name: 'Игроки (Админ)', category: 'admin' },
  { id: 'admin_warnings', name: 'Варны (Админ)', category: 'admin' },
  { id: 'admin_tickets', name: 'Тикеты (Админ)', category: 'admin' },
  { id: 'admin_shop', name: 'Магазин (Админ)', category: 'admin' },
  { id: 'admin_media', name: 'Медиа (Админ)', category: 'admin' },
  { id: 'admin_chat', name: 'Чат (Админ)', category: 'admin' },
  { id: 'admin_roleapps', name: 'Заявки на роль (Админ)', category: 'admin' },
  { id: 'admin_settings', name: 'Настройки (Админ)', category: 'admin' },
  { id: 'play', name: 'Мини-игры', category: 'games' },
  { id: 'rps', name: 'Камень-ножницы-бумага', category: 'games' },
  { id: 'checkers', name: 'Шашки', category: 'games' },
  { id: 'checkers_online', name: 'Шашки онлайн', category: 'games' },
  { id: 'durak', name: 'Дурак', category: 'games' },
  { id: 'casino', name: 'Казино', category: 'games' },
  { id: 'shop', name: 'Магазин', category: 'other' },
  { id: 'leaderboard', name: 'Лидерборд', category: 'other' },
  { id: 'events', name: 'События', category: 'other' },
  { id: 'monitoring', name: 'Мониторинг', category: 'other' },
  { id: 'tickets', name: 'Тикеты', category: 'profile' },
  { id: 'warnings', name: 'Варны', category: 'profile' },
  { id: 'profile', name: 'Профиль', category: 'profile' },
  { id: 'community', name: 'Сообщество', category: 'other' },
  { id: 'team', name: 'Команда', category: 'other' },
  { id: 'faq', name: 'FAQ', category: 'other' },
  { id: 'rules', name: 'Правила', category: 'other' },
  { id: 'apply', name: 'Заявки на роль', category: 'other' },
  { id: 'contact', name: 'Контакты', category: 'other' },
];

// Роли с полным админ-доступом (по приоритету >= 120)
export function isRestrictedAdmin(roleId: string): boolean {
  return ADMIN_ROLES.includes(roleId);
}

// Загрузить права роли из БД
export async function loadRolePermissions(roleId: string): Promise<Record<string, boolean>> {
  const cacheKey = `role_perms_${roleId}`;
  const cached = getCached(cacheKey, 30 * 60 * 1000) as Record<string, boolean> | null; // 30 минут TTL
  if (cached) return cached;

  const { data } = await supabase
    .from('role_permissions')
    .select('page_id, allowed')
    .eq('role_id', roleId);

  const perms: Record<string, boolean> = {};
  if (data) {
    data.forEach((p) => {
      perms[p.page_id] = p.allowed;
    });
  }

  setCached(cacheKey, perms);
  return perms;
}

// Сохранить право роли
export async function saveRolePermission(
  roleId: string,
  pageId: string,
  allowed: boolean
): Promise<void> {
  await supabase
    .from('role_permissions')
    .upsert(
      { role_id: roleId, page_id: pageId, allowed, updated_at: new Date().toISOString() },
      { onConflict: 'role_id,page_id' }
    );

  const cacheKey = `role_perms_${roleId}`;
  localStorage.removeItem(cacheKey);
}

// Загрузить права для нескольких ролей
export async function getRolePermissions(roleIds: string[]): Promise<Record<string, Record<string, boolean>>> {
  const result: Record<string, Record<string, boolean>> = {};
  for (const roleId of roleIds) {
    result[roleId] = await loadRolePermissions(roleId);
  }
  return result;
}

// ===== ПРОВЕРКА ПРАВ С УЧЁТОМ ИЕРАРХИИ =====

// Проверить доступ к странице (использует высшую роль)
export function checkPageAccess(
  rolePermissions: Record<string, Record<string, boolean>>,
  userRoles: string[],
  pageId: string
): boolean {
  // Находим высшую роль по приоритету
  let highestRole: ServerRole | null = null;
  let maxPriority = -1;
  
  for (const roleId of userRoles) {
    const role = getRoleById(roleId);
    if (role && role.priority > maxPriority) {
      maxPriority = role.priority;
      highestRole = role;
    }
  }
  
  if (!highestRole) return false;

  // Получаем права для этой роли
  const perms = rolePermissions[highestRole.id];
  if (!perms) {
    // Если прав для роли нет в БД — проверяем дефолтные
    if (pageId.startsWith('admin_') || pageId === 'admin') {
      return false;
    }
    return true;
  }

  // Возвращаем результат проверки
  if (pageId in perms) {
    return perms[pageId];
  }

  // Если право не задано — дефолтное значение
  if (pageId.startsWith('admin_') || pageId === 'admin') {
    return false;
  }
  return true;
}

// Проверить доступ к админ-панели
export function checkAdminAccess(userRoles: string[]): { allowed: boolean; role: ServerRole | null; accessLevel: 'full' | 'events' | 'mod' | 'none' } {
  // Находим высшую админ-роль
  let highestAdminRole: ServerRole | null = null;
  let maxPriority = -1;
  
  for (const roleId of userRoles) {
    const role = getRoleById(roleId);
    if (role && role.category === 'admin' && role.priority > maxPriority) {
      maxPriority = role.priority;
      highestAdminRole = role;
    }
  }
  
  if (!highestAdminRole) {
    return { allowed: false, role: null, accessLevel: 'none' };
  }

  const roleId = highestAdminRole.id;
  const hasFullAccess = ADMIN_ROLES_FULL_IDS.includes(roleId);
  const hasEventAccess = ADMIN_ROLES_EVENT_IDS.includes(roleId);
  const hasModAccess = ADMIN_ROLES_MOD_IDS.includes(roleId);

  if (hasFullAccess) {
    return { allowed: true, role: highestAdminRole, accessLevel: 'full' };
  }
  if (hasEventAccess) {
    return { allowed: true, role: highestAdminRole, accessLevel: 'events' };
  }
  if (hasModAccess) {
    return { allowed: true, role: highestAdminRole, accessLevel: 'mod' };
  }
  
  return { allowed: false, role: highestAdminRole, accessLevel: 'none' };
}

// Какие вкладки доступны для какого уровня
export function getAllowedAdminTabs(accessLevel: 'full' | 'events' | 'mod' | 'none'): string[] {
  switch (accessLevel) {
    case 'full':
      return ['admin', 'admin_overview', 'admin_events', 'admin_users', 'admin_warnings', 'admin_tickets', 'admin_shop', 'admin_media', 'admin_chat', 'admin_roleapps', 'admin_settings'];
    case 'events':
      return ['admin_events'];
    case 'mod':
      return ['admin_warnings', 'admin_tickets'];
    default:
      return [];
  }
}

// Проверить доступ к Event Maker функциям
export function checkEventMakerAccess(userRoles: string[]): boolean {
  const eventMakerRoles = ['1465825700031234172', '1469686860627447931', '1478094359332126812', '1475558835035963602', '1485703963280937181'];
  return userRoles.some(rid => eventMakerRoles.includes(rid));
}
// Карта ролей сервера LOLA
export interface ServerRole {
  id: string;
  name: string;
  aliases?: string[];
  color: string;
  category: 'admin' | 'rank' | 'special' | 'game' | 'tag' | 'other';
  priority: number;
}

// Priority: чем больше число, тем выше приоритет (виднее в списке = больше прав)
export const SERVER_ROLES: ServerRole[] = [
  // ===== Администрация (приоритет 100-190) =====
  { id: '1463230825041756302', name: '𝓛𝓸𝓵𝓪', aliases: ['Lola', '@𝓛𝓸𝓵𝓪'], color: 'from-red-500 to-pink-500', category: 'admin', priority: 190 },
  { id: '1463271031501357067', name: 'ℳ𝒶𝒾𝓃 ℳ𝑜𝒹𝑒𝓇𝒶𝓉𝑜𝓇', aliases: ['Main Moderator', '@ℳ𝒶𝒾𝓃 ℳ𝑜𝒹𝑒𝓇𝒶𝓉𝑜𝓇'], color: 'from-purple-500 to-indigo-500', category: 'admin', priority: 180 },
  { id: '1464965472704266414', name: '𝓖𝓻𝓪𝓷𝓭 𝓜𝓸𝓭', aliases: ['Grand Mod', '@𝓖𝓻𝓪𝓷𝓭 𝓜𝓸𝓭'], color: 'from-purple-500 to-pink-500', category: 'admin', priority: 170 },
  { id: '1478351837835825235', name: '𝓐𝓭𝓶𝓲𝓷', aliases: ['Admin', '@𝓐𝓭𝓶𝓲𝓷'], color: 'from-red-500 to-orange-500', category: 'admin', priority: 160 },
  { id: '1466565907857014825', name: '𝒯𝑒𝒸𝒽 𝓗𝓮𝓵𝓹𝓮𝓻', aliases: ['Tech Helper', '@𝒯𝑒𝒸𝒽 𝓗𝓮𝓵𝓹𝓮𝓻'], color: 'from-cyan-500 to-blue-500', category: 'admin', priority: 150 },
  { id: '1495546881953104014', name: '𝓣𝓮𝓬𝓱 𝓗𝓮𝓵𝓹𝓮𝓻', aliases: ['Tech Help'], color: 'from-cyan-500 to-blue-500', category: 'admin', priority: 145 },
  { id: '1469686860627447931', name: '𝓖𝓪𝓶𝓮 𝓐𝓻𝓬𝓱𝓲𝓽𝓮𝓬𝓽', aliases: ['Game Architect', '@𝓖𝓪𝓶𝓮 𝓐𝓻𝓬𝓱𝓲𝓽𝓮𝓬𝓽'], color: 'from-amber-500 to-orange-500', category: 'admin', priority: 140 },
  { id: '1465825700031234172', name: '𝓔𝓿𝓮𝓷𝓽 𝓜𝓪𝓴𝓮𝓻', aliases: ['Event Maker', '@𝓔𝓿𝓮𝓷𝓽 𝓜𝓪𝓴𝓮𝓻'], color: 'from-violet-500 to-purple-500', category: 'admin', priority: 130 },
  { id: '1464787504183115816', name: '𝓗𝓮𝓵𝓹𝓮𝓻', aliases: ['Helper', '@𝓗𝓮𝓵𝓹𝓮𝓻'], color: 'from-green-500 to-emerald-500', category: 'admin', priority: 120 },

  // ===== Ранговая система (приоритет 10-60) =====
  { id: '1464878082996568337', name: 'Pawn', color: 'from-gray-500 to-gray-600', category: 'rank', priority: 60 },
  { id: '1464878249564962827', name: 'Knight', color: 'from-gray-400 to-gray-500', category: 'rank', priority: 55 },
  { id: '1464881720418631834', name: 'Bishop', color: 'from-slate-500 to-slate-600', category: 'rank', priority: 50 },
  { id: '1464878407207751793', name: 'Rook', color: 'from-zinc-500 to-zinc-600', category: 'rank', priority: 45 },
  { id: '1464878493346041917', name: 'Queen', color: 'from-neutral-400 to-neutral-500', category: 'rank', priority: 40 },
  { id: '1464878560711020781', name: 'King', color: 'from-stone-400 to-stone-500', category: 'rank', priority: 35 },

  // ===== Особые роли (приоритет 20-30) =====
  { id: '1464915038564515993', name: '𝕲𝖗𝖆𝖓𝖉𝖒𝖆𝖘𝖙𝖊𝖗', aliases: ['Grandmaster'], color: 'from-yellow-500 to-amber-500', category: 'special', priority: 30 },
  { id: '1464898072000598058', name: '𝕸𝖊𝖉𝖎𝖆', aliases: ['Media'], color: 'from-pink-500 to-rose-500', category: 'special', priority: 25 },
  { id: '1465258626552', name: '𝕾𝖕𝖊𝖈𝖎𝖆𝖑 𝖌𝖚𝖊𝖘𝖙', aliases: ['Special Guest', 'Special guest'], color: 'from-fuchsia-500 to-purple-500', category: 'special', priority: 20 },
  { id: '1465744785267753082', name: 'Server Booster', color: 'from-pink-500 to-purple-500', category: 'special', priority: 15 },

  // ===== Игровые роли (приоритет 5-15) =====
  { id: '1478094359332126812', name: 'Minecraft', color: 'from-green-600 to-lime-500', category: 'game', priority: 15 },
  { id: '1475558835035963602', name: 'Clash Royale', color: 'from-yellow-500 to-orange-500', category: 'game', priority: 10 },
  { id: '1485703963280937181', name: 'Brawl Stars', color: 'from-red-500 to-yellow-500', category: 'game', priority: 5 },

  // ===== Уведомления (приоритет 1) =====
  { id: '1467974295639556219', name: 'server news', color: 'from-slate-500 to-slate-600', category: 'tag', priority: 1 },
  { id: '1467974381085921462', name: 'media news', color: 'from-pink-500 to-rose-500', category: 'tag', priority: 1 },
  { id: '1467974588183871541', name: 'game news', color: 'from-green-500 to-emerald-500', category: 'tag', priority: 1 },
  { id: '1467975816297054512', name: 'event news', color: 'from-violet-500 to-purple-500', category: 'tag', priority: 1 },
];

// Роли на которые НЕЛЬЗЯ подавать заявки
export const FORBIDDEN_ROLE_IDS = [
  '1463230825041756302', '1463271031501357067', '1464965472704266414',
  '1478351837835825235', '1466565907857014825', '1495546881953104014',
  '1464878082996568337', '1464878249564962827', '1464881720418631834',
  '1464878407207751793', '1464878493346041917', '1464878560711020781',
  '1464915038564515993', '1465258626552', '1465744785267753082',
  '1467974295639556219', '1467974381085921462', '1467974588183871541',
  '1467975816297054512',
];

export const APPLICABLE_ROLES = SERVER_ROLES.filter(r => !FORBIDDEN_ROLE_IDS.includes(r.id));

export const ROLE_CATEGORIES: { key: ServerRole['category']; label: string; emoji: string }[] = [
  { key: 'admin', label: 'Администрация', emoji: '🛡️' },
  { key: 'rank', label: 'Ранговая система', emoji: '⚔️' },
  { key: 'special', label: 'Особые роли', emoji: '⭐' },
  { key: 'game', label: 'Игровые роли', emoji: '🎮' },
  { key: 'tag', label: 'Уведомления', emoji: '🔔' },
  { key: 'other', label: 'Другие', emoji: '📌' },
];

// ===== ФУНКЦИИ ДЛЯ РАБОТЫ С ПРИОРИТЕТАМИ =====

// Получить роль по ID
export function getRoleById(roleId: string): ServerRole | null {
  return SERVER_ROLES.find(r => r.id === roleId) || null;
}

// Получить приоритет роли
export function getRolePriority(roleId: string): number {
  const role = getRoleById(roleId);
  return role?.priority ?? 0;
}

// Получить высшую роль из списка
export function getHighestRole(roleIds: string[]): ServerRole | null {
  if (!roleIds || roleIds.length === 0) return null;
  
  let highest: ServerRole | null = null;
  let maxPriority = -1;

  for (const roleId of roleIds) {
    const role = getRoleById(roleId);
    if (role && role.priority > maxPriority) {
      maxPriority = role.priority;
      highest = role;
    }
  }

  return highest;
}

// Получить роль с макс. приоритетом из конкретной категории
export function getHighestRoleInCategory(roleIds: string[], category: ServerRole['category']): ServerRole | null {
  if (!roleIds || roleIds.length === 0) return null;

  let highest: ServerRole | null = null;
  let maxPriority = -1;

  for (const roleId of roleIds) {
    const role = getRoleById(roleId);
    if (role && role.category === category && role.priority > maxPriority) {
      maxPriority = role.priority;
      highest = role;
    }
  }

  return highest;
}

// Получить название роли по ID
export function getRoleName(roleId: string, fallbackNames?: Record<string, string>): string {
  const role = getRoleById(roleId);
  if (role) return role.name;
  if (fallbackNames && fallbackNames[roleId]) return fallbackNames[roleId];
  return roleId;
}

// Получить CSS класс цвета роли
export function getRoleColor(roleId: string): string {
  const role = getRoleById(roleId);
  return role?.color ?? 'from-gray-500 to-gray-600';
}

// Получить категорию роли
export function getRoleCategory(roleId: string): ServerRole['category'] {
  const role = getRoleById(roleId);
  return role?.category ?? 'other';
}

// Получить индекс категории
export function getCategoryIndex(category: ServerRole['category']): number {
  const idx = ROLE_CATEGORIES.findIndex(c => c.key === category);
  return idx === -1 ? ROLE_CATEGORIES.length : idx;
}

// Сортировка ролей по приоритету (по убыванию)
export function sortRolesByPriority(roleIdsOrNames: string[]): string[] {
  return [...roleIdsOrNames].sort((a, b) => {
    const roleA = getRoleById(a);
    const roleB = getRoleById(b);
    const priorityA = roleA?.priority ?? 0;
    const priorityB = roleB?.priority ?? 0;
    return priorityB - priorityA; // По убыванию приоритета
  });
}

// Роли с админ-доступом (для проверки админ-панели)
// ПОЛНЫЙ ДОСТУП - видят админ-панель и все вкладки
export const ADMIN_ROLES_FULL = [
  '1463230825041756302', // @𝓛𝓸𝓵𝓪
  '1463271031501357067', // @𝓜𝓪𝓲𝓷 𝓜𝓸𝓭𝓮𝓻𝓪𝓽𝓸𝓻
  '1464965472704266414', // @𝓖𝓻𝓪𝓷𝓭 𝓜𝓸𝓭
  '1478351837835825235', // @𝓐𝓭𝓶𝓲𝓷
  '1466565907857014825', // @𝓣𝓮𝓬𝓱 𝓐𝓭𝓶𝓲𝓷
  '1464964592575709309', // @𝓜𝓸𝓭
];

// Event Maker - доступ только к admin_events
export const ADMIN_ROLES_EVENT = [
  '1465825700031234172', // @𝓔𝓿𝓮𝓷𝓽 𝓜𝓪𝓴𝓮𝓻
];

// Tech Helper - доступ к варнам и тикетам
export const ADMIN_ROLES_MOD = [
  '1466565907857014825', // @𝓣𝓮𝓬𝓱 𝓗𝓮𝓵𝓹𝓮𝓻
  '1495546881953104014', // @𝓣𝓮𝓬𝓱 𝓗𝓮𝓵𝓹𝓮𝓻 (дубль 2)
  '1464787504183115816', // @𝓗𝓮𝓵𝓹𝓮𝓻
];

// Для совместимости - все кто видят админ-панель
export const ADMIN_ROLES = [
  ...ADMIN_ROLES_FULL,
  ...ADMIN_ROLES_EVENT,
  ...ADMIN_ROLES_MOD,
];

// Роли с Event Maker доступом
export const EVENT_MAKER_ROLES = ['1465825700031234172', '1469686860627447931', '1478094359332126812', '1475558835035963602', '1485703963280937181'];

// Алиас для совместимости (function declaration для hoisting)
export function sortRolesByHierarchy(roleIdsOrNames: string[]): string[] {
  return sortRolesByPriority(roleIdsOrNames);
}

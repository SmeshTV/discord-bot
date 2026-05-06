/**
 * Умная система казино LOLA
 * 
 * Принципы:
 * 1. House Edge — казино всегда в плюсе на длинной дистанции
 * 2. Streak Protection — после серии побед шанс падает, после поражений растёт
 * 3. Daily Loss Cap — лимит потерь за день
 * 4. Fair Illusion — игрок НЕ чувствует что его "обманывают"
 */

// ===== Конфигурация =====
const CASINO_CONFIG = {
  // Базовый шанс победы (ниже 50% = преимущество казино)
  baseWinChance: {
    coinflip: 0.47,   // 47% (выглядит как 50/50)
    dice: 0.45,       // 45% (выглядит как "4,5,6 из 6")
    roulette: 0.46,   // 46% (выглядит как красное/чёрное)
    rouletteGreen: 0.02, // 2% на зелёное (x3 множитель)
  },

  // Streak Protection — корректировка после серий
  streakPenaltyPerWin: -0.06,   // -6% за каждую победу подряд
  streakBonusPerLoss: +0.05,    // +5% за каждое поражение подряд
  maxStreakPenalty: -0.25,      // Макс. штраф: -25% (шанс не ниже 20%)
  maxStreakBonus: +0.15,        // Макс. бонус: +15% (шанс не выше 62%)
  
  // Green multiplier for roulette
  greenMultiplier: 3,        // x3 за зелёное

  // Daily Loss Cap
  dailyLossCapPercent: 0.50,    // Макс. потеря = 50% баланса

  // "Почти выиграл" — для ощущения близости к победе
  nearMissChance: 0.25,         // 25% проигрышей будут "почти выиграл"
};

// ===== Хранилище статистики =====
interface PlayerCasinoStats {
  streak: number;       // Положительный = победы, отрицательный = поражения
  todayLoss: number;    // Потеряно грибов сегодня
  todayDate: string;    // Дата для сброса
  totalGames: number;
  totalWins: number;
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10); // "2025-04-09"
}

function loadStats(): PlayerCasinoStats {
  try {
    const raw = localStorage.getItem('lola_casino_stats');
    if (raw) {
      const stats = JSON.parse(raw);
      // Сброс каждый день
      if (stats.todayDate !== getTodayKey()) {
        return { streak: 0, todayLoss: 0, todayDate: getTodayKey(), totalGames: stats.totalGames || 0, totalWins: stats.totalWins || 0 };
      }
      return stats;
    }
  } catch {}
  return { streak: 0, todayLoss: 0, todayDate: getTodayKey(), totalGames: 0, totalWins: 0 };
}

function saveStats(stats: PlayerCasinoStats): void {
  localStorage.setItem('lola_casino_stats', JSON.stringify(stats));
}

// ===== Ядро: определение победы =====
export interface CasinoResult {
  win: boolean;
  nearMiss: boolean;
  detail: string;
  mushroomsChange: number;
  insuranceRefund: number; // сколько возвращено страховкой
}

export function playCasinoGame(
  gameType: 'coinflip' | 'dice' | 'roulette',
  bet: number,
  currentMushrooms: number,
  playerChoice?: string,
  hasInsurance: boolean = false,
  hasLuckyHour: boolean = false,
): CasinoResult {
  const stats = loadStats();
  const config = CASINO_CONFIG;

  // Lucky Hour: +30% к шансу победы
  const luckyBonus = hasLuckyHour ? 0.30 : 0;

  // 1. Проверка Daily Loss Cap
  if (stats.todayLoss >= currentMushrooms * config.dailyLossCapPercent) {
    return { win: false, nearMiss: false, detail: 'Удача не на твоей стороне сегодня. Возвращайся завтра! 🌙', mushroomsChange: 0, insuranceRefund: 0 };
  }

  // 2. Расчёт текущего шанса
  const baseChance = config.baseWinChance[gameType] || 0.47;
  let adjustedChance = baseChance + luckyBonus;

  if (stats.streak > 0) {
    adjustedChance += Math.max(stats.streak * config.streakPenaltyPerWin, config.maxStreakPenalty);
  } else if (stats.streak < 0) {
    adjustedChance += Math.min(Math.abs(stats.streak) * config.streakBonusPerLoss, config.maxStreakBonus);
  }

  // Ограничиваем 0-1
  adjustedChance = Math.max(0.1, Math.min(0.95, adjustedChance));

  // 3. Определяем победу
  const roll = Math.random();
  let win = roll < adjustedChance;
  
  // Green multiplier for roulette (x3)
  let greenMultiplier = 1;
  if (gameType === 'roulette' && playerChoice === 'green' && Math.random() < config.baseWinChance.rouletteGreen) {
    win = true;
    greenMultiplier = config.greenMultiplier;
  }

  // 4. Near Miss
  let nearMiss = false;
  if (!win && Math.random() < config.nearMissChance) {
    nearMiss = true;
  }

  // 5. Обновляем статистику
  stats.totalGames += 1;

  if (win) {
    stats.streak = stats.streak > 0 ? stats.streak + 1 : 1;
    stats.totalWins += 1;
  } else {
    stats.streak = stats.streak < 0 ? stats.streak - 1 : -1;
    stats.todayLoss += bet;
  }
  saveStats(stats);

  // 6. Расчёт грибов + страховка
  let mushroomsChange = win ? bet * greenMultiplier : -bet;
  let insuranceRefund = 0;

  // Страховка: возврат 30% при проигрыше
  if (!win && hasInsurance) {
    insuranceRefund = Math.floor(bet * 0.30);
    mushroomsChange = -bet + insuranceRefund; // -70% вместо -100%
  }

  // 7. Детали
  let detail = '';
  if (hasLuckyHour && win) detail += '🍀 Удачный час помог! ';

  switch (gameType) {
    case 'coinflip':
      if (win) detail += (playerChoice === 'heads' ? 'Орёл! 🪙' : 'Решка! 🪙');
      else if (nearMiss) detail += 'Монетка встала на ребро... Почти! 😮';
      else detail += (playerChoice === 'heads' ? 'Выпала решка' : 'Выпал орёл');
      break;
    case 'dice':
      if (win) detail += `Выпало ${4 + Math.floor(Math.random() * 3)}! 🎲`;
      else if (nearMiss) detail += 'Выпало 3... Одно очко до победы! 😮';
      else detail += `Выпало ${1 + Math.floor(Math.random() * 3)}`;
      break;
    case 'roulette':
      if (win) {
        if (playerChoice === 'green') {
          detail += `🟢 Зелёное! x${greenMultiplier} множитель!`;
        } else {
          detail += (playerChoice === 'red' ? '🔴 Красное!' : '⚫ Чёрное!');
        }
      } else if (nearMiss) detail += 'Шарик на зелёном... 0! 😱';
      else detail += (playerChoice === 'red' ? 'Выпало чёрное' : 'Выпало красное');
      break;
  }

  if (insuranceRefund > 0) {
    detail += ` (🛡️ +${insuranceRefund} страховка)`;
  }

  return { win, nearMiss, detail, mushroomsChange, insuranceRefund };
}

// ===== Утилиты для UI =====
export function getCasinoStats(): PlayerCasinoStats {
  return loadStats();
}

export function resetCasinoStats(): void {
  localStorage.removeItem('lola_casino_stats');
}

// Форматирование для отображения
export function formatStreak(streak: number): string {
  if (streak === 0) return '';
  if (streak > 0) return `🔥 ${streak} побед подряд`;
  return `😤 ${Math.abs(streak)} поражений подряд`;
}

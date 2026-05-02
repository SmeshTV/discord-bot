type NotificationType = 'levelUp' | 'bigWin' | 'bigLoss' | 'achievement' | 'welcome';

interface NotificationData {
  type: NotificationType;
  title: string;
  message: string;
  icon: string;
  duration: number;
}

const NOTIFICATION_TEMPLATES: Record<NotificationType, Omit<NotificationData, 'duration'>> = {
  levelUp: {
    type: 'levelUp',
    title: '🎉 Новый уровень!',
    message: 'Ты достиг уровня {level}!',
    icon: '🏆',
  },
  bigWin: {
    type: 'bigWin',
    title: '🍀 Крупный выигрыш!',
    message: 'Ты выиграл {amount} грибов!',
    icon: '💰',
  },
  bigLoss: {
    type: 'bigLoss',
    title: '💀 Не повезло...',
    message: 'Ты потерял {amount} грибов',
    icon: '😢',
  },
  achievement: {
    type: 'achievement',
    title: '🏅 Достижение разблокировано!',
    message: '{name}',
    icon: '⭐',
  },
  welcome: {
    type: 'welcome',
    title: '🍄 Добро пожаловать в LOLA!',
    message: 'Начни с голосового канала Discord для получения XP',
    icon: '🎮',
  },
};

// Храним последние уведомления, чтобы не спамить
const lastShown: Record<string, number> = {};
const MIN_INTERVAL = 60000; // 1 минута между одинаковыми

export function showNotification(data: NotificationData): void {
  const key = `${data.type}-${data.message}`;
  const lastTime = lastShown[key] || 0;

  if (Date.now() - lastTime < MIN_INTERVAL) return; // Не показываем слишком часто
  lastShown[key] = Date.now();

  // Проверяем поддержку браузерных уведомлений
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(data.title, {
      body: data.message,
      icon: '/vite.svg',
    });
  }
}

export function createNotification(type: NotificationType, params: Record<string, string | number> = {}): void {
  const template = NOTIFICATION_TEMPLATES[type];
  if (!template) return;

  let message = template.message;
  for (const [key, value] of Object.entries(params)) {
    message = message.replace(`{${key}}`, String(value));
  }

  showNotification({
    ...template,
    message,
    duration: type === 'bigWin' || type === 'levelUp' ? 8000 : 4000,
  });
}

// Запрос разрешения на браузерные уведомления
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

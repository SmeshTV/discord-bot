/**
 * Утилита для безопасного логирования.
 * В продакшене (NODE_ENV === 'production') логи не выводятся в консоль,
 * чтобы не раскрывать внутреннюю структуру приложения.
 */

const isDev = import.meta.env.DEV;

export const logger = {
  info: (message: string, ...data: unknown[]) => {
    if (isDev) console.info(`[LOLA] ${message}`, ...data);
  },

  warn: (message: string, ...data: unknown[]) => {
    if (isDev) console.warn(`[LOLA] ${message}`, ...data);
  },

  error: (message: string, ...data: unknown[]) => {
    if (isDev) console.error(`[LOLA] ${message}`, ...data);
    // В продакшене можно отправить в Sentry/мониторинг
  },

  debug: (message: string, ...data: unknown[]) => {
    if (isDev) console.debug(`[LOLA] ${message}`, ...data);
  },
};

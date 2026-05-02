import { useEffect } from 'react';

/**
 * Мягкая защита от копирования контента.
 * Используем CSS (pointer-events, user-select) вместо агрессивных JS-перехватов,
 * которые ломают доступность и UX.
 */
export function useProtection() {
  useEffect(() => {
    // Добавляем CSS-правило для защиты от выделения
    const style = document.createElement('style');
    style.textContent = `
      body {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
      }
      input, textarea, [contenteditable] {
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        user-select: text;
      }
    `;
    document.head.appendChild(style);

    // Мягкая блокировка контекстного меню (только на изображениях)
    const blockImageContextMenu = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', blockImageContextMenu);

    // Блокировка перетаскивания изображений
    const blockImageDrag = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        e.preventDefault();
      }
    };
    document.addEventListener('dragstart', blockImageDrag);

    return () => {
      document.head.removeChild(style);
      document.removeEventListener('contextmenu', blockImageContextMenu);
      document.removeEventListener('dragstart', blockImageDrag);
    };
  }, []);
}

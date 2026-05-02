import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface Toast {
  id: number;
  title: string;
  message: string;
  icon: string;
  duration: number;
}

const toasts: Toast[] = [];
let listeners: (() => void)[] = [];

export function addToast(toast: Omit<Toast, 'id'>): void {
  toasts.unshift({ ...toast, id: Date.now() });
  listeners.forEach(fn => fn());
  setTimeout(() => {
    toasts.pop();
    listeners.forEach(fn => fn());
  }, toast.duration);
}

export function removeToast(id: number): void {
  const idx = toasts.findIndex(t => t.id === id);
  if (idx >= 0) {
    toasts.splice(idx, 1);
    listeners.forEach(fn => fn());
  }
}

export function useToasts() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const update = () => setItems([...toasts]);
    listeners.push(update);
    update();
    return () => { listeners = listeners.filter(l => l !== update); };
  }, []);
  return items;
}

export default function NotificationToastContainer() {
  const toastsList = useToasts();

  return (
    <div className="fixed top-20 right-4 z-[100] space-y-2 max-w-sm">
      <AnimatePresence>
        {toastsList.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            className="glass-card p-4 flex items-start gap-3 shadow-2xl border border-mushroom-neon/30"
          >
            <span className="text-2xl flex-shrink-0">{toast.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-mushroom-neon">{toast.title}</p>
              <p className="text-xs text-gray-400">{toast.message}</p>
            </div>
            <button onClick={() => removeToast(toast.id)} className="text-gray-500 hover:text-white flex-shrink-0">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, title, message }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const success = useCallback((message: string, title?: string) => showToast(message, 'success', title), [showToast]);
  const error = useCallback((message: string, title?: string) => showToast(message, 'error', title), [showToast]);
  const info = useCallback((message: string, title?: string) => showToast(message, 'info', title), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl p-3.5 backdrop-blur-md shadow-2xl border transition-all duration-300 animate-slide-in flex items-start gap-3 ${
              t.type === 'success'
                ? 'bg-surface/90 border-cyan/40 shadow-cyan/10 text-ink'
                : t.type === 'error'
                ? 'bg-surface/90 border-rose/40 shadow-rose/10 text-ink'
                : 'bg-surface/90 border-indigo/40 shadow-indigo/10 text-ink'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                t.type === 'success'
                  ? 'bg-cyan/15 text-cyan'
                  : t.type === 'error'
                  ? 'bg-rose/15 text-rose'
                  : 'bg-indigo/15 text-indigo'
              }`}
            >
              <i
                className={`bi ${
                  t.type === 'success'
                    ? 'bi-check-circle-fill'
                    : t.type === 'error'
                    ? 'bi-exclamation-triangle-fill'
                    : 'bi-info-circle-fill'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              {t.title && <div className="text-xs font-semibold uppercase tracking-wider mb-0.5">{t.title}</div>}
              <div className="text-sm leading-snug break-words">{t.message}</div>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-muted hover:text-ink shrink-0 p-1 -mr-1 -mt-1 rounded-md transition"
              aria-label="Đóng"
            >
              <i className="bi bi-x text-base" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

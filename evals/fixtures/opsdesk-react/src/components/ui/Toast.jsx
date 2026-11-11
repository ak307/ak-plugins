import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(() => {});

/** One toast at a time, announced politely, with optional undo. */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef();
  const show = useCallback((message, { undo, tone = "neutral" } = {}) => {
    clearTimeout(timer.current);
    setToast({ message, undo, tone, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), 5000);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="ui-toast-region" aria-live="polite">
        {toast && (
          <div key={toast.key} className={`ui-toast ui-toast--${toast.tone}`} role="status">
            <span>{toast.message}</span>
            {toast.undo && (
              <button type="button" className="ui-toast__undo" onClick={() => { toast.undo(); setToast(null); }}>Undo</button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

"use client";
import React from "react";

import useEscapeKey from "@/app/hooks/useEscapeKey";

export const ToastContext = React.createContext({});

/**
 *
 * @param root0
 * @param root0.children
 */
function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);

  const resetToasts = React.useCallback(() => setToasts([]), []);
  useEscapeKey(resetToasts);

  const createToast = React.useCallback((message, variant) => {
    const newToast = {
      message,
      variant,
      id: crypto.randomUUID(),
    };
    setToasts((ts) => [...ts, newToast]);
  }, []);

  const dismissToast = React.useCallback((id) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const value = React.useMemo(() => {
    return {
      toasts,
      createToast,
      dismissToast,
    };
  }, [toasts, createToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

export default ToastProvider;

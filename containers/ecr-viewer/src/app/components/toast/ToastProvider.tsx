"use client";
import React, { ReactNode, useCallback, useMemo, useState } from "react";

import useEscapeKey from "@/app/hooks/useEscapeKey";

export type ToastVariant = "success" | "warning" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}
interface ToastValue {
  toasts: Toast[];
  createToast: (message: string, variant: ToastVariant) => void;
  dismissToast: (id: string) => void;
}

export const ToastContext = React.createContext<ToastValue>({
  toasts: [],
  createToast: () => {},
  dismissToast: () => {},
});

/**
 * Toast provider for the application
 * @param props react props
 * @param props.children content
 * @returns toast provider with { toasts, createToast, dismissToast } in the context
 */
function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const resetToasts = useCallback(() => setToasts([]), []);
  useEscapeKey(resetToasts);

  const createToast = useCallback((message: string, variant: ToastVariant) => {
    const newToast = {
      message,
      variant,
      id: `${Math.random()}`,
    };
    setToasts((ts) => [...ts, newToast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => {
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

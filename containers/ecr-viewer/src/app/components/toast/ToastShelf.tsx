"use client";
import React from "react";

import Toast from "./Toast";
import { ToastContext } from "./ToastProvider";

/**
 * Display all the active toasts
 * @param props react props
 * @param props.timeout How long the toasts take to dismiss themselves. Default 5 seconds.
 * @returns shelf of toast
 */
function ToastShelf({ timeout = 5 }: { timeout?: number }) {
  const { toasts } = React.useContext(ToastContext);

  return (
    <ol className="toast-shelf">
      {toasts.map(({ id, variant, message }) => (
        <li key={id} className="toast-item">
          <Toast id={id} variant={variant} timeout={timeout}>
            {message}
          </Toast>
        </li>
      ))}
    </ol>
  );
}

export default ToastShelf;

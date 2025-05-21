"use client";
import React from "react";

import Toast from "./Toast";
import { ToastContext } from "./ToastProvider";

/**
 * Display all the active toasts
 * @returns shelf of toast
 */
function ToastShelf() {
  const { toasts } = React.useContext(ToastContext);

  return (
    <ol
      className="toast-shelf"
      role="region"
      aria-live="polite"
      aria-label="Notification"
    >
      {toasts.map(({ id, variant, message }) => (
        <li key={id} className="toast-item">
          <Toast id={id} variant={variant}>
            {message}
          </Toast>
        </li>
      ))}
    </ol>
  );
}

export default ToastShelf;

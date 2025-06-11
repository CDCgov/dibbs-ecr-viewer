"use client";
import React, { ReactNode, useContext, useEffect } from "react";

import { Alert } from "@trussworks/react-uswds";

import { ToastContext, ToastVariant } from "./ToastProvider";

/**
 *
 * @param props react props
 * @param props.id The toasts ID
 * @param props.variant The variant of toast (e.g. "success")
 * @param props.timeout The timeout of the toast in seconds.
 * @param props.children Toast content
 * @returns Toast component
 */
function Toast({
  id,
  variant,
  timeout,
  children,
}: {
  id: string;
  variant: ToastVariant;
  timeout: number;
  children: ReactNode;
}) {
  const { dismissToast } = useContext(ToastContext);

  useEffect(() => {
    const t = window.setTimeout(() => dismissToast(id), timeout * 1000);
    return () => window.clearTimeout(t);
  }, []);

  // Make sure the timeout is synced with the progress bar
  const style = { "--toast-timeout": `${timeout}s` } as React.CSSProperties;

  return (
    <Alert
      aria-live="polite"
      aria-label="Notification"
      className="toast"
      headingLevel="h4"
      type={variant}
      slim={true}
      style={style}
    >
      {children}
    </Alert>
  );
}

export default Toast;

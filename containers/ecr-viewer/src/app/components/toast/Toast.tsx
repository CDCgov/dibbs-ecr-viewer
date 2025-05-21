"use client";
import React, { ReactNode, useContext, useEffect } from "react";

import { Alert, Button } from "@trussworks/react-uswds";

import { HighlightOff } from "@/app/components/Icon";

import { ToastContext, ToastVariant } from "./ToastProvider";

/**
 *
 * @param props react props
 * @param props.id The toasts ID
 * @param props.variant The variant of toast (e.g. "success")
 * @param props.children Toast content
 * @returns Toast component
 */
function Toast({
  id,
  variant,
  children,
}: {
  id: string;
  variant: ToastVariant;
  children: ReactNode;
}) {
  const { dismissToast } = useContext(ToastContext);

  useEffect(() => {
    const timeout = window.setTimeout(() => dismissToast(id), 5000);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div>
      <Alert
        aria-live="polite"
        className="toast"
        headingLevel="h4"
        type={variant}
        slim={true}
        cta={
          <Button
            className="margin-x-2 text-base display-flex flex-align-center"
            type="button"
            unstyled={true}
            aria-label="Dismiss message"
            aria-live="off"
            onClick={() => dismissToast(id)}
          >
            <HighlightOff aria-hidden={true} className="square-3" />
          </Button>
        }
      >
        {children}
      </Alert>
      <div className="progress" />
    </div>
  );
}

export default Toast;

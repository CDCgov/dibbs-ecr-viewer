import React from "react";
// import {
//   AlertOctagon,
//   AlertTriangle,
//   CheckCircle,
//   Info,
//   X,
// } from "react-feather";

// import VisuallyHidden from "../VisuallyHidden";
import { Alert, Button } from "@trussworks/react-uswds";

import { ToastContext } from "./ToastProvider";

// const ICONS_BY_VARIANT = {
//   notice: Info,
//   warning: AlertTriangle,
//   success: CheckCircle,
//   error: AlertOctagon,
// };

/**
 *
 * @param root0
 * @param root0.id
 * @param root0.variant
 * @param root0.children
 */
function Toast({ id, variant, children }) {
  const { dismissToast } = React.useContext(ToastContext);

  return (
    <Alert
      aria-live="polite"
      className="toast"
      headingLevel="h4"
      type={variant}
      slim={true}
      cta={
        <Button
          className="action-text margin-x-2"
          type="button"
          unstyled={true}
          aria-label="Dismiss message"
          aria-live="off"
          onClick={() => dismissToast(id)}
        >
          X
        </Button>
      }
    >
      {children}
    </Alert>
  );
}

export default Toast;

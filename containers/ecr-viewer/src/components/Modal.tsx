import React, { LegacyRef } from "react";

import { ModalRef, Modal as UswdsModal } from "@trussworks/react-uswds";

import { ForceClient } from "@/app/view-data/components/ForceClient";

export type ModalProps = React.ComponentProps<typeof UswdsModal>;

/**
 * USWDS modal that renders only on the client side (implementation references document,
 * which is not available on the server)
 * @param props React Props
 * @param props.children Contents of the modal
 * @returns Client side modal component
 */
export const Modal = React.forwardRef(
  ({ children, ...modalProps }: ModalProps, ref: LegacyRef<ModalRef>) => {
    return (
      <ForceClient loading={null}>
        <UswdsModal {...modalProps} ref={ref}>
          {children}
        </UswdsModal>
      </ForceClient>
    );
  },
);

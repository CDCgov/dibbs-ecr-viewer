import { ReactNode, RefObject } from "react";

import {
  ModalRef,
  ModalFooter,
  ButtonGroup,
  ModalToggleButton,
} from "@trussworks/react-uswds";

/**
 * Footer for a modal that confirms an action
 * @param props react props
 * @param props.onConfirm Action to perform once modal exits via confirmation button
 * @param props.children Confirmation button content
 * @param props.modalRef ref to the confirmation modal
 * @returns Confirmation footer
 */
const ConfirmationFooter = ({
  onConfirm,
  children,
  modalRef,
}: {
  onConfirm: () => void;
  children: ReactNode;
  modalRef: RefObject<ModalRef | null>;
}) => {
  return (
    <ModalFooter>
      <p>Are you sure you want to continue?</p>
      <ButtonGroup className="flex-justify-end">
        <ModalToggleButton
          modalRef={modalRef}
          closer={true}
          outline={true}
          data-focus={true}
          className="padding-105"
        >
          Cancel
        </ModalToggleButton>
        <ModalToggleButton
          modalRef={modalRef}
          closer={true}
          onClick={() => {
            onConfirm();
          }}
        >
          {children}
        </ModalToggleButton>
      </ButtonGroup>
    </ModalFooter>
  );
};

export default ConfirmationFooter;

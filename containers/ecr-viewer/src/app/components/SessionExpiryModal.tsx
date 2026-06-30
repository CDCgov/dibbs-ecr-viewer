"use client";
import { RefObject } from "react";

import {
  ButtonGroup,
  ModalFooter,
  ModalHeading,
  ModalToggleButton,
} from "@trussworks/react-uswds";

import Modal, { ModalRef } from "./modal/Modal";

interface SessionExpiryModalProps {
  ref: RefObject<ModalRef | null>;
  id: string;
  timeToExpireSecs: number;
  onSignout: () => void;
}

/**
 * Modal warning the user their session is about to expire.
 * "Extend session" closes the modal and resets the session timer.
 * "Sign out" closes the modal and calls `onSignout`.
 */
export const SessionExpiryModal = ({
  ref,
  id,
  timeToExpireSecs,
  onSignout,
}: SessionExpiryModalProps) => (
  <Modal
    ref={ref}
    zIndex={999999}
    id={id}
    aria-labelledby={`${id}-heading`}
    aria-describedby={`${id}-description`}
  >
    <ModalHeading id={`${id}-heading`}>Session about to expire</ModalHeading>
    <p id={`${id}-description`}>
      Your session is about to expire due to inactivity.
    </p>
    <p>
      {Math.max(0, timeToExpireSecs)} seconds remaining until you are signed
      out.
    </p>
    <ModalFooter>
      <ButtonGroup className="flex-justify-end">
        {/* clicking closes the modal AND propagates a click event that the
            activity listener picks up, resetting the session timer */}
        <ModalToggleButton modalRef={ref} closer={true} data-focus={true}>
          Extend session
        </ModalToggleButton>
        <ModalToggleButton
          modalRef={ref}
          closer={true}
          outline={true}
          className="padding-105"
          onClick={onSignout}
        >
          Sign out
        </ModalToggleButton>
      </ButtonGroup>
    </ModalFooter>
  </Modal>
);

"use client";
import { useEffect, useRef, useState } from "react";

import {
  ButtonGroup,
  ModalFooter,
  ModalHeading,
  ModalToggleButton,
} from "@trussworks/react-uswds";
import { signOut, useSession } from "next-auth/react";

import Modal, { ModalRef } from "./modal/Modal";

const events = ["click", "scroll", "keypress"];

const WARNING_DURATION = 90;

/**
 * Root layout for the view-data page
 * @returns laid out content
 */
export const AutoSignout = () => {
  const { update, data, status } = useSession();
  const [isActive, setIsActive] = useState(false);
  const [timeToExpireSecs, setTimeToExpireSecs] = useState(99999999999);

  // update lastActive state
  useEffect(() => {
    if (isActive) return;

    const updateActive = () => {
      setIsActive(true);
    };

    events.forEach((e) => window.addEventListener(e, updateActive));
    return () =>
      events.forEach((e) => window.removeEventListener(e, updateActive));
  }, [isActive]);

  // refresh session if becomes active and then don't allow checking activity for 30 seconds
  useEffect(() => {
    if (isActive) {
      // delay session update to make sure original action (e.g. signout) happens first
      setTimeout(update, 1000);
      const t = setTimeout(() => {
        setIsActive(false);
      }, 30 * 1000);

      return () => clearTimeout(t);
    }
  }, [isActive]);

  // Session has expired
  useEffect(() => {
    if (data?.expires) {
      const expires = new Date(data?.expires);
      const ttExpire = Math.floor((expires.valueOf() - Date.now()) / 1000);
      setTimeToExpireSecs(ttExpire);

      // decrement time each second
      const i = setInterval(
        () => setTimeToExpireSecs((prior) => prior - 1),
        1000,
      );
      return () => {
        clearInterval(i);
      };
    }
  }, [data]);

  // Sign out
  useEffect(() => {
    if (timeToExpireSecs < 0) signOut({ callbackUrl: `/ecr-viewer` });
    if (modalRef.current?.modalIsOpen && timeToExpireSecs > WARNING_DURATION) {
      modalRef.current.toggleModal();
    }
  }, [timeToExpireSecs]);

  const modalRef = useRef<ModalRef>(null);

  console.log({ data, status });
  return (
    timeToExpireSecs < WARNING_DURATION && (
      <Modal
        isInitiallyOpen={true}
        ref={modalRef}
        id="session-expiring"
        aria-labelledby="session-expiring-heading"
        aria-describedby="session-expiring-description"
        onClose={() => setTimeout(update, 1000)}
      >
        <ModalHeading id="session-expiring-heading">
          Session about to expire
        </ModalHeading>
        <p id="session-expiring-description">
          Your session is about to expire due to inactivity.
        </p>
        <p>
          {Math.max(0, timeToExpireSecs)} seconds remaining until you are signed
          out.
        </p>
        <ModalFooter>
          <ButtonGroup className="flex-justify-end">
            <ModalToggleButton
              modalRef={modalRef}
              closer={true}
              data-focus={true}
            >
              Extend session
            </ModalToggleButton>
            <ModalToggleButton
              modalRef={modalRef}
              closer={true}
              outline={true}
              className="padding-105"
              onClick={() => signOut({ callbackUrl: `/ecr-viewer` })}
            >
              Sign out
            </ModalToggleButton>
          </ButtonGroup>
        </ModalFooter>
      </Modal>
    )
  );
};

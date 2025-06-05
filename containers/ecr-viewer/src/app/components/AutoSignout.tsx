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

// Events we consider "activity" to keep the session alive
const ACTIVE_EVENTS = ["click", "keydown", "scroll"];

// Seconds out from session expiration at which we'll warn the user
const WARNING_DURATION = 90;

const signOutGoHome = () => signOut({ callbackUrl: "/ecr-viewer" });
/**
 * Root layout for the view-data page
 * @returns laid out content
 */
export const AutoSignout = () => {
  const { update, data } = useSession();
  const [isActive, setIsActive] = useState(false);
  const [timeToExpireSecs, setTimeToExpireSecs] = useState(99999999999);
  const modalRef = useRef<ModalRef>(null);

  // flip isActive to true on an event that we mark as activity
  useEffect(() => {
    if (isActive) return;

    const updateActive = () => setIsActive(true);

    ACTIVE_EVENTS.forEach((e) => window.addEventListener(e, updateActive));
    return () =>
      ACTIVE_EVENTS.forEach((e) => window.removeEventListener(e, updateActive));
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

  // Keep track of seconds left until the session expires
  useEffect(() => {
    if (data?.expires) {
      const expires = new Date(data.expires);
      const ttExpire = Math.floor((expires.valueOf() - Date.now()) / 1000);
      setTimeToExpireSecs(ttExpire);

      // decrement time each second
      const i = setInterval(
        () => setTimeToExpireSecs((prior) => prior - 1),
        1000,
      );
      return () => clearInterval(i);
    }
  }, [data]);

  // Sign out and clear modal if needed
  useEffect(() => {
    if (timeToExpireSecs < 0) signOutGoHome();
    if (timeToExpireSecs <= WARNING_DURATION && !isActive)
      modalRef.current?.toggleModal(undefined, true);
    if (timeToExpireSecs > WARNING_DURATION && modalRef.current?.modalIsOpen) {
      modalRef.current.toggleModal(undefined, false);
    }
  }, [timeToExpireSecs]);

  return (
    <Modal
      ref={modalRef}
      zIndex={999999} // always on top, because this is rooted in the app, the position in markup is not semantic
      id="session-expiring"
      aria-labelledby="session-expiring-heading"
      aria-describedby="session-expiring-description"
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
          {/** clicking the button causes isActive to flip to true */}
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
            onClick={signOutGoHome}
          >
            Sign out
          </ModalToggleButton>
        </ButtonGroup>
      </ModalFooter>
    </Modal>
  );
};

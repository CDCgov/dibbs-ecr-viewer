"use client";
import { useEffect, useRef, useState } from "react";

import { signOut, useSession } from "next-auth/react";

import { SessionExpiryModal } from "./SessionExpiryModal";
import { useActivityReset } from "./useActivityReset";
import { ModalRef } from "./modal/Modal";

const WARNING_DURATION = 90;

export const signOutGoHome = () => signOut({ callbackUrl: "/ecr-viewer" });

export const AutoSignout = () => {
  const { update, data } = useSession();
  const [timeToExpireSecs, setTimeToExpireSecs] = useState(99999999999);
  const modalRef = useRef<ModalRef>(null);

  // On activity: refresh the server session (delayed so any in-flight signout completes first)
  const isActive = useActivityReset(() => {
    const t = setTimeout(update, 1000);
    return () => clearTimeout(t);
  });

  // Track seconds remaining from the server-authoritative session expiry
  useEffect(() => {
    if (data?.expires) {
      const expires = new Date(data.expires);
      const timeToExpire = Math.floor((expires.valueOf() - Date.now()) / 1000);
      setTimeToExpireSecs(timeToExpire);
      const signoutTimeout = setTimeout(signOutGoHome, timeToExpire * 1000);

      const countdownInterval = setInterval(
        () => setTimeToExpireSecs((prior) => prior - 1),
        1000,
      );
      return () => {
        clearTimeout(signoutTimeout);
        clearInterval(countdownInterval);
      };
    }
  }, [data]);

  useEffect(() => {
    if (timeToExpireSecs < 0) signOutGoHome();
    if (timeToExpireSecs <= WARNING_DURATION && !isActive)
      modalRef.current?.toggleModal(undefined, true);
    if (timeToExpireSecs > WARNING_DURATION && modalRef.current?.modalIsOpen)
      modalRef.current.toggleModal(undefined, false);
  }, [timeToExpireSecs, isActive]);

  return (
    <SessionExpiryModal
      ref={modalRef}
      id="session-expiring"
      timeToExpireSecs={timeToExpireSecs}
      onSignout={signOutGoHome}
    />
  );
};

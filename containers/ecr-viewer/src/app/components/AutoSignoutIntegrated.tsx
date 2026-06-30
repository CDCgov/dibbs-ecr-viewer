"use client";
import { useEffect, useRef, useState } from "react";

import { SessionExpiryModal } from "./SessionExpiryModal";
import { useActivityReset } from "./useActivityReset";

const WARNING_DURATION = 90;

const navigateTo = (path: string) => {
  window.location.href = path;
};

export const AutoSignoutIntegrated = ({
  sessionDurationSec,
  authErrorPath,
  _navigate = navigateTo,
}: {
  sessionDurationSec: number;
  authErrorPath: string;
  _navigate?: (path: string) => void;
}) => {
  const [timeToExpireSecs, setTimeToExpireSecs] = useState(sessionDurationSec);
  const modalRef = useRef(null);
  const deadlineRef = useRef(Date.now() + sessionDurationSec * 1000);

  // On activity: reset the client-side idle deadline
  const isActive = useActivityReset(() => {
    deadlineRef.current = Date.now() + sessionDurationSec * 1000;
    setTimeToExpireSecs(sessionDurationSec);
  });

  // Tick every second, reading deadlineRef directly so activity resets are reflected immediately
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.floor((deadlineRef.current - Date.now()) / 1000);
      setTimeToExpireSecs(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (timeToExpireSecs < 0) {
      _navigate(authErrorPath);
      return;
    }
    if (timeToExpireSecs <= WARNING_DURATION && !isActive)
      modalRef.current?.toggleModal(undefined, true);
    if (timeToExpireSecs > WARNING_DURATION && modalRef.current?.modalIsOpen)
      modalRef.current.toggleModal(undefined, false);
  }, [timeToExpireSecs, isActive, authErrorPath]);

  return (
    <SessionExpiryModal
      ref={modalRef}
      id="session-expiring-integrated"
      timeToExpireSecs={timeToExpireSecs}
      onSignout={() => _navigate(authErrorPath)}
    />
  );
};

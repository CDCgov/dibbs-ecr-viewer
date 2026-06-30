"use client";
import { useEffect, useRef, useState } from "react";

const ACTIVE_EVENTS = ["click", "keydown", "scroll"];

/**
 * Detects user activity and calls `onReset` once per activity burst.
 * After calling `onReset`, ignores further activity for 30 seconds.
 *
 * @param onReset - Called when the first activity event fires. May return a cleanup function.
 * @returns `isActive` — true during the 30-second cooldown window after activity.
 */
export const useActivityReset = (
  onReset: () => (() => void) | void,
): boolean => {
  const [isActive, setIsActive] = useState(false);
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;

  useEffect(() => {
    if (isActive) return;
    const markActive = () => setIsActive(true);
    ACTIVE_EVENTS.forEach((e) => window.addEventListener(e, markActive));
    return () => ACTIVE_EVENTS.forEach((e) => window.removeEventListener(e, markActive));
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    const cleanup = onResetRef.current();
    const t = setTimeout(() => setIsActive(false), 30 * 1000);
    return () => {
      cleanup?.();
      clearTimeout(t);
    };
  }, [isActive]);

  return isActive;
};

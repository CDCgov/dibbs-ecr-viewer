"use client";
import React from "react";

import { MotionConfig } from "motion/react";

/**
 * Ensure motion preferences are respected
 * @param props react props
 * @param props.children child components
 * @returns component to make sure reduced motion preferences are respected
 */
const RespectMotionPreferences = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
};

export default RespectMotionPreferences;

"use client";
import { SessionProvider } from "next-auth/react";

/**
 * Root layout for the view-data page
 * @param props react props
 * @param props.children content
 * @returns laid out content
 */
const AuthSessionProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider basePath={`${process.env.BASE_PATH}/api/auth`}>
      {children}
    </SessionProvider>
  );
};

export default AuthSessionProvider;

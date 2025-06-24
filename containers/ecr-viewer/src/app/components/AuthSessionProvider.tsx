"use client";
import { Session } from "next-auth";
import { SessionProvider, useSession } from "next-auth/react";

/**
 * Root layout for the view-data page
 * @param props react props
 * @param props.initSession server side session info
 * @param props.children content
 * @returns laid out content
 */
export const AuthSessionProvider = ({
  initSession,
  children,
}: {
  initSession?: Session | null;
  children: React.ReactNode;
}) => {
  return (
    <SessionProvider
      basePath={`${process.env.BASE_PATH}/api/auth`}
      session={initSession}
    >
      {children}
    </SessionProvider>
  );
};

/**
 * Hook to tell whether the user is logged in (vs anonymously able to see ecr page via NBS)
 * @returns whether the user is logged in
 */
export const useIsLoggedInUser = () => {
  const { data: session } = useSession();
  return !!session;
};

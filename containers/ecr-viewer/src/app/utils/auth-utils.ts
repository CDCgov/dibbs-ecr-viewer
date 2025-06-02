import "server-only";
import { getServerSession } from "next-auth/next";

interface UserSession {
    name?: string | null
    email: string
    image?: string | null
}

/**
 * Server side helper for whether this user is logged in. For client side, see `useLoggedInUser`.
 * A user can have access to an ecr page without being a logged in user if
 * they are authenticated via an NBS jwt.
 * @returns whether the user is logged in
 */
export const isLoggedInUser = async () => {
  const session = await getServerSession();
  return !!session;
};

/**
 * Server side helper to get currently logged in user.
 * A user can have access to an ecr page without being a logged in user if
 * they are authenticated via an NBS jwt.
 * @returns the user who is logged in or undefined
 */
export const getLoggedInUserSession = async () => {
  const session = await getServerSession();

  if(!session?.user) return

  session.user.email ||= ''

  return session.user as UserSession;
};

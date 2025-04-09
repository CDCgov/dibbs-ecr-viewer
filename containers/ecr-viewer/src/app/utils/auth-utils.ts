import "server-only";
import { getServerSession } from "next-auth/next";

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

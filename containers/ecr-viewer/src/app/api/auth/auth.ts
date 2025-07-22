import { Transaction } from "kysely";
import NextAuth, { CallbacksOptions, EventCallbacks } from "next-auth";

import { dbIsValid } from "@/app/api/migrate-db/migrate";
import { Core } from "@/app/data/metadataDb/types/core";
import { audit } from "@/app/services/auditLogService";

import { providers } from "./providers";

export const handler = NextAuth({
  providers,
  callbacks: {
    async redirect({ url, baseUrl }) {
      const nextURL = new URL(url, baseUrl);
      const callbackUrl = nextURL.searchParams.get("callbackUrl");
      const defaultUrl = `${baseUrl}/ecr-viewer`;

      if (callbackUrl) url = callbackUrl;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (url === baseUrl) return defaultUrl;
      else if (new URL(url).origin === baseUrl) return url;
      return defaultUrl;
    },
    signIn: audit(
      "user",
      "signin",
      async (
        params: Parameters<CallbacksOptions["signIn"]>[0],
        trx: Transaction<Core>,
      ) => {
        if (params.user?.email) {
          // Update the last log in and user's name to match the IDP
          try {
            await trx
              .updateTable("user")
              .set({ date_of_last_login: new Date(), name: params.user.name })
              .where("email", "=", params.user.email)
              .execute();
          } catch (e) {
            if (await dbIsValid()) {
              throw e;
            }
          }
          return true;
        } else {
          return false;
        }
      },
    ),
  },
  events: {
    signOut: audit(
      "user",
      "signout",
      async (
        _params: Parameters<EventCallbacks["signOut"]>[0],
        _trx: Transaction<Core>,
      ) => {},
    ),
  },
  pages: {
    signIn: `${process.env.BASE_PATH}/signin`,
  },
  session: {
    maxAge: (Number(process.env.AUTH_SESSION_DURATION_MIN) || 30) * 60, // default: 30 minutes
  },
  jwt: {
    maxAge: 16 * 60 * 60, // 16 hours
  },
});

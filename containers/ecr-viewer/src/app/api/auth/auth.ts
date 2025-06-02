import NextAuth from "next-auth";

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
  },
  pages: {
    signIn: `${process.env.BASE_PATH}/signin`,
  },
  session: {
    maxAge: (Number(process.env.AUTH_SESSION_DURATION_MIN) || 15) * 60,
  },
  jwt: {
    maxAge: 16 * 60 * 60, // 16 hours
  },
});

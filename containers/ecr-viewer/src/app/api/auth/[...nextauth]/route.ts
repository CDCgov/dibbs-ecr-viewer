import NextAuth from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

const handler = NextAuth({
  providers: [
    KeycloakProvider({
      clientId: process.env.AUTH_KEYCLOAK_ID,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER,
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      const defaultUrl = `${baseUrl}/ecr-viewer`;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (url === baseUrl) return defaultUrl;
      else if (new URL(url).origin === baseUrl) return url;
      return defaultUrl;
    },
  },
});

export { handler as GET, handler as POST };

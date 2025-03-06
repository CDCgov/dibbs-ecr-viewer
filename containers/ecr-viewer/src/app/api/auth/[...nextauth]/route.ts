import NextAuth from "next-auth";
import AzureAdProvider from "next-auth/providers/azure-ad";
import KeycloakProvider from "next-auth/providers/keycloak";

const keycloak = () => {
  if (
    process.env.AUTH_KEYCLOAK_ID &&
    process.env.AUTH_KEYCLOAK_SECRET &&
    process.env.AUTH_KEYCLOAK_ISSUER
  )
    return KeycloakProvider({
      clientId: process.env.AUTH_KEYCLOAK_ID,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER,
    });
};
const azure = () => {
  if (process.env.AUTH_AZURE_AD_ID && process.env.AUTH_AZURE_AD_SECRET)
    return AzureAdProvider({
      clientId: process.env.AUTH_AZURE_AD_ID,
      clientSecret: process.env.AUTH_AZURE_AD_SECRET,
      tenantId: process.env.AUTH_AZURE_AD_TENANT_ID,
    });
};
const handler = NextAuth({
  providers: [keycloak(), azure()].filter((p) => p !== undefined),
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
});

export { handler as GET, handler as POST };

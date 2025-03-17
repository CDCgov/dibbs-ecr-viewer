import NextAuth from "next-auth";
import AzureAdProvider from "next-auth/providers/azure-ad";
import KeycloakProvider from "next-auth/providers/keycloak";

export interface ProviderDetails {
  id: string;
  name: string;
}

const keycloak = () => {
  if (
    process.env.AUTH_PROVIDER?.toLowerCase() === "keycloak" &&
    process.env.AUTH_CLIENT_ID &&
    process.env.AUTH_CLIENT_SECRET
  )
    return KeycloakProvider({
      clientId: process.env.AUTH_CLIENT_ID,
      clientSecret: process.env.AUTH_CLIENT_SECRET,
      issuer: process.env.AUTH_ISSUER,
    });
};
const azure = () => {
  if (
    process.env.AUTH_PROVIDER?.toLowerCase() === "ad" &&
    process.env.AUTH_CLIENT_ID &&
    process.env.AUTH_CLIENT_SECRET
  )
    return AzureAdProvider({
      clientId: process.env.AUTH_CLIENT_ID,
      clientSecret: process.env.AUTH_CLIENT_SECRET,
      tenantId: process.env.AUTH_ISSUER,
    });
};
const providers = [keycloak(), azure()].filter((p) => p !== undefined);

export const providerMap: ProviderDetails[] = providers.map((provider) => ({
  id: provider.id,
  name: provider.name,
}));

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
});

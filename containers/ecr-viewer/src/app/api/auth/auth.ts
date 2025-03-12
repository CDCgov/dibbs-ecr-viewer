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
      tenantId: process.env.AUTH_TENANT_ID,
    });
};
const providers = [keycloak(), azure()].filter((p) => p !== undefined);

export const providerMap: ProviderDetails[] = providers.map((provider) => ({
  id: provider.id,
  name: provider.name,
}));

export const handler = NextAuth({
  providers,
  pages: {
    signIn: `${process.env.BASE_PATH}/signin`,
  },
});

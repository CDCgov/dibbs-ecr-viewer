import { Profile } from "next-auth";
import AzureAdProvider from "next-auth/providers/azure-ad";
import KeycloakProvider from "next-auth/providers/keycloak";
import { OAuthConfig } from "next-auth/providers/oauth";

export interface ProviderDetails {
  id: string;
  name: string;
  wellKnown?: string;
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
export const providers = [keycloak(), azure()].filter(
  (p) => p !== undefined,
) as OAuthConfig<Profile>[];

export const providerMap: ProviderDetails[] = providers.map((provider) => ({
  id: provider.id,
  name: provider.name,
  wellKnown: provider?.wellKnown,
}));

export const isUsingNextAuth = !!providerMap[0];

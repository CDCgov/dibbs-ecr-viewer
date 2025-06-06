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
      // Override the default profile fetcher as 1) we don't care about images and 2)
      // azure makes it look like you have an email, but it's really a UPN, so use that
      // as a fall-back for email if needed and it looks email-like
      async profile(profile) {
        const altEmail = profile.upn?.includes("@") ? profile.upn : null;

        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email || altEmail,
          image: null,
        };
      },
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

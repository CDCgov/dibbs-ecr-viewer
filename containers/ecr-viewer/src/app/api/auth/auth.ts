import NextAuth from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
import AzureAdProvider from "next-auth/providers/azure-ad";

interface ProviderDetails {
  id: string;
  name: string;
}

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
const providers = [keycloak(), azure()].filter((p) => p !== undefined);

const providerMap: ProviderDetails[] = providers.map((provider) => ({
  id: provider.id,
  name: provider.name,
}));

const handler = NextAuth({
  providers,
});

export { providerMap, handler, type ProviderDetails };

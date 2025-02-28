import { providerMap } from "../api/auth/auth";
import { Redirect } from "./signin";

/**
 * @returns a sign-in (redirect) page
 */
const RedirectPage = () => {
  return <Redirect provider={providerMap[0]} />;
};

export default RedirectPage;

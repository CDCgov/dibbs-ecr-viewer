import { providerMap } from "../api/auth/auth";
import { Redirect } from "./Redirect";

/**
 * @returns a redirect page
 */
const RedirectPage = () => {
  return <Redirect provider={providerMap[0]} />;
};

export default RedirectPage;

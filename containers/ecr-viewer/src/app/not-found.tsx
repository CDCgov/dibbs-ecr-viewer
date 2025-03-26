import ErrorPage from "./components/ErrorPage";
import { isLoggedInUser } from "./utils/auth-utils";

/**
 * 404 page
 * @returns 404 Page
 */
const NotFound = async () => {
  const isLoggedIn = await isLoggedInUser();

  return (
    <ErrorPage
      title="Page not found"
      subTitle="The requested page could not be found"
    >
      Please try the following:
      <ul className="margin-0 padding-left-3">
        <li>
          <b>Check the URL:</b> Make sure there are no typos in the address.
        </li>
        {!isLoggedIn && (
          <li>
            <b>Return to NBS:</b> Return to NBS and try to reopen the eCR.
          </li>
        )}
        <li>
          <b>Contact support:</b> If the problem persists, please reach out to
          your eCR coordinator.
        </li>
      </ul>
    </ErrorPage>
  );
};

export default NotFound;

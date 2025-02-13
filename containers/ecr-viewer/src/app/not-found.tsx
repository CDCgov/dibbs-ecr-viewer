import { Error } from "@/app/components/Icon";
import Header from "./Header";
import { BackButton } from "./view-data/components/BackButton";

/**
 * 404 page
 * @returns 404 Page
 */
const NotFound = () => (
  <div className="height-viewport width-viewport display-flex flex-column">
    <Header />
    <main className="display-flex flex-justify-center height-full">
      <div className="display-inline-block margin-y-auto">
        <h2 className="font-family-serif font-serif-xl margin-bottom-0">
          <Error
            size={5}
            className="margin-right-105 text-middle"
            aria-hidden
          />
          Page not found
        </h2>
        <div className="text-semibold font-sans-md margin-top-1">
          The requested page could not be found
        </div>
        <div className="bg-info-lighter border border-info-light radius-md font-sans-md line-height-sans-4 padding-3 margin-top-2">
          Please try the following:
          <ul className="margin-0 padding-left-3">
            <li>
              <b>Check the URL:</b> Make sure there are no typos in the address.
            </li>
            <li>
              <b>Return to NBS:</b> Return to NBS and try to reopen the eCR.
            </li>
            <li>
              <b>Contact support:</b> If the problem persists, please reach out
              to your eCR coordinator.
            </li>
          </ul>
        </div>
        <BackButton className="margin-top-3 font-sans-md text-primary" />
      </div>
    </main>
  </div>
);

export default NotFound;

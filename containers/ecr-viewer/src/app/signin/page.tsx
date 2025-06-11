import { notFound } from "next/navigation";

import bgRedirect from "../../../assets/bg-redirect.svg";
import { isUsingNextAuth, providerMap } from "@/app/api/auth/providers";

import { RedirectButton } from "./components/RedirectButton";

/**
 * @returns a sign-in (redirect) page
 */
const RedirectPage = () => {
  if (!isUsingNextAuth) notFound();
  return (
    <div
      className="height-viewport-header-footer position-relative text-white"
      style={{
        backgroundImage: `url(${bgRedirect.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minWidth: "100vw",
        overflowY: "auto",
        overflowX: "auto",
      }}
    >
      <div className="width-tablet position-absolute top-3950 left-12 padding-bottom-6 padding-right-6 grid-row gap-5">
        <h1 className="font-serif-3xl text-normal margin-0">
          Looks like you're trying to access the eCR Viewer
        </h1>
        <p className="font-sans-lg text-normal margin-0">
          You need to sign in to see the eCR Viewer
        </p>
        <RedirectButton provider={providerMap[0]} />
      </div>
    </div>
  );
};

export default RedirectPage;

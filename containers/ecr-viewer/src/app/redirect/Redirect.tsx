"use client";

import { Button } from "@trussworks/react-uswds";
import { ArrowForward } from "@/app/components/Icon";
import bgRedirect from "../../../assets/bg-redirect.png";

const AZURE_LOGIN_URL =
  "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?redirect_uri=https%3A%2F%2Fportal.azure.com%2Fsignin%2Findex%2F&response_type=code%20id_token&scope=https%3A%2F%2Fmanagement.core.windows.net%2F%2Fuser_impersonation%20openid%20email%20profile&state=OpenIdConnect.AuthenticationProperties%3Dijo7Z1FSylUUtat-7x_30erj_nZnJbl22c2h1otwg_RtYmiE-2pJ8fGdgPu0DbzE3JS6Mo4UQaqfmAFpuvL6U0GLTvVdEgVeTitaPGChllgSb6x64ZiZxWfVesmi-_kkxs8OPZcKvcywDSEzJmyF37PytgtvxvD8z6iHyYTrn0-rW1INDyAWuHAIPc4KoWpazMcM_Z1Fp8iM5qCl_MVAJXi3y3xpB-2WR9rJARmmKe1-WDs19erzWWoqtJCNUWzu1IvRmuJhORXCSt8jYa-j5rvJ_RM7QG17Pik8X8xPrBekyGmu4q0yZcSvIdYsTrlgBsctN_QlDTwMwh_82IG02T8ZnJ--l5nrRjETlqvVSIdijDDQ_DJdu_3fm9WvQqYtlhCjW0UNoQxkuCmaCu9MQEkqMFNEV3XXiHRYrd16sJ5eu3G6D3RvTkksU89GU-pq9l8WGMwVsKISH_kRWhdXPRqrVM6v6bD_3S2UGJ3i7V4&response_mode=form_post&nonce=638744527676776455.ZWE2Y2E2NzItZDQ0OS00YWMxLWIwNmItNjI1MjRkYmFlYjFhNDYxMjY1OTItNTgzYi00MjdiLWJiZTAtZGNlNWJiYzc2MDQ1&client_id=c44b4083-3bb0-49c1-b47d-974e53cbdf3c&site_id=501430&client-request-id=3a01c170-69bd-4f34-bdb7-e1a6c65fb16b&x-client-SKU=ID_NET472&x-client-ver=7.5.0.0";

/**
 * Redirect Component
 *
 * Returns a login page for users trying to access the eCR Viewer.
 * @returns A styled div with prompt message and a login button that redirects users to Azure AD authentication.
 */
export const Redirect = () => {
  return (
    <div
      className="position-relative text-white"
      style={{
        backgroundImage: `url(${bgRedirect.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
        minWidth: "100vw",
        overflowY: "auto",
        overflowX: "auto",
      }}
    >
      <div className="width-tablet position-absolute top-3950 left-12 padding-bottom-6 padding-right-6">
        <h1 className="font-serif-3xl text-bold margin-top-0 margin-bottom-5">
          Looks like you're trying to access the eCR Viewer
        </h1>
        <p className="font-sans-lg text-bold">
          You need to log in to see the eCR Viewer
        </p>
        <br />
        <Button
          aria-label={`Log in via Azure AD`}
          className={`redirect-button margin-top-5`}
          type="button"
          onClick={() => {
            window.location.href = AZURE_LOGIN_URL;
          }}
        >
          Log in via Azure AD
          <ArrowForward aria-hidden size={3} />
        </Button>
      </div>
    </div>
  )
};
import "@/styles/styles.scss";
import { PublicEnvScript } from "next-runtime-env";

import AuthSessionProvider from "./components/AuthSessionProvider";
import { isLoggedInUser } from "./utils/auth-utils";

export const metadata = {
  title: "DIBBs eCR Viewer",
  description: "View your eCR data in an easy-to-understand format.",
};

const PATIENT_BANNER_BUFFER = "2.75rem";

declare module "react" {
  interface CSSProperties {
    "--patient-banner-buffer"?: typeof PATIENT_BANNER_BUFFER | 0;
  }
}

/**
 * `RootLayout` serves as the top-level layout component for a React application.
 * @param props - The properties passed to the component.
 * @param props.children - The child components or elements to be rendered within
 *   the `<body>`f tag of the HTML document.
 * @returns A React element representing the top-level HTML structure, with the
 *   `children` rendered inside the `<body>` tag.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const loggedIn = await isLoggedInUser();

  return (
    <html
      lang="en"
      style={{
        "--patient-banner-buffer": loggedIn ? PATIENT_BANNER_BUFFER : 0,
      }}
    >
      <head>
        <PublicEnvScript nonce={{ headerKey: "x-nonce" }} />
      </head>
      <body className="overflow-x-auto">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}

import "@/styles/styles.scss";
import { PublicEnvScript, env } from "next-runtime-env";

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
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isNonIntegratedViewer =
    env("NEXT_PUBLIC_NON_INTEGRATED_VIEWER") === "true";

  return (
    <html
      lang="en"
      style={{
        "--patient-banner-buffer": isNonIntegratedViewer
          ? PATIENT_BANNER_BUFFER
          : 0,
      }}
    >
      <head>
        <PublicEnvScript nonce={{ headerKey: "x-nonce" }} />
      </head>
      <body className="overflow-x-auto">{children}</body>
    </html>
  );
}

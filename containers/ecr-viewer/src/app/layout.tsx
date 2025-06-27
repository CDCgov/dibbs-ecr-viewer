import "@/styles/styles.scss";

import { getServerSession } from "next-auth";

import { isUsingNextAuth } from "./api/auth/providers";
import { AuthSessionProvider } from "./components/AuthSessionProvider";
import { AutoSignout } from "./components/AutoSignout";
import Footer from "./components/Footer";
import Header from "./components/Header";
import NavLinks from "./components/NavLinks";
import RespectMotionPreferences from "./components/RespectMotionPreferences";
import ToastProvider from "./components/toast/ToastProvider";
import ToastShelf from "./components/toast/ToastShelf";

export const metadata = {
  title: "DIBBs eCR Viewer",
  description: "View your eCR data in an easy-to-understand format.",
};

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
  const initSession = await getServerSession();
  return (
    <RespectMotionPreferences>
      <html lang="en">
        <head />
        <body className="overflow-x-auto">
          <div className="minw-main position-relative isolate">
            <AuthSessionProvider initSession={initSession}>
              {isUsingNextAuth && <AutoSignout />}
              <ToastProvider>
                <Header>
                  <NavLinks />
                </Header>
                {children}
                <ToastShelf />
                <Footer />
              </ToastProvider>
            </AuthSessionProvider>
          </div>
        </body>
      </html>
    </RespectMotionPreferences>
  );
}

import "@/styles/styles.scss";

import Header from "@/app/components/Header";
import NavLinks from "@/app/components/NavLinks";

import { AuthSessionProvider } from "./components/AuthSessionProvider";
import RespectMotionPreferences from "./components/RespectMotionPreferences";
import Footer from "@/app/components/Footer";

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
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RespectMotionPreferences>
      <html lang="en">
        <head />
        <body className="overflow-x-auto">
          <AuthSessionProvider>
            <Header>
              <NavLinks/>
            </Header>
            {children}
            <Footer/>
          </AuthSessionProvider>
        </body>
      </html>
    </RespectMotionPreferences>
  );
}

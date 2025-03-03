import React from "react";

import Link from "next/link";

/**
 * Header component for the ECR Viewer project.
 * This component renders the header section of the application, including the
 * navigation container, navbar, and logo. It uses USWDS (U.S. Web Design System)
 * classes for styling.
 * @returns The header section of the application.
 */
const Header: React.FC = () => (
  <header className="usa-header usa-header--basic">
    <div className="usa-nav-container">
      <div className="usa-navbar">
        <div className="usa-logo">
          <h1>
            <Link href="/" prefetch={false}>
              DIBBs eCR Viewer
            </Link>
          </h1>
        </div>
      </div>
    </div>
  </header>
);

export default Header;

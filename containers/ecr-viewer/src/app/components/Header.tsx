"use client";

import React, { ReactNode } from "react";

import Image from "next/image";
import Link from "next/link";

/**
 * Header component for the ECR Viewer project.
 * This component renders the header section of the application, including the
 * navigation container, navbar, and logo. It uses USWDS (U.S. Web Design System)
 * classes for styling with some customization.
 * @param props - Component props.
 * @param props.children - nav links to be displayed in the header
 * @returns The header section of the application.
 */
const Header = ({ children }: { children: ReactNode }) => {
  return (
    <header className="usa-header usa-header--basic position-relative z-top isolate">
      <div
        className="usa-nav-container display-flex flex-direction-row"
        style={{ maxWidth: "none" }}
      >
        <h1>
          <Link className="dibbs-logo" href="/" prefetch={false}>
            <Image
              src="/ecr-viewer/ecr-viewer-logo.png"
              alt="eCR Viewer Logo"
              width={185}
              height={40}
            />
          </Link>
        </h1>
        {children}
      </div>
    </header>
  );
};

export default Header;

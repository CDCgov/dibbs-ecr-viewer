"use client";
import { ReactNode } from "react";

import classnames from "classnames";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Nav link component for the eCR Viewer Header.
 * This component renders a link with proper styling
 * @param props react props
 * @param props.href the link to visit
 * @param props.children link content
 * @returns The header nav link
 */
const NavLink = ({ href, children }: { href: string; children: ReactNode }) => {
  const pathname = usePathname();

  return (
    <Link
      href={href}
      className={classnames("usa-nav__link", {
        "active-page":
          pathname === href || (href.length > 1 && pathname.includes(href)),
      })}
    >
      {children}
    </Link>
  );
};

export default NavLink;

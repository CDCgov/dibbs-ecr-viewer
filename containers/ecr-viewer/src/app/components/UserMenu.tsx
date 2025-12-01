"use client";

import React, { useEffect, useRef, useState } from "react";

import { User } from "@/app/data/metadataDb/types/core";
import useEscapeKey from "@/app/hooks/useEscapeKey";
import { toSentenceCase } from "@/app/utils/format-utils";

import { Person } from "./Icon";
import { SignOutButton } from "./SignOutButton";

/**
 * User Menu component for the eCR Viewer project.
 * This component renders a dropdown menu that contains user information
 * and a sign-out button
 * @param props Component props.
 * @param props.user - Details of the currently logged-in user
 * @param props.version - eCR Viewer version number
 * @returns The UserMenu component of the application.
 */
const UserMenu = ({
  user,
  version,
}: {
  user: Partial<Pick<User, "email" | "user_type">>;
  version: string;
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleMenuDropdown = () => {
    setShowMenu(!showMenu);
  };

  useEscapeKey(() => setShowMenu(false));

  useEffect(() => {
    if (!showMenu) return;

    const outsideMenuClick = (event: MouseEvent) => {
      if (
        showMenu &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", outsideMenuClick);
    return () => {
      document.removeEventListener("mousedown", outsideMenuClick);
    };
  }, [showMenu]);

  return (
    <div className="user-menu-container">
      <button
        type="button"
        ref={buttonRef}
        className="user-menu-button"
        onClick={toggleMenuDropdown}
      >
        <Person
          aria-label="User Menu"
          data-testid="user-menu-button"
          className="person-icon"
        />
      </button>
      {showMenu && (
        <div ref={menuRef} className="user-menu">
          <p className="user-email">{user.email}</p>
          <p className="user-role">{toSentenceCase(user.user_type)}</p>
          <p className="version-number">version {version}</p>
          <SignOutButton />
        </div>
      )}
    </div>
  );
};

export default UserMenu;

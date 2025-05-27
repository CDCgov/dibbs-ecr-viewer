"use client";

import React, { useEffect, useRef, useState } from "react";

import Image from "next/image";

import { User } from "@/app/data/metadataDb/types/core";
import useEscapeKey from "@/app/hooks/useEscapeKey";

import { SignOutButton } from "./SignOutButton";

/**
 * User Menu component for the ECR Viewer project.
 * This component renders a dropdown menu that contains user information
 * and a sign-out button
 * @param props Component props.
 * @param props.user - Details of the currently logged-in user
 * @returns The UserMenu component of the application.
 */
const UserMenu = ({ user }: { user: User }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleMenuDropdown = () => {
    setShowMenu(!showMenu);
  };

  useEscapeKey(() => setShowMenu(false));

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

  useEffect(() => {
    document.addEventListener("mousedown", outsideMenuClick);
    return () => {
      document.removeEventListener("mousedown", outsideMenuClick);
    };
  }, [showMenu]);

  return (
    <div className="user-menu-container">
      <button
        ref={buttonRef}
        className="user-menu-button"
        onClick={() => {
          toggleMenuDropdown();
        }}
      >
        <Image
          src="/ecr-viewer/user-profile.png"
          alt="User Menu Icon"
          width={28}
          height={28}
        />
      </button>
      {showMenu && (
        <div ref={menuRef} className="user-menu">
          <div className="menu-items-container">
            <div>
              <p className="user-name">{user.name}</p>
              <p className="user-role">
                {user.user_type.charAt(0).toUpperCase() +
                  user.user_type.slice(1)}
              </p>
            </div>
            <div>
              <SignOutButton />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;

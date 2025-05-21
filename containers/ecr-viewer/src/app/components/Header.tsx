'use client';

import React, {useEffect, useRef, useState } from "react";

import Image from 'next/image';
import Link from "next/link";

/**
 * Header component for the ECR Viewer project.
 * This component renders the header section of the application, including the
 * navigation container, navbar, and logo. It uses USWDS (U.S. Web Design System)
 * classes for styling.
 * @returns The header section of the application.
 */
const Header: React.FC = () =>{
    const [showMenu, setShowMenu] = useState(true);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const toggleMenuDropdown = () => {
        setShowMenu(!showMenu);
    };

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

    return(<header className="usa-header usa-header--basic">
    <div
      className="usa-nav-container"
      style={{ maxWidth: "none" }}
    >
        <Link href="/" prefetch={false}>
            <Image src="/ecr-viewer/ecr-viewer-logo.png" alt="eCR Viewer Logo" width={185} height={40} />
        </Link>
        <div className="usa-nav display-flex flex-row ">
            <ul className="usa-nav__primary usa-accordion">
                <li className="usa-nav__primary-item">
                    <a href="/" className="usa-nav__link">eCR Library</a>
                </li>
                <li className="usa-nav__primary-item">
                    <a href="/about" className="usa-nav__link">User Management</a>
                </li>
                <li className="usa-nav__primary-item">
                    <a href="/services" className="usa-nav__link">Program Management</a>
                </li>
            </ul>
            <div className="user-menu-container">
            <button ref={buttonRef} className='user-menu-button' onClick={()=> {toggleMenuDropdown()}}>
                <Image src="/ecr-viewer/user-profile.png" alt="eCR Viewer Logo" width={28} height={28}/>
            </button>
            { showMenu && (
                <div ref={menuRef} className="user-menu">

                </div>
            )}
            </div>
        </div >
    </div>
  </header>
)
};

export default Header;

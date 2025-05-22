'use client';

import React, {useEffect, useRef, useState } from "react";

import Image from 'next/image';

import {User} from "@/app/data/metadataDb/types/core";
import {SignOutButton} from "@/app/components/SignOutButton";
import useEscapeKey from "@/app/hooks/useEscapeKey";


/**
 * Header component for the ECR Viewer project.
 * This component renders the header section of the application, including the
 * navigation container, navbar, and logo. It uses USWDS (U.S. Web Design System)
 * classes for styling.
 * @returns The header section of the application.
 */
const UserMenu = ({user}: {user: User}) => {
    const [showMenu, setShowMenu] = useState(true);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const toggleMenuDropdown = () => {
        setShowMenu(!showMenu);
    };

    useEscapeKey(()=>setShowMenu(false))

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

    return (<div className="user-menu-container">
        <button ref={buttonRef} className='user-menu-button' onClick={()=> {toggleMenuDropdown()}}>
            <Image src="/ecr-viewer/user-profile.png" alt="eCR Viewer Logo" width={28} height={28}/>
        </button>
        { showMenu && (
            <div ref={menuRef} className="user-menu">
                <div className="menu-items-container">
                    <div>
                        <p className="user-name">{user.name}</p>
                        <p className="user-role">{user.user_type}</p>
                    </div>
                    <div>
                        <SignOutButton/>
                    </div>
                </div>
            </div>
        )}
    </div>)
}

export default UserMenu;
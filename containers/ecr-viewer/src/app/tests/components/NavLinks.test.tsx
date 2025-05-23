import React from 'react';

import { render, screen } from '@testing-library/react';

import '@testing-library/jest-dom';
import NavLinks from "@/app/components/NavLinks";
import { User } from '@/app/data/metadataDb/types/core';


const { getLoggedInUser, isAdmin } = require('../../services/userService');

jest.mock('../../services/userService', () => ({
    getLoggedInUser: jest.fn(),
    isAdmin: jest.fn(),
}));

jest.mock('../../components/UserMenu', () => (props: any) => (
    <div data-testid="user-menu">UserMenu for {props.user.user_type} {props.user.name}</div>
));

const mockAdminUser: User = {
    status: '',
    uuid: '',
    email: '',
    date_of_last_login: new Date(),
    name: 'Kyle Katarn',
    user_type: 'admin',
    date_created: new Date(),
    author_uuid: ''
};

const mockStandardUser: User = {
    status: '',
    uuid: '',
    email: '',
    date_of_last_login: new Date(),
    name: 'Qwi Gon Jin',
    user_type: 'standard user',
    date_created: new Date(),
    author_uuid: ''
};

describe('NavLinks component', () => {
    it('renders admin navigation links and user menu for an admin user', async () => {
        getLoggedInUser.mockResolvedValue(mockAdminUser);
        isAdmin.mockReturnValue(true);

        render(await NavLinks());

        // Navigation links
        expect(screen.getByText('eCR Library')).toBeInTheDocument();
        expect(screen.getByText('User Management')).toBeInTheDocument();
        expect(screen.getByText('Program Management')).toBeInTheDocument();

        // User menu
        expect(screen.getByTestId('user-menu')).toHaveTextContent('Kyle Katarn');
        expect(screen.getByTestId('user-menu')).toHaveTextContent('Admin');
    });

    it('Does not render links for a standard user but does render menu', async () => {
        getLoggedInUser.mockResolvedValue(mockStandardUser);
        isAdmin.mockReturnValue(false);

        render(await NavLinks());

        // Navigation links
        expect(screen.queryByText('eCR Library')).not.toBeInTheDocument();
        expect(screen.queryByText('User Management')).not.toBeInTheDocument();
        expect(screen.queryByText('Program Management')).not.toBeInTheDocument();

        // User menu
        expect(screen.getByTestId('user-menu')).toHaveTextContent('Qwi Gon Jin');
        expect(screen.getByTestId('user-menu')).toHaveTextContent('standard user');
    });
});

import React from "react";

import { render, screen } from "@testing-library/react";

import "@testing-library/jest-dom";
import NavLinks from "@/app/components/NavLinks";
import { User } from "@/app/data/metadataDb/types/core";
import { getLoggedInUser, isAdmin } from "@/app/services/userService";
import { getLoggedInUserSession } from "@/app/utils/auth-utils";

jest.mock("@/app/utils/auth-utils", () => ({
  getLoggedInUserSession: jest.fn(),
}));

jest.mock("@/app/services/userService", () => ({
  getLoggedInUser: jest.fn(),
  isAdmin: jest.fn(),
}));

jest.mock("@/app/components/UserMenu", () => (props: any) => (
  <div data-testid="user-menu">
    UserMenu for {props.user.user_type} {props.user.name}
  </div>
));

const mockAdminUser: User = {
  status: "",
  uuid: "",
  email: "",
  date_of_last_login: new Date(),
  name: "Kyle Katarn",
  user_type: "Admin",
  date_created: new Date(),
  author_uuid: "",
};

const mockStandardUser: User = {
  status: "",
  uuid: "",
  email: "",
  date_of_last_login: new Date(),
  name: "Qwi Gon Jin",
  user_type: "standard user",
  date_created: new Date(),
  author_uuid: "",
};

describe("NavLinks component", () => {
  it("renders admin navigation links and user menu for an admin user", async () => {
    (getLoggedInUserSession as jest.Mock).mockResolvedValue(mockAdminUser);
    (getLoggedInUser as jest.Mock).mockResolvedValue(mockAdminUser);
    (isAdmin as unknown as jest.Mock).mockReturnValue(true);

    render(await NavLinks());

    // Navigation links
    expect(screen.getByText("eCR library")).toBeInTheDocument();
    expect(screen.getByText("User management")).toBeInTheDocument();
    expect(screen.getByText("Program management")).toBeInTheDocument();

    // User menu
    expect(screen.getByTestId("user-menu")).toHaveTextContent("Kyle Katarn");
    expect(screen.getByTestId("user-menu")).toHaveTextContent("Admin");
  });

  it("Does not render links for a standard user but does render menu", async () => {
    (getLoggedInUserSession as jest.Mock).mockResolvedValue(mockStandardUser);
    (getLoggedInUser as jest.Mock).mockResolvedValue(mockStandardUser);
    (isAdmin as unknown as jest.Mock).mockReturnValue(false);

    render(await NavLinks());

    // Navigation links
    expect(screen.queryByText("eCR Library")).not.toBeInTheDocument();
    expect(screen.queryByText("User Management")).not.toBeInTheDocument();
    expect(screen.queryByText("Program Management")).not.toBeInTheDocument();

    // User menu
    expect(screen.getByTestId("user-menu")).toHaveTextContent("Qwi Gon Jin");
    expect(screen.getByTestId("user-menu")).toHaveTextContent("standard user");
  });
});

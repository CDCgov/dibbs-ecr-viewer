import React from "react";

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { usePathname } from "next/navigation";

import NavLinks from "@/app/components/NavLinks";
import { User } from "@/app/data/metadataDb/types/core";
import { getLoggedInUser } from "@/app/services/loggedInUserService";
import { isAnyAdmin } from "@/app/services/userService";
import { getLoggedInUserSession } from "@/app/utils/auth-utils";

jest.mock("@/app/utils/auth-utils", () => ({
  getLoggedInUserSession: jest.fn(),
}));

jest.mock("@/app/services/userService", () => ({
  isAnyAdmin: jest.fn()
}));
jest.mock("@/app/services/loggedInUserService", () => ({
  getLoggedInUser: jest.fn(),
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

const mockProgramAdminUser: User = {
  status: "",
  uuid: "",
  email: "",
  date_of_last_login: new Date(),
  name: "Phillip Phillip",
  user_type: "prog_admin",
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
    (usePathname as jest.Mock).mockReturnValue("/admin/user");
    (getLoggedInUserSession as jest.Mock).mockResolvedValue(mockAdminUser);
    (getLoggedInUser as jest.Mock).mockResolvedValue(mockAdminUser);
    (isAnyAdmin as unknown as jest.Mock).mockReturnValue(true);

    render(await NavLinks());

    // Navigation links
    expect(screen.getByText("eCR library")).toBeInTheDocument();
    expect(screen.getByText("eCR library")).not.toHaveClass("active-page");
    expect(screen.getByText("User management")).toBeInTheDocument();
    expect(screen.getByText("User management")).toHaveClass("active-page");
    expect(screen.getByText("Program management")).toBeInTheDocument();
    expect(screen.getByText("Program management")).not.toHaveClass(
      "active-page",
    );

    // User menu
    expect(screen.getByTestId("user-menu")).toHaveTextContent("Kyle Katarn");
    expect(screen.getByTestId("user-menu")).toHaveTextContent("Admin");
  });

  it("renders admin navigation links and user menu for a program admin user", async () => {
    (usePathname as jest.Mock).mockReturnValue("/admin/user");
    (getLoggedInUserSession as jest.Mock).mockResolvedValue(
      mockProgramAdminUser
    );
    (getLoggedInUser as jest.Mock).mockResolvedValue(mockProgramAdminUser);
    (isAnyAdmin as unknown as jest.Mock).mockReturnValue(true);

    render(await NavLinks());

    // Navigation links
    expect(screen.getByText("eCR library")).toBeInTheDocument();
    expect(screen.getByText("eCR library")).not.toHaveClass("active-page");
    expect(screen.getByText("User management")).toBeInTheDocument();
    expect(screen.getByText("User management")).toHaveClass("active-page");
    expect(screen.getByText("Program management")).toBeInTheDocument();
    expect(screen.getByText("Program management")).not.toHaveClass(
      "active-page"
    );

    // User menu
    const userMenu = screen.getByTestId("user-menu");
    expect(userMenu).toHaveTextContent("Phillip Phillip");
    expect(userMenu).toHaveTextContent("prog_admin");
  });

  it("Does not render links for a standard user but does render menu", async () => {
    (getLoggedInUserSession as jest.Mock).mockResolvedValue(mockStandardUser);
    (getLoggedInUser as jest.Mock).mockResolvedValue(mockStandardUser);
    (isAnyAdmin as unknown as jest.Mock).mockReturnValue(false);

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

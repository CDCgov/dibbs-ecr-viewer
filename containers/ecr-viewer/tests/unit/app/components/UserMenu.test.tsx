import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { SessionProvider } from "next-auth/react";

import UserMenu from "@/app/components/UserMenu";
import { User } from "@/app/data/metadataDb/types/core";

describe("UserMenu component", () => {
  const mockAdminUser: User = {
    status: "",
    uuid: "",
    email: "kyle.katarn@fakestarwarsemail.bananas.com",
    date_of_last_login: new Date(),
    name: "",
    user_type: "admin",
    date_created: new Date(),
    author_uuid: "",
  };
  const mockProgramAdminUser: User = {
    status: "",
    uuid: "",
    email: "phillip.phillip@fakestarwarsemail.bananas.com",
    date_of_last_login: new Date(),
    name: "Phillip Phillip",
    user_type: "prog_admin",
    date_created: new Date(),
    author_uuid: "",
  };

  function renderWithSession(ui: React.ReactNode) {
    return render(<SessionProvider session={null}>{ui}</SessionProvider>);
  }

  it("renders the profile image with correct alt text", () => {
    renderWithSession(<UserMenu user={mockAdminUser} version="vTest" />);
    const profileImage = screen.getByRole("img");
    expect(profileImage).toBeInTheDocument();
    expect(profileImage.getAttribute("aria-label")).toContain("User Menu");
  });

  it("toggles the menu when button is clicked and displays user info", () => {
    renderWithSession(<UserMenu user={mockAdminUser} version="vTest" />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(
      screen.getByText("kyle.katarn@fakestarwarsemail.bananas.com"),
    ).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText(/vTest/i)).toBeInTheDocument();
  });

  it("shows Program admin in the user menu when the current user is a program admin", () => {
    renderWithSession(<UserMenu user={mockProgramAdminUser} version="vTest" />);
    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(
      screen.getByText("phillip.phillip@fakestarwarsemail.bananas.com"),
    ).toBeInTheDocument();
    expect(screen.getByText("Program admin")).toBeInTheDocument();
  });
});

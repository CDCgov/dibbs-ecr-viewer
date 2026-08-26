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

  it.each([
    ["admin", "Admin"],
    ["prog_admin", "Program admin"],
    ["standard", "Standard user"],
  ] as const)("shows the correct title for a %s user", (userType, title) => {
    renderWithSession(
      <UserMenu
        user={{ ...mockAdminUser, user_type: userType }}
        version="vTest"
      />,
    );
    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText(title)).toBeInTheDocument();
  });
});

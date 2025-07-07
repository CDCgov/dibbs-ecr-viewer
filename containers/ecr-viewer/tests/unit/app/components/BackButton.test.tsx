import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";

import { useIsLoggedInUser } from "@/app/components/AuthSessionProvider";
import { BackButton } from "@/app/components/BackButton";

jest.mock("@/app/components/AuthSessionProvider");
jest.mock("next/navigation", () => ({
  usePathname: jest.fn().mockReturnValue("/somewhere"),
}));

describe("Back button", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  it("should not appear user is not logged in (e.g. nbs auth)", () => {
    (useIsLoggedInUser as jest.Mock).mockReturnValue(false);

    render(<BackButton />);

    expect(screen.queryByText("Back to eCR Library")).not.toBeInTheDocument();
  });

  it("should not appear if already on library page", () => {
    (usePathname as jest.Mock).mockReturnValue("/");

    render(<BackButton />);

    expect(screen.queryByText("Back to eCR Library")).not.toBeInTheDocument();
  });

  it("should appear when user is logged in", () => {
    (useIsLoggedInUser as jest.Mock).mockReturnValue(true);
    render(<BackButton />);

    expect(screen.getByText("Back to eCR Library")).toBeInTheDocument();
  });

  it("should apply class name to the a tag", () => {
    (useIsLoggedInUser as jest.Mock).mockReturnValue(true);
    render(<BackButton className="some-class" />);

    expect(screen.getByText("Back to eCR Library").className).toContain(
      "some-class",
    );
  });

  it("should icon apply class name to the icon tag", () => {
    (useIsLoggedInUser as jest.Mock).mockReturnValue(true);
    render(<BackButton iconClassName="some-icon-class" />);

    expect(screen.getByRole("link").children[0].classList).toContain(
      "some-icon-class",
    );
  });
});

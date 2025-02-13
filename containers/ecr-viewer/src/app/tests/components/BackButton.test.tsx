import { BackButton } from "@/app/view-data/components/BackButton";
import { render, screen } from "@testing-library/react";

describe("Back button", () => {
  it("should not appear when non integrated = false", () => {
    process.env.NEXT_PUBLIC_NON_INTEGRATED_VIEWER = "false";

    render(<BackButton />);

    expect(screen.queryByText("Back to eCR Library")).not.toBeInTheDocument();
  });

  it("should appear when non integrated = true", () => {
    process.env.NEXT_PUBLIC_NON_INTEGRATED_VIEWER = "true";

    render(<BackButton />);

    expect(screen.getByText("Back to eCR Library")).toBeInTheDocument();
  });

  it("should apply class name to the a tag", () => {
    process.env.NEXT_PUBLIC_NON_INTEGRATED_VIEWER = "true";

    render(<BackButton className="some-class" />);

    expect(screen.getByText("Back to eCR Library").className).toContain(
      "some-class",
    );
  });

  it("should icon apply class name to the icon tag", () => {
    process.env.NEXT_PUBLIC_NON_INTEGRATED_VIEWER = "true";

    render(<BackButton iconClassName="some-icon-class" />);

    expect(screen.getByRole("link").children[0].classList).toContain(
      "some-icon-class",
    );
  });
});

import React from "react";

import { render, screen } from "@testing-library/react";

import Footer from "@/app/components/Footer";

describe("Footer", () => {
  const ORIG_APP_VERSION = process.env.APP_VERSION;
  const ORIG_DISPLAY_LINKS = process.env.DISPLAY_LINKS;

  beforeAll(() => {
    process.env.APP_VERSION = "vTest";
  });
  afterAll(() => {
    process.env.APP_VERSION = ORIG_APP_VERSION;
    process.env.DISPLAY_LINKS = ORIG_DISPLAY_LINKS;
  });

  it("displays the CDC logo image", () => {
    render(<Footer />);
    const logo = screen.getByAltText(
      "Centers for Disease Control and Prevention Logo",
    );
    expect(logo).toBeInTheDocument();
    expect(logo.getAttribute("src")).toContain("cdc-logo.png");
  });

  it("by default, does not display mailto email link", () => {
    render(<Footer />);
    expect(
      screen.queryByText(
        /For more information about this solution, send us an email at/i,
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "dibbs@cdc.gov" }),
    ).not.toBeInTheDocument();
  });

  it("when DISPLAY_LINKS=true, contains a mailto link to dibbs@cdc.gov", () => {
    (process.env as any).DISPLAY_LINKS = true;
    render(<Footer />);
    expect(
      screen.getByText(
        /For more information about this solution, send us an email at/i,
      ),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "dibbs@cdc.gov" });
    expect(link).toHaveAttribute("href", "mailto:dibbs@cdc.gov");
  });

  it("displays the version number", () => {
    render(<Footer />);
    expect(screen.getByText(/vTest/i)).toBeInTheDocument();
  });
});

import React from "react";

import { render, screen } from "@testing-library/react";

import Footer from "@/app/components/Footer";

describe("Footer", () => {
  const ORIG_APP_VERSION = process.env.APP_VERSION;
  beforeAll(() => {
    process.env.APP_VERSION = "vTest";
  });
  afterAll(() => {
    process.env.APP_VERSION = ORIG_APP_VERSION;
  });

  it("displays the CDC logo image", () => {
    render(<Footer />);
    const logo = screen.getByAltText(
      "Centers for Disease Control and Prevention Logo",
    );
    expect(logo).toBeInTheDocument();
    expect(logo.getAttribute("src")).toContain("cdc-logo.png");
  });

  it("contains a mailto link to dibbs@cdc.gov", () => {
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

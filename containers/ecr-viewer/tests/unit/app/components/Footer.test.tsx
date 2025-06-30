import React from "react";

import { render, screen } from "@testing-library/react";

import Footer from "@/app/components/Footer";

describe("Footer", () => {
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
        "For more information about this solution, send us an email at",
      ),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "dibbs@cdc.gov" });
    expect(link).toHaveAttribute("href", "mailto:dibbs@cdc.gov");
  });
});

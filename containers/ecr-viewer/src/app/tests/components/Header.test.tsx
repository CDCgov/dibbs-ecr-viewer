import React from "react";

import { render, screen } from "@testing-library/react";

import "@testing-library/jest-dom";
import Header from "@/app/components/Header";

describe("Header component", () => {
  it("renders the header and logo image with correct alt text", () => {
    render(
      <Header>
        <p>I am a child element</p>
      </Header>,
    );
    const logo = screen.getByAltText("DIBBs Logo");
    expect(logo).toBeInTheDocument();
    expect(logo.getAttribute("src")).toContain("dibbs-logo.png");

    // Check that it has the correct text
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "eCR Viewer",
    );
  });

  it("renders children passed to the component", () => {
    render(
      <Header>
        <nav>My Nav</nav>
      </Header>,
    );
    expect(screen.getByText("My Nav")).toBeInTheDocument();
  });
});

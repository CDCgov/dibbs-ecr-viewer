import React from "react";
import { render, screen } from "@testing-library/react";

import "@testing-library/jest-dom";
import Header from "@/app/components/Header";

describe("Header component", () => {
  it("renders the logo image with correct alt text", () => {
    render(
      <Header>
        <p>I am a child element</p>
      </Header>,
    );
    const logo = screen.getByAltText("eCR Viewer Logo");
    expect(logo).toBeInTheDocument();
    expect(logo.getAttribute("src")).toContain("ecr-viewer-logo.png");
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

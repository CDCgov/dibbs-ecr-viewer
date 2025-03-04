import React from "react";
import { signIn } from "next-auth/react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import RedirectPage from "@/app/signin/page";

jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
}));

jest.mock("../../../../api/auth/auth", () => ({
  providerMap: [
    {
      id: "moria",
      name: "Moria",
    },
  ],
}));

describe("Sign-in Page", () => {
  let container: HTMLElement;

  const ORIG_BASE_PATH = process.env.BASE_PATH;
  beforeAll(() => {
    container = render(<RedirectPage />).container;
    process.env.BASE_PATH = "ecr-viewer";
  });
  afterAll(() => {
    process.env.BASE_PATH = ORIG_BASE_PATH;
  });

  it("should match snapshot", () => {
    expect(container).toMatchSnapshot();
  });

  it("should pass accessibility test", async () => {
    expect(await axe(container)).toHaveNoViolations();
  });

  it("should open signin with correct provider and callback URL when login button is clicked", async () => {
    const MOCK_CALLBACK_URL = "https://http.cat";
    (signIn as jest.Mock).mockResolvedValueOnce({
      url: MOCK_CALLBACK_URL,
    });

    render(<RedirectPage />);

    const button = screen.getByRole("button", {
      name: /log in via/i,
    });
    fireEvent.click(button);

    expect(signIn).toHaveBeenCalledWith("moria", {
      callbackUrl: "ecr-viewer",
    });
  });
});

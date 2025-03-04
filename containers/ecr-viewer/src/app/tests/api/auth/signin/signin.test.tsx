import React from "react";
import { signIn } from "next-auth/react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { RedirectButton } from "@/app/signin/components/RedirectButton";

jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
}));

describe("Sign-in Page", () => {
  let container: HTMLElement;

  const MOCK_PROVIDER = {
    id: "moria",
    name: "Moria",
  };

  const ORIG_BASE_PATH = process.env.BASE_PATH;
  beforeAll(() => {
    container = render(<RedirectButton provider={MOCK_PROVIDER} />).container;
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

    render(<RedirectButton provider={MOCK_PROVIDER} />);

    const button = screen.getByRole("button", {
      name: /log in via/i,
    });
    fireEvent.click(button);

    expect(signIn).toHaveBeenCalledWith(MOCK_PROVIDER.id, {
      callbackUrl: "ecr-viewer",
    });
  });
});

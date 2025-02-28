import React from "react";
import { signIn } from "next-auth/react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { Redirect } from "@/app/signin/signin";

jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
}));

describe("Sign-in Page", () => {
  let container: HTMLElement;

  const MOCK_PROVIDER = {
    id: "moria",
    name: "Moria",
  };

  beforeAll(() => {
    container = render(<Redirect provider={MOCK_PROVIDER} />).container;
    process.env.BASE_PATH = "ecr-viewer";
  });
  afterAll(() => {
    delete process.env.BASE_PATH;
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

    render(<Redirect provider={MOCK_PROVIDER} />);

    const button = screen.getByRole("button", {
      name: /log in via/i,
    });
    fireEvent.click(button);

    expect(signIn).toHaveBeenCalledWith(MOCK_PROVIDER.id, {
      callbackUrl: "ecr-viewer",
    });
  });
});

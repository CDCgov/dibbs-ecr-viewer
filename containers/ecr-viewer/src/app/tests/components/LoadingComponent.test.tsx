import React from "react";

import { render } from "@testing-library/react";
import { axe } from "jest-axe";

import { EcrLoadingSkeleton } from "@/app/view-data/components/LoadingComponent";

jest.mock("../../components/AuthSessionProvider", () => ({
  useIsLoggedInUser: () => true,
}));

describe("Snapshot test for EcrLoadingSkeleton", () => {
  let container: HTMLElement;

  beforeAll(() => {
    process.env.NEXT_PUBLIC_NON_INTEGRATED_VIEWER = "true";
    const mockIntersectionObserver = jest.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: () => null,
      unobserve: () => null,
      disconnect: () => null,
    });
    window.IntersectionObserver = mockIntersectionObserver;

    ({ container } = render(<EcrLoadingSkeleton />));
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_NON_INTEGRATED_VIEWER = "false";
  });
  it("should match snapshot", () => {
    expect(container).toMatchSnapshot();
  });
  it("should pass accessibility test", async () => {
    expect(await axe(container)).toHaveNoViolations();
  });
});

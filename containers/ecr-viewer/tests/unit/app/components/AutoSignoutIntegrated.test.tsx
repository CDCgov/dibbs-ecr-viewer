import { act, fireEvent, render, screen } from "@testing-library/react";

import { AutoSignoutIntegrated } from "@/app/components/AutoSignoutIntegrated";

const AUTH_ERROR_PATH = "/ecr-viewer/error/auth";

describe("AutoSignoutIntegrated", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("hides modal when session is not close to expiring", () => {
    render(
      <AutoSignoutIntegrated
        sessionDurationSec={300}
        authErrorPath={AUTH_ERROR_PATH}
      />,
    );

    expect(screen.getByRole("dialog")).toHaveClass("is-hidden");
  });

  it("shows warning modal when within 90 seconds of expiry", () => {
    render(
      <AutoSignoutIntegrated
        sessionDurationSec={60}
        authErrorPath={AUTH_ERROR_PATH}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(1100);
    });

    expect(screen.getByRole("dialog")).toHaveClass("is-visible");
  });

  it("resets the timer and closes modal when user is active", () => {
    // Use 300s so resetting the timer puts us well outside the 90s warning window
    render(
      <AutoSignoutIntegrated
        sessionDurationSec={300}
        authErrorPath={AUTH_ERROR_PATH}
      />,
    );

    // Advance into the warning window (300 - 89 = 211 seconds)
    act(() => {
      jest.advanceTimersByTime(211000);
    });

    expect(screen.getByRole("dialog")).toHaveClass("is-visible");

    // Simulate user activity by dispatching directly on window (the listener target)
    act(() => {
      window.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // One interval tick so the component reads the updated deadline
    act(() => {
      jest.advanceTimersByTime(1100);
    });

    expect(screen.getByRole("dialog")).toHaveClass("is-hidden");
  });

  it("extends session when Extend session is clicked", () => {
    render(
      <AutoSignoutIntegrated
        sessionDurationSec={60}
        authErrorPath={AUTH_ERROR_PATH}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(1100);
    });

    expect(screen.getByRole("dialog")).toHaveClass("is-visible");

    fireEvent.click(screen.getByRole("button", { name: "Extend session" }));

    act(() => {
      jest.advanceTimersByTime(1100);
    });

    expect(screen.getByRole("dialog")).toHaveClass("is-hidden");
  });

  it("navigates to auth error path when session expires", () => {
    const navigate = jest.fn();
    render(
      <AutoSignoutIntegrated
        sessionDurationSec={0}
        authErrorPath={AUTH_ERROR_PATH}
        _navigate={navigate}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(1100);
    });

    expect(navigate).toHaveBeenCalledWith(AUTH_ERROR_PATH);
  });

  it("navigates to auth error path when sign out is clicked", () => {
    const navigate = jest.fn();
    render(
      <AutoSignoutIntegrated
        sessionDurationSec={60}
        authErrorPath={AUTH_ERROR_PATH}
        _navigate={navigate}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(1100);
    });

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(navigate).toHaveBeenCalledWith(AUTH_ERROR_PATH);
  });
});

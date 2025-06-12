import { act, fireEvent, render, screen } from "@testing-library/react";
import { signOut, useSession } from "next-auth/react";

import { AutoSignout } from "@/app/components/AutoSignout";

jest.mock("next-auth/react");

describe("AutoSignout", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("updates session on activity", () => {
    const updateMock = jest.fn();
    (useSession as jest.Mock).mockReturnValue({
      update: updateMock,
      data: {
        expires: new Date(Date.now() + 300000).toISOString(),
      },
    });

    render(
      <div>
        <button>click me</button>
        <AutoSignout />
      </div>,
    );

    // outside of warning period
    expect(screen.getByRole("dialog")).toHaveClass("is-hidden");

    expect(updateMock).not.toHaveBeenCalled();

    const button = screen.getByRole("button", { name: "click me" });
    fireEvent.click(button);

    act(() => {
      jest.advanceTimersByTime(1100);
    });

    expect(updateMock).toHaveBeenCalledOnce();

    fireEvent.click(button);

    act(() => {
      jest.advanceTimersByTime(1100);
    });
    expect(updateMock).toHaveBeenCalledOnce();
  });

  it("shows warning when no activity and expiration approaching", () => {
    const updateMock = jest.fn();
    (useSession as jest.Mock).mockReturnValue({
      update: updateMock,
      data: {
        expires: new Date(Date.now() + 30000).toISOString(),
      },
    });

    render(
      <div>
        <button>click me</button>
        <AutoSignout />
      </div>,
    );

    // outside of warning period
    expect(screen.getByRole("dialog")).toHaveClass("is-visible");

    // extend the session
    const button = screen.getByRole("button", { name: "Extend session" });
    fireEvent.click(button);

    expect(screen.getByRole("dialog")).toHaveClass("is-hidden");
    act(() => {
      jest.advanceTimersByTime(1100);
    });
    expect(updateMock).toHaveBeenCalledOnce();
  });

  it("force signs out user when session expires", () => {
    (useSession as jest.Mock).mockReturnValue({
      update: jest.fn(),
      data: {
        expires: new Date(Date.now() - 30).toISOString(),
      },
    });

    render(
      <div>
        <button>click me</button>
        <AutoSignout />
      </div>,
    );

    expect(signOut).toHaveBeenCalledOnce();
  });
});

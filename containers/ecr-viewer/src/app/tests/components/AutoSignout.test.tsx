import { act, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSession } from "next-auth/react";

import { AutoSignout } from "@/app/components/AutoSignout";

jest.mock("next-auth/react");

describe("AutoSignout", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });
  it("updates session on activity", async () => {
    const updateMock = jest.fn();
    (useSession as jest.Mock).mockReturnValue({
      update: updateMock,
      data: {
        expires: new Date(Date.now() + 3000).toISOString(),
      },
    });

    const { container } = render(<AutoSignout />);

    expect(updateMock).not.toHaveBeenCalled();

    const user = userEvent.setup();
    await user.click(container);

    act(() => {
      jest.advanceTimersByTime(1100);
    });

    expect(updateMock).toHaveBeenCalledOnce();

    // click again, shouldn't trigger update due to delay
    await user.click(container);

    act(() => {
      jest.advanceTimersByTime(1100);
    });
    expect(updateMock).toHaveBeenCalledOnce();
  });

  it("shows warning when no activity and expiration approaching", () => {});

  it("force signs out user when session expires", () => {});
});

import { useContext } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";

import ToastProvider, {
  ToastContext,
} from "@/app/components/toast/ToastProvider";
import ToastShelf from "@/app/components/toast/ToastShelf";

const ToastButton = () => {
  const { createToast } = useContext(ToastContext);

  return (
    <button type="button" onClick={() => createToast("I am toast", "success")}>
      Make toast
    </button>
  );
};

describe("Toasts", () => {
  it("should render a toast that dismisses with esc", async () => {
    render(
      <ToastProvider>
        <div>
          <ToastShelf />
          <ToastButton />
        </div>
      </ToastProvider>,
    );

    expect(screen.queryByText("I am toast")).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Make toast" }));

    expect(screen.getByText("I am toast")).toBeVisible();
    await user.keyboard("[Escape]");

    expect(screen.queryByText("I am toast")).not.toBeInTheDocument();
  });

  it("should render a toast that dismisses with timeout", async () => {
    render(
      <ToastProvider>
        <div>
          <ToastShelf timeout={0.2} />
          <ToastButton />
        </div>
      </ToastProvider>,
    );

    expect(screen.queryByText("I am toast")).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Make toast" }));

    expect(screen.getByText("I am toast")).toBeVisible();

    await waitFor(() =>
      expect(screen.queryByText("I am toast")).not.toBeInTheDocument(),
    );
  });

  it("should be accessible", async () => {
    const { container } = render(
      <ToastProvider>
        <div>
          <ToastShelf />
          <ToastButton />
        </div>
      </ToastProvider>,
    );

    expect(screen.queryByText("I am toast")).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Make toast" }));

    expect(screen.getByText("I am toast")).toBeVisible();

    expect(await axe(container)).toHaveNoViolations();
  });
});

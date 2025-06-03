import React from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { useRouter } from "next/navigation";

import {
  DetailsSidePanel,
  DetailsTrigger,
  useDetailsRef,
} from "@/app/components/DetailsSidePanel";

let clicked = false;
const SidePanel = (
  props: Omit<
    React.ComponentProps<typeof DetailsSidePanel>,
    "detailsRef" | "title" | "subtitle" | "itemType" | "details"
  >,
) => {
  const detailsRef = useDetailsRef();

  return (
    <div>
      <DetailsTrigger
        detailsRef={detailsRef}
        onClick={() => {
          clicked = true;
        }}
      >
        Click me
      </DetailsTrigger>
      <DetailsSidePanel
        detailsRef={detailsRef}
        title="Title"
        subtitle="Subtitle"
        itemType="item"
        details={[{ title: "detail 1", value: <p>Hi there</p> }]}
        {...props}
      />
      ,
    </div>
  );
};

describe("DetailsSidePanel", () => {
  it("renders details side panel", async () => {
    const mockReload = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      refresh: mockReload,
    });

    const { unmount } = render(<SidePanel />);
    expect(screen.getByRole("dialog")).not.toHaveClass("is-visible");

    const firstTrigger = screen.getByRole("button", { name: "Click me" });
    expect(firstTrigger).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(firstTrigger);

    expect(clicked).toBeTrue();
    expect(screen.getByRole("dialog")).toHaveClass("is-visible");

    expect(document.querySelector("body")).toMatchSnapshot();

    expect(await axe(document.querySelector("body")!)).toHaveNoViolations();

    const close = screen.getByRole("button", { name: "Close this window" });
    expect(close).toHaveFocus();
    await user.click(close);

    expect(screen.getByRole("dialog")).not.toHaveClass("is-visible");
    expect(firstTrigger).toHaveFocus();
    expect(document.querySelector("body")).not.toHaveAttribute(
      "data-modal-count",
    );

    // clean up before next test
    unmount();

    // Kludge: Forcing OOB since these both mess with the body
    // It should render with delete footer
    let deleted = false;
    render(
      <SidePanel
        deleteAction={async () => {
          deleted = true;
          return {};
        }}
        deleteExplainerText="I will really be deleted"
        deleteModalTitle="Delete me?"
        deleteModalBody={
          <>
            <p>Really?</p>
            <p>Me?</p>
          </>
        }
      />,
    );
    screen
      .queryAllByRole("dialog")
      .forEach((d) => expect(d).not.toHaveClass("is-visible"));

    const secondTrigger = screen.getByRole("button", { name: "Click me" });
    expect(secondTrigger).toBeInTheDocument();

    await user.click(secondTrigger);

    // first modal open
    expect(screen.getByRole("dialog")).toHaveClass("is-visible");
    expect(document.querySelector("body")).toMatchSnapshot();
    expect(await axe(document.querySelector("body")!)).toHaveNoViolations();

    // Open delete confirmation modal
    const deleteButton = screen.getByRole("button", { name: "Delete item" });
    await user.click(deleteButton);

    const modals = screen.queryAllByRole("dialog", { hidden: true });
    // both visually visible, but only top one is semantically visible
    modals.forEach((d) => expect(d).toHaveClass("is-visible"));
    expect(modals[0]).toHaveAttribute("aria-hidden");
    expect(modals[0]).toHaveAttribute("data-modal-hidden", "1");
    expect(modals[1]).not.toHaveAttribute("aria-hidden");
    // body now has two modals
    expect(document.querySelector("body")).toHaveAttribute(
      "data-modal-count",
      "2",
    );
    expect(document.querySelector("body")).toMatchSnapshot();
    expect(await axe(document.querySelector("body")!)).toHaveNoViolations();

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancelButton);
    // only first visually and semantically visible
    expect(modals[0]).toHaveClass("is-visible");
    expect(modals[1]).toHaveClass("is-hidden");
    expect(modals[0]).not.toHaveAttribute("aria-hidden");
    expect(modals[0]).not.toHaveAttribute("data-modal-hidden");
    // body now has one modals
    expect(document.querySelector("body")).toHaveAttribute(
      "data-modal-count",
      "1",
    );
    expect(document.querySelector("body")).toMatchSnapshot();
    expect(await axe(document.querySelector("body")!)).toHaveNoViolations();

    // Re-Open delete confirmation modal
    await user.click(deleteButton);
    // both visually visible, but only top one is semantically visible
    modals.forEach((d) => expect(d).toHaveClass("is-visible"));
    expect(modals[0]).toHaveAttribute("aria-hidden");
    expect(modals[0]).toHaveAttribute("data-modal-hidden", "1");
    expect(modals[1]).not.toHaveAttribute("aria-hidden");
    // body now has two modals
    expect(document.querySelector("body")).toHaveAttribute(
      "data-modal-count",
      "2",
    );
    expect(document.querySelector("body")).toMatchSnapshot();
    expect(await axe(document.querySelector("body")!)).toHaveNoViolations();

    const confirmButton = screen.getByRole("button", {
      name: "Yes, delete item",
    });
    await user.click(confirmButton);

    // Both closed
    modals.forEach((d) => expect(d).toHaveClass("is-hidden"));
    expect(deleted).toBeTrue();
    expect(document.querySelector("body")).not.toHaveAttribute(
      "data-modal-count",
    );
    expect(mockReload).toHaveBeenCalledOnce();

    modals.forEach((d) => expect(d).not.toHaveClass("is-visible"));
    expect(secondTrigger).toHaveFocus();
  });
});

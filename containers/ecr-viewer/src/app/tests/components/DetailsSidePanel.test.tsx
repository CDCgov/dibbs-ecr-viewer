import React from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";

import {
  DetailsSidePanel,
  DetailsTrigger,
  useDetailsRef,
} from "@/app/components/DetailsSidePanel";

let clicked = false;
const SidePanel = () => {
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
        description="Side panel details"
        details={[{ title: "detail 1", value: <p>Hi there</p> }]}
      />
      ,
    </div>
  );
};

describe("DetailsSidePanel", () => {
  it("renders details side panel", async () => {
    render(<SidePanel />);
    expect(screen.getByRole("dialog")).not.toHaveClass("is-visible");

    const trigger = screen.getByRole("button", { name: "Click me" });
    expect(trigger).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(trigger);

    expect(clicked).toBeTrue();
    expect(screen.getByRole("dialog")).toHaveClass("is-visible");

    expect(document.querySelector("body")).toMatchSnapshot();

    expect(await axe(document.querySelector("body")!)).toHaveNoViolations();

    const close = screen.getByRole("button", { name: "Close this window" });
    expect(close).toHaveFocus();
    await user.click(close);

    expect(screen.getByRole("dialog")).not.toHaveClass("is-visible");
    expect(trigger).toHaveFocus();
  });
});

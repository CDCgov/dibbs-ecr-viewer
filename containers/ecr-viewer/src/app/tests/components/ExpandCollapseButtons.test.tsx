import { ExpandCollapseButtons } from "@/app/view-data/components/ExpandCollapseButtons";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("expand collapse buttons", () => {
  it("should trigger expansion correctly", async () => {
    const user = userEvent.setup();

    let status = "";

    render(
      <ExpandCollapseButtons
        descriptor={"sections"}
        expandHandler={() => {
          status = "expanded";
        }}
        collapseHandler={() => {
          status = "collapsed";
        }}
      />,
    );

    await user.click(screen.getByText("Expand all sections"));

    expect(status).toEqual("expanded");
  });
  it("should have aria expand false and hidden when collapse button is clicked", async () => {
    const user = userEvent.setup();

    let status = "";

    render(
      <ExpandCollapseButtons
        descriptor={"sections"}
        expandHandler={() => {
          status = "expanded";
        }}
        collapseHandler={() => {
          status = "collapsed";
        }}
      />,
    );

    await user.click(screen.getByText("Collapse all sections"));

    expect(status).toBe("collapsed");
  });
});

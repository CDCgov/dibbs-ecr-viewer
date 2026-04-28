import { render, screen, act } from "@testing-library/react";
import { AccordionItem } from "@/app/components/AccordionControlled";

describe("AccordionItem tests", () => {
  const defaultProps = {
    id: "test-item",
    title: "Test Section",
    content: <h4>Demographics</h4>,
    expanded: false,
    headingLevel: "h3" as const,
    handleToggle: jest.fn(),
    shouldRenderBeforeExpand: false,
  };

  it("should not render content before first expand", async () => {
    render(<AccordionItem {...defaultProps} />);

    await act(async () => {});

    expect(screen.queryByText("Demographics")).not.toBeInTheDocument();
  });

  it("should render content after first expand", () => {
    const { rerender } = render(<AccordionItem {...defaultProps} />);

    rerender(<AccordionItem {...defaultProps} expanded={true} />);

    expect(
      screen.getByRole("heading", { name: "Demographics" }),
    ).toBeInTheDocument();
  });

  it("should keep content in DOM after collapsing", () => {
    const { rerender } = render(<AccordionItem {...defaultProps} />);

    // Expand
    rerender(<AccordionItem {...defaultProps} expanded={true} />);
    expect(screen.getByText("Demographics")).toBeInTheDocument();

    // Collapse - content stays in DOM but is hidden
    rerender(<AccordionItem {...defaultProps} expanded={false} />);
    expect(screen.getByText("Demographics")).toBeInTheDocument();
  });

  it("should render content immediately when shouldRenderBeforeExpand=true", async () => {
    render(<AccordionItem {...defaultProps} shouldRenderBeforeExpand={true} />);

    // Wait for isMounted useEffect to fire
    await act(async () => {});

    expect(screen.getByText("Demographics")).toBeInTheDocument();
  });
});

import { JsonTable } from "@/app/view-data/components/JsonTable";
import { render, screen } from "@testing-library/react";

describe("returnTableFromJson", () => {
  it("returns an HTML representation of the table", () => {
    const tableJson = {
      resultName: "test-name",
      tables: [
        [
          {
            col1: { value: "val1", metadata: {} },
            col2: { value: "val2", metadata: {} },
          },
        ],
      ],
    };

    render(<JsonTable jsonTableData={tableJson} />);
    expect(screen.getByText("test-name")).toBeInTheDocument();
    expect(screen.getByText("col1")).toBeInTheDocument();
    expect(screen.getByText("col2")).toBeInTheDocument();
    expect(screen.getByText("val1")).toBeInTheDocument();
    expect(screen.getByText("val2")).toBeInTheDocument();
  });

  it("returns nothing when provided a name but no table data", () => {
    const tableJson = {
      resultName: "test-name",
      tables: [[]],
    };
    const { container } = render(<JsonTable jsonTableData={tableJson} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("returns nothing if required table data is not available", () => {
    const { container } = render(<JsonTable jsonTableData={{}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

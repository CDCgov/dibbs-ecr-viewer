import React from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PaginationBar from "@/app/components/pagination/PaginationBar";

const mockSearchParams = new URLSearchParams();
jest.mock("next/navigation", () => {
  return {
    useSearchParams: () => mockSearchParams,
  };
});

describe("PaginationBar component", () => {
  it("renders pagination bar", async () => {
    let itemsPerPage = 3;
    render(
      <PaginationBar
        itemType="Items"
        totalCount={9}
        currentPage={2}
        itemsPerPage={itemsPerPage}
        onItemsPerPageHandler={(v) => {
          itemsPerPage = Number(v);
        }}
        pathname=""
      />,
    );

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByLabelText("Previous page")).toHaveAttribute(
      "href",
      `?page=1`,
    );

    expect(screen.getByText("Showing 4-6 of 9 items")).toBeInTheDocument();

    expect(screen.getByRole("combobox", { name: "Items per page" }));

    expect(screen.getByRole("option", { name: "3", selected: true }));

    const user = userEvent.setup();
    const itemsPerPageSelect = screen.getByRole("combobox", {
      name: "Items per page",
    });
    await user.selectOptions(itemsPerPageSelect, "10");
    expect(itemsPerPage).toBe(10);
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  PaginatedSortableTable,
  TableColumn,
} from "@/app/components/table/PaginatedSortableTable";
import { formatDate } from "@/app/services/formatDateService";

jest.mock("../../../constants", () => ({
  PAGE_SIZES: [2, 5],
}));

describe("PaginatedSoratableTable", () => {
  const items = [
    {
      uuid: "123",
      one: "one",
      two: 5,
      three: new Date("2012-01-01"),
      four: [1, 2, 3],
    },
    {
      uuid: "223",
      one: "two",
      two: 4,
      three: new Date("2013-04-01"),
      four: [1, 2, 3],
    },
    {
      uuid: "323",
      one: "three",
      two: 1,
      three: null,
      four: null,
    },
    {
      uuid: "423",
      one: "four",
      three: new Date("2012-04-01"),
      four: [3, 4],
    },
  ];

  const headers: TableColumn<(typeof items)[0]>[] = [
    {
      id: "one",
      value: "Column One",
      className: "i-am-a-class",
      dataSortable: true,
      sortDirection: "ASC",
    },
    {
      id: "three",
      value: "Column Three",
      dataSortable: true,
      sortDirection: "",
      formatter: (val) => formatDate(val?.toISOString()),
    },
    {
      id: "four",
      value: "Column Four",
      dataSortable: false,
      sortDirection: "",
      formatter: (val, item) =>
        !!item.two ? val?.join(", ") : val?.join(" - "),
    },
  ];

  it("matches snapshot", () => {
    const { container } = render(
      <PaginatedSortableTable
        initHeaders={headers}
        items={items}
        itemType="items"
      />,
    );
    expect(container).toMatchSnapshot();
  });

  it("sorts items", async () => {
    render(
      <PaginatedSortableTable
        initHeaders={headers}
        items={items}
        itemType="items"
      />,
    );

    // 1 header + 2 data
    expect(screen.getAllByRole("row")).toBeArrayOfSize(3);

    const user = userEvent.setup();

    // starts sorted by column one
    expect(
      screen.getByRole("columnheader", { name: "Column One" }),
    ).toHaveAttribute("aria-sort", "ascending");
    expect(
      screen.getByRole("columnheader", { name: "Column Three" }),
    ).not.toHaveAttribute("aria-sort");
    expect(
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.firstChild?.textContent),
    ).toStrictEqual(["four", "one"]);

    // reverse column one sort
    await user.click(screen.getByRole("button", { name: "Column One" }));

    expect(
      screen.getByRole("columnheader", { name: "Column One" }),
    ).toHaveAttribute("aria-sort", "descending");
    expect(
      screen.getByRole("columnheader", { name: "Column Three" }),
    ).not.toHaveAttribute("aria-sort");
    expect(
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.firstChild?.textContent),
    ).toStrictEqual(["two", "three"]);

    // sort by column three ascending
    await user.click(screen.getByRole("button", { name: "Column Three" }));

    expect(
      screen.getByRole("columnheader", { name: "Column One" }),
    ).not.toHaveAttribute("aria-sort");
    expect(
      screen.getByRole("columnheader", { name: "Column Three" }),
    ).toHaveAttribute("aria-sort", "ascending");

    expect(
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.firstChild?.textContent),
    ).toStrictEqual(["three", "one"]);
  });

  it("paginates items", async () => {
    render(
      <PaginatedSortableTable
        initHeaders={headers}
        items={items}
        itemType="items"
      />,
    );

    // 1 header + 2 data
    expect(screen.getAllByRole("row")).toBeArrayOfSize(3);
    expect(
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.firstChild?.textContent),
    ).toStrictEqual(["four", "one"]);

    const user = userEvent.setup();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "items per page" }),
      "5",
    );

    // 1 header + 4 data
    expect(screen.getAllByRole("row")).toBeArrayOfSize(5);
    expect(
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.firstChild?.textContent),
    ).toStrictEqual(["four", "one", "three", "two"]);
  });
});

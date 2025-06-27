import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";

import SortableHeader, {
  TableHeader,
} from "@/app/components/table/SortableHeader";

const INITIAL_HEADERS: TableHeader[] = [
  {
    id: "column-one",
    value: "Column One",
    className: "i-am-a-class",
    dataSortable: true,
    sortDirection: "ASC",
  },
  {
    id: "column-two",
    value: "Column Two",
    dataSortable: true,
    sortDirection: "",
  },
  {
    id: "column-three",
    value: "Column Three",
    dataSortable: false,
    sortDirection: "",
  },
];

describe("SortableHeader", () => {
  describe("enabled", () => {
    it("should match snapshot", async () => {
      const table = document.createElement("table");
      const { container } = render(
        <SortableHeader
          headers={INITIAL_HEADERS}
          disabled={false}
          handleSort={() => {}}
        />,
        {
          container: document.body.appendChild(table),
        },
      );
      expect(container).toMatchSnapshot();
    });

    it("should pass accessibility", async () => {
      const table = document.createElement("table");
      const { container } = render(
        <SortableHeader
          headers={INITIAL_HEADERS}
          disabled={false}
          handleSort={() => {}}
        />,
        {
          container: document.body.appendChild(table),
        },
      );
      await act(async () => {
        expect(await axe(container)).toHaveNoViolations();
      });
    });

    it("should sort things", async () => {
      const table = document.createElement("table");
      const sortClicked: { columnId: string; direction: string }[] = [];
      render(
        <SortableHeader
          headers={INITIAL_HEADERS}
          disabled={false}
          handleSort={(columnId, direction) => {
            sortClicked.push({ columnId, direction });
          }}
        />,
        {
          container: document.body.appendChild(table),
        },
      );

      expect(
        screen.getByRole("columnheader", { name: "Column One" }),
      ).toHaveAttribute("aria-sort", "ascending");
      expect(
        screen.getByRole("columnheader", { name: "Column Two" }),
      ).not.toHaveAttribute("aria-sort");

      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: "Column One" }));
      await user.click(screen.getByRole("button", { name: "Column Two" }));
      expect(
        screen.queryByRole("button", { name: "Column 3" }),
      ).not.toBeInTheDocument();

      expect(sortClicked).toStrictEqual([
        { columnId: "column-one", direction: "DESC" },
        { columnId: "column-two", direction: "ASC" },
      ]);
    });
  });

  describe("disabled", () => {
    it("should match snapshot", async () => {
      const table = document.createElement("table");
      const { container } = render(
        <SortableHeader
          headers={INITIAL_HEADERS}
          disabled={true}
          handleSort={() => {}}
        />,
        {
          container: document.body.appendChild(table),
        },
      );
      expect(container).toMatchSnapshot();
    });

    it("should pass accessibility", async () => {
      const table = document.createElement("table");
      const { container } = render(
        <SortableHeader
          headers={INITIAL_HEADERS}
          disabled={true}
          handleSort={() => {}}
        />,
        {
          container: document.body.appendChild(table),
        },
      );
      await act(async () => {
        expect(await axe(container)).toHaveNoViolations();
      });
    });

    it("should not sort things", async () => {
      const table = document.createElement("table");
      const sortClicked: { columnId: string; direction: string }[] = [];
      render(
        <SortableHeader
          headers={INITIAL_HEADERS}
          disabled={true}
          handleSort={(columnId, direction) => {
            sortClicked.push({ columnId, direction });
          }}
        />,
        {
          container: document.body.appendChild(table),
        },
      );

      expect(
        screen.getByRole("columnheader", { name: "Column One" }),
      ).toHaveAttribute("aria-sort", "ascending");
      expect(
        screen.getByRole("columnheader", { name: "Column Two" }),
      ).not.toHaveAttribute("aria-sort");

      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: "Column One" }));
      await user.click(screen.getByRole("button", { name: "Column Two" }));
      expect(
        screen.queryByRole("button", { name: "Column 3" }),
      ).not.toBeInTheDocument();

      expect(sortClicked).toStrictEqual([]);
    });
  });
});

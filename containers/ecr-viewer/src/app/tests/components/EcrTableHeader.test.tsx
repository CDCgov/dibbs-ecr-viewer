import { act, render } from "@testing-library/react";
import { axe } from "jest-axe";
import router from "next-router-mock";

import EcrTableHeader from "@/app/components/EcrTableHeader";
import { INITIAL_HEADERS } from "@/app/constants";

jest.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => router.pathname,
  useSearchParams: () => new URLSearchParams(router.asPath.split("?")[1] || ""),
}));

describe("EcrTableHeader", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    router.setCurrentUrl(
      "/?itemsPerPage=25&columnId=report_date&direction=ASC&page=1",
    );
  });

  describe("enabled", () => {
    it("should match snapshot", async () => {
      const table = document.createElement("table");
      const { container } = render(
        <EcrTableHeader headers={INITIAL_HEADERS} disabled={false} />,
        {
          container: document.body.appendChild(table),
        },
      );
      expect(container).toMatchSnapshot();
    });

    it("should pass accessibility", async () => {
      const table = document.createElement("table");
      const { container } = render(
        <EcrTableHeader headers={INITIAL_HEADERS} disabled={false} />,
        {
          container: document.body.appendChild(table),
        },
      );
      await act(async () => {
        expect(await axe(container)).toHaveNoViolations();
      });
    });
  });

  describe("disabled", () => {
    it("should match snapshot", async () => {
      const table = document.createElement("table");
      const { container } = render(
        <EcrTableHeader headers={INITIAL_HEADERS} disabled={true} />,
        {
          container: document.body.appendChild(table),
        },
      );
      expect(container).toMatchSnapshot();
    });

    it("should pass accessibility", async () => {
      const table = document.createElement("table");
      const { container } = render(
        <EcrTableHeader headers={INITIAL_HEADERS} disabled={true} />,
        {
          container: document.body.appendChild(table),
        },
      );
      await act(async () => {
        expect(await axe(container)).toHaveNoViolations();
      });
    });
  });
});

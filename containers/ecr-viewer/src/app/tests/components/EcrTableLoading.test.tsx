import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import router from "next-router-mock";

import { EcrTableLoading } from "@/app/components/EcrTableLoading";

jest.mock("../../services/listEcrDataService");

jest.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => router.pathname,
  useSearchParams: () => new URLSearchParams(router.asPath.split("?")[1] || ""),
}));

describe("EcrTableLoading", () => {
  describe("Snapshot test", () => {
    let container: HTMLElement;

    beforeAll(() => {
      const mockIntersectionObserver = jest.fn();
      mockIntersectionObserver.mockReturnValue({
        observe: () => null,
        unobserve: () => null,
        disconnect: () => null,
      });
      window.IntersectionObserver = mockIntersectionObserver;

      container = render(<EcrTableLoading />).container;
    });
    it("should match snapshot", () => {
      expect(container).toMatchSnapshot();
    });
    it("should pass accessibility test", async () => {
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

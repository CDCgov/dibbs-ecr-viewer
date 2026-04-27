import { act, render, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";

import SideNav, { SectionConfig } from "@/app/view-data/components/SideNav";
import { EcrDocumentNavConfig } from "@/app/view-data/components/EcrDocument/accordion-items";

jest.mock("@/app/components/AuthSessionProvider", () => ({
  useIsLoggedInUser: () => true,
}));
jest.mock("next/navigation", () => ({
  usePathname: jest.fn().mockReturnValue("/view-data"),
}));

describe("SectionConfig", () => {
  beforeEach(() => {
    // IntersectionObserver isn't available in test environment
    const mockIntersectionObserver = jest.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: () => null,
      unobserve: () => null,
      disconnect: () => null,
    });
    window.IntersectionObserver = mockIntersectionObserver;
  });

  it("should create an instance with correct title and id", () => {
    const section = new SectionConfig("Test Section");
    expect(section.title).toBe("Test Section");
    expect(section.id).toBe("test-section");
  });

  it("should handle subNavItems as strings and convert them to SectionConfig instances", () => {
    const section = new SectionConfig("Parent Section", ["Child Section"]);
    expect(section.subNavItems?.length).toBe(1);
    expect(section.subNavItems?.[0] instanceof SectionConfig).toBeTruthy();
    expect(section.subNavItems?.[0]?.title).toBe("Child Section");
  });

  it("should handle subNavItems as SectionConfig instances", () => {
    const childSection = new SectionConfig("Child Section");
    const section = new SectionConfig("Parent Section", [childSection]);
    expect(section.subNavItems?.length).toBe(1);
    expect(section.subNavItems?.[0]).toBe(childSection);
  });

  it("should match the snapshot", () => {
    const ecrDocumentNavConfig: EcrDocumentNavConfig[] = [
      { title: "Section 1", subNavItems: [] },
      { title: "Section 2", subNavItems: ["Section 3"] },
      { title: "Section 2 - 2", subNavItems: [] },
    ];
    const { asFragment } = render(
      <main>
        <SideNav ecrDocumentNavConfig={ecrDocumentNavConfig} />
      </main>,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it("should have no accessibility violations", async () => {
    const { container } = render(<SideNav ecrDocumentNavConfig={[]} />);
    let results;
    await act(async () => {
      results = await axe(container);
    });
    expect(results).toHaveNoViolations();
  });

  it("should render side nav items on page", async () => {
    const ecrDocumentNavConfig: EcrDocumentNavConfig[] = [
      { title: "Section 1", subNavItems: [] },
      { title: "Section 2", subNavItems: ["Section 3"] }
    ];
    const { container } = render(
      <main>
        <SideNav ecrDocumentNavConfig={ecrDocumentNavConfig} />
      </main>
    );
    expect(container.innerHTML).toContain(
      '<a href="#section-1" class="" data-testid="sidenav-link">',
    );
    expect(container.innerHTML).toContain(
      '<a href="#section-2" class="" data-testid="sidenav-link">',
    );
    expect(container.innerHTML).toContain(
      '<a href="#section-3" class="" data-testid="sidenav-link">'
    );
  });

  it("should set the active class on the section currently in view", async () => {
    let intersectionCallback: IntersectionObserverCallback;

    window.IntersectionObserver = jest.fn().mockImplementation((callback) => {
      intersectionCallback = callback;
      return {
        observe: jest.fn(),
        disconnect: jest.fn(),
        unobserve: jest.fn(),
      };
    });

    const ecrDocumentNavConfig: EcrDocumentNavConfig[] = [
      { title: "Section 1", subNavItems: [] },
      { title: "Section 2", subNavItems: [] },
    ];
    const { container } = render(
      <main>
        <SideNav ecrDocumentNavConfig={ecrDocumentNavConfig} />
      </main>
    );

    // Put Section 1 in view
    const section1Heading = document.createElement("h3");
    section1Heading.setAttribute("data-sectionid", "section-1");

    act(() => {
      intersectionCallback(
        [
          { isIntersecting: true, target: section1Heading },
        ] as unknown as IntersectionObserverEntry[],
        {} as IntersectionObserver
      );
    });

    await waitFor(() => {
      expect(container.querySelector('a[href="#section-1"]')).toHaveClass(
        "usa-current"
      );
      expect(container.querySelector('a[href="#section-2"]')).not.toHaveClass(
        "usa-current"
      );
    });

    // Scroll to Section 2
    const section2Heading = document.createElement("h3");
    section2Heading.setAttribute("data-sectionid", "section-2");

    act(() => {
      intersectionCallback(
        [
          { isIntersecting: true, target: section2Heading },
        ] as unknown as IntersectionObserverEntry[],
        {} as IntersectionObserver
      );
    });

    await waitFor(() => {
      expect(container.querySelector('a[href="#section-1"]')).not.toHaveClass(
        "usa-current"
      );
      expect(container.querySelector('a[href="#section-2"]')).toHaveClass(
        "usa-current"
      );
    });
  });
});
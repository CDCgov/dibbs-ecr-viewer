import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import EcrPaginationWrapper from "@/app/components/EcrPaginationWrapper";
import userEvent, { UserEvent } from "@testing-library/user-event";

const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();
jest.mock("next/navigation", () => {
  return {
    useRouter: () => ({
      push: mockPush,
    }),
    useSearchParams: () => mockSearchParams,
    usePathname: () => "",
  };
});

const mockSetter = jest.fn();
jest.mock("js-cookie", () => ({
  set: (...a: any) => mockSetter(...a),
}));

describe("EcrPaginationWrapper", () => {
  let container: HTMLElement;
  beforeAll(() => {
    container = render(
      <EcrPaginationWrapper totalCount={100} itemsPerPage={25} currentPage={1}>
        <br />
      </EcrPaginationWrapper>,
    ).container;
  });
  it("should match snapshot", () => {
    expect(container).toMatchSnapshot();
  });
  it("should pass accessibility test", async () => {
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("Pagination for EcrPaginationWrapper", () => {
  let user: UserEvent;

  beforeEach(() => {
    user = userEvent.setup();
    jest.resetAllMocks();
    mockSearchParams.delete("page");
  });

  it("should have 4 pages when there are 100 and default page length is used", async () => {
    render(
      <EcrPaginationWrapper totalCount={100} itemsPerPage={25} currentPage={1}>
        <br />
      </EcrPaginationWrapper>,
    );

    expect(screen.getByText("1"));
    expect(screen.getByText("2"));
    expect(screen.getByText("3"));
    expect(screen.getByText("4"));
    expect(screen.queryByText("5")).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1-25 of 100 eCRs"));
  });

  it("should display 50 per page when items per page is set to 50", async () => {
    render(
      <EcrPaginationWrapper totalCount={100} itemsPerPage={50} currentPage={1}>
        <br />
      </EcrPaginationWrapper>,
    );
    await user.selectOptions(screen.getByTestId("Select"), ["50"]);

    expect(screen.getByText("1"));
    expect(screen.getByText("2"));
    expect(screen.getByText("Showing 1-50 of 100 eCRs"));
    expect(mockSetter).toHaveBeenLastCalledWith("itemsPerPage", "50", {
      expires: 1000,
    });
  });

  it("should display 51-51 on third page", async () => {
    render(
      <EcrPaginationWrapper totalCount={51} itemsPerPage={25} currentPage={3}>
        <br />
      </EcrPaginationWrapper>,
    );

    expect(screen.getByText("Showing 51-51 of 51 eCRs")).toBeInTheDocument();
  });

  it("should display 1 page when totalCount is 0", async () => {
    render(
      <EcrPaginationWrapper totalCount={0} itemsPerPage={25} currentPage={1}>
        <br />
      </EcrPaginationWrapper>,
    );

    expect(screen.getByText("1"));
    expect(screen.queryByText("2")).not.toBeInTheDocument();
  });

  it("should display 0-0 when totalCount is 0", async () => {
    render(
      <EcrPaginationWrapper totalCount={0} itemsPerPage={25} currentPage={1}>
        <br />
      </EcrPaginationWrapper>,
    );

    expect(screen.getByText("Showing 0-0 of 0 eCRs")).toBeInTheDocument();
  });

  it("the dropdown should only have 25, 50, 75, and 100 as options", async () => {
    render(
      <EcrPaginationWrapper totalCount={0} itemsPerPage={25} currentPage={1}>
        <br />
      </EcrPaginationWrapper>,
    );

    const select = screen.getByTestId("Select");
    expect(select.children).toHaveLength(4);
    expect(select.children[0]).toHaveTextContent("25");
    expect(select.children[1]).toHaveTextContent("50");
    expect(select.children[2]).toHaveTextContent("75");
    expect(select.children[3]).toHaveTextContent("100");
  });
});

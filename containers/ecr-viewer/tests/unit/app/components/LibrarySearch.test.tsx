import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import LibrarySearch from "@/app/components/LibrarySearch";

const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams();
jest.mock("next/navigation", () => {
  return {
    useRouter: () => ({
      push: mockPush,
    }),
    useSearchParams: () => mockSearchParams,
    usePathname: () => "",
  };
});

describe("Library Search", () => {
  afterEach(() => {
    mockSearchParams = new URLSearchParams();
    jest.clearAllMocks();
  });

  it("should match snapshot", () => {
    const { container } = render(
      <LibrarySearch
        className="className"
        textBoxClassName="textBoxClassName"
      />,
    );

    expect(container).toMatchSnapshot();
  });

  it("should put search term in search params", async () => {
    const user = userEvent.setup();
    render(<LibrarySearch />);
    const searchBox = screen.getByRole("searchbox");
    const searchButton = screen.getByRole("button");

    await user.type(searchBox, "Em");
    await user.click(searchButton);

    expect(mockPush).toHaveBeenCalledExactlyOnceWith("?search=Em");
  });

  it("should put set the page back to 1 after a new term is set", async () => {
    const user = userEvent.setup();
    mockSearchParams.append("page", "4");

    render(<LibrarySearch />);
    const searchBox = screen.getByRole("searchbox");
    const searchButton = screen.getByRole("button");

    await user.type(searchBox, "Em");
    await user.click(searchButton);

    expect(mockPush).toHaveBeenCalledExactlyOnceWith("?search=Em");
  });

  it("should keep the page back if the same term is searched", async () => {
    const user = userEvent.setup();
    mockSearchParams.append("page", "4");
    mockSearchParams.append("search", "Em");

    render(<LibrarySearch initSearchTerm="Em" />);
    const searchBox = screen.getByRole("searchbox");
    const searchButton = screen.getByRole("button");

    await user.clear(searchBox);
    await user.type(searchBox, "Em");
    await user.click(searchButton);

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("should put the search term in the box if already in search params", async () => {
    render(<LibrarySearch initSearchTerm="blah" />);

    expect(screen.getByDisplayValue("blah")).toBeVisible();
  });
});

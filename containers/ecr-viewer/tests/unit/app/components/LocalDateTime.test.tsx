import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";

import {
  LocalDateTime,
  LocalRelatedDateTime,
} from "@/app/components/LocalDateTime";

describe("LocalDateTime", () => {
  it("shows loading message until hydration", () => {
    const element = <LocalDateTime value="2026-07-01T15:00:00Z" />;
    const html = renderToString(element);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Loading date and time");

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    render(element, { container, hydrate: true });
    expect(container.textContent).toBe("07/01/2026 11:00\u00a0AM\u00a0EDT");
    expect(container.querySelector("time")).toHaveAttribute(
      "datetime",
      "2026-07-01T15:00:00Z",
    );
    expect(container.querySelector("time")).toHaveAttribute(
      "aria-busy",
      "false",
    );
  });

  it("displays calendar dates, preserves text, and uses a dash for missing values", () => {
    const { container, rerender } = render(
      <LocalDateTime value="2026-07-01" />,
    );
    expect(container.textContent).toBe("07/01/2026");
    rerender(<LocalDateTime value="Unknown" />);
    expect(container.textContent).toBe("Unknown");
    rerender(<LocalDateTime />);
    expect(container.textContent).toBe("—");
  });
});

describe("LocalRelatedDateTime", () => {
  it("bolds related report times only when the local dates match", () => {
    const { container, rerender } = render(
      <LocalRelatedDateTime
        value="2026-07-02T02:00:00Z"
        mainValue="2026-07-01T20:00:00Z"
      />,
    );
    // These timestamps have different UTC dates but both fall on July 1 locally.
    expect(container.querySelector("strong")).toHaveTextContent("10:00 PM EDT");
    expect(container.textContent).toBe("10:00\u00a0PM\u00a0EDT 07/01/2026");
    rerender(
      <LocalRelatedDateTime
        value="2026-07-02T05:00:00Z"
        mainValue="2026-07-01T20:00:00Z"
      />,
    );
    expect(container.querySelector("strong")).toBeNull();
  });
});

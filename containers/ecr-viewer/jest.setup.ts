import "@testing-library/jest-dom";
import { TextEncoder } from "util";

import { toHaveNoViolations } from "jest-axe";
import * as matchers from "jest-extended";
import failOnConsole from "jest-fail-on-console";
import router from "next-router-mock";

import { clearEvaluateCache } from "./src/app/utils/evaluate";

global.TextEncoder = TextEncoder;

failOnConsole();

expect.extend(toHaveNoViolations);
expect.extend(matchers);

// Mocking `next/navigation` hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn().mockReturnValue(router),
  usePathname: jest.fn().mockReturnValue(router.pathname),
  useSearchParams: jest.fn().mockImplementation(() => {
    const params = new URLSearchParams(router.asPath.split("?")[1]);
    return {
      get: params.get.bind(params),
      toString: () => params.toString(),
    };
  }),
  notFound: jest.fn(),
}));

// Make sure the auto-generated IDs are stable for snapshot testing
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useId: () => "r:id",
  // Unclear why this doesn't work in tests
  // https://github.com/vercel/next.js/discussions/49304
  cache: <T>(fn: T): T => fn,
}));

// Mock tabable to avoid focus trap errors with modals
jest.mock("tabbable", () => {
  const lib = jest.requireActual("tabbable");
  return {
    ...lib,
    tabbable: (node: HTMLElement, options: object) =>
      lib.tabbable(node, { ...options, displayCheck: "none" }),
    focusable: (node: HTMLElement, options: object) =>
      lib.focusable(node, { ...options, displayCheck: "none" }),
    isFocusable: (node: HTMLElement, options: object) =>
      lib.isFocusable(node, { ...options, displayCheck: "none" }),
    isTabbable: (node: HTMLElement, options: object) =>
      lib.isTabbable(node, { ...options, displayCheck: "none" }),
  };
});

beforeEach(() => {
  clearEvaluateCache();
});

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
  useRouter: () => router,
  usePathname: () => router.pathname,
  useSearchParams: () => {
    const params = new URLSearchParams(router.asPath.split("?")[1]);
    return {
      get: params.get.bind(params),
      toString: () => params.toString(),
    };
  },
  notFound: jest.fn(),
}));

// Make sure the auto-generated IDs are stable for snapshot testing
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useId: () => "r:id",
}));

beforeEach(() => {
  clearEvaluateCache();
});

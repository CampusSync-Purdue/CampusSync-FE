import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmount anything rendered by a test so queries in the next test only ever
// see that test's own markup.
afterEach(() => {
  cleanup();
});

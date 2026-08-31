import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldPrepareMonth } from "./monthly-prep";

describe("shouldPrepareMonth", () => {
  it("prepares the current and future months", () => {
    assert.equal(shouldPrepareMonth("2026-08-01", "2026-08-01"), true);
    assert.equal(shouldPrepareMonth("2026-09-01", "2026-08-01"), true);
  });

  it("does not prepare previous months or invalid months", () => {
    assert.equal(shouldPrepareMonth("2026-07-01", "2026-08-01"), false);
    assert.equal(shouldPrepareMonth("2026-09-12", "2026-08-01"), false);
    assert.equal(shouldPrepareMonth("September 2026", "2026-08-01"), false);
  });
});

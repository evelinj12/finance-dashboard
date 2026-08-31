import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildChecklistCarryoverItems } from "./checklist-carryover";

describe("buildChecklistCarryoverItems", () => {
  it("carries checklist labels into a new month and resets completion", () => {
    assert.deepEqual(
      buildChecklistCarryoverItems("2026-09-01", [
        {
          title: "IPL Apartment",
          latest_date_note: "4 each month",
          sort_order: 10,
        },
      ]),
      [
        {
          month: "2026-09-01",
          title: "IPL Apartment",
          latest_date_note: "4 each month",
          completed: false,
          sort_order: 10,
        },
      ]
    );
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { durationInputHint, formatDecimalHours, formatHoursAsDuration, parseDurationInput } from "./duration";

describe("parseDurationInput", () => {
  it("treats a large bare integer as minutes", () => {
    assert.equal(parseDurationInput("110"), 1.8333);
    assert.equal(formatHoursAsDuration(parseDurationInput("110")), "01:50:00");
  });

  it("keeps small bare and decimal numbers as decimal hours", () => {
    assert.equal(parseDurationInput("2"), 2);
    assert.equal(parseDurationInput("1.5"), 1.5);
  });

  it("accepts hour-minute and hour-minute-second values", () => {
    assert.equal(parseDurationInput("1:50"), 1.8333);
    assert.equal(parseDurationInput("01:50:30"), 1.8417);
  });

  it("accepts explicit time units", () => {
    assert.equal(parseDurationInput("1h 30m"), 1.5);
    assert.equal(parseDurationInput("90m"), 1.5);
    assert.equal(parseDurationInput("45 minutes"), 0.75);
  });

  it("rejects invalid durations", () => {
    assert.equal(parseDurationInput("1:75"), null);
    assert.equal(parseDurationInput("-1"), null);
    assert.equal(parseDurationInput("soon"), null);
  });
});

describe("formatHoursAsDuration", () => {
  it("formats decimal hours as hh:mm:ss", () => {
    assert.equal(formatHoursAsDuration(1.5), "01:30:00");
    assert.equal(formatHoursAsDuration(25.25), "25:15:00");
    assert.equal(formatHoursAsDuration(-1.25), "-01:15:00");
  });

  it("formats the helper hint with decimal hours", () => {
    assert.equal(durationInputHint("110"), "01:50:00 | 1.83 decimal hours");
    assert.equal(formatDecimalHours(1.8333), "1.83");
  });
});

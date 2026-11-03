import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

// Verify dateUtils functions
import {
  toDhakaDateString,
  parseDhakaExamStartMs,
  isEligibleForReschedule,
  formatDhakaExamDate,
  formatExamTime,
  DHAKA_OFFSET_MS,
  MIN_RESCHEDULE_NOTICE_MS,
} from "../src/lib/dateUtils.ts";

test("R01-T01: date extraction preserves Dhaka calendar day for date-only and ISO strings", () => {
  assert.equal(toDhakaDateString("2026-11-07"), "2026-11-07");
  // UTC midnight on Nov 7 is 06:00 AM on Nov 7 in Dhaka
  assert.equal(toDhakaDateString("2026-11-07T00:00:00.000Z"), "2026-11-07");
  // 18:30 UTC on Nov 6 is 00:30 AM on Nov 7 in Dhaka
  assert.equal(toDhakaDateString("2026-11-06T18:30:00.000Z"), "2026-11-07");
  // Date object
  const d = new Date("2026-11-07T04:00:00.000Z");
  assert.equal(toDhakaDateString(d), "2026-11-07");
});

test("R01-T02: formatDhakaExamDate formats human-readable date consistently", () => {
  assert.equal(formatDhakaExamDate("2026-11-07"), "7 November, 2026");
  assert.equal(formatDhakaExamDate("2026-11-07T00:00:00.000Z"), "7 November, 2026");
  assert.equal(formatDhakaExamDate(""), "N/A");
  assert.equal(formatDhakaExamDate(null), "N/A");
});

test("R01-T03: formatExamTime formats 12-hour AM/PM string safely", () => {
  assert.equal(formatExamTime("10:00"), "10:00 AM");
  assert.equal(formatExamTime("14:30"), "2:30 PM");
  assert.equal(formatExamTime("00:15"), "12:15 AM");
  assert.equal(formatExamTime("12:00"), "12:00 PM");
  assert.equal(formatExamTime(""), "N/A");
  assert.equal(formatExamTime("invalid"), "Invalid Time");
});

test("R01-T04: parseDhakaExamStartMs computes exact UTC timestamp without NaN", () => {
  // Nov 7, 2026 10:00 AM Dhaka (UTC+6) is Date.UTC(2026, 10, 7, 4, 0, 0)
  const expectedUtcMs = Date.UTC(2026, 10, 7, 4, 0, 0);
  assert.equal(parseDhakaExamStartMs("2026-11-07", "10:00"), expectedUtcMs);
  assert.equal(parseDhakaExamStartMs("2026-11-07T00:00:00.000Z", "10:00"), expectedUtcMs);

  // Impossible calendar dates return null, never NaN
  assert.equal(parseDhakaExamStartMs("2027-02-30", "10:00"), null);
  assert.equal(parseDhakaExamStartMs("2026-11-07", "25:00"), null);
  assert.equal(parseDhakaExamStartMs("invalid", "10:00"), null);
  assert.equal(parseDhakaExamStartMs("2026-11-07", null), null);
});

test("R01-T05: deterministic 24-hour boundary check", () => {
  const testStartMs = parseDhakaExamStartMs("2026-11-07", "10:00");
  assert.ok(testStartMs !== null);

  // Exactly 24 hours notice (eligible)
  const exact24hNotice = testStartMs - MIN_RESCHEDULE_NOTICE_MS;
  assert.equal(isEligibleForReschedule("2026-11-07", "10:00", exact24hNotice), true);

  // 4 days notice (eligible)
  const fourDaysNotice = testStartMs - 4 * 24 * 3600 * 1000;
  assert.equal(isEligibleForReschedule("2026-11-07", "10:00", fourDaysNotice), true);

  // 23 hours 59 minutes notice (rejected)
  const under24hNotice = testStartMs - (24 * 3600 * 1000 - 60 * 1000);
  assert.equal(isEligibleForReschedule("2026-11-07", "10:00", under24hNotice), false);

  // Examination in the past (rejected)
  const pastExam = testStartMs + 1000;
  assert.equal(isEligibleForReschedule("2026-11-07", "10:00", pastExam), false);
});

test("R01-T06: table.tsx imports dateUtils and keeps booking details accessible", () => {
  const tableFilePath = fileURLToPath(new URL("../src/components/table.tsx", import.meta.url));
  const tableSource = fs.readFileSync(tableFilePath, "utf8");

  // Verify import exists
  assert.match(tableSource, /from ["']@\/lib\/dateUtils["']/);
  assert.match(tableSource, /formatDhakaExamDate/);
  assert.match(tableSource, /isEligibleForReschedule/);

  // Verify no raw `${bookingDate}T${time}` remains
  assert.doesNotMatch(tableSource, /\$\{bookingDate\}T\$\{time\}/);

  // Verify booking details button navigation is accessible
  assert.match(tableSource, /router\.push\(`\/dashboard\/\$\{booking\._id\}`\)/);
});

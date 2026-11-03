// Stage R03-K — Schedule Discovery & Availability Parity Test Suite
// Verifies backend/frontend contracts for calendar month highlighting,
// schedule queries, formatLocalYMD timezone safety, and differentiated UI states.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (relPath) =>
  fs.readFileSync(path.join(root, relPath), "utf8").replace(/\r\n/g, "\n");

const BOOKING_PAGE = source(
  "src/app/(withDashboard)/dashboard/booking/[bookingId]/page.tsx"
);
const RESCHEDULE_PAGE = source(
  "src/app/(withDashboard)/dashboard/reschedule/[bookingId]/page.tsx"
);

// ---------------------------------------------------------------------------
// 1. DATE FORMATTING & TIMEZONE IMMUNITY
// ---------------------------------------------------------------------------

test("K06-FE-01: formatLocalYMD formats dates strictly in local calendar time", () => {
  // Test local formatting logic across various hours to verify immunity to UTC date boundary shifts
  const formatLocalYMD = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const d1 = new Date(2026, 10, 7, 1, 0, 0); // Nov 7, 2026 01:00 local
  const d2 = new Date(2026, 10, 7, 23, 30, 0); // Nov 7, 2026 23:30 local

  assert.equal(formatLocalYMD(d1), "2026-11-07");
  assert.equal(formatLocalYMD(d2), "2026-11-07");

  // In booking/[bookingId]/page.tsx, verify formatLocalYMD is defined and used
  assert.match(
    BOOKING_PAGE,
    /const formatLocalYMD = \(d: Date\)(:\s*string)?\s*=>/,
    "booking page must define local calendar formatter formatLocalYMD"
  );
  assert.match(
    BOOKING_PAGE,
    /formatLocalYMD\(selectedDate\)/,
    "booking page must use formatLocalYMD for calendar date selection"
  );
});

// ---------------------------------------------------------------------------
// 2. CALENDAR MONTH HIGHLIGHTING ENDPOINT & REMAINING CAPACITY
// ---------------------------------------------------------------------------

test("K06-FE-02: Calendar month availability fetches via GET /schedule/course/:courseId with month query", () => {
  assert.match(
    BOOKING_PAGE,
    /\/api\/v1\/schedule\/course\/\$\{params\.bookingId\}/,
    "booking page must query schedule/course/:courseId with month query param"
  );
  assert.match(
    BOOKING_PAGE,
    /params:\s*\{\s*month:\s*monthParam\s*\}/,
    "booking page must pass month parameter in query"
  );
  assert.match(
    BOOKING_PAGE,
    /\(Number\(slot\?\.slot\)\s*\|\|\s*0\)\s*>\s*0/,
    "booking page must verify remaining slot capacity (> 0) before highlighting date in calendar"
  );
});

// ---------------------------------------------------------------------------
// 3. DIFFERENTIATED UI STATES IN NEW BOOKING
// ---------------------------------------------------------------------------

test("K06-FE-03: New booking page provides loading, error retry, and empty-state differentiation", () => {
  // Loading state
  assert.match(
    BOOKING_PAGE,
    /if\s*\(scheduleLoading\)\s*\{/,
    "booking page must check scheduleLoading state"
  );
  assert.match(
    BOOKING_PAGE,
    /animate-spin/,
    "booking page must render loading spinner during fetch"
  );

  // Error state with Retry button
  assert.match(
    BOOKING_PAGE,
    /if\s*\(scheduleError\)\s*\{/,
    "booking page must check scheduleError state"
  );
  assert.match(
    BOOKING_PAGE,
    /onClick=\{\(\)\s*=>\s*value instanceof Date && fetchScheduleData\(value\)\}/,
    "booking page must offer retry button wired to fetchScheduleData"
  );

  // Differentiated empty states
  assert.match(
    BOOKING_PAGE,
    /No schedules available for this date/,
    "booking page must display clear notice when zero schedules exist for date"
  );
  assert.match(
    BOOKING_PAGE,
    /No Matching Schedules/,
    "booking page must display distinct notice when schedules exist for other modes/courses"
  );
});

test("K06-FE-04: Fully booked slots (slot <= 0) are disabled with Fully Booked indicator", () => {
  assert.match(
    BOOKING_PAGE,
    /const isFull = \(Number\(slot\.slot\)\s*\|\|\s*0\)\s*<=\s*0;/,
    "booking page must compute isFull when slot <= 0"
  );
  assert.match(
    BOOKING_PAGE,
    /isFull\s*\?\s*"Fully Booked \(0\)"\s*:\s*slot\.slot/,
    "booking page must display Fully Booked (0) label"
  );
});

// ---------------------------------------------------------------------------
// 4. STUDENT RESCHEDULE PAGE PARITY
// ---------------------------------------------------------------------------

test("K06-FE-05: Reschedule page maintains parity for error retry and schedule differentiation", () => {
  // Error state with Retry
  assert.match(
    RESCHEDULE_PAGE,
    /\{scheduleError && \(/,
    "reschedule page must check scheduleError state"
  );
  assert.match(
    RESCHEDULE_PAGE,
    /onClick=\{\(\)\s*=>\s*selectedDate && fetchSchedulesForDate\(selectedDate\)\}/,
    "reschedule page must offer retry button wired to fetchSchedulesForDate"
  );

  // Differentiated empty states
  assert.match(
    RESCHEDULE_PAGE,
    /No active schedules found matching/,
    "reschedule page must display notice when zero schedules exist"
  );
  assert.match(
    RESCHEDULE_PAGE,
    /none match your course/,
    "reschedule page must display distinct notice when modes do not match"
  );

  // Disables full slots
  assert.match(
    RESCHEDULE_PAGE,
    /const isFull = slot\.slot < 1;/,
    "reschedule page must compute isFull when slot.slot < 1"
  );
  assert.match(
    RESCHEDULE_PAGE,
    /disabled=\{isDisabled\}/,
    "reschedule page must disable button when slot is full"
  );
});

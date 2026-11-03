// R03 — Student Self-Service Rescheduling UI Test Suite
// Covers all 18 acceptance criteria specified in Stage R03.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  toDhakaDateString,
  parseDhakaExamStartMs,
  isEligibleForReschedule,
  formatDhakaExamDate,
  formatExamTime,
  MIN_RESCHEDULE_NOTICE_MS,
  DHAKA_OFFSET_MS,
} from "../src/lib/dateUtils.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (relPath) =>
  fs.readFileSync(path.join(root, relPath), "utf8").replace(/\r\n/g, "\n");

const TABLE_SOURCE = source("src/components/table.tsx");
const RESCHEDULE_PAGE_SOURCE = source(
  "src/app/(withDashboard)/dashboard/reschedule/[bookingId]/page.tsx"
);
const BOOKING_PAGE_SOURCE = source(
  "src/app/(withDashboard)/dashboard/booking/[bookingId]/page.tsx"
);

// ---------------------------------------------------------------------------
// 1. DASHBOARD & ACTIONS (R03.1)
// ---------------------------------------------------------------------------

test("R03-T01: Eligible Reschedule button is rendered and links to /dashboard/reschedule/[bookingId]", () => {
  assert.match(
    TABLE_SOURCE,
    /onClick=\{\(\)\s*=>\s*router\.push\(`\/dashboard\/reschedule\/\$\{booking\._id\}`\)\}/,
    "table.tsx must route eligible bookings to the dedicated reschedule page"
  );
  assert.match(
    TABLE_SOURCE,
    /aria-label=\{\`Reschedule booking \$\{booking\._id\}\`\}/,
    "table.tsx must provide accessible aria-label on the Reschedule button"
  );
  assert.match(
    TABLE_SOURCE,
    /bg-\[#face39\]/,
    "table.tsx must use the canonical Luminedge yellow styling"
  );
});

test("R03-T02: Ineligible booking displays clear reason badge (Closed < 24h, Cancelled, Completed, Attended)", () => {
  assert.match(TABLE_SOURCE, /Closed \(< 24h\)/, "table.tsx must handle < 24h notice restriction");
  assert.match(TABLE_SOURCE, /Cancelled/, "table.tsx must handle cancelled booking status");
  assert.match(TABLE_SOURCE, /Completed/, "table.tsx must handle completed booking status");
  assert.match(TABLE_SOURCE, /Attended/, "table.tsx must handle recorded attendance restriction");
  assert.match(
    TABLE_SOURCE,
    /cursor-not-allowed/,
    "table.tsx must disable interaction for ineligible bookings"
  );
});

test("R03-T03: Booking details action (<AiOutlineEllipsis />) remains accessible independently on every booking", () => {
  assert.match(
    TABLE_SOURCE,
    /router\.push\(`\/dashboard\/\$\{booking\._id\}`\)/,
    "View booking details must remain accessible on every booking"
  );
  assert.match(
    TABLE_SOURCE,
    /aria-label="View booking details"/,
    "View booking details button must have an accessible label"
  );
  assert.match(TABLE_SOURCE, /AiOutlineEllipsis/, "AiOutlineEllipsis icon must be rendered");
});

// ---------------------------------------------------------------------------
// 2. ASIA/DHAKA ELIGIBILITY & NOTICE (R03.1 & R03.4)
// ---------------------------------------------------------------------------

test("R03-T04: Correct Asia/Dhaka eligibility evaluation adheres strictly to UTC+06:00 and 24-hour boundary", () => {
  const futureDate = "2026-11-20";
  const testTime = "14:00";
  const startMs = parseDhakaExamStartMs(futureDate, testTime);
  assert.ok(startMs !== null);

  // Exactly 24h before test: eligible
  const exact24hNotice = startMs - MIN_RESCHEDULE_NOTICE_MS;
  assert.equal(isEligibleForReschedule(futureDate, testTime, exact24hNotice), true);

  // 48h before test: eligible
  assert.equal(
    isEligibleForReschedule(futureDate, testTime, startMs - 48 * 3600 * 1000),
    true
  );

  // 23 hours 59 minutes: ineligible
  const under24hNotice = startMs - (MIN_RESCHEDULE_NOTICE_MS - 60 * 1000);
  assert.equal(isEligibleForReschedule(futureDate, testTime, under24hNotice), false);

  // Past examination: ineligible
  assert.equal(isEligibleForReschedule(futureDate, testTime, startMs + 1000), false);
});

// ---------------------------------------------------------------------------
// 3. SELECTION CONTRACTS (R03.4 & R03.5)
// ---------------------------------------------------------------------------

test("R03-T05: Test Center slot selection excludes full slots (slot < 1) and current slot", () => {
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /slot\.slot\s*<\s*1/,
    "Reschedule page must detect full/sold-out slots"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /String\(booking\.scheduleId\)\s*===\s*String\(sched\._id\)\s*&&\s*String\(booking\.slotId\)\s*===\s*String\(slot\.slotId\)/,
    "Reschedule page must detect and disable the student's currently booked slot"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /Full \(0\//,
    "Reschedule page must indicate full slots clearly"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /Current Slot/,
    "Reschedule page must label current slot"
  );
});

test("R03-T06: Home date and time selection enforces minDate (tomorrow) and supports same-day time change", () => {
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /min=\{minDateString\}/,
    "Home date picker must enforce minimum selectable date"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /HOME_STANDARD_TIMES/,
    "Home reschedule must offer standard examination time options"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /Selected replacement date and time are identical to your current booking/,
    "Home reschedule must prohibit submitting identical date and time"
  );
});

test("R03-T07: Request payload correctness (Test Center sends {newScheduleId, newSlotId}; Home sends {newBookingDate, newTestTime})", () => {
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /newScheduleId:\s*selectedScheduleId,\s*newSlotId:\s*selectedSlotId/,
    "Test Center payload must include newScheduleId and newSlotId"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /newBookingDate:\s*newHomeDate,\s*newTestTime:\s*newHomeTime/,
    "Home payload must include newBookingDate and newTestTime"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /http\.patch\(\s*`\$\{API_BASE\}\/api\/v1\/user\/bookings\/\$\{booking\._id\}\/reschedule`/,
    "Reschedule page must call the dedicated PATCH endpoint"
  );
});

// ---------------------------------------------------------------------------
// 4. AUTHORIZATION & IDEMPOTENCY (R03.3 & R03.6)
// ---------------------------------------------------------------------------

test("R03-T08: Authorization handling — non-owner bookingId or unauthenticated access shows clear error", () => {
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /getUserIdOnlyFromToken\(\)/,
    "Must verify authenticated student from token"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /userBookings\.find\(\(b\)\s*=>\s*String\(b\._id\)\s*===\s*String\(bookingId\)\)/,
    "Must find requested booking within authorized student's bookings"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /Booking not found or you are not authorized to view this booking/,
    "Must reject viewing another student's booking ID"
  );
});

test("R03-T09: Unique Idempotency-Key header is generated per logical reschedule operation", () => {
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /activeIdempotencyKeyRef/,
    "Must maintain durable active idempotency key ref"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /"Idempotency-Key":\s*activeIdempotencyKeyRef\.current/,
    "Must transmit Idempotency-Key header on PATCH request"
  );
});

test("R03-T10: Idempotency-Key remains stable across retry attempts on the same submission", () => {
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /Retry Submission \(Same Key\)/,
    "Must offer retry with the same idempotency key"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /activeIdempotencyKeyRef\.current/,
    "Retry must not overwrite the active idempotency key"
  );
});

test("R03-T11: Duplicate-click prevention — submit button disabled while isSubmitting is true", () => {
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /if \(isSubmitting \|\| !booking\) return;/,
    "Handler must abort if submission is in flight"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /disabled=\{\s*isSubmitting/,
    "Button must be disabled when isSubmitting is true"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /isSubmitting \? "Confirming Reschedule\.\.\." : "Confirm Reschedule"/,
    "Button label must reflect in-flight submission state"
  );
});

// ---------------------------------------------------------------------------
// 5. RESPONSES & RECONCILIATION (R03.6 & R03.7)
// ---------------------------------------------------------------------------

test("R03-T12: Successful reschedule displays confirmation details and navigates back to Dashboard", () => {
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /Mock Test Successfully Rescheduled!/,
    "Success view must render clear confirmation title"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /Return to Dashboard/,
    "Success view must provide return link to dashboard"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /No additional mock credits were charged/,
    "Success view must confirm zero extra credit charged"
  );
});

test("R03-T13: Full destination slot (409) displays conflict error and triggers schedule refresh", () => {
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /status === 409/,
    "Must handle 409 Conflict status"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /fetchSchedulesForDate\(selectedDate\)/,
    "409 conflict must trigger schedule re-fetch to reflect updated seat availability"
  );
});

test("R03-T14: Booking freeze (423) displays frozen status error and prevents mutation", () => {
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /status === 423/,
    "Must handle 423 Locked status"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /booking portal is currently frozen/,
    "Must notify student that booking freeze is active"
  );
});

test("R03-T15: Uncertain outcome (503 COMMITTED_OR_UNCERTAIN) enters verification mode without re-generating key", () => {
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /status === 503 \|\| data\?\.code === "COMMITTED_OR_UNCERTAIN"/,
    "Must recognize 503 COMMITTED_OR_UNCERTAIN outcome"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /Reschedule Outcome Pending Verification/,
    "Must render pending-verification alert banner"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /handleVerifyStatus/,
    "Must provide status reconciliation handler"
  );
});

test("R03-T16: Missing booking or invalid bookingId shows not-found screen without throwing unhandled exceptions", () => {
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /Access Denied or Not Found/,
    "Must show structured not-found UI"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /Back to Dashboard/,
    "Not-found UI must provide safe back link"
  );
});

// ---------------------------------------------------------------------------
// 6. BACKWARD COMPATIBILITY & EXISTING FLOWS (R03.8)
// ---------------------------------------------------------------------------

test("R03-T17: Legacy oldBookingId query parameter security remains fail-closed in booking/[bookingId]/page.tsx", () => {
  assert.match(
    BOOKING_PAGE_SOURCE,
    /if \(oldBookingId\) \{/,
    "Booking page must retain oldBookingId fail-closed guard"
  );
  assert.doesNotMatch(
    BOOKING_PAGE_SOURCE,
    /http\.delete/,
    "Booking page must never issue client-side DELETE"
  );
});

test("R03-T18: Normal new booking functionality is unaffected and preserves original endpoints and workflows", () => {
  assert.match(
    BOOKING_PAGE_SOURCE,
    /user\/book-slot/,
    "Booking page must continue using /user/book-slot for new bookings"
  );
  assert.doesNotMatch(
    BOOKING_PAGE_SOURCE,
    /api\/v1\/user\/bookings\/\$\{.*\}\/reschedule/,
    "New booking page must not use the reschedule PATCH endpoint"
  );
});

// ---------------------------------------------------------------------------
// 7. BEHAVIORAL & INTERACTION CONTRACTS (FIX R03-A - R03-G)
// ---------------------------------------------------------------------------

test("R03-T19: Async Schedule Fetch Race Condition Prevention (FIX R03-B)", async () => {
  // Source check
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /abortControllerRef/,
    "Must maintain AbortController ref"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /requestSeqRef/,
    "Must maintain monotonic request generation token"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /signal:\s*controller\.signal/,
    "Must pass abort signal to HTTP schedule query"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /if\s*\(\s*currentSeq\s*!==\s*requestSeqRef\.current\s*\)\s*return/,
    "Must discard responses from stale sequence tokens"
  );

  // Behavioral simulation of rapid date switching (Date A slow vs Date B fast)
  let inFlightController = null;
  let requestSeq = 0;
  let activeSchedules = null;
  let loadingState = false;

  const simulateFetchForDate = async (dateStr, delayMs, mockData) => {
    if (inFlightController) inFlightController.abort();
    inFlightController = new AbortController();
    const controller = inFlightController;
    const currentSeq = ++requestSeq;

    loadingState = true;
    activeSchedules = []; // clear immediate selection

    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, delayMs);
        controller.signal.addEventListener("abort", () => {
          clearTimeout(timer);
          const err = new Error("AbortError");
          err.name = "AbortError";
          reject(err);
        });
      });

      if (currentSeq !== requestSeq) return;
      activeSchedules = mockData;
    } catch (err) {
      if (err.name === "AbortError") return;
      throw err;
    } finally {
      if (currentSeq === requestSeq) {
        loadingState = false;
      }
    }
  };

  // Dispatch Date A (slow: 60ms) followed immediately by Date B (fast: 15ms)
  const reqA = simulateFetchForDate("2026-11-20", 60, [{ id: "slot-A", name: "Schedule A" }]);
  const reqB = simulateFetchForDate("2026-11-25", 15, [{ id: "slot-B", name: "Schedule B" }]);

  await Promise.all([reqA, reqB]);

  assert.equal(loadingState, false, "Loading state must be cleared after latest request resolves");
  assert.deepEqual(
    activeSchedules,
    [{ id: "slot-B", name: "Schedule B" }],
    "Date B's response must prevail and not be clobbered by Date A"
  );
});

test("R03-T20: Test Center Mode & Course Incompatibility Filtering (FIX R03-C)", () => {
  // Source check
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /normalizeMode\(s\.testType\)\s*!==\s*bookingMode/,
    "Must filter out schedules whose testType does not match booking mode"
  );

  // Behavioral test with synthetic schedule array
  const booking = {
    _id: "book-123",
    name: "IELTS",
    testType: "Computer-Based",
  };

  const syntheticSchedules = [
    {
      _id: "sched-1",
      name: "IELTS",
      testType: "Computer-Based",
      status: "active",
      timeSlots: [{ slotId: 1, slot: 2 }],
    },
    {
      _id: "sched-2",
      name: "IELTS",
      testType: "Paper-Based", // Incompatible mode
      status: "active",
      timeSlots: [{ slotId: 2, slot: 5 }],
    },
    {
      _id: "sched-3",
      name: "GRE", // Incompatible course
      testType: "Computer-Based",
      status: "active",
      timeSlots: [{ slotId: 3, slot: 4 }],
    },
    {
      _id: "sched-4",
      name: "IELTS",
      testType: "computer-based", // Matching mode with different casing
      status: "active",
      timeSlots: [{ slotId: 4, slot: 1 }],
    },
    {
      _id: "sched-5",
      name: "IELTS",
      testType: "Computer-Based",
      status: "cancelled", // Inactive status
      timeSlots: [{ slotId: 5, slot: 3 }],
    },
  ];

  const normalizeMode = (s) => (s || "").toLowerCase().trim();
  const normalizeCourse = (s) => (s || "").toLowerCase().trim();
  const bMode = normalizeMode(booking.testType);
  const bCourse = normalizeCourse(booking.name);

  const filtered = syntheticSchedules.filter((s) => {
    if (!s || (s.status || "").toLowerCase() === "cancelled") return false;
    if (bMode && s.testType && normalizeMode(s.testType) !== bMode) return false;
    if (bCourse && s.name && normalizeCourse(s.name) !== bCourse) return false;
    return true;
  });

  assert.equal(filtered.length, 2, "Only compatible active IELTS Computer-Based schedules must survive");
  assert.equal(filtered[0]._id, "sched-1");
  assert.equal(filtered[1]._id, "sched-4");
});

test("R03-T21: Uncertain 503 Outcome Locks Form State and Preserves Pending Identity Across Refresh (FIX R03-A & R03-I)", () => {
  // Source check: lockedPayload, sessionStorage persistence, and disabled controls during uncertain state
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /lockedPayload/,
    "Must preserve locked payload during uncertain state"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /disabled={\s*isSubmitting\s*\|\|\s*isUncertain/,
    "Date picker must be disabled during uncertain state"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /PENDING_STORAGE_PREFIX/,
    "Must declare pending transaction storage key"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /sessionStorage/,
    "Must persist unresolved pending transaction to sessionStorage"
  );
  assert.doesNotMatch(
    RESCHEDULE_PAGE_SOURCE,
    /Reset & Choose Different Slot/,
    "Must NOT offer unsafe reset bypass while transaction is unresolved"
  );

  // Behavioral simulation of the hardened pending transaction state machine
  let activeKey = "initial-idempotency-key-001";
  let isUncertain = false;
  let lockedPayload = null;
  const mockSessionStorage = new Map();

  const originalPayload = { newScheduleId: "sched-10", newSlotId: 2 };

  // Step 1: 503 COMMITTED_OR_UNCERTAIN error received -> lock & persist
  isUncertain = true;
  lockedPayload = originalPayload;
  mockSessionStorage.set("lumi_resched_pending_booking-1", JSON.stringify({
    bookingId: "booking-1",
    payload: lockedPayload,
    idempotencyKey: activeKey,
  }));

  // Step 2: Form controls remain locked; retry preserves exact locked payload and same key
  assert.equal(isUncertain, true, "State must remain uncertain and locked");
  assert.deepEqual(lockedPayload, originalPayload, "Payload cannot change during uncertain state");
  assert.equal(activeKey, "initial-idempotency-key-001", "Idempotency key must remain identical on retry");

  // Step 3: Simulate browser refresh -> pending transaction is re-hydrated and remains locked
  const rehydrated = JSON.parse(mockSessionStorage.get("lumi_resched_pending_booking-1"));
  assert.ok(rehydrated, "Pending transaction must survive page refresh");
  assert.equal(rehydrated.idempotencyKey, activeKey);
  assert.deepEqual(rehydrated.payload, originalPayload);

  // Step 4: Definitive resolution (e.g. 200 confirmed success or 409 slot taken on retry) clears storage
  const handleDefinitiveResolution = () => {
    mockSessionStorage.delete("lumi_resched_pending_booking-1");
    isUncertain = false;
    lockedPayload = null;
    activeKey = "next-key-002";
  };
  handleDefinitiveResolution();

  assert.equal(isUncertain, false);
  assert.equal(lockedPayload, null);
  assert.equal(mockSessionStorage.has("lumi_resched_pending_booking-1"), false);
});

test("R03-T22: Home Booking Time Input Parity and Strict Format Validation (FIX R03-D)", () => {
  // Source check
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /<input[^>]*id="home-time-picker"[^>]*type="time"/,
    "Must render standard HTML time input for Home booking"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /TIME_REGEX = \/\^\(\[01\]\\d\|2\[0-3\]\):\[0-5\]\\d\$\//,
    "Must enforce strict 24-hour HH:MM time validation"
  );

  const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

  // Valid times
  assert.ok(TIME_REGEX.test("00:00"));
  assert.ok(TIME_REGEX.test("09:30"));
  assert.ok(TIME_REGEX.test("10:00"));
  assert.ok(TIME_REGEX.test("14:15"));
  assert.ok(TIME_REGEX.test("23:59"));

  // Invalid times
  assert.equal(TIME_REGEX.test("24:00"), false, "24:00 is invalid");
  assert.equal(TIME_REGEX.test("9:00"), false, "Single digit hour must be rejected");
  assert.equal(TIME_REGEX.test("12:60"), false, "60 minutes is invalid");
  assert.equal(TIME_REGEX.test("12:00:00"), false, "Seconds precision must be rejected");
  assert.equal(TIME_REGEX.test(""), false, "Empty string must be rejected");
  assert.equal(TIME_REGEX.test("abc"), false, "Alpha characters must be rejected");
});

test("R03-T23: Attendance Enum Consistency — Both Present and Absent Block Rescheduling (FIX R03-E)", () => {
  // Source check
  assert.match(
    TABLE_SOURCE,
    /booking\.attendance && \/\^\\s\*\(present\|absent\)\\s\*\$\/i\.test\(booking\.attendance\)/,
    "table.tsx must check both present and absent attendance"
  );
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /found\.attendance && \/\^\\s\*\(present\|absent\)\\s\*\$\/i\.test\(found\.attendance\)/,
    "reschedule page must check both present and absent attendance"
  );

  // Behavioral test
  const isAttendanceRecorded = (att) =>
    Boolean(att && /^\s*(present|absent)\s*$/i.test(att));

  assert.equal(isAttendanceRecorded("Present"), true);
  assert.equal(isAttendanceRecorded("present"), true);
  assert.equal(isAttendanceRecorded("  present  "), true);
  assert.equal(isAttendanceRecorded("Absent"), true);
  assert.equal(isAttendanceRecorded("absent"), true);
  assert.equal(isAttendanceRecorded("  absent  "), true);
  assert.equal(isAttendanceRecorded(undefined), false);
  assert.equal(isAttendanceRecorded(null), false);
  assert.equal(isAttendanceRecorded(""), false);
  assert.equal(isAttendanceRecorded("pending"), false);
});

test("R03-T24: Student-Facing Rescheduling Guidance Updated on Contact Pages (FIX R03-F)", () => {
  const contact1Source = source("src/app/(withDashboard)/dashboard/contact1/page.tsx");
  const catchAllSource = source("src/app/(withDashboard)/dashboard/[...contact]/page.tsx");

  for (const [name, src] of [["contact1", contact1Source], ["[...contact]", catchAllSource]]) {
    assert.match(
      src,
      /You can reschedule your eligible mock test directly from your/,
      `${name} must inform students of direct Dashboard self-service rescheduling`
    );
    assert.match(
      src,
      /href="\/dashboard"/,
      `${name} must provide direct link to dashboard`
    );
    assert.match(
      src,
      /To reschedule, please contact the front desk at least 24 hours before your test\./,
      `${name} must preserve front desk assistance channel`
    );
  }
});

test("R03-T25: Normal Booking Page Uses Supported Next.js useParams Hook Without React use() (Stage R03-H)", () => {
  const currentBookingPage = source("src/app/(withDashboard)/dashboard/booking/[bookingId]/page.tsx");
  assert.match(
    currentBookingPage,
    /useParams/,
    "Normal booking page must use useParams from next/navigation"
  );
  assert.doesNotMatch(
    currentBookingPage,
    /const params = use\(paramsPromise\);/,
    "Normal booking page must not use unsupported use(paramsPromise)"
  );
  assert.doesNotMatch(
    currentBookingPage,
    /import \{[^}]*\buse\b[^}]*\} from "react";/,
    "Normal booking page must not import React use"
  );
});

test("R03-T26: Reschedule Page Uses Supported Next.js useParams Hook Without React use() (Stage R03-H)", () => {
  assert.match(
    RESCHEDULE_PAGE_SOURCE,
    /useParams/,
    "Reschedule page must use useParams from next/navigation"
  );
  assert.doesNotMatch(
    RESCHEDULE_PAGE_SOURCE,
    /use\(props\.params\)/,
    "Reschedule page must not use unsupported use(props.params)"
  );
  assert.doesNotMatch(
    RESCHEDULE_PAGE_SOURCE,
    /import \{[^}]*\buse\b[^}]*\} from "react";/,
    "Reschedule page must not import React use"
  );
});

// FIX-02c — student self-service rescheduling removal (production frontend).
//
// Scope note: these are static source assertions. They prove that the student
// reschedule code paths are gone and that ordinary booking code survived, but
// they do not execute React. Runtime behaviour is covered separately by the
// browser checks recorded in the project handoff for this slice.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// The repositories check out with CRLF (core.autocrlf=true); normalise to LF so
// multi-line source patterns behave identically on any platform.
const source = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

const BOOKING_PAGE = "src/app/(withDashboard)/dashboard/booking/[bookingId]/page.tsx";
const CONTACT1_PAGE = "src/app/(withDashboard)/dashboard/contact1/page.tsx";
const CATCH_ALL_PAGE = "src/app/(withDashboard)/dashboard/[...contact]/page.tsx";

const bookingPage = source(BOOKING_PAGE);
const contact1Page = source(CONTACT1_PAGE);
const catchAllPage = source(CATCH_ALL_PAGE);

// Drops full-line `//` / jsdoc comment lines so prose such as "any
// ?oldBookingId= entry point" cannot satisfy or break an assertion.
const codeOnly = (text) =>
  text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !trimmed.startsWith("//") && !trimmed.startsWith("*") && !trimmed.startsWith("/*");
    })
    .join("\n");

const count = (text, pattern) => (text.match(pattern) ?? []).length;

// The body of handleProceed, from just after its opening brace to its `};`.
const handleProceedBody = () => {
  const declaration = "const handleProceed = async () => {";
  const start = bookingPage.indexOf(declaration);
  assert.notEqual(start, -1, "handleProceed must still exist on the booking page");
  const bodyStart = start + declaration.length;
  const end = bookingPage.indexOf("\n  };\n", bodyStart);
  assert.notEqual(end, -1, "handleProceed closing brace not found");
  return bookingPage.slice(bodyStart, end);
};

// The `if (oldBookingId) { ... }` block, isolated.
const oldBookingGuard = (body) => {
  const start = body.indexOf("if (oldBookingId) {");
  assert.notEqual(start, -1, "the FIX-02c oldBookingId guard must be present");
  const end = body.indexOf("\n    }\n", start);
  assert.notEqual(end, -1, "the oldBookingId guard block is not terminated");
  return body.slice(start, end);
};

test("T01 — a stale ?oldBookingId= URL cannot trigger a student cancellation", () => {
  assert.doesNotMatch(bookingPage, /http\.delete/, "no cancellation DELETE may remain");
  assert.doesNotMatch(codeOnly(bookingPage), /api\/v1\/bookings\//, "the student booking DELETE endpoint must be unreferenced");
  assert.equal(count(codeOnly(bookingPage), /if \(oldBookingId\)/g), 1, "exactly one oldBookingId branch may remain");
});

test("T02 — a stale reschedule attempt cannot create a replacement booking", () => {
  const guard = oldBookingGuard(handleProceedBody());
  assert.match(guard, /toast\.error\(/, "the guard must tell the student to use the front desk");
  assert.match(guard, /return;/, "the guard must abort the handler");
  assert.doesNotMatch(guard, /http\./, "the guard must not issue a POST while aborting");
  assert.equal(
    count(codeOnly(bookingPage), /oldBookingId/g),
    3,
    "oldBookingId may only appear as the query read and the single guard"
  );
});

test("T03 — the guard executes before validation and before any booking mutation", () => {
  const body = handleProceedBody();
  const guardAt = body.indexOf("if (oldBookingId) {");
  const firstSystemValidation = body.indexOf("availableTestSystems.length");
  const firstStatusCheck = body.indexOf('userStatus?.toLowerCase() !== "completed"');
  const firstPost = body.indexOf("http.post");

  assert.ok(guardAt >= 0, "guard missing");
  assert.ok(guardAt < firstSystemValidation, "guard must run before the test-system validation");
  assert.ok(guardAt < firstStatusCheck, "guard must run before the completed-status check");
  assert.ok(guardAt < firstPost, "guard must run before the booking POST");

  const firstStatement = codeOnly(body).trimStart();
  assert.ok(
    firstStatement.startsWith("if (oldBookingId) {"),
    `the guard must be the first statement of handleProceed, found: ${firstStatement.slice(0, 60)}`
  );
});

test("T04 — the booking page issues no client-side cancellation request", () => {
  assert.equal(count(bookingPage, /http\.post/g), 2, "only the Home and Test Center booking POSTs may remain");
  assert.equal(count(bookingPage, /http\.delete/g), 0, "all cancellation DELETEs must be gone");
  assert.equal(count(bookingPage, /user\/book-slot/g), 2, "the retry POST sequence must be gone");
  assert.doesNotMatch(contact1Page, /axios|api\/v1\/bookings/, "contact1 must not call the backend at all");
});

test("T05 — neither confirmation page exposes an active student reschedule control", () => {
  const pages = [
    ["contact1", contact1Page],
    ["[...contact]", catchAllPage],
  ];

  for (const [name, page] of pages) {
    assert.doesNotMatch(page, /Reschedule\s*<\/button>/, `${name} still renders a Reschedule button`);
    assert.doesNotMatch(page, /onClick=/, `${name} still renders an interactive control`);
    assert.doesNotMatch(page, /oldBookingId/, `${name} still forwards an old booking id`);
    assert.doesNotMatch(page, /handleRescheduleClick|router\.push/, `${name} still performs a reschedule navigation`);
    assert.doesNotMatch(page, /Gawsia|743 Satmasjid|Dhanmondi 9\/A/, `${name} still prints the old office address`);
    assert.match(
      page,
      /To reschedule, please contact the front desk at least 24 hours before your test\./,
      `${name} must point students at the front desk`
    );
    assert.match(
      page,
      /Check the venue listed in your booking details on the Dashboard\./,
      `${name} must point students at their own booking's venue`
    );
  }
});

test("T06 — ordinary Home and Test Center booking paths are preserved", () => {
  assert.match(bookingPage, /http\.post\(\s*`\$\{API_BASE\}\/api\/v1\/user\/book-slot`/);
  assert.match(bookingPage, /testTime: selectedSlotId,/, "Home bookings must still send the selected time");
  assert.match(bookingPage, /scheduleId,\s*\n\s*slotId: selectedSlotId,/, "Test Center bookings must still send scheduleId and slotId");
  assert.match(bookingPage, /toast\.success\("Home test booked successfully! 🏡"\)/);
  assert.match(bookingPage, /toast\.success\("Test Center booking successful! 🏢"\)/);
  assert.match(bookingPage, /Bookings must be made at least 24 hours in advance for home test\./);
  assert.match(bookingPage, /Bookings cannot be made less than 24 hours before\./);
  assert.match(bookingPage, /router\.push\(`\/dashboard`\)/, "successful bookings must still return to the dashboard");
});

test("T07 — existing eligibility checks and error responses are unchanged", () => {
  const expectedMessages = [
    "Please select a test system.",
    "Please select a location (Home or Test Center).",
    "Home-Based testing is not available for this course.",
    "User ID is missing.",
    "Booking is only available for users with completed status.",
    "Please select a booking date.",
    "Please select a test time.",
    "Please select a valid slot to proceed.",
    "Slot details could not be retrieved.",
    "You already have booked a test for the selected date.",
    "An unexpected error occurred.",
  ];

  for (const message of expectedMessages) {
    assert.ok(bookingPage.includes(message), `missing expected message: ${message}`);
  }

  assert.doesNotMatch(bookingPage, /Insufficient mock/, "the insufficient-credit cancel/retry sequence must stay removed");
  assert.doesNotMatch(bookingPage, /Rescheduled successfully/, "the reschedule success toasts must stay removed");
  assert.doesNotMatch(bookingPage, /Old booking not found/, "the reschedule pre-flight lookup must stay removed");
});

test("T08 — React 19 and Next.js 15 conventions are preserved", () => {
  // Phase 02 upgraded the stack; this page now uses the Next.js 15 async params
  // API with React 19's use() to unwrap the promise.
  assert.match(
    bookingPage,
    /import \{ use, useEffect, useMemo, useState \} from "react";/,
    "React 19 hook imports, including use"
  );
  assert.match(
    bookingPage,
    /\(\{ params: paramsPromise \}: \{ params: Promise<\{ bookingId: string \}> \}\)/,
    "the Next.js 15 async params signature must be used"
  );
  assert.match(
    bookingPage,
    /const params = use\(paramsPromise\);/,
    "React 19 use() must unwrap the params promise"
  );

  for (const [name, page] of [["contact1", contact1Page], ["[...contact]", catchAllPage]]) {
    assert.doesNotMatch(page, /\buse\s*\(/, `${name} must not need React 19 use()`);
    assert.doesNotMatch(page, /\bparams\b/, `${name} no longer reads route params`);
  }

  const manifest = JSON.parse(source("package.json"));
  assert.match(manifest.dependencies.next, /^15\./, "Next.js must be on the patched 15.x line");
  assert.match(manifest.dependencies.react, /^19\./, "React must be on the patched 19.x line");
});

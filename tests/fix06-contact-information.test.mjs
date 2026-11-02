// FIX-06 — contact information correction (production frontend parity slice 2).
//
// Scope note: these are static source assertions. They prove that the approved
// office details replaced the withdrawn ones on the student-facing terms pages,
// that the production-only support numbers survived, and that the Slice 1
// (FIX-02c) correction was not disturbed. As of the FIX-05 reminder migration
// the withdrawn address and phone must be absent from every source file. They do
// not execute React. Runtime rendering is covered by the browser checks recorded
// in the project handoff for this slice.

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

const DASHBOARD_TERMS = "src/app/(withDashboard)/dashboard/terms/page.tsx";
const PUBLIC_TERMS = "src/app/terms-and-conditions/page.tsx";
const CONTACT1_PAGE = "src/app/(withDashboard)/dashboard/contact1/page.tsx";
const CATCH_ALL_PAGE = "src/app/(withDashboard)/dashboard/[...contact]/page.tsx";
const BOOKING_PAGE = "src/app/(withDashboard)/dashboard/booking/[bookingId]/page.tsx";
const REGISTER_PAGE = "src/app/register/page.tsx";
const ADMIN_REMINDER_PAGE = "src/app/(withAdmin)/admin/[id]/page.tsx";

const TERMS_PAGES = [DASHBOARD_TERMS, PUBLIC_TERMS];
const CONTACT_SURFACES = [DASHBOARD_TERMS, PUBLIC_TERMS, CONTACT1_PAGE, CATCH_ALL_PAGE];

const APPROVED_ADDRESS = "42 Satmasjid Road, Dhanmondi";
const APPROVED_PRIMARY_PHONE = "01400-403485";
// Withdrawn values: a floor/building claim the client no longer uses, and a
// phone number the client confirmed as incorrect.
const WITHDRAWN_ADDRESS = /Level 12|Gawsia Twin Peak|743 Satmasjid|Dhanmondi 9\/A/;
const WITHDRAWN_PHONE = /01400-406374/;
// Every production support number that must survive the correction.
const SECONDARY_PHONES = [
  "01400-403474",
  "01400-403475",
  "01400-403486",
  "01400-403487",
  "01400-403493",
  "01400-403494",
];

const count = (text, pattern) => (text.match(pattern) ?? []).length;

// Collapses runs of whitespace so a JSX line break inside a sentence cannot
// fail a copy assertion. Copy is asserted on normalised text; structure is
// asserted on the exact source.
const flatten = (text) => text.replace(/\s+/g, " ");

// Drops full-line `//` / jsdoc comment lines so prose cannot satisfy or break a
// structural assertion.
const codeOnly = (text) =>
  text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !trimmed.startsWith("//") && !trimmed.startsWith("*") && !trimmed.startsWith("/*");
    })
    .join("\n");

// Walks src/ so "this string is gone everywhere it should be" is checkable.
const walkSource = (dir = path.join(root, "src")) => {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...walkSource(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
};

const relative = (absolutePath) =>
  path.relative(root, absolutePath).split(path.sep).join("/");

const sourceFiles = walkSource();

test("T01 — both terms pages show the approved office address and no withdrawn address claim", () => {
  for (const file of TERMS_PAGES) {
    const page = source(file);
    assert.ok(page.includes(APPROVED_ADDRESS), `${file} must print the approved address`);
    assert.doesNotMatch(page, WITHDRAWN_ADDRESS, `${file} still prints the withdrawn address`);
    assert.doesNotMatch(page, /Bangladesh,\s*1205/, `${file} must not invent a postal code`);
  }
});

test("T02 — both terms pages show the approved primary phone and no withdrawn number", () => {
  for (const file of TERMS_PAGES) {
    const page = source(file);
    assert.ok(page.includes(APPROVED_PRIMARY_PHONE), `${file} must print the approved primary phone`);
    assert.doesNotMatch(page, WITHDRAWN_PHONE, `${file} still prints the withdrawn phone number`);
  }
});

test("T03 — every existing support number survives, including production-only 01400-403475", () => {
  for (const file of TERMS_PAGES) {
    const page = source(file);
    for (const phone of SECONDARY_PHONES) {
      assert.ok(page.includes(phone), `${file} dropped support number ${phone}`);
    }
    // The number that exists only in the production frontend.
    assert.ok(page.includes("01400-403475"), `${file} must keep production-only 01400-403475`);
    assert.ok(page.includes("ielts.luminedge@gmail.com"), `${file} must keep the contact email`);
  }
});

test("T04 — all four student-facing contact surfaces agree on the approved details", () => {
  for (const file of CONTACT_SURFACES) {
    const page = source(file);
    assert.ok(page.includes(APPROVED_ADDRESS), `${file} must print the approved address`);
    assert.ok(page.includes(APPROVED_PRIMARY_PHONE), `${file} must print the approved primary phone`);
    assert.ok(page.includes("01400-403475"), `${file} must keep production-only 01400-403475`);
    assert.doesNotMatch(page, WITHDRAWN_ADDRESS, `${file} still prints the withdrawn address`);
    assert.doesNotMatch(page, WITHDRAWN_PHONE, `${file} still prints the withdrawn phone number`);
  }
});

test("T05 — the Slice 1 confirmation pages still point at the student's own venue and offer no Reschedule action", () => {
  for (const [name, file] of [
    ["contact1", CONTACT1_PAGE],
    ["[...contact]", CATCH_ALL_PAGE],
  ]) {
    const page = source(file);
    assert.match(
      page,
      /Check the venue listed in your booking details on the Dashboard\./,
      `${name} must keep the booking-specific venue guidance`
    );
    assert.match(
      page,
      /To reschedule, please contact the front desk at least 24 hours before your test\./,
      `${name} must keep the front-desk guidance`
    );
    assert.doesNotMatch(page, /Reschedule\s*<\/button>/, `${name} must not render a Reschedule button`);
    assert.doesNotMatch(page, /onClick=/, `${name} must not render an interactive control`);
    assert.doesNotMatch(page, /oldBookingId|handleRescheduleClick|router\.push/, `${name} must not forward a reschedule action`);
    assert.doesNotMatch(page, /axios|api\/v1\/bookings/, `${name} must not call the backend`);
  }
});

test("T06 — the terms pages keep their legal wording, layout and card structure", () => {
  const requiredWording = [
    "Mock Test Terms and Conditions",
    "Mock tests must be booked",
    "at least 24 hours in advance",
    "<strong>Cancellation Policy:</strong>",
    "cannot be canceled.",
    "No-Show Policy:",
    "Emergency Situations:",
    "By booking a mock test, candidates agree to adhere to all terms and",
  ];

  for (const file of TERMS_PAGES) {
    const page = source(file);
    for (const phrase of requiredWording) {
      assert.ok(
        flatten(page).includes(flatten(phrase)),
        `${file} lost required terms wording: ${phrase}`
      );
    }
    // Layout preserved: the contact block is a three-card responsive grid, and
    // each card keeps its border.
    assert.ok(
      page.includes("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"),
      `${file} lost the responsive contact grid`
    );
    assert.equal(
      count(page, /className="p-2 border rounded-lg shadow-md"/g),
      3,
      `${file} must still render three bordered contact cards`
    );
  }
});

test("T07 — the withdrawn contact details are gone from every source file, including the migrated FIX-05 reminder page", () => {
  const holders = sourceFiles
    .filter((file) => WITHDRAWN_ADDRESS.test(source(relative(file))) || WITHDRAWN_PHONE.test(source(relative(file))))
    .map(relative);

  assert.deepEqual(
    holders,
    [],
    "no source file may retain the withdrawn address or the withdrawn phone number"
  );

  // FIX-05 removed the last holder: the admin reminder page no longer builds a
  // client-side template and now delegates delivery to the backend ledger
  // endpoint with only the schedule identifier.
  const reminder = source(ADMIN_REMINDER_PAGE);
  assert.doesNotMatch(reminder, /Office Address/, "the client-side reminder template must be gone");
  assert.match(reminder, /api\/v1\/send-reminder/, "the admin page must call the backend reminder endpoint");
  assert.match(reminder, /\{\s*scheduleId\s*\}/, "the reminder request must carry the schedule identifier");
});

test("T08 — the FIX-02c booking implementation and the registration placeholder are untouched", () => {
  const bookingPage = source(BOOKING_PAGE);
  assert.equal(count(bookingPage, /http\.post/g), 2, "only the Home and Test Center booking POSTs may remain");
  assert.equal(count(bookingPage, /http\.delete/g), 0, "no student cancellation DELETE may return");
  assert.equal(count(codeOnly(bookingPage), /oldBookingId/g), 3, "the stale-reschedule guard must stay as delivered");

  const declaration = "const handleProceed = async () => {";
  const declarationAt = bookingPage.indexOf(declaration);
  assert.notEqual(declarationAt, -1, "handleProceed must still exist");
  const firstStatement = codeOnly(bookingPage.slice(declarationAt + declaration.length)).trimStart();
  assert.ok(
    firstStatement.startsWith("if (oldBookingId) {"),
    `the FIX-02c guard must remain the first statement of handleProceed, found: ${firstStatement.slice(0, 60)}`
  );

  // The student registration placeholder uses the undashed form and must not be
  // "corrected" by a contact-number sweep.
  assert.match(source(REGISTER_PAGE), /placeholder="01400403474"/);
  const placeholderHolders = sourceFiles
    .filter((file) => source(relative(file)).includes("01400403474"))
    .map(relative);
  assert.deepEqual(placeholderHolders, [REGISTER_PAGE], "the undashed registration placeholder must stay in register/page.tsx only");
});

// FIX-05 — secure admin reminder migration (production frontend parity slice).
//
// Scope note: these are static contract assertions over the source text plus a
// source-wide sweep. They prove the browser no longer constructs reminder
// recipients or HTML, that delivery ownership moved to the backend ledger
// endpoint with the `{ scheduleId }` payload, that the in-flight guard is
// synchronous, and that outcome handling matches the backend contract
// (200 / 207 / 502 / 403 / 400 / 404 / 503). They do not execute React. Runtime
// rendering and duplicate-click behaviour are covered by the isolated browser
// check recorded in the project handoff for this slice.

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

const ADMIN_REMINDER_PAGE = "src/app/(withAdmin)/admin/[id]/page.tsx";
const page = source(ADMIN_REMINDER_PAGE);

// Everything before the reminder handler (bulk attendance, PDF, ...) is out of
// scope for ordering assertions, so searches are anchored to the handler body.
const handlerAt = page.indexOf("const handleSendMail = async () => {");
const inHandler = (needle) => {
  if (handlerAt < 0) return -1;
  const at = page.indexOf(needle, handlerAt);
  return at;
};

test("T01 — the reminder request is the backend ledger contract: exactly { scheduleId }", () => {
  assert.match(
    page,
    /http\.post\(`\$\{API\}\/api\/v1\/send-reminder`,\s*\{\s*scheduleId\s*\}\)/,
    "the reminder POST must send only the schedule identifier"
  );
  // No client-built recipient list or templated mail body may survive.
  assert.doesNotMatch(page, /\bemails\s*:/, "the payload must not carry a recipients array");
  assert.doesNotMatch(page, /\bsubject\s*:/, "the payload must not carry a subject");
  assert.doesNotMatch(page, /\bmessage\s*:/, "the payload must not carry a message body");
  assert.doesNotMatch(page, /emailData/, "the browser must not build emailData");
});

test("T02 — the browser no longer uses local storage or a sticky sent flag as delivery truth", () => {
  assert.doesNotMatch(page, /localStorage/, "localStorage must not be used for reminder state");
  assert.doesNotMatch(page, /emailsSent_/, "the per-schedule emailsSent_ key must be gone");
  assert.doesNotMatch(page, /\bemailsSent\b/, "the legacy emailsSent state must be gone");
});

test("T03 — the duplicate-submission guard is synchronous and set before the request is awaited", () => {
  const declareAt = page.indexOf("const reminderInFlight = useRef(false);");
  const guardAt = inHandler("if (reminderInFlight.current) return;");
  const setAt = inHandler("reminderInFlight.current = true;");
  const awaitAt = inHandler("await http.post(");

  assert.notEqual(declareAt, -1, "the reminderInFlight ref must exist");
  assert.notEqual(handlerAt, -1, "the reminder handler must exist");
  assert.notEqual(guardAt, -1, "the guard must read the ref");
  assert.notEqual(setAt, -1, "the ref must be set in flight");
  assert.notEqual(awaitAt, -1, "the request must be awaited");
  assert.ok(
    guardAt < setAt && setAt < awaitAt,
    "guard -> set -> await must be ordered so a second click cannot start a second request"
  );
  assert.match(page, /setIsSendingReminder\(true\)/, "the control must be visibly disabled in flight");
});

test("T04 — both in-flight flags are reset in finally, so a failure cannot wedge the button", () => {
  const awaitAt = inHandler("await http.post(");
  const setTrueAt = inHandler("setIsSendingReminder(true)");
  assert.ok(awaitAt !== -1 && setTrueAt !== -1 && setTrueAt < awaitAt, "the control is disabled before the request resolves");

  assert.match(
    page,
    /finally\s*\{\s*reminderInFlight\.current = false;\s*setIsSendingReminder\(false\);\s*\}/,
    "the finally block must clear the ref and the disabled state"
  );
});

test("T05 — a 200 reports the accepted total and the invalid addresses skipped", () => {
  assert.match(page, /response\.status === 200/, "the complete-outcome branch must exist");
  assert.match(
    page,
    /const accepted = Number\(result\?\.sent \|\| 0\) \+ Number\(result\?\.alreadyAccepted \|\| 0\)/,
    "accepted must count sent + alreadyAccepted"
  );
  assert.match(page, /invalidRecipients/, "the skipped-address count must be surfaced");
  assert.match(page, /toast\.success\(/, "a success message must be shown");
});

test("T06 — a 207 reports the partial-outcome counters", () => {
  assert.match(page, /response\.status === 207/, "the incomplete-outcome branch must exist");
  assert.match(page, /Reminder incomplete:/, "the partial message must be distinct");
  assert.match(page, /Number\(result\?\.failed \|\| 0\)/, "failed count must be reported");
  assert.match(page, /Number\(result\?\.deferred \|\| 0\)/, "deferred count must be reported");
  assert.match(page, /Number\(result\?\.processing \|\| 0\)/, "processing count must be reported");
  assert.match(page, /Number\(result\?\.uncertain \|\| 0\)/, "uncertain count must be reported");
});

test("T07 — each backend error status maps to its own message, read from the axios error", () => {
  assert.match(page, /axios\.isAxiosError\(error\)/, "the error response must be read from axios");
  assert.match(page, /response\?\.status === 502/, "502 must be handled");
  assert.match(page, /response\?\.status === 403/, "403 must be handled");
  assert.match(page, /response\?\.status === 400 \|\| response\?\.status === 404/, "400/404 must be handled");
  assert.match(page, /response\?\.status === 503/, "503 must be handled");

  const messages = [
    /All attempted reminders failed\./,
    /Only a verified administrator can send reminders\./,
    /The schedule reminder request is invalid\./,
    /Reminder delivery is unavailable until its service configuration is ready\./,
    /Reminder delivery could not be completed\./,
  ];
  const rendered = new Set(messages.filter((pattern) => pattern.test(page)).map((pattern) => pattern.source));
  assert.equal(rendered.size, messages.length, "every outcome must render a distinct message");
});

test("T08 — the legacy template is gone and the page's booking, attendance, PDF and async-params surfaces are preserved", () => {
  // Withdrawn contact details and the old subject/template must not survive here.
  assert.doesNotMatch(page, /Level 12|Gawsia Twin Peak|743 Satmasjid|Dhanmondi 9\/A/);
  assert.doesNotMatch(page, /01400-406374/);
  assert.doesNotMatch(page, /Office Address|Reminder: Your Mock Test at Luminedge is Tomorrow/);
  assert.doesNotMatch(page, /Reporting Time|Mock Test Terms & Conditions/);

  // Preserved admin surfaces.
  assert.match(page, /const confirmDownload = \(\) => \{/, "the PDF download handler must remain");
  assert.match(page, /new jsPDF\(/, "jsPDF must remain wired");
  assert.match(page, /autoTable\(doc, \{/, "the booking table PDF must remain");
  assert.match(page, /api\/v1\/user\/bookings\/\$\{scheduleId\}/, "the attendance update must remain");
  assert.match(page, /api\/v1\/user\/attendance\/bulk/, "the bulk attendance lookup must remain");

  // Phase 02 moved this page to the Next.js 15 / React 19 async params API.
  // This page uses the inline signature, so assert the brace/destructure shape
  // rather than a trailing comma or semicolon.
  assert.match(page, /\(\{ params: paramsPromise \}: \{ params: Promise<\{ id: string \}> \}\)/, "the Next.js 15 async params signature must be used");
  assert.match(page, /const params = use\(paramsPromise\);/, "React 19 use() must unwrap the params promise");
});

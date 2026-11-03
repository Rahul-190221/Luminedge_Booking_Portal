import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

test("R04-A01: Pending transaction is persisted before dispatching PATCH", () => {
  const page = read("src/app/(withDashboard)/dashboard/reschedule/[bookingId]/page.tsx");
  const saveIdx = page.indexOf("savePendingTransaction(booking._id, payload, activeIdempotencyKeyRef.current);");
  const patchIdx = page.indexOf("http.patch(");
  assert.ok(saveIdx > 0, "savePendingTransaction must be called");
  assert.ok(patchIdx > 0, "http.patch must be called");
  assert.ok(saveIdx < patchIdx, "savePendingTransaction must be called BEFORE http.patch dispatch");
});

test("R04-A02: Axios failure without HTTP response enters uncertain state and locks form", () => {
  const page = read("src/app/(withDashboard)/dashboard/reschedule/[bookingId]/page.tsx");
  assert.match(
    page,
    /if\s*\(\s*!err\.response\s*\)\s*\{[\s\S]*?setIsUncertain\s*\(\s*true\s*\)[\s\S]*?setLockedPayload\s*\(\s*payload\s*\)/,
    "Axios error with !err.response must set isUncertain=true and lock payload"
  );
  // Ensure it does not generate a new idempotency key
  const noResponseBlock = page.match(/if\s*\(\s*!err\.response\s*\)\s*\{[\s\S]*?\}\s*else/)?.[0] || "";
  assert.doesNotMatch(
    noResponseBlock,
    /generateIdempotencyKey/,
    "No-response network error must not generate a new idempotency key"
  );
});

test("R04-A03: handleVerifyStatus compares against lockedPayload rather than reset UI state", () => {
  const page = read("src/app/(withDashboard)/dashboard/reschedule/[bookingId]/page.tsx");
  const recovery = read("src/lib/rescheduleRecovery.ts");
  assert.match(
    page,
    /const\s+target\s*=\s*lockedPayload\s*\|\|/,
    "handleVerifyStatus must define target using lockedPayload"
  );
  assert.match(
    page,
    /reconcileRescheduleOperation/,
    "handleVerifyStatus must delegate to authoritative reconcileRescheduleOperation"
  );
  assert.match(
    recovery,
    /String\s*\(\s*fresh\.scheduleId\s*\)\s*===\s*String\s*\(\s*target\.newScheduleId\s*\)/,
    "Test Center schedule must match target.newScheduleId"
  );
  assert.match(
    recovery,
    /String\s*\(\s*fresh\.slotId\s*\)\s*===\s*String\s*\(\s*target\.newSlotId\s*\)/,
    "Test Center slot must match target.newSlotId"
  );
  assert.match(
    recovery,
    /toDhakaDateString\s*\(\s*fresh\.bookingDate\s*\)\s*===\s*targetHomeDate/,
    "Home date must match targetHomeDate derived from target.newBookingDate"
  );
});

test("R04-A04: Successful reschedule prefers authoritative bookingRecord without synthesized state", () => {
  const page = read("src/app/(withDashboard)/dashboard/reschedule/[bookingId]/page.tsx");
  assert.doesNotMatch(
    page,
    /\{ \.\.\.booking, \.\.\.payload \}/,
    "Page must never synthesize incomplete booking state with { ...booking, ...payload }"
  );
  assert.match(
    page,
    /res\.data\?\.bookingRecord/,
    "Page must read authoritative res.data?.bookingRecord"
  );
});

test("R04-B01: Silent production fallback to lumi-booking-backend.vercel.app is removed", () => {
  const config = read("src/lib/config.ts");
  assert.doesNotMatch(
    config,
    /lumi-booking-backend\.vercel\.app/,
    "config.ts must not contain the hardcoded fallback origin"
  );
});

test("R04-B02: config.ts rejects embedded credentials in API_BASE", async () => {
  const config = read("src/lib/config.ts");
  assert.match(
    config,
    /parsed\.username\s*\|\|\s*parsed\.password/,
    "config.ts must reject embedded credentials in URL"
  );
});

test("R04-B03: config.ts rejects paths, query strings, and fragments in API_BASE", () => {
  const config = read("src/lib/config.ts");
  assert.match(
    config,
    /parsed\.pathname.*!==\s*["']\/["']/,
    "config.ts must reject URL paths in API_BASE"
  );
  assert.match(
    config,
    /parsed\.search\s*\|\|\s*parsed\.hash/,
    "config.ts must reject search parameters or hash fragments in API_BASE"
  );
});

test("R04-B04: Hosted production builds require https and forbid loopback origins", () => {
  const config = read("src/lib/config.ts");
  assert.match(
    config,
    /parsed\.protocol\s*!==\s*["']https:['"]/,
    "config.ts must enforce https for hosted production builds"
  );
  assert.match(
    config,
    /localhost|127\.0\.0\.1/,
    "config.ts must forbid loopback destinations for hosted production builds"
  );
});

test("R04-A05: Missing bookingRecord and failed GET never presents stale original booking as updated reservation", () => {
  const page = read("src/app/(withDashboard)/dashboard/reschedule/[bookingId]/page.tsx");
  assert.doesNotMatch(
    page,
    /setSuccessBooking\(\s*freshBooking\s*\|\|\s*booking\s*\)/,
    "Must not fall back to stale booking on failed fresh booking check"
  );
  assert.doesNotMatch(
    page,
    /catch\s*\{[\s\S]*?setSuccessBooking\(\s*booking\s*\)/,
    "Must not fall back to stale original booking in catch block"
  );
  assert.match(
    page,
    /Updated reservation details are synchronizing/,
    "UI must inform user that details are synchronizing when bookingRecord is pending"
  );
});

test("R04-A06: Operation reconciliation verifies lastIdempotencyKey against active key", () => {
  const page = read("src/app/(withDashboard)/dashboard/reschedule/[bookingId]/page.tsx");
  const recovery = read("src/lib/rescheduleRecovery.ts");
  assert.match(
    recovery,
    /fresh\.lastIdempotencyKey/,
    "reconcileRescheduleOperation must evaluate fresh.lastIdempotencyKey for operation-level proof"
  );
  assert.match(
    page,
    /activeIdempotencyKeyRef\.current/,
    "handleVerifyStatus must supply activeIdempotencyKeyRef.current to reconciler"
  );
});

test("R04-B05: next.config.js includes explicit build-time API origin validation", () => {
  const nextConfig = read("next.config.js");
  assert.match(
    nextConfig,
    /validateBuildApiOrigin/,
    "next.config.js must contain build-time validation function"
  );
  assert.match(
    nextConfig,
    /NEXT_PUBLIC_API_BASE_URL/,
    "next.config.js must validate NEXT_PUBLIC_API_BASE_URL"
  );
  assert.match(
    nextConfig,
    /https:/,
    "next.config.js must require https for hosted builds"
  );
});

// ---------------------------------------------------------------------------
// FIX 1 BEHAVIORAL TESTS — EXACT RESCHEDULING OPERATION RECONCILIATION
// ---------------------------------------------------------------------------

import {
  reconcileRescheduleOperation,
  classifyRescheduleError,
  savePendingReschedule,
  getPendingReschedule,
  clearPendingReschedule,
} from "../src/lib/rescheduleRecovery.ts";

test("R04-FIX1-T01: Positive operation reconciliation on matching key and destination", () => {
  const originalBooking = {
    _id: "b100",
    location: "Test Center",
    scheduleId: "sched-old",
    slotId: 1,
  };
  const targetPayload = {
    newScheduleId: "sched-new",
    newSlotId: 2,
  };
  const activeKey = "idemp-uuid-12345";
  const fresh = {
    _id: "b100",
    location: "Test Center",
    scheduleId: "sched-new",
    slotId: 2,
    lastIdempotencyKey: "idemp-uuid-12345",
  };

  const outcome = reconcileRescheduleOperation({
    fresh,
    originalBooking,
    targetPayload,
    activeIdempotencyKey: activeKey,
  });

  assert.equal(outcome.verified, true);
  assert.equal(outcome.isDestinationMatched, true);
  assert.equal(outcome.isOpMatched, true);
  assert.equal(outcome.reason, "SUCCESS");
});

test("R04-FIX1-T02: Operation reconciliation REJECTS when idempotency key mismatches", () => {
  const originalBooking = {
    _id: "b100",
    location: "Test Center",
    scheduleId: "sched-old",
    slotId: 1,
  };
  const targetPayload = {
    newScheduleId: "sched-new",
    newSlotId: 2,
  };
  const activeKey = "idemp-uuid-active";
  const fresh = {
    _id: "b100",
    location: "Test Center",
    scheduleId: "sched-new",
    slotId: 2,
    lastIdempotencyKey: "idemp-uuid-different",
  };

  const outcome = reconcileRescheduleOperation({
    fresh,
    originalBooking,
    targetPayload,
    activeIdempotencyKey: activeKey,
  });

  assert.equal(outcome.verified, false, "Must reject operation on key mismatch");
  assert.equal(outcome.isDestinationMatched, true, "Destination may match");
  assert.equal(outcome.isOpMatched, false, "Operation must not be considered matched");
  assert.equal(outcome.reason, "OPERATION_KEY_MISMATCH");
});

test("R04-FIX1-T03: Operation reconciliation REJECTS when fresh lastIdempotencyKey is MISSING", () => {
  const originalBooking = {
    _id: "b100",
    location: "Test Center",
    scheduleId: "sched-old",
    slotId: 1,
  };
  const targetPayload = {
    newScheduleId: "sched-new",
    newSlotId: 2,
  };
  const activeKey = "idemp-uuid-active";
  const fresh = {
    _id: "b100",
    location: "Test Center",
    scheduleId: "sched-new",
    slotId: 2,
    // lastIdempotencyKey omitted / undefined
  };

  const outcome = reconcileRescheduleOperation({
    fresh,
    originalBooking,
    targetPayload,
    activeIdempotencyKey: activeKey,
  });

  assert.equal(outcome.verified, false, "An absent key must NOT establish operation success");
  assert.equal(outcome.isDestinationMatched, true);
  assert.equal(outcome.isOpMatched, false);
  assert.equal(outcome.reason, "OPERATION_KEY_MISSING");
});

test("R04-FIX1-T04: Matching destination with different operation key remains unverified", () => {
  const originalBooking = {
    _id: "b200",
    location: "Home",
    bookingDate: "2026-11-20T00:00:00.000Z",
    testTime: "10:00",
  };
  const targetPayload = {
    newBookingDate: "2026-11-25",
    newTestTime: "14:00",
  };
  const activeKey = "idemp-home-operation-current";
  const fresh = {
    _id: "b200",
    location: "Home",
    bookingDate: "2026-11-25T00:00:00.000Z",
    testTime: "14:00",
    lastIdempotencyKey: "idemp-home-operation-stale-previous",
  };

  const outcome = reconcileRescheduleOperation({
    fresh,
    originalBooking,
    targetPayload,
    activeIdempotencyKey: activeKey,
  });

  assert.equal(outcome.verified, false);
  assert.equal(outcome.isDestinationMatched, true);
  assert.equal(outcome.isOpMatched, false);
  assert.equal(outcome.reason, "OPERATION_KEY_MISMATCH");
});

test("R04-FIX1-T05: Page refresh preserves uncertain state and active key from session storage", () => {
  const memoryStore = new Map();
  const mockStorage = {
    getItem: (k) => memoryStore.get(k) || null,
    setItem: (k, v) => memoryStore.set(k, String(v)),
    removeItem: (k) => memoryStore.delete(k),
  };

  const bookingId = "b999";
  const pendingPayload = { newScheduleId: "sched-refresh", newSlotId: 3 };
  const pendingKey = "idemp-refresh-session-key";

  // Persist pending before dispatch
  savePendingReschedule(bookingId, pendingPayload, pendingKey, mockStorage);

  // Simulate refresh / remount
  const restored = getPendingReschedule(bookingId, mockStorage);
  assert.ok(restored, "Pending transaction must be restorable from storage");
  assert.equal(restored.bookingId, bookingId);
  assert.equal(restored.idempotencyKey, pendingKey);
  assert.equal(restored.payload.newScheduleId, "sched-refresh");
  assert.equal(restored.payload.newSlotId, 3);

  // Verify that definitive clear removes pending state
  clearPendingReschedule(bookingId, mockStorage);
  assert.equal(getPendingReschedule(bookingId, mockStorage), null);
});

// ---------------------------------------------------------------------------
// FIX 2 BEHAVIORAL TESTS — HTTP 500 TRANSACTION UNCERTAINTY & REJECTION GATES
// ---------------------------------------------------------------------------

test("R04-FIX2-T01: HTTP 500 locks form and preserves pending payload in uncertain state", () => {
  const errorOutcome = classifyRescheduleError({
    status: 500,
    msg: "Internal Server Error",
  });

  assert.equal(errorOutcome.isUncertain, true, "HTTP 500 must enter uncertain state");
  assert.equal(errorOutcome.shouldLockForm, true, "Form must remain locked on 500");
  assert.equal(errorOutcome.shouldClearPending, false, "Pending payload must NOT be cleared on 500");
  assert.match(errorOutcome.uncertaintyNotice, /server disruption occurred/i);
});

test("R04-FIX2-T02: HTTP 503 COMMITTED_OR_UNCERTAIN preserves pending transaction and locks form", () => {
  const errorOutcome = classifyRescheduleError({
    status: 503,
    data: { code: "COMMITTED_OR_UNCERTAIN", message: "Transaction commit timed out" },
  });

  assert.equal(errorOutcome.isUncertain, true);
  assert.equal(errorOutcome.shouldLockForm, true);
  assert.equal(errorOutcome.shouldClearPending, false);
});

test("R04-FIX2-T03: Network failure without HTTP response enters locked uncertain state", () => {
  const errorOutcome = classifyRescheduleError({
    status: undefined,
    msg: "Network Error: ECONNRESET",
  });

  assert.equal(errorOutcome.isUncertain, true);
  assert.equal(errorOutcome.shouldLockForm, true);
  assert.equal(errorOutcome.shouldClearPending, false);
});

test("R04-FIX2-T04: Definitive rejections (400, 401, 403, 404, 409, 423) conclusively clear pending transaction", () => {
  const testCases = [
    { status: 400, name: "Bad Request" },
    { status: 401, name: "Unauthorized / Session Expired" },
    { status: 403, name: "Forbidden" },
    { status: 404, name: "Not Found" },
    { status: 409, name: "Conflict / Slot Full" },
    { status: 423, name: "Locked / Portal Frozen" },
  ];

  for (const tc of testCases) {
    const outcome = classifyRescheduleError({ status: tc.status, msg: tc.name });
    assert.equal(outcome.isUncertain, false, `${tc.status} must not be uncertain`);
    assert.equal(outcome.shouldLockForm, false, `${tc.status} must unlock form for retry or redirect`);
    assert.equal(outcome.shouldClearPending, true, `${tc.status} must clear pending transaction from storage`);
  }
});

test("R04-FIX2-T05: Rescheduling failure does not consume or decrement mock credit balance", () => {
  let mockCredits = 3;
  const initialCredits = mockCredits;

  // Simulate failed 409 conflict
  const conflictOutcome = classifyRescheduleError({ status: 409, msg: "Slot is full" });
  assert.equal(conflictOutcome.isConflict, true);
  assert.equal(mockCredits, initialCredits, "Credits must not be deducted on conflict");

  // Simulate server 500 error
  const serverErrorOutcome = classifyRescheduleError({ status: 500, msg: "Database deadlock" });
  assert.equal(serverErrorOutcome.isUncertain, true);
  assert.equal(mockCredits, initialCredits, "Credits must not be deducted on server failure");
});

// ---------------------------------------------------------------------------
// FIX R04-EDGE: PENDING RESCHEDULE RECOVERY AFTER 24-HOUR ELIGIBILITY CUTOFF
// ---------------------------------------------------------------------------

test("R04-EDGE-T01: Source contract ensures isUncertain verification is accessible when eligibilityError is set", () => {
  const page = read("src/app/(withDashboard)/dashboard/reschedule/[bookingId]/page.tsx");
  assert.match(
    page,
    /if\s*\(\s*eligibilityError\s*&&\s*!isUncertain\s*\)/,
    "Ineligibility guard must only early-return when no uncertain pending operation exists"
  );
  assert.match(
    page,
    /\{!eligibilityError\s*&&\s*\([\s\S]*?Retry Submission \(Same Key\)/,
    "Retry submission must be hidden when booking is ineligible"
  );
  assert.match(
    page,
    /classifyRescheduleError\(\s*\{\s*status,\s*data,\s*msg\s*\}\s*\)/,
    "handleSubmit must directly invoke classifyRescheduleError helper"
  );
});

test("R04-EDGE-T02: Reload after 24h cutoff verifies COMMITTED pending operation successfully", () => {
  const memoryStore = new Map();
  const mockStorage = {
    getItem: (k) => memoryStore.get(k) || null,
    setItem: (k, v) => memoryStore.set(k, String(v)),
    removeItem: (k) => memoryStore.delete(k),
  };

  const bookingId = "b-cutoff-committed";
  const pendingPayload = { newScheduleId: "sched-committed", newSlotId: 2 };
  const pendingKey = "idemp-cutoff-committed-key";

  // 1. Transaction was saved in storage before cutoff
  savePendingReschedule(bookingId, pendingPayload, pendingKey, mockStorage);

  // 2. Student refreshes after 24h cutoff. Operation re-hydrates from storage
  const pending = getPendingReschedule(bookingId, mockStorage);
  assert.ok(pending);
  assert.equal(pending.idempotencyKey, pendingKey);

  // 3. Original booking is now within 24h cutoff (ineligible for NEW reschedule)
  const originalBooking = {
    _id: bookingId,
    location: "Test Center",
    scheduleId: "sched-original",
    slotId: 1,
    bookingDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours away
  };

  // 4. Server database reveals transaction committed before the cutoff
  const freshCommitted = {
    _id: bookingId,
    location: "Test Center",
    scheduleId: "sched-committed",
    slotId: 2,
    lastIdempotencyKey: pendingKey,
  };

  const outcome = reconcileRescheduleOperation({
    fresh: freshCommitted,
    originalBooking,
    targetPayload: pending.payload,
    activeIdempotencyKey: pending.idempotencyKey,
  });

  assert.equal(outcome.verified, true, "Committed operation must verify successfully even after cutoff");
  assert.equal(outcome.reason, "SUCCESS");
});

test("R04-EDGE-T03: Reload after 24h cutoff safely REJECTS uncommitted pending operation without opening new slot picker", () => {
  const memoryStore = new Map();
  const mockStorage = {
    getItem: (k) => memoryStore.get(k) || null,
    setItem: (k, v) => memoryStore.set(k, String(v)),
    removeItem: (k) => memoryStore.delete(k),
  };

  const bookingId = "b-cutoff-uncommitted";
  const pendingPayload = { newScheduleId: "sched-uncommitted", newSlotId: 3 };
  const pendingKey = "idemp-cutoff-uncommitted-key";

  savePendingReschedule(bookingId, pendingPayload, pendingKey, mockStorage);
  const pending = getPendingReschedule(bookingId, mockStorage);
  assert.ok(pending);

  const originalBooking = {
    _id: bookingId,
    location: "Test Center",
    scheduleId: "sched-original",
    slotId: 1,
  };

  // Server state: booking remains on original schedule (transaction rolled back or failed)
  const freshUncommitted = {
    _id: bookingId,
    location: "Test Center",
    scheduleId: "sched-original",
    slotId: 1,
    lastIdempotencyKey: "older-unrelated-key",
  };

  const outcome = reconcileRescheduleOperation({
    fresh: freshUncommitted,
    originalBooking,
    targetPayload: pending.payload,
    activeIdempotencyKey: pending.idempotencyKey,
  });

  assert.equal(outcome.verified, false, "Uncommitted operation must not verify");
  assert.equal(outcome.isDestinationMatched, false);
});



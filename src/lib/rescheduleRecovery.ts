/**
 * Authoritative Student Rescheduling Recovery & Transaction Uncertainty Helpers.
 *
 * Provides:
 * 1. Durable session-storage persistence of in-flight reschedule payloads & idempotency keys.
 * 2. Strict operation reconciliation (Fix 1): Requires positive operation key match.
 * 3. Exact error outcome classification (Fix 2): Preserves uncertain state on 5xx / no-response
 *    and clears pending transaction on definitive rejections (400, 401, 403, 404, 409, 423).
 */

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000; // UTC+06:00

export function toDhakaDateString(dateVal: string | Date | undefined | null): string {
  if (!dateVal) return "";
  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    if (DATE_PATTERN.test(trimmed)) {
      return trimmed;
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const dhakaShifted = new Date(d.getTime() + DHAKA_OFFSET_MS);
      return dhakaShifted.toISOString().slice(0, 10);
    }
  } else if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    const dhakaShifted = new Date(dateVal.getTime() + DHAKA_OFFSET_MS);
    return dhakaShifted.toISOString().slice(0, 10);
  }
  return "";
}

export const PENDING_STORAGE_PREFIX = "lumi_pending_reschedule_";

export interface PendingTransactionRecord {
  bookingId: string;
  payload: Record<string, any>;
  idempotencyKey: string;
  savedAt: number;
}

export interface ReconcileParams {
  fresh: Record<string, any> | null | undefined;
  originalBooking: {
    _id: string;
    location: string;
    bookingDate?: string;
    testTime?: string;
    scheduleId?: string;
    slotId?: string | number;
  };
  targetPayload: Record<string, any> | null | undefined;
  activeIdempotencyKey: string;
}

export interface ReconcileResult {
  verified: boolean;
  isDestinationMatched: boolean;
  isOpMatched: boolean;
  reason:
    | "SUCCESS"
    | "FRESH_BOOKING_MISSING"
    | "DESTINATION_MISMATCH"
    | "OPERATION_KEY_MISSING"
    | "OPERATION_KEY_MISMATCH";
}

export interface ErrorClassification {
  isUncertain: boolean;
  shouldLockForm: boolean;
  shouldClearPending: boolean;
  isSessionExpired?: boolean;
  isForbidden?: boolean;
  isConflict?: boolean;
  isBadRequest?: boolean;
  isNotFound?: boolean;
  isFrozen?: boolean;
  feedbackMessage: string;
  uncertaintyNotice?: string;
}

/**
 * Persists pending transaction in session storage before dispatching PATCH.
 */
export function savePendingReschedule(
  bookingId: string,
  payload: Record<string, any>,
  idempotencyKey: string,
  storage?: Storage
): void {
  const store = storage || (typeof window !== "undefined" ? window.sessionStorage : null);
  if (!store || !bookingId) return;
  try {
    const record: PendingTransactionRecord = {
      bookingId,
      payload,
      idempotencyKey,
      savedAt: Date.now(),
    };
    store.setItem(`${PENDING_STORAGE_PREFIX}${bookingId}`, JSON.stringify(record));
  } catch {}
}

/**
 * Retrieves persisted pending transaction for a booking.
 */
export function getPendingReschedule(
  bookingId: string,
  storage?: Storage
): PendingTransactionRecord | null {
  const store = storage || (typeof window !== "undefined" ? window.sessionStorage : null);
  if (!store || !bookingId) return null;
  try {
    const raw = store.getItem(`${PENDING_STORAGE_PREFIX}${bookingId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.payload && parsed.idempotencyKey) {
      return parsed as PendingTransactionRecord;
    }
  } catch {}
  return null;
}

/**
 * Clears pending transaction from session storage after definitive outcome.
 */
export function clearPendingReschedule(bookingId: string, storage?: Storage): void {
  const store = storage || (typeof window !== "undefined" ? window.sessionStorage : null);
  if (!store || !bookingId) return;
  try {
    store.removeItem(`${PENDING_STORAGE_PREFIX}${bookingId}`);
  } catch {}
}

/**
 * Reconciles authoritative fresh booking against the pending operation.
 * FIX 1 REQUIREMENT:
 * - An absent fresh.lastIdempotencyKey must NOT establish operation success.
 * - Confirms success ONLY when destination matches AND fresh.lastIdempotencyKey matches activeIdempotencyKey.
 */
export function reconcileRescheduleOperation(params: ReconcileParams): ReconcileResult {
  const { fresh, originalBooking, targetPayload, activeIdempotencyKey } = params;

  if (!fresh) {
    return {
      verified: false,
      isDestinationMatched: false,
      isOpMatched: false,
      reason: "FRESH_BOOKING_MISSING",
    };
  }

  const target = targetPayload || {};

  // Destination check: Test Center
  const isCenterMatched =
    originalBooking.location === "Test Center" &&
    Boolean(target.newScheduleId) &&
    target.newSlotId !== null &&
    target.newSlotId !== undefined &&
    String(fresh.scheduleId) === String(target.newScheduleId) &&
    String(fresh.slotId) === String(target.newSlotId);

  // Destination check: Home
  const targetHomeDate = toDhakaDateString(target.newBookingDate);
  const targetHomeTime = String(target.newTestTime || "").trim();

  const isHomeMatched =
    originalBooking.location === "Home" &&
    Boolean(targetHomeDate) &&
    Boolean(targetHomeTime) &&
    toDhakaDateString(fresh.bookingDate) === targetHomeDate &&
    String(fresh.testTime || "").trim() === targetHomeTime;

  const isDestinationMatched = Boolean(isCenterMatched || isHomeMatched);

  if (!isDestinationMatched) {
    return {
      verified: false,
      isDestinationMatched: false,
      isOpMatched: false,
      reason: "DESTINATION_MISMATCH",
    };
  }

  // Operation check: Strict match required
  const freshOpKey = fresh.lastIdempotencyKey;
  if (!freshOpKey) {
    return {
      verified: false,
      isDestinationMatched: true,
      isOpMatched: false,
      reason: "OPERATION_KEY_MISSING",
    };
  }

  const isOpMatched = String(freshOpKey).trim() === String(activeIdempotencyKey).trim();
  if (!isOpMatched) {
    return {
      verified: false,
      isDestinationMatched: true,
      isOpMatched: false,
      reason: "OPERATION_KEY_MISMATCH",
    };
  }

  return {
    verified: true,
    isDestinationMatched: true,
    isOpMatched: true,
    reason: "SUCCESS",
  };
}

/**
 * Classifies HTTP/network outcome for safe transaction recovery and locking.
 * FIX 2 REQUIREMENT:
 * - HTTP 500 / 503 or network failure does not confirm rollback.
 * - Form is locked and pending operation is preserved for same-key reconciliation.
 * - Definitive 4xx client errors (400, 401, 403, 404, 409, 423) conclusively clear pending operation.
 */
export function classifyRescheduleError(options: {
  status?: number;
  data?: any;
  msg?: string;
}): ErrorClassification {
  const { status, data, msg } = options;
  const rawMsg = data?.message || msg || "Failed to reschedule booking. Please try again.";

  // Transport failure (no HTTP response)
  if (!status) {
    return {
      isUncertain: true,
      shouldLockForm: true,
      shouldClearPending: false,
      feedbackMessage:
        "Network disruption during reschedule submission. Your request may have been processed. Please verify booking status.",
      uncertaintyNotice:
        "A network or connectivity disruption occurred while finalizing the transaction. Your request may have been committed. Form fields are locked to preserve idempotency integrity.",
    };
  }

  // Server error (500, 503, etc.) or explicit uncertainty code
  if (status >= 500 || data?.code === "COMMITTED_OR_UNCERTAIN") {
    return {
      isUncertain: true,
      shouldLockForm: true,
      shouldClearPending: false,
      feedbackMessage:
        "Server disruption during reschedule finalization. Your request may have been committed. Please verify booking status.",
      uncertaintyNotice:
        data?.code === "COMMITTED_OR_UNCERTAIN"
          ? (rawMsg ||
              "A network disruption occurred while finalizing the transaction. Your request may have been committed. Form fields are locked to preserve idempotency integrity.")
          : "A server disruption occurred during transaction finalization. Your reschedule request may have committed on the server. Form fields are locked pending verification.",
    };
  }

  // Definitive client rejections
  if (status === 401) {
    return {
      isUncertain: false,
      shouldLockForm: false,
      shouldClearPending: true,
      isSessionExpired: true,
      feedbackMessage: "Session expired. Please sign in again.",
    };
  }

  if (status === 403) {
    return {
      isUncertain: false,
      shouldLockForm: false,
      shouldClearPending: true,
      isForbidden: true,
      feedbackMessage: "You are not authorized to reschedule this booking.",
    };
  }

  if (status === 404) {
    return {
      isUncertain: false,
      shouldLockForm: false,
      shouldClearPending: true,
      isNotFound: true,
      feedbackMessage: rawMsg || "Booking not found.",
    };
  }

  if (status === 409) {
    return {
      isUncertain: false,
      shouldLockForm: false,
      shouldClearPending: true,
      isConflict: true,
      feedbackMessage:
        data?.message ||
        "Seat or booking conflict: the selected slot may be full or you have an existing booking on this date.",
    };
  }

  if (status === 400) {
    return {
      isUncertain: false,
      shouldLockForm: false,
      shouldClearPending: true,
      isBadRequest: true,
      feedbackMessage: rawMsg,
    };
  }

  if (status === 423) {
    return {
      isUncertain: false,
      shouldLockForm: false,
      shouldClearPending: true,
      isFrozen: true,
      feedbackMessage: "The booking portal is currently frozen. Modifications are disabled.",
    };
  }

  // Fallback for any other 4xx
  return {
    isUncertain: false,
    shouldLockForm: false,
    shouldClearPending: true,
    feedbackMessage: rawMsg,
  };
}


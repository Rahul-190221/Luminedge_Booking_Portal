"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import http from "@/lib/http";
import { API_BASE } from "@/lib/config";
import { getUserIdOnlyFromToken } from "@/app/helpers/jwt";
import toast from "react-hot-toast";
import {
  formatDhakaExamDate,
  formatExamTime,
  isEligibleForReschedule,
  toDhakaDateString,
} from "@/lib/dateUtils";
import {
  savePendingReschedule,
  getPendingReschedule,
  clearPendingReschedule,
  reconcileRescheduleOperation,
  classifyRescheduleError,
} from "@/lib/rescheduleRecovery";
import { normalizeScheduleRow } from "@/app/utils/schedules";
import {
  AiOutlineCalendar,
  AiOutlineClockCircle,
  AiOutlineEnvironment,
  AiOutlineArrowLeft,
  AiOutlineCheckCircle,
  AiOutlineExclamationCircle,
  AiOutlineWarning,
  AiOutlineReload,
  AiOutlineRight,
} from "react-icons/ai";

interface Booking {
  _id: string;
  userId: string;
  name: string;
  testType: string;
  testSystem?: string;
  location: string;
  bookingDate: string;
  startTime?: string;
  endTime?: string;
  testTime?: string;
  scheduleId?: string;
  slotId?: string | number;
  status: string;
  attendance?: string;
  venue?: string;
}

interface TimeSlot {
  slotId: string | number;
  startTime: string;
  endTime: string;
  slot: number;
  totalSlot: number;
}

interface Schedule {
  _id: string;
  courseId: string;
  name: string;
  startDate: string;
  endDate: string;
  location?: string;
  venue?: string;
  timeSlots: TimeSlot[];
  testType?: string;
  testSystem?: string;
  status?: string;
}

const COURSE_MAP: Record<string, string> = {
  ielts: "67337c880794d577cd982b75",
  "pearson pte": "67337c880794d577cd982b76",
  pte: "67337c880794d577cd982b76",
  gre: "67337c880794d577cd982b77",
  toefl: "67337c880794d577cd982b78",
};

const HOME_STANDARD_TIMES = [
  "10:00",
  "11:00",
  "12:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const PENDING_STORAGE_PREFIX = "lumi_pending_reschedule_";

function generateIdempotencyKey(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `resched-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function savePendingTransaction(bId: string, payload: Record<string, any>, key: string) {
  if (typeof window !== "undefined" && window.sessionStorage) {
    savePendingReschedule(bId, payload, key);
  }
}

function clearPendingTransaction(bId: string) {
  if (typeof window !== "undefined" && window.sessionStorage) {
    clearPendingReschedule(bId);
  }
}

// Stage R03-H: Use useParams<{ bookingId: string }>() exclusively, avoiding unsupported use()
export default function ReschedulePage() {
  const routeParams = useParams<{ bookingId: string }>();
  const bookingId = (routeParams?.bookingId || "") as string;
  const router = useRouter();

  // Booking & Eligibility State
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);

  // Test Center Selection State
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [schedulesForDate, setSchedulesForDate] = useState<Schedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [rawSchedulesCount, setRawSchedulesCount] = useState<number>(0);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // Home Selection State
  const [newHomeDate, setNewHomeDate] = useState<string>("");
  const [newHomeTime, setNewHomeTime] = useState<string>("");

  // Submission & Idempotency State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successBooking, setSuccessBooking] = useState<Booking | null>(null);
  const [isUncertain, setIsUncertain] = useState(false);
  const [uncertainMessage, setUncertainMessage] = useState<string | null>(null);
  const [uncertainChecking, setUncertainChecking] = useState(false);
  const [lockedPayload, setLockedPayload] = useState<Record<string, any> | null>(null);

  // Durable idempotency key: generated once per session/operation and preserved across retries
  const activeIdempotencyKeyRef = useRef<string>("");
  useEffect(() => {
    if (!activeIdempotencyKeyRef.current) {
      activeIdempotencyKeyRef.current = generateIdempotencyKey();
    }
  }, []);

  // Stage R03-I: Restore pending uncertain transaction across page refresh or navigation
  useEffect(() => {
    if (!bookingId || typeof window === "undefined" || !window.sessionStorage) return;
    try {
      const pending = getPendingReschedule(bookingId);
      if (pending && pending.payload && pending.idempotencyKey) {
        setIsUncertain(true);
        setLockedPayload(pending.payload);
        activeIdempotencyKeyRef.current = pending.idempotencyKey;
        setUncertainMessage(
          "An unresolved reschedule transaction was in progress for this booking. Form fields remain locked pending server verification."
        );
      }
    } catch {
      // ignore
    }
  }, [bookingId]);

  // FIX R03-B: Monotonic generation token & AbortController to prevent async fetch races
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef<number>(0);

  // Compute minimum selectable date (tomorrow in Asia/Dhaka time)
  const minDateString = useMemo(() => {
    const tomorrowMs = Date.now() + 24 * 60 * 60 * 1000;
    return toDhakaDateString(new Date(tomorrowMs));
  }, []);

  // 1. Fetch authorized student booking
  useEffect(() => {
    let isMounted = true;
    const fetchBooking = async () => {
      try {
        const userId = getUserIdOnlyFromToken();
        if (!userId) {
          setError("Please sign in to access mock test rescheduling.");
          setLoading(false);
          return;
        }

        const res = await http.get(`${API_BASE}/api/v1/user/bookings/${userId}`);
        const userBookings: Booking[] = res.data?.bookings || [];
        const found = userBookings.find((b) => String(b._id) === String(bookingId));

        if (!isMounted) return;

        if (!found) {
          setError("Booking not found or you are not authorized to view this booking.");
          setLoading(false);
          return;
        }

        setBooking(found);

        // Pre-validate eligibility
        const status = (found.status || "").toLowerCase().trim();
        if (status === "cancelled") {
          setEligibilityError("This mock test booking has been cancelled and cannot be rescheduled.");
        } else if (status === "completed") {
          setEligibilityError("This mock test has already been completed.");
        } else if (status !== "pending") {
          setEligibilityError(`Booking is not active (status: ${found.status}).`);
        } else if (found.attendance && /^\s*(present|absent)\s*$/i.test(found.attendance)) {
          setEligibilityError("Attendance has already been recorded for this test.");
        } else {
          const time = found.location === "Home" ? found.testTime : found.startTime;
          const eligible = isEligibleForReschedule(found.bookingDate, time);
          if (!eligible) {
            setEligibilityError(
              "Bookings can only be rescheduled at least 24 hours before the scheduled examination time."
            );
          }
        }

        // Initialize Home date to minimum selectable date
        if (found.location === "Home") {
          setNewHomeDate(minDateString);
          setNewHomeTime(found.testTime || "10:00");
        }

        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error("Error fetching booking details:", err);
        setError("Failed to load booking details. Please verify your connection.");
        setLoading(false);
      }
    };

    fetchBooking();
    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [bookingId, minDateString]);

  // 2. Fetch schedules for selected date (Test Center) with race prevention & mode filtering
  const fetchSchedulesForDate = async (dateStr: string) => {
    if (!booking) return;
    const courseId = COURSE_MAP[(booking.name || "").toLowerCase().trim()] || "";
    if (!courseId) {
      toast.error("Course mapping not found for this booking.");
      return;
    }

    // Abort prior in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Increment monotonically increasing sequence token
    const currentSeq = ++requestSeqRef.current;

    // Immediately clear previous schedules and slot selection to avoid stale state
    setLoadingSchedules(true);
    setScheduleError(null);
    setRawSchedulesCount(0);
    setSchedulesForDate([]);
    setSelectedScheduleId(null);
    setSelectedSlotId(null);
    setSelectedSlot(null);
    setSelectedSchedule(null);

    try {
      const res = await http.get(`${API_BASE}/api/v1/schedule/${dateStr}/${courseId}`, {
        signal: controller.signal,
      });

      // Discard response if a newer date selection was initiated
      if (currentSeq !== requestSeqRef.current) return;

      const raw: any[] = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.schedules)
        ? res.data.schedules
        : [];

      setRawSchedulesCount(raw.length);

      // FIX R03-C: Filter by course and mode (Computer-Based vs Paper-Based) matching booking/[bookingId]/page.tsx
      const normalizeMode = (s?: string) => (s || "").toLowerCase().trim();
      const normalizeCourse = (s?: string) => (s || "").toLowerCase().trim();
      const bookingMode = normalizeMode(booking.testType);
      const bookingCourse = normalizeCourse(booking.name);

      const normalized: Schedule[] = (raw
        .map((row: any) => normalizeScheduleRow(row))
        .filter((s: any) => {
          if (!s || (s.status || "").toLowerCase() === "cancelled") return false;
          // Mode filtering (Computer-Based vs Paper-Based)
          if (bookingMode && s.testType && normalizeMode(s.testType) !== bookingMode) {
            return false;
          }
          // Course filtering (if schedule specifies name)
          if (bookingCourse && s.name && normalizeCourse(s.name) !== bookingCourse) {
            return false;
          }
          return true;
        }) as unknown) as Schedule[];

      setSchedulesForDate(normalized);
    } catch (err: any) {
      if (currentSeq !== requestSeqRef.current) return;
      if (
        err?.name === "AbortError" ||
        err?.name === "CanceledError" ||
        err?.code === "ERR_CANCELED"
      ) {
        return; // aborted intentionally, ignore
      }
      console.error("Error fetching schedules for date:", err);
      setSchedulesForDate([]);
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setScheduleError("Session expired or unauthorized. Please sign in again.");
      } else if (status >= 500) {
        setScheduleError("Server error loading schedules. Please try again shortly.");
      } else {
        setScheduleError("Unable to load schedules. Please check your connection.");
      }
    } finally {
      if (currentSeq === requestSeqRef.current) {
        setLoadingSchedules(false);
      }
    }
  };

  const handleDateChange = (dateVal: string) => {
    setSelectedDate(dateVal);
    fetchSchedulesForDate(dateVal);
  };

  // 3. Confirm Reschedule Submission
  const handleConfirmReschedule = async () => {
    if (isSubmitting || !booking) return;

    let payload: Record<string, any> = {};

    // In uncertain state, strictly use the locked payload
    if (isUncertain && lockedPayload) {
      payload = lockedPayload;
    } else {
      if (booking.location === "Test Center") {
        if (!selectedScheduleId || selectedSlotId === null || selectedSlotId === undefined) {
          toast.error("Please select a destination schedule and time slot.");
          return;
        }
        payload = {
          newScheduleId: selectedScheduleId,
          newSlotId: selectedSlotId,
        };
      } else if (booking.location === "Home") {
        if (!newHomeDate || !newHomeTime) {
          toast.error("Please select a replacement examination date and time.");
          return;
        }

        if (!TIME_REGEX.test(newHomeTime)) {
          toast.error("Please enter a valid examination time in HH:MM format.");
          return;
        }

        const currentDhakaDate = toDhakaDateString(booking.bookingDate);
        if (
          currentDhakaDate === newHomeDate &&
          String(booking.testTime).trim() === newHomeTime.trim()
        ) {
          toast.error("Selected replacement date and time are identical to your current booking.");
          return;
        }

        const has24hNotice = isEligibleForReschedule(newHomeDate, newHomeTime);
        if (!has24hNotice) {
          toast.error("Replacement test must be scheduled at least 24 hours in advance.");
          return;
        }

        payload = {
          newBookingDate: newHomeDate,
          newTestTime: newHomeTime,
        };
      }
    }

    // Persist pending operation BEFORE dispatch so a refresh or network drop cannot lose it
    savePendingTransaction(booking._id, payload, activeIdempotencyKeyRef.current);

    setIsSubmitting(true);
    try {
      const res = await http.patch(
        `${API_BASE}/api/v1/user/bookings/${booking._id}/reschedule`,
        payload,
        {
          headers: {
            "Idempotency-Key": activeIdempotencyKeyRef.current,
          },
        }
      );

      if (res.status === 200) {
        clearPendingTransaction(booking._id);
        setIsUncertain(false);
        setLockedPayload(null);
        setIsSuccess(true);
        if (res.data?.bookingRecord) {
          setSuccessBooking(res.data.bookingRecord);
        } else {
          // Authoritatively fetch updated booking from backend instead of inventing state
          try {
            const userId = getUserIdOnlyFromToken();
            if (userId) {
              const userRes = await http.get(`${API_BASE}/api/v1/user/bookings/${userId}`);
              const freshBooking = (userRes.data?.bookings || []).find(
                (b: any) => String(b._id) === String(booking._id)
              );
              const isUpdated =
                freshBooking &&
                (booking.location === "Test Center"
                  ? String(freshBooking.scheduleId) === String(payload.newScheduleId) &&
                    String(freshBooking.slotId) === String(payload.newSlotId)
                  : toDhakaDateString(freshBooking.bookingDate) === toDhakaDateString(payload.newBookingDate) &&
                    String(freshBooking.testTime || "").trim() === String(payload.newTestTime || "").trim());

              if (isUpdated) {
                setSuccessBooking(freshBooking);
              } else {
                setSuccessBooking(null);
              }
            } else {
              setSuccessBooking(null);
            }
          } catch {
            setSuccessBooking(null);
          }
        }
        toast.success("Mock Test successfully rescheduled.");
      }
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;
      const msg = data?.message || "Failed to reschedule booking. Please try again.";

      if (!err.response) {
        // A02 FIX: Transport failure with no HTTP response does NOT establish that MongoDB rolled back!
        // Treat outcome as uncertain, lock selections, preserve payload and key for safe verification/retry.
        const outcome = classifyRescheduleError({ status, data, msg });
        setIsUncertain(true);
        setLockedPayload(payload);
        savePendingTransaction(booking._id, payload, activeIdempotencyKeyRef.current);
        setUncertainMessage(outcome.uncertaintyNotice || null);
        toast.error(outcome.feedbackMessage);
      } else if (status === 409) {
        // Stage R03-I: Definitive terminal failure (e.g. slot unavailable).
        const outcome = classifyRescheduleError({ status, data, msg });
        clearPendingTransaction(booking._id);
        setIsUncertain(false);
        setLockedPayload(null);
        activeIdempotencyKeyRef.current = generateIdempotencyKey();
        toast.error(outcome.feedbackMessage);
        if (selectedDate && booking.location === "Test Center") {
          fetchSchedulesForDate(selectedDate);
        }
      } else if (status === 423) {
        // Portal frozen: definitive rejection
        const outcome = classifyRescheduleError({ status, data, msg });
        clearPendingTransaction(booking._id);
        setIsUncertain(false);
        setLockedPayload(null);
        activeIdempotencyKeyRef.current = generateIdempotencyKey();
        toast.error("The booking portal is currently frozen. Modifications are disabled.");
      } else if (status >= 500 || status === 503 || data?.code === "COMMITTED_OR_UNCERTAIN") {
        // FIX 2: HTTP 500 / 503 or server error does NOT establish that MongoDB rolled back.
        // A server disruption post-commit is possible. Form is locked and pending operation preserved.
        const outcome = classifyRescheduleError({ status, data, msg });
        setIsUncertain(true);
        setLockedPayload(payload);
        savePendingTransaction(booking._id, payload, activeIdempotencyKeyRef.current);
        setUncertainMessage(outcome.uncertaintyNotice || null);
        toast.error(outcome.feedbackMessage);
      } else {
        // Definitive terminal client failure (400, 401, 403, 404, etc.)
        const outcome = classifyRescheduleError({ status, data, msg });
        clearPendingTransaction(booking._id);
        setIsUncertain(false);
        setLockedPayload(null);
        if (!outcome.isSessionExpired) {
          activeIdempotencyKeyRef.current = generateIdempotencyKey();
        }
        toast.error(outcome.feedbackMessage);

        if (outcome.isSessionExpired) {
          router.push("/login");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Verify Booking Status after Uncertain Outcome (A03 FIX: Use lockedPayload as authoritative target)
  const handleVerifyStatus = async () => {
    if (uncertainChecking || !booking) return;
    setUncertainChecking(true);
    try {
      const userId = getUserIdOnlyFromToken();
      if (!userId) return;

      const res = await http.get(`${API_BASE}/api/v1/user/bookings/${userId}`);
      const userBookings: Booking[] = res.data?.bookings || [];
      const fresh = userBookings.find((b) => String(b._id) === String(booking._id));

      if (fresh) {
        const target = lockedPayload || {
          newScheduleId: selectedScheduleId,
          newSlotId: selectedSlotId,
          newBookingDate: newHomeDate,
          newTestTime: newHomeTime,
        };

        const result = reconcileRescheduleOperation({
          fresh,
          originalBooking: booking,
          targetPayload: target,
          activeIdempotencyKey: activeIdempotencyKeyRef.current,
        });

        if (result.verified) {
          clearPendingTransaction(booking._id);
          setIsUncertain(false);
          setLockedPayload(null);
          setIsSuccess(true);
          setSuccessBooking(fresh);
          toast.success("Reschedule confirmed successfully!");
          return;
        }
      }
      toast(
        "The server reports your reservation has not yet transferred to the new slot. Please retry submission with the existing transaction key.",
        { icon: "ℹ️" }
      );
    } catch (err) {
      toast.error("Could not verify booking status. Please try again shortly.");
    } finally {
      setUncertainChecking(false);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER: Loading and Error States
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-[#face39] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 font-medium text-sm">Loading booking details...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-6 bg-white rounded-xl shadow border border-gray-200 text-center">
        <AiOutlineExclamationCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied or Not Found</h2>
        <p className="text-gray-600 mb-6 text-sm">{error || "Unable to locate booking."}</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 bg-[#face39] hover:bg-[#e5a812] text-black font-semibold rounded-lg text-sm transition-colors"
        >
          <AiOutlineArrowLeft className="mr-2" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Success State
  // ---------------------------------------------------------------------------
  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-6 bg-white rounded-2xl shadow-lg border border-green-200">
        <div className="text-center mb-6">
          <AiOutlineCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-gray-900">Mock Test Successfully Rescheduled!</h1>
          <p className="text-gray-600 text-sm mt-1">
            Your reservation transfer was accepted by the server. No additional mock credits were charged.
          </p>
        </div>

        {successBooking ? (
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-6 space-y-3">
            <div className="flex justify-between items-center text-sm border-b border-green-100 pb-2">
              <span className="text-gray-600">Course & Mode:</span>
              <span className="font-semibold text-gray-900">
                {successBooking.name} ({successBooking.testType})
              </span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-green-100 pb-2">
              <span className="text-gray-600">New Exam Date:</span>
              <span className="font-semibold text-green-800">
                {formatDhakaExamDate(successBooking.bookingDate)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-green-100 pb-2">
              <span className="text-gray-600">New Exam Time:</span>
              <span className="font-semibold text-green-800">
                {formatExamTime(
                  successBooking.location === "Home"
                    ? successBooking.testTime
                    : successBooking.startTime
                )}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-green-100 pb-2">
              <span className="text-gray-600">Location:</span>
              <span className="font-semibold text-gray-900">{successBooking.location}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Booking ID:</span>
              <span className="font-mono text-xs text-gray-700">{successBooking._id}</span>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 space-y-2 text-sm text-amber-900">
            <div className="flex items-center font-semibold text-amber-800">
              <AiOutlineReload className="mr-2 animate-spin text-amber-600" />
              <span>Updated reservation details are synchronizing...</span>
            </div>
            <p className="text-xs text-amber-700">
              Your reschedule submission succeeded on the server. Authoritative updated schedule details will be reflected on your dashboard shortly.
            </p>
            <div className="pt-2 text-xs border-t border-amber-200 flex justify-between">
              <span className="text-gray-600">Booking Reference:</span>
              <span className="font-mono text-gray-800">{booking._id}</span>
            </div>
          </div>
        )}

        <div className="flex justify-center space-x-4">
          <Link
            href="/dashboard"
            className="px-6 py-2.5 bg-[#face39] hover:bg-[#e5a812] text-black font-semibold rounded-xl text-sm transition-all shadow-md hover:scale-105"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Ineligibility Guard (Within 24h, Cancelled, Completed, Attended)
  // When an unresolved pending operation exists (isUncertain === true), allow
  // read-only verification without permitting new rescheduling.
  // ---------------------------------------------------------------------------
  if (eligibilityError && !isUncertain) {
    return (
      <div className="max-w-3xl mx-auto my-8 p-6 bg-white rounded-2xl shadow border border-yellow-200">
        <div className="flex items-start space-x-4">
          <AiOutlineWarning className="w-8 h-8 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Rescheduling Unavailable</h2>
            <p className="text-sm text-gray-700 mb-4">{eligibilityError}</p>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm space-y-1 mb-6 text-gray-600">
              <div>
                <strong>Current Course:</strong> {booking.name} ({booking.testType})
              </div>
              <div>
                <strong>Scheduled Date:</strong> {formatDhakaExamDate(booking.bookingDate)} at{" "}
                {formatExamTime(
                  booking.location === "Home" ? booking.testTime : booking.startTime
                )}
              </div>
              <div>
                <strong>Location:</strong> {booking.location}
              </div>
              <div>
                <strong>Status:</strong> {booking.status}
              </div>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg text-sm transition-colors"
            >
              <AiOutlineArrowLeft className="mr-2" />
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Active Rescheduling Workflow
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto my-6 px-4 space-y-6">
      {/* Breadcrumb & Title */}
      <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
        <Link href="/dashboard" className="hover:text-black">
          Dashboard
        </Link>
        <AiOutlineRight className="text-xs" />
        <span className="text-gray-900 font-medium">Reschedule Mock Test</span>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Reschedule Your Mock Test</h1>
        <p className="text-sm text-gray-600">
          Transfer your mock test reservation to a new date and time. No additional mock credits will
          be charged.
        </p>
      </div>

      {/* 503 COMMITTED_OR_UNCERTAIN Alert Box — Stage R03-I: Form remains locked until resolution */}
      {isUncertain && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 space-y-3">
          <div className="flex items-start space-x-3">
            <AiOutlineWarning className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 text-sm">Reschedule Outcome Pending Verification</h3>
              <p className="text-xs text-amber-800 mt-1">
                {uncertainMessage ||
                  "A network disruption occurred while finalizing the transaction. Your request may have been committed. Form fields remain locked to preserve transaction integrity."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={uncertainChecking}
              onClick={handleVerifyStatus}
              className="inline-flex items-center px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              <AiOutlineReload className={`mr-1.5 ${uncertainChecking ? "animate-spin" : ""}`} />
              {uncertainChecking ? "Checking Status..." : "Verify Booking Status"}
            </button>
            {!eligibilityError && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmReschedule}
                className="px-3.5 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-400 font-semibold rounded-lg text-xs transition-colors disabled:opacity-50"
              >
                Retry Submission (Same Key)
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. CURRENT BOOKING DETAILS CARD */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-900 flex items-center">
          <AiOutlineCalendar className="mr-2 text-[#face39] text-xl" />
          Current Booking Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div>
            <span className="block text-gray-500 text-xs font-medium uppercase">Course</span>
            <span className="font-semibold text-gray-900">{booking.name}</span>
          </div>
          <div>
            <span className="block text-gray-500 text-xs font-medium uppercase">Test Type & Mode</span>
            <span className="font-semibold text-gray-900">
              {booking.testType} {booking.testSystem ? `(${booking.testSystem})` : ""}
            </span>
          </div>
          <div>
            <span className="block text-gray-500 text-xs font-medium uppercase">Location</span>
            <span className="inline-flex items-center font-semibold text-gray-900">
              <AiOutlineEnvironment className="mr-1 text-gray-500" />
              {booking.location}
            </span>
          </div>
          <div>
            <span className="block text-gray-500 text-xs font-medium uppercase">Scheduled Date</span>
            <span className="font-semibold text-amber-700">
              {formatDhakaExamDate(booking.bookingDate)}
            </span>
          </div>
          <div>
            <span className="block text-gray-500 text-xs font-medium uppercase">Scheduled Time</span>
            <span className="font-semibold text-amber-700">
              {formatExamTime(
                booking.location === "Home" ? booking.testTime : booking.startTime
              )}
            </span>
          </div>
          <div>
            <span className="block text-gray-500 text-xs font-medium uppercase">Booking Reference</span>
            <span className="font-mono text-xs text-gray-700">{booking._id}</span>
          </div>
        </div>
      </div>

      {/* 2. REPLACEMENT SELECTION CARD (Or Ineligibility Notice if closed to new requests) */}
      {eligibilityError ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-start space-x-3">
            <AiOutlineWarning className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-900 text-sm">New Reschedule Selections Closed</h3>
              <p className="text-xs text-amber-800 mt-1">{eligibilityError}</p>
              <p className="text-xs text-amber-700 mt-2">
                An unresolved transaction was previously submitted for this booking. You can check whether that operation completed on the server using <strong>&quot;Verify Booking Status&quot;</strong> above. New replacement dates and slots cannot be chosen because this booking is closed for new reschedule requests.
              </p>
            </div>
          </div>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold rounded-xl text-xs transition-colors"
            >
              <AiOutlineArrowLeft className="mr-1.5" />
              Return to Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
        <h2 className="text-base font-bold text-gray-900 flex items-center">
          <AiOutlineClockCircle className="mr-2 text-[#face39] text-xl" />
          Select New Examination Date & Time
        </h2>

        {/* TEST CENTER WORKFLOW */}
        {booking.location === "Test Center" && (
          <div className="space-y-5">
            <div>
              <label htmlFor="exam-date-picker" className="block text-sm font-semibold text-gray-800 mb-1">
                Choose Replacement Exam Date
              </label>
              <input
                id="exam-date-picker"
                type="date"
                min={minDateString}
                disabled={isSubmitting || isUncertain}
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full md:w-64 p-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#face39] focus:outline-none disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Only dates at least 24 hours in the future with available schedules can be selected.
              </p>
            </div>

            {loadingSchedules && (
              <div className="flex items-center space-x-2 text-sm text-gray-500 py-3">
                <div className="w-4 h-4 border-2 border-[#face39] border-t-transparent rounded-full animate-spin" />
                <span>Checking available schedules...</span>
              </div>
            )}

            {scheduleError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <p className="font-semibold mb-1">Failed to Load Schedules</p>
                <p className="text-xs mb-3">{scheduleError}</p>
                <button
                  type="button"
                  onClick={() => selectedDate && fetchSchedulesForDate(selectedDate)}
                  className="px-3 py-1.5 bg-[#face39] text-black font-semibold text-xs rounded-lg hover:bg-yellow-400 transition"
                >
                  Retry
                </button>
              </div>
            )}

            {!loadingSchedules && !scheduleError && selectedDate && schedulesForDate.length === 0 && (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-600 text-center">
                {rawSchedulesCount > 0
                  ? `Schedules exist for ${formatDhakaExamDate(selectedDate)}, but none match your course (${booking.name}) and mode (${booking.testType}). Please choose another date.`
                  : `No active schedules found matching ${booking.name} (${booking.testType}) for ${formatDhakaExamDate(selectedDate)}. Please choose another date.`}
              </div>
            )}

            {!loadingSchedules && schedulesForDate.length > 0 && (
              <div className="space-y-4">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Available Time Slots for {formatDhakaExamDate(selectedDate)}
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {schedulesForDate.flatMap((sched) =>
                    (sched.timeSlots || []).map((slot) => {
                      const isFull = slot.slot < 1;
                      const isCurrentSlot =
                        String(booking.scheduleId) === String(sched._id) &&
                        String(booking.slotId) === String(slot.slotId);
                      const isNoticeValid = isEligibleForReschedule(selectedDate, slot.startTime);
                      const isDisabled = isFull || isCurrentSlot || !isNoticeValid || isSubmitting || isUncertain;

                      const isSelected =
                        selectedScheduleId === sched._id && selectedSlotId === slot.slotId;

                      return (
                        <button
                          key={`${sched._id}-${slot.slotId}`}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            if (isUncertain) return;
                            setSelectedScheduleId(sched._id);
                            setSelectedSlotId(slot.slotId);
                            setSelectedSlot(slot);
                            setSelectedSchedule(sched);
                          }}
                          className={`p-3.5 rounded-xl border text-left transition-all relative ${
                            isSelected
                              ? "border-[#face39] bg-yellow-50/60 ring-2 ring-[#face39]"
                              : isDisabled
                              ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-sm text-gray-900">
                                {formatExamTime(slot.startTime)} – {formatExamTime(slot.endTime)}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {sched.venue || sched.location || "Luminedge Dhanmondi Center"}
                              </div>
                            </div>
                            <div className="text-right">
                              {isCurrentSlot ? (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                                  Current Slot
                                </span>
                              ) : isFull ? (
                                <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs font-semibold">
                                  Full (0/${slot.totalSlot})
                                </span>
                              ) : !isNoticeValid ? (
                                <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs font-semibold">
                                  &lt; 24h Notice
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">
                                  {slot.slot} seat{slot.slot !== 1 ? "s" : ""} left
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* HOME WORKFLOW */}
        {booking.location === "Home" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="home-date-picker" className="block text-sm font-semibold text-gray-800 mb-1">
                  Replacement Examination Date
                </label>
                <input
                  id="home-date-picker"
                  type="date"
                  min={minDateString}
                  disabled={isSubmitting || isUncertain}
                  value={newHomeDate}
                  onChange={(e) => setNewHomeDate(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#face39] focus:outline-none disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Same-day time changes are permitted when selecting a different time.
                </p>
              </div>

              <div>
                <label htmlFor="home-time-picker" className="block text-sm font-semibold text-gray-800 mb-1">
                  Replacement Examination Time (HH:MM)
                </label>
                {/* FIX R03-D: Controlled HTML time input matching booking/[bookingId]/page.tsx type="time" */}
                <input
                  id="home-time-picker"
                  type="time"
                  disabled={isSubmitting || isUncertain}
                  value={newHomeTime}
                  onChange={(e) => setNewHomeTime(e.target.value)}
                  className="w-full p-2.5 mb-3 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#face39] focus:outline-none disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  required
                />

                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Or select a standard slot:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {HOME_STANDARD_TIMES.map((timeStr) => {
                    const isSelected = newHomeTime === timeStr;
                    const isCurrent =
                      toDhakaDateString(booking.bookingDate) === newHomeDate &&
                      String(booking.testTime).trim() === timeStr;

                    return (
                      <button
                        key={timeStr}
                        type="button"
                        disabled={isSubmitting || isUncertain}
                        onClick={() => setNewHomeTime(timeStr)}
                        className={`py-2 px-2.5 rounded-lg border text-xs font-semibold transition-all ${
                          isSelected
                            ? "bg-[#face39] text-black border-[#e5a812] shadow-sm"
                            : isCurrent
                            ? "bg-gray-100 text-gray-400 border-gray-200"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {formatExamTime(timeStr)}
                        {isCurrent && <span className="block text-[10px] text-gray-400 font-normal">Current</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. CONFIRMATION & POLICY SUMMARY */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
        <h2 className="text-base font-bold text-gray-900">Review and Confirm Reschedule</h2>

        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs text-gray-500 font-semibold uppercase block">Original Booking</span>
            <div className="text-sm font-bold text-gray-800">
              {formatDhakaExamDate(booking.bookingDate)} at{" "}
              {formatExamTime(booking.location === "Home" ? booking.testTime : booking.startTime)}
            </div>
            <div className="text-xs text-gray-500">{booking.location}</div>
          </div>

          <div className="hidden md:block text-gray-400 text-xl font-bold">➔</div>

          <div className="space-y-1">
            <span className="text-xs text-green-700 font-semibold uppercase block">New Reservation</span>
            {booking.location === "Test Center" && selectedSlot ? (
              <>
                <div className="text-sm font-bold text-green-800">
                  {formatDhakaExamDate(selectedDate)} at {formatExamTime(selectedSlot.startTime)}
                </div>
                <div className="text-xs text-green-700">
                  {selectedSchedule?.venue || "Luminedge Test Center"}
                </div>
              </>
            ) : booking.location === "Home" && newHomeDate && newHomeTime ? (
              <>
                <div className="text-sm font-bold text-green-800">
                  {formatDhakaExamDate(newHomeDate)} at {formatExamTime(newHomeTime)}
                </div>
                <div className="text-xs text-green-700">Home-Based Online</div>
              </>
            ) : (
              <div className="text-sm text-gray-400 italic">Please select date and time above</div>
            )}
          </div>
        </div>

        {/* Policy Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600">
          <div className="flex items-start space-x-2 p-2.5 bg-yellow-50/50 rounded-lg border border-yellow-100">
            <span className="text-amber-500 font-bold text-sm">✓</span>
            <span>
              <strong>Zero Extra Credits:</strong> Rescheduling is credit-neutral. No additional mock credits are
              consumed.
            </span>
          </div>
          <div className="flex items-start space-x-2 p-2.5 bg-yellow-50/50 rounded-lg border border-yellow-100">
            <span className="text-amber-500 font-bold text-sm">⏱</span>
            <span>
              <strong>24-Hour Policy:</strong> Enforced in Asia/Dhaka time. Rescheduling cannot be submitted within 24
              hours.
            </span>
          </div>
          <div className="flex items-start space-x-2 p-2.5 bg-yellow-50/50 rounded-lg border border-yellow-100">
            <span className="text-amber-500 font-bold text-sm">🔒</span>
            <span>
              <strong>Atomic Protection:</strong> Your original booking remains completely safe if the replacement slot
              cannot be claimed.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-3 gap-3 border-t border-gray-100">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-5 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl text-sm transition-colors text-center"
          >
            Cancel & Return
          </Link>

          <button
            type="button"
            disabled={
              isSubmitting ||
              isUncertain ||
              loadingSchedules ||
              (booking.location === "Test Center" && (!selectedScheduleId || selectedSlotId === null)) ||
              (booking.location === "Home" && (!newHomeDate || !newHomeTime || !TIME_REGEX.test(newHomeTime)))
            }
            onClick={handleConfirmReschedule}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#face39] hover:bg-[#e5a812] text-black font-bold rounded-xl text-sm transition-all shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
          >
            {isSubmitting ? "Confirming Reschedule..." : "Confirm Reschedule"}
          </button>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

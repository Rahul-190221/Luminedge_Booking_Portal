/**
 * Strictly validated Asia/Dhaka (UTC+06:00, fixed, no DST) examination time helpers.
 * Ensures consistent examination calendar day interpretation and 24-hour notice checks.
 */

export const DHAKA_OFFSET_MINUTES = 360;
export const DHAKA_OFFSET_MS = DHAKA_OFFSET_MINUTES * 60 * 1000;
export const MIN_RESCHEDULE_NOTICE_MS = 24 * 60 * 60 * 1000; // 24 hours

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{1,2})(?::(\d{2})(?::(\d{2}))?)?$/;

const isLeapYear = (year: number): boolean =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const daysInMonth = (year: number, month: number): number => {
  const lengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month === 2 ? (isLeapYear(year) ? 29 : 28) : lengths[month - 1];
};

/**
 * Extracts the calendar date string (YYYY-MM-DD) in Asia/Dhaka (UTC+06:00).
 * Preserves the intended Dhaka calendar day whether passed a date-only string,
 * an ISO timestamp string, or a Date object.
 */
export function toDhakaDateString(dateVal: string | Date | undefined | null): string {
  if (!dateVal) return "";

  // Date-only YYYY-MM-DD
  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    if (DATE_PATTERN.test(trimmed)) {
      return trimmed;
    }
    // If it's an ISO string containing 'T'
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      // Shift UTC instant by +06:00 to reflect Dhaka wall-clock date
      const dhakaShifted = new Date(d.getTime() + DHAKA_OFFSET_MS);
      return dhakaShifted.toISOString().slice(0, 10);
    }
  } else if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    const dhakaShifted = new Date(dateVal.getTime() + DHAKA_OFFSET_MS);
    return dhakaShifted.toISOString().slice(0, 10);
  }

  return "";
}

/**
 * Parses Dhaka calendar date and wall-clock time into UTC epoch milliseconds.
 * Returns null if the date or time format is invalid or represents an impossible calendar date.
 */
export function parseDhakaExamStartMs(
  bookingDate: string | Date | undefined | null,
  timeStr: string | undefined | null
): number | null {
  const dateStr = toDhakaDateString(bookingDate);
  if (!dateStr || !timeStr) return null;

  const dateMatch = DATE_PATTERN.exec(dateStr);
  if (!dateMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null;
  }

  const timeMatch = TIME_PATTERN.exec(String(timeStr).trim());
  if (!timeMatch) return null;

  const hours = Number(timeMatch[1]);
  const minutes = timeMatch[2] !== undefined ? Number(timeMatch[2]) : 0;
  const seconds = timeMatch[3] !== undefined ? Number(timeMatch[3]) : 0;

  if (hours > 23 || minutes > 59 || seconds > 59) {
    return null;
  }

  // Compute UTC instant: Date.UTC(Dhaka wall-clock components) - 6 hours
  const utcMs = Date.UTC(year, month - 1, day, hours, minutes, seconds) - DHAKA_OFFSET_MS;
  return utcMs;
}

/**
 * Evaluates whether a booking is eligible for rescheduling under the 24-hour rule.
 * An optional `nowMs` can be passed for deterministic testing.
 * Policy: leadTime >= 24 hours (inclusive).
 */
export function isEligibleForReschedule(
  bookingDate: string | Date | undefined | null,
  timeStr: string | undefined | null,
  nowMs: number = Date.now()
): boolean {
  const startMs = parseDhakaExamStartMs(bookingDate, timeStr);
  if (startMs === null) return false;
  return startMs - nowMs >= MIN_RESCHEDULE_NOTICE_MS;
}

/**
 * Formats a Dhaka date into human-readable e.g. "7 November, 2026".
 */
export function formatDhakaExamDate(bookingDate: string | Date | undefined | null): string {
  const dateStr = toDhakaDateString(bookingDate);
  if (!dateStr) return "N/A";

  const dateMatch = DATE_PATTERN.exec(dateStr);
  if (!dateMatch) return "N/A";

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return `${day} ${monthNames[month - 1]}, ${year}`;
}

/**
 * Formats a wall-clock time string (HH:mm) into 12-hour format e.g. "10:00 AM".
 */
export function formatExamTime(timeString?: string | null): string {
  if (!timeString) return "N/A";
  const [hourStr, minuteStr] = timeString.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return "Invalid Time";
  }
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  const displayMinute = minute.toString().padStart(2, "0");
  return `${displayHour}:${displayMinute} ${ampm}`;
}


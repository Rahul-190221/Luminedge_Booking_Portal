// Formats a Date as "DD Month, YYYY" (e.g. "04 September, 2026") — the
// en-US long-month rendering with day and month swapped. Callers construct
// the Date themselves (each may anchor a YMD-only string to local or UTC
// midnight differently to avoid an off-by-one day), this only formats it.
export function formatPrettyDate(date: Date): string {
  return date
    .toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" })
    .replace(/^(\w+)\s(\d+),\s(\d+)$/, "$2 $1, $3");
}

// Formats a "HH:mm" | "HH:mm:ss" 24h time string as 12h "h:mm AM/PM".
// `fallback` is returned as-is when `time` can't be parsed (defaults to
// echoing the original string back, unchanged).
export function formatTimeToPeriod(time: string, fallback: string = time): string {
  if (!time || typeof time !== "string" || !time.includes(":")) return fallback;
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || "0", 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return fallback;
  const period = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
}

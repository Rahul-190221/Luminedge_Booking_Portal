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

import { authFetch } from "@/lib/http";

export type NormalizedTimeSlot = {
  slotId: string;
  startTime: string;
  endTime: string;
  totalSlot?: number;
  slot?: number;
};

export type NormalizedSchedule = {
  _id?: string;
  id?: string;
  name: string;
  testType: string;
  startDate: string;
  status?: string;
  timeSlots: NormalizedTimeSlot[];
  [x: string]: any;
};

const toYMD = (value: unknown): string => {
  if (!value) return "";

  if (value instanceof Date) {
    return Number.isNaN(+value) ? "" : value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(+d) ? "" : d.toISOString().slice(0, 10);
  }

  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      const [dd, mm, yyyy] = s.split("-");
      return `${yyyy}-${mm}-${dd}`;
    }
    const d = new Date(s);
    return Number.isNaN(+d) ? "" : d.toISOString().slice(0, 10);
  }

  if (typeof value === "object") {
    const obj: any = value;
    if (typeof obj.$date === "string") return toYMD(obj.$date);
    if (typeof obj.seconds === "number") return toYMD(obj.seconds * 1000);
    if (typeof obj.toDate === "function") return toYMD(obj.toDate());
  }

  return "";
};

const extractScheduleRows = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.schedules)) return payload.schedules;
  return [];
};

const pickTimeSlots = (row: any): any[] => {
  if (Array.isArray(row?.timeSlots)) return row.timeSlots;
  if (Array.isArray(row?.timeslots)) return row.timeslots;
  return [];
};

export type NormalizeScheduleRowOptions = {
  // When true, a row with no resolvable testType/type/mode is rejected
  // (returns null) instead of falling back to an empty string. Some pages
  // (e.g. BDM available schedules) previously enforced this via their own
  // local row guard; pass it here instead of re-adding a parallel guard.
  requireTestType?: boolean;
};

export const normalizeScheduleRow = (
  row: any,
  options?: NormalizeScheduleRowOptions
): NormalizedSchedule | null => {
  if (!row || typeof row !== "object") return null;

  const startDate = toYMD(row.startDate ?? row.date ?? row.examDate);
  const timeSlots = pickTimeSlots(row);
  const id = row._id ?? row.id;
  const testType = row.testType ?? row.type ?? row.mode ?? "";

  // Only require an actual timeSlots/timeslots array on the row, not that it's
  // non-empty — an empty array is still a real (if slot-less) schedule.
  const hasTimeSlotsField = Array.isArray(row?.timeSlots) || Array.isArray(row?.timeslots);

  if (!id || !startDate || !hasTimeSlotsField) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("normalizeScheduleRow: dropping row that failed validation", {
        reason: !id ? "missing _id/id" : !startDate ? "missing/unparseable startDate" : "missing timeSlots/timeslots array",
        row,
      });
    }
    return null;
  }
  if (options?.requireTestType && !testType) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("normalizeScheduleRow: dropping row with no resolvable testType", { row });
    }
    return null;
  }

  return {
    ...row,
    _id: id,
    id,
    name: row.name ?? row.courseName ?? row.title ?? "",
    testType,
    startDate,
    status: row.status ?? "",
    timeSlots: timeSlots.map((ts: any) => ({
      slotId: String(ts?.slotId ?? ""),
      startTime: String(ts?.startTime ?? ""),
      endTime: String(ts?.endTime ?? ""),
      totalSlot: ts?.totalSlot ?? null,
      slot: ts?.slot != null ? Number(ts.slot) || 0 : undefined,
    })),
  };
};

// /api/v1/admin/get-schedules is paginated server-side (default page=1&limit=100,
// capped at 500/page) and sorted by _id descending, so a single unparameterized
// request silently drops any schedule older than the newest page-worth of rows
// once the collection grows past the limit. Page through until a page comes back
// shorter than the requested limit — do NOT rely solely on the response's `total`
// field to decide when to stop, since a response without a numeric `total` would
// make the loop exit after page 1 and silently drop every older row. `total` is
// only used opportunistically, to skip a redundant extra request once the row
// count reaches it.
//
// A non-OK response is normally treated as a genuine failure and throws
// immediately. The one exception: if the previous page came back exactly
// `limit`-sized with no numeric `total` ever reported, the loop has no way to
// know it reached the end short of issuing one more "confirming" request past
// the last real page. We assume (unverified against the live backend, which
// requires an authenticated session to probe) that the backend returns 200
// with an empty `schedules` array in that case, but if it instead responds
// non-2xx, we treat that specific request as "end of pagination" rather than
// discarding every row already collected — a boundary quirk shouldn't fail
// the whole list. Any other non-2xx (page 1, or after a short/known-complete
// page) still throws; a 401/403/5xx or network error there must never be
// swallowed as if it meant "no more data". A hard page-count cap guards
// against a misbehaving backend that never returns a short/empty page.
export const fetchAllSchedules = async (
  endpoint = "/api/v1/admin/get-schedules",
  options?: NormalizeScheduleRowOptions
): Promise<NormalizedSchedule[]> => {
  const limit = 500;
  const maxPages = 200; // safety cap (100k rows) against a misbehaving backend
  const rows: any[] = [];
  let page = 1;
  let total: number | undefined;
  let lastPageWasFull = false;

  while (page <= maxPages) {
    const separator = endpoint.includes("?") ? "&" : "?";
    const res = await authFetch(`${endpoint}${separator}page=${page}&limit=${limit}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      if (lastPageWasFull && total === undefined && rows.length > 0) {
        console.warn(
          `fetchAllSchedules: confirming request for page ${page} returned HTTP ${res.status}; treating as end of pagination (${rows.length} row(s) already collected).`
        );
        break;
      }
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const pageRows = extractScheduleRows(data);
    rows.push(...pageRows);
    if (typeof data?.total === "number") total = data.total;
    lastPageWasFull = pageRows.length === limit;

    if (pageRows.length < limit) break;
    if (total !== undefined && rows.length >= total) break;
    page += 1;
  }

  if (page > maxPages) {
    console.error(
      `fetchAllSchedules: hit the ${maxPages}-page safety cap (${rows.length} row(s) fetched) without reaching the end of results`
    );
    throw new Error(`fetchAllSchedules: exceeded maximum page limit of ${maxPages}`);
  }

  return rows
    .map((row) => normalizeScheduleRow(row, options))
    .filter((row): row is NormalizedSchedule => Boolean(row));
};

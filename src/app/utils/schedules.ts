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

export const normalizeScheduleRow = (row: any): NormalizedSchedule | null => {
  if (!row || typeof row !== "object") return null;

  const startDate = toYMD(row.startDate ?? row.date ?? row.examDate);
  const timeSlots = pickTimeSlots(row);
  const id = row._id ?? row.id;

  // Only require an actual timeSlots/timeslots array on the row, not that it's
  // non-empty — an empty array is still a real (if slot-less) schedule.
  const hasTimeSlotsField = Array.isArray(row?.timeSlots) || Array.isArray(row?.timeslots);

  if (!id || !startDate || !hasTimeSlotsField) return null;

  return {
    ...row,
    _id: id,
    id,
    name: row.name ?? row.courseName ?? row.title ?? "",
    testType: row.testType ?? row.type ?? row.mode ?? "",
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
// only used opportunistically to skip a redundant extra request when the row
// count lands exactly on a page boundary; a page-2+ request failing (e.g. an
// out-of-range page) just ends pagination instead of throwing, and a hard cap
// on page count guards against a backend that never returns a short/empty page.
export const fetchAllSchedules = async (
  endpoint = "/api/v1/admin/get-schedules"
): Promise<NormalizedSchedule[]> => {
  const limit = 500;
  const maxPages = 200; // safety cap (100k rows) against a misbehaving backend
  const rows: any[] = [];
  let page = 1;

  while (page <= maxPages) {
    const separator = endpoint.includes("?") ? "&" : "?";
    const res = await authFetch(`${endpoint}${separator}page=${page}&limit=${limit}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      if (page === 1) throw new Error(`HTTP ${res.status}`);
      break;
    }

    const data = await res.json();
    const pageRows = extractScheduleRows(data);
    rows.push(...pageRows);

    const total = typeof data?.total === "number" ? data.total : undefined;
    if (pageRows.length < limit) break;
    if (total !== undefined && rows.length >= total) break;
    page += 1;
  }

  return rows
    .map(normalizeScheduleRow)
    .filter((row): row is NormalizedSchedule => Boolean(row));
};

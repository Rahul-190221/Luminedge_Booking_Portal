"use client";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

// ---------- Types ----------
type TimeSlot = {
  slotId: string;
  startTime: string;
  endTime: string;
  totalSlot?: number | null;
  slot?: number; // available seats as number after normalization
};

type Schedule = {
  _id?: string;          // backend _id
  id?: string;           // convenience
  name: string;          // course name (IELTS/GRE/etc.)
  testType: string;      // Paper-Based / Computer-Based
  startDate: string;     // normalized "YYYY-MM-DD"
  status?: string;
  timeSlots: TimeSlot[];
  [x: string]: any;
};

// ---------- Helpers ----------
const toYMD = (v: unknown): string => {
  if (!v) return "";
  try {
    if (v instanceof Date) {
      return isNaN(+v) ? "" : v.toISOString().slice(0, 10);
    }
    if (typeof v === "number") {
      const d = new Date(v);
      return isNaN(+d) ? "" : d.toISOString().slice(0, 10);
    }
    if (typeof v === "string") {
      const s = v.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // already Y-M-D
      if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
        const [dd, mm, yyyy] = s.split("-");
        return `${yyyy}-${mm}-${dd}`;
      }
      const d = new Date(s);
      return isNaN(+d) ? "" : d.toISOString().slice(0, 10);
    }
    if (v && typeof v === "object") {
      const o: any = v;
      if (o.$date) {
        const d = new Date(o.$date);
        return isNaN(+d) ? "" : d.toISOString().slice(0, 10);
      }
      if (typeof o.seconds === "number") {
        const d = new Date(o.seconds * 1000);
        return isNaN(+d) ? "" : d.toISOString().slice(0, 10);
      }
      if (typeof o.toDate === "function") {
        const d = o.toDate();
        if (d instanceof Date && !isNaN(+d)) return d.toISOString().slice(0, 10);
      }
    }
  } catch {}
  return "";
};

const toEpochUTC00 = (ymd: string): number =>
  ymd ? Date.parse(`${ymd}T00:00:00Z`) : Number.NaN;

// local-timezone “today” in YYYY-MM-DD (avoids UTC off-by-one)
const todayLocalYMD = (): string => {
  const d = new Date();
  const tzAdj = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tzAdj.toISOString().slice(0, 10);
};

function formatTime(time: string) {
  if (!time || typeof time !== "string" || !time.includes(":")) return "Invalid time";
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (isNaN(h) || isNaN(m)) return "Invalid time";
  const period = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${m.toString().padStart(2, "0")} ${period}`;
}

// ---------- Component ----------
function AvailableSchedulesPage() {
  const router = useRouter();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [schedulesPerPage, setSchedulesPerPage] = useState<number>(20);

  // Filters
  const [testTypeFilter, setTestTypeFilter] = useState<string>("");      // course name (IELTS/GRE/...)
  const [scheduletestType, setscheduletestType] = useState<string>("");  // Paper-Based/Computer-Based
  const [dateSortOrder, setDateSortOrder] = useState<string>("ascending");
  const [dateFilter, setDateFilter] = useState<string>("upcoming");       // all/past/upcoming
  const [startDateFilter, setStartDateFilter] = useState<string>("");

  // Fetch + normalize
  const fetchSchedules = async () => {
    try {
      const res = await fetch("https://luminedge-server.vercel.app/api/v1/admin/get-schedules", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Accept array or {schedules: [...]}
      const raw: any[] = Array.isArray(data) ? data : Array.isArray(data?.schedules) ? data.schedules : [];

      // Keep only schedule-like rows (ignore bookings or other shapes)
      const onlySchedules = raw.filter((x) => {
        if (!x || typeof x !== "object") return false;
        const ymd = toYMD((x as any).startDate ?? (x as any).date ?? (x as any).examDate);
        return !!ymd && Array.isArray((x as any).timeSlots) && (x as any).timeSlots.length > 0;
      });

      const normalized: Schedule[] = onlySchedules.map((s: any) => ({
        _id: s._id ?? s.id,
        id: s._id ?? s.id,
        name: s.name ?? s.courseName ?? s.title ?? "",
        testType: s.testType ?? s.type ?? s.mode ?? "",
        startDate: toYMD(s.startDate ?? s.date ?? s.examDate), // YYYY-MM-DD
        status: s.status ?? "",
        timeSlots: (Array.isArray(s.timeSlots) ? s.timeSlots : []).map((ts: any) => ({
          slotId: String(ts.slotId ?? ""),
          startTime: String(ts.startTime ?? ""),
          endTime: String(ts.endTime ?? ""),
          totalSlot: ts.totalSlot ?? null,
          slot: Number(ts.slot) || 0,
        })),
      }));

      setSchedules(normalized);
    } catch (err) {
      console.error("Error fetching schedules:", err);
      toast.error("Error fetching schedules");
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  // Reset page when filters/page-size change
  useEffect(() => {
    setCurrentPage(1);
  }, [testTypeFilter, scheduletestType, dateFilter, startDateFilter, schedulesPerPage]);

  // Filter
  const filteredSchedules = useMemo(() => {
    const today = todayLocalYMD();

    return schedules.filter((s) => {
      const scheduleDate = s.startDate; // already normalized

      const isCourseMatch = !testTypeFilter || s.name === testTypeFilter;
      const isScheduleTypeMatch = !scheduletestType || s.testType === scheduletestType;
      const isStartDateMatch = !startDateFilter || scheduleDate === startDateFilter;

      let isDateMatch = true;
      if (dateFilter === "past") isDateMatch = scheduleDate < today;
      else if (dateFilter === "upcoming") isDateMatch = scheduleDate >= today;

      return isCourseMatch && isScheduleTypeMatch && isDateMatch && isStartDateMatch;
    });
  }, [schedules, testTypeFilter, scheduletestType, dateFilter, startDateFilter]);

  // Sort
  const sortedSchedules = useMemo(() => {
    const dir = dateSortOrder === "ascending" ? 1 : -1;
    return [...filteredSchedules].sort((a, b) => {
      const ea = toEpochUTC00(a.startDate);
      const eb = toEpochUTC00(b.startDate);
      if (isNaN(ea) && isNaN(eb)) return 0;
      if (isNaN(ea)) return 1;
      if (isNaN(eb)) return -1;
      return (ea - eb) * dir;
    });
  }, [filteredSchedules, dateSortOrder]);

  // Pagination
  const indexOfLast = currentPage * schedulesPerPage;
  const indexOfFirst = indexOfLast - schedulesPerPage;
  const currentSchedules = sortedSchedules.slice(indexOfFirst, indexOfLast);

  // Delete
  const deleteSchedule = async (id: string) => {
    try {
      const res = await fetch(
        `https://luminedge-server.vercel.app/api/v1/admin/delete-schedule/${id}`,
        { method: "DELETE", headers: { "Content-Type": "application/json" } }
      );
      const result = await res.json();
      if (!res.ok || !result?.success) {
        throw new Error(result?.message || "Failed to delete schedule");
      }
      toast.success("Schedule deleted successfully");
      setSchedules((prev) => prev.filter((sch) => String(sch._id ?? sch.id) !== id));
    } catch (e: any) {
      toast.error(e?.message || "Error deleting schedule");
      console.error("Error deleting schedule:", e);
    }
  };

  return (
    <div className="p-1 sm:p-3 w-full sm:max-w-[100%] mx-auto bg-[#ffffff] text-[#00000f] shadow-1xl rounded-2xl border border-[#00000f]/10">
      <motion.h1
        className="text-2xl font-semibold mt-0 mb-0 text-[#00000f] p-1 rounded"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        Available Schedules
      </motion.h1>

      {/* Filters */}
      <div className="bg-gray-100 p-2 h-22 mb-0 text-[#00000f]">
        <h3><b>Filter by</b></h3>
        <div className="my-4 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 text-sm">
          <select
            value={testTypeFilter}
            onChange={(e) => setTestTypeFilter(e.target.value)}
            className="px-2 py-1 border rounded w-full sm:w-auto"
          >
            <option value="">All Course Types</option>
            <option value="GRE">GRE</option>
            <option value="IELTS">IELTS</option>
            <option value="TOEFL">TOEFL</option>
            <option value="Pearson PTE">Pearson PTE</option>
          </select>

          <select
            value={scheduletestType}
            onChange={(e) => setscheduletestType(e.target.value)}
            className="px-2 py-1 border rounded w-full sm:w-auto"
          >
            <option value="">All Test Types</option>
            <option value="Paper-Based">Paper-Based</option>
            <option value="Computer-Based">Computer-Based</option>
          </select>

          <select
            value={dateSortOrder}
            onChange={(e) => setDateSortOrder(e.target.value)}
            className="px-2 py-1 border rounded w-full sm:w-auto"
          >
            <option value="ascending">Start Date Ascending</option>
            <option value="descending">Start Date Descending</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-2 py-1 border rounded w-full sm:w-auto"
          >
            <option value="all">All Schedules</option>
            <option value="past">Past</option>
            <option value="upcoming">Upcoming</option>
          </select>

          <input
            type="date"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
            className="px-2 py-1 border rounded w-full sm:w-auto"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table-auto w-full border-collapse">
          <thead>
            <tr className="bg-[#face39]">
              <th className="px-4 py-2 text-left">List</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Test Type</th>
              <th className="px-4 py-2 text-left">Exam Date</th>
              <th className="px-4 py-2 text-left">Exam Time</th>
              <th className="px-4 py-2 text-left">Total Seats</th>
              <th className="px-4 py-2 text-left">Available Seats</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentSchedules.map((schedule, idx) => (
              <tr key={String(schedule._id ?? schedule.id)} className="border-b">
                <td className="px-4 py-2 text-sm">{indexOfFirst + idx + 1}</td>
                <td className="px-4 py-2">{schedule.name}</td>
                <td className="px-4 py-2">{schedule.testType}</td>
                <td className="px-4 py-2">
                  {new Date(`${schedule.startDate}T00:00:00`)
                    .toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" })
                    .replace(/^(\w+) (\d+), (\d+)$/, "$2 $1, $3")}
                </td>
                <td className="px-4 py-2">
                  {Array.isArray(schedule.timeSlots) && schedule.timeSlots.length > 0 ? (
                    schedule.timeSlots.map((slot) => (
                      <div key={slot.slotId}>
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                      </div>
                    ))
                  ) : (
                    <span>N/A</span>
                  )}
                </td>
                <td className="px-4 py-2">{schedule.timeSlots?.[0]?.totalSlot ?? "N/A"}</td>
                <td className="px-4 py-2">{schedule.timeSlots?.[0]?.slot ?? "N/A"}</td>
                <td className="px-4 py-2 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-6">
                  <button
                    onClick={() => router.push(`/admin/${schedule._id ?? schedule.id}`)}
                    className="px-3 py-1 bg-[#00000f] text-white rounded font-medium shadow-sm hover:bg-[#face39] hover:text-[#00000f] hover:font-semibold hover:shadow-md hover:scale-105 transition-all duration-300 ease-in-out"
                  >
                    View Bookings
                  </button>

                  <button
                    onClick={() =>
                      toast(
                        (t) => (
                          <div className="bg-gray-100 p-4 rounded shadow-lg text-black">
                            <p className="text-sm">
                              Are you sure you want to delete the schedule on{" "}
                              {new Date(`${schedule.startDate}T00:00:00`)
                                .toLocaleDateString("en-US", {
                                  month: "long",
                                  day: "2-digit",
                                  year: "numeric",
                                })
                                .replace(/^(\w+) (\d+), (\d+)$/, "$2 $1, $3")}
                              ?
                            </p>
                            <div className="mt-4 flex justify-center gap-4">
                              <button
                                className="px-4 py-2 bg-green-500 hover:bg-green-700 text-white font-bold rounded-lg"
                                onClick={() => {
                                  deleteSchedule(String(schedule._id ?? schedule.id));
                                  toast.dismiss(t.id);
                                }}
                              >
                                Confirm
                              </button>
                              <button
                                className="px-4 py-2 bg-red-500 hover:bg-red-700 text-white font-semibold rounded-lg"
                                onClick={() => toast.dismiss(t.id)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ),
                        { id: `delete-${schedule._id ?? schedule.id}`, duration: 5000 }
                      )
                    }
                    className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {currentSchedules.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-gray-600" colSpan={8}>
                  No schedules match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 space-y-4 sm:space-y-0">
        <div>
          <label htmlFor="schedulesPerPage" className="mr-2">Schedules per page:</label>
          <select
            id="schedulesPerPage"
            value={schedulesPerPage}
            onChange={(e) => setSchedulesPerPage(Number(e.target.value))}
            className="px-2 py-1 border rounded"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
          </select>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="mx-2">
            Page {currentPage} / {Math.max(1, Math.ceil(filteredSchedules.length / schedulesPerPage))}
          </span>
          <button
            onClick={() => setCurrentPage((p) => (indexOfLast >= filteredSchedules.length ? p : p + 1))}
            disabled={indexOfLast >= filteredSchedules.length}
            className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default AvailableSchedulesPage;

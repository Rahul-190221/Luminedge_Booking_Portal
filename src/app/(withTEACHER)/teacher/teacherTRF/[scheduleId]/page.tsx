"use client";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

// ---------- Types ----------
type TimeSlot = {
  slotId: string;
  startTime: string;
  endTime: string;
  totalSlot?: number;
  slot?: string; // available seats
};

type Schedule = {
  _id?: string;
  id?: string;
  name: string;
  testType: string;
  startDate?: unknown; // API can vary; we normalize
  status?: string;
  timeSlots?: TimeSlot[];
  [x: string]: any;
};

// ---------- Dhaka helpers ----------
const ymdDhaka = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d); // YYYY-MM-DD

// Normalize many shapes to YYYY-MM-DD (Asia/Dhaka)
const toYMD = (v: unknown): string | null => {
  if (!v) return null;

  if (typeof v === "string") {
    const m = v.match(/^(\d{4}-\d{2}-\d{2})/); // "YYYY-MM-DD" or ISO prefix
    if (m) return m[1];
    const d = new Date(v);
    return isNaN(+d) ? null : ymdDhaka(d);
  }
  if (typeof v === "number") {
    const d = new Date(v);
    return isNaN(+d) ? null : ymdDhaka(d);
  }
  if (v instanceof Date) return isNaN(+v) ? null : ymdDhaka(v);
  if (typeof v === "object" && v && "$date" in (v as any)) {
    const d = new Date((v as any).$date);
    return isNaN(+d) ? null : ymdDhaka(d);
  }
  return null;
};

// Pick a start date from various possible shapes
const getStartDateYMD = (s: any): string | null =>
  toYMD(
    s?.startDate ??
      s?.examDate ??
      s?.date ??
      s?.start?.date ??
      s?.start?.dateTime ??
      s?.schedule?.startDate
  );

const displayDate = (v: unknown): string => {
  const ymd = toYMD(v);
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(dt);
};

const safeRowKey = (s: Schedule, fallback: number) =>
  s._id ?? s.id ?? `${s.name}-${getStartDateYMD(s) ?? "na"}-${fallback}`;

// Consider it a schedule only if it has a usable date and some identifying fields
const isScheduleLike = (x: any): boolean => {
  if (!x || typeof x !== "object") return false;
  const ymd = getStartDateYMD(x);
  const hasNameOrType = typeof x?.name === "string" || typeof x?.testType === "string";
  return !!ymd && hasNameOrType;
};

// ---------- Component ----------
function TrfAvailableSchedulesBDMPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [schedulesPerPage, setSchedulesPerPage] = useState<number>(20);

  // UI controls (some are enforced/disabled)
  const [testTypeFilter] = useState<string>("IELTS"); // enforced, UI locked
  const [dateSortOrder, setDateSortOrder] = useState<"ascending" | "descending">("descending");
  const [scheduletestType, setscheduletestType] = useState<string>(""); // Paper/Computer
  const [dateFilter] = useState<"all" | "past" | "upcoming">("past"); // enforced, UI locked
  const [startDateFilter, setStartDateFilter] = useState<string>("");

  // Fetch schedules once on mount
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const response = await fetch(
          "https://luminedge-server.vercel.app/api/v1/admin/get-schedules"
        );
        const raw = await response.json();
        const cleaned = Array.isArray(raw) ? raw.filter(isScheduleLike) : [];
        setSchedules(cleaned);
      } catch (error) {
        toast.error("Error fetching schedules");
        console.error("Error fetching schedules:", error);
      }
    };

    fetchSchedules();
  }, []);

  // Derived data (no hooks needed)
  const todayYmd = ymdDhaka(new Date());

  const filteredSchedules = schedules.filter((schedule) => {
    const ymd = getStartDateYMD(schedule);
    if (!ymd) return false;

    // Enforce IELTS by name (case-insensitive, partial match)
    const isIELTS = String(schedule.name || "").toLowerCase().includes("ielts");
    if (testTypeFilter === "IELTS" && !isIELTS) return false;

    // Enforce date filter: currently locked to past/today
    if (dateFilter === "past") {
      if (ymd > todayYmd) return false; // hide future
    } else if (dateFilter === "upcoming") {
      if (ymd < todayYmd) return false; // hide past
    }

    // Optional user filters (within enforced subset)
    const typeOk = !scheduletestType || schedule.testType === scheduletestType;
    const startOk = !startDateFilter || ymd === startDateFilter;

    return typeOk && startOk;
  });

  const sortedSchedules = [...filteredSchedules].sort((a, b) => {
    const ay = getStartDateYMD(a) ?? "";
    const by = getStartDateYMD(b) ?? "";
    if (ay === by) return 0;
    const cmp = ay < by ? -1 : 1;
    return dateSortOrder === "ascending" ? cmp : -cmp;
  });

  const indexOfLastSchedule = currentPage * schedulesPerPage;
  const indexOfFirstSchedule = indexOfLastSchedule - schedulesPerPage;
  const currentSchedules = sortedSchedules.slice(indexOfFirstSchedule, indexOfLastSchedule);

  function formatTime(time: string) {
    const [hour, minute] = (time ?? "").split(":").map(Number);
    const h = Number.isFinite(hour) ? (hour as number) : 0;
    const m = Number.isFinite(minute) ? (minute as number) : 0;
    const period = h >= 12 ? "PM" : "AM";
    const formattedHour = h % 12 || 12;
    return `${formattedHour}:${m.toString().padStart(2, "0")} ${period}`;
  }

  return (
    <div className="p-0 sm:p-3 w-full sm:max-w-[100%] mx-auto bg-[#ffffff] text-[#00000f] shadow-1xl rounded-2xl border border-[#00000f]/10">
      <motion.h1
        className="text-2xl font-semibold mt-0 mb-0 text-[#00000f]  p-2 rounded"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        Available Schedules
      </motion.h1>

      <div className="bg-gray-100 p-2 h-22 mb-0 text-[#00000f]">
        <h3 className="font-semibold">Filter by</h3>
        <div className="my-4 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 text-sm">
          {/* Locked to IELTS */}
          <select
            value={testTypeFilter}
            onChange={() => {}}
            className="px-2 py-1 border rounded w-full sm:w-auto opacity-70 cursor-not-allowed"
            disabled
            title="Locked to IELTS (enforced)"
          >
            <option value="IELTS">IELTS (enforced)</option>
          </select>

          <select
            value={scheduletestType}
            onChange={(e) => {
              setCurrentPage(1);
              setscheduletestType(e.target.value);
            }}
            className="px-2 py-1 border rounded w-full sm:w-auto"
          >
            <option value="">All Test Types</option>
            <option value="Paper-Based">Paper-Based</option>
            <option value="Computer-Based">Computer-Based</option>
          </select>

          <select
            value={dateSortOrder}
            onChange={(e) => {
              setCurrentPage(1);
              setDateSortOrder(e.target.value as "ascending" | "descending");
            }}
            className="px-2 py-1 border rounded w-full sm:w-auto"
          >
            <option value="ascending">Start Date Ascending</option>
            <option value="descending">Start Date Descending</option>
          </select>

          {/* Locked to past/today */}
          <select
            value={dateFilter}
            onChange={() => {}}
            className="px-2 py-1 border rounded w-full sm:w-auto opacity-70 cursor-not-allowed"
            disabled
            title="Locked to Past/Today (enforced)"
          >
            <option value="past">Past/Today (enforced)</option>
          </select>

          <input
            type="date"
            value={startDateFilter}
            onChange={(e) => {
              setCurrentPage(1);
              setStartDateFilter(e.target.value);
            }}
            className="px-2 py-1 border rounded w-full sm:w-auto"
          />
        </div>
      </div>

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
              <tr key={safeRowKey(schedule, idx)} className="border-b">
                <td className="px-4 py-2 text-sm">{indexOfFirstSchedule + idx + 1}</td>
                <td className="px-4 py-2">{schedule.name}</td>
                <td className="px-4 py-2">{schedule.testType}</td>
                <td className="px-4 py-2">{displayDate(getStartDateYMD(schedule))}</td>
                <td className="px-4 py-2">
                  {schedule.timeSlots?.length
                    ? schedule.timeSlots.map((slot, i) => (
                        <div
                          key={`${schedule._id ?? schedule.id ?? idx}-slot-${slot.slotId ?? i}`}
                        >
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </div>
                      ))
                    : "—"}
                </td>
                <td className="px-4 py-2">{schedule.timeSlots?.[0]?.totalSlot ?? "N/A"}</td>
                <td className="px-4 py-2">{schedule.timeSlots?.[0]?.slot ?? "N/A"}</td>
                <td className="px-4 py-2 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <button
                    onClick={() =>
                      router.push(`/teacher/teacherTRF/${schedule?._id ?? schedule?.id}`)
                    }
                    className="px-5 py-2 rounded-xl bg-[#00000f] text-white font-medium shadow-md hover:bg-[#face39] hover:text-[#00000f] hover:font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300 ease-in-out"
                  >
                    View Bookings
                  </button>
                </td>
              </tr>
            ))}
            {currentSchedules.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-500 text-sm">
                  No IELTS schedules for today/past.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 space-y-4 sm:space-y-0">
        <div>
          <label htmlFor="schedulesPerPage" className="mr-2">
            Schedules per page:
          </label>
          <select
            id="schedulesPerPage"
            value={schedulesPerPage}
            onChange={(e) => {
              setSchedulesPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
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
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="mx-2">
            Page {currentPage} /{" "}
            {Math.max(1, Math.ceil(filteredSchedules.length / schedulesPerPage))}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => prev + 1)}
            disabled={indexOfLastSchedule >= filteredSchedules.length}
            className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrfAvailableSchedulesBDMPage;

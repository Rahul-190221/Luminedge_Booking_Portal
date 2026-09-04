"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { API_BASE } from "@/lib/config";
import { fetchAllSchedules, NormalizedSchedule } from "@/app/utils/schedules";
import { formatTimeToPeriod, formatPrettyDate } from "@/app/utils/time";

type ScheduleDoc = NormalizedSchedule;

const prettyDate = (ymd: string) => {
  // ymd is "YYYY-MM-DD"
  return formatPrettyDate(new Date(ymd + "T00:00:00Z"));
};

const to12h = (time: string) => formatTimeToPeriod(time);

export default function AvailableSchedulesBDMPage() {
  const router = useRouter();

  // data
  const [schedules, setSchedules] = useState<ScheduleDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // ui state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(20);

  // filters
  const [courseFilter, setCourseFilter] = useState<string>(""); // GRE / IELTS / TOEFL / Pearson PTE (from `name`)
  const [modeFilter, setModeFilter] = useState<string>("");     // Paper-Based / Computer-Based
  const [dateFilter, setDateFilter] = useState<"all" | "past" | "upcoming">("upcoming");
  const [dateSort, setDateSort] = useState<"ascending" | "descending">("ascending");
  const [exactDate, setExactDate] = useState<string>("");        // YYYY-MM-DD

  // fetch once
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const normalized = await fetchAllSchedules(`${API_BASE}/api/v1/admin/get-schedules`, {
          requireTestType: true,
        });
        setSchedules(normalized);
      } catch (e) {
        console.error(e);
        toast.error("Error fetching schedules");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // derive unique course names (from `name`) for the dropdown
  const courseOptions = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach((s) => s.name && set.add(s.name));
    return Array.from(set).sort();
  }, [schedules]);

  // filter
  const filtered = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return schedules.filter((s) => {
      const byCourse = !courseFilter || (s.name || "") === courseFilter;
      const byMode = !modeFilter || s.testType === modeFilter;

      let byWhen = true;
      if (dateFilter === "past") byWhen = s.startDate < today;
      if (dateFilter === "upcoming") byWhen = s.startDate >= today;

      const byExact = !exactDate || s.startDate === exactDate;

      return byCourse && byMode && byWhen && byExact;
    });
  }, [schedules, courseFilter, modeFilter, dateFilter, exactDate]);

  // sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      if (a.startDate === b.startDate) return 0;
      const cmp = a.startDate < b.startDate ? -1 : 1;
      return dateSort === "ascending" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, dateSort]);

  // paginate
  const indexLast = currentPage * perPage;
  const indexFirst = indexLast - perPage;
  const pageRows = sorted.slice(indexFirst, indexLast);

  return (
    <div className="p-0 sm:p-3 w-full sm:max-w-[100%] mx-auto bg-white text-[#00000f] shadow-1xl rounded-2xl border border-[#00000f]/10">
      <motion.h1
        className="text-2xl font-semibold mt-0 mb-0 text-[#00000f] p-2 rounded"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        Available Schedules
      </motion.h1>

      <div className="bg-gray-100 p-2 h-22 mb-0 text-[#00000f]">
        <h3><b>Filter by</b></h3>
        <div className="my-4 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 text-sm">
          <select
            aria-label="Course type filter"
            value={courseFilter}
            onChange={(e) => { setCourseFilter(e.target.value); setCurrentPage(1); }}
            className="px-2 py-1 border rounded w-full sm:w-auto"
          >
            <option value="">All Course Types</option>
            {courseOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            aria-label="Test type filter"
            value={modeFilter}
            onChange={(e) => { setModeFilter(e.target.value); setCurrentPage(1); }}
            className="px-2 py-1 border rounded w-full sm:w-auto"
          >
            <option value="">All Test Types</option>
            <option value="Paper-Based">Paper-Based</option>
            <option value="Computer-Based">Computer-Based</option>
          </select>

          <select
            aria-label="Date sort order"
            value={dateSort}
            onChange={(e) => setDateSort(e.target.value as "ascending" | "descending")}
            className="px-2 py-1 border rounded w-full sm:w-auto"
          >
            <option value="ascending">Start Date Ascending</option>
            <option value="descending">Start Date Descending</option>
          </select>

          <select
            aria-label="Schedule date filter"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value as "all" | "past" | "upcoming"); setCurrentPage(1); }}
            className="px-2 py-1 border rounded w-full sm:w-auto"
          >
            <option value="all">All Schedules</option>
            <option value="past">Past</option>
            <option value="upcoming">Upcoming</option>
          </select>

          <input
            aria-label="Start date filter"
            type="date"
            value={exactDate}
            onChange={(e) => { setExactDate(e.target.value); setCurrentPage(1); }}
            className="px-2 py-1 border rounded w-full sm:w-auto"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table-auto w-full border-collapse">
          <thead>
            <tr className="bg-[#face39]">
              <th className="px-4 py-2 text-left">#</th>
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
            {loading && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">Loading…</td></tr>
            )}

            {!loading && pageRows.map((s, idx) => (
              <tr key={s._id} className="border-b">
                <td className="px-4 py-2 text-sm">{indexFirst + idx + 1}</td>
                <td className="px-4 py-2">{s.name || "-"}</td>
                <td className="px-4 py-2">{s.testType}</td>
                <td className="px-4 py-2">{prettyDate(s.startDate)}</td>
                <td className="px-4 py-2">
                  {(s.timeSlots ?? []).map((t) => (
                    <div key={t.slotId}>{to12h(t.startTime)} - {to12h(t.endTime)}</div>
                  ))}
                </td>
                <td className="px-4 py-2">{s.timeSlots?.[0]?.totalSlot ?? "N/A"}</td>
                <td className="px-4 py-2">
                  {typeof s.timeSlots?.[0]?.slot === "number" ? s.timeSlots![0]!.slot : "N/A"}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => router.push(`/bdm/${s._id}`)}
                    className="px-5 py-2 rounded-xl bg-[#00000f] text-white font-medium shadow-md hover:bg-[#face39] hover:text-[#00000f] hover:font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300 ease-in-out"
                  >
                    View Bookings
                  </button>
                </td>
              </tr>
            ))}

            {!loading && pageRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                  No schedules match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 space-y-4 sm:space-y-0">
        <div>
          <label htmlFor="perPage" className="mr-2">Schedules per page:</label>
          <select
            id="perPage"
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
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
            Page {currentPage} / {Math.max(1, Math.ceil(filtered.length / perPage))}
          </span>
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={indexLast >= filtered.length}
            className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { API_BASE } from "@/lib/config";
import { fetchAllSchedules, NormalizedSchedule } from "@/app/utils/schedules";
import { formatTimeToPeriod } from "@/app/utils/time";

type Schedule = NormalizedSchedule;

function toDateKey(v: unknown): string {
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return "";
    return s.includes("T") ? s.split("T")[0] : s;
  }
  if (v instanceof Date && !isNaN(+v)) return v.toISOString().slice(0, 10);
  return "";
}

function AvailableSchedulesBDMPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [schedulesPerPage, setSchedulesPerPage] = useState<number>(20);
  const [testTypeFilter, setTestTypeFilter] = useState<string>("");
  const [dateSortOrder, setDateSortOrder] = useState<"ascending" | "descending">("ascending");
  const [scheduletestType, setscheduletestType] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<"all" | "past" | "upcoming">("upcoming");
  const [startDateFilter, setStartDateFilter] = useState<string>("");

  const fetchSchedules = async () => {
    try {
      const normalized = await fetchAllSchedules(`${API_BASE}/api/v1/admin/get-schedules`);
      setSchedules(normalized);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast.error("Error fetching schedules");
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const filteredSchedules = React.useMemo(() => {
    const today = toDateKey(new Date());
    return schedules.filter((schedule) => {
      const scheduleDate = toDateKey(schedule.startDate);
      if (!scheduleDate) return false;

      const isTestTypeMatch = !testTypeFilter || schedule.name === testTypeFilter;
      const isScheduleTypeMatch = !scheduletestType || schedule.testType === scheduletestType;
      const isStartDateMatch = !startDateFilter || scheduleDate === startDateFilter;

      let isDateMatch = true;
      if (dateFilter === "past") isDateMatch = scheduleDate < today;
      else if (dateFilter === "upcoming") isDateMatch = scheduleDate >= today;

      return isTestTypeMatch && isScheduleTypeMatch && isDateMatch && isStartDateMatch;
    });
  }, [schedules, testTypeFilter, scheduletestType, dateFilter, startDateFilter]);

  const sortedSchedules = React.useMemo(() => {
    const copy = [...filteredSchedules];
    copy.sort((a, b) => {
      const ak = toDateKey(a.startDate);
      const bk = toDateKey(b.startDate);
      if (ak === bk) return 0;
      return dateSortOrder === "ascending" ? (ak < bk ? -1 : 1) : (ak > bk ? -1 : 1);
    });
    return copy;
  }, [filteredSchedules, dateSortOrder]);

  const indexOfLastSchedule = currentPage * schedulesPerPage;
  const indexOfFirstSchedule = indexOfLastSchedule - schedulesPerPage;
  const currentSchedules = sortedSchedules.slice(indexOfFirstSchedule, indexOfLastSchedule);

  const formatTime = (time: string) => formatTimeToPeriod(time, "N/A");

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

      {/* Filters */}
      <div className="bg-gray-100 p-2 h-22 mb-0 text-[#00000f]">
        <h3><b>Filter by</b></h3>
        <div className="my-4 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 text-sm">
          <select aria-label="Course type filter" value={testTypeFilter} onChange={(e) => setTestTypeFilter(e.target.value)} className="px-2 py-1 border rounded w-full sm:w-auto">
            <option value="">All Course Types</option>
            <option value="GRE">GRE</option>
            <option value="IELTS">IELTS</option>
            <option value="TOEFL">TOEFL</option>
            <option value="Pearson PTE">Pearson PTE</option>
          </select>

          <select aria-label="Test type filter" value={scheduletestType} onChange={(e) => setscheduletestType(e.target.value)} className="px-2 py-1 border rounded w-full sm:w-auto">
            <option value="">All Test Types</option>
            <option value="Paper-Based">Paper-Based</option>
            <option value="Computer-Based">Computer-Based</option>
          </select>

          <select aria-label="Date sort order" value={dateSortOrder} onChange={(e) => setDateSortOrder(e.target.value as any)} className="px-2 py-1 border rounded w-full sm:w-auto">
            <option value="ascending">Start Date Ascending</option>
            <option value="descending">Start Date Descending</option>
          </select>

          <select aria-label="Schedule date filter" value={dateFilter} onChange={(e) => setDateFilter(e.target.value as any)} className="px-2 py-1 border rounded w-full sm:w-auto">
            <option value="all">All Schedules</option>
            <option value="past">Past</option>
            <option value="upcoming">Upcoming</option>
          </select>

          <input aria-label="Start date filter" type="date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} className="px-2 py-1 border rounded w-full sm:w-auto" />
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
              <tr key={schedule.id} className="border-b">
                <td className="px-4 py-2 text-sm">{indexOfFirstSchedule + idx + 1}</td>
                <td className="px-4 py-2">{schedule.name}</td>
                <td className="px-4 py-2">{schedule.testType}</td>
                <td className="px-4 py-2">
                  {(() => {
                    const dk = toDateKey(schedule.startDate);
                    if (!dk) return "N/A";
                    const d = new Date(dk);
                    if (isNaN(+d)) return "N/A";
                    return d
                      .toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" })
                      .replace(/^(\w+) (\d+), (\d+)$/, "$2 $1, $3");
                  })()}
                </td>
                <td className="px-4 py-2">
                  {schedule.timeSlots.map((slot) => (
                    <div key={slot.slotId}>
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </div>
                  ))}
                </td>
                <td className="px-4 py-2">{schedule.timeSlots[0]?.totalSlot ?? "N/A"}</td>
                <td className="px-4 py-2">{schedule.timeSlots[0]?.slot ?? "N/A"}</td>
                <td className="px-4 py-2 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <button
                    onClick={() => router.push(`/teacher/${schedule.id}`)}
                    className="px-5 py-2 rounded-xl bg-[#00000f] text-white font-medium shadow-md hover:bg-[#face39] hover:text-[#00000f] hover:font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300 ease-in-out"
                  >
                    View Bookings
                  </button>
                </td>
              </tr>
            ))}
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
          <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400">
            Previous
          </button>
          <span className="mx-2">Page {currentPage} / {Math.max(1, Math.ceil(filteredSchedules.length / schedulesPerPage))}</span>
          <button onClick={() => setCurrentPage((prev) => prev + 1)} disabled={indexOfLastSchedule >= filteredSchedules.length} className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
export default AvailableSchedulesBDMPage;

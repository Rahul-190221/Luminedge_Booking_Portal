"use client";
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
// import { FiDownload } from "react-icons/fi"; // Download icon
import { motion } from "framer-motion";



// Define a type for the schedule
type Schedule = {
  [x: string]: any;
  id: string;
  name: string;
  testType: string;
  startDate: string; // ISO string format
  status: string;
  timeSlots: Array<{
    slotId: string;
    startTime: string;
    endTime: string;
    totalSlot?: number; // Optional if not available
    slot: string;
  }>;
};

function TrfAvailableSchedulesBDMPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [schedulesPerPage, setSchedulesPerPage] = useState<number>(20);
  const [testTypeFilter, setTestTypeFilter] = useState<string>("");
  const [dateSortOrder, setDateSortOrder] = useState<string>("ascending");
  const [scheduletestType, setscheduletestType] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("upcoming");
  const [startDateFilter, setStartDateFilter] = useState<string>("");

  const fetchSchedules = async () => {
    try {
      const response = await fetch(
        `https://luminedge-server.vercel.app/api/v1/admin/get-schedules`
      );
      const data = await response.json();
      setSchedules(data);
    } catch (error) {
      toast.error("Error fetching schedules");
      console.error("Error fetching schedules:", error);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);


  const filteredSchedules = React.useMemo(() => {
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Dhaka",
    }); // → Format: YYYY-MM-DD
    
  
    return schedules.filter((schedule: Schedule) => {
      const scheduleDate = schedule.startDate.split("T")[0]; // Extract only the date (YYYY-MM-DD)
  
      // Test type filter
      const isTestTypeMatch = testTypeFilter
        ? schedule.name === testTypeFilter
        : true;
  
      // Schedule type filter
      const isScheduleTypeMatch = scheduletestType
        ? schedule.testType === scheduletestType
        : true;
  
      // Date filter
      let isDateMatch = true;
      switch (dateFilter) {
        case "past":
          isDateMatch = scheduleDate < today; // Dates strictly before today
          break;
        case "upcoming":
          isDateMatch = scheduleDate >= today; // Include today and future dates
          break;
        default: // If "all" or no valid filter
          isDateMatch = true;
          break;
      }
  
      // Start date filter
      const isStartDateMatch = startDateFilter
        ? scheduleDate === startDateFilter
        : true;
  
      return isTestTypeMatch && isScheduleTypeMatch && isDateMatch && isStartDateMatch;
    });
  }, [schedules, testTypeFilter, scheduletestType, dateFilter, startDateFilter]);
  
  const sortedSchedules = React.useMemo(() => {
    let sortableSchedules = [...filteredSchedules];
    sortableSchedules.sort((a, b) => {
      if (a.startDate < b.startDate) {
        return dateSortOrder === "ascending" ? -1 : 1;
      }
      if (a.startDate > b.startDate) {
        return dateSortOrder === "ascending" ? 1 : -1;
      }
      return 0;
    });
    return sortableSchedules;
  }, [filteredSchedules, dateSortOrder]);

  const indexOfLastSchedule = currentPage * schedulesPerPage;
  const indexOfFirstSchedule = indexOfLastSchedule - schedulesPerPage;
  const currentSchedules = sortedSchedules.slice(
    indexOfFirstSchedule,
    indexOfLastSchedule
  );

  function formatTime(time: string) {
    const [hour, minute] = time.split(":").map(Number);
    const period = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minute.toString().padStart(2, "0")} ${period}`;
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
<h3><b>Filter by</b></h3>
        <div className="my-4 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 text-sm">
        <select
          value={testTypeFilter}
          onChange={(e) => setTestTypeFilter(e.target.value)}
          className="px-2 py-1 border rounded w-full sm:w-auto"
        >
            <option value=""><b>All Course Types</b></option>
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
            {currentSchedules.map((schedule, index) => (
              <tr key={schedule.id} className="border-b">
                <td className="px-4 py-2 text-sm">{index + 1}</td>
                <td className="px-4 py-2">{schedule.name}</td>
                <td className="px-4 py-2">{schedule.testType}</td>
                <td className="px-4 py-2">
                  {new Date(schedule.startDate).toLocaleDateString("en-US", {
                    month: "long",
                    day: "2-digit",
                    year: "numeric",
                  }).replace(/^(\w+) (\d+), (\d+)$/, "$2 $1, $3")}
                </td>
                <td className="px-4 py-2">
                  {schedule.timeSlots.map((slot) => (
                    <div key={slot.slotId}>
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </div>
                  ))}
                </td>
                <td className="px-4 py-2">
                  {schedule.timeSlots[0]?.totalSlot || "N/A"}
                </td>
                <td className="px-4 py-2">
                  {schedule.timeSlots[0]?.slot || "N/A"}
                </td>
                <td className="px-4 py-2 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  {schedule && (
                    <button
                    onClick={() => router.push(`/teacher/teacherTRF/${schedule?._id}`)
                  }
                    className="px-5 py-2 rounded-xl bg-[#00000f] text-white font-medium shadow-md hover:bg-[#face39] hover:text-[#00000f] hover:font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300 ease-in-out"
                  >
                    View Bookings
                  </button>
                  
                  )}
                </td>
              </tr>
            ))}
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
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
          >
            Previous
          </button>
          <span className="mx-2">Page {currentPage} / {Math.ceil(filteredSchedules.length / schedulesPerPage)}</span>
          <button
            onClick={() => setCurrentPage((prev) => prev + 1)}
            disabled={indexOfLastSchedule >= filteredSchedules.length}
            className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
export default TrfAvailableSchedulesBDMPage;
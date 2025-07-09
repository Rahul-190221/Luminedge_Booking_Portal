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

function AvailableSchedulesPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [schedulesPerPage, setSchedulesPerPage] = useState<number>(20);
  const [testTypeFilter, setTestTypeFilter] = useState<string>("");
  const [dateSortOrder, setDateSortOrder] = useState<string>("ascending");
  const [dateFilter, setDateFilter] = useState<string>("upcoming");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [scheduletestType, setscheduletestType] = useState<string>("");
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

  const deleteSchedule = async (id: string) => {
    try {
      const response = await fetch(
        `https://luminedge-server.vercel.app/api/v1/admin/delete-schedule/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Failed to delete schedule: ${response.statusText}`
        );
      }

      const result = await response.json();
      if (result.success) {
        toast.success("Schedule deleted successfully");
        setSchedules((prev) =>
          prev.filter((schedule) => schedule.id !== id)
        );
      } else {
        toast.error(result.message || "Error deleting schedule");
      }
    } catch (error: any) {
      toast.error(`Error deleting schedule: ${error.message}`);
      console.error("Error deleting schedule:", error);
    }
  };
  const filteredSchedules = React.useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
  
    return schedules.filter((schedule: Schedule) => {
      if (!schedule || typeof schedule.startDate !== "string") {
        console.warn("Skipping schedule due to invalid startDate:", schedule);
        return false;
      }
  
      // Accept "YYYY-MM-DD" or full ISO strings like "YYYY-MM-DDTHH:mm:ss.sssZ"
      const scheduleDate = schedule.startDate.includes("T")
        ? schedule.startDate.split("T")[0]
        : schedule.startDate;
  
      const isTestTypeMatch = !testTypeFilter || schedule.name === testTypeFilter;
      const isScheduleTypeMatch = !scheduletestType || schedule.testType === scheduletestType;
      const isStartDateMatch = !startDateFilter || scheduleDate === startDateFilter;
  
      let isDateMatch = true;
      if (dateFilter === "past") {
        isDateMatch = scheduleDate < today;
      } else if (dateFilter === "upcoming") {
        isDateMatch = scheduleDate >= today;
      }
  
      return (
        isTestTypeMatch &&
        isScheduleTypeMatch &&
        isDateMatch &&
        isStartDateMatch
      );
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
    // ✅ Defensive checks
    if (!time || typeof time !== "string" || !time.includes(":")) {
      return "Invalid time";
    }
  
    const [hourStr, minuteStr] = time.split(":");
  
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
  
    // ✅ Check if values are valid numbers
    if (isNaN(hour) || isNaN(minute)) {
      return "Invalid time";
    }
  
    const period = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minute.toString().padStart(2, "0")} ${period}`;
  }
  
  return (
    <div className="p-1 sm:p-3 w-full sm:max-w-[100%] mx-auto bg-[#ffffff] text-[#00000f] shadow-1xl rounded-2xl border border-[#00000f]/10">
      <motion.h1
        className="text-2xl font-semibold mt-0 mb-0 text-[#00000f]  p-1 rounded"
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
            <tr key={schedule._id} className="border-b"> 
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
                <td className="px-4 py-2 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-6">
                  {schedule && (
                    <button
                    onClick={() => router.push(`/admin/${schedule?._id}`)}
                    className="px-3 py-1 bg-[#00000f] text-white rounded font-medium shadow-sm hover:bg-[#face39] hover:text-[#00000f] hover:font-semibold hover:shadow-md hover:scale-105 transition-all duration-300 ease-in-out"
                  >
                    View Bookings
                  </button>
                  
                  )}
                  <button
                    onClick={() =>
                      toast(
                        (t) => (
                          <div className="bg-gray-100 p-4 rounded shadow-lg text-black">
                            <p className="text-sm">
                              Are you sure you want to delete the schedule on {new Date(schedule.startDate).toLocaleDateString("en-US", {
                              month: "long",
                              day: "2-digit",
                              year: "numeric",
                              }).replace(/^(\w+) (\d+), (\d+)$/, "$2 $1, $3")}?
                            </p>
                            <div className="mt-4 flex justify-center gap-4">
                              <button
                                className="px-4 py-2 bg-green-500 hover:bg-green-700 text-white font-bold rounded-lg"
                                onClick={() => {
                                  deleteSchedule(schedule._id);
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
                        { id: `delete-${schedule._id}`, duration: 5000 }
                      )
                    }
                    className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600"
                  >
                    Delete
                  </button>
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
export default AvailableSchedulesPage;
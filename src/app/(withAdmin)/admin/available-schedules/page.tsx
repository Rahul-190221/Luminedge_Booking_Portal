"use client";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { FiDownload } from "react-icons/fi"; // Download icon

// Define a type for the schedule
type Schedule = {
  id: string;
  name: string;
  testType: string;
  startDate: string; // or Date, depending on your data
  status: string;
  timeSlots: Array<{
    slotId: string;
    startTime: string;
    endTime: string;
    slot: string;
  }>;
};

function AvailableSchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [schedulesPerPage, setSchedulesPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: string;
  } | null>(null);
  const [testTypeFilter, setTestTypeFilter] = useState<string>("");
  const [dateSortOrder, setDateSortOrder] = useState<string>("ascending");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [startDateFilter, setStartDateFilter] = useState<string>("");

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    const response = await fetch(
      `https://luminedge-mock-test-booking-server.vercel.app/api/v1/admin/get-schedules`,
      { next: { revalidate: 0 } }
    );
    const data = await response.json();
// Add `initialSlot` to each schedule if not already defined
const updatedSchedules = data.map((schedule: any) => ({
  ...schedule,
  initialSlot:
    schedule.initialSlot ||
    (schedule.timeSlots && schedule.timeSlots.length > 0
      ? schedule.timeSlots[0].slot
      : null), // Use the first slot as the initial value
}));

    setSchedules(data);
  };

  const deleteSchedule = async (id: string) => {
    try {
      const response = await fetch(
        `https://luminedge-mock-test-booking-server.vercel.app/api/v1/admin/delete-schedule/${id}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      if (result.success) {
        toast.success("Schedule deleted successfully");
        setSchedules(schedules.filter((schedule: any) => schedule.id !== id));
      }
    } catch (error) {
      toast.error("Error deleting schedule");
      console.error("Error deleting schedule:", error);
    }
  };
  const filteredSchedules = React.useMemo(() => {
    const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format

    return schedules.filter((schedule: Schedule) => {
      const scheduleDate = schedule.startDate.split("T")[0]; // Extract only the date (YYYY-MM-DD)

      // Test type filter
      const isTestTypeMatch = testTypeFilter
        ? schedule.name === testTypeFilter
        : true;

      // Date filter (completed, upcoming, today)
      let isDateMatch = true;
      switch (dateFilter) {
        case "completed":
          isDateMatch = scheduleDate < today;
          break;
        case "upcoming":
          isDateMatch = scheduleDate > today;
          break;
        case "today":
          isDateMatch = scheduleDate === today;
          break;
        case "all":
        default:
          isDateMatch = true;
          break;
      }

      // Start date filter
      const isStartDateMatch = startDateFilter
        ? scheduleDate === startDateFilter
        : true;

      // Combine all filters
      return isTestTypeMatch && isDateMatch && isStartDateMatch;
    });
  }, [schedules, testTypeFilter, dateFilter, startDateFilter]);

  const sortedSchedules = React.useMemo(() => {
    let sortableSchedules = [...filteredSchedules];
    sortableSchedules.sort((a: Schedule, b: Schedule) => {
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


  return (
    <div>
      <div className="my-4 flex space-x-4">
        <select
          value={testTypeFilter}
          onChange={(e) => setTestTypeFilter(e.target.value)}
          className="px-2 py-1 border rounded"
        >
          <option value="">All Test Types</option>
          <option value="GRE">GRE</option>
          <option value="IELTS">IELTS</option>
          <option value="TOEFL">TOEFL</option>
          <option value="PTE">PTE</option>
        </select>
        <select
          value={dateSortOrder}
          onChange={(e) => setDateSortOrder(e.target.value)}
          className="px-2 py-1 border rounded"
        >
          <option value="ascending">Start Date Ascending</option>
          <option value="descending">Start Date Descending</option>
        </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-2 py-1 border rounded"
        >
          <option value="all">All Schedules</option>
          <option value="completed">Completed Schedule</option>
          <option value="upcoming">Upcoming</option>
          <option value="today">Today</option>
        </select>
        <input
          type="date"
          value={startDateFilter}
          onChange={(e) => setStartDateFilter(e.target.value)}
          className="px-2 py-1 border rounded"
          placeholder="Start Date"
        />
      </div>
      <table className="table-auto w-full border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Test Type</th>
            <th className="px-4 py-2 text-left">Exam Date</th>
            <th className="px-4 py-2 text-left">Availabe Slots</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
        {currentSchedules.map((schedule: any) => (
  <tr key={schedule.id} className="border-b">
    <td className="px-4 py-2">{schedule.name}</td>
    <td className="px-4 py-2">{schedule.testType}</td>
    <td className="px-4 py-2">{schedule.startDate}</td>
    <td className="px-4 py-2">
      {/* Safely display the last slot number or fallback */}
      {schedule.timeSlots && schedule.timeSlots.length > 0 ? (
      `Slot: ${schedule.timeSlots[schedule.timeSlots.length - 1].slot}`
      ) : (
      "No slots available"
      )}
    </td>

    <td className="px-4 py-2">
      <select className="px-2 py-1 border rounded">
        {schedule.timeSlots.map((slot: any) => (
          <option key={slot.slotId} value={slot.slotId}>
            {slot.startTime} - {slot.endTime} 
          </option>
        ))}
      </select>
    </td>
              <td className="px-4 py-2 flex space-x-2">
                <button
                  onClick={() => deleteSchedule(schedule._id)}
                  className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between items-center mt-4">
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
          </select>
        </div>
        <div>
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
          >
            Previous
          </button>
          <span className="mx-2">Page {currentPage}</span>
          <button
            onClick={() => setCurrentPage((prev) => prev + 1)}
            disabled={indexOfLastSchedule >= schedules.length}
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

"use client";
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
// import { FiDownload } from "react-icons/fi"; // Download icon



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
  const [schedulesPerPage, setSchedulesPerPage] = useState<number>(10);
  const [testTypeFilter, setTestTypeFilter] = useState<string>("");
  const [dateSortOrder, setDateSortOrder] = useState<string>("ascending");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [startDateFilter, setStartDateFilter] = useState<string>("");

  const fetchSchedules = async () => {
    try {
      const response = await fetch(
        `https://luminedge-mock-test-booking-server.vercel.app/api/v1/admin/get-schedules`
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
        `https://luminedge-mock-test-booking-server.vercel.app/api/v1/admin/delete-schedule/${id}`,
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
    const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format

    return schedules.filter((schedule: Schedule) => {
      const scheduleDate = schedule.startDate.split("T")[0]; // Extract only the date (YYYY-MM-DD)

      // Test type filter
      const isTestTypeMatch = testTypeFilter
        ? schedule.name === testTypeFilter
        : true;

      // Date filter
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

      return isTestTypeMatch && isDateMatch && isStartDateMatch;
    });
  }, [schedules, testTypeFilter, dateFilter, startDateFilter]);

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
    <div>
      <div className="my-4 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 text-sm">
        <select
          value={testTypeFilter}
          onChange={(e) => setTestTypeFilter(e.target.value)}
          className="px-2 py-1 border rounded w-full sm:w-auto"
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
          <option value="completed">Completed</option>
          <option value="upcoming">Upcoming</option>
          <option value="today">Today</option>
        </select>
        <input
          type="date"
          value={startDateFilter}
          onChange={(e) => setStartDateFilter(e.target.value)}
          className="px-2 py-1 border rounded w-full sm:w-auto"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="table-auto w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
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
            {currentSchedules.map((schedule) => (
              <tr key={schedule.id} className="border-b">
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
                      onClick={() => router.push(`/admin/${schedule?._id}`)}
                      className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
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
                              Are you sure you want to delete this schedule?
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
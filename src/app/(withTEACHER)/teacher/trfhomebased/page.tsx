"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

// Booking Type Definition
type Booking = {
  _id: string;
  name: string;
  testType: string;
  testSystem: string;
  location: string;
  bookingDate: string;
  testTime?: string;
  userId: string;
  attendance?: string;
  teacherL?: string;
  teacherW?: string;
  teacherR?: string;
  teacherS?: string;
  teacherLEmail?: string;
  teacherWEmail?: string;
  teacherREmail?: string;
  teacherSEmail?: string;
  user: {
    _id: string;
    name: string;
    email: string;
    contactNo?: string;
    transactionId?: string;
    passportNumber?: string;
    mock: number;
    feedbackStatusBySchedule?: Record<string, { listening: boolean; writing: boolean; reading: boolean; speaking: boolean }>;
  };
};

function canShowTrfFor(name: string): boolean {
  return name === "IELTS";
}


export default function HomeBasedPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [userAttendance, setUserAttendance] = useState<{ [key: string]: { present: number; absent: number } }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [schedulesPerPage, setSchedulesPerPage] = useState<number>(20);
  const [nameFilter, setNameFilter] = useState("");
  const [courseNameFilter, setCourseNameFilter] = useState("");
  const [testTypeFilter, setTestTypeFilter] = useState("IELTS");
  const [dateFilter, setDateFilter] = useState("past");
  const [startDateFilter, setStartDateFilter] = useState("");

  const API_BASE = "https://luminedge-server.vercel.app";

  const fetchHomeBookingsAndUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_BASE}/api/v1/admin/bookings/home-with-users`);
      let homeBookings = response.data.bookings;

      homeBookings = homeBookings.filter((booking: Booking) => booking.name === "IELTS");

      if (!homeBookings || homeBookings.length === 0) {
        setBookings([]);
        setUserAttendance({});
        setAttendance({});
        return;
      }

      const attendanceSummary: Record<string, { present: number; absent: number }> = {};
      const initialAttendance: Record<string, string> = {};

      homeBookings.forEach((booking: Booking) => {
        const userId = booking.userId;

        if (!attendanceSummary[userId]) {
          attendanceSummary[userId] = { present: 0, absent: 0 };
        }

        if (booking.attendance === "present") {
          attendanceSummary[userId].present += 1;
        } else if (booking.attendance === "absent") {
          attendanceSummary[userId].absent += 1;
        }

        if (booking.attendance) {
          initialAttendance[userId] = booking.attendance;
        }
      });

      setBookings(homeBookings);
      setUserAttendance(attendanceSummary);
      setAttendance(initialAttendance);
    } catch (error: any) {
      console.error("❌ Fetch failed:", error);
      toast.error(error.message || "Failed to fetch bookings");
      setError(error.message || "Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHomeBookingsAndUsers();
  }, [fetchHomeBookingsAndUsers]);

  function formatTime(time?: string) {
    if (!time || typeof time !== "string" || !time.includes(":")) return "N/A";
    const [hourStr, minuteStr] = time.split(":");
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
    if (isNaN(hour) || isNaN(minute)) return "N/A";
    const period = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minute.toString().padStart(2, "0")} ${period}`;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const filteredBookings = useMemo(() => {
    return bookings
      .filter((booking) => {
        const user = booking.user || {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const bookingDate = new Date(booking.bookingDate);
        bookingDate.setHours(0, 0, 0, 0);
        if (dateFilter === "past" && bookingDate >= today) return false;
        if (dateFilter === "upcoming" && bookingDate < today) return false;
        if (startDateFilter) {
          const filterDate = new Date(startDateFilter);
          filterDate.setHours(0, 0, 0, 0);
          if (bookingDate.getTime() !== filterDate.getTime()) return false;
        }
        if (nameFilter && !user.name?.toLowerCase().includes(nameFilter.toLowerCase())) return false;
        if (courseNameFilter && !booking.name?.toLowerCase().includes(courseNameFilter.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.bookingDate).getTime();
        const dateB = new Date(b.bookingDate).getTime();
        if (dateFilter === "past") {
          return dateB - dateA;
        }
        return dateA - dateB;
      })
      .reduce((acc: Record<string, Booking[]>, booking) => {
        const dateKey = booking.bookingDate ? formatDate(booking.bookingDate) : "N/A";
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(booking);
        return acc;
      }, {});
  }, [bookings, dateFilter, startDateFilter, nameFilter, courseNameFilter]);

  const indexOfLastSchedule = currentPage * schedulesPerPage;
  const indexOfFirstSchedule = indexOfLastSchedule - schedulesPerPage;
  const currentSchedules = Object.values(filteredBookings).flat().slice(indexOfFirstSchedule, indexOfLastSchedule);

  useEffect(() => {
    const totalBookings = Object.values(filteredBookings).flat().length;
    const maxPage = Math.ceil(totalBookings / schedulesPerPage);
    if (currentPage > maxPage && maxPage > 0) {
      setCurrentPage(maxPage);
    } else if (totalBookings === 0) {
      setCurrentPage(1);
    }
  }, [filteredBookings, schedulesPerPage, currentPage]);

  if (loading) {
    return <div className="p-6">Loading bookings...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-1 sm:p-3 w-full sm:max-w-[100%] mx-auto bg-[#ffffff] text-[#00000f] shadow-1xl rounded-2xl border border-[#00000f]/10">
      <div className="bg-gray-100 p-2 h-auto mb-0 rounded shadow-sm">
        <h3 className="font-bold text-lg mb-0">Filter by</h3>
        <div className="flex flex-col sm:flex-row gap-4 text-sm">
          <label className="flex flex-col text-[#00000f]">
            <span className="mb-1 text-[#00000f]">Search by Name</span>
            <input
              type="text"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Enter name..."
              className="px-2 py-1 border rounded w-full sm:w-auto"
            />
          </label>
          <label className="flex flex-col text-[#00000f]">
            <span className="mb-1 text-[#00000f]">Course Type</span>
            <select
              value={testTypeFilter}
              onChange={(e) => setTestTypeFilter(e.target.value)}
              className="px-2 py-1 border rounded w-full sm:w-auto text-[#00000f]"
            >
              <option value="IELTS">IELTS (enforced)</option>
            </select>
          </label>
          <label className="flex flex-col">
            <span className="mb-1 text-[#00000f]">Schedule</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-2 py-1 border rounded w-full sm:w-auto text-[#00000f]"
            >
              <option value="all">All Schedules</option>
              <option value="past">Past</option>
              <option value="upcoming">Upcoming</option>
            </select>
          </label>
          <label className="flex flex-col">
            <span className="mb-1 text-[#00000f]">Search by Date</span>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="px-2 py-1 border rounded w-full sm:w-auto"
            />
          </label>
        </div>
      </div>
      <motion.h1
        className="text-2xl font-semibold mt-4 mb-1 text-[#00000f]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        Home Based Booking List
      </motion.h1>

      <div className="overflow-x-auto">
        <table className="table-auto w-full border-collapse">
          <thead>
            <tr className="bg-[#face39] text-sm">
              <th className="p-4">#</th>
              <th className="p-4">User Name</th>
              <th className="p-4">Course Name</th>
              <th className="p-4">Test Type</th>
              <th className="p-4">Test System</th>
              <th className="p-4">Exam Date</th>
              <th className="p-4">Test Time</th>
              <th className="p-4">Email</th>
              <th className="p-4">Attendance</th>
              <th className="p-4">TRF</th>
            </tr>
          </thead>
          <tbody>
            {currentSchedules.length > 0 ? (
              currentSchedules.map((booking: Booking, index: number) => {
                const user = booking.user || {};
                const isAbsent = booking.attendance === "absent";
                return (
                  <tr key={booking._id} className="text-center border-b text-sm">
                    <td className="p-4">{indexOfFirstSchedule + index + 1}</td>
                    <td className="p-4">{user.name || "N/A"}</td>
                    <td className="p-4">{booking.name}</td>
                    <td className="p-4">{booking.testType}</td>
                    <td className="p-4">{booking.testSystem}</td>
                    <td className="p-4">
                      {booking.bookingDate ? formatDate(booking.bookingDate) : "N/A"}
                    </td>
                    <td className="p-4">
                      {booking.testTime ? formatTime(booking.testTime) : "N/A"}
                    </td>
                    <td className="p-4">{user.email || "N/A"}</td>
                    <td className="p-4">{booking.attendance || "N/A"}</td>
                    <td className="px-4 py-2">
  {canShowTrfFor(booking.name) ? (
    <button
      onClick={() => {
        const userId = booking.user?._id;
        const scheduleId = booking._id;

        if (!userId || !scheduleId) {
          toast.error("Missing user or booking ID");
          return;
        }

        router.push(
          `/teacher/trf?userId=${encodeURIComponent(userId)}&scheduleId=${encodeURIComponent(
            scheduleId
          )}`
        );
      }}
      disabled={isAbsent}
      className={`px-5 py-2 rounded-xl font-medium transition-all duration-300 ${
        isAbsent
          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
          : "bg-[#00000f] text-white hover:bg-[#face39] hover:text-[#00000f]"
      }`}
    >
      View TRF
    </button>
  ) : (
    <span className="text-gray-400 italic">N/A</span>
  )}
</td>

                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={10} className="p-4 text-center text-gray-500">
                  No bookings available for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 space-y-4 sm:space-y-0">
        <div>
          <label htmlFor="schedulesPerPage" className="mr-2 text-[#00000f]">
            Schedules per page:
          </label>
          <select
            id="schedulesPerPage"
            value={schedulesPerPage}
            onChange={(e) => {
              setSchedulesPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 border rounded text-[#00000f]"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
          </select>
        </div>
        <div className="flex space-x-2 items-center">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`px-2 py-1 rounded ${
              currentPage === 1
                ? "bg-gray-200 cursor-not-allowed text-gray-400"
                : "bg-gray-300 hover:bg-gray-400 text-[#00000f]"
            }`}
          >
            Previous
          </button>
          <span className="mx-2 text-[#00000f]">
            Page {currentPage} of {Math.ceil(Object.values(filteredBookings).flat().length / schedulesPerPage) || 1}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => prev + 1)}
            disabled={indexOfLastSchedule >= Object.values(filteredBookings).flat().length}
            className={`px-2 py-1 rounded ${
              indexOfLastSchedule >= Object.values(filteredBookings).flat().length
                ? "bg-gray-200 cursor-not-allowed text-gray-400"
                : "bg-gray-300 hover:bg-gray-400 text-[#00000f]"
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
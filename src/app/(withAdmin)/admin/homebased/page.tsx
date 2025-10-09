"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion } from "framer-motion";

const API = "https://luminedge-server.vercel.app";

// Booking Type Definition
type Booking = {
  _id: string;
  name: string;
  testType: string;
  testSystem: string;
  location: string;
  bookingDate: string;
  startTime?: string;
  testTime?: string;
  endTime: string;
  userId: string;
  userCount: number;
  attendance?: string;
  userName?: string;
  email?: string;
  phone?: string;
  transactionId?: string;
  passportNumber?: string;
  totalMock?: number;
  scheduleId?: string;
};

type Schedule = {
  _id: string;
  name: string;
  testType: string;
  testSystem: string;
  startDate: string;
  endDate?: string;
  location?: string;
};

export default function HomeBasedPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<Record<string, any>>({});
  const [attendCount, setAttendCount] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [schedulesPerPage, setSchedulesPerPage] = useState<number>(20);
  const [nameFilter, setNameFilter] = useState("");
  const [courseNameFilter, setCourseNameFilter] = useState("");
  const [testTypeFilter, setTestTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("upcoming"); // "past" | "upcoming" | "all"
  const [startDateFilter, setStartDateFilter] = useState("");

  const fetchHomeBookingsAndUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `${API}/api/v1/admin/bookings/home-with-users`
      );
      const homeBookings: Booking[] = response.data.bookings;

      if (!homeBookings || homeBookings.length === 0) {
        setBookings([]);
        setUsers({});
        setAttendCount({});
        return;
      }

      // build user map from payload
      const usersMap: Record<string, any> = {};
      homeBookings.forEach((booking: any) => {
        const userId = String(booking.userId);
        const user = booking.user;
        usersMap[userId] = user;
      });

      setBookings(homeBookings);
      setUsers(usersMap);

      // --- NEW: bulk attend value (same style as your other page) ---
      const uniqueUserIds = Array.from(new Set(homeBookings.map(b => String(b.userId))));
      if (uniqueUserIds.length) {
        try {
          const { data: attRes } = await axios.post(
            `${API}/api/v1/user/attendance/bulk`,
            { userIds: uniqueUserIds },
            { headers: { "Content-Type": "application/json" } }
          );
          const map: Record<string, number | null> = {};
          for (const uid of uniqueUserIds) {
            map[uid] = attRes?.attendance?.[uid] ?? null; // whatever your backend defines
          }
          setAttendCount(map);
        } catch (e) {
          console.error("Attendance bulk fetch failed:", e);
          toast.error("Failed to load Attend values");
          setAttendCount({});
        }
      } else {
        setAttendCount({});
      }
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

  const handleHomeAttendanceSubmit = async (
    userId: string,
    attendanceValue: string,
    bookingDate: string
  ) => {
    try {
      if (!userId || !attendanceValue || !bookingDate) {
        toast.error("Invalid attendance update request.");
        return;
      }

      const status = attendanceValue === "present" ? "Present" : "Absent";

      const response = await axios.put(
        `${API}/api/v1/user/bookings/home`,
        {
          userId,
          attendance: attendanceValue,
          status,
          bookingDate,
        }
      );

      if (response.status !== 200) {
        throw new Error(response.data.message || "Failed to update attendance");
      }

      setAttendance((prev) => ({
        ...prev,
        [userId]: attendanceValue,
      }));

      // Optionally refresh Attend count for this user (keep UI in-sync)
      try {
        const { data: attRes } = await axios.post(
          `${API}/api/v1/user/attendance/bulk`,
          { userIds: [userId] },
          { headers: { "Content-Type": "application/json" } }
        );
        setAttendCount((prev) => ({
          ...prev,
          [userId]: attRes?.attendance?.[userId] ?? prev[userId] ?? null,
        }));
      } catch {}

      toast.success("Home attendance updated successfully!");
    } catch (error: any) {
      console.error("❌ Error updating home attendance:", error);
      toast.error(error.message || "Failed to update home attendance.");
    }
  };

  // ---------- FILTER + SORT (DESC for past, ASC for upcoming) ----------
  const filteredList = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const list = bookings.filter((booking) => {
      const user = users[booking.userId] || {};
      const bookingDate = new Date(booking.bookingDate);
      bookingDate.setHours(0, 0, 0, 0);

      // FIX: filter by testType (not name)
      if (testTypeFilter && booking.testType !== testTypeFilter) return false;

      if (dateFilter === "past" && bookingDate >= today) return false;
      if (dateFilter === "upcoming" && bookingDate < today) return false;

      if (startDateFilter) {
        const fd = new Date(startDateFilter);
        fd.setHours(0, 0, 0, 0);
        if (bookingDate.getTime() !== fd.getTime()) return false;
      }

      if (nameFilter && !user.name?.toLowerCase().includes(nameFilter.toLowerCase()))
        return false;

      if (
        courseNameFilter &&
        !booking.name?.toLowerCase().includes(courseNameFilter.toLowerCase())
      )
        return false;

      return true;
    });

    return list.sort((a, b) => {
      const da = new Date(a.bookingDate).getTime();
      const db = new Date(b.bookingDate).getTime();
      if (dateFilter === "past") return db - da; // DESC
      if (dateFilter === "upcoming") return da - db; // ASC
      return db - da; // "all" => DESC
    });
  }, [
    bookings,
    users,
    testTypeFilter,
    dateFilter,
    startDateFilter,
    nameFilter,
    courseNameFilter,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [testTypeFilter, dateFilter, startDateFilter, nameFilter, courseNameFilter, schedulesPerPage]);

  // ---------- PAGINATION ----------
  const totalItems = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / schedulesPerPage));
  const indexOfLastSchedule = currentPage * schedulesPerPage;
  const indexOfFirstSchedule = indexOfLastSchedule - schedulesPerPage;
  const currentSchedules = filteredList.slice(indexOfFirstSchedule, indexOfLastSchedule);

  // ---------- PDF uses same filtered order ----------
  const confirmDownload = () => {
    const flattenedBookings = filteredList;

    if (!flattenedBookings.length) {
      toast.error("No booking data to download.");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape", format: "a4" });
    doc.setFontSize(14);
    doc.text("Home Booking Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Total Records: ${flattenedBookings.length}`, 14, 22);
    doc.text(`Generated On: ${new Date().toLocaleString()}`, 14, 28);

    autoTable(doc, {
      head: [
        [
          "#",
          "User Name",
          "Course Name",
          "Test Type",
          "Test System",
          "Location",
          "Exam Date",
          "Test Time",
          "Email",
          "Phone",
          "Transaction ID",
          "Passport Number",
          "Purchased",
          "Attend",
        ],
      ],
      body: flattenedBookings.map((booking, index) => {
        const user = users[booking.userId] || {};
        const userId = booking.userId;

        return [
          index + 1,
          user?.name || "N/A",
          booking?.name || "N/A",
          booking?.testType || "N/A",
          booking?.testSystem || "N/A",
          booking?.location || "N/A",
          booking?.bookingDate ? formatDate(booking.bookingDate) : "N/A",
          booking.location === "Home"
            ? booking.testTime
              ? formatTime(booking.testTime)
              : "N/A"
            : booking.startTime
            ? formatTime(booking.startTime)
            : "N/A",
          user?.email || "N/A",
          user?.contactNo || "N/A",
          user?.transactionId || "N/A",
          user?.passportNumber || "N/A",
          user?.totalMock ?? "N/A",
          attendCount[userId] ?? "N/A", // <-- backend Attend value
        ];
      }),
      startY: 25,
      styles: { fontSize: 7, overflow: "linebreak" },
      headStyles: { fillColor: "#face39", textColor: "#000" },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 30 },
        2: { cellWidth: 15 },
        3: { cellWidth: 25 },
        4: { cellWidth: 20 },
        5: { cellWidth: 15 },
        6: { cellWidth: 25 },
        7: { cellWidth: 15 },
        8: { cellWidth: 35 },
        9: { cellWidth: 20 },
        10: { cellWidth: 18 },
        11: { cellWidth: 22 },
        12: { cellWidth: 17 },
        13: { cellWidth: 15 },
      },
      margin: { top: 20 },
      theme: "grid",
    });

    const currentDate = new Date().toISOString().split("T")[0];
    doc.save(`booking_report_${currentDate}.pdf`);
  };

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

  return (
    <div className="p-1 sm:p-3 w-full sm:max-w-[100%] mx-auto bg-[#ffffff] text-[#00000f] shadow-1xl rounded-2xl border border-[#00000f]/10">
      <div className="bg-gray-100 p-2 h-auto mb-0 rounded shadow-sm">
        <h3 className="font-bold text-lg mb-0">Filter by</h3>
        <div className="flex flex-col sm:flex-row gap-4 text-sm">
          {/* Name Filter */}
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

          {/* Test Type Filter */}
          <label className="flex flex-col text-[#00000f]">
            <span className="mb-1 text-[#00000f]">Course Type</span>
            <select
              value={testTypeFilter}
              onChange={(e) => setTestTypeFilter(e.target.value)}
              className="px-2 py-1 border rounded w-full sm:w-auto text-[#00000f]"
            >
              <option value="">All Course Types</option>
              <option value="GRE">GRE</option>
              <option value="IELTS">IELTS</option>
              <option value="TOEFL">TOEFL</option>
              <option value="Pearson PTE">Pearson PTE</option>
            </select>
          </label>

          {/* Date Filter */}
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

          {/* Start Date Filter */}
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
              <th className="p-4 ">#</th>
              <th className="p-4 ">User Name</th>
              <th className="p-4 ">Course Name</th>
              <th className="p-4 ">Test Type</th>
              <th className="p-4 ">Test System</th>
              <th className="p-4 ">Location</th>
              <th className="p-4 ">Exam Date</th>
              <th className="p-4 ">Test Time</th>
              <th className="p-4 ">Email</th>
              <th className="p-4 ">Phone</th>
              <th className="p-4 ">Transaction ID</th>
              <th className="p-4 ">Passport Number</th>
              <th className="p-4 ">Purchased</th>
              <th className="p-4 ">Attend</th>
              <th className="p-4 ">Attendance</th>
            </tr>
          </thead>
          <tbody>
            {currentSchedules.length > 0 ? (
              currentSchedules.map((booking: Booking, index: number) => {
                const user = users[booking.userId] || {};
                return (
                  <tr key={booking._id} className="text-center border-b text-sm">
                    <td className="p-4">
                      {indexOfFirstSchedule + index + 1}
                    </td>
                    <td className="p-4">{user.name || "N/A"}</td>
                    <td className="p-4">{booking.name}</td>
                    <td className="p-4">{booking.testType}</td>
                    <td className="p-4">{booking.testSystem}</td>
                    <td className="p-4">{booking.location}</td>
                    <td className="p-4">
                      {booking.bookingDate ? formatDate(booking.bookingDate) : "N/A"}
                    </td>
                    <td className="p-4">
                      {booking.location === "Home"
                        ? booking.testTime
                          ? formatTime(booking.testTime)
                          : "N/A"
                        : booking.startTime
                        ? formatTime(booking.startTime)
                        : "N/A"}
                    </td>
                    <td className="p-4">{user.email || "N/A"}</td>
                    <td className="p-4">{user.contactNo || "N/A"}</td>
                    <td className="p-4">{user.transactionId || "N/A"}</td>
                    <td className="p-4">{user.passportNumber || "N/A"}</td>
                    <td className="p-4">{user.totalMock ?? 0}</td>
                    <td className="p-4">
                      {attendCount[booking.userId] ?? "N/A"}
                    </td>
                    <td className="p-4">
                      <select
                        className="border rounded px-2 py-1"
                        value={attendance[booking.userId] ?? booking.attendance ?? "N/A"}
                        onChange={(e) => {
                          const newAttendance = e.target.value;
                          handleHomeAttendanceSubmit(
                            booking.userId,
                            newAttendance,
                            booking.bookingDate
                          );
                        }}
                      >
                        <option value="N/A" disabled>
                          Select Attendance
                        </option>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                      </select>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={15} className="p-4 text-center text-gray-500">
                  loading...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-start space-x-4">
        <button
          onClick={confirmDownload}
          className="w-64 px-6 py-3 rounded-full font-extrabold text-sm uppercase tracking-widest bg-gradient-to-r from-[#00000f] to-[#1a1a2e] text-white shadow-md hover:from-[#face39] hover:to-[#fce77d] hover:text-[#00000f] hover:shadow-2xl hover:scale-105 ring-2 ring-[#00000f] hover:ring-[#face39] transition-all duration-300 ease-in-out flex items-center justify-center gap-1"
        >
          📄 Download as PDF
        </button>
      </div>

      {/* Pagination */}
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
          <span className="mx-2">
            Page {Math.min(currentPage, totalPages)} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage >= totalPages}
            className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

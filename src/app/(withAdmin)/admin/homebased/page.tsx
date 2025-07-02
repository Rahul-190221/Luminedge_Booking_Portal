"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react"; // ✅ Fix applied
import axios from "axios";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion } from "framer-motion";

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
  endDate?: string; // Optional property
  location?: string;
};

export default function HomeBasedPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<Record<string, any>>({}); // Store user details by userId
  const [userAttendance, setUserAttendance] = useState<{ [key: string]: { present: number; absent: number } }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [schedulesPerPage, setSchedulesPerPage] = useState<number>(20);
  const [nameFilter, setNameFilter] = useState(""); 
  const [courseNameFilter, setCourseNameFilter] = useState(""); 
  const [testTypeFilter, setTestTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("upcoming");
  const [startDateFilter, setStartDateFilter] = useState("");

  const fetchHomeBookingsAndUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
  
    try {
      const response = await axios.get("https://luminedge-server.vercel.app/api/v1/admin/bookings/home-with-users");
      const homeBookings = response.data.bookings;
  
      if (!homeBookings || homeBookings.length === 0) {
        setBookings([]);
        setUsers({});
        setUserAttendance({});
        return;
      }
  
      const usersMap: Record<string, any> = {};
      const attendanceSummary: Record<string, { present: number; absent: number }> = {};
      
      homeBookings.forEach((booking: any) => {
        const userId = booking.userId;
        const user = booking.user;
      
        usersMap[userId] = user;
      
        if (!attendanceSummary[userId]) {
          attendanceSummary[userId] = { present: 0, absent: 0 };
        }
      
        if (booking.attendance === "present") {
          attendanceSummary[userId].present += 1;
        } else if (booking.attendance === "absent") {
          attendanceSummary[userId].absent += 1;
        }
      });
      
      setBookings(homeBookings);
      setUsers(usersMap);
      setUserAttendance(attendanceSummary);
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



  
  const handleHomeAttendanceSubmit = async (userId: string, attendanceValue: string, bookingDate: string) => {
    try {
      if (!userId || !attendanceValue || !bookingDate) {
        toast.error("Invalid attendance update request.");
        return;
      }
  
      const status = attendanceValue === "present" ? "Present" : "Absent";
  
      const response = await axios.put(
        `https://luminedge-server.vercel.app/api/v1/user/bookings/home`, // ✅ Correct API for Home-Based Bookings
        {
          userId,
          attendance: attendanceValue,
          status,
          bookingDate, // ✅ Required for Home-Based bookings
        }
      );
  
      if (response.status !== 200) {
        throw new Error(response.data.message || "Failed to update attendance");
      }
  
      setAttendance((prev) => ({
        ...prev,
        [userId]: attendanceValue,
      }));
  
      toast.success("Home attendance updated successfully!");
    } catch (error: any) {
      console.error("❌ Error updating home attendance:", error);
      toast.error(error.message || "Failed to update home attendance.");
    }
  };
  
  const confirmDownload = () => {
    const flattenedBookings = Object.values(filteredBookings).flat(); // Ensure it's an array
  
    if (!flattenedBookings.length) {
      toast.error("No booking data to download.");
      return;
    }
  
    const doc = new jsPDF({ orientation: "landscape", format: "a4" });
  
    // ✅ Set Title & Info
    doc.setFontSize(14);
    doc.text("Home Booking Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Total Records: ${flattenedBookings.length}`, 14, 22);
    doc.text(`Generated On: ${new Date().toLocaleString()}`, 14, 28);
  
    // ✅ Table Headers
    autoTable(doc, {
      head: [
        [
          "#", "User Name", "Course Name", "Test Type", 
          "Test System", "Location", "Exam Date", "Test Time", "Email", 
          "Phone", "Transaction ID", "Passport Number", 
          "Purchased", "Attend"
        ]
      ],
      body: flattenedBookings.map((booking, index) => {
        const user = users[booking.userId] || {}; // Fetch user data
        const userId = booking.userId; // Extract user ID
      
        return [
          index + 1,
          user?.name || "N/A",
          booking?.name || "N/A",
          booking?.testType || "N/A",
          booking?.testSystem || "N/A",
          booking?.location || "N/A",
          formatTime(booking?.bookingDate) || "N/A",
          booking?.testTime || "N/A",
          user?.email || "N/A",
          user?.contactNo || "N/A",
          user?.transactionId || "N/A",
          user?.passportNumber || "N/A",
          user?.totalMock || "N/A",
          userAttendance[userId] ? userAttendance[userId].present + userAttendance[userId].absent : "N/A",
        ];
      }),
      startY: 25,
      styles: { fontSize: 7, overflow: "linebreak" },
      headStyles: { fillColor: "#face39", textColor: "#000" },
      columnStyles: {
        0: { cellWidth: 8 },   // #
        1: { cellWidth: 30 },   // User Name
        2: { cellWidth: 15 },   // Course Name
        3: { cellWidth: 25 },   // Test Type
        4: { cellWidth: 20 },   // Test System
        5: { cellWidth: 15 },   // Location
        6: { cellWidth: 25 },   // Exam Date
        7: { cellWidth: 15 },   // Test Time
        8: { cellWidth: 35 },   // Email
        9: { cellWidth: 20 },   // Phone
        10: { cellWidth: 18 },   // Transaction ID
        11: { cellWidth: 22 },  // Passport Number
        12: { cellWidth: 17 },  // Purchased
        13: { cellWidth: 15 },  // Attend
      },
      margin: { top: 20 },
      theme: "grid",
    });
  
    // ✅ Auto-generate file name
    const currentDate = new Date().toISOString().split("T")[0];
    doc.save(`booking_report_${currentDate}.pdf`);
  };
  
 // Filter Bookings
const filteredBookings = useMemo(() => {
  return bookings
    .filter((booking) => {
      const user = users[booking.userId] || {};

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const bookingDate = new Date(booking.bookingDate);
      bookingDate.setHours(0, 0, 0, 0);

      // Test type filter
      if (testTypeFilter && booking.name !== testTypeFilter) return false;

      // Filter by date category (past, upcoming, all)
      if (dateFilter === "past" && bookingDate >= today) return false;
      if (dateFilter === "upcoming" && bookingDate < today) return false;

      // Filter by start date
      if (startDateFilter) {
        const filterDate = new Date(startDateFilter);
        filterDate.setHours(0, 0, 0, 0);
        if (bookingDate.getTime() !== filterDate.getTime()) return false;
      }

      // Filter by user name (case-insensitive)
      if (nameFilter && !user.name?.toLowerCase().includes(nameFilter.toLowerCase())) return false;

      // Filter by course name
      if (courseNameFilter && !booking.name?.toLowerCase().includes(courseNameFilter.toLowerCase())) return false;

      return true;
    })
    .sort((a, b) => new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime()) // ✅ Sort by date (Ascending)
    .reduce((acc: Record<string, Booking[]>, booking) => {
      const dateKey = formatTime(booking.bookingDate); // Group by formatted date (e.g., "17 February, 2025")
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(booking);
      return acc;
    }, {});
}, [bookings, testTypeFilter, dateFilter, startDateFilter, nameFilter, courseNameFilter]);

const indexOfLastSchedule = currentPage * schedulesPerPage;
const indexOfFirstSchedule = indexOfLastSchedule - schedulesPerPage;
const currentSchedules = Object.values(filteredBookings).flat().slice(indexOfFirstSchedule, indexOfLastSchedule);
function formatTime(time?: string) {
  if (!time || typeof time !== "string" || !time.includes(":")) return "N/A"; // ✅ Prevent undefined, null, or invalid formats

  const [hourStr, minuteStr] = time.split(":");

  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (isNaN(hour) || isNaN(minute)) return "N/A"; // ✅ Handle cases where parsing fails

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
      {Object.values(filteredBookings).flat().length > 0 ? (
        Object.values(filteredBookings).flat().map((booking: Booking, index: number) => {
          const user = users[booking.userId] || {};
          return (
            <tr key={booking._id} className="text-center border-b text-sm">
              <td className="p-4">{index + 1}</td>
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
      ? formatTime(booking.testTime)  // ✅ Use testTime for Home
      : "N/A"
    : booking.startTime
    ? formatTime(booking.startTime)   // ✅ Use startTime for Test Center
    : "N/A"}
</td>
              <td className="p-4">{user.email || "N/A"}</td>
              <td className="p-4">{user.contactNo || "N/A"}</td>
              <td className="p-4">{user.transactionId || "N/A"}</td>
              <td className="p-4">{user.passportNumber || "N/A"}</td>
              <td className="p-4">{user.totalMock || 0}</td>
              <td className="p-4">
  {userAttendance[booking.userId]?.present ?? 0}
</td>




<td className="p-4">
  <select
    className="border rounded px-2 py-1"
    value={attendance[booking.userId] ?? booking.attendance ?? "N/A"}
    onChange={(e) => {
      const newAttendance = e.target.value;
      
      // ✅ Update home-based attendance
      handleHomeAttendanceSubmit(booking.userId, newAttendance, booking.bookingDate);
    }}
  >
    <option value="N/A" disabled>Select Attendance</option>
    <option value="present">Present</option>
    <option value="absent">Absent</option>
  </select>
</td>


            </tr>
          );
        })
      ) : (
        <tr>
         <td colSpan={14} className="p-4 text-center text-gray-500">loading...</td>

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
  Page {currentPage} / {Math.ceil(Object.values(filteredBookings).flat().length / schedulesPerPage)}
</span>
<button
  onClick={() => setCurrentPage((prev) => prev + 1)}
  disabled={indexOfLastSchedule >= Object.values(filteredBookings).flat().length}
  className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
>
  Next
</button>

        </div>
      </div>
    </div>
  );
}

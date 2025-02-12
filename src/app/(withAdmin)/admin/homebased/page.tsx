"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react"; // ✅ Fix applied
import axios from "axios";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  const [userAttendance, setUserAttendance] = useState<{ [key: string]: number | null }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [schedulesPerPage, setSchedulesPerPage] = useState<number>(20);
  const [nameFilter, setNameFilter] = useState(""); 
  const [courseNameFilter, setCourseNameFilter] = useState(""); 
  const [testTypeFilter, setTestTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");


  const fetchUsersAndAttendance = async () => {
    try {
      const usersResponse = await axios.get("https://luminedge-server.vercel.app/api/v1/admin/users");
  
      if (!usersResponse.data || !usersResponse.data.users) {
        throw new Error("No users found");
      }
  
      // Convert users array to a map for easy access
      const usersMap: Record<string, any> = {};
      usersResponse.data.users.forEach((user: any) => {
        usersMap[user._id] = user;
      });
  
      setUsers(usersMap);
  
      // ✅ Fetch Attendance Data for Each User and Store in `userAttendance`
      const newAttendanceData: Record<string, number | null> = {};
  
      await Promise.all(
        usersResponse.data.users.map(async (user: any) => {
          try {
            const response = await axios.get(
              `https://luminedge-server.vercel.app/api/v1/user/attendance/${user._id}`
            );
            newAttendanceData[user._id] = response.data.attendance || null; // Store attendance as null if not available
          } catch (error) {
            console.error(`Error fetching attendance for user ${user._id}:`, error);
            newAttendanceData[user._id] = null; // Default to null if an error occurs
          }
        })
      );
  
      setUserAttendance(newAttendanceData); // ✅ Update state properly
    } catch (error: any) {
      toast.error(error.message || "Error fetching users and attendance");
      console.error(error);
    }
  };
  
  // Fetch Home Bookings
  const fetchHomeBasedBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get("https://luminedge-server.vercel.app/api/v1/admin/bookings");
      if (!response.data || !response.data.bookings) {
        throw new Error("No bookings found");
      }

      const homeBasedBookings = response.data.bookings
        .filter((booking: Booking) => booking.location === "Home")
        .sort((a: Booking, b: Booking) => new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime());

      setBookings(homeBasedBookings);
    } catch (error: any) {
      setError(error.message || "Error fetching Home bookings");
      toast.error(error.message || "Error fetching bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsersAndAttendance(); // Fetch users and attendance first
    fetchHomeBasedBookings(); // Fetch bookings after users
  }, [fetchHomeBasedBookings]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString("en-US", { month: "long" });
    const year = date.getFullYear();
    
    return `${day} ${month}, ${year}`;
  };
  
  const handleSubmit = async (
    scheduleId: string, // "Home" for Home, actual scheduleId for On-Campus
    userId: string,
    attendanceValue: string,
    location: string,
    bookingDate?: string // Optional for On-Campus, required for Home
  ) => {
    try {
      // Validate input
      if (!userId || !attendanceValue) {
        toast.error("Invalid attendance update request.");
        return;
      }
  
      // 🏡 Ensure bookingDate is present for Home
      if (scheduleId === "Home" && !bookingDate) {
        toast.error("Booking date is required for Home bookings.");
        return;
      }
  
      // ✅ Define request payload
      const requestBody: Record<string, any> = {
        userId,
        attendance: attendanceValue,
        status: attendanceValue === "present" ? "Present" : "Absent",
        ...(scheduleId === "Home" && bookingDate ? { bookingDate } : {}), // Include bookingDate only if Home
      };
  
      console.log("📤 Sending request to backend:", requestBody);
  
      // ✅ Send API request
      const response = await axios.put(
        `https://luminedge-server.vercel.app/api/v1/user/bookings/${scheduleId}`,
        requestBody
      );
  
      if (response.status !== 200) {
        throw new Error(response.data.message || "Failed to update attendance.");
      }
  
      // ✅ Update attendance in the UI
      setAttendance((prev) => ({
        ...prev,
        [userId]: attendanceValue,
      }));
  
      // ✅ Show success message
      toast.success("Attendance updated successfully!");
  
      console.log("✅ Attendance updated:", response.data);
    } catch (error: any) {
      console.error("❌ Error updating attendance:", error);
      toast.error(error.response?.data?.message || "Failed to update attendance.");
    }
  };

  
  const confirmDownload = () => {
    if (!filteredBookings.length) {
      toast.error("No booking data to download.");
      return;
    }
  
    const doc = new jsPDF({ orientation: "landscape", format: "a4" });
  
    // ✅ Set Title & Info
    doc.setFontSize(14);
    doc.text("Booking Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Total Records: ${filteredBookings.length}`, 14, 22);
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
      body: filteredBookings.map((booking, index) => {
        const user = users[booking.userId] || {};
  
        return [
          index + 1,
          user?.name || "N/A",
          booking?.name || "N/A",
          booking?.testType || "N/A",
          booking?.testSystem || "N/A",
          booking?.location || "N/A",
          formatDate(booking?.bookingDate) || "N/A",
          booking?.testTime || "N/A",
          user?.email || "N/A",
          user?.contactNo || "N/A",
          user?.transactionId || "N/A",
          user?.passportNumber || "N/A",
          user?.totalMock || "N/A",
          userAttendance[booking.userId] !== null ? userAttendance[booking.userId] : "N/A",
         
        ];
      }),
      startY: 25,
      styles: { fontSize: 7, overflow: "linebreak" },
      headStyles: { fillColor: "#face39", textColor: "#000" },
      columnStyles: {
        0: { cellWidth: 8 },   // #
        1: { cellWidth: 30 },   // User Name
        2: { cellWidth: 15 },   // Course Name
        3: { cellWidth: 30 },   // Test Type
        4: { cellWidth: 20 },   // Test System
        5: { cellWidth: 22 },   // Location
        6: { cellWidth: 25 },   // Exam Date
        7: { cellWidth: 35 },   // Email
        8: { cellWidth: 20 },   // Phone
        9: { cellWidth: 18 },   // Transaction ID
        10: { cellWidth: 22 },  // Passport Number
        11: { cellWidth: 17 },  // Purchased
        12: { cellWidth: 15 },  // Attend
        
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
    return bookings.filter((booking) => {
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
    });
  }, [bookings, testTypeFilter, dateFilter, startDateFilter, nameFilter, courseNameFilter]);
  
  const indexOfLastSchedule = currentPage * schedulesPerPage;
  const indexOfFirstSchedule = indexOfLastSchedule - schedulesPerPage;
  const currentSchedules = filteredBookings.slice(indexOfFirstSchedule, indexOfLastSchedule);
  

  function formatTime(time: string) {
    const [hour, minute] = time.split(":").map(Number);
    const period = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minute.toString().padStart(2, "0")} ${period}`;
  }
  return (
    <div className="p-4 w-full max-w-7xl mx-auto overflow-x-auto">
<div className="bg-gray-100 p-8 h-auto mb-3 rounded shadow-sm">
  <h3 className="font-bold text-lg mb-2">Filter by</h3>

  <div className="flex flex-col sm:flex-row gap-4 text-sm">
    {/* Name Filter */}
    <label className="flex flex-col">
      <span className="mb-1">Search by Name</span>
      <input
        type="text"
        value={nameFilter}
        onChange={(e) => setNameFilter(e.target.value)}
        placeholder="Enter name..."
        className="px-2 py-1 border rounded w-full sm:w-auto"
      />
    </label>

    {/* Test Type Filter */}
    <label className="flex flex-col">
      <span className="mb-1">Course Type</span>
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
    </label>

    {/* Date Filter */}
    <label className="flex flex-col">
      <span className="mb-1">Schedule</span>
      <select
        value={dateFilter}
        onChange={(e) => setDateFilter(e.target.value)}
        className="px-2 py-1 border rounded w-full sm:w-auto"
      >
        <option value="all">All Schedules</option>
        <option value="past">Past</option>
        <option value="upcoming">Upcoming</option>
      </select>
    </label>

    {/* Start Date Filter */}
    <label className="flex flex-col">
      <span className="mb-1">Search by Date</span>
      <input
        type="date"
        value={startDateFilter}
        onChange={(e) => setStartDateFilter(e.target.value)}
        className="px-2 py-1 border rounded w-full sm:w-auto"
      />
    </label>
  </div>
</div>


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
      {filteredBookings.length > 0 ? (
        filteredBookings.map((booking, index) => {
          const user = users[booking.userId] || {};
          return (
            <tr key={booking._id} className="text-center border-b text-sm">
              <td className="p-4">{index + 1}</td>
              <td className="p-4">{user.name || "N/A"}</td>
              <td className="p-4">{booking.name}</td>
              <td className="p-4">{booking.testType}</td>
              <td className="p-4">{booking.testSystem}</td>
              <td className="p-4">{booking.location}</td>
              <td className="p-4">{formatDate(booking.bookingDate)}</td>
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
              <td className="px-4 py-2 text-sm">
  {userAttendance[booking.userId] !== undefined && userAttendance[booking.userId] !== null
    ? userAttendance[booking.userId] 
    : "N/A"}
</td>

              <td className="p-4">
  <select
    className="border rounded px-2 py-1"
    value={attendance[booking.userId] || "N/A"} // ✅ Ensures the latest attendance is displayed
    onChange={(e) =>
      handleSubmit(
        booking.location === "Home" ? "Home" : booking.scheduleId || "",
        booking.userId,
        e.target.value,
        booking.location,
        booking.bookingDate ?? "" // ✅ Ensure a string is passed (Fixes TypeScript error)
      )
    }
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
         <td colSpan={14} className="p-4 text-center text-gray-500">No matching bookings found.</td>

        </tr>
      )}
    </tbody>
  </table>
</div>


      {/* Action Buttons */}
      <div className="mt-8 flex justify-start space-x-4">
        <button
          onClick={confirmDownload}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Download as PDF
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
  Page {currentPage} / {Math.ceil(filteredBookings.length / schedulesPerPage)}
</span>
<button
  onClick={() => setCurrentPage((prev) => prev + 1)}
  disabled={indexOfLastSchedule >= filteredBookings.length}
  className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
>
  Next
</button>

        </div>
      </div>
    </div>
  );
}

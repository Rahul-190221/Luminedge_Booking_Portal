"use client";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { FiDownload } from "react-icons/fi"; // Download icon
import { jsPDF } from "jspdf";
import Link from "next/link";
import "jspdf-autotable";
import axios from "axios";

// Extend jsPDF type to include autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => void;
  }
}

// Define a type for the schedule
type Schedule = {
  id: string;
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

function BookingRequestsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [bookingsPerPage, setBookingsPerPage] = useState<number>(10);
  // State to hold the generic filter value
const [filter, setFilter] = useState<string>("");

// State to manage sorting order
const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

// State to track the schedule type (current, past, or upcoming schedules)
const [scheduleType, setScheduleType] = useState<"current" | "past" | "upcoming">("current");

// State to filter bookings by test name
const [testNameFilter, setTestNameFilter] = useState<string>("");

// State to filter bookings by a specific date
const [dateFilter, setDateFilter] = useState<string>("");


  const [totalBookings, setTotalBookings] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newAttendanceValues, setNewAttendanceValues] = useState<{
    [key: string]: string;
  }>({});
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [userDetails, setUserDetails] = useState<{
    [key: string]: {
      name: string;
      email: string;
      contactNo?: string;
      transactionId?: string;
      passportNumber?: string;
      totalMock?: number;
      mock?: number;
      attendance?: string;
      status?: string;
      bookingDate?: string;
    };
  }>({});
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [attendanceValues, setAttendanceValues] = useState<{
    [key: string]: string;
  }>({});
  const [statusValues, setStatusValues] = useState<{ [key: string]: string }>(
    {}
  );
  const [selectBookings, setSelectBookings] = useState<{
    [key: string]: {
      status: string;
      attendance?: string;
    };
  }>({});
  const [isDownloadPreviewOpen, setIsDownloadPreviewOpen] =
    useState<boolean>(false);
  const [bookingToDownload, setBookingToDownload] = useState<any | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [selectedAttendance, setSelectedAttendance] = useState<string>("");

  // Extract unique test names for the dropdown
  const testNames = Array.from(
    new Set(bookings.map((booking) => booking.testType))
  );

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    if (selectedBooking) {
      // Ensure attendanceValues are populated when a booking is selected
      const attendanceValues = selectedBooking.userIds.reduce(
        (acc: Record<string, string>, userId: string) => {
          const userBooking = totalBookings.find(
            (b) =>
              b.userId === userId && b.scheduleId === selectedBooking.scheduleId
          );
          acc[userId] = userBooking?.attendance || "N/A";
          return acc;
        },
        {}
      );
      setAttendanceValues(attendanceValues);
      console.log("Attendance values set:", attendanceValues); // Debugging line
    }
  }, [selectedBooking, totalBookings]);

  async function fetchBookings() {
    try {
      const response = await fetch(
        `https://luminedge-mock-test-booking-server.vercel.app/api/v1/admin/bookings`
      );
      const data = await response.json();
      setTotalBookings(data.bookings);
      console.log("Fetched bookings:", data.bookings); // Log fetched data
      const uniqueBookings = aggregateBookings(data.bookings);
      console.log("Aggregated bookings:", uniqueBookings); // Log aggregated data
      setBookings(uniqueBookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  }

  function aggregateBookings(bookings: any[]) {
    const bookingMap: { [key: string]: any } = {};

    bookings.forEach((booking) => {
      const key = `${booking.scheduleId}-${booking.slotId}`;
      if (!bookingMap[key]) {
        bookingMap[key] = {
          ...booking,
          userIds: new Set([booking.userId]), // Use a Set to store unique user IDs
          userCount: 1, // Initialize user count
        };
      } else {
        bookingMap[key].userIds.add(booking.userId);
        bookingMap[key].userCount += 1; // Increment user count
      }
    });

    return Object.values(bookingMap).map((booking) => ({
      ...booking,
      userIds: Array.from(booking.userIds), // Convert Set back to Array
    }));
  }

  const indexOfLastBooking = currentPage * bookingsPerPage;
  const indexOfFirstBooking = indexOfLastBooking - bookingsPerPage;
  const currentBookings = bookings.slice(
    indexOfFirstBooking,
    indexOfLastBooking
  );
// Handles generic filter change
function handleFilterChange(e: React.ChangeEvent<HTMLSelectElement>) {
  const value = e.target.value.trim(); // Trim to avoid unintended spaces
  setFilter(value); // Update the filter state
  console.log("Filter updated to:", value); // Debugging log (optional)
}

// Handles sort order change with proper type safety
function handleSortOrderChange(e: React.ChangeEvent<HTMLSelectElement>) {
  const sortOrder = e.target.value as "asc" | "desc"; // Cast to "asc" | "desc"
  setSortOrder(sortOrder); // Update the sortOrder state
  console.log("Sort order updated to:", sortOrder); // Debugging log (optional)
}

// Handles schedule type change with proper type safety
function handleScheduleTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
  const scheduleType = e.target.value as "current" | "past" | "upcoming"; // Cast to specific types
  setScheduleType(scheduleType); // Update the scheduleType state
  console.log("Schedule type updated to:", scheduleType); // Debugging log (optional)
}

// Handles test name filter change
function handleTestNameFilterChange(e: React.ChangeEvent<HTMLSelectElement>) {
  const testName = e.target.value.trim(); // Trim to clean up the input
  setTestNameFilter(testName); // Update the testNameFilter state
  console.log("Test name filter updated to:", testName); // Debugging log (optional)
}

// Handles date filter change for an input field
function handleDateFilterChange(e: React.ChangeEvent<HTMLInputElement>) {
  const date = e.target.value; // Retrieve the selected date
  setDateFilter(date); // Update the dateFilter state
  console.log("Date filter updated to:", date); // Debugging log (optional)
}


  function handleDownloadClick(booking: any) {
    setBookingToDownload(booking);
    // Fetch user data for the selected booking before opening the preview
    Promise.all(booking.userIds.map(fetchUserData)).then(() => {
      setIsDownloadPreviewOpen(true);
    });
  }

  function handlePrint() {
    const doc = new jsPDF();
    doc.text("Booking Details", 10, 10);
    selectedBooking.userIds.forEach((userId: string, index: number) => {
      const user = userDetails[userId];
      if (user) {
        doc.text(`Name: ${user.name}`, 10, 20 + index * 20);
        doc.text(`Email: ${user.email}`, 10, 30 + index * 20);
        doc.text(`Phone: ${user?.contactNo || "N/A"}`, 10, 40 + index * 20);
        doc.text(
          `Transaction ID: ${user?.transactionId || "N/A"}`,
          10,
          50 + index * 20
        );
        doc.text(
          `Slot: ${selectedBooking.startTime} - ${selectedBooking.endTime} (Slot: ${selectedBooking.slotId})`,
          10,
          50 + index * 20
        );
      }
    });
    doc.save(
      `booking_${selectedBooking.bookingDate}_${selectedBooking.slotId}.pdf`
    );
    setIsPrintModalOpen(false);
  }

  async function fetchUserData(userId: string) {
    try {
      const response = await fetch(
        `https://luminedge-mock-test-booking-server.vercel.app/api/v1/user/${userId}`
      );
      const data = await response.json();
      const {
        name,
        email,
        contactNo,
        transactionId,
        passportNumber,
        totalMock,
        mock,
      } = data.user;
      setUserDetails((prev) => ({
        ...prev,
        [userId]: {
          name,
          email,
          contactNo,
          transactionId,
          passportNumber,
          totalMock,
          mock,
        },
      }));
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }

  function seeBookingDetails(booking: any) {
    setSelectedBooking(booking);
    //console.log(booking);

    // Map attendance values from totalBookings data
    const attendanceValues = booking.userIds.reduce(
      (acc: Record<string, string>, userId: string) => {
        const userBooking = totalBookings.find(
          (b) => b.userId === userId && b.scheduleId === booking.scheduleId
        );
        acc[userId] = userBooking?.attendance || "N/A"; // Use attendance from totalBookings or "Not Found"
        return acc;
      },
      {}
    );

    // Initialize selectBookings for each user with existing values if available
    const initialSelectBookings = booking.userIds.reduce(
      (acc: any, userId: string) => {
        acc[userId] = {
          attendance: attendanceValues[userId], // Use mapped attendance value
          status: statusValues[userId] || "", // Use existing value or empty
        };
        //console.log(acc);
        return acc;
      },
      {}
    );
    // console.log(attendanceValues);

    setSelectBookings(initialSelectBookings);
    booking.userIds.forEach(fetchUserData);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setSelectedBooking(null);
  }

  async function handleSubmit(userId: string, attendance: string | undefined) {
    try {
      let status; // Declare a new variable for status

      if (attendance === "present") {
        status = "completed";
      } else if (attendance === "absent") {
        status = "missed";
      }

      //console.log(attendance);
      // Update booking status and attendance
      await fetch(
        `https://luminedge-mock-test-booking-server.vercel.app/api/v1/user/bookings/${selectedBooking.scheduleId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attendance,
            status,
            userId,
          }),
        }
      );

      // Send notification
      await fetch(`https://luminedge-mock-test-booking-server.vercel.app/api/v1/notifications/send`, {
        method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           userId,
           message: "Your booking has been accepted.",
         }),
       });
 
      

      toast.success("Attendance updated successfully!");
    } catch (error) {
      console.error("Error accepting user:", error);
      toast.error("Failed to accept user.");
    }
  }

  // Filter and sort bookings
  const filteredBookings = bookings
  .filter((booking) => {
    const matchesTestName =
      testNameFilter === "" || booking.testType.toLowerCase() === testNameFilter.toLowerCase();
    const matchesDate =
      dateFilter === "" || booking.bookingDate === dateFilter;
    return matchesTestName && matchesDate;
  })
  .sort((a, b) => {
    const dateA = new Date(a.bookingDate);
    const dateB = new Date(b.bookingDate);

    if (sortOrder === "asc") {
      return dateA.getTime() - dateB.getTime();
    } else {
      return dateB.getTime() - dateA.getTime();
    }
  });

  async function confirmDownload() {
    if (bookingToDownload) {
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(18);
      doc.text("Booking Details", 10, 10);

      // Add metadata (date and schedule time)
      doc.setFontSize(12);
      doc.text(`Test Name: ${bookingToDownload.name}`, 10, 20);
      doc.text(`Date: ${bookingToDownload.bookingDate}`, 10, 25);
      doc.text(
        `Schedule Time: ${bookingToDownload.startTime} - ${bookingToDownload.endTime}`,
        10,
        30
      );

      // Prepare table data
      const tableData = await Promise.all(
        bookingToDownload.userIds.map(async (userId: string) => {
          const user = userDetails[userId];
          const attendanceResponse = await axios.get(
            `https://luminedge-mock-test-booking-server.vercel.app/api/v1/user/attendance/${userId}`
          );
          const attendanceValue = attendanceResponse.data.attendance || "N/A"; // Get attendance value
          return [
            user?.name || "N/A",
            user?.email || "N/A",
            user?.contactNo || "N/A",
            user?.transactionId || "N/A",
            user?.passportNumber || "N/A",
            user?.totalMock || "N/A",
            attendanceValue, // Add attendance value to the table data
          ];
        })
      );

      // Add table using autoTable plugin
      doc.autoTable({
        head: [
          [
            "User Name",
            "Email",
            "Phone",
            "Transaction ID",
            "Passport Number",
            "Purchased",
            "Attend",
          ],
        ], // Table headers
        body: tableData, // Table data
        startY: 40, // Positioning the table below the metadata
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [220, 220, 220], textColor: 0 },
      });

      // Save the PDF
      doc.save(
        `booking_${bookingToDownload.bookingDate}_${bookingToDownload.slotId}.pdf`
      );
    }
    setIsDownloadPreviewOpen(false);
  }

  const handleBookingChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBookingId(event.target.value);
  };

  const handleAttendanceChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setSelectedAttendance(event.target.value);
  };

  return (
    <div className="px-2 ">
      <h1 className="text-2xl font-bold mb-4">Booking Requests</h1>

      <div className="flex justify-start gap-5 items-center mb-4">
  {/* Test Name Filter */}
  <label>
    <span className="block text-sm font-medium text-gray-700">Test Name</span>
    <select
      value={testNameFilter}
      onChange={handleTestNameFilterChange}
      className="px-2 py-1 border rounded"
      aria-label="Filter by Test Name"
    >
      <option value="">All Test Names</option>
      <option value="IELTS">IELTS</option>
      <option value="GRE">GRE</option>
      <option value="TOEFL">TOEFL</option>
      <option value="Pearson">Pearson</option>
    </select>
  </label>
  
  {/* Booking Date Filter */}
  <label>
    <span className="block text-sm font-medium text-gray-700">Booking Date</span>
    <input
      type="date"
      value={dateFilter}
      onChange={handleDateFilterChange}
      className="px-2 py-1 border rounded"
      aria-label="Filter by Date"
    />
  </label>
  
  {/* Sort Order Filter */}
  <label>
    <span className="block text-sm font-medium text-gray-700">Sort Order</span>
    <select
      value={sortOrder}
      onChange={handleSortOrderChange}
      className="px-2 py-1 border rounded"
      aria-label="Sort Order"
    >
      <option value="asc">Ascending</option>
      <option value="desc">Descending</option>
    </select>
  </label>
</div>



      <div className="overflow-x-auto">
        <table className="table-auto w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Test Name</th>
              <th className="px-4 py-2 text-left">Booking Date</th>
              <th className="px-4 py-2 text-left">Slot</th>
              <th className="px-4 py-2 text-left">User Count</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((booking, index) => (
              <tr
                key={`${booking.id || index}-${booking.bookingDate}-${
                  booking.slotId
                }`}
                className="border-b"
              >
                <td className="px-4 py-2">{booking.name}</td>
                <td className="px-4 py-2">{booking.testType}</td>
                <td className="px-4 py-2">{booking.bookingDate}</td>
                <td className="px-4 py-2">
                  {booking.startTime.slice(0, 5)} -{" "}
                  {booking.endTime.slice(0, 5)}{" "}
                </td>
                <td className="px-4 py-2 text-center">
                  {booking.userIds.length}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleDownloadClick(booking)}
                    className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => seeBookingDetails(booking)}
                    className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    See Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-4 rounded shadow-lg relative">
            <button
              onClick={closeModal}
              className="absolute top-2 mr-2 right-2 text-4xl font-bold text-gray-500 hover:text-red-700"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4">Booking Details</h2>
            <table className="table-auto w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Email</th>

                  <th className="px-4 text-left">Request Date</th>
                  <th className="px-4 text-left">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {selectedBooking.userIds.map((userId: string) => (
                  <tr key={userId} className="border-b">
                    <td className="px-4 py-2">
                      {userDetails[userId]?.name || "Loading..."}
                    </td>
                    <td className="px-4">
                      {userDetails[userId]?.email || "Loading..."}
                    </td>
                    <td className="px-4">
                      {selectedBooking.bookingDate || "Loading..."}
                    </td>
                    <td className="px-4">
                      {attendanceValues[userId] === "present" ||
                      attendanceValues[userId] === "absent" ? (
                        <span>{attendanceValues[userId]}</span>
                      ) : (
                        <select
                          className="px-2 py-1 border rounded"
                          value={attendanceValues[userId] || ""}
                          onChange={(e) => {
                            const newAttendance = e.target.value;
                            handleSubmit(userId, newAttendance);
                          }}
                        >
                          <option value="N/A" disabled selected>
                            Select Attendance
                          </option>
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mt-4">
        <div>
          <label htmlFor="bookingsPerPage" className="mr-2">
            Bookings per page:
          </label>
          <select
            id="bookingsPerPage"
            value={bookingsPerPage}
            onChange={(e) => setBookingsPerPage(Number(e.target.value))}
            className="px-2 py-1 border rounded"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
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
            disabled={indexOfLastBooking >= bookings.length}
            className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
          >
            Next
          </button>
        </div>
      </div>

      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-4 rounded shadow-lg relative">
            <button
              onClick={() => setIsPrintModalOpen(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4">Print Preview</h2>
            <table className="table-auto w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="px-4 py-2 text-left">User Name</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Slot</th>
                </tr>
              </thead>
              <tbody>
                {selectedBooking.userIds.map((userId: string) => (
                  <tr key={userId} className="border-b">
                    <td className="px-4 py-2">
                      {userDetails[userId]?.name || "Loading..."}
                    </td>
                    <td className="px-4 py-2">
                      {userDetails[userId]?.email || "Loading..."}
                    </td>
                    <td className="px-4 py-2">
                      {selectedBooking.startTime} - {selectedBooking.endTime}{" "}
                      (Slot: {selectedBooking.slotId})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={handlePrint}
              className="mt-4 px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Print
            </button>
          </div>
        </div>
      )}

      {isDownloadPreviewOpen && bookingToDownload && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-4 rounded shadow-lg relative">
            <button
              onClick={() => setIsDownloadPreviewOpen(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4">Download Preview</h2>
            <h4 className="font-bold">{bookingToDownload.name}</h4>
            <h3 className="text-lg text-amber-600">
              <strong>Date : {bookingToDownload.bookingDate}</strong>
            </h3>
            <h3 className="text-lg font-bold">
              Schedule Time :{" "}
              <span style={{ color: "blue" }}>
                {bookingToDownload.startTime.slice(0, 5)} -{" "}
                {bookingToDownload.endTime.slice(0, 5)}
              </span>
            </h3>
            <table className="table-auto w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="px-4 py-2 text-left">User Name</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Phone</th>
                </tr>
              </thead>
              <tbody>
                {bookingToDownload.userIds.map((userId: string) => (
                  <tr key={userId} className="border-b">
                    <td className="px-4 py-2">
                      {userDetails[userId]?.name || "Loading..."}
                    </td>
                    <td className="px-4 py-2">
                      {userDetails[userId]?.email || "Loading..."}
                    </td>
                    <td className="px-4 py-2">
                      {userDetails[userId]?.contactNo || "Loading..."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={confirmDownload}
              className="mt-4 px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Confirm Download
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingRequestsPage;

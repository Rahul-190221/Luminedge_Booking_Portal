"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";

type Booking = {
  id: string;
  name: string;
  testType: string;
  testSystem: string;
  bookingDate: string;
  scheduleId: string;
  slotId: string;
  startTime: string;
  endTime: string;
  userId: string[];
  userCount: number;
  attendance?: string;
};

const BookingRequestsPage = ({ params }: { params: { id: string } }) => {
  const { id: scheduleId } = params || {};
  if (!scheduleId) {
    return <div>No Schedule ID provided.</div>;
  }

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [attendance, setAttendance] = useState<{ [key: string]: string }>({});

  const fetchBookingsAndUsers = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch bookings
      const bookingsResponse = await fetch(
        `https://luminedge-mock-test-booking-server.vercel.app/api/v1/admin/bookings`
      );
      if (!bookingsResponse.ok) {
        throw new Error("Failed to fetch bookings");
      }
      const bookingsData = await bookingsResponse.json();

      // Filter bookings for the given scheduleId
      const filteredBookings = bookingsData.bookings.filter(
        (booking: Booking) => booking.scheduleId === scheduleId
      );

      const userIds = Array.from(
        new Set(
          filteredBookings.map((booking: { userId: any }) =>
            Array.isArray(booking.userId) ? booking.userId : [booking.userId]
          ).flat()
        )
      );

      // Fetch users
      const usersResponse = await fetch(
        `https://luminedge-mock-test-booking-server.vercel.app/api/v1/admin/users`
      );
      if (!usersResponse.ok) {
        throw new Error("Failed to fetch user data");
      }
      const usersData = await usersResponse.json();

      // Filter users based on userIds from bookings
      const matchedUsers = usersData?.users?.filter((user: any) =>
        userIds.includes(user?._id)
      );

      // Initialize attendance state based on bookings
      const initialAttendance: any = {};
      filteredBookings.forEach((booking) => {
        initialAttendance[booking.userId] = booking.attendance || "N/A";
      });

      setBookings(filteredBookings);
      setUsers(matchedUsers);
      setAttendance(initialAttendance);
    } catch (error) {
      toast.error("Error fetching data. Please try again.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    fetchBookingsAndUsers();
  }, [fetchBookingsAndUsers]);

  const handleSubmit = async (userId: string, attendanceValue: string) => {
    try {
      if (!userId || !attendanceValue) {
        toast.error("Invalid attendance update request.");
        return;
      }

      const status = attendanceValue === "present" ? "completed" : "missed";

      const response = await fetch(
        `https://luminedge-mock-test-booking-server.vercel.app/api/v1/user/bookings/${scheduleId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            attendance: attendanceValue,
            status,
          }),
        }
      );

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.message || "Failed to update attendance");
      }

      setAttendance((prev) => ({
        ...prev,
        [userId]: attendanceValue,
      }));

      toast.success("Attendance updated successfully!");
    } catch (error: any) {
      console.error("Error updating attendance:", error);
      toast.error(error.message || "Failed to update attendance.");
    }
  };

  const confirmDownload = () => {
    const doc = new jsPDF({
      orientation: "landscape", // Landscape for a wider layout
      format: "a4", // A3 size for a larger page
    });
  
    const tableData = users.map((user, index) => [
      index + 1,
      user?.name || "N/A",
      user?.email || "N/A",
      user?.contactNo || "N/A",
      user?.transactionId || "N/A",
      user?.passportNumber || "N/A",
      bookings.find((booking) => booking.userId.includes(user._id))?.testType ||
        "N/A",
      bookings.find((booking) => booking.userId.includes(user._id))
        ?.testSystem || "N/A",
      user?.totalMock || "N/A",
      user?.mock || "N/A",
      attendance[user._id] || "N/A",
    ]);
  
    doc.text("Booking Requests", 14, 20); // Title with some spacing
  
    doc.autoTable({
      head: [
        [
          "List",
          "User Name",
          "Email",
          "Phone",
          "Transaction ID",
          "Passport Number",
          "Test Type",
          "Test System",
          "Purchased",
          "Attend",
          "Attendance",
        ],
      ],
      body: tableData,
      theme: "grid", // Grid for clear table borders
      styles: {
        fontSize: 10, // Adjust font size for better readability
      },
      margin: { top: 30 }, // Top margin for spacing
      tableWidth: "auto", // Adjust table width dynamically
      columnStyles: {
        0: { cellWidth: 10 }, // Column 1 (List) width
        1: { cellWidth: 30 }, // Column 2 (User Name) width
        2: { cellWidth: 50 }, // Column 3 (Email) width
        // Adjust other column widths as needed
      },
    });
  
    doc.save("booking_requests.pdf");
  };

  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="px-4 py-2 text-left">List</th>
                <th className="px-4 py-2 text-left">User Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Phone</th>
                <th className="px-4 py-2 text-left">Transaction ID</th>
                <th className="px-4 py-2 text-left">Passport Number</th>
                <th className="px-4 py-2 text-left">Test Type</th>
                <th className="px-4 py-2 text-left">Test System</th>
                <th className="px-4 py-2 text-left">Purchased</th>
                <th className="px-4 py-2 text-left">Attend</th>
                <th className="px-4 py-2 text-left">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={user._id} className="border-b">
                  <td className="px-4 py-2">{index + 1}</td>
                  <td className="px-4 py-2">{user?.name || "N/A"}</td>
                  <td className="px-4 py-2">{user?.email || "N/A"}</td>
                  <td className="px-4 py-2">{user?.contactNo || "N/A"}</td>
                  <td className="px-4 py-2">{user?.transactionId || "N/A"}</td>
                  <td className="px-4 py-2">{user?.passportNumber || "N/A"}</td>
                  <td className="px-4 py-2">
                    {
                      bookings.find((booking) =>
                        booking.userId.includes(user._id)
                      )?.testType || "N/A"
                    }
                  </td>
                  <td className="px-4 py-2">
                    {
                      bookings.find((booking) =>
                        booking.userId.includes(user._id)
                      )?.testSystem || "N/A"
                    }
                  </td>
                  <td className="px-4 py-2">{user?.totalMock || "N/A"}</td>
                  <td className="px-4 py-2">{user?.mock || "N/A"}</td>
                  <td className="px-4 py-2">
                    <select
                      className="px-2 py-1 border rounded"
                      value={attendance[user._id] || "N/A"}
                      onChange={(e) => handleSubmit(user._id, e.target.value)}
                    >
                      <option value="N/A" disabled>
                        Select Attendance
                      </option>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={confirmDownload}
            className="mt-4 px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Download as PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default BookingRequestsPage;

"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [attendance, setAttendance] = useState<{ [key: string]: string }>({});
  const [userAttendance, setUserAttendance] = useState<{ [key: string]: number | null }>({});

  const fetchBookingsAndUsers = useCallback(async () => {
    if (!scheduleId) return;

    try {
      setLoading(true);

      const bookingsResponse = await axios.get(
        `https://luminedge-mock-test-booking-server.vercel.app/api/v1/admin/bookings`
      );
      const bookingsData = bookingsResponse.data;

      const filteredBookings = bookingsData.bookings.filter(
        (booking: Booking) => booking.scheduleId === scheduleId
      );

      const userIds = Array.from(
        new Set(
          filteredBookings.flatMap((booking: { userId: any }) =>
            Array.isArray(booking.userId) ? booking.userId : [booking.userId]
          )
        )
      );

      const usersResponse = await axios.get(
        `https://luminedge-mock-test-booking-server.vercel.app/api/v1/admin/users`
      );
      const usersData = usersResponse.data;

      const matchedUsers = usersData?.users?.filter((user: any) =>
        userIds.includes(user?._id)
      );

      const initialAttendance: { [key: string]: string } = {};
      filteredBookings.forEach((booking: { userId: any[] | string; attendance: string }) => {
        if (Array.isArray(booking.userId)) {
          booking.userId.forEach((id) => {
            initialAttendance[id] = booking.attendance || "N/A";
          });
        } else {
          initialAttendance[booking.userId] = booking.attendance || "N/A";
        }
      });

      setBookings(filteredBookings);
      setUsers(matchedUsers);
      setAttendance(initialAttendance);

      // Fetch individual user attendance
      const attendanceData: Record<string, number | null> = {};
      await Promise.all(
        userIds.map(async (userId) => {
          try {
            const response = await axios.get(
              `https://luminedge-mock-test-booking-server.vercel.app/api/v1/user/attendance/${userId}`
            );
            attendanceData[userId as string] = response.data.attendance || 0;
          } catch (error) {
            console.error(`Error fetching attendance for user ${userId}:`, error);
            attendanceData[userId as string] = null;
          }
        })
      );
      setUserAttendance(attendanceData);
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

      const response = await axios.put(
        `https://luminedge-mock-test-booking-server.vercel.app/api/v1/user/bookings/${scheduleId}`,
        {
          userId,
          attendance: attendanceValue,
          status,
        }
      );

      if (response.status !== 200) {
        throw new Error(response.data.message || "Failed to update attendance");
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
    if (!bookings.length) {
      toast.error("No booking data to download.");
      return;
    }

    const bookingToDownload = bookings[0];

    const doc = new jsPDF({ orientation: "landscape", format: "a4" });

    doc.setFontSize(12);
    doc.text("Booking Details", 10, 15);
    doc.text(`Test Name: ${bookingToDownload.name}`, 10, 20);
    doc.text(`Date: ${bookingToDownload.bookingDate}`, 10, 25);
    doc.text(
      `Schedule Time: ${bookingToDownload.startTime} - ${bookingToDownload.endTime}`,
      10,
      30
    );

    autoTable(doc, {
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
      body: users.map((user, index) => [
        index + 1,
        user?.name || "N/A",
        user?.email || "N/A",
        user?.contactNo || "N/A",
        user?.transactionId || "N/A",
        user?.passportNumber || "N/A",
        bookings.find((booking) => booking.userId.includes(user._id))?.testType || "N/A",
        bookings.find((booking) => booking.userId.includes(user._id))?.testSystem || "N/A",
        user?.totalMock || "N/A",
        userAttendance[user._id] !== null ? userAttendance[user._id] : "N/A",
        attendance[user._id] || "N/A",
      ]),
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: "#face39" },
      margin: { top: 35 },
      tableWidth: "auto",
    });

    const currentDate = new Date().toISOString().split("T")[0];
    doc.save(`booking_requests_${currentDate}.pdf`);
  };

  if (!scheduleId) {
    return <div>No Schedule ID provided.</div>;
  }

  return (
    <div className="p-4">
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="mb-2 p-2 rounded shadow">
            <h2 className="text-lg font-semibold">Booking Details</h2>
            <p><strong>Test Name:</strong> {bookings[0]?.name || "N/A"}</p>
            <p><strong>Date:</strong> {bookings[0]?.bookingDate || "N/A"}</p>
            <p>
              <strong>Schedule Time:</strong>{" "}
              {bookings[0]?.startTime && bookings[0]?.endTime
                ? `${bookings[0]?.startTime} - ${bookings[0]?.endTime}`
                : "N/A"}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="table-auto w-full border-collapse mt-2">
              <thead>
                <tr className="bg-[#face39]">
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
                    <td className="px-4 py-2 text-sm">{index + 1}</td>
                    <td className="px-4 py-2 text-sm">{user?.name || "N/A"}</td>
                    <td className="px-4 py-2 text-sm">{user?.email || "N/A"}</td>
                    <td className="px-4 py-2 text-sm">{user?.contactNo || "N/A"}</td>
                    <td className="px-4 py-2 text-sm">{user?.transactionId || "N/A"}</td>
                    <td className="px-4 py-2 text-sm">{user?.passportNumber || "N/A"}</td>
                    <td className="px-4 py-2 text-sm">
                      {bookings.find((booking) => booking.userId.includes(user._id))?.testType || "N/A"}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {bookings.find((booking) => booking.userId.includes(user._id))?.testSystem || "N/A"}
                    </td>
                    <td className="px-4 py-2 text-sm">{user?.totalMock || "N/A"}</td>
                    <td className="px-4 py-2 text-sm">
                      {userAttendance[user._id] !== null ? userAttendance[user._id] : "N/A"}
                    </td>
                    <td className="px-4 py-2">
                      <select
                        className="px-2 py-1 border rounded text-sm"
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
          </div>
          <div className="mt-10 sm:mt-0">
            <button
              onClick={confirmDownload}
              className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 w-full sm:w-auto"
            >
              Download as PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingRequestsPage;

"use client";

import { useState, useEffect, useCallback, ChangeEvent } from "react";
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
const [filter, setFilter] = useState<string>("");
  const [testTypeFilter, setTestTypeFilter] = useState<string>("");
  const [testSystemFilter, setTestSystemFilter] = useState<string>("");
  const [userAttendance, setUserAttendance] = useState<{ [key: string]: number | null }>({});
  const [attendanceFilter, setAttendanceFilter] = useState<string>("");
  const [attendanceCounts, setAttendanceCounts] = useState({
    present: 0,
    absent: 0,
  });
  const [emailsSent, setEmailsSentState] = useState<boolean>(false);

  const fetchBookingsAndUsers = useCallback(async () => {
    if (!scheduleId) return;

    try {
      setLoading(true);

      const bookingsResponse = await axios.get(
        `https://luminedge-server.vercel.app/api/v1/admin/bookings`
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
        `https://luminedge-server.vercel.app/api/v1/admin/users`
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
// Calculate attendance counts
const presentCount = Object.values(initialAttendance).filter(
  (status) => status === "present"
).length;
const absentCount = Object.values(initialAttendance).filter(
  (status) => status === "absent"
).length;

      setBookings(filteredBookings);
      setUsers(matchedUsers);
      setAttendance(initialAttendance);
      setAttendanceCounts({ present: presentCount, absent: absentCount });
      // Fetch individual user attendance
      const attendanceData: Record<string, number | null> = {};
      await Promise.all(
        userIds.map(async (userId) => {
          try {
            const response = await axios.get(
              `https://luminedge-server.vercel.app/api/v1/user/attendance/${userId}`
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

      const status = attendanceValue === "present" ? "Present" : "Absent";

      const response = await axios.put(
        `https://luminedge-server.vercel.app/api/v1/user/bookings/${scheduleId}`,
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

  // const confirmDownload = () => {
  //   if (!bookings.length) {
  //     toast.error("No booking data to download.");
  //     return;
  //   }

  //   const bookingToDownload = bookings[0];

  //   const doc = new jsPDF({ orientation: "landscape", format: "a4" });

  //   doc.setFontSize(10);
  //   doc.text("Booking Details", 10, 15);
  //   doc.text(`Test Name: ${bookingToDownload.name}`, 10, 20);
  //   doc.text(`Date: ${bookingToDownload.bookingDate}`, 10, 25);
  //   doc.text(
  //     `Schedule Time: ${bookingToDownload.startTime} - ${bookingToDownload.endTime}`,
  //     10,
  //     30
  //   );

  //   autoTable(doc, {
  //     head: [
  //       [
  //         "List",
  //         "User Name",
  //         "Email",
  //         "Phone",
  //         "Transaction ID",
  //         "Passport Number",
  //         "Test Type",
  //         "Test System",
  //         "Purchased",
  //         "Attend",
  //         "Attendance",
  //       ],
  //     ],
  //     body: users.map((user, index) => [
  //       index + 1,
  //       user?.name || "N/A",
  //       user?.email || "N/A",
  //       user?.contactNo || "N/A",
  //       user?.transactionId || "N/A",
  //       user?.passportNumber || "N/A",
  //       bookings.find((booking) => booking.userId.includes(user._id))?.testType || "N/A",
  //       bookings.find((booking) => booking.userId.includes(user._id))?.testSystem || "N/A",
  //       user?.totalMock || "N/A",
  //       userAttendance[user._id] !== null ? userAttendance[user._id] : "N/A",
  //       attendance[user._id] || "N/A",
  //     ]),
  //     theme: "grid",
  //     styles: { fontSize: 10 },
  //     headStyles: { fillColor: "#face39" },
  //     margin: { top: 35 },
  //     tableWidth: "auto",
  //   });

  //   const currentDate = new Date().toISOString().split("T")[0];
  //   doc.save(`booking_requests_${currentDate}.pdf`);
  // };
  const confirmDownload = () => {
    if (!bookings.length) {
      toast.error("No booking data to download.");
      return;
    }
  
    const bookingToDownload = bookings[0];
  
    const doc = new jsPDF({ orientation: "landscape", format: "a4" });
  
    doc.setFontSize(10);
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
      body: users.map((user, index) => {
        let userId = user._id;
        if (Array.isArray(userId)) {
          userId = userId[0]; // Take the first user ID if it's an array
        }
  
        const relatedBooking = bookings.find(
          (booking) => booking.userId === userId
        );
  
        return [
          index + 1,
          user?.name || "N/A",
          user?.email || "N/A",
          user?.contactNo || "N/A",
          user?.transactionId || "N/A",
          user?.passportNumber || "N/A",
          relatedBooking?.testType || "N/A",
          relatedBooking?.testSystem || "N/A",
          user?.totalMock || "N/A",
          userAttendance[userId] !== null ? userAttendance[userId] : "N/A",
          attendance[userId] || "N/A",
        ];
      }),
      theme: "grid",
      styles: { fontSize: 10, overflow: "linebreak" },
      headStyles: { fillColor: "#face39" },
      columnStyles: {
        0: { cellWidth: 10 }, // List #
        1: { cellWidth: 35 }, // User Name
        2: { cellWidth: 53 }, // Email
        3: { cellWidth: 26 }, // Phone
        4: { cellWidth: 25 }, // Transaction ID
        5: { cellWidth: 25 }, // Passport Number
        6: { cellWidth: 25 }, // Test Type
        7: { cellWidth: 25 }, // Test System
        8: { cellWidth: 22 }, // Purchased
        9: { cellWidth: 15 }, // Attend
        10: { cellWidth: 23 }, // Attendance
      },
      margin: { top: 35 },
      tableWidth: "auto",
    });
  
    const currentDate = new Date().toISOString().split("T")[0];
    doc.save(`booking_requests_${currentDate}.pdf`);
  };
  if (!scheduleId) {
    return <div>No Schedule ID provided.</div>;
  }
  const filterUsers = (
    users: any[],
    bookings: Booking[],
    filter: string,
    testTypeFilter: string,
    testSystemFilter: string,
    attendanceFilter: string
  ) => {
    return users.filter((user) => {
      const userBookings = bookings.find((booking) => booking.userId.includes(user._id));

      const matchesFilter =
        user?.name?.toLowerCase().includes(filter.toLowerCase()) ||
        user?.email?.toLowerCase().includes(filter.toLowerCase());

      const matchesTestType =
        !testTypeFilter ||
        userBookings?.testType?.toLowerCase().trim() === testTypeFilter.toLowerCase().trim();

      const matchesTestSystem =
        !testSystemFilter ||
        userBookings?.testSystem?.toLowerCase().trim() === testSystemFilter.toLowerCase().trim();

      return matchesFilter && matchesTestType && matchesTestSystem;
    });
  };

  const filteredUsers = filterUsers(users, bookings, filter, testTypeFilter, testSystemFilter, attendanceFilter);
  
  
  // Helper Functions for Formatting
  const formatExamDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };
  
  const formatExamTime = (startTime: string, endTime: string) => {
    const options = { hour: "numeric" as const, minute: "numeric" as const, hour12: true };
    const start = new Date(`1970-01-01T${startTime}`).toLocaleTimeString(
      "en-US",
      options
    );
    const end = new Date(`1970-01-01T${endTime}`).toLocaleTimeString(
      "en-US",
      options
    );
    return `${start} - ${end}`;
  };
  
  const handleSendMail = async (users: any[], bookings: any[]) => {
    try {
      // Check if emails were already sent for this scheduleId
      if (localStorage.getItem(`emailsSent_${scheduleId}`)) {
        toast.error("Emails have already been sent for this schedule.");
        return;
      }
  
      // Ensure users and bookings data are available
      if (!users.length || !bookings.length) {
        toast.error("No users or bookings data available.");
        return;
      }
  
      // Prepare personalized email data
      const emailData = users
        .map((user) => {
          const booking = bookings.find((b) => b.userId.includes(user._id));
          if (!booking) return null;
  
          const examDate = formatExamDate(booking.bookingDate);
          const examTime = formatExamTime(booking.startTime, booking.endTime);
  
          return {
            email: user.email,
            subject: "Reminder: Your Mock Test at Luminedge is Tomorrow.",
            message: `
              <p>Dear ${user.name},</p>
              <p>This is a friendly reminder that your mock test is scheduled for tomorrow. Please find the details below:</p>
              <h3>Test Details:</h3>
              <p><strong>Test Title:</strong> ${booking.name} ${booking.testType}</p>
              <p><strong>Test Date:</strong> ${examDate}</p>
              <p><strong>Test Time:</strong> ${examTime}</p>
              <p><strong>Reporting Time:</strong> 30 minutes before Test Time</p>
              <p><strong>Office Address:</strong> Level 12, Gawsia Twin Peak, 743 Satmasjid Road, Dhanmondi 9/A, Dhaka-1205, Bangladesh</p>
              <h3>Important Instructions:</h3>
              <ul>
                <li>Arrive at least 30 minutes before the test time for check-in.</li>
                <li>Bring a valid photo ID (Passport/NID) that matches the ID information provided at the time of account creation.</li>
                <li>Candidates must bring their own stationery items (e.g., pens, pencils, erasers) as they will not be provided at the test venue.</li>
              </ul>
              <h3>Mock Test Terms & Conditions:</h3>
              <ul>
                <li>Purchased or course-provided mock test(s) must be used within 6 months of the MR date.</li>
                <li>Free mock test(s) must be taken within 10 days of the MR date.</li>
                <li>Mock test rescheduling requests must be made 24 hours prior to the booked test date.</li>
                <li>Any mismatch between the provided ID details and the ID shown on the test day may result in test cancellation, and no refunds will be issued in such cases.</li>
                <li>Late arrivals, no-shows, invalid photo IDs, or expired service validity may result in forfeiting the test, with no refund requests entertained.</li>
                <li>Students are required to maintain professional behavior with Luminedge employees at all times. Any instance of misbehavior may result in service cancellation, with no refund issued.</li>
              </ul>
              <p>To facilitate a smooth check-in process, kindly present your valid photo ID (Passport/NID) voucher to our office executive upon arrival. This step is crucial to confirm your eligibility for the mock test.</p>
              <p>We sincerely appreciate your cooperation in adhering to these guidelines. Your punctuality and preparedness will contribute to a successful and efficient mock test experience.</p>
              <p>Thank you for choosing Luminedge for your test preparation needs. If you have any questions or require further assistance, please do not hesitate to contact us.</p>
              <p><strong>Contact Us:</strong> 📞 01400-406374 | 01400-403475 | 01400-403486 | 01400-403487 | 01400-403493 | 01400-403494</p>
              <p>We wish you the best for your mock test!</p>
              <p>Best regards,<br>The Luminedge Team</p>
            `,
          };
        })
        .filter(Boolean);
  
      if (!emailData.length) {
        toast.error("No valid email data to send.");
        return;
      }
  
      // Send emails
      const response = await axios.post("https://luminedge-server.vercel.app/api/v1/send-reminder", {
        emails: emailData,
      });
  
      if (response.status === 200) {
        // Mark emails as sent in localStorage
        localStorage.setItem(`emailsSent_${scheduleId}`, "true");
        toast.success("Emails sent successfully!");
      } else {
        throw new Error(response.data.message || "Failed to send emails.");
      }
    } catch (error) {
      console.error("Error sending emails:", error);
      toast.error("Failed to send emails.");
    }
  };
  
  function setEmailsSent(arg0: boolean) {
    throw new Error("Function not implemented.");
  }
  

  return (
    <div className="p-4">
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* Filters Section */}
          <div className=" bg-gray-100 p-4 h-22 mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Name or Email Filter */}
            <div className="flex flex-col">
              <label htmlFor="filter" className="font-semibold mb-2">
                Filter by Name or Email:
              </label>
              <input
                id="filter"
                type="text"
                placeholder="Search by name or email"
                className="border px-2 py-1 rounded w-full"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
  
            {/* Test Type Filter */}
            <div className="flex flex-col">
              <label htmlFor="testTypeFilter" className="font-semibold mb-2">
                Filter by Test Type:
              </label>
              <select
                id="testTypeFilter"
                value={testTypeFilter}
                onChange={(e) => setTestTypeFilter(e.target.value)}
                className="border px-2 py-1 rounded w-full"
              >
                <option value="">All</option>
                <option value="paper-based">Paper-Based</option>
                <option value="computer-based">Computer-Based</option>
              </select>
            </div>
  
            {/* Test System Filter */}
            <div className="flex flex-col">
              <label htmlFor="testSystemFilter" className="font-semibold mb-2">
                Filter by Test System:
              </label>
              <select
                id="testSystemFilter"
                value={testSystemFilter}
                onChange={(e) => setTestSystemFilter(e.target.value)}
                className="border px-2 py-1 rounded w-full"
              >
                <option value="">All</option>
                <option value="academic">Academic</option>
                <option value="general training">General Training</option>
              </select>
            </div>
          </div>
  
          {/* Booking Details */}
          <div className=" mt-2 p-2 rounded shadow grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Booking Details</h2>
              <p>
                <strong>Test Name:</strong> {bookings[0]?.name || "N/A"}
              </p>
              <p>
                <strong>Date:</strong> {bookings[0]?.bookingDate || "N/A"}
              </p>
              <p>
                <strong>Schedule Time:</strong>{" "}
                {bookings[0]?.startTime && bookings[0]?.endTime
                  ? `${bookings[0]?.startTime} - ${bookings[0]?.endTime}`
                  : "N/A"}
              </p>
            </div>
  
            {/* Attendance Counts */}
            <div className="mb-4">
              <p>
                <strong>Total Present:</strong> {attendanceCounts.present}
              </p>
              <p>
                <strong>Total Absent:</strong> {attendanceCounts.absent}
              </p>
            </div>
          </div>
  
          {/* Users Table */}
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
                {filteredUsers.map((user, index) => (
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
  
          {/* Action Buttons */}
          <div className="mt-8 flex justify-start space-x-4">
            {/* Download Button */}
            <button
              onClick={confirmDownload}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Download as PDF
            </button>
  
            {/* Send Mail Button */}
          <button
            onClick={() => {
              if (typeof window !== "undefined" && 
                  (emailsSent || localStorage.getItem(`emailsSent_${scheduleId}`))) {
                toast.error("Emails have already been sent to all users!");
                return;
              }

              toast((t) => (
                <div>
                  <p className="mb-1">
                    Are you sure you want to send reminder emails to all users?
                  </p>
                  <p className="mb-1">
                    The exam date is {bookings[0]?.bookingDate || "N/A"}.
                    The exam time is{" "}
                    {bookings[0]?.startTime && bookings[0]?.endTime
                      ? `${bookings[0]?.startTime} - ${bookings[0]?.endTime}`
                      : "N/A"}.
                  </p>
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={() => {
                        handleSendMail(users, bookings);
                        setEmailsSentState(true);
                        if (typeof window !== "undefined") {
                          localStorage.setItem(`emailsSent_${scheduleId}`, "true");
                        }
                        toast.dismiss(t.id);
                      }}
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ));
            }}
            className={`px-4 py-2 text-white rounded ${
              emailsSent || (typeof window !== "undefined" && localStorage.getItem(`emailsSent_${scheduleId}`))
                ? "bg-black"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            Send Reminder Emails
          </button>

          </div>
        </>
      )}
    </div>

  );
}
export default BookingRequestsPage;


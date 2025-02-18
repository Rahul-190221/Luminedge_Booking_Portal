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

//   const fetchBookingsAndUsers = useCallback(async () => {
//     if (!scheduleId) return;

//     try {
//       setLoading(true);

//       const bookingsResponse = await axios.get(
//         `https://luminedge-server.vercel.app/api/v1/admin/bookings`
//       );
//       const bookingsData = bookingsResponse.data;

//       const filteredBookings = bookingsData.bookings.filter(
//         (booking: Booking) => booking.scheduleId === scheduleId
//       );

//       const userIds = Array.from(
//         new Set(
//           filteredBookings.flatMap((booking: { userId: any }) =>
//             Array.isArray(booking.userId) ? booking.userId : [booking.userId]
//           )
//         )
//       );

//       const usersResponse = await axios.get(
//         `https://luminedge-server.vercel.app/api/v1/admin/users`
//       );
//       const usersData = usersResponse.data;

//       const matchedUsers = usersData?.users?.filter((user: any) =>
//         userIds.includes(user?._id)
//       );

//       const initialAttendance: { [key: string]: string } = {};
//       filteredBookings.forEach((booking: { userId: any[] | string; attendance: string }) => {
//         if (Array.isArray(booking.userId)) {
//           booking.userId.forEach((id) => {
//             initialAttendance[id] = booking.attendance || "N/A";
//           });
//         } else {
//           initialAttendance[booking.userId] = booking.attendance || "N/A";
//         }
//       });
// // Calculate attendance counts
// const presentCount = Object.values(initialAttendance).filter(
//   (status) => status === "present"
// ).length;
// const absentCount = Object.values(initialAttendance).filter(
//   (status) => status === "absent"
// ).length;

//       setBookings(filteredBookings);
//       setUsers(matchedUsers);
//       setAttendance(initialAttendance);
//       setAttendanceCounts({ present: presentCount, absent: absentCount });
//       // Fetch individual user attendance
//       const attendanceData: Record<string, number | null> = {};
//       await Promise.all(
//         userIds.map(async (userId) => {
//           try {
//             const response = await axios.get(
//               `https://luminedge-server.vercel.app/api/v1/user/attendance/${userId}`
//             );
//             attendanceData[userId as string] = response.data.attendance || 0;
//           } catch (error) {
//             console.error(`Error fetching attendance for user ${userId}:`, error);
//             attendanceData[userId as string] = null;
//           }
//         })
//       );
//       setUserAttendance(attendanceData);
//     } catch (error) {
//       toast.error("Error fetching data. Please try again.");
//       console.error(error);
//     } finally {
//       setLoading(false);
//     }
//   }, [scheduleId]);

//   useEffect(() => {
//     fetchBookingsAndUsers();
//   }, [fetchBookingsAndUsers]);
// const fetchBookingsAndUsers = useCallback(async () => {
//   if (!scheduleId) return;

//   try {
//     setLoading(true);

//     // Fetch bookings
//     const { data: bookingsData } = await axios.get(`https://luminedge-server.vercel.app/api/v1/admin/bookings`);
//     const filteredBookings = bookingsData.bookings.filter(
//       (booking: Booking) => booking.scheduleId === scheduleId
//     );

//  // Define the correct type for `booking`
// const userIds: string[] = Array.from(
//   new Set<string>(
//     filteredBookings.flatMap((booking: { userId: string | string[] }) =>
//       Array.isArray(booking.userId) ? booking.userId : [booking.userId]
//     )
//   )
// );



//     // Fetch users (only filtered ones)
//     const { data: usersData } = await axios.get(`https://luminedge-server.vercel.app/api/v1/admin/users`);
//     const matchedUsers = usersData.users.filter((user: any) => userIds.includes(user._id));

//     // Initialize attendance mapping
//     const initialAttendance: Record<string, string> = {};
//     filteredBookings.forEach((booking : Booking) => {
//       const ids = Array.isArray(booking.userId) ? booking.userId : [booking.userId];
//       ids.forEach((id: string) => {
//         initialAttendance[id] = booking.attendance || "N/A";
//       });
//     });

//     // Calculate attendance counts
//     const presentCount = Object.values(initialAttendance).filter(status => status === "present").length;
//     const absentCount = Object.values(initialAttendance).filter(status => status === "absent").length;

//     setBookings(filteredBookings);
//     setUsers(matchedUsers);
//     setAttendance(initialAttendance);
//     setAttendanceCounts({ present: presentCount, absent: absentCount });

//     // Fetch attendance for only the unique user IDs
//     if (userIds.length > 0) {
//       try {
//         const { data: attendanceResponse } = await axios.post(
//           `https://luminedge-server.vercel.app/api/v1/user/attendance/bulk`, 
//           { userIds } // Assuming your API supports bulk fetching
//         );

//         // Map attendance data
//         const attendanceData: Record<string, number | null> = {};
//         userIds.forEach((userId: string) => {
//           attendanceData[userId] = attendanceResponse.attendance?.[userId] ?? null;
//         });

//         setUserAttendance(attendanceData);
//       } catch (error) {
//         console.error("Error fetching bulk attendance:", error);
//       }
//     }

//   } catch (error) {
//     toast.error("Error fetching data. Please try again.");
//     console.error(error);
//   } finally {
//     setLoading(false);
//   }
// }, [scheduleId]);

// useEffect(() => {
//   fetchBookingsAndUsers();
// }, [fetchBookingsAndUsers]);

const fetchBookingsAndUsers = useCallback(async () => {
  if (!scheduleId) return;

  try {
    setLoading(true);

    // Fetch all bookings
    const { data: bookingsData } = await axios.get(`https://luminedge-server.vercel.app/api/v1/admin/bookings`);
    const filteredBookings = bookingsData.bookings.filter(
      (booking: Booking) => booking.scheduleId === scheduleId
    );

    // Extract unique user IDs
    const userIds: string[] = Array.from(
      new Set(
        filteredBookings.flatMap((booking: { userId: string | string[] }) =>
          Array.isArray(booking.userId) ? booking.userId : [booking.userId]
        )
      )
    );

    // Fetch only necessary users
    const { data: usersData } = await axios.get(`https://luminedge-server.vercel.app/api/v1/admin/users`);
    const matchedUsers = usersData.users.filter((user: any) => userIds.includes(user._id));

    // Initialize attendance mapping
    const initialAttendance: Record<string, string> = {};
    filteredBookings.forEach((booking: Booking) => {
      const ids = Array.isArray(booking.userId) ? booking.userId : [booking.userId];
      ids.forEach((id: string) => {
        initialAttendance[id] = booking.attendance || "N/A";
      });
    });

    // Calculate attendance counts
    const presentCount = Object.values(initialAttendance).filter(status => status === "present").length;
    const absentCount = Object.values(initialAttendance).filter(status => status === "absent").length;

    setBookings(filteredBookings);
    setUsers(matchedUsers);
    setAttendance(initialAttendance);
    setAttendanceCounts({ present: presentCount, absent: absentCount });

    // 🚀 Fetch attendance in **one** bulk request (instead of multiple API calls)
    if (userIds.length > 0) {
      try {
        const { data: attendanceResponse } = await axios.post(
          `https://luminedge-server.vercel.app/api/v1/user/attendance/bulk`, 
          { userIds }, // Backend should support bulk fetching
          { headers: { 'Content-Type': 'application/json' } }
        );

        // Map attendance data
        const attendanceData: Record<string, number | null> = {};
        userIds.forEach((userId: string) => {
          attendanceData[userId] = attendanceResponse.attendance?.[userId] ?? null;
        });

        setUserAttendance(attendanceData);
      } catch (error) {
        console.error("Error fetching bulk attendance:", error);
        if (axios.isAxiosError(error) && error.response) {
          toast.error(`Attendance API error: ${error.response.data.message || "Check the API"}`);
        } else {
          toast.error("An unexpected error occurred.");
        }
      }
    }

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
          
        ];
      }),
      theme: "grid",
      styles: { fontSize: 10, overflow: "linebreak" },
      headStyles: { fillColor: "#face39" },
      columnStyles: {
        0: { cellWidth: 10 }, // List #
        1: { cellWidth: 35 }, // User Name
        2: { cellWidth: 47 }, // Email
        3: { cellWidth: 26 }, // Phone
        4: { cellWidth: 25 }, // Transaction ID
        5: { cellWidth: 25 }, // Passport Number
        6: { cellWidth: 30 }, // Test Type
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
  
          </div>
        </>
      )}
    </div>

  );
}
export default BookingRequestsPage;


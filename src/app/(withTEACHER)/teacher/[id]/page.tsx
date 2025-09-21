"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useRouter } from "next/navigation";

type Booking = {
  id?: string;
  name: string;
  testType: string;
  testSystem: string;
  bookingDate: string;
  scheduleId: string;
  slotId: string;
  startTime: string;
  endTime: string;
  userId: string | string[];
  userCount?: number;
  attendance?: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "https://luminedge-server.vercel.app";

const PAGE_SIZE = 1000; // keep large; backend caps will apply

const BookingRequestsPage = ({ params }: { params: { id: string } }) => {
  const { id: scheduleId } = params || {};
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [userAttendance, setUserAttendance] = useState<Record<string, number | null>>({});
  const [filter, setFilter] = useState<string>("");
  const [testTypeFilter, setTestTypeFilter] = useState<string>("");
  const [testSystemFilter, setTestSystemFilter] = useState<string>("");
  const [attendanceCounts, setAttendanceCounts] = useState({ present: 0, absent: 0 });

  // -------- helpers --------
  const idsOf = (v: string | string[]) => (Array.isArray(v) ? v.map(String) : [String(v)]);

  const formatCustomDate = (dateString: string) => {
    const d = new Date(dateString);
    if (isNaN(+d)) return "N/A";
    const day = d.getDate().toString().padStart(2, "0");
    const month = d.toLocaleString("en-US", { month: "long" });
    const year = d.getFullYear();
    return `${day} ${month}, ${year}`;
  };

  const formatCustomTime = (start: string, end: string) => {
    const fmt = (time: string) => {
      if (!time || !/^\d{2}:\d{2}/.test(time)) return "N/A";
      return new Date(`1970-01-01T${time}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    };
    return `${fmt(start)} - ${fmt(end)}`;
  };

  // Map userId -> their (first) booking row for quick joins
  const bookingByUser = useMemo(() => {
    const m = new Map<string, Booking>();
    for (const b of bookings) idsOf(b.userId).forEach((uid) => m.set(String(uid), b));
    return m;
  }, [bookings]);

  // -------- paginated fetchers --------
  const fetchAllBookings = async (): Promise<Booking[]> => {
    const all: Booking[] = [];
    let page = 1;
    while (true) {
      const { data } = await axios.get(`${API_BASE}/api/v1/admin/bookings`, {
        params: { page, limit: PAGE_SIZE },
      });
      const batch: Booking[] = data?.bookings ?? [];
      all.push(...batch);
      if (batch.length < PAGE_SIZE) break;
      page += 1;
    }
    return all;
  };

  const fetchAllUsers = async (): Promise<any[]> => {
    const all: any[] = [];
    let page = 1;

    // First page to detect total
    const first = await axios.get(`${API_BASE}/api/v1/admin/users`, {
      params: { page, limit: PAGE_SIZE },
    });
    const firstUsers: any[] = first.data?.users ?? [];
    const total: number = Number(first.data?.total ?? firstUsers.length);
    all.push(...firstUsers);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    while (page < totalPages) {
      page += 1;
      const { data } = await axios.get(`${API_BASE}/api/v1/admin/users`, {
        params: { page, limit: PAGE_SIZE },
      });
      all.push(...(data?.users ?? []));
    }
    return all;
  };

  // -------- master fetch --------
  const fetchBookingsAndUsers = useCallback(async () => {
    if (!scheduleId) return;
    try {
      setLoading(true);

      const allBookings = await fetchAllBookings();
      const scheduleBookings = allBookings.filter(
        (b) => String(b.scheduleId) === String(scheduleId)
      );

      const userIds: string[] = Array.from(
        new Set(scheduleBookings.flatMap((b) => idsOf(b.userId)))
      ).filter(Boolean) as string[];

      const allUsers = await fetchAllUsers();
      const byId = new Map(allUsers.map((u: any) => [String(u._id), u]));
      const matchedUsers = userIds.map((id) => byId.get(String(id))).filter(Boolean);

      // Attendance map + totals (case-insensitive)
      const attendanceMap: Record<string, string> = {};
      for (const b of scheduleBookings) {
        const att = String(b.attendance || "N/A").trim().toLowerCase();
        idsOf(b.userId).forEach((uid) => (attendanceMap[String(uid)] = att));
      }
      const present = Object.values(attendanceMap).filter((s) => s === "present").length;
      const absent = Object.values(attendanceMap).filter((s) => s === "absent").length;

      setBookings(scheduleBookings);
      setUsers(matchedUsers);
      setAttendanceCounts({ present, absent });

      // Optional: per-user total attendance API
      if (userIds.length) {
        try {
          const { data } = await axios.post(
            `${API_BASE}/api/v1/user/attendance/bulk`,
            { userIds },
            { headers: { "Content-Type": "application/json" } }
          );
          const map: Record<string, number | null> = {};
          userIds.forEach((uid) => (map[uid] = data?.attendance?.[uid] ?? null));
          setUserAttendance(map);
        } catch (err: any) {
          console.error("bulk attendance error:", err);
          if (axios.isAxiosError(err) && err.response) {
            toast.error(`Attendance API error: ${err.response.data?.message || "Check the API"}`);
          } else {
            toast.error("An unexpected error occurred.");
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Error fetching data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    fetchBookingsAndUsers();
  }, [fetchBookingsAndUsers]);

  // -------- filtering --------
  const filteredUsers = useMemo(() => {
    const q = filter.toLowerCase();
    return users.filter((user) => {
      const name = String(user?.name || "").toLowerCase();
      const email = String(user?.email || "").toLowerCase();
      if (q && !name.includes(q) && !email.includes(q)) return false;

      const b = bookingByUser.get(String(user._id));
      const matchesType =
        !testTypeFilter ||
        String(b?.testType || "").toLowerCase().trim() === testTypeFilter.toLowerCase().trim();
      const matchesSystem =
        !testSystemFilter ||
        String(b?.testSystem || "").toLowerCase().trim() === testSystemFilter.toLowerCase().trim();
      return matchesType && matchesSystem;
    });
  }, [users, bookingByUser, filter, testTypeFilter, testSystemFilter]);

  // -------- PDF export (fit columns) --------
  const confirmDownload = () => {
    if (!bookings.length) {
      toast.error("No booking data to download.");
      return;
    }

    const b0 = bookings[0];
    const doc = new jsPDF({ orientation: "landscape", format: "a4" });

    doc.setFontSize(10);
    doc.text("Booking Details", 10, 15);
    doc.text(`Test Name: ${b0.name || "N/A"}`, 10, 20);
    doc.text(`Date: ${b0.bookingDate ? formatCustomDate(b0.bookingDate) : "N/A"}`, 10, 25);
    doc.text(
      `Schedule Time: ${
        b0.startTime && b0.endTime ? formatCustomTime(b0.startTime, b0.endTime) : "N/A"
      }`,
      10,
      30
    );

    const head = [
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
    ];

    const body = users.map((user: any, index: number) => {
      const uid = String(user._id);
      const related = bookingByUser.get(uid);
      return [
        index + 1,
        user?.name || "N/A",
        user?.email || "N/A",
        user?.contactNo || "N/A",
        user?.transactionId || "N/A",
        user?.passportNumber || "N/A",
        related?.testType || "N/A",
        related?.testSystem || "N/A",
        user?.totalMock ?? "N/A",
        userAttendance?.[uid] ?? "N/A",
      ];
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 10;
    const marginRight = 10;
    const epsilon = 4;
    const usable = pageWidth - marginLeft - marginRight - epsilon;

    const base = [10, 35, 47, 26, 25, 25, 30, 25, 22, 15];
    const sum = base.reduce((a, b) => a + b, 0);
    const scale = usable / sum;
    const columnStyles = Object.fromEntries(base.map((w, i) => [i, { cellWidth: w * scale }]));

    autoTable(doc, {
      head,
      body,
      theme: "grid",
      styles: { fontSize: 9, overflow: "linebreak", cellPadding: 2 },
      headStyles: { fillColor: [250, 206, 57] },
      margin: { top: 35, left: marginLeft, right: marginRight },
      tableWidth: usable,
      columnStyles,
    });

    const currentDate = new Date().toISOString().split("T")[0];
    doc.save(`booking_requests_${currentDate}.pdf`);
  };

  if (!scheduleId) return <div>No Schedule ID provided.</div>;

  // -------- UI --------
  return (
    <div className="p-0 sm:p-3 w-full sm:max-w-[100%] mx-auto bg-[#ffffff] text-[#00000f] shadow-1xl rounded-2xl border border-[#00000f]/10">
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* Filters */}
          <div className="bg-gray-100 p-4 h-22 mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="mt-2 p-2 rounded shadow grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Booking Details</h2>
              <p>
                <strong>Test Name:</strong> {bookings[0]?.name || "N/A"}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {bookings[0]?.bookingDate ? formatCustomDate(bookings[0].bookingDate) : "N/A"}
              </p>
              <p>
                <strong>Schedule Time:</strong>{" "}
                {bookings[0]?.startTime && bookings[0]?.endTime
                  ? formatCustomTime(bookings[0].startTime, bookings[0].endTime)
                  : "N/A"}
              </p>
            </div>

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
                {filteredUsers.map((user, index) => {
                  const uid = String(user._id);
                  const b = bookingByUser.get(uid);
                  return (
                    <tr key={uid} className="border-b">
                      <td className="px-4 py-2 text-sm">{index + 1}</td>
                      <td className="px-4 py-2 text-sm">{user?.name || "N/A"}</td>
                      <td className="px-4 py-2 text-sm">{user?.email || "N/A"}</td>
                      <td className="px-4 py-2 text-sm">{user?.contactNo || "N/A"}</td>
                      <td className="px-4 py-2 text-sm">{user?.transactionId || "N/A"}</td>
                      <td className="px-4 py-2 text-sm">{user?.passportNumber || "N/A"}</td>
                      <td className="px-4 py-2 text-sm">{b?.testType || "N/A"}</td>
                      <td className="px-4 py-2 text-sm">{b?.testSystem || "N/A"}</td>
                      <td className="px-4 py-2 text-sm">{user?.totalMock ?? "N/A"}</td>
                      <td className="px-4 py-2 text-sm">{userAttendance?.[uid] ?? "N/A"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="mt-8 flex justify-start space-x-4">
            <button
              onClick={confirmDownload}
              className="w-64 px-6 py-2 rounded-full font-bold text-sm uppercase tracking-wider bg-[#00000f] text-white transition-all duration-300 ease-in-out shadow-lg hover:bg-[#face39] hover:text-[#00000f] hover:shadow-2xl ring-2 ring-[#00000f] hover:ring-[#face39] hover:scale-105 flex items-center justify-center gap-1"
            >
              <span className="text-lg">📄</span>
              Download as PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default BookingRequestsPage;

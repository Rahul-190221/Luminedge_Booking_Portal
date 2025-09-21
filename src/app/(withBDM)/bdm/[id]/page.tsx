"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Booking = {
  _id?: string;
  id?: string;
  name: string;
  testType: string;
  testSystem: string;
  bookingDate: string;
  scheduleId: string;
  slotId: string;
  startTime: string;
  endTime: string;
  userId: string[] | string;    // <— backend can return string or array
  userCount?: number;
  attendance?: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "https://luminedge-server.vercel.app";

// helpers
const toId = (v: any) => String(v ?? "").trim();
const hasUserInBooking = (b: Booking, userId: string) =>
  Array.isArray(b.userId)
    ? b.userId.map(toId).includes(userId)
    : toId(b.userId) === userId;

/** Page through /admin/users until we've collected all of the ids needed */
async function fetchUsersByIds(userIds: string[], pageSize = 500) {
  const need = new Set(userIds.map(toId));
  const found = new Map<string, any>();

  // page 1: also gives us total
  const first = await axios.get(`${API_BASE}/api/v1/admin/users`, {
    params: { page: 1, limit: pageSize },
  });
  const total: number = first.data?.total ?? (first.data?.users?.length || 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const ingest = (usersPage: any[]) => {
    for (const u of usersPage || []) {
      const id = toId(u._id);
      if (need.has(id) && !found.has(id)) found.set(id, u);
    }
  };

  ingest(first.data?.users || []);
  if (found.size === need.size) return Array.from(found.values());

  for (let page = 2; page <= totalPages; page++) {
    const pageRes = await axios.get(`${API_BASE}/api/v1/admin/users`, {
      params: { page, limit: pageSize },
    });
    ingest(pageRes.data?.users || []);
    if (found.size === need.size) break;
  }

  return Array.from(found.values());
}

const BookingRequestsPage = ({ params }: { params: { id: string } }) => {
  const scheduleId = toId(params?.id);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<string>("");
  const [testTypeFilter, setTestTypeFilter] = useState<string>("");
  const [testSystemFilter, setTestSystemFilter] = useState<string>("");
  const [attendanceFilter /* unused but kept to match your UI */] = useState<string>("");
  const [userAttendance, setUserAttendance] = useState<Record<string, number | null>>({});
  const [attendanceCounts, setAttendanceCounts] = useState({ present: 0, absent: 0 });

  const fetchBookingsAndUsers = useCallback(async () => {
    if (!scheduleId) return;

    try {
      setLoading(true);

      // 1) Fetch bookings (you had no pagination here — that’s fine)
      const { data: bookingsData } = await axios.get(`${API_BASE}/api/v1/admin/bookings`, {
        params: { page: 1, limit: 2000 },
      });

      // 2) Filter by this schedule
      const filtered: Booking[] = (bookingsData?.bookings || []).filter(
        (b: Booking) => toId(b.scheduleId) === scheduleId
      );

      // 3) Unique user ids
      const userIds: string[] = Array.from(
        new Set(
          filtered.flatMap((b) => (Array.isArray(b.userId) ? b.userId.map(toId) : [toId(b.userId)]))
        )
      );

      // 4) Fetch only users we need (page through until all are found)
      const matchedUsers = userIds.length ? await fetchUsersByIds(userIds) : [];

      // 5) Seed attendance map & counts
      const initialAttendance: Record<string, string> = {};
      for (const bk of filtered) {
        const ids = Array.isArray(bk.userId) ? bk.userId.map(toId) : [toId(bk.userId)];
        for (const uid of ids) initialAttendance[uid] = bk.attendance || "N/A";
      }
      const presentCount = Object.values(initialAttendance).filter((s) => s === "present").length;
      const absentCount = Object.values(initialAttendance).filter((s) => s === "absent").length;

      setBookings(filtered);
      setUsers(matchedUsers);
      setAttendance(initialAttendance);
      setAttendanceCounts({ present: presentCount, absent: absentCount });

      // 6) Bulk attendance summary (your existing endpoint)
      if (userIds.length) {
        try {
          const { data: attRes } = await axios.post(
            `${API_BASE}/api/v1/user/attendance/bulk`,
            { userIds },
            { headers: { "Content-Type": "application/json" } }
          );
          const attMap: Record<string, number | null> = {};
          for (const id of userIds) attMap[id] = attRes.attendance?.[id] ?? null;
          setUserAttendance(attMap);
        } catch (err: any) {
          console.error("Error fetching bulk attendance:", err);
          toast.error(
            axios.isAxiosError(err) && err.response?.data?.message
              ? `Attendance API error: ${err.response.data.message}`
              : "Attendance lookup failed."
          );
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    fetchBookingsAndUsers();
  }, [fetchBookingsAndUsers]);

  const formatCustomDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "long" });
    const year = date.getFullYear();
    return `${day} ${month}, ${year}`;
  };

  const formatCustomTime = (start: string, end: string) => {
    const fmt = (time: string) =>
      new Date(`1970-01-01T${time}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    return `${fmt(start)} - ${fmt(end)}`;
  };

  // Precompute userId -> booking (avoids repeated .find in render)
  const bookingByUserId = useMemo(() => {
    const map = new Map<string, Booking>();
    for (const b of bookings) {
      const ids = Array.isArray(b.userId) ? b.userId.map(toId) : [toId(b.userId)];
      for (const id of ids) if (!map.has(id)) map.set(id, b);
    }
    return map;
  }, [bookings]);

  const filterUsers = useCallback(
    (usersArr: any[]) => {
      const f = (filter || "").toLowerCase().trim();
      const type = testTypeFilter.toLowerCase().trim();
      const sys = testSystemFilter.toLowerCase().trim();

      return usersArr.filter((u) => {
        const uid = toId(u._id);
        const b = bookingByUserId.get(uid);

        const matchesText =
          (u?.name || "").toLowerCase().includes(f) ||
          (u?.email || "").toLowerCase().includes(f);

        const matchesType = !type || (b?.testType || "").toLowerCase().trim() === type;
        const matchesSys = !sys || (b?.testSystem || "").toLowerCase().trim() === sys;

        return matchesText && matchesType && matchesSys;
      });
    },
    [filter, testTypeFilter, testSystemFilter, bookingByUserId]
  );

  const filteredUsers = useMemo(() => filterUsers(users), [filterUsers, users]);

  const confirmDownload = () => {
    if (!bookings.length) {
      toast.error("No booking data to download.");
      return;
    }

    const b0 = bookings[0];
    const doc = new jsPDF({ orientation: "landscape", format: "a4" });

    // Header
    doc.setFontSize(10);
    doc.text("Booking Details", 10, 15);
    doc.text(`Test Name: ${b0.name || "N/A"}`, 10, 20);
    doc.text(
      `Date: ${b0.bookingDate ? formatCustomDate(b0.bookingDate) : "N/A"}`,
      10,
      25
    );
    doc.text(
      `Schedule Time: ${
        b0.startTime && b0.endTime ? formatCustomTime(b0.startTime, b0.endTime) : "N/A"
      }`,
      10,
      30
    );

    // Fit-to-page
    const margin = { top: 35, left: 10, right: 10 };
    const pageWidth = doc.internal.pageSize.getWidth();
    const available = pageWidth - margin.left - margin.right;

    const weights = [0.05, 0.17, 0.22, 0.1, 0.12, 0.1, 0.09, 0.07, 0.04, 0.04];
    const SAFETY = 6;
    const target = available - SAFETY;
    const rawSum = weights.reduce((s, w) => s + w, 0);
    const scale = target / rawSum;

    const mins = [8, 20, 28, 18, 22, 20, 18, 16, 12, 12];
    let widths = weights.map((w, i) => Math.max(mins[i], w * scale));

    const sumAfterMins = widths.reduce((s, w) => s + w, 0);
    if (sumAfterMins > target) {
      const compress = target / sumAfterMins;
      widths = widths.map((w) => w * compress);
    }

    const columnStyles: Record<number, { cellWidth: number }> = {};
    widths.forEach((w, i) => (columnStyles[i] = { cellWidth: +w.toFixed(2) }));

    const body = users.map((u: any, idx: number) => {
      const uid = toId(u._id);
      const related = bookingByUserId.get(uid);
      return [
        idx + 1,
        u?.name || "N/A",
        u?.email || "N/A",
        u?.contactNo || "N/A",
        u?.transactionId || "N/A",
        u?.passportNumber || "N/A",
        related?.testType || "N/A",
        related?.testSystem || "N/A",
        u?.totalMock ?? "N/A",
        userAttendance[uid] ?? "N/A",
      ];
    });

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
      body,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 1.5, overflow: "linebreak", valign: "middle" },
      headStyles: { fillColor: [250, 206, 57] },
      columnStyles,
      margin,
      startY: margin.top,
      tableWidth: available - SAFETY,
    });

    const currentDate = new Date().toISOString().split("T")[0];
    doc.save(`booking_requests_${currentDate}.pdf`);
  };

  if (!scheduleId) return <div>No Schedule ID provided.</div>;

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
                {filteredUsers.map((u, index) => {
                  const uid = toId(u._id);
                  const b = bookingByUserId.get(uid);
                  return (
                    <tr key={uid} className="border-b">
                      <td className="px-4 py-2 text-sm">{index + 1}</td>
                      <td className="px-4 py-2 text-sm">{u?.name || "N/A"}</td>
                      <td className="px-4 py-2 text-sm">{u?.email || "N/A"}</td>
                      <td className="px-4 py-2 text-sm">{u?.contactNo || "N/A"}</td>
                      <td className="px-4 py-2 text-sm">{u?.transactionId || "N/A"}</td>
                      <td className="px-4 py-2 text-sm">{u?.passportNumber || "N/A"}</td>
                      <td className="px-4 py-2 text-sm">{b?.testType || "N/A"}</td>
                      <td className="px-4 py-2 text-sm">{b?.testSystem || "N/A"}</td>
                      <td className="px-4 py-2 text-sm">{u?.totalMock ?? "N/A"}</td>
                      <td className="px-4 py-2 text-sm">
                        {userAttendance[uid] !== null ? userAttendance[uid] : "N/A"}
                      </td>
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

"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "https://luminedge-server.vercel.app";

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
  userId: string[] | string;
  userCount: number;
  attendance?: string;
};

type FeedbackStatus = {
  listening?: boolean;
  reading?: boolean;
  writing?: boolean;
  speaking?: boolean;
};

type ApiFeedbackStatusResponse = {
  success: boolean;
  status: {
    listening?: boolean;
    reading?: boolean;
    writing?: boolean;
    speaking?: boolean;
    [k: string]: any;
  };
};

type AttendanceMap = Record<string, string>;

// ---------- helpers for id handling ----------
const toId = (v: any) => String(v ?? "").trim();

const hasUserInBooking = (b: Booking, userId: string) =>
  Array.isArray(b.userId)
    ? b.userId.map(toId).includes(userId)
    : toId(b.userId) === userId;

// ---------- fetch only the users we need (paged) ----------
async function fetchUsersByIds(
  userIds: string[],
  requestedPageSize = 500
): Promise<any[]> {
  const need = new Set(userIds.map(toId));
  const found = new Map<string, any>();

  if (!need.size) return [];

  // page 1 to get total + actual page size (backend may cap `limit`)
  const first = await axios.get(`${API_BASE}/api/v1/admin/users`, {
    params: { page: 1, limit: requestedPageSize, role: "user" },
  });

  const firstPageUsers: any[] = first.data?.users || [];
  const total: number =
    first.data?.total ?? (firstPageUsers.length || 0);

  // effective page size is what the backend really returned
  const effectivePageSize = firstPageUsers.length || requestedPageSize;
  const totalPages = Math.max(
    1,
    effectivePageSize > 0 ? Math.ceil(total / effectivePageSize) : 1
  );

  const ingest = (usersPage: any[]) => {
    for (const u of usersPage || []) {
      const id = toId(u._id);
      if (need.has(id) && !found.has(id)) {
        found.set(id, u);
      }
    }
  };

  // ingest page 1
  ingest(firstPageUsers);
  if (found.size === need.size || totalPages === 1) {
    return Array.from(found.values());
  }

  // fetch remaining pages until we've found everyone or hit last page
  for (let page = 2; page <= totalPages && found.size < need.size; page++) {
    const pageRes = await axios.get(`${API_BASE}/api/v1/admin/users`, {
      params: { page, limit: effectivePageSize, role: "user" },
    });
    ingest(pageRes.data?.users || []);
  }

  return Array.from(found.values());
}

const TrfBookingRequestsPage = ({
  params,
}: {
  params: { scheduleId: string };
}) => {
  const { scheduleId } = params || {};
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [attendanceCounts, setAttendanceCounts] = useState({
    present: 0,
    absent: 0,
  });
  const [userAttendance, setUserAttendance] = useState<
    Record<string, number | null>
  >({});

  const [filter, setFilter] = useState<string>("");
  const [testTypeFilter, setTestTypeFilter] = useState<string>("");
  const [testSystemFilter, setTestSystemFilter] = useState<string>("");
  const [attendanceFilter, setAttendanceFilter] = useState<string>("");

  // --- Schedule-scoped feedback flags per user
  const hydrateFeedbackStatus = useCallback(
    async (userIds: string[]) => {
      if (!userIds?.length || !scheduleId) return;

      try {
        const results = await Promise.all(
          userIds.map(async (uid) => {
            try {
              const { data } = await axios.get<ApiFeedbackStatusResponse>(
                `${API_BASE}/api/v1/admin/feedback-status/${uid}/${scheduleId}`
              );
              const s = data?.status || {};
              const fs: FeedbackStatus = {
                listening: !!s.listening,
                reading: !!s.reading,
                writing: !!s.writing,
                speaking: !!s.speaking,
              };
              return { uid, fs, detail: s };
            } catch (e) {
              console.error("feedback-status fetch failed:", uid, e);
              return { uid, fs: {}, detail: null as any };
            }
          })
        );

        const map = new Map(results.map((r) => [r.uid, r]));
        setUsers((prev) =>
          prev.map((u) => {
            const hit = map.get(toId(u._id));
            if (!hit) return u;
            return {
              ...u,
              feedbackStatus: { ...(u.feedbackStatus || {}), ...hit.fs },
              feedbackDetail: hit.detail ?? u.feedbackDetail,
            };
          })
        );
      } catch (e) {
        console.error("hydrateFeedbackStatus error:", e);
      }
    },
    [scheduleId]
  );

  const fetchBookingsAndUsers = useCallback(() => {
    if (!scheduleId) return;

    // cancel in-flight if scheduleId changes
    const controller = new AbortController();
    const { signal } = controller;

    (fetchBookingsAndUsers as any)._abort?.();
    (fetchBookingsAndUsers as any)._abort = () => controller.abort();

    const run = async () => {
      try {
        setLoading(true);

        const scheduleKey = String(scheduleId).toLowerCase();

        // 🔹 0) HOME fast path: backend already joins bookings + user
        if (scheduleKey === "home") {
          const { data } = await axios.get(
            `${API_BASE}/api/v1/admin/bookings/home-with-users`,
            { signal }
          );

          const rows: any[] = data?.bookings || [];
          if (!rows.length) {
            setBookings([]);
            setUsers([]);
            setAttendance({});
            setAttendanceCounts({ present: 0, absent: 0 });
            setUserAttendance({});
            setLoading(false);
            return;
          }

          const normalizedBookings: Booking[] = rows.map((r) => ({
            id: String(r._id),
            name: r.name || "N/A",
            testType: r.testType || "N/A",
            testSystem: r.testSystem || "N/A",
            bookingDate: r.bookingDate || "",
            scheduleId: "home",
            slotId: "",
            startTime: r.testTime || "",
            endTime: "",
            userId: r.userId,
            userCount: 1,
            attendance: r.attendance || "N/A",
          }));

          const userList = rows.map((r) => ({
            ...r.user,
            feedbackStatus: r.user?.feedbackStatus || {},
          }));

          // Attendance map & counts
          const initialAttendance: AttendanceMap = {};
          for (const b of normalizedBookings) {
            const ids = Array.isArray(b.userId) ? b.userId : [b.userId];
            const att = (b.attendance || "N/A")
              .toString()
              .trim()
              .toLowerCase();
            ids.forEach((uid) => (initialAttendance[toId(uid)] = att));
          }
          const presentCount = Object.values(initialAttendance).filter(
            (s) => s === "present"
          ).length;
          const absentCount = Object.values(initialAttendance).filter(
            (s) => s === "absent"
          ).length;

          setBookings(normalizedBookings);
          setUsers(userList);
          setAttendance(initialAttendance);
          setAttendanceCounts({ present: presentCount, absent: absentCount });

          // Bulk attendance totals (HOME uses the same endpoint)
          const homeUserIds = userList.map((u: any) => toId(u._id));
          if (homeUserIds.length) {
            try {
              const { data: att } = await axios.post(
                `${API_BASE}/api/v1/user/attendance/bulk`,
                { userIds: homeUserIds },
                {
                  headers: { "Content-Type": "application/json" },
                  signal,
                }
              );
              const map: Record<string, number | null> = {};
              for (const id of homeUserIds) {
                map[id] = att.attendance?.[id] ?? null;
              }
              setUserAttendance(map);
            } catch (err) {
              if (!axios.isCancel(err)) {
                console.error("Attendance lookup failed:", err);
                toast.error("Attendance lookup failed.");
              }
            }

            // feedback flags in background (do not block first render)
            void hydrateFeedbackStatus(homeUserIds);
          }

          setLoading(false);
          return;
        }

        // 🔹 1) Non-HOME: pull only bookings for this schedule from the server
        const { data } = await axios.get(
          `${API_BASE}/api/v1/admin/bookings/by-schedule/${scheduleId}`,
          { params: { page: 1, limit: 500 }, signal }
        );
        const filteredBookings: Booking[] = data?.bookings || [];

        if (!filteredBookings.length) {
          setBookings([]);
          setUsers([]);
          setAttendance({});
          setAttendanceCounts({ present: 0, absent: 0 });
          setUserAttendance({});
          setLoading(false);
          return;
        }

        // 🔹 2) Unique userIds for this schedule
        const userIds = Array.from(
          new Set(
            filteredBookings.flatMap((b) =>
              Array.isArray(b.userId) ? b.userId.map(toId) : [toId(b.userId)]
            )
          )
        );

        // 🔹 3) Fetch only the users we need AND bulk attendance in parallel
        const [matchedUsers, attendanceRes] = await Promise.all([
          userIds.length ? fetchUsersByIds(userIds) : Promise.resolve([]),
          userIds.length
            ? axios
                .post(
                  `${API_BASE}/api/v1/user/attendance/bulk`,
                  { userIds },
                  {
                    headers: { "Content-Type": "application/json" },
                    signal,
                  }
                )
                .catch((err) => {
                  if (!axios.isCancel(err)) {
                    console.error("Attendance lookup failed:", err);
                    toast.error("Attendance lookup failed.");
                  }
                  return null;
                })
            : Promise.resolve(null),
        ]);

        const usersPlus = matchedUsers.map((u: any) => ({
          ...u,
          feedbackStatus: u.feedbackStatus || {},
        }));

        // 🔹 4) Attendance map + counts
        const initialAttendance: AttendanceMap = {};
        for (const b of filteredBookings) {
          const ids = Array.isArray(b.userId) ? b.userId : [b.userId];
          const att = (b.attendance || "N/A")
            .toString()
            .trim()
            .toLowerCase();
          ids.forEach((uid) => (initialAttendance[toId(uid)] = att));
        }
        const presentCount = Object.values(initialAttendance).filter(
          (s) => s === "present"
        ).length;
        const absentCount = Object.values(initialAttendance).filter(
          (s) => s === "absent"
        ).length;

        setBookings(filteredBookings);
        setUsers(usersPlus);
        setAttendance(initialAttendance);
        setAttendanceCounts({ present: presentCount, absent: absentCount });

        // 🔹 5) Bulk attendance totals per user
        if (attendanceRes && "data" in attendanceRes) {
          const attRes = attendanceRes.data;
          const attMap: Record<string, number | null> = {};
          for (const id of userIds) {
            attMap[id] = attRes.attendance?.[id] ?? null;
          }
          setUserAttendance(attMap);
        } else {
          setUserAttendance({});
        }

        // 🔹 6) Hydrate schedule-scoped feedback flags in background
        if (userIds.length) {
          void hydrateFeedbackStatus(userIds);
        }

        setLoading(false);
      } catch (err: any) {
        if (!axios.isCancel(err)) {
          console.error(err);
          toast.error("Error fetching data. Please try again.");
        }
        setLoading(false);
      }
    };

    void run();

    // cleanup
    return () => controller.abort();
  }, [scheduleId, hydrateFeedbackStatus]);

  useEffect(() => {
    const cancel = fetchBookingsAndUsers();
    return () => {
      if (typeof cancel === "function") cancel();
    };
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

  const isFeedbackComplete = (u: any) =>
    !!(
      u?.feedbackStatus?.listening &&
      u?.feedbackStatus?.reading &&
      u?.feedbackStatus?.writing &&
      u?.feedbackStatus?.speaking
    );

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
    doc.text(
      `Date: ${
        bookingToDownload.bookingDate
          ? formatCustomDate(bookingToDownload.bookingDate)
          : "N/A"
      }`,
      10,
      25
    );
    doc.text(
      `Schedule Time: ${
        bookingToDownload.startTime && bookingToDownload.endTime
          ? formatCustomTime(
              bookingToDownload.startTime,
              bookingToDownload.endTime
            )
          : "N/A"
      }`,
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
      body: users.map((user: any, index: number) => {
        const uid = toId(user._id);
        const relatedBooking = bookings.find((b) =>
          hasUserInBooking(b, uid)
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
          user?.totalMock ?? "N/A",
          userAttendance[uid] !== null && userAttendance[uid] !== undefined
            ? userAttendance[uid]
            : "N/A",
        ];
      }),
      theme: "grid",
      styles: { fontSize: 10, overflow: "linebreak" },
      headStyles: { fillColor: [250, 206, 57] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 35 },
        2: { cellWidth: 47 },
        3: { cellWidth: 26 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { cellWidth: 30 },
        7: { cellWidth: 25 },
        8: { cellWidth: 22 },
        9: { cellWidth: 15 },
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
    usersArr: any[],
    bookingsArr: Booking[],
    filterText: string,
    typeFilter: string,
    systemFilter: string,
    _attendanceFilter: string
  ) => {
    const f = (filterText || "").toLowerCase();

    return usersArr.filter((user) => {
      const uid = toId(user._id);
      const userBooking = bookingsArr.find((b) => hasUserInBooking(b, uid));

      const matchesFilter =
        (user?.name || "").toLowerCase().includes(f) ||
        (user?.email || "").toLowerCase().includes(f);

      const matchesTestType =
        !typeFilter ||
        (userBooking?.testType || "").toLowerCase().trim() ===
          typeFilter.toLowerCase().trim();

      const matchesTestSystem =
        !systemFilter ||
        (userBooking?.testSystem || "").toLowerCase().trim() ===
          systemFilter.toLowerCase().trim();

      // currently attendanceFilter is not used; you can extend this later if needed
      return matchesFilter && matchesTestType && matchesTestSystem;
    });
  };

  const filteredUsers = filterUsers(
    users,
    bookings,
    filter,
    testTypeFilter,
    testSystemFilter,
    attendanceFilter
  );

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
                {bookings[0]?.bookingDate
                  ? formatCustomDate(bookings[0].bookingDate)
                  : "N/A"}
              </p>
              <p>
                <strong>Schedule Time:</strong>{" "}
                {bookings[0]?.startTime && bookings[0]?.endTime
                  ? formatCustomTime(
                      bookings[0].startTime,
                      bookings[0].endTime
                    )
                  : "N/A"}
              </p>
              <p>
                <strong>Total Users:</strong> {users.length}
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
                  <th className="px-4 py-2 text-left">Attendance</th>
                  <th className="px-4 py-2 text-left">TRF</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => {
                  const uid = toId(user._id);
                  const isAbsent =
                    (attendance[uid] || "").toLowerCase() === "absent";
                  const allSaved = isFeedbackComplete(user);

                  return (
                    <tr key={uid} className="border-b">
                      <td className="px-4 py-2 text-sm">{index + 1}</td>
                      <td className="px-4 py-2 text-sm">
                        {user?.name || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {user?.email || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {user?.contactNo || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {user?.transactionId || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {user?.passportNumber || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {attendance[uid] || "N/A"}
                      </td>

                      <td className="px-4 py-2">
                        {String(bookings[0]?.name)
                          .toUpperCase()
                          .includes("IELTS") ? (
                          <button
                            onClick={() =>
                              router.push(
                                `/teacher/trf?userId=${encodeURIComponent(
                                  uid
                                )}&scheduleId=${encodeURIComponent(
                                  scheduleId
                                )}`
                              )
                            }
                            disabled={isAbsent}
                            className={`inline-flex items-center justify-center px-5 py-2 rounded-xl
                              font-medium shadow-lg ring-2 ring-[#00000f]
                              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#face39]
                              transition-all duration-300 ease-in-out
                              ${
                                isAbsent
                                  ? "bg-red-500 text-white opacity-70 cursor-not-allowed"
                                  : allSaved
                                  ? "bg-green-600 text-white hover:bg-green-700 hover:shadow-2xl hover:scale-105 hover:ring-green-600"
                                  : "bg-[#00000f] text-white hover:bg-[#face39] hover:text-[#00000f] hover:shadow-2xl hover:ring-[#face39] hover:scale-105"
                              }`}
                          >
                            View TRF
                          </button>
                        ) : (
                          <span className="text-gray-400 italic">N/A</span>
                        )}
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

export default TrfBookingRequestsPage;

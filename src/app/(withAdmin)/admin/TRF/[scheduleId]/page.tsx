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
  id?: string;
  _id?: string;
  name: string;
  testType: string;
  testSystem: string;
  bookingDate: string;
  scheduleId: string;
  slotId: string;
  startTime: string;
  endTime: string;
  userId: string[] | string;
  userCount?: number;
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

type BudgetResponse = {
  budget: number;
};

// // ---------- helpers for id handling & user fetching (fixes 6/10 issue) ----------
// const toId = (v: any) => String(v ?? "").trim();
// const hasUserInBooking = (b: Booking, userId: string) =>
//   Array.isArray(b.userId)
//     ? b.userId.map(toId).includes(userId)
//     : toId(b.userId) === userId;

// /** Page through /admin/users until we've collected all of the ids needed */
// async function fetchUsersByIds(userIds: string[], pageSize = 500) {
//   const need = new Set(userIds.map(toId));
//   const found = new Map<string, any>();

//   // page 1 to get total
//   const first = await axios.get(`${API_BASE}/api/v1/admin/users`, {
//     params: { page: 1, limit: pageSize },
//   });
//   const total: number = first.data?.total ?? (first.data?.users?.length || 0);
//   const totalPages = Math.max(1, Math.ceil(total / pageSize));

//   const ingest = (usersPage: any[]) => {
//     for (const u of usersPage || []) {
//       const id = toId(u._id);
//       if (need.has(id) && !found.has(id)) found.set(id, u);
//     }
//   };

//   ingest(first.data?.users || []);
//   if (found.size === need.size) return Array.from(found.values());

//   for (let page = 2; page <= totalPages; page++) {
//     const pageRes = await axios.get(`${API_BASE}/api/v1/admin/users`, {
//       params: { page, limit: pageSize },
//     });
//     ingest(pageRes.data?.users || []);
//     if (found.size === need.size) break;
//   }

//   return Array.from(found.values());
// }
// // -------------------------------------------------------------------------------

// ---------- helpers for id handling & user fetching (fixes 6/10 issue) ----------
const toId = (v: any) => String(v ?? "").trim();
const hasUserInBooking = (b: Booking, userId: string) =>
  Array.isArray(b.userId)
    ? b.userId.map(toId).includes(userId)
    : toId(b.userId) === userId;

/** Page through /admin/users until we've collected all of the ids needed */
async function fetchUsersByIds(userIds: string[], requestedPageSize = 500) {
  const need = new Set(userIds.map(toId));
  const found = new Map<string, any>();

  // page 1 to get total + actual page size (backend may cap `limit`)
  const first = await axios.get(`${API_BASE}/api/v1/admin/users`, {
    params: { page: 1, limit: requestedPageSize },
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
  for (let page = 2; page <= totalPages; page++) {
    const pageRes = await axios.get(`${API_BASE}/api/v1/admin/users`, {
      params: { page, limit: requestedPageSize },
    });
    ingest(pageRes.data?.users || []);
    if (found.size === need.size) break;
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
  const [filter, setFilter] = useState<string>("");
  const [testTypeFilter, setTestTypeFilter] = useState<string>("");
  const [testSystemFilter, setTestSystemFilter] = useState<string>("");
  const [userAttendance, setUserAttendance] = useState<
    Record<string, number | null>
  >({});
  const [attendanceFilter, setAttendanceFilter] = useState<string>("");
  const [attendanceCounts, setAttendanceCounts] = useState({
    present: 0,
    absent: 0,
  });

  // TRF email sent status map (for yellow "Done" badge)
  const [trfEmailSentByUser, setTrfEmailSentByUser] = useState<
    Record<string, boolean>
  >({});
  // Budget map for each user
  const [userBudgets, setUserBudgets] = useState<Record<string, number>>({});

  // Map teacher code -> email
  const teacherEmailMap: Record<string, string> = {
    Prima: "prima.luminedge@gmail.com",
    Neelima: "neelima.luminedge2023@gmail.com",
    Tamim: "tamim.luminedge@gmail.com",
    Raisa: "raisa.luminedge@gmail.com",
    Rafi: "rafi.luminedge@gmail.com",
    Saiham: "saiham.luminedge@gmail.com",
    Tanvir: "tanvirkhan.luminedge@gmail.com",
    Iffat: "iffat.luminedge@gmail.com",
    Najia: "najia.luminedge@gmail.com",
    Sazzadur: "sazzadur.luminedge@gmail.com",
    Mubasshira: "mubasshira.luminedge@gmail.com",
    // Rahul: "rahul1921@cseku.ac.bd",
   
  };

  // Pull per-schedule feedback flags
  const hydrateFeedbackStatus = useCallback(
    async (userIds: string[]) => {
      if (!userIds?.length || !scheduleId) return;

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
          const hit = map.get(u._id);
          if (!hit) return u;
          return {
            ...u,
            feedbackStatus: { ...(u.feedbackStatus || {}), ...hit.fs },
            feedbackDetail: hit.detail ?? u.feedbackDetail,
          };
        })
      );
    },
    [scheduleId]
  );

  // Hydrate TRF "sent" status for each user
  const hydrateTrfSentStatus = useCallback(
    async (userIds: string[]) => {
      if (!scheduleId || !userIds?.length) return;
      try {
        const results = await Promise.all(
          userIds.map(async (uid) => {
            try {
              const { data } = await axios.get<{
                sent: boolean;
                lastSentAt?: string;
              }>(`${API_BASE}/api/v1/admin/trf-email-status/${uid}/${scheduleId}`);
              return { uid, sent: !!data?.sent };
            } catch (e) {
              console.error("trf-email-status fetch failed:", uid, e);
              return { uid, sent: false };
            }
          })
        );
        setTrfEmailSentByUser((prev) => {
          const next = { ...prev };
          results.forEach(({ uid, sent }) => {
            next[uid] = sent;
          });
          return next;
        });
      } catch (e) {
        console.error("hydrateTrfSentStatus error:", e);
      }
    },
    [scheduleId]
  );

  // Hydrate budget for each user
  const hydrateUserBudgets = useCallback(async (userIds: string[]) => {
    if (!userIds?.length || !scheduleId) return;
    try {
      const results = await Promise.all(
        userIds.map(async (uid) => {
          try {
            const { data } = await axios.get<BudgetResponse>(
              `${API_BASE}/api/v1/admin/user-budget/${uid}/${scheduleId}`
            );
            return { uid, budget: data.budget || 0 };
          } catch (e) {
            console.error("budget fetch failed:", uid, e);
            return { uid, budget: 0 };
          }
        })
      );
      setUserBudgets((prev) => {
        const next = { ...prev };
        results.forEach(({ uid, budget }) => {
          next[uid] = budget;
        });
        return next;
      });
    } catch (e) {
      console.error("hydrateUserBudgets error:", e);
    }
  }, [scheduleId]);

  const fetchBookingsAndUsers = useCallback(async () => {
    if (!scheduleId) return;
  
    try {
      setLoading(true);
  
      // 1) Fetch ONLY bookings for this schedule (paged & fast)
      const { data: bookingsData } = await axios.get(
        `${API_BASE}/api/v1/admin/bookings/by-schedule/${scheduleId}`,
        { params: { page: 1, limit: 500 } } // keep modest
      );
  
      // already filtered server-side
      const filteredBookings: Booking[] = bookingsData?.bookings || [];
  
      // 2) Collect unique user ids
      const userIds: string[] = Array.from(
        new Set(
          filteredBookings.flatMap((b: Booking) =>
            Array.isArray(b.userId) ? b.userId.map(toId) : [toId(b.userId)]
          )
        )
      );
  
      // 3) Fetch ONLY the users we need (page through users API until done)
      const baseUsers = userIds.length ? await fetchUsersByIds(userIds) : [];
  
      // 3b) Enrich with schedule-scoped teacher fields (fallback to legacy)
      const matchedUsers = baseUsers.map((u: any) => {
        const sched = u.teachersBySchedule?.[scheduleId] || {};
        return {
          ...u,
          teacherL: sched.teacherL ?? u.teacherL ?? "",
          teacherLEmail: sched.teacherLEmail ?? u.teacherLEmail ?? "",
          teacherW: sched.teacherW ?? u.teacherW ?? "",
          teacherWEmail: sched.teacherWEmail ?? u.teacherWEmail ?? "",
          teacherR: sched.teacherR ?? u.teacherR ?? "",
          teacherREmail: sched.teacherREmail ?? u.teacherREmail ?? "",
          teacherS: sched.teacherS ?? u.teacherS ?? "",
          teacherSEmail: sched.teacherSEmail ?? u.teacherSEmail ?? "",
          feedbackStatus: u.feedbackStatus || {},
        };
      });
  
      // 4) Seed attendance map & counts
      const initialAttendance: Record<string, string> = {};
      for (const bk of filteredBookings) {
        const ids = Array.isArray(bk.userId) ? bk.userId.map(toId) : [toId(bk.userId)];
        for (const uid of ids) initialAttendance[uid] = bk.attendance || "N/A";
      }
      const presentCount = Object.values(initialAttendance).filter((s) => s === "present").length;
      const absentCount  = Object.values(initialAttendance).filter((s) => s === "absent").length;
  
      setBookings(filteredBookings);
      setUsers(matchedUsers);
      setAttendance(initialAttendance);
      setAttendanceCounts({ present: presentCount, absent: absentCount });
  
      // 5) Bulk attendance summary
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
        } catch (err) {
          console.error("Error fetching bulk attendance:", err);
          toast.error("Attendance lookup failed.");
        }
      }
  
      // 6) Hydrate schedule-scoped feedback flags
      await hydrateFeedbackStatus(userIds);
  
      // 7) Hydrate TRF sent status for Done badge
      await hydrateTrfSentStatus(userIds);
  
      // 8) Hydrate budgets for users
      await hydrateUserBudgets(userIds);
    } catch (err) {
      console.error(err);
      toast.error("Error fetching data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [scheduleId, hydrateFeedbackStatus, hydrateTrfSentStatus, hydrateUserBudgets]);
  
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
          "Budget",
        ],
      ],
      body: users.map((user: any, index: number) => {
        const uid = toId(user._id);
        const related = bookings.find((bk) => hasUserInBooking(bk, uid));
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
          userAttendance[uid] ?? "N/A",
          userBudgets[uid] !== undefined ? `$${userBudgets[uid]}` : "N/A",
        ];
      }),
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 1.5, overflow: "linebreak", valign: "middle" },
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
        10: { cellWidth: 20 }, // New column for budget
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
      const userBooking = bookingsArr.find((bk) => hasUserInBooking(bk, uid));

      const matchesFilter =
        (user?.name || "").toLowerCase().includes(f) ||
        (user?.email || "").toLowerCase().includes(f);

      const matchesType =
        !typeFilter ||
        (userBooking?.testType || "").toLowerCase().trim() ===
          typeFilter.toLowerCase().trim();

      const matchesSystem =
        !systemFilter ||
        (userBooking?.testSystem || "").toLowerCase().trim() ===
          systemFilter.toLowerCase().trim();

      return matchesFilter && matchesType && matchesSystem;
    });
  };

  const filteredUsers = filterUsers(
    users,
    bookings,
    filter, testTypeFilter,
    testSystemFilter,
    attendanceFilter
  );

  const onChangeTeacher = async (
    userId: string,
    skill: "L" | "W" | "R" | "S",
    newTeacher: string
  ) => {
    const email = teacherEmailMap[newTeacher];
    if (!email) {
      toast.error(`No email mapped for teacher ${newTeacher}`);
      return;
    }

    try {
      const response = await axios.put(
        `${API_BASE}/api/v1/admin/users/${userId}/schedules/${scheduleId}/teacher`,
        { skill, teacher: newTeacher, email }
      );

      if (response.data?.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === userId
              ? { ...u, [`teacher${skill}`]: newTeacher, [`teacher${skill}Email`]: email }
              : u
          )
        );
        toast.success(`Teacher for ${skill} updated to ${newTeacher}`);
      } else {
        toast.error(response.data?.message || "Update failed");
      }
    } catch (err) {
      console.error("Update failed:", err);
      toast.error("Failed to update teacher for " + skill);
    }
  };

  const segmentMap = {
    L: "listening",
    W: "writing",
    R: "reading",
    S: "speaking",
  } as const;

  const TeacherSelect = ({
    value,
    userId,
    skill,
    onChange,
    feedbackSaved,
    tooltipText,
    disabled = false,
  }: {
    value: string;
    userId: string;
    skill: keyof typeof segmentMap;
    onChange: (userId: string, skill: keyof typeof segmentMap, newTeacher: string) => void;
    feedbackSaved?: boolean;
    tooltipText?: string;
    disabled?: boolean;
  }) => {
    return (
      <div className="relative w-full">
        <select
          value={value || ""}
          onChange={(e) => onChange(userId, skill, e.target.value)}
          disabled={disabled}
          className={`w-full px-2 py-1 pr-6 border rounded text-sm font-semibold ${getTeacherBgClass(
            value
          )} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <option value="">Select</option>
          {Object.keys(teacherEmailMap).map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>

        {feedbackSaved && !disabled && (
          <div
            title={tooltipText || "Feedback saved"}
            className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-[#face39] text-[#00000f] text-[10px] font-bold rounded-full shadow-md border border-[#00000f]"
          >
            ✔
          </div>
        )}
      </div>
    );
  };

  const teacherColorMap: Record<string, string> = {
    Prima: "bg-green-500 text-white",
    Neelima: "bg-blue-600 text-white",
    Tamim: "bg-yellow-500 text-black",
    Raisa: "bg-red-600 text-white",
    Rafi: "bg-indigo-600 text-white",
    Saiham: "bg-emerald-600 text-white",
    Tanvir: "bg-purple-600 text-white",
    Iffat: "bg-pink-600 text-white",
    Najia: "bg-cyan-600 text-white",
    Sazzadur: "bg-lime-600 text-white",
    Mubasshira: "bg-rose-600 text-white",
    // Rahul: "bg-teal-600 text-white",
  };

  const getTeacherBgClass = (value: string) =>
    teacherColorMap[value] || "bg-white text-black";

  // Helper: are all 4 segments saved for THIS schedule?
  const isFeedbackComplete = (u: any) =>
    !!(
      u?.feedbackStatus?.listening &&
      u?.feedbackStatus?.reading &&
      u?.feedbackStatus?.writing &&
      u?.feedbackStatus?.speaking
    );

  // TRF eligibility + route
  const canonicalizeCourse = (raw?: string) => {
    const n = String(raw || "").trim().toLowerCase();
    if (n.includes("ielts")) return "ielts";
    if (n.includes("pte")) return "pearson pte";
    if (n.includes("gre")) return "gre";
    if (n.includes("toefl")) return "toefl";
    return n;
  };
  const TRF_ELIGIBLE = new Set(["ielts", "pearson pte", "gre", "toefl"]);
  const canShowTrfFor = (courseName?: string) =>
    TRF_ELIGIBLE.has(canonicalizeCourse(courseName));
  const TRF_ROUTE_BY_COURSE: Record<string, string> = {
    ielts: "/admin/form",
    "pearson pte": "/admin/form",
    gre: "/admin/form",
    toefl: "/admin/form",
  };
  const getTrfRoute = (courseName?: string) =>
    TRF_ROUTE_BY_COURSE[canonicalizeCourse(courseName)] ?? "/admin/form";

  return (
    <div className="p-0 sm:p-3 w-full sm:max-w-[100%] mx-auto bg-[#ffffff] text-[#00000f] shadow-1xl rounded-2xl border border-[#00000f]/10">
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* Filters */}
          <div className=" bg-gray-100 p-4 h-22 mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className=" mt-2 p-2 rounded shadow grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <th className="px-4 py-2 text-left">L Teacher</th>
                  <th className="px-4 py-2 text-left">W Teacher</th>
                  <th className="px-4 py-2 text-left">R Teacher</th>
                  <th className="px-4 py-2 text-left">S Teacher</th>
                  <th className="px-4 py-2 text-left">Attendance</th>
                  <th className="px-4 py-2 text-left">TRF</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => {
                  const uid = toId(user._id);
                  const isAbsent = attendance[uid] === "absent";
                  const allSaved = isFeedbackComplete(user);
                  const emailDone = !!trfEmailSentByUser[uid];
                  const budget = userBudgets[uid] || 0;

                  return (
                    <tr key={uid} className="border-b">
                      <td className="px-4 py-2 text-sm">{index + 1}</td>
                      <td className="px-4 py-2 text-sm">{user?.name || "N/A"}</td>
                      <td className="px-4 py-2 text-sm">{user?.email || "N/A"}</td>
                      <td className="px-4 py-2 text-sm">{user?.contactNo || "N/A"}</td>

                      <td>
                        <TeacherSelect
                          value={user.teacherL || ""}
                          userId={uid}
                          skill="L"
                          onChange={onChangeTeacher}
                          feedbackSaved={user.feedbackStatus?.listening}
                          tooltipText={user.teacherLEmail || "Saved"}
                          disabled={isAbsent}
                        />
                      </td>
                      <td>
                        <TeacherSelect
                          value={user.teacherW || ""}
                          userId={uid}
                          skill="W"
                          onChange={onChangeTeacher}
                          feedbackSaved={user.feedbackStatus?.writing}
                          tooltipText={user.teacherWEmail || "Saved"}
                          disabled={isAbsent}
                        />
                      </td>
                      <td>
                        <TeacherSelect
                          value={user.teacherR || ""}
                          userId={uid}
                          skill="R"
                          onChange={onChangeTeacher}
                          feedbackSaved={user.feedbackStatus?.reading}
                          tooltipText={user.teacherREmail || "Saved"}
                          disabled={isAbsent}
                        />
                      </td>
                      <td>
                        <TeacherSelect
                          value={user.teacherS || ""}
                          userId={uid}
                          skill="S"
                          onChange={onChangeTeacher}
                          feedbackSaved={user.feedbackStatus?.speaking}
                          tooltipText={user.teacherSEmail || "Saved"}
                          disabled={isAbsent}
                        />
                      </td>

                      <td className="px-4 py-2 text-sm">{attendance[uid] || "N/A"}</td>

                      <td className="px-4 py-2">
                        {canShowTrfFor(bookings[0]?.name) ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const qs = new URLSearchParams({
                                  userId: uid,
                                  scheduleId,
                                  teacherL: user.teacherL || "",
                                  teacherW: user.teacherW || "",
                                  teacherR: user.teacherR || "",
                                  teacherS: user.teacherS || "",
                                  l: String(!!user?.feedbackStatus?.listening),
                                  r: String(!!user?.feedbackStatus?.reading),
                                  w: String(!!user?.feedbackStatus?.writing),
                                  s: String(!!user?.feedbackStatus?.speaking),
                                  course: canonicalizeCourse(bookings[0]?.name),
                                });
                                router.push(`${getTrfRoute(bookings[0]?.name)}?${qs.toString()}`);
                              }}
                              disabled={isAbsent}
                              className={`inline-flex items-center gap-2 px-4 py-1 rounded-md font-medium shadow-sm text-sm transition
                                ${
                                  isAbsent
                                    ? "bg-red-500 text-white cursor-not-allowed"
                                    : allSaved
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : "bg-[#00000f] text-white hover:bg-[#face39] hover:text-[#00000f]"
                                }`}
                              title={
                                isAbsent
                                  ? "User absent"
                                  : allSaved
                                  ? "All segments saved — view TRF"
                                  : "View TRF (some segments may be pending)"
                              }
                            >
                              {allSaved ? "View TRF ✓" : "View TRF"}
                              {emailDone && (
                                <span
                                  title="TRF email sent"
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-[#00000f] bg-[#face39] text-[#00000f] text-[10px] font-bold shadow-sm"
                                >
                                  ✔ Done
                                </span>
                              )}
                            </button>
                            {budget > 0 && (
                              <span className="text-sm font-semibold text-gray-700">
                                Budget: ${budget}
                              </span>
                            )}
                          </div>
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

          {/* Action Buttons */}
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
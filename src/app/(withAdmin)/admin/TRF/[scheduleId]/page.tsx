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

const TrfBookingRequestsPage = ({ params }: { params: { scheduleId: string } }) => {
  const { scheduleId } = params || {};
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<string>("");
  const [testTypeFilter, setTestTypeFilter] = useState<string>("");
  const [testSystemFilter, setTestSystemFilter] = useState<string>("");
  const [userAttendance, setUserAttendance] = useState<Record<string, number | null>>({});
  const [attendanceFilter, setAttendanceFilter] = useState<string>(""); // (kept for parity)
  const [attendanceCounts, setAttendanceCounts] = useState({ present: 0, absent: 0 });

  // Map teacher code -> email (adjust to your real map)
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

  const fetchBookingsAndUsers = useCallback(async () => {
    if (!scheduleId) return;

    try {
      setLoading(true);

      // 1) Fetch bookings, filter by schedule
      const { data: bookingsData } = await axios.get(`${API_BASE}/api/v1/admin/bookings`);
      const filteredBookings: Booking[] = bookingsData.bookings.filter(
        (b: Booking) => b.scheduleId === scheduleId
      );

      // 2) Unique userIds from these bookings
      const userIds: string[] = Array.from(
        new Set(
          filteredBookings.flatMap((b) => (Array.isArray(b.userId) ? b.userId : [b.userId]))
        )
      );

      // 3) Fetch users; enrich with schedule-scoped teacher fields (fallback to legacy)
      const { data: usersData } = await axios.get(`${API_BASE}/api/v1/admin/users`);
      const matchedUsers = usersData.users
        .filter((u: any) => userIds.includes(u._id))
        .map((u: any) => {
          const sched = u.teachersBySchedule?.[scheduleId] || {};
          return {
            ...u,
            // schedule-scoped teacher codes (fallback to legacy fields if missing)
            teacherL: sched.teacherL ?? u.teacherL ?? "",
            teacherLEmail: sched.teacherLEmail ?? u.teacherLEmail ?? "",
            teacherW: sched.teacherW ?? u.teacherW ?? "",
            teacherWEmail: sched.teacherWEmail ?? u.teacherWEmail ?? "",
            teacherR: sched.teacherR ?? u.teacherR ?? "",
            teacherREmail: sched.teacherREmail ?? u.teacherREmail ?? "",
            teacherS: sched.teacherS ?? u.teacherS ?? "",
            teacherSEmail: sched.teacherSEmail ?? u.teacherSEmail ?? "",
            feedbackStatus: u.feedbackStatus || {}, // will be hydrated per-schedule next
          };
        });

      // 4) Attendance mapping from bookings
      const initialAttendance: Record<string, string> = {};
      filteredBookings.forEach((b) => {
        const ids = Array.isArray(b.userId) ? b.userId : [b.userId];
        ids.forEach((uid) => {
          initialAttendance[uid] = b.attendance || "N/A";
        });
      });

      const presentCount = Object.values(initialAttendance).filter((s) => s === "present").length;
      const absentCount = Object.values(initialAttendance).filter((s) => s === "absent").length;

      setBookings(filteredBookings);
      setUsers(matchedUsers);
      setAttendance(initialAttendance);
      setAttendanceCounts({ present: presentCount, absent: absentCount });

      // 5) Bulk attendance (unchanged backend)
      if (userIds.length > 0) {
        try {
          const { data: attendanceResponse } = await axios.post(
            `${API_BASE}/api/v1/user/attendance/bulk`,
            { userIds },
            { headers: { "Content-Type": "application/json" } }
          );
          const attendanceData: Record<string, number | null> = {};
          userIds.forEach((uid) => {
            attendanceData[uid] = attendanceResponse.attendance?.[uid] ?? null;
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

      // 6) Hydrate schedule-scoped feedback flags
      await hydrateFeedbackStatus(userIds);
    } catch (err) {
      console.error(err);
      toast.error("Error fetching data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [scheduleId, hydrateFeedbackStatus]);

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

    const bookingToDownload = bookings[0];
    const doc = new jsPDF({ orientation: "landscape", format: "a4" });

    doc.setFontSize(10);
    doc.text("Booking Details", 10, 15);
    doc.text(`Test Name: ${bookingToDownload.name}`, 10, 20);
    doc.text(`Date: ${bookingToDownload.bookingDate}`, 10, 25);
    doc.text(`Schedule Time: ${bookingToDownload.startTime} - ${bookingToDownload.endTime}`, 10, 30);

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
        let uid = user._id;
        if (Array.isArray(uid)) uid = uid[0];

        const relatedBooking = bookings.find((b) =>
          Array.isArray(b.userId) ? b.userId.includes(uid) : b.userId === uid
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
          userAttendance[uid] !== null ? userAttendance[uid] : "N/A",
        ];
      }),
      theme: "grid",
      styles: { fontSize: 10, overflow: "linebreak" },
      headStyles: { fillColor: [250, 206, 57] }, // safer RGB
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
    users: any[],
    bookings: Booking[],
    filter: string,
    testTypeFilter: string,
    testSystemFilter: string,
    _attendanceFilter: string
  ) => {
    return users.filter((user) => {
      const userBooking = bookings.find((b) =>
        Array.isArray(b.userId) ? b.userId.includes(user._id) : b.userId === user._id
      );

      const matchesFilter =
        user?.name?.toLowerCase().includes(filter.toLowerCase()) ||
        user?.email?.toLowerCase().includes(filter.toLowerCase());

      const matchesTestType =
        !testTypeFilter ||
        userBooking?.testType?.toLowerCase().trim() === testTypeFilter.toLowerCase().trim();

      const matchesTestSystem =
        !testSystemFilter ||
        userBooking?.testSystem?.toLowerCase().trim() === testSystemFilter.toLowerCase().trim();

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

  const segmentMap = { L: "listening", W: "writing", R: "reading", S: "speaking" } as const;

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
  };

  const getTeacherBgClass = (value: string) => teacherColorMap[value] || "bg-white text-black";

  // Helper: are all 4 segments saved for THIS schedule?
  const isFeedbackComplete = (u: any) =>
    !!(
      u?.feedbackStatus?.listening &&
      u?.feedbackStatus?.reading &&
      u?.feedbackStatus?.writing &&
      u?.feedbackStatus?.speaking
    );

  // --- TRF visibility + (optional) per-course route mapping ---
  const canonicalizeCourse = (raw?: string) => {
    const n = String(raw || "").trim().toLowerCase();
    if (n.includes("ielts")) return "ielts";
    if (n.includes("pte")) return "pearson pte"; // covers "pte", "pte academic", "pearson pte"
    if (n.includes("gre")) return "gre";
    if (n.includes("toefl")) return "toefl"; // covers "toefl ibt"
    return n;
  };

  const TRF_ELIGIBLE = new Set(["ielts", "pearson pte", "gre", "toefl"]);

  const canShowTrfFor = (courseName?: string) => TRF_ELIGIBLE.has(canonicalizeCourse(courseName));

  // If you later split TRF pages per course, just change these routes:
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
      {/* Keep a single <Toaster /> globally in app/layout.tsx to avoid duplicate toasts */}
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
                  const isAbsent = attendance[user._id] === "absent";
                  const allSaved = isFeedbackComplete(user);

                  return (
                    <tr key={user._id} className="border-b">
                      <td className="px-4 py-2 text-sm">{index + 1}</td>
                      <td className="px-4 py-2 text-sm">{user?.name || "N/A"}</td>
                      <td className="px-4 py-2 text-sm">{user?.email || "N/A"}</td>
                      <td className="px-4 py-2 text-sm">{user?.contactNo || "N/A"}</td>

                      <td>
                        <TeacherSelect
                          value={user.teacherL || ""}
                          userId={user._id}
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
                          userId={user._id}
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
                          userId={user._id}
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
                          userId={user._id}
                          skill="S"
                          onChange={onChangeTeacher}
                          feedbackSaved={user.feedbackStatus?.speaking}
                          tooltipText={user.teacherSEmail || "Saved"}
                          disabled={isAbsent}
                        />
                      </td>

                      <td className="px-4 py-2 text-sm">{attendance[user._id] || "N/A"}</td>

                      <td className="px-4 py-2">
                        {canShowTrfFor(bookings[0]?.name) ? (
                          <button
                            onClick={() =>
                              router.push(
                                `${getTrfRoute(bookings[0]?.name)}?userId=${encodeURIComponent(
                                  user._id
                                )}&scheduleId=${encodeURIComponent(
                                  scheduleId
                                )}&course=${encodeURIComponent(
                                  canonicalizeCourse(bookings[0]?.name)
                                )}`
                              )
                            }
                            disabled={isAbsent}
                            className={`px-5 py-2 rounded-xl font-medium shadow-md transition-all duration-300 ease-in-out
        ${
          isAbsent
            ? "bg-red-500 text-white cursor-not-allowed"
            : allSaved
            ? "bg-green-600 text-white hover:bg-green-700"
            : "bg-[#00000f] text-white hover:bg-[#face39] hover:text-[#00000f] hover:font-semibold hover:shadow-xl hover:scale-105"
        }
      `}
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

"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

// ---------- Types ----------
type SegmentKey = "listening" | "writing" | "reading" | "speaking";

type FeedbackBySchedule = Record<
  string, // scheduleId / bookingId
  {
    listening?: boolean;
    writing?: boolean;
    reading?: boolean;
    speaking?: boolean;
  }
>;

type EmbeddedUser = {
  _id: string;
  name: string;
  email: string;
  contactNo?: string;
  transactionId?: string;
  passportNumber?: string;
  mock?: number;
  feedbackStatusBySchedule?: FeedbackBySchedule; // not guaranteed; used as a seed when present
};

type Booking = {
  _id: string; // schedule/booking id used as key for per-schedule feedback
  name: string;
  testType: string;
  testSystem: string;
  location?: string;
  bookingDate: string;
  testTime?: string;
  userId: string;
  attendance?: string;

  // teacher assignments on the booking (preferred source if present)
  teacherL?: string;
  teacherW?: string;
  teacherR?: string;
  teacherS?: string;
  teacherLEmail?: string | null;
  teacherWEmail?: string | null;
  teacherREmail?: string | null;
  teacherSEmail?: string | null;

  // joined user doc
  user?: EmbeddedUser;
};

type FeedbackFlags = {
  listening?: boolean;
  writing?: boolean;
  reading?: boolean;
  speaking?: boolean;
};

export default function HomeBasedPage() {
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [userAttendance, setUserAttendance] = useState<
    Record<string, { present: number; absent: number }>
  >({});
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [schedulesPerPage, setSchedulesPerPage] = useState<number>(20);
  const [nameFilter, setNameFilter] = useState("");
  const [courseNameFilter, setCourseNameFilter] = useState("");
  const [testTypeFilter, setTestTypeFilter] = useState("IELTS");
  const [dateFilter, setDateFilter] = useState("past"); // 'all' | 'past' | 'upcoming'
  const [startDateFilter, setStartDateFilter] = useState("");

  // --- hydrated flags and teacher/email-fetch caches ---
  const [feedbackFlagsBySchedule, setFeedbackFlagsBySchedule] = useState<
    Record<string, FeedbackFlags>
  >({});
  const [emailSentBySchedule, setEmailSentBySchedule] = useState<Record<string, boolean>>({});
  const fetchedFlagsRef = React.useRef<Set<string>>(new Set()); // scheduleId set
  const fetchedTeachersRef = React.useRef<Set<string>>(new Set()); // `${uid}:${sid}` set
  const fetchedEmailRef = React.useRef<Set<string>>(new Set()); // scheduleId set for TRF email status

  const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://luminedge-server.vercel.app").replace(
    /\/$/,
    ""
  );
  // -------- fetch bookings with embedded users --------
  const fetchHomeBookingsAndUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await cachedGet(`${API_BASE}/api/v1/admin/bookings/home-with-users`, {
        ttl: 60_000, // cache list for 1 minute
      });

      let homeBookings: Booking[] = data.bookings || [];
      // Enforce IELTS only (UI enforces it too)
      homeBookings = homeBookings.filter((b) => (b.name || "").toUpperCase().includes("IELTS"));

      if (!homeBookings.length) {
        setBookings([]);
        setUserAttendance({});
        setAttendance({});
        setEmailSentBySchedule({});
        return;
      }

      // Build attendance summary + latest attendance map
      const attendanceSummary: Record<string, { present: number; absent: number }> = {};
      const initialAttendance: Record<string, string> = {};

      homeBookings.forEach((booking) => {
        const uid = booking.userId;
        if (!attendanceSummary[uid]) attendanceSummary[uid] = { present: 0, absent: 0 };
        const att = booking.attendance;
        if (att === "present") attendanceSummary[uid].present += 1;
        if (att === "absent") attendanceSummary[uid].absent += 1;
        if (att) initialAttendance[uid] = att;
      });

      setBookings(homeBookings);
      setUserAttendance(attendanceSummary);
      setAttendance(initialAttendance);

      // Seed any known feedback flags from embedded user to avoid calls later
      const seeds: Record<string, FeedbackFlags> = {};
      homeBookings.forEach((b) => {
        const hint = b.user?.feedbackStatusBySchedule?.[b._id];
        if (hint) {
          seeds[b._id] = {
            listening: !!hint.listening,
            reading: !!hint.reading,
            writing: !!hint.writing,
            speaking: !!hint.speaking,
          };
          fetchedFlagsRef.current.add(b._id);
        }
      });
      if (Object.keys(seeds).length) {
        setFeedbackFlagsBySchedule((prev) => ({ ...seeds, ...prev }));
      }
    } catch (err: any) {
      console.error("❌ Fetch failed:", err);
      toast.error(err?.message || "Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchHomeBookingsAndUsers();
  }, [fetchHomeBookingsAndUsers]);

  // -------- teacher maps --------
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
    Rahul: "rahul1921@cseku.ac.bd",
  };

  const emailToTeacher: Record<string, string> = useMemo(() => {
    const m: Record<string, string> = {};
    Object.entries(teacherEmailMap).forEach(([name, email]) => {
      if (email) m[email.trim().toLowerCase()] = name;
    });
    return m;
  }, []);

  const onChangeTeacher = async (
    bookingId: string,
    skill: "L" | "W" | "R" | "S",
    newTeacher: string
  ) => {
    const email = teacherEmailMap[newTeacher];
    if (!email) {
      toast.error(`No email mapped for teacher ${newTeacher}`);
      return;
    }

    try {
      const res = await axios.put(`${API_BASE}/api/v1/admin/bookings/${bookingId}/teacher`, {
        skill,
        teacher: newTeacher,
        email,
      });

      if (res.data?.success) {
        setBookings((prev) =>
          prev.map((b) =>
            b._id === bookingId
              ? { ...b, [`teacher${skill}`]: newTeacher, [`teacher${skill}Email`]: email }
              : b
          )
        );
        toast.success(`Teacher for ${skill} updated to ${newTeacher}`);
      } else {
        toast.error(res.data?.message || "Update failed");
      }
    } catch (err) {
      console.error("Update failed:", err);
      toast.error("Failed to update teacher for " + skill);
    }
  };

  // ---------- utils ----------
  function formatTime(time?: string) {
    if (!time || typeof time !== "string" || !time.includes(":")) return "N/A";
    const [hourStr, minuteStr] = time.split(":");
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
    if (isNaN(hour) || isNaN(minute)) return "N/A";
    const period = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minute.toString().padStart(2, "0")} ${period}`;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // All segments saved for a booking? (use hydrated flags, not embedded user)
  const isAllFeedbackSaved = (b: Booking) => {
    const flags = feedbackFlagsBySchedule[b._id] || {};
    return !!(flags.listening && flags.reading && flags.writing && flags.speaking);
  };

// ---------- TRF redirect (go to /admin/form) ----------
const handleViewTRF = useCallback((booking: Booking) => {
  // fall back to booking.userId if joined user is missing
  const uid = booking.user?._id ?? booking.userId;
  const sid = booking._id;

  if (!uid || !sid) {
    toast.error("Missing userId or scheduleId.");
    return;
  }

  // include teacher hints + saved-segment flags if you want (optional)
  const teacherL =
    booking.teacherL ||
    (booking.teacherLEmail && emailToTeacher[(booking.teacherLEmail || "").toLowerCase()]) ||
    "";
  const teacherW =
    booking.teacherW ||
    (booking.teacherWEmail && emailToTeacher[(booking.teacherWEmail || "").toLowerCase()]) ||
    "";
  const teacherR =
    booking.teacherR ||
    (booking.teacherREmail && emailToTeacher[(booking.teacherREmail || "").toLowerCase()]) ||
    "";
  const teacherS =
    booking.teacherS ||
    (booking.teacherSEmail && emailToTeacher[(booking.teacherSEmail || "").toLowerCase()]) ||
    "";

  const flags = feedbackFlagsBySchedule[sid] || {};
  const qs = new URLSearchParams({
    userId: String(uid),
    scheduleId: String(sid),
    teacherL,
    teacherW,
    teacherR,
    teacherS,
    l: String(!!flags.listening),
    r: String(!!flags.reading),
    w: String(!!flags.writing),
    s: String(!!flags.speaking),
  });

  router.push(`/admin/form?${qs.toString()}`);
}, [emailToTeacher, feedbackFlagsBySchedule, router]);

  // ---------- filtering / paging ----------
  const filteredBookings = useMemo(() => {
    return bookings
      .filter((booking) => {
        const user = booking.user || ({} as EmbeddedUser);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const bookingDate = new Date(booking.bookingDate);
        bookingDate.setHours(0, 0, 0, 0);

        if (dateFilter === "past" && bookingDate >= today) return false;
        if (dateFilter === "upcoming" && bookingDate < today) return false;

        if (startDateFilter) {
          const filterDate = new Date(startDateFilter);
          filterDate.setHours(0, 0, 0, 0);
          if (bookingDate.getTime() !== filterDate.getTime()) return false;
        }

        if (nameFilter && !user.name?.toLowerCase().includes(nameFilter.toLowerCase())) return false;

        if (
          courseNameFilter &&
          !booking.name?.toLowerCase().includes(courseNameFilter.toLowerCase())
        )
          return false;

        // enforced IELTS type already via fetch filter; keep testTypeFilter hook for UI parity
        if (testTypeFilter && !booking.name?.toUpperCase().includes(testTypeFilter)) return false;

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.bookingDate).getTime();
        const dateB = new Date(b.bookingDate).getTime();
        return dateB - dateA; // always DESC
      })
      .reduce((acc: Record<string, Booking[]>, booking) => {
        const dateKey = booking.bookingDate ? formatDate(booking.bookingDate) : "N/A";
        (acc[dateKey] ||= []).push(booking);
        return acc;
      }, {});
  }, [bookings, dateFilter, startDateFilter, nameFilter, courseNameFilter, testTypeFilter]);

  const indexOfLastSchedule = currentPage * schedulesPerPage;
  const indexOfFirstSchedule = indexOfLastSchedule - schedulesPerPage;
  const currentSchedules = Object.values(filteredBookings)
    .flat()
    .slice(indexOfFirstSchedule, indexOfLastSchedule);

  // Debounce current page rows to avoid rapid effect churn while typing/scrolling/paginating
  const debouncedSchedules = useDebouncedValue(currentSchedules, 250);

  useEffect(() => {
    const total = Object.values(filteredBookings).flat().length;
    const maxPage = Math.ceil(total / schedulesPerPage) || 1;
    if (currentPage > maxPage) setCurrentPage(maxPage);
    if (total === 0) setCurrentPage(1);
  }, [filteredBookings, schedulesPerPage, currentPage]);

  // ---------- hydrate feedback flags for only visible rows (GET endpoint, cached & debounced) ----------
  useEffect(() => {
    if (!debouncedSchedules.length) return;

    const limit = pLimit(4);
    (async () => {
      await Promise.all(
        debouncedSchedules
          .filter((b) => b.user?._id && !fetchedFlagsRef.current.has(b._id))
          .map((b) =>
            limit(async () => {
              try {
                const data = await cachedGet(
                  `${API_BASE}/api/v1/admin/feedback-status/${b.user!._id}/${b._id}`,
                  { ttl: 5 * 60_000 }
                );
                const s = data?.status || {};
                const flags: FeedbackFlags = {
                  listening: !!s.listening,
                  reading: !!s.reading,
                  writing: !!s.writing,
                  speaking: !!s.speaking,
                };
                setFeedbackFlagsBySchedule((prev) => ({ ...prev, [b._id]: flags }));
                fetchedFlagsRef.current.add(b._id);
              } catch (e: any) {
                console.error("feedback-status failed:", b._id, e?.message || e);
              }
            })
          )
      );
    })();
  }, [API_BASE, debouncedSchedules]);

  // ---------- hydrate TRF email "sent" status for visible rows ----------
  useEffect(() => {
    if (!debouncedSchedules.length) return;

    const toFetch = debouncedSchedules.filter(
      (b) => b.user?._id && !fetchedEmailRef.current.has(b._id)
    );
    if (!toFetch.length) return;

    const limit = pLimit(4);
    (async () => {
      await Promise.all(
        toFetch.map((b) =>
          limit(async () => {
            try {
              const data = await cachedGet(
                `${API_BASE}/api/v1/admin/trf-email-status/${b.user!._id}/${b._id}`,
                { ttl: 5 * 60_000 }
              );
              const sent = !!data?.sent;
              setEmailSentBySchedule((prev) => ({ ...prev, [b._id]: sent }));
              fetchedEmailRef.current.add(b._id);
            } catch (e: any) {
              console.error("trf-email-status failed:", b._id, e?.message || e);
            }
          })
        )
      );
    })();
  }, [API_BASE, debouncedSchedules]);

  // ---------- hydrate assigned teachers when booking has none (GET endpoint, cached & debounced) ----------
  useEffect(() => {
    if (!debouncedSchedules.length) return;

    const toFetch = debouncedSchedules.filter((b) => {
      const hasAnyTeacher =
        b.teacherL ||
        b.teacherW ||
        b.teacherR ||
        b.teacherS ||
        b.teacherLEmail ||
        b.teacherWEmail ||
        b.teacherREmail ||
        b.teacherSEmail;
      const key = `${b.user?._id}:${b._id}`;
      return b.user?._id && !hasAnyTeacher && !fetchedTeachersRef.current.has(key);
    });

    if (!toFetch.length) return;

    const limit = pLimit(4);
    (async () => {
      await Promise.all(
        toFetch.map((b) =>
          limit(async () => {
            try {
              const data = await cachedGet(
                `${API_BASE}/api/v1/admin/assigned-teachers/${b.user!._id}/${b._id}`,
                { ttl: 10 * 60_000 }
              );
              const { teacherL, teacherW, teacherR, teacherS } = data || {};
              setBookings((prev) =>
                prev.map((row) =>
                  row._id === b._id
                    ? {
                        ...row,
                        teacherL:
                          emailToTeacher[(teacherL || "").toLowerCase()] || row.teacherL || "",
                        teacherW:
                          emailToTeacher[(teacherW || "").toLowerCase()] || row.teacherW || "",
                        teacherR:
                          emailToTeacher[(teacherR || "").toLowerCase()] || row.teacherR || "",
                        teacherS:
                          emailToTeacher[(teacherS || "").toLowerCase()] || row.teacherS || "",
                        teacherLEmail: teacherL || row.teacherLEmail || null,
                        teacherWEmail: teacherW || row.teacherWEmail || null,
                        teacherREmail: teacherR || row.teacherREmail || null,
                        teacherSEmail: teacherS || row.teacherSEmail || null,
                      }
                    : row
                )
              );
              fetchedTeachersRef.current.add(`${b.user!._id}:${b._id}`);
            } catch (e: any) {
              console.error("assigned-teachers failed:", b._id, e?.message || e);
            }
          })
        )
      );
    })();
  }, [API_BASE, debouncedSchedules, emailToTeacher]);

  // ---------- render ----------
  return (
    <div className="p-1 sm:p-3 w-full sm:max-w-[100%] mx-auto bg-[#ffffff] text-[#00000f] shadow-1xl rounded-2xl border border-[#00000f]/10">
      <div className="bg-gray-100 p-2 h-auto mb-0 rounded shadow-sm">
        <h3 className="font-bold text-lg mb-0">Filter by</h3>
        <div className="flex flex-col sm:flex-row gap-4 text-sm">
          <label className="flex flex-col text-[#00000f]">
            <span className="mb-1 text-[#00000f]">Search by Name</span>
            <input
              type="text"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Enter name..."
              className="px-2 py-1 border rounded w/full sm:w-auto"
            />
          </label>

          <label className="flex flex-col text-[#00000f]">
            <span className="mb-1 text-[#00000f]">Course Type</span>
            <select
              value={testTypeFilter}
              onChange={(e) => setTestTypeFilter(e.target.value)}
              className="px-2 py-1 border rounded w/full sm:w-auto text-[#00000f]"
            >
              <option value="IELTS">IELTS (enforced)</option>
            </select>
          </label>

          <label className="flex flex-col">
            <span className="mb-1 text-[#00000f]">Schedule</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-2 py-1 border rounded w/full sm:w-auto text-[#00000f]"
            >
              <option value="all">All Schedules</option>
              <option value="past">Past</option>
              <option value="upcoming">Upcoming</option>
            </select>
          </label>

          <label className="flex flex-col">
            <span className="mb-1 text-[#00000f]">Search by Date</span>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="px-2 py-1 border rounded w/full sm:w-auto"
            />
          </label>
        </div>
      </div>

      <motion.h1
        className="text-2xl font-semibold mt-4 mb-1 text-[#00000f]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        Home Based Booking List
      </motion.h1>

      <div className="overflow-x-auto">
        <table className="table-auto w-full border-collapse">
          <thead>
            <tr className="bg-[#face39] text-sm">
              <th className="p-4">#</th>
              <th className="p-4">User Name</th>
              <th className="p-4">Course Name</th>
              <th className="p-4">Test Type</th>
              <th className="p-4">Test System</th>
              <th className="p-4">Exam Date</th>
              <th className="p-4">Test Time</th>
              <th className="p-4">Email</th>
              <th className="p-4">Attendance</th>
              <th className="p-4">L Teacher</th>
              <th className="p-4">W Teacher</th>
              <th className="p-4">R Teacher</th>
              <th className="p-4">S Teacher</th>
              <th className="p-4">TRF</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={14} className="p-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : debouncedSchedules.length > 0 ? (
              debouncedSchedules.map((booking: Booking, index: number) => {
                const user = booking.user || ({} as EmbeddedUser);
                const isAbsent = booking.attendance === "absent";

                const flags = feedbackFlagsBySchedule[booking._id] || {};
                const allSaved = isAllFeedbackSaved(booking);

                // Prefer saved teacher names; otherwise derive from email
                const lVal =
                  booking.teacherL ||
                  (booking.teacherLEmail &&
                    emailToTeacher[(booking.teacherLEmail || "").toLowerCase()]) ||
                  "";
                const wVal =
                  booking.teacherW ||
                  (booking.teacherWEmail &&
                    emailToTeacher[(booking.teacherWEmail || "").toLowerCase()]) ||
                  "";
                const rVal =
                  booking.teacherR ||
                  (booking.teacherREmail &&
                    emailToTeacher[(booking.teacherREmail || "").toLowerCase()]) ||
                  "";
                const sVal =
                  booking.teacherS ||
                  (booking.teacherSEmail &&
                    emailToTeacher[(booking.teacherSEmail || "").toLowerCase()]) ||
                  "";

                // TRF email "Done" badge value (from hydrated status)
                const emailDone = !!emailSentBySchedule[booking._id];

                return (
                  <tr key={booking._id} className="text-center border-b text-sm">
                    <td className="p-4">{indexOfFirstSchedule + index + 1}</td>
                    <td className="p-4">{user.name || "N/A"}</td>
                    <td className="p-4">{booking.name}</td>
                    <td className="p-4">{booking.testType}</td>
                    <td className="p-4">{booking.testSystem}</td>
                    <td className="p-4">
                      {booking.bookingDate ? formatDate(booking.bookingDate) : "N/A"}
                    </td>
                    <td className="p-4">
                      {booking.testTime ? formatTime(booking.testTime) : "N/A"}
                    </td>
                    <td className="p-4">{user.email || "N/A"}</td>
                    <td className="p-4">{booking.attendance || "N/A"}</td>

                    {/* L / W / R / S teacher selects with per-segment check */}
                    <td className="p-4">
                      <TeacherSelect
                        value={lVal}
                        bookingId={booking._id}
                        skill="L"
                        onChange={onChangeTeacher}
                        feedbackSaved={!!flags.listening}
                        tooltipText={booking.teacherLEmail || "Saved"}
                        disabled={isAbsent}
                      />
                    </td>
                    <td className="p-4">
                      <TeacherSelect
                        value={wVal}
                        bookingId={booking._id}
                        skill="W"
                        onChange={onChangeTeacher}
                        feedbackSaved={!!flags.writing}
                        tooltipText={booking.teacherWEmail || "Saved"}
                        disabled={isAbsent}
                      />
                    </td>
                    <td className="p-4">
                      <TeacherSelect
                        value={rVal}
                        bookingId={booking._id}
                        skill="R"
                        onChange={onChangeTeacher}
                        feedbackSaved={!!flags.reading}
                        tooltipText={booking.teacherREmail || "Saved"}
                        disabled={isAbsent}
                      />
                    </td>
                    <td className="p-4">
                      <TeacherSelect
                        value={sVal}
                        bookingId={booking._id}
                        skill="S"
                        onChange={onChangeTeacher}
                        feedbackSaved={!!flags.speaking}
                        tooltipText={booking.teacherSEmail || "Saved"}
                        disabled={isAbsent}
                      />
                    </td>

                    {/* TRF button with inline yellow "Done" badge when email already sent */}
                    <td className="p-4">
                      <button
                        onClick={() => handleViewTRF(booking)}
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
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={14} className="p-4 text-center text-gray-500">
                  No bookings available for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 space-y-4 sm:space-y-0">
        <div>
          <label htmlFor="schedulesPerPage" className="mr-2 text-[#00000f]">
            Schedules per page:
          </label>
          <select
            id="schedulesPerPage"
            value={schedulesPerPage}
            onChange={(e) => {
              setSchedulesPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 border rounded text-[#00000f]"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
          </select>
        </div>

        <div className="flex space-x-2 items-center">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className={`px-2 py-1 rounded ${
              currentPage === 1
                ? "bg-gray-200 cursor-not-allowed text-gray-400"
                : "bg-gray-300 hover:bg-gray-400 text-[#00000f]"
            }`}
          >
            Previous
          </button>
          <span className="mx-2 text-[#00000f]">
            Page {currentPage} of{" "}
            {Math.ceil(Object.values(filteredBookings).flat().length / schedulesPerPage) || 1}
          </span>
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={indexOfLastSchedule >= Object.values(filteredBookings).flat().length}
            className={`px-2 py-1 rounded ${
              indexOfLastSchedule >= Object.values(filteredBookings).flat().length
                ? "bg-gray-200 cursor-not-allowed text-gray-400"
                : "bg-gray-300 hover:bg-gray-400 text-[#00000f]"
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Inline component ----
function TeacherSelect({
  value,
  bookingId,
  skill,
  onChange,
  feedbackSaved,
  tooltipText,
  disabled = false,
}: {
  value: string;
  bookingId: string;
  skill: "L" | "W" | "R" | "S";
  onChange: (bookingId: string, skill: "L" | "W" | "R" | "S", newTeacher: string) => void;
  feedbackSaved?: boolean;
  tooltipText?: string;
  disabled?: boolean;
}) {
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
    Rahul: "rahul1921@cseku.ac.bd",
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
    Rahul: "bg-gray-600 text-white",
  };
  const getTeacherBgClass = (val: string) => teacherColorMap[val] || "bg-white text-black";

  return (
    <div className="relative w-full">
      <select
        value={value || ""}
        onChange={(e) => onChange(bookingId, skill, e.target.value)}
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
}

/* ---------- tiny utilities ---------- */
function pLimit(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  const next = () => {
    active--;
    if (queue.length) queue.shift()?.();
  };
  return function <T>(fn: () => Promise<T>) {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        active++;
        fn()
          .then((v) => {
            resolve(v);
            next();
          })
          .catch((e) => {
            reject(e);
            next();
          });
      };
      active < concurrency ? run() : queue.push(run);
    });
  };
}

// Debounce any value updates (used for current visible rows)
function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/**
 * Cached GET helper with in-flight de-dupe.
 * - Caches successful responses for TTL.
 * - Coalesces concurrent identical requests.
 * - Never auto-aborts (prevents "huge calling + canceled" churn).
 */
const __dataCache = new Map<string, { ts: number; data: any }>();
const __inflight = new Map<string, Promise<any>>();
async function cachedGet(url: string, opts?: { ttl?: number }): Promise<any> {
  const ttl = opts?.ttl ?? 120_000; // default 2 minutes
  const now = Date.now();

  const hit = __dataCache.get(url);
  if (hit && now - hit.ts < ttl) return hit.data;

  const pending = __inflight.get(url);
  if (pending) return pending;

  const p = axios
    .get(url)
    .then((res) => {
      __dataCache.set(url, { ts: Date.now(), data: res.data });
      return res.data;
    })
    .catch((e) => {
      // Do not cache failures
      throw e;
    })
    .finally(() => {
      __inflight.delete(url);
    });

  __inflight.set(url, p);
  return p;
}

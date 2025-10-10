"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { AiOutlineEllipsis } from "react-icons/ai";
import React from "react";
import toast from "react-hot-toast";
import Head from "next/head"; // ✅ Fix preload warning

interface Booking {
  _id: string;
  bookingDate: string;
  startTime: string;
  testTime?: string;
  status: string;
  attendance?: string;
  name?: string;
  testType?: string;
  testSystem?: string;
  location?: string;
}

const Table = ({ userId }: { userId: string }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<Record<string, number> | null>(null);
  const [selectedBookingName, setSelectedBookingName] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await axios.get(`https://luminedge-server.vercel.app/api/v1/user/bookings/${userId}`);
        setBookings(response.data.bookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
    };

    fetchBookings();
  }, [userId]);

  // ---------- DATE-ONLY SORT HELPERS (minimal change) ----------
  const monthIndex: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
    may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8,
    september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
  };

  const parseDayMs = (s: string): number => {
    if (!s) return Number.POSITIVE_INFINITY;

    // 1) YYYY-MM-DD or YYYY/MM/DD
    const m1 = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (m1) {
      const y = +m1[1], m = +m1[2], d = +m1[3];
      const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
      return isNaN(dt.getTime()) ? Number.POSITIVE_INFINITY : dt.getTime();
    }

    // 2) "DD Month, YYYY" or "DD Month YYYY"
    const m2 = s.match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})$/);
    if (m2) {
      const d = +m2[1];
      const mon = monthIndex[m2[2].toLowerCase()];
      const y = +m2[3];
      if (Number.isInteger(mon)) {
        const dt = new Date(y, mon as number, d, 0, 0, 0, 0);
        return isNaN(dt.getTime()) ? Number.POSITIVE_INFINITY : dt.getTime();
      }
    }

    // 3) Fallback
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) {
      dt.setHours(0, 0, 0, 0);
      return dt.getTime();
    }
    return Number.POSITIVE_INFINITY;
  };

  const minutesWithinDay = (b: Booking) => {
    const t = b.location === "Home" ? b.testTime : b.startTime;
    const m = t?.match(/^(\d{1,2}):(\d{2})$/);
    return m ? (+m[1]) * 60 + (+m[2]) : 0;
  };

  const sortedBookings = React.useMemo(() => {
    return [...bookings].sort((a, b) => {
      const d = parseDayMs(a.bookingDate) - parseDayMs(b.bookingDate); // Exam Date ASC
      if (d !== 0) return d;
      const t = minutesWithinDay(a) - minutesWithinDay(b);             // tie by time
      if (t !== 0) return t;
      return a._id.localeCompare(b._id);                                // stable
    });
  }, [bookings]);
  // -------------------------------------------------------------

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString("en-US", { month: "long" });
    const year = date.getFullYear();
    return `${day} ${month}, ${year}`;
  };

  const isPast24Hours = (bookingDate: string, time: string | undefined): boolean => {
    if (!time) return false;
    const bookingDateTime = new Date(`${bookingDate}T${time}`);
    return bookingDateTime.getTime() - new Date().getTime() >= 24 * 60 * 60 * 1000;
  };

  const formatTime = (timeString?: string): string => {
    if (!timeString) return "N/A";
    const [hourStr, minuteStr] = timeString.split(":");
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
    if (isNaN(hour) || isNaN(minute)) return "Invalid Time";
    const date = new Date();
    date.setHours(hour, minute);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const handleViewResult = async (bookingId: string, bookingName: string) => {
    try {
      const response = await axios.get(`https://luminedge-server.vercel.app/api/v1/user/bookings/result/${bookingId}`);
      const result = response.data?.result;

      if (result && Object.keys(result).length > 0) {
        setSelectedResult(result);
        setSelectedBookingName(bookingName);
        setShowResultModal(true);
      } else {
        toast.error("No result found for this booking.");
      }
    } catch (error) {
      console.error("Error fetching result data:", error);
      toast.error("Failed to fetch result data.");
    }
  };

  return (
    <>
      <Head>
        <link rel="preload" href="/_next/static/css/app/layout.css" as="style" />
        <link rel="stylesheet" href="/_next/static/css/app/layout.css" />
      </Head>

      <table className="table">
        <thead>
          <tr className="text-[#00000f] bg-[#face39] font-bold">
            <th>#</th>
            <th>Name</th>
            <th>Test Type</th>
            <th>Test System</th>
            <th>Exam Date</th>
            <th>Start Time</th>
            <th>Location</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody className="text-[#00000f] bg-white">
          {sortedBookings.map((booking, index) => (
            <tr key={booking._id}>
              <td>{index + 1}</td>
              <td>{booking.name}</td>
              <td>{booking.testType}</td>
              <td>{booking.testSystem || "N/A"}</td>
              <td>{formatDate(booking.bookingDate)}</td>
              <td>
                {booking.location === "Home"
                  ? formatTime(booking.testTime)
                  : formatTime(booking.startTime)}
              </td>
              <td>{booking.location}</td>
              <td>{booking.status}</td>
              <td>
                <button
                  onClick={() => {
                    const timeToCompare = booking.location === "Home" ? booking.testTime : booking.startTime;
                    if (booking.status === "pending" && timeToCompare && isPast24Hours(booking.bookingDate, timeToCompare)) {
                      router.push(`/dashboard/${booking._id}`);
                    } else {
                      router.push("/dashboard/contact1");
                    }
                  }}
                  disabled={
                    !(
                      booking.status === "pending" &&
                      (booking.location === "Home" ? booking.testTime : booking.startTime) &&
                      isPast24Hours(
                        booking.bookingDate,
                        booking.location === "Home" ? booking.testTime : booking.startTime
                      )
                    )
                  }
                  className={`px-4 py-2 font-bold rounded ${
                    booking.status === "pending" &&
                    (booking.location === "Home" ? booking.testTime : booking.startTime) &&
                    isPast24Hours(
                      booking.bookingDate,
                      booking.location === "Home" ? booking.testTime : booking.startTime
                    )
                      ? "text-black hover:bg-white-700"
                      : "text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <AiOutlineEllipsis />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showResultModal && selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
            <h2 className="text-xl font-bold text-[#00000f] mb-4">
              {selectedBookingName} Result
            </h2>
            <ul className="space-y-2 text-[#00000f]">
              {Object.entries(selectedResult).map(([key, value]) => (
                <li key={key} className="flex justify-between border-b pb-1">
                  <span>{key}</span>
                  <span className="font-semibold">{value ?? "N/A"}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowResultModal(false)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Table;

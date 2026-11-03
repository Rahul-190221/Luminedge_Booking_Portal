"use client";

import http from "@/lib/http";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/config";
import { useState, useEffect } from "react";
import { AiOutlineEllipsis } from "react-icons/ai";
import React from "react";
import toast from "react-hot-toast";
import {
  formatDhakaExamDate,
  formatExamTime,
  isEligibleForReschedule,
} from "@/lib/dateUtils";

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

// ---------- DATE-ONLY SORT HELPERS ----------
const monthIndex: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8,
  september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

const parseDayMs = (s: string): number => {
  if (!s) return Number.POSITIVE_INFINITY;
  const m1 = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m1) {
    const dt = new Date(+m1[1], +m1[2] - 1, +m1[3], 0, 0, 0, 0);
    return isNaN(dt.getTime()) ? Number.POSITIVE_INFINITY : dt.getTime();
  }
  const m2 = s.match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})$/);
  if (m2) {
    const mon = monthIndex[m2[2].toLowerCase()];
    if (Number.isInteger(mon)) {
      const dt = new Date(+m2[3], mon, +m2[1], 0, 0, 0, 0);
      return isNaN(dt.getTime()) ? Number.POSITIVE_INFINITY : dt.getTime();
    }
  }
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) { dt.setHours(0, 0, 0, 0); return dt.getTime(); }
  return Number.POSITIVE_INFINITY;
};

const minutesWithinDay = (b: Booking) => {
  const t = b.location === "Home" ? b.testTime : b.startTime;
  const m = t?.match(/^(\d{1,2}):(\d{2})$/);
  return m ? (+m[1]) * 60 + (+m[2]) : 0;
};

const Table = ({ userId }: { userId: string }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<Record<string, number> | null>(null);
  const [selectedBookingName, setSelectedBookingName] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await http.get(`${API_BASE}/api/v1/user/bookings/${userId}`);
        setBookings(response.data.bookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
    };

    fetchBookings();
  }, [userId]);

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
    return formatDhakaExamDate(dateString);
  };

  const isPast24Hours = (bookingDate: string, time: string | undefined): boolean => {
    return isEligibleForReschedule(bookingDate, time);
  };

  const checkEligibility = (booking: Booking): { isEligible: boolean; reason: string } => {
    const status = (booking.status || "").toLowerCase().trim();
    if (status === "cancelled") {
      return { isEligible: false, reason: "Cancelled" };
    }
    if (status === "completed") {
      return { isEligible: false, reason: "Completed" };
    }
    if (status !== "pending") {
      return { isEligible: false, reason: "Unavailable" };
    }
    if (booking.attendance && /^\s*(present|absent)\s*$/i.test(booking.attendance)) {
      return { isEligible: false, reason: "Attended" };
    }

    const examTime = booking.location === "Home" ? booking.testTime : booking.startTime;
    const hasEnoughNotice = isEligibleForReschedule(booking.bookingDate, examTime);
    if (!hasEnoughNotice) {
      return { isEligible: false, reason: "Closed (< 24h)" };
    }

    return { isEligible: true, reason: "" };
  };

  const formatTime = (timeString?: string): string => {
    return formatExamTime(timeString);
  };

  const handleViewResult = async (bookingId: string, bookingName: string) => {
    try {
      const response = await http.get(`${API_BASE}/api/v1/user/bookings/result/${bookingId}`);
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
              <td className="whitespace-nowrap">
                <div className="flex items-center space-x-2">
                  {(() => {
                    const { isEligible, reason } = checkEligibility(booking);
                    return isEligible ? (
                      <button
                        type="button"
                        aria-label={`Reschedule booking ${booking._id}`}
                        onClick={() => router.push(`/dashboard/reschedule/${booking._id}`)}
                        className="px-3 py-1 bg-[#face39] hover:bg-[#e5a812] text-black font-semibold rounded text-xs transition-colors cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-[#face39]"
                      >
                        Reschedule
                      </button>
                    ) : (
                      <span
                        title={`Rescheduling unavailable: ${reason}`}
                        aria-label={`Rescheduling unavailable: ${reason}`}
                        className="px-2 py-1 bg-gray-100 text-gray-400 font-medium rounded text-xs cursor-not-allowed border border-gray-200 select-none inline-block"
                      >
                        {reason}
                      </span>
                    );
                  })()}
                  <button
                    type="button"
                    aria-label="View booking details"
                    onClick={() => {
                      // Booking details remain accessible independently of rescheduling eligibility
                      router.push(`/dashboard/${booking._id}`);
                    }}
                    title="View booking details"
                    className="p-1.5 font-bold rounded text-black hover:bg-yellow-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-400 inline-flex items-center"
                  >
                    <AiOutlineEllipsis className="text-xl" />
                  </button>
                </div>
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

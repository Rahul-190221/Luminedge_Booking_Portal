import axios from "axios";
import { useState, useEffect, useMemo } from "react";

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

const UserTable = ({ userId }: { userId: string }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    // Fetch bookings when the component mounts
    const fetchBookings = async () => {
      try {
        const response = await axios.get(
          `https://luminedge-server.vercel.app/api/v1/user/bookings/${userId}`
        );
        console.log("Bookings:", response.data.bookings);
        setBookings(response.data.bookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
    };

    fetchBookings();
  }, [userId]);

  // ---- DATE HELPERS (only for sorting/formatting) -----------------

  // Correctly format date to '19 December, 2024'
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString("en-US", { month: "long" });
    const year = date.getFullYear();
    return `${day} ${month}, ${year}`; // ⬅️ space after comma
  };

  // Parse day (local midnight) for robust ascending sort
  const parseDayMs = (s: string): number => {
    if (!s) return Number.POSITIVE_INFINITY;
    // Prefer YYYY-MM-DD
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      const y = +m[1], mo = +m[2], d = +m[3];
      const dt = new Date(y, mo - 1, d, 0, 0, 0, 0);
      return isNaN(dt.getTime()) ? Number.POSITIVE_INFINITY : dt.getTime();
    }
    // Fallback
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) {
      dt.setHours(0, 0, 0, 0);
      return dt.getTime();
    }
    return Number.POSITIVE_INFINITY;
  };

  // Use time within day as a tie-breaker for same Exam Date
  const minutesWithinDay = (b: Booking) => {
    const t = b.location === "Home" ? b.testTime : b.startTime;
    const m = t?.match(/^(\d{1,2}):(\d{2})$/);
    return m ? (+m[1]) * 60 + (+m[2]) : 0;
  };

  // Sorted view: Exam Date ASC → Time ASC → _id ASC (stable)
  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      const d = parseDayMs(a.bookingDate) - parseDayMs(b.bookingDate);
      if (d !== 0) return d;
      const t = minutesWithinDay(a) - minutesWithinDay(b);
      if (t !== 0) return t;
      return a._id.localeCompare(b._id);
    });
  }, [bookings]);

  // ---- TIME DISPLAY (unchanged logic) ----------------------------
  const formatTime = (timeString?: string): string => {
    if (!timeString) return "N/A";
    const timeParts = timeString.split(":");
    if (timeParts.length < 2) return "Invalid Time";
    const [hour, minute] = timeParts.map(Number);
    if (isNaN(hour) || isNaN(minute)) return "Invalid Time";
    const date = new Date();
    date.setHours(hour, minute);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  };

  return (
    <table className="table">
      {/* head */}
      <thead>
        <tr className="text-[#00000f] bg-[#face39] font-bold">
          <th></th>
          <th>Name</th>
          <th>Test Type</th>
          <th>Test System</th>
          <th>Exam Date</th>
          <th>Start Time</th>
          <th>Location</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody className="text-[#00000f] bg-white">
        {/* Row mapping */}
        {sortedBookings.map((booking: Booking, index: number) => (
          <tr key={booking._id}>
            <td>{index + 1}</td>
            <td>{booking.name}</td>
            <td>{booking.testType}</td>
            <td>{booking.testSystem || "N/A"}</td>
            <td>{formatDate(booking.bookingDate)}</td>
            <td>
              {booking.location === "Home"
                ? booking.testTime
                  ? formatTime(booking.testTime) // ✅ Use testTime for Home
                  : "N/A"
                : booking.startTime
                ? formatTime(booking.startTime)  // ✅ Use startTime for Test Center
                : "N/A"}
            </td>
            <td>{booking.location}</td>
            <td>{booking.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default UserTable;

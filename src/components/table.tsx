import axios from "axios";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { AiOutlineEllipsis } from "react-icons/ai";

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
  const router = useRouter();

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

  // Correctly format date to '19 December, 2024'
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);

    const day = date.getDate();
    const month = date.toLocaleString("en-US", { month: "long" });
    const year = date.getFullYear();

    return `${day} ${month},${year}`;
  };

  // Check if the booking is past 24 hours
  const isPast24Hours = (bookingDate: string, time: string | undefined): boolean => {
    if (!time) return false; // If there's no time (null/undefined), return false
  
    const bookingDateTime = new Date(`${bookingDate}T${time}`);
    const currentTime = new Date();
    const timeDifference = bookingDateTime.getTime() - currentTime.getTime();
  
    return timeDifference >= 24 * 60 * 60 * 1000; // ✅ True if at least 24 hours away
  };
  
  
    const formatTime = (timeString?: string): string => {
      if (!timeString) return "N/A"; // Return "N/A" if timeString is undefined or null
    
      const timeParts = timeString.split(":");
      if (timeParts.length < 2) return "Invalid Time"; // Ensure valid time format
    
      const [hour, minute] = timeParts.map(Number);
      if (isNaN(hour) || isNaN(minute)) return "Invalid Time"; // Check for NaN values
    
      const date = new Date();
      date.setHours(hour, minute);
    
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
    };
    

  return (
    <table className="table">
      {/* head */}
      <thead>
         <tr className="text-[#00000f] font-bold">
          <th></th>
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
      <tbody>
        {/* Row mapping */}
        {bookings.map((booking: Booking, index: number) => (
          <tr  key={booking._id}>
            <td>{index + 1}</td>
            <td>{booking.name}</td>
            <td>{booking.testType}</td>
            <td>{booking.testSystem || "N/A"}</td>
            <td>{formatDate(booking.bookingDate)}</td>
            <td>
  {booking.location === "Home"
    ? booking.testTime
      ? formatTime(booking.testTime)  // ✅ Use testTime for Home
      : "N/A"
    : booking.startTime
    ? formatTime(booking.startTime)   // ✅ Use startTime for Test Center
    : "N/A"}
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
        router.push('/dashboard/contact1');
      }
    }}
    disabled={
      !(booking.status === "pending" &&
        (booking.location === "Home" ? booking.testTime : booking.startTime) &&
        isPast24Hours(booking.bookingDate, booking.location === "Home" ? booking.testTime : booking.startTime))
    }
    className={`px-4 py-2 font-bold rounded ${
      booking.status === "pending" &&
      (booking.location === "Home" ? booking.testTime : booking.startTime) &&
      isPast24Hours(booking.bookingDate, booking.location === "Home" ? booking.testTime : booking.startTime)
        ? " text-black hover:bg-white-700"
        : " text-gray-500 cursor-not-allowed"
    }`}
  >
    <AiOutlineEllipsis />
  </button>
</td>

          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Table;

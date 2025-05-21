import axios from "axios";
import { useState, useEffect } from "react";

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

  // Correctly format date to '19 December, 2024'
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);

    const day = date.getDate();
    const month = date.toLocaleString("en-US", { month: "long" });
    const year = date.getFullYear();

    return `${day} ${month},${year}`;
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
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default UserTable;

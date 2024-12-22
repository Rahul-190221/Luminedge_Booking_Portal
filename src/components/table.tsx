import axios from "axios";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { AiOutlineEllipsis } from "react-icons/ai";

interface Booking {
  _id: string;
  bookingDate: string;
  startTime: string;
  status: string;
  attendance?: string;
  name?: string;
  testType?: string;
  testSystem?: string;
}

const Table = ({ userId }: { userId: string }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Fetch bookings when the component mounts
    const fetchBookings = async () => {
      try {
        const response = await axios.get(
          `https://luminedge-mock-test-booking-server.vercel.app/api/v1/user/bookings/${userId}`
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
    const isPast24Hours = (bookingDate: string, startTime: string): boolean => {
      const bookingDateTime = new Date(`${bookingDate}T${startTime}`);
      const currentTime = new Date();
      const timeDifference = bookingDateTime.getTime() - currentTime.getTime();
      return timeDifference <= 0 || timeDifference > 24 * 60 * 60 * 1000; // Check if it's past or more than 24 hours
    };
  
    // Format time to '12:30 PM'
    const formatTime = (timeString: string): string => {
      const [hour, minute] = timeString.split(":");
      const date = new Date();
      date.setHours(parseInt(hour, 10), parseInt(minute, 10));
      let formattedTime = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      return formattedTime;
    };

  return (
    <table className="table">
      {/* head */}
      <thead>
        <tr>
          <th></th>
          <th>Name</th>
          <th>Test Type</th>
          <th>Test System</th>
          <th>Exam Date</th>
          <th>Start Time</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {/* Row mapping */}
        {bookings.map((booking: Booking, index: number) => (
          <tr key={booking._id}>
            <td>{index + 1}</td>
            <td>{booking.name}</td>
            <td>{booking.testType}</td>
            <td>{booking.testSystem}</td>
            <td>{formatDate(booking.bookingDate)}</td>
            <td>{formatTime(booking.startTime)}</td>
            <td>{booking.status}</td>
            <td>
              <button
                onClick={() => {
                  if (
                    booking.status === "pending" &&
                    isPast24Hours(booking.bookingDate, booking.startTime)
                  ) {
                    router.push(`/dashboard/${booking._id}`);
                  } 
                else {
                router.push('/dashboard/contact1');
                }
                }}
                className="px-4 py-2 font-bold rounded text-gray-900 hover:bg-black hover:text-white"
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

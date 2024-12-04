"use client";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { AiOutlineEllipsis } from "react-icons/ai";

interface Booking {
  _id: string;
  bookingDate: string;
  startTime: string;
  status: string;
  attendance?: string;
  name?: string;
  testType?: string;
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

  const isPast24Hours = (bookingDate: string, startTime: string): boolean => {
    const bookingDateTime = new Date(`${bookingDate}T${startTime}`);
    const currentTime = new Date();
    const timeDifference = bookingDateTime.getTime() - currentTime.getTime();
    return timeDifference > 24 * 60 * 60 * 1000; // Check if it's more than 24 hours from now
  };

  return (
    <table className="table">
      {/* head */}
      <thead>
        <tr>
          <th></th>
          <th>Name</th>
          <th>Test Type</th>
          <th>Date</th>
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
            <td>{booking.bookingDate}</td>
            <td>{booking.startTime.slice(0, 5)}</td>
            <td>{booking.status}</td>

            <td>
              <button
                onClick={() => {
                  // Redirect to the contact details page for rescheduling
                  router.push(`/dashboard/${booking._id}`); // Use router.push for internal navigation
                }}
                className={`px-4 py-2 font-bold rounded ${
                  booking.status === "pending" &&
                  isPast24Hours(booking.bookingDate, booking.startTime)
                    ? "font-bold text-xl text-gray-900 hover:bg-black hover:text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
                disabled={
                  !(booking.status === "pending" && isPast24Hours(booking.bookingDate, booking.startTime))
                }
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

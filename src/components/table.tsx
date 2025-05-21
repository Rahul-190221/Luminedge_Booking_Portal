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
        <link
          rel="preload"
          href="/_next/static/css/app/layout.css"
          as="style"
        />
        <link
          rel="stylesheet"
          href="/_next/static/css/app/layout.css"
        />
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
          {bookings.map((booking, index) => (
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
                      isPast24Hours(booking.bookingDate, booking.location === "Home" ? booking.testTime : booking.startTime)
                    )
                  }
                  className={`px-4 py-2 font-bold rounded ${
                    booking.status === "pending" &&
                    (booking.location === "Home" ? booking.testTime : booking.startTime) &&
                    isPast24Hours(booking.bookingDate, booking.location === "Home" ? booking.testTime : booking.startTime)
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

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import GetMe from "@/app/helpers/getme"; // Adjust the path if necessary

const CoursesPage = ({ params }: { params: { contact: string } }) => {
  console.log("params: ",params);
  const user = GetMe(); // Fetch user data using GetMe
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  // Function to handle booking reschedule
  const onRescheduleBooking = async (userId: string) => {
    if (!userId) {
      toast.error("User ID not found.");
      return;
    }

    try {
      setIsProcessing(true);

      // Delete the current booking
      try {
        await axios.delete(
          `https://luminedge-mock-test-booking-server.vercel.app/api/v1/bookings/${params.contact}`
        );
        toast.success("Booking rescheduled successfully!");
// Redirect after successful operation
router.push("/dashboard");
} catch (error) {
  console.error("Error rescheduling booking:", error);
 
} finally {
  setIsProcessing(false);
}
        // Proceed with the rescheduling logic
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          toast.error("Booking not found. Please try again.");
        } else {
          toast.error("An unexpected error occurred. Please try again.");
        }
        console.error("Error deleting booking:", error);
      }

      // Add new booking or update booking logic
      const updatedBookingData = {
        userId,
        date: new Date().toISOString(), // Example: update to the current date
        // Add other necessary fields for booking here
      };

  //     await axios.post(
  //       `https://luminedge-mock-test-booking-server.vercel.app/api/v1/bookings`,
  //       updatedBookingData
  //     );

  //     toast.success("Booking rescheduled successfully!");

      
  };

  return (
    <div className="flex flex-col items-center w-full max-w-screen-xl mx-auto space-y-6 px-4 sm:px-8 md:px-12">
      {/* Header Section */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold">
          If you want to reschedule, contact us
        </h1>
      </div>

      {/* Contact Info Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {/* Address Card */}
        <div className="p-4 border rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-2">Address</h2>
          <p>
            Level 12, Gawsia Twin Peak, 743 Satmasjid Road, Dhanmondi, Dhaka,
            Bangladesh, 1205
          </p>
        </div>

        {/* Telephone Card */}
        <div className="p-4 border rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-2">Telephone</h2>
          <p>01400-403474</p>
          <p>01400-403475</p>
          <p>01400-403485</p>
          <p>01400-403493</p>
          <p>01400-403494</p>
        </div>

        {/* Email Card */}
        <div className="p-4 border rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-2">E-mail</h2>
          <p>info@luminedge.com.au</p>
        </div>
      </div>

      {/* Reschedule Button Section */}
      <button
        onClick={() => {
          if (!user?._id) {
            toast.error("User ID not found.");
            return;
          }

          toast((t) => (
            <div>
              <p className="mb-2">
                Are you sure you want to reschedule this booking?
              </p>
              <div className="flex justify-center space-x-2">
                <button
                  onClick={() => {
                    onRescheduleBooking(user._id); // Call reschedule function with user ID
                    toast.dismiss(t.id); // Dismiss the toast
                  }}
                  disabled={isProcessing}
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                >
                  {isProcessing ? "Processing..." : "Confirm"}
                </button>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          ));
        }}
        className="px-6 py-3 bg-[#FACE39] text-white font-semibold rounded-lg hover:bg-yellow-500 transition duration-200"
      >
        Reschedule
      </button>
    </div>
  );
};

export default CoursesPage;

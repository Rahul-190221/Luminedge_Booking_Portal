"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import GetMe from "@/app/helpers/getme"; // Adjust if necessary

const CoursesPage = ({ params }: { params: { contact: string } }) => {
  const user = GetMe();
  const { contact: bookingId } = params || {};
  const router = useRouter();
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
  }, []);


  const handleRescheduleClick = () => {
    toast((t) => (
      <div className="flex flex-col space-y-4 p-4 rounded-2xl font-[Montserrat] text-[#00000f] bg-white shadow-lg">
        <span className="font-bold text-lg text-center">
          Are you sure you want to reschedule?
        </span>
        <div className="flex justify-center gap-6">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              router.push(`/dashboard/mockType?oldBookingId=${bookingId}`);
            }}
            className="px-5 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold transition-all duration-200 shadow-md font-[Montserrat]"
          >
            Confirm
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold transition-all duration-200 shadow-md font-[Montserrat]"
          >
            Cancel
          </button>
        </div>
      </div>
    ), {
      duration: 5000,
      style: {
        background: "transparent",
        border: "none",
        padding: "0",
        boxShadow: "none",
        fontFamily: "Montserrat, sans-serif",
        color: "#00000f",
      },
    });
  };
  

  return (
    <div className="flex flex-col items-center w-full max-w-screen-xl mx-auto space-y-4 px-0 sm:px-0 md:px-0">
      {/* Test Details */}
      <div className="w-full max-w-5xl bg-transparent p-1 sm:p-4">
        <h1 className="text-2xl sm:text-3xl text-[#FACE39] text-center mb-1 sm:mb-3">
          Thank you for booking your mock test with Luminedge!
        </h1>
        {/* Your Mock Test Details */}
        <h2 className="text-xl sm:text-2xl font-semibold mb-0">Your Mock Test Details</h2>
        
        <ul className="list-disc list-inside ml-3 sm:ml-4">
          <li className="mb-1 sm:mb-1">
            <strong>Test Date and Time:</strong> Check the exact schedule of your mock test from the <span>&nbsp;</span>
            <a href="/dashboard" className="text-[#FACE39] underline text-lg">Dashboard</a>.
          </li>
          <li className="mb-1 sm:mb-1"><strong>Venue Information:</strong> Level 12, Gawsia Twin Peak, 743 Satmasjid Road, Dhanmondi 9/A, Dhaka-1205, Bangladesh.</li>
          <li className="mb-1 sm:mb-1"><strong>Required Documents:</strong> Ensure you have the correct identification (NID/ Passport) ready for test day.</li>
        </ul>
      
        <div className="text-left mt-2 sm:mt-2">
          <h2 className="text-lg sm:text-2xl font-semibold mb-0 sm:mb-0">Important Guidelines for Test Day</h2>
          <p className="mb-1 sm:mb-1">
            To ensure everything goes as planned, please follow these essential rules:
          </p>
          <ol className="list-decimal list-inside ml-1 sm:ml-1 space-y-1 sm:space-y-2">
            <li>
              <strong>Mandatory ID Presentation:</strong>
              <ul className="list-disc list-inside ml-3 sm:ml-4 mt-1 sm:mt-1">
                <li>
                  Bring a valid <span className="font-semibold">NID</span> or <span className="font-semibold">Passport</span> on the test day. Printed or digital photo of the document is acceptable.
                </li>
                <li>
                  The details on your ID must match the information provided during your mock test booking. Mismatched details may result in cancellation, and you will not be allowed to take the test.
                </li>
              </ul>
            </li>
            <li>
              <strong>Reporting Time:</strong>
              <ul className="list-disc list-inside ml-3 sm:ml-4 mt-1 sm:mt-1">
                <li>
                  Arrive at the Luminedge office at least 30 minutes before your scheduled mock test.
                </li>
                <li>
                  Being late or failing to appear will be treated as if the test has already been taken, and no refunds or rescheduling will be allowed.
                </li>
              </ul>
            </li>
          </ol>
        </div>
     {/* Mock Test Rescheduling Policy */}
<div className="text-left mt-2 sm:mt-2">
  <h2 className="text-lg sm:text-xl font-semibold mb-0 sm:mb-0">
    Mock Test Rescheduling Policy
  </h2>
  <p>If you need to reschedule your mock test, please note the following:</p>
  <ul className="list-disc list-inside ml-3 sm:ml-4">
    <li className="mb-1">
      You can reschedule your test up to <span className="font-semibold">24 hours before the scheduled date</span>, depending on the availability of your preferred new date.
    </li>
    <li className="mb-1">
      If your desired date is unavailable at the time of rescheduling, Luminedge will not be held responsible, and <span className="font-semibold">no refund requests will be entertained.</span>
    </li>
    <li className="mb-1">
      <span className="font-semibold">Rescheduling is not allowed within 24 hours of the test date.</span>
    </li>
    <li className="mb-1">
      If you fail to attend your test on the scheduled date, it will be considered as taken, and no rescheduling or refunds will be possible.
    </li>
  </ul>
  <div className="flex justify-center mt-4">
  <button
            onClick={handleRescheduleClick}
            className="px-5 py-3 bg-[#FACE39] text-[#00000f] font-semibold rounded-lg hover:bg-yellow-500 transition duration-200"
          >
            Reschedule
          </button>
      </div>
</div>
        {/* Key Reminders */}
        <div className="w-full max-w-5xl bg-transparent p-0 sm:p-0">
          <h2 className="text-xl sm:text-2xl font-semibold mb-0 sm:mb-0">Key Reminders</h2>
          <ul className="list-disc list-inside ml-3 sm:ml-3 space-y-2 sm:space-y-2">
            <li>Make sure the details you provided during booking (name, ID, etc.) match exactly with your identification documents.</li>
            <li>Arrive on time to avoid any issues. Failure to comply with the rules may result in automatic cancellation of your mock test.</li>
            <p>We’re excited to be a part of your test preparation and are here to support you every step of the way. If you have any questions or need assistance, feel free to contact our support team or visit the Luminedge office. Good luck with your mock test! Thank you once again for choosing Luminedge to help you achieve your goals.</p>
          </ul>
        </div>
        <p><strong>Good luck with your mock test! Thank you once again for choosing Luminedge to help you achieve your goals.</strong></p>
                   {/* Emergency Contact Information */}         
                   <div className="w-full max-w-5xl bg-transparent  p-2">
        <h1 className="text-xl font-semibold text-center" style={{ color: "#face39" }}>
          {isMobile ? "Emergency Contact Info" : "Emergency Contact Information:"}
        </h1>
        <p className="text-center mt-o mb-2">
          In case of any emergency or if you need to communicate with us regarding your mock test, please contact:
        </p>
        {/* Contact Info Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          <div className="p-3 border rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-0">Address</h2>
            <p>
              Level 12, Gawsia Twin Peak, 743 Satmasjid Road, Dhanmondi, Dhaka,
              Bangladesh, 1205
            </p>
          </div>

          <div className="p-3 border rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-0">Telephone</h2>
              <p>01400-403474</p>
              <p>01400-403475</p>
              <p>01400-403486</p>
              <p>01400-403487</p>
              <p> 01400-403493</p>
              <p>01400-403494</p>
            </div>

          <div className="p-3 border rounded-lg shadow-md">
            
          <h2 className="text-lg font-semibold mb-0">E-mail</h2>
              <p className="break-words">ielts.luminedge@gmail.com</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default CoursesPage;

"use client";
import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import axios from "axios";
import { MdOutlinePersonOutline } from "react-icons/md";
import { getUserIdFromToken, getUserIdOnlyFromToken } from "@/app/helpers/jwt";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";


type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];
type TimeSlot = {
  slotId: string;
  startTime: string; // e.g., "08:00:00"
  endTime: string; // e.g., "08:30:00"
  slot: number;
};

type Schedule = {
  _id: string; // Unique identifier for the schedule
  courseId: string; // ID of the course associated with this schedule
  name: string; // Name of the course
  startDate: string; // Start date in "YYYY-MM-DD" format
  endDate: string; // End date in "YYYY-MM-DD" format
  timeSlots: TimeSlot[]; // Array of time slots
  testSystem: string; // Type of test system, e.g., "Computer-Based"
  testType: string; // Type of test, e.g., "IELTS"
  status: string; // Status of the schedule, e.g., "Scheduled"
};

const BookingId = ({ params }: { params: { bookingId: string } }) => {
  const [value, onChange] = useState<Value>(new Date());
  const [testType, setTestType] = useState<string>("");
  const [testSystem, setTestSystem] = useState<string>("");
  const [scheduleData, setScheduleData] = useState<Schedule[]>([]);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<string | null>(null); // New state for user status
  const [userTestType, setUserTestType] = useState<string | null>(null); // New state for user test type
  const [userMockType, setUserMockType] = useState<string | null>(null); // New state for user mock type
  const [showTestSystemError, setShowTestSystemError] = useState<boolean>(false); // Error state

  const router = useRouter();

  const courses = [
    {
      _id: "67337c880794d577cd982b75",
      name: "IELTS",
      image: "https://i.ibb.co.com/MPBCMfb/ielts.webp",
    },
    {
      _id: "67337c880794d577cd982b76",
      name: "Pearson PTE",
      image: "https://i.ibb.co.com/4mrhCkN/pte.webp",
    },
    {
      _id: "67337c880794d577cd982b77",
      name: "GRE",
      image: "https://i.ibb.co.com/SX7t52h/gre.webp",
    },
    {
      _id: "67337c880794d577cd982b78",
      name: "TOFEL",
      image: "https://i.ibb.co.com/vjyL3QC/toefl.webp",
    },
  ];

  // Function to get course name by bookingId
  const getCourseNameByBookingId = (bookingId: string) => {
    const course = courses.find((course) => course._id === bookingId);

    return course ? course.name : "Unknown Course";
  };
  const courseName = getCourseNameByBookingId(params.bookingId);

  // Function to fetch schedule data based on selected date
  const fetchScheduleData = async (selectedDate: Date) => {
    try {
      const formattedDate = selectedDate.toLocaleDateString("en-CA");
      const response = await axios.get(
        `https://luminedge-mock-test-booking-server.vercel.app/api/v1/schedule/${formattedDate}/${params.bookingId}`
      );
      setScheduleData(response.data.schedules);
      console.log(response.data.schedules);
    } catch (error) {
      console.error("Error fetching schedule data:", error);
    }
  };

  // Fetch user status on component mount
  useEffect(() => {
    const fetchUserStatus = async () => {
      const id = getUserIdOnlyFromToken();
      setUserId(id);

      try {
        const response = await axios.get(
          `https://luminedge-mock-test-booking-server.vercel.app/api/v1/user/status/${id}`
        );
        const data = response.data;
        console.log(data.user.status); //undefined
        setUserStatus(data.user.status);
        setUserTestType(data.user.testType); // Set user test type
        setUserMockType(data.user.mockType); // Set user mock type
      } catch (error) {
        console.error("Error fetching user status:", error);
      }
    };

    fetchUserStatus();
  }, []);

  // Fetch schedule data when 'value' (selected date) changes
  useEffect(() => {
    if (value instanceof Date) {
      fetchScheduleData(value);
    }
  }, [value]);

  function handleSlotSelect(slotId: string,
    scheduleId: string,
    testType: string) {
    console.log(slotId, testType);
    setSelectedSlotId(slotId);
    setScheduleId(scheduleId);
    setTestType(testType);
  }const handleProceed = async () => {
    // Check if the test system is selected
    if (!testSystem) {
      setShowTestSystemError(true); // Show error message
      return;
    }
  
    // Hide error if test system is selected
    setShowTestSystemError(false);
  
    // Check if the user status is 'completed'
    if (userStatus !== "completed") {
      toast.error("Booking is only available for users with completed status.");
      return;
    }
  
    if (!selectedSlotId || !scheduleId) {
      toast.error("Please select a slot to proceed.");
      return;
    }
  
    try {
      // Find the selected schedule and slot details
      const selectedSchedule = scheduleData.find((schedule) => schedule._id === scheduleId);
      const selectedSlot = selectedSchedule?.timeSlots.find(
        (slot) => slot.slotId === selectedSlotId
      );
  
      if (!selectedSlot) {
        toast.error("Slot details could not be retrieved. Please try again.");
        return;
      }
  
      // Get slot start time and current time
      const slotStartDateTime = new Date(
        `${(value as Date).toLocaleDateString("en-CA")}T${selectedSlot.startTime}`
      );
      const currentDateTime = new Date();
  
      // Calculate the time difference in hours
      const timeDifferenceInHours = (slotStartDateTime.getTime() - currentDateTime.getTime()) / (1000 * 60 * 60);
  
      // Check if the slot's start time is less than 24 hours from now
      if (timeDifferenceInHours < 24) {
        toast.error("Bookings cannot be made less than 24 hours before.");
        return;
      }
  
      // Proceed with booking if all conditions are met
      console.log(selectedSlotId, userId, scheduleId, testType, testSystem);
      const response = await axios.post(
        `https://luminedge-mock-test-booking-server.vercel.app/api/v1/user/book-slot`,
        {
          slotId: selectedSlotId,
          userId,
          scheduleId,
          status: "pending",
          name: courseName,
          testType: testType,
          testSystem: testSystem,
        }
      );
  
      // Dismiss any existing toasts
      toast.dismiss();

      // Show the success message
      toast.success("New slot booked successfully!", {
        duration: 3000, // Auto-dismiss after 3 seconds
        position: "top-center", // Ensure it appears correctly on mobile devices
      });
      router.push(`/dashboard`);
    } catch (error: any) {
      console.error("Error booking slot:", error);
  
      const errorMessage = error.response?.data?.message || "An unexpected error occurred.";
  
      // Handle already booked tests with a specific message
      if (errorMessage.includes("already booked")) {
        toast.error("You already have booked a test for the selected date.");
      } else {
        toast.error(errorMessage);
      }
    }
  };
  

  // Determine if the dropdowns should be enabled
  const isDropdownEnabled = courseName === "IELTS";

  // Determine if the button should be enabled
  const isButtonEnabled = !!selectedSlotId;

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
  <div className="flex flex-col items-start justify-center my-4 xl:my-8">
    <h3 className="text-lg md:text-xl text-gray-800 font-semibold">
      Please Select Your{" "}
      <span className="bg-[#f7cb37] text-white font-bold text-xl shadow-lg px-2 py-1 rounded-lg">
        {courseName}
      </span>
    </h3>
    <h1 className="text-2xl md:text-3xl font-bold">Mock Test Date and Time</h1>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-28 mb-8">
    <div className="w-full flex flex-col items-start">
      <label htmlFor="testType">Test Type</label>
      <select
        className="select select-bordered bg-[#FACE39] text-black w-full"
        value={userTestType || " "}
        // onChange={(e) => setTestType(e.target.value)}
        disabled={!isDropdownEnabled} // Disable if course is not IELTS
      >
        <option value="Paper Based"> {userTestType || "Paper Based"}</option>
      </select>
    </div>

    <div className="w-full flex flex-col items-start">
      <label htmlFor="testSystem" className="block mb-2 font-medium">
        Test System
      </label>
      <select
        id="testSystem"
        className={`select select-bordered bg-[#FACE39] text-black w-full ${
          showTestSystemError ? "border-red-500" : ""
        }`}
        value={testSystem || ""}
        onChange={(e) => {
          setTestSystem(e.target.value);
          setShowTestSystemError(false); // Reset error on selection
        }}
      >
        <option value="" disabled>
          Select Test System
        </option>
        <option value="Academic">Academic</option>
        <option value="General Training">General Training</option>
      </select>
      {showTestSystemError && (
        <p className="text-red-500 text-sm mt-1">Test System is required.</p>
      )}
    </div>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mx-auto">
    {/* Calendar Component */}
    <Calendar onChange={onChange} value={value} />

    {/* Display fetched schedule data */}
    <div className="mt-8 w-full mx-auto">
      {scheduleData.length > 0 ? (
        <>
          {scheduleData
            .filter(
              (schedule) =>
                schedule.testType === userTestType &&
                schedule.name === userMockType // Filter schedules by user test type and mock type
            )
            .map((schedule, index) => (
              <div
                key={index}
                className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 rounded"
              >
                {schedule.timeSlots.map((slot, slotIndex) => (
                  <div
                    key={slotIndex}
                    className={`mt-2 pl-4 py-2 w-full rounded-lg ${
                      selectedSlotId === slot.slotId
                        ? "bg-yellow-300"
                        : "bg-gray-100"
                    } hover:bg-[#FACE39] cursor-pointer`}
                    onClick={() =>
                      handleSlotSelect(
                        slot.slotId,
                        schedule._id,
                        schedule.testType
                      )
                    }
                  >
                    <div className="grid grid-cols-2">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800">
                          {slot.startTime.slice(0, 5)}
                          <p className="text-xs text-gray-500">Start</p>
                        </h3>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800">
                          {slot.endTime.slice(0, 5)}
                          <p className="text-xs text-gray-500">End</p>
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 text-xs">
                      <MdOutlinePersonOutline />
                      <p className="text-gray-800 mr-8">Available Seats</p>
                      {slot.slot}
                    </div>
                    <h4 className="text-xs font-semibold mt-2">
                      Test Type :{" "}
                      <span className="text-red-500">{schedule.testType}</span>
                    </h4>
                  </div>
                ))}
              </div>
            ))}
        </>
      ) : (
        <p>No schedules available for this date.</p>
      )}
    </div>
  </div>

  <div className="w-full flex justify-end mt-4">
    <button
      className="btn bg-[#FACE39] text-black hover:bg-white hover:border-2 hover:border-[#FACE39] hover:text-black rounded-full px-8 shadow-lg"
      disabled={!isButtonEnabled} // Disable if no slot is selected
      onClick={handleProceed}
    >
      Proceed
    </button>
  </div>
</div>

  );
};

export default BookingId;

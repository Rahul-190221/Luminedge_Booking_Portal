"use client";
import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import axios from "axios";
import { MdOutlinePersonOutline } from "react-icons/md";
import { getUserIdOnlyFromToken } from "@/app/helpers/jwt";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import './calendarStyles.css'; // custom styles we'll define below
import { motion } from "framer-motion";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

type TimeSlot = {
  slotId: string;
  startTime: string; // e.g., "08:00:00"
  endTime: string;   // e.g., "08:30:00"
  slot: number;
};

type Schedule = {
  _id: string;       // Unique identifier for the schedule
  courseId: string;  // ID of the course associated with this schedule
  name: string;      // Name of the course
  startDate: string; // Start date in "YYYY-MM-DD" format
  endDate: string;   // End date in "YYYY-MM-DD" format
  timeSlots: TimeSlot[]; // Array of time slots
  testSystem: string;    // Type of test system, e.g., "Computer-Based"
  testType: string;      // Type of test, e.g., "IELTS"
  status: string;        // Status of the schedule, e.g., "Scheduled"
};

const BookingId = ({ params }: { params: { bookingId: string } }) => {
  // -------------------------------
  // State variables
  // -------------------------------
  const [value, onChange] = useState<Value>(new Date());
  const [testType, setTestType] = useState<string>("");
  const [testSystem, setTestSystem] = useState<string>("");
  const [scheduleData, setScheduleData] = useState<Schedule[]>([]);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  // User details
  const [userId, setUserId] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [userTestType, setUserTestType] = useState<string | null>(null);
  const [userMockType, setUserMockType] = useState<string | null>(null);

  // For Computer-Based tests, user must choose location
  const [selectedLocation, setSelectedLocation] = useState<string>("");

  // Router
  const router = useRouter();

  // -------------------------------
  // Courses data for ID -> name
  // -------------------------------
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
      name: "TOEFL",
      image: "https://i.ibb.co.com/vjyL3QC/toefl.webp",
    },
  ];

  // Helper to get course name from booking ID
  const getCourseNameByBookingId = (bookingId: string) => {
    const course = courses.find((course) => course._id === bookingId);
    return course ? course.name : "Unknown Course";
  };
  const courseName = getCourseNameByBookingId(params.bookingId);

  // -------------------------------
  // Dynamic Test System Mapping
  // -------------------------------
  const testSystemOptions: Record<string, string[]> = {
    IELTS: ["Academic", "General Training"],
    "Pearson PTE": ["AIWAS", "TCY"],
    TOEFL: ["TCY"],
    GRE: ["PowerPrep", "TCY"],
  };

  // Safely get the array of test systems for the current course
  const availableTestSystems = testSystemOptions[courseName] || [];

  // -------------------------------
  // Fetch schedule data
  // -------------------------------
  const fetchScheduleData = async (selectedDate: Date) => {
    try {
      const formattedDate = selectedDate.toLocaleDateString("en-CA");
      let response;

      // Check userTestType to decide which endpoint to call
      if (userTestType === "Computer-Based") {
        if (selectedLocation === "Home") {
          // Home schedule data
          response = await axios.get(
            `https://luminedge-server.vercel.app/api/v1/schedule/Home/${params.bookingId}`
          );
        } else if (selectedLocation === "Test Center") {
          // Test Center schedule data
          response = await axios.get(
            `https://luminedge-server.vercel.app/api/v1/schedule/${formattedDate}/${params.bookingId}`
          );
        }
      } else {
        // Paper Based or others
        response = await axios.get(
          `https://luminedge-server.vercel.app/api/v1/schedule/${formattedDate}/${params.bookingId}`
        );
      }

      setScheduleData(response?.data?.schedules || []);
    } catch (error) {
      console.error("Error fetching schedule data:", error);
    }
  };

  // -------------------------------
  // On mount: get user info
  // -------------------------------
  // useEffect(() => {
  //   const fetchUserStatus = async () => {
  //     const id = getUserIdOnlyFromToken();
  //     setUserId(id);

  //     try {
  //       const response = await axios.get(
  //         `https://luminedge-server.vercel.app/api/v1/user/status/${id}`
  //       );
  //       const data = response.data;
  //       setUserStatus(data.user.status);
  //       setUserTestType(data.user.testType); // e.g., "Computer-Based" or "Paper Based"
  //       setUserMockType(data.user.mockType);
  //     } catch (error) {
  //       console.error("Error fetching user status:", error);
  //     }
  //   };

  //   fetchUserStatus();
  // }, []);
  useEffect(() => {
    const fetchUserStatus = async () => {
      const id = getUserIdOnlyFromToken();
      setUserId(id);

      try {
        const response = await axios.get(
          `https://luminedge-server.vercel.app/api/v1/user/status/${id}`
        );
        const data = response.data;
        const mocks = data.user.mocks || [];

        // Set basic user status
        setUserStatus(data.user.status);

        // Find mock entry that matches the courseName (i.e., mockType)
        const matchingMock = mocks.find(
          (mock: { mockType: string }) => mock.mockType === courseName
        );

        if (matchingMock) {
          setUserMockType(matchingMock.mockType); // for UI
          setUserTestType(matchingMock.testType); // Paper/Computer Based
          setTestSystem(matchingMock.testSystem || "");
        } else if (data.user.mockType === courseName) {
          setUserMockType(data.user.mockType);
          setUserTestType(data.user.testType);
          setTestSystem(data.user.testSystem || "");
        } else {
          // No matching mock for the selected course
          setUserMockType("N/A");
          setUserTestType("N/A");
          setTestSystem("");
        }
      } catch (error) {
        console.error("Error fetching user status:", error);
      }
    };

    fetchUserStatus();
  }, [courseName]);



  // Removed duplicate declaration of 'value' and 'onChange'
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  const fetchAvailableDatesForMonth = async (year: number, month: number) => {
    try {
      const res = await axios.get("https://luminedge-server.vercel.app/api/v1/admin/get-schedules");
      const allSchedules = res.data;
      const today = new Date();

      const filtered = allSchedules.filter((schedule: any) => {
        const date = new Date(schedule.startDate);
        return (
          schedule.courseId === params.bookingId &&
          date.getFullYear() === year &&
          date.getMonth() === month &&
          date >= today
        );
      });

      const dates = filtered.map((s: any) =>
        new Date(s.startDate).toDateString()
      );

      setAvailableDates(dates);
    } catch (error) {
      console.error("Error fetching available dates", error);
    }
  };

  useEffect(() => {
    const now = new Date();
    fetchAvailableDatesForMonth(now.getFullYear(), now.getMonth());
  }, []);
  // -------------------------------
  // Re-fetch schedule data
  // whenever date, location, or testType changes
  // -------------------------------
  useEffect(() => {
    if (value instanceof Date) {
      if (userTestType === "Computer-Based") {
        if (selectedLocation) {
          fetchScheduleData(value);
        }
      } else {
        // Non-computer-based
        fetchScheduleData(value);
      }
    }
  }, [value, selectedLocation, userTestType]);

  // -------------------------------
  // Handle slot selection
  // -------------------------------
  function handleSlotSelect(slotId: string, scheduleId: string, testType: string) {
    setSelectedSlotId(slotId);
    setScheduleId(scheduleId);
    setTestType(testType);
  }

  // -------------------------------
  // Handle booking proceed
  // -------------------------------
  const handleProceed = async () => {
    // 1) Validate that a test system is selected (for ANY course)
    if (!testSystem) {
      toast.error("Please select a test system.");
      return;
    }

    // 2) Ensure location is selected for Computer-Based tests
    if (userTestType === "Computer-Based" && !selectedLocation) {
      toast.error("Please select a location (Home or Test Center).");
      return;
    }

    // 3) Ensure userId is present
    if (!userId) {
      toast.error("User ID is missing.");
      return;
    }

    // 4) Ensure user status is "completed"
    if (userStatus !== "completed") {
      toast.error("Booking is only available for users with completed status.");
      return;
    }

    // 5) Handle "Home" booking (requires date + test time)
    if (selectedLocation === "Home") {
      if (!(value instanceof Date)) {
        toast.error("Please select a booking date.");
        return;
      }
      if (!selectedSlotId) {
        toast.error("Please select a test time.");
        return;
      }

      try {
        await axios.post(`https://luminedge-server.vercel.app/api/v1/user/book-slot`, {
          userId,
          location: "Home",
          status: "pending",
          name: courseName,
          testType: userTestType || "Unknown",
          // for dynamic courses, always use whatever "testSystem" the user selected:
          testSystem,
          bookingDate: value.toLocaleDateString("en-CA"), // required for Home
          testTime: selectedSlotId, // Home booking uses "testTime"
        });

        toast.success("Home test booked successfully!");
        router.push(`/dashboard`);
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || "An unexpected error occurred.";
        toast.error(errorMessage);
      }
      return;
    }

    // 6) Handle "Test Center" booking (requires a valid slot)
    if (!selectedSlotId || !scheduleId) {
      toast.error("Please select a slot to proceed.");
      return;
    }

    try {
      const selectedSchedule = scheduleData.find((s) => s._id === scheduleId);
      const selectedSlot = selectedSchedule?.timeSlots.find(
        (slot) => slot.slotId === selectedSlotId
      );

      if (!selectedSlot) {
        toast.error("Slot details could not be retrieved. Please try again.");
        return;
      }

      const slotStartDateTime = new Date(
        `${(value as Date).toLocaleDateString("en-CA")}T${selectedSlot.startTime}`
      );
      const currentDateTime = new Date();
      const timeDifferenceInHours =
        (slotStartDateTime.getTime() - currentDateTime.getTime()) /
        (1000 * 60 * 60);

      if (timeDifferenceInHours < 24) {
        toast.error("Bookings cannot be made less than 24 hours before.");
        return;
      }

      await axios.post(`https://luminedge-server.vercel.app/api/v1/user/book-slot`, {
        userId,
        location: "Test Center",
        scheduleId,
        slotId: selectedSlotId, // required for Test Center
        status: "pending",
        name: courseName,
        testType,
        testSystem,
        bookingDate: (value as Date).toLocaleDateString("en-CA"),
      });

      toast.success("Test Center test booked successfully!");
      router.push(`/dashboard`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "An unexpected error occurred.";
      toast.error(
        errorMessage.includes("already booked")
          ? "You already have booked a test for the selected date."
          : errorMessage
      );
    }
  };

  // -------------------------------
  // Compute whether "Proceed" button is enabled
  // -------------------------------
  const isButtonEnabled =
    selectedLocation === "Home"
      ? value instanceof Date && !!selectedSlotId
      : !!selectedSlotId;

  // -------------------------------
  // Render
  // -------------------------------
  return (
    <div className="w-full max-w-5xl mx-auto px-0">
      {/* Title Section */}
<div className="w-full flex justify-center mt-[10px] lg:mt-16 text-[#00000f]">
  <motion.div
    className="flex flex-col text-center items-center gap-2"
    initial={{ opacity: 0, y: 40 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, ease: "easeOut" }}
  >
    <h2 className="text-lg md:text-xl lg:text-3xl  font-semibold text-[#00000f]">
      Please Select Your{" "}
      <span className="bg-[#f7cb37] text-[#00000f] font-bold text-lg md:text-xl lg:text-3xl px-2 py-1 rounded-lg">
        {courseName}
      </span>
    </h2>

    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#00000f]">
      Mock Test Date and Time
    </h1>

    <div className="h-[6px] w-24 bg-[#f7cb37] rounded-full mt-1 mb-3 animate-pulse" />
  </motion.div>
</div>

      {/* Test Type and Test System in a row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-8 w-full">
  {/* Test Type */}
  <div className="w-full flex flex-col items-start">
  <label htmlFor="testType" className="block mb-0 font-medium text-[#00000f]">
    Test Type
  </label>
  <select
    className="select select-bordered bg-[#FACE39] text-[#00000f] w-full"
    value={userTestType || " "}
    onChange={() => {
      /* no-op to remove warning; does nothing */
    }}
  >
    <option value="Paper Based">
      {userTestType || "Paper Based"}
    </option>
  </select>
</div>

        {/* Test System (Dynamic based on courseName) */}
      {/* Test System */}
{/* Test System */}
<div className="w-full flex flex-col items-start text-[#00000f]">
  <label htmlFor="testSystem" className="block mb-0 font-medium text-[#00000f]">
    Test System
  </label>

  {courseName === "IELTS" ? (
    // ✅ Editable dropdown for IELTS
    <select
      id="testSystem"
      className="select select-bordered bg-[#FACE39] text-black w-full"
      value={testSystem}
      onChange={(e) => setTestSystem(e.target.value)}
    >
      <option value="">Select Test System</option>
      {availableTestSystems.map((system) => (
        <option key={system} value={system}>
          {system}
        </option>
      ))}
    </select>
  ) : testSystem ? (
    // 🛑 Read-only if testSystem already fetched
    <select
      id="testSystem"
      className="select select-bordered bg-[#FACE39] text-black w-full"
      value={testSystem}
      onChange={() => {
        // No-op, read-only
      }}
    >
      <option value={testSystem}>{testSystem}</option>
    </select>
  ) : (
    // ✅ Editable dropdown if testSystem not fetched
    <select
      id="testSystem"
      className="select select-bordered bg-[#FACE39] text-black w-full"
      value={testSystem}
      onChange={(e) => setTestSystem(e.target.value)}
    >
      <option value="">Select Test System</option>
      {(availableTestSystems || []).map((system) => (
        <option key={system} value={system}>
          {system}
        </option>
      ))}
    </select>
  )}
</div>


      </div>

      {/* For Computer-Based tests, show location + optional test time for "Home" */}
      {userTestType === "Computer-Based" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-5 w-full">
          {/* Test Location */}
          <div className="w-full flex flex-col items-start">
            <label htmlFor="location" className="block mb-0 font-medium text-[#00000f]">
              Test Location
            </label>
            <select
              id="location"
              className="select select-bordered bg-[#FACE39] text-black w-full"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option value="" disabled>
                Select Location
              </option>
              <option value="Home">Home</option>
              <option value="Test Center">Test Center</option>
            </select>
          </div>

          {/* If "Home" is selected, let user choose a test time */}
          {selectedLocation === "Home" && (
            <div className="w-full flex flex-col items-start">
              <label htmlFor="testTime" className="block mb-0 font-medium">
                Test Time <span className="text-red-500">*</span>
              </label>
              <input
                id="testTime"
                type="time"
                className="input input-bordered bg-[#FACE39] text-black w-full"
                value={selectedSlotId || ""}
                onChange={(e) => setSelectedSlotId(e.target.value)}
                required
              />
              {!selectedSlotId && (
                <p className="text-red-500 text-sm mt-1">
                  Test Time is required.
                </p>
              )}
            </div>
          )}
        </div>
      )}

     {/* Calendar & Schedule (depends on location for Computer-Based) */}
{userTestType !== "Computer-Based" || (userTestType === "Computer-Based" && selectedLocation) ? (
  <div className="grid grid-cols-1 md:grid-cols-2 mt-4 gap-4 mx-auto">
    
    {/* Calendar Container */}
    <div className="w-full max-w-md mx-auto rounded-lg shadow border border-gray-200 p-4 bg-white">
      {/* Calendar */}
      <Calendar
        onChange={onChange}
        value={value}
        minDate={new Date()}
        onActiveStartDateChange={({ activeStartDate }) => {
          const d = activeStartDate as Date;
          fetchAvailableDatesForMonth(d.getFullYear(), d.getMonth());
        }}
        tileClassName={({ date, view }) => {
          if (view !== "month") return null;
        
          const dateStr = date.toDateString();
          const selectedStr = (value as Date).toDateString();
        
          if (dateStr === selectedStr) return "selected-date";
        
          // ✅ Now show available circle for both Paper-Based and Computer-Based
          if (availableDates.includes(dateStr)) return "available-date";
        
          return null;
        }}
        
      />

      {/* Legend - only for Test Center */}
      {userTestType === "Computer-Based" && selectedLocation === "Test Center" && (
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-[#FACE39] rounded-full"></div>
            <span>Available dates</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#FACE39] rounded-full"></div>
            <span>Selected date</span>
          </div>
        </div>
      )}
    </div>

    {/* Schedule Data */}
    <div className="mt-8 w-full mx-auto">
      {scheduleData.length > 0 ? (
        <>
          {scheduleData
            .filter(
              (schedule) =>
                schedule.testType === userTestType &&
                schedule.name === userMockType
            )
            .map((schedule) => (
              <div
                key={schedule._id}
                className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 rounded"
              >
                {schedule.timeSlots.map((slot) => (
                  <div
                    key={slot.slotId}
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
                      Test Type:{" "}
                      <span className="text-red-500">
                        {schedule.testType}
                      </span>
                    </h4>
                  </div>
                ))}
              </div>
            ))}
        </>
      ) : (
<p className="text-base font-medium" style={{ color: "#00000f" }}>
  {selectedLocation === "Home"
    ? "You can choose any date for home-based booking."
    : "No schedules available for this date."}
</p>

      )}
    </div>
  </div>
) : (
  <div className="my-4">
    <p className="text-lg font-semibold text-center">
      Please select a location to view available schedules.
    </p>
  </div>
)}

{/* Proceed Button */}
<div className="w-full flex justify-end mt-4">
  <button
    className="btn bg-[#FACE39] text-black hover:bg-white hover:border-2 hover:border-[#FACE39] hover:text-black rounded-full px-8 shadow-lg"
    disabled={!isButtonEnabled}
    onClick={handleProceed}
  >
    Proceed
  </button>
</div>

    </div>
  );
};

export default BookingId;

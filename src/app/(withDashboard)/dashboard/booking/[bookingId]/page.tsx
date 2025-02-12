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
  // State for the date picker
  const [value, onChange] = useState<Value>(new Date());
  // State for test type, test system, and schedule data
  const [testType, setTestType] = useState<string>("");
  const [testSystem, setTestSystem] = useState<string>("");
  const [scheduleData, setScheduleData] = useState<Schedule[]>([]);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  // State for user details
  const [userId, setUserId] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [userTestType, setUserTestType] = useState<string | null>(null);
  const [userMockType, setUserMockType] = useState<string | null>(null);
  // State for errors (e.g. test system error) if needed
  const [showTestSystemError, setShowTestSystemError] = useState<boolean>(false);
  // New state for the selected location (avoid naming it "location")
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  
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
      name: "TOEFL",
      image: "https://i.ibb.co.com/vjyL3QC/toefl.webp",
    },
  ];

  // Get course name from bookingId
  const getCourseNameByBookingId = (bookingId: string) => {
    const course = courses.find((course) => course._id === bookingId);
    return course ? course.name : "Unknown Course";
  };
  const courseName = getCourseNameByBookingId(params.bookingId);

  // Fetch schedule data based on selected date and location.
  // For Computer-Based tests, if a location is selected, we use different endpoints:
  // - For Home, we might fetch an endpoint that returns schedules for all days.
  // - For Test Center, we use the date to fetch the schedule.
  // For non-computer-based tests, we use the default endpoint.
  const fetchScheduleData = async (selectedDate: Date) => {
    try {
      let response;
      const formattedDate = selectedDate.toLocaleDateString("en-CA");
  
      if (userTestType === "Computer-Based") {
        if (selectedLocation === "Home") {
          // Fetch schedules for Home tests
          response = await axios.get(
            `https://luminedge-server.vercel.app/api/v1/schedule/Home/${params.bookingId}`
          );
        } else {
          // If "Test Center", treat it like the default Computer-Based schedule
          response = await axios.get(
            `https://luminedge-server.vercel.app/api/v1/schedule/${formattedDate}/${params.bookingId}`
          );
        }
      } else {
        // Fetch schedule normally for Paper-Based or other test types
        response = await axios.get(
          `https://luminedge-server.vercel.app/api/v1/schedule/${formattedDate}/${params.bookingId}`
        );
      }
  
      setScheduleData(response?.data?.schedules || []);
    } catch (error) {
      console.error("Error fetching schedule data:", error);
    }
  };
  
  // Fetch user status and test type on mount
  useEffect(() => {
    const fetchUserStatus = async () => {
      const id = getUserIdOnlyFromToken();
      setUserId(id);

      try {
        const response = await axios.get(
          `https://luminedge-server.vercel.app/api/v1/user/status/${id}`
        );
        const data = response.data;
        console.log("User status:", data.user.status);
        setUserStatus(data.user.status);
        setUserTestType(data.user.testType); // e.g., "Computer-Based" or "Paper Based"
        setUserMockType(data.user.mockType);
      } catch (error) {
        console.error("Error fetching user status:", error);
      }
    };

    fetchUserStatus();
  }, []);

  // Re-fetch schedule data when the selected date or location changes.
  useEffect(() => {
    if (value instanceof Date) {
      // For Computer-Based tests, ensure a location is chosen before fetching schedules.
      if (userTestType === "Computer-Based") {
        if (selectedLocation) {
          fetchScheduleData(value);
        }
      } else {
        fetchScheduleData(value);
      }
    }
  }, [value, selectedLocation, userTestType]);

  // Handle slot selection
  function handleSlotSelect(slotId: string, scheduleId: string, testType: string) {
    console.log("Selected slot:", slotId, testType);
    setSelectedSlotId(slotId);
    setScheduleId(scheduleId);
    setTestType(testType);
  }

  // Booking procedure (modified to include selectedLocation if Computer-Based)
  // const handleProceed = async () => {
  //   // Validate Test System only for IELTS
  //   if (courseName === "IELTS" && !testSystem) {
  //     toast.error("Please select a test system.");
  //     return;
  //   }

  //   // For Computer-Based tests, ensure a location is selected
  //   if (userTestType === "Computer-Based" && !selectedLocation) {
  //     toast.error("Please select a location (Home or Test Center).");
  //     return;
  //   }

  //   if (userStatus !== "completed") {
  //     toast.error("Booking is only available for users with completed status.");
  //     return;
  //   }

  //   if (!selectedSlotId || !scheduleId) {
  //     toast.error("Please select a slot to proceed.");
  //     return;
  //   }

  //   try {
  //     const selectedSchedule = scheduleData.find((s) => s._id === scheduleId);
  //     const selectedSlot = selectedSchedule?.timeSlots.find(
  //       (slot) => slot.slotId === selectedSlotId
  //     );

  //     if (!selectedSlot) {
  //       toast.error("Slot details could not be retrieved. Please try again.");
  //       return;
  //     }

  //     const slotStartDateTime = new Date(
  //       `${(value as Date).toLocaleDateString("en-CA")}T${selectedSlot.startTime}`
  //     );
  //     const currentDateTime = new Date();
  //     const timeDifferenceInHours =
  //       (slotStartDateTime.getTime() - currentDateTime.getTime()) / (1000 * 60 * 60);

  //     if (timeDifferenceInHours < 24) {
  //       toast.error("Bookings cannot be made less than 24 hours before.");
  //       return;
  //     }

  //     // Proceed with booking. For Computer-Based tests, include the selectedLocation.
  //     await axios.post(`https://luminedge-server.vercel.app/api/v1/user/book-slot`, {
  //       slotId: selectedSlotId,
  //       userId,
  //       scheduleId,
  //       status: "pending",
  //       name: courseName,
  //       testType,
  //       testSystem: courseName === "IELTS" ? testSystem : null,
  //       location: userTestType === "Computer-Based" ? selectedLocation : null,
  //     });

  //     toast.success("New slot booked successfully!");
  //     router.push(`/dashboard`);
  //   } catch (error: any) {
  //     const errorMessage =
  //       error.response?.data?.message || "An unexpected error occurred.";
  //     toast.error(
  //       errorMessage.includes("already booked")
  //         ? "You already have booked a test for the selected date."
  //         : errorMessage
  //     );
  //   }
  // };
  // const handleProceed = async () => {
  //   // Validate Test System only for IELTS
  //   if (courseName === "IELTS" && !testSystem) {
  //     toast.error("Please select a test system.");
  //     return;
  //   }
  
  //   // Ensure location is selected for Computer-Based tests
  //   if (userTestType === "Computer-Based" && !selectedLocation) {
  //     toast.error("Please select a location (Home or Test Center).");
  //     return;
  //   }
  
  //   if (userStatus !== "completed") {
  //     toast.error("Booking is only available for users with completed status.");
  //     return;
  //   }
  
  //   // 🟢 Home Booking: The selected date acts as the slot
  //   if (selectedLocation === "Home") {
  //     if (!(value instanceof Date)) {
  //       toast.error("Please select a date to proceed.");
  //       return;
  //     }
  
  //     try {
  //       await axios.post(`https://luminedge-server.vercel.app/api/v1/user/book-slot`, {
  //         userId,
  //         status: "pending",
  //         name: courseName,
  //         testType,
  //         testSystem: courseName === "IELTS" ? testSystem : null,
  //         location: "Home",
  //         bookingDate: value.toLocaleDateString("en-CA"), // Store selected date as slot
  //       });
  
  //       toast.success("Home test booked successfully!");
  //       router.push(`/dashboard`);
  //     } catch (error: any) {
  //       const errorMessage = error.response?.data?.message || "An unexpected error occurred.";
  //       toast.error(errorMessage);
  //     }
  //     return;
  //   }
  
  //   // 🟡 Test Center Booking Requires Slot Selection
  //   if (!selectedSlotId || !scheduleId) {
  //     toast.error("Please select a slot to proceed.");
  //     return;
  //   }
  
  //   try {
  //     const selectedSchedule = scheduleData.find((s) => s._id === scheduleId);
  //     const selectedSlot = selectedSchedule?.timeSlots.find(
  //       (slot) => slot.slotId === selectedSlotId
  //     );
  
  //     if (!selectedSlot) {
  //       toast.error("Slot details could not be retrieved. Please try again.");
  //       return;
  //     }
  
  //     const slotStartDateTime = new Date(
  //       `${(value as Date).toLocaleDateString("en-CA")}T${selectedSlot.startTime}`
  //     );
  //     const currentDateTime = new Date();
  //     const timeDifferenceInHours =
  //       (slotStartDateTime.getTime() - currentDateTime.getTime()) / (1000 * 60 * 60);
  
  //     if (timeDifferenceInHours < 24) {
  //       toast.error("Bookings cannot be made less than 24 hours before.");
  //       return;
  //     }
  
  //     await axios.post(`https://luminedge-server.vercel.app/api/v1/user/book-slot`, {
  //       slotId: selectedSlotId,
  //       userId,
  //       scheduleId,
  //       status: "pending",
  //       name: courseName,
  //       testType,
  //       testSystem: courseName === "IELTS" ? testSystem : null,
  //       location: "Test Center",
  //     });
  
  //     toast.success("Test Center test booked successfully!");
  //     router.push(`/dashboard`);
  //   } catch (error: any) {
  //     const errorMessage = error.response?.data?.message || "An unexpected error occurred.";
  //     toast.error(
  //       errorMessage.includes("already booked")
  //         ? "You already have booked a test for the selected date."
  //         : errorMessage
  //     );
  //   }
  // };
  
  // // Determine if the button should be enabled:
  // // - Home: Enabled when a date is selected
  // // - Test Center: Enabled only when a slot is selected
  // const isButtonEnabled = selectedLocation === "Home" ? value instanceof Date : !!selectedSlotId;
  
  const handleProceed = async () => {
    // Validate Test System only for IELTS
    if (courseName === "IELTS" && !testSystem) {
      toast.error("Please select a test system.");
      return;
    }
  
    // Ensure location is selected for Computer-Based tests
    if (userTestType === "Computer-Based" && !selectedLocation) {
      toast.error("Please select a location (Home or Test Center).");
      return;
    }
  
    if (!userId) {
      toast.error("User ID is missing.");
      return;
    }
  
    if (userStatus !== "completed") {
      toast.error("Booking is only available for users with completed status.");
      return;
    }
  
    // 🟢 Handling Home Booking (Requires Date & Time)
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
          testSystem: courseName === "IELTS" ? testSystem : "N/A",
          bookingDate: value.toLocaleDateString("en-CA"), // Required for Home
          testTime: selectedSlotId, // ✅ Home Booking: Test time, not slotId
        });
  
        toast.success("Home test booked successfully!");
        router.push(`/dashboard`);
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || "An unexpected error occurred.";
        toast.error(errorMessage);
      }
      return;
    }
  
    // 🟡 Handling Test Center Booking
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
        (slotStartDateTime.getTime() - currentDateTime.getTime()) / (1000 * 60 * 60);
  
      if (timeDifferenceInHours < 24) {
        toast.error("Bookings cannot be made less than 24 hours before.");
        return;
      }
  
      await axios.post(`https://luminedge-server.vercel.app/api/v1/user/book-slot`, {
        userId,
        location: "Test Center",
        scheduleId,
        slotId: selectedSlotId, // ✅ Test Center: slotId is required
        status: "pending",
        name: courseName,
        testType,
        testSystem: courseName === "IELTS" ? testSystem : null,
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
  
  // ✅ Updated: Button Enabled Logic
  const isButtonEnabled =
    selectedLocation === "Home"
      ? value instanceof Date && selectedSlotId // Ensure date & time are selected
      : !!selectedSlotId; // Ensure slot is selected for Test Center
  
  return (
    <div className="w-full max-w-5xl mx-auto px-0">
      <div className="flex flex-col items-start justify-center my-4 xl:my-8">
        <h3 className="text-lg md:text-xl text-gray-800 font-semibold">
          Please Select Your{" "}
          <span className="bg-[#f7cb37] text-white font-bold text-xl shadow-lg px-2 py-1 rounded-lg">
            {courseName}
          </span>
        </h3>
        <h1 className="text-2xl md:text-3xl font-bold">Mock Test Date and Time</h1>
      </div>

{/* Test Type and Test System in a row */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-8 w-full">
  {/* Test Type */}
  <div className="w-full flex flex-col items-start">
  <label htmlFor="testType" className="block mb-0 font-medium">
    Test Type</label>
    <select
      className="select select-bordered bg-[#FACE39] text-black w-full"
      value={userTestType || " "}
    >
      <option value="Paper Based">{userTestType || "Paper Based"}</option>
    </select>
  </div>

  {/* Render Test System dropdown only for IELTS */}
  {courseName === "IELTS" && (
    <div className="w-full flex flex-col items-start">
      <label htmlFor="testSystem" className="block mb-0 font-medium">
        Test System
      </label>
      <select
        id="testSystem"
        className="select select-bordered bg-[#FACE39] text-black w-full"
        value={testSystem || ""}
        onChange={(e) => setTestSystem(e.target.value)}
      >
        <option value="" disabled>
          Select Test System
        </option>
        <option value="Academic">Academic</option>
        <option value="General Training">General Training</option>
      </select>
    </div>
  )}
</div>

{/* Test Location and Test Time in a Row */}
{userTestType === "Computer-Based" && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-5 w-full">
    
    {/* Test Location */}
    <div className="w-full flex flex-col items-start">
      <label htmlFor="location" className="block mb-0 font-medium">
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

    {/* Test Time Input Field (Only Show if Home is Selected) */}
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
        {/* Show warning if test time is not selected */}
        {!selectedSlotId && (
          <p className="text-red-500 text-sm mt-1">Test Time is required.</p>
        )}
      </div>
    )}
  </div>
)}


      {/* Conditionally render the Calendar and Schedule Map:
          For Computer-Based tests, wait until a location is selected.
          For other test types, display immediately. */}
      {(userTestType !== "Computer-Based" || (userTestType === "Computer-Based" && selectedLocation)) ? (
        <div className="grid grid-cols-1 md:grid-cols-2  mt-4 gap-4 mx-auto">
          {/* Calendar Component */}
          <Calendar onChange={onChange} value={value} />
     
          {/* Display fetched schedule data */}
          <div className="mt-8 w-full mx-auto">
            {scheduleData.length > 0 ? (
              <>
                {scheduleData
                  // Optionally filter schedules (for example, by date) if needed.
                  .filter(
                    (schedule) =>
                      schedule.testType === userTestType &&
                      schedule.name === userMockType
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
                            handleSlotSelect(slot.slotId, schedule._id, schedule.testType)
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
      ) : (
        // If location is required but not yet selected for Computer-Based tests
        <div className="my-4">
          <p className="text-lg font-semibold text-center">
            Please select a location to view available schedules.
          </p>
        </div>
      )}

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

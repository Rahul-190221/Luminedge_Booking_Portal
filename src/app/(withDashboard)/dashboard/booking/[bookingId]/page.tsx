"use client";

import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import axios from "axios";
import { MdOutlinePersonOutline } from "react-icons/md";
import { getUserIdOnlyFromToken } from "@/app/helpers/jwt";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import "./calendarStyles.css";
import { motion } from "framer-motion";

// --- Types ---
type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

type TimeSlot = {
  slotId: string;
  startTime: string;
  endTime: string;
  slot: number;
};

type Schedule = {
  _id: string;
  courseId: string;
  name: string;
  startDate: string;
  endDate: string;
  timeSlots: TimeSlot[];
  testSystem: string;
  testType: string;
  status: string;
};

// --- Component ---
const BookingId = ({ params }: { params: { bookingId: string } }) => {
  const [value, onChange] = useState<Value>(new Date());
  const [testType, setTestType] = useState<string>("");
  const [testSystem, setTestSystem] = useState<string>("");
  const [scheduleData, setScheduleData] = useState<Schedule[]>([]);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [userTestType, setUserTestType] = useState<string | null>(null);
  const [userMockType, setUserMockType] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [userMocks, setUserMocks] = useState<{ mockType: string; mock: number; testType?: string }[]>([]);
const [existingBookings, setExistingBookings] = useState<any[]>([]);


  const router = useRouter();
  const searchParams = useSearchParams();
  const oldBookingId = searchParams.get("oldBookingId");

  const courses = [
    { _id: "67337c880794d577cd982b75", name: "IELTS" },
    { _id: "67337c880794d577cd982b76", name: "Pearson PTE" },
    { _id: "67337c880794d577cd982b77", name: "GRE" },
    { _id: "67337c880794d577cd982b78", name: "TOEFL" },
  ];

  const courseName = courses.find((c) => c._id === params.bookingId)?.name || "Unknown Course";

  const testSystemOptions: Record<string, string[]> = {
    IELTS: ["Academic", "General Training"],
    "Pearson PTE": ["AIWAS", "TCY"],
    TOEFL: ["TCY"],
    GRE: ["PowerPrep", "TCY"],
  };

  const availableTestSystems = testSystemOptions[courseName] || [];

  const fetchAvailableDatesForMonth = async (year: number, month: number) => {
    if (userTestType === "Computer-Based" && selectedLocation === "Home") {
      setAvailableDates([]);
      return;
    }
  
    try {
      const { data: allSchedules } = await axios.get("https://luminedge-server.vercel.app/api/v1/admin/get-schedules");
      const today = new Date();
  
      const filtered = allSchedules.filter((schedule: any) => {
        const date = new Date(schedule.startDate);
  
        if (
          schedule.courseId !== params.bookingId ||
          schedule.status !== "Scheduled" ||
          date.getFullYear() !== year ||
          date.getMonth() !== month ||
          date < today
        ) return false;
  
        if (courseName === "IELTS") {
          return userTestType === schedule.testType;
        }
  
        return userTestType === "Computer-Based" && selectedLocation === "Test Center" && schedule.testType === "Computer-Based";
      });
  
      const dates = filtered.map((s: any) => new Date(s.startDate).toDateString());
      setAvailableDates(dates);
    } catch (error) {
      console.error("Error fetching available dates", error);
    }
  };
  
  useEffect(() => {
    const fetchUserStatus = async () => {
      const id = getUserIdOnlyFromToken();
      setUserId(id);
  
      try {
        const res = await axios.get(`https://luminedge-server.vercel.app/api/v1/user/status/${id}`);
        const data = res.data;
        const mocks = data.user.mocks || [];
  
        setUserStatus(data.user.status);
        setUserMocks(mocks); // ✅ Save all mock limits for this user
  
        const matchingMock = mocks.find((mock: { mockType: string }) => mock.mockType === courseName);
  
        if (matchingMock) {
          setUserMockType(matchingMock.mockType);
          setUserTestType(matchingMock.testType);
          setTestSystem(matchingMock.testSystem || "");
        } else if (data.user.mockType === courseName) {
          setUserMockType(data.user.mockType);
          setUserTestType(data.user.testType);
          setTestSystem(data.user.testSystem || "");
        } else {
          setUserMockType("N/A");
          setUserTestType("N/A");
          setTestSystem("");
        }
  
        // ✅ Fetch user's current bookings to count per type
        const bookingsRes = await axios.get(`https://luminedge-server.vercel.app/api/v1/user/bookings/${id}`);
        const allBookings = bookingsRes.data.bookings || [];
        setExistingBookings(allBookings);
      } catch (error) {
        console.error("Error fetching user status or bookings", error);
      }
    };
  
    fetchUserStatus();
  }, [courseName]);
  
  useEffect(() => {
    const now = new Date();
    fetchAvailableDatesForMonth(now.getFullYear(), now.getMonth());
  }, [params.bookingId, selectedLocation, userTestType]);

  useEffect(() => {
    if (value instanceof Date) {
      if (userTestType === "Computer-Based" && selectedLocation) {
        fetchScheduleData(value);
      } else if (userTestType !== "Computer-Based") {
        fetchScheduleData(value);
      }
    }
  }, [value, selectedLocation, userTestType]);

  const fetchScheduleData = async (selectedDate: Date) => {
    try {
      const formattedDate = selectedDate.toLocaleDateString("en-CA");
      let response;

      if (userTestType === "Computer-Based") {
        if (selectedLocation === "Home") {
          response = await axios.get(`https://luminedge-server.vercel.app/api/v1/schedule/Home/${params.bookingId}`);
        } else if (selectedLocation === "Test Center") {
          response = await axios.get(`https://luminedge-server.vercel.app/api/v1/schedule/${formattedDate}/${params.bookingId}`);
        }
      } else {
        response = await axios.get(`https://luminedge-server.vercel.app/api/v1/schedule/${formattedDate}/${params.bookingId}`);
      }

      setScheduleData(response?.data?.schedules || []);
    } catch (error) {
      console.error("Error fetching schedule data:", error);
    }
  };

  const handleSlotSelect = (slotId: string, scheduleId: string, testType: string) => {
    setSelectedSlotId(slotId);
    setScheduleId(scheduleId);
    setTestType(testType);
  };
 
  const handleProceed = async () => {
    if (!testSystem) {
      toast.error("Please select a test system.");
      return;
    }
  
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
   // ✅ Prevent rescheduling with mismatched mock type
   if (oldBookingId) {
    const oldBooking = existingBookings.find((b) => b._id === oldBookingId);
    if (!oldBooking) {
      toast.error("Old booking not found.");
      return;
    }

    if (oldBooking.name !== courseName) {
      toast.error(`You can only reschedule your ${oldBooking.name} mock, not ${courseName}.`);
      return;
    }
  }
  // const currentMockType = courseName;

  // // ✅ Determine matching testType (needed for IELTS)
  // const matchTestType = userTestType;
  
  // // ✅ Allowed mocks logic
  // const allowedMock = userMocks
  //   .filter((m) => {
  //     if (currentMockType === "IELTS") {
  //       return m.mockType === "IELTS" && m.testType === matchTestType;
  //     }
  //     return m.mockType === currentMockType;
  //   })
  //   .reduce((total, m) => total + (m.mock || 0), 0);
  
  // // ✅ Booked mocks logic
  // const alreadyBookedCount = existingBookings.filter((b) => {
  //   if (currentMockType === "IELTS") {
  //     return b.name === "IELTS" && b.testType === matchTestType && b._id !== oldBookingId;
  //   }
  //   return b.name === currentMockType && b._id !== oldBookingId;
  // }).length;
  
  // // ✅ Limit enforcement
  // if (alreadyBookedCount >= allowedMock) {
  //   toast.error(`You have already used all ${allowedMock} mocks for ${currentMockType} (${matchTestType}).`);
  //   return;
  // }
  
  
    const bookingPayload: any = {
      userId,
      location: selectedLocation || "Test Center",
      status: "pending",
      name: courseName,
      testType: userTestType || "Unknown",
      testSystem,
      bookingDate: value instanceof Date ? value.toLocaleDateString("en-CA") : "",
    };
  
    const now = new Date();
  
    // --- Handle HOME booking ---
    if (selectedLocation === "Home") {
      if (!(value instanceof Date)) {
        toast.error("Please select a booking date.");
        return;
      }
  
      if (!selectedSlotId) {
        toast.error("Please select a test time.");
        return;
      }
  
      const selectedDateTime = new Date(`${value.toLocaleDateString("en-CA")}T${selectedSlotId}`);
      const timeDifferenceInHours = (selectedDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
      if (timeDifferenceInHours < 24) {
        toast.error("Bookings must be made at least 24 hours in advance for home test.");
        return;
      }
  
      try {
        await axios.post(`https://luminedge-server.vercel.app/api/v1/user/book-slot`, {
          ...bookingPayload,
          testTime: selectedSlotId,
        });
  
        if (oldBookingId) {
          await axios.delete(`https://luminedge-server.vercel.app/api/v1/bookings/${oldBookingId}`);
          toast.success("Rescheduled successfully! 🎯");
        } else {
          toast.success("Home test booked successfully! 🏡");
        }
  
        await new Promise((resolve) => setTimeout(resolve, 1200));
        router.push(`/dashboard`);
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || "An unexpected error occurred.";
  
        if (
          oldBookingId &&
          (errorMessage.includes("Insufficient mock tests") || errorMessage.includes("Insufficient mock"))
        ) {
          try {
            await axios.delete(`https://luminedge-server.vercel.app/api/v1/bookings/${oldBookingId}`);
            await axios.post(`https://luminedge-server.vercel.app/api/v1/user/book-slot`, {
              ...bookingPayload,
              testTime: selectedSlotId,
            });
  
            toast.success("Rescheduled successfully after adjusting mocks! 🎯");
            await new Promise((resolve) => setTimeout(resolve, 1200));
            router.push(`/dashboard`);
          } catch (secondError: any) {
            toast.error(secondError.response?.data?.message || "Error after retrying booking.");
          }
        } else {
          toast.error(errorMessage);
        }
      }
  
      return;
    }
  
    // --- Handle TEST CENTER booking ---
    if (!selectedSlotId || !scheduleId) {
      toast.error("Please select a valid slot to proceed.");
      return;
    }
  
    try {
      const selectedSchedule = scheduleData.find((s) => s._id === scheduleId);
      const selectedSlot = selectedSchedule?.timeSlots.find((slot) => slot.slotId === selectedSlotId);
  
      if (!selectedSlot) {
        toast.error("Slot details could not be retrieved.");
        return;
      }
  
      const slotStartDateTime = new Date(`${(value as Date).toLocaleDateString("en-CA")}T${selectedSlot.startTime}`);
      const timeDifferenceInHours = (slotStartDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
      if (timeDifferenceInHours < 24) {
        toast.error("Bookings cannot be made less than 24 hours before.");
        return;
      }
  
      await axios.post(`https://luminedge-server.vercel.app/api/v1/user/book-slot`, {
        ...bookingPayload,
        scheduleId,
        slotId: selectedSlotId,
      });
  
      if (oldBookingId) {
        await axios.delete(`https://luminedge-server.vercel.app/api/v1/bookings/${oldBookingId}`);
        toast.success("Rescheduled successfully! 🎯");
      } else {
        toast.success("Test Center booking successful! 🏢");
      }
  
      await new Promise((resolve) => setTimeout(resolve, 1200));
      router.push(`/dashboard`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "An unexpected error occurred.";
  
      if (
        oldBookingId &&
        (errorMessage.includes("Insufficient mock tests") || errorMessage.includes("Insufficient mock"))
      ) {
        try {
          await axios.delete(`https://luminedge-server.vercel.app/api/v1/bookings/${oldBookingId}`);
          await axios.post(`https://luminedge-server.vercel.app/api/v1/user/book-slot`, {
            ...bookingPayload,
            scheduleId,
            slotId: selectedSlotId,
          });
  
          toast.success("Rescheduled successfully after adjusting mocks! 🎯");
          await new Promise((resolve) => setTimeout(resolve, 1200));
          router.push(`/dashboard`);
        } catch (secondError: any) {
          toast.error(secondError.response?.data?.message || "Error after retrying booking.");
        }
      } else {
        toast.error(
          errorMessage.includes("already booked")
            ? "You already have booked a test for the selected date."
            : errorMessage
        );
      }
    }
  };
  
return (
  <div className="w-full max-w-5xl mx-auto px-0">
    {/* Title Section */}
    <div className="w-full flex justify-center mt-[8px] lg:mt-16 text-[#00000f]">
      <motion.div
        className="flex flex-col text-center items-center gap-2"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <h2 className="text-lg md:text-xl lg:text-3xl font-semibold text-[#00000f]">
          Please Select Your{" "}
          <span className="bg-[#f7cb37] text-[#00000f] font-bold text-lg md:text-xl lg:text-3xl px-2 py-1 rounded-lg">
            {courseName}
          </span>
        </h2>

        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#00000f]">
          Mock Test Date and Time
        </h1>

        <div className="h-[6px] w-24 bg-[#f7cb37] rounded-full mt-1 mb-2 animate-pulse" />
      </motion.div>
    </div>

    {/* Test Type and Test System Selection */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-4 w-full">
     {/* Test Type */}
     <div className="w-full flex flex-col items-start">
  <label htmlFor="testType" className="block mb-0 font-medium text-[#00000f]">
    Test Type
  </label>

  {courseName === "IELTS" ? (
    (() => {
      const userTestTypesForMock = userMocks
        .filter((m) => m.mockType === "IELTS")
        .map((m) => (m as any).testType || "N/A");
      const uniqueTestTypes = Array.from(new Set(userTestTypesForMock));

      if (uniqueTestTypes.length > 1) {
        // ✅ Editable when multiple options
        return (
          <select
            className="select select-bordered bg-[#FACE39] text-[#00000f] w-full"
            value={userTestType || ""}
            onChange={(e) => setUserTestType(e.target.value)}
          >
            <option value="">Select Test Type</option>
            {uniqueTestTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        );
      } else {
        // ✅ Visually same, not interactive (no disabled)
        return (
          <select
            className="select select-bordered bg-[#FACE39] text-[#00000f] w-full appearance-none pointer-events-none"
            value={userTestType || ""}
          >
            <option value={userTestType || ""}>{userTestType || "N/A"}</option>
          </select>
        );
      }
    })()
  ) : (
    // ✅ For non-IELTS: same design, non-editable, not disabled
    <select
      className="select select-bordered bg-[#FACE39] text-[#00000f] w-full appearance-none pointer-events-none"
      value={userTestType || ""}
    >
      <option value={userTestType || ""}>{userTestType || "N/A"}</option>
    </select>
  )}
</div>



      {/* Test System */}
      <div className="w-full flex flex-col items-start text-[#00000f]">
        <label htmlFor="testSystem" className="block mb-0 font-medium">
          Test System
        </label>

        {courseName === "IELTS" ? (
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
          <select
            id="testSystem"
            className="select select-bordered bg-[#FACE39] text-black w-full"
            value={testSystem}
            onChange={() => {}}
          >
            <option value={testSystem}>{testSystem}</option>
          </select>
        ) : (
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
        )}
      </div>
    </div>

    {/* Test Location (for Computer-Based) */}
    {userTestType === "Computer-Based" && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-4 w-full">
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
            <option value="" disabled>Select Location</option>
            <option value="Home">Home</option>
            <option value="Test Center">Test Center</option>
          </select>
        </div>

        {/* Test Time for Home */}
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

    {/* Calendar + Slot Selection */}
    {userTestType !== "Computer-Based" || (userTestType === "Computer-Based" && selectedLocation) ? (
      <div className="grid grid-cols-1 md:grid-cols-2 mt-4 gap-4 mx-auto">
        {/* Calendar */}
        <div className="w-full max-w-md mx-auto rounded-lg shadow border border-gray-200 p-4 bg-white">
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
              if (availableDates.includes(dateStr)) return "available-date";
              return null;
            }}
          />

          {/* Legend for Test Center */}
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

        {/* Slots */}
        <div className="mt-8 w-full mx-auto">
          {scheduleData.length > 0 ? (
            <>
              {scheduleData
                .filter(schedule => schedule.testType === userTestType && schedule.name === userMockType)
                .map(schedule => (
                  <div
                    key={schedule._id}
                    className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 rounded"
                  >
                    {schedule.timeSlots.map(slot => (
                      <div
                        key={slot.slotId}
                        className={`mt-2 pl-4 py-2 w-full rounded-lg ${
                          selectedSlotId === slot.slotId ? "bg-yellow-300" : "bg-gray-100"
                        } hover:bg-[#FACE39] cursor-pointer`}
                        onClick={() => handleSlotSelect(slot.slotId, schedule._id, schedule.testType)}
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
                          <span className="text-red-500">{schedule.testType}</span>
                        </h4>
                      </div>
                    ))}
                  </div>
                ))}
            </>
          ) : (
            <p className="text-base font-medium text-[#00000f]">
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
        disabled={!selectedSlotId}
        onClick={handleProceed}
        className="btn bg-[#FACE39] text-black hover:bg-white hover:border-2 hover:border-[#FACE39] hover:text-black rounded-full px-8 shadow-lg mt-4"
      >
        Proceed
      </button>
    </div>
  </div>
);

};

export default BookingId;

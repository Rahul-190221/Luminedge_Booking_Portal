"use client";
import { useState, useEffect } from "react";
import MultiDatePicker from "react-multi-date-picker";
import DateObject from "react-date-object";
import { getUserIdFromToken } from "@/app/helpers/jwt";
import { useRouter, usePathname } from "next/navigation";
import { createSchedules } from "@/app/utils/actions/createSchedules";
import { toast } from "react-hot-toast";

interface TimeSlot {
  startTime: string;
  endTime: string;
  slot: number;
  totalSlot: number;
}

export default function CreateSchedulePage() {
  const [formData, setFormData] = useState({
    courseId: "",
    dates: [] as DateObject[],
    timeSlots: {} as Record<string, TimeSlot[]>,
  });
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!getUserIdFromToken()) {
      router.push("/login");
    }
  }, [router]);

  const addTimeSlot = (date: string) => {
    setFormData((prev) => ({
      ...prev,
      timeSlots: {
        ...prev.timeSlots,
        [date]: [
          ...(prev.timeSlots[date] || []),
          { startTime: "09:00", endTime: "10:00", totalSlot: 20, slot: 20 }, // Default time slot values
        ],
      },
    }));
  };

  const handleTimeSlotChange = (
    date: string,
    index: number,
    field: keyof TimeSlot,
    value: string
  ) => {
    setFormData((prev) => {
      const updatedSlots = [...(prev.timeSlots[date] || [])];
      updatedSlots[index][field] = value as never;
      return {
        ...prev,
        timeSlots: {
          ...prev.timeSlots,
          [date]: updatedSlots,
        },
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formattedData = formData.dates.map((date) => {
      const dateKey = date.format("YYYY-MM-DD");
      let testType = "IELTS Paper Based"; // Default value
      let name = ""; // Default name

      // Determine testType and name based on courseId
      switch (formData.courseId) {
        case "67337c880794d577cd982b75": // IELTS Paper Based
          testType = "Paper-Based";
          name = "IELTS";
          break;
        case "6742b783d2f5950620f6df21": // IELTS Computer Based
          testType = "Computer-Based";
          formData.courseId = "67337c880794d577cd982b75";
          name = "IELTS";
          break;
        case "67337c880794d577cd982b76": // Pearson PTE
          testType = "Computer-Based"; // Adjust as needed
          name = "Pearson PTE";
          break;
        case "67337c880794d577cd982b77": // GRE
          testType = "Computer-Based"; // Adjust as needed
          name = "GRE";
          break;
        case "67337c880794d577cd982b78": // TOEFL
          testType = "Computer-Based"; // Adjust as needed
          name = "TOEFL";
          break;
        default:
          testType = "Unknown"; // Fallback value
          name = "Unknown"; // Fallback value
      }

      return {
        courseId: formData.courseId,
        startDate: dateKey,
        endDate: dateKey,
        timeSlots: (formData.timeSlots[dateKey] || []).map((slot, index) => ({
          slotId: (index + 1).toString(),
          startTime: `${slot.startTime}:00`,
          endTime: `${slot.endTime}:00`,
          slot: slot.slot,
          totalSlot: slot.totalSlot,
        })),
        name: name, // Updated name field
        testSystem: "", // Updated testSystem field
        testType: testType, // Updated testType field
        status: "Scheduled", // Assuming a default value, adjust as needed
      };
    });

    console.log(formattedData);
    try {
      const res = await createSchedules(formattedData as any);
      if (res.success) {
        toast.success("Schedule created successfully");
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    console.log(pathname);
  }, [pathname]);

  return (

    <div className="p-1 sm:p-3 w-full sm:max-w-[100%] mx-auto bg-[#ffffff] text-[#00000f] shadow-1xl rounded-2xl border border-[#00000f]/10">
  <h1 className="text-2xl font-extrabold mb-6 border-b pb-1 border-[#FACE39]">Create Test Schedule</h1>

  <form onSubmit={handleSubmit} className="space-y-8">

    {/* Course Selection */}
    <div className="space-y-1">
      <label className="text-lg font-semibold">Select Course</label>
      <select
        value={formData.courseId}
        onChange={(e) =>
          setFormData({ ...formData, courseId: e.target.value })
        }
        className="w-full border border-[#00000f]/20 rounded-xl px-4 py-2 text-base shadow-inner focus:outline-none focus:ring-2 focus:ring-[#FACE39]"
      >
        <option value="" disabled>Select a course</option>
        <option value="67337c880794d577cd982b75">IELTS Paper Based</option>
        <option value="6742b783d2f5950620f6df21">IELTS Computer Based</option>
        <option value="67337c880794d577cd982b76">Pearson PTE</option>
        <option value="67337c880794d577cd982b77">GRE</option>
        <option value="67337c880794d577cd982b78">TOEFL</option>
      </select>
    </div>

    {/* Date Picker */}
    <div className="space-y-1.5">
  <label className="text-lg font-semibold text-[#00000f]">📅Select Dates</label>
  <div className="w-full">
    <MultiDatePicker
      value={formData.dates as any}
      onChange={(dates) =>
        setFormData({
          ...formData,
          dates: dates as unknown as DateObject[],
        })
      }
      className="!w-full !border !border-[#00000f]/20 !rounded-xl !px-4 !py-0 !text-base !shadow-inner focus:!outline-none focus:!ring-1 focus:!ring-[#FACE39]"
    />
  </div>
</div>


    {/* Time Slot Sections */}
    {formData.dates.map((date) => {
      const dateKey = date.format("YYYY-MM-DD");
      return (
        <div key={dateKey} className="p-4 mt-6 bg-[#f8f8f8] rounded-xl border border-[#00000f]/10 shadow">
          <h3 className="font-bold text-lg mb-4 text-[#00000f]">⏰Time Slots for {dateKey}</h3>

          {(formData.timeSlots[dateKey] || []).map((slot, index) => (
            <div key={index} className="grid sm:grid-cols-4 gap-4 mb-4">

              <div>
                <label className="block mb-1 text-sm font-medium">Start Time</label>
                <input
                  type="time"
                  className="w-full border rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FACE39]"
                  value={slot.startTime}
                  onChange={(e) =>
                    handleTimeSlotChange(dateKey, index, "startTime", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium">End Time</label>
                <input
                  type="time"
                  className="w-full border rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FACE39]"
                  value={slot.endTime}
                  onChange={(e) =>
                    handleTimeSlotChange(dateKey, index, "endTime", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium">Slot</label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FACE39]"
                  value={slot.slot || 20}
                  onChange={(e) =>
                    handleTimeSlotChange(dateKey, index, "slot", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium">Total Slot</label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FACE39]"
                  value={slot.totalSlot || 20}
                  onChange={(e) =>
                    handleTimeSlotChange(dateKey, index, "totalSlot", e.target.value)
                  }
                  required
                />
              </div>
            </div>
          ))}

            <button
            type="button"
            onClick={() => addTimeSlot(dateKey)}
            className="mt-2 text-sm font-medium flex items-center gap-2 text-[#00000f] hover:text-[#00000f] hover:scale-105 transition-transform duration-300 ease-in-out"
            >
            <span className="text-xl">➕</span> Add Time Slot
            </button>
        </div>
      );
    })}

    {/* Submit Button */}
    <button
      type="submit"
      onClick={() => router.push("/admin/available-schedules")}
      className="w-full sm:w-auto px-6 py-3 bg-[#00000f] text-white font-semibold rounded-xl shadow-md hover:bg-[#FACE39] hover:text-[#00000f] transition-all duration-300 ease-in-out hover:scale-105"
    >
      ➕Create Schedule
    </button>
  </form>
</div>

  );
}

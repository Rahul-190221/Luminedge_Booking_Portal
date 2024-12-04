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
          { startTime: "09:00", endTime: "10:00", slot: 20 }, // Default time slot values
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
          testType = "Paper-Based"; // Adjust as needed
          name = "Pearson PTE";
          break;
        case "67337c880794d577cd982b77": // GRE
          testType = "Paper-Based"; // Adjust as needed
          name = "GRE";
          break;
        case "67337c880794d577cd982b78": // TOEFL
          testType = "Paper-Based"; // Adjust as needed
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
    <div className=" p-6 max-w-[80%] shadow-lg rounded-lg ">
      <h1 className="text-2xl font-bold mb-6">Create Test Schedule</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Course ID */}
        <div>
          <label className="block mb-2 font-medium">Course ID</label>
          <select
            value={formData.courseId}
            onChange={(e) =>
              setFormData({ ...formData, courseId: e.target.value })
            }
            className="border p-2 rounded w-full"
          >
            <option value="" disabled>
              Select a course
            </option>
            <option value="67337c880794d577cd982b75">IELTS Paper Based</option>
            <option value="6742b783d2f5950620f6df21">
              IELTS Computer Based
            </option>
            <option value="67337c880794d577cd982b76">Pearson PTE</option>
            <option value="67337c880794d577cd982b77">GRE</option>
            <option value="67337c880794d577cd982b78">TOEFL</option>
          </select>
        </div>

        {/* Date Picker */}
        <div>
          <label className="block mb-2 font-medium">Select Dates</label>
          <MultiDatePicker
            value={formData.dates as any}
            onChange={(dates) =>
              setFormData({
                ...formData,
                dates: dates as unknown as DateObject[],
              })
            }
          />
        </div>

        {/* Time Slots */}
        {formData.dates.map((date) => {
          const dateKey = date.format("YYYY-MM-DD");
          return (
            <div key={dateKey} className="mb-6">
              <h3 className="font-semibold mb-2">Time Slots for {dateKey}</h3>
              {(formData.timeSlots[dateKey] || []).map((slot, index) => (
                <div
                  key={index}
                  className=" w-[100%] mx-auto grid grid-cols-3 gap-4 mb-4"
                >
                  {/* Start Time */}
                  <div>
                    <label
                      htmlFor={`start-time-${dateKey}-${index}`}
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Start time:
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 end-0 top-0 flex items-center pe-3.5 pointer-events-none"></div>
                      <input
                        type="time"
                        id={`start-time-${dateKey}-${index}`}
                        className="bg-gray-50  border leading-none border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        value={slot.startTime}
                        onChange={(e) =>
                          handleTimeSlotChange(
                            dateKey,
                            index,
                            "startTime",
                            e.target.value
                          )
                        }
                        required
                      />
                    </div>
                  </div>

                  {/* End Time */}
                  <div>
                    <label
                      htmlFor={`end-time-${dateKey}-${index}`}
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      End time:
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 end-0 top-0 flex items-center pe-3.5 pointer-events-none"></div>
                      <input
                        type="time"
                        id={`end-time-${dateKey}-${index}`}
                        className="bg-gray-50 border leading-none border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        value={slot.endTime}
                        onChange={(e) =>
                          handleTimeSlotChange(
                            dateKey,
                            index,
                            "endTime",
                            e.target.value
                          )
                        }
                        required
                      />
                    </div>
                  </div>

                  {/* Slot Selection */}
                  <div>
                    <label
                      htmlFor={`slot-${dateKey}-${index}`}
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Slot:
                    </label>
                    <input
                      type="number"
                      id={`slot-${dateKey}-${index}`}
                      className="bg-gray-50 border leading-none border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      value={slot.slot || 20}
                      onChange={(e) =>
                        handleTimeSlotChange(
                          dateKey,
                          index,
                          "slot",
                          e.target.value
                        )
                      }
                      min="1"
                      required
                    />
                  </div>
                </div>
              ))}

              {/* Add Time Slot Button */}
              <button
                type="button"
                onClick={() => addTimeSlot(dateKey)}
                className="flex items-center gap-2 text-blue-500 hover:underline"
              >
                <svg
                  className="w-5 h-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Time Slot
              </button>
            </div>
          );
        })}

        {/* Submit */}
        <button
          type="submit"
          className="bg-green-500 text-white px-6 py-2 rounded"
        >
          Create Schedule
        </button>
      </form>
    </div>
  );
}

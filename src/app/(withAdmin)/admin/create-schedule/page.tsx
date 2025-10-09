"use client";
import { useEffect, useState } from "react";
import MultiDatePicker from "react-multi-date-picker";
import DateObject from "react-date-object";
import { getUserIdFromToken } from "@/app/helpers/jwt";
import { useRouter, usePathname } from "next/navigation";
import { createSchedules } from "@/app/utils/actions/createSchedules";
import { toast } from "react-hot-toast";

type TimeSlot = {
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  slot: number;
  totalSlot: number;
};

type FormState = {
  courseId: string;                // what the admin chose in the select
  dates: DateObject[];
  timeSlots: Record<string, TimeSlot[]>;
};

// --- IDs used in your app
const IELTS_BASE_ID = "67337c880794d577cd982b75";   // IELTS (used by user fetches)
const IELTS_CD_ID   = "6742b783d2f5950620f6df21";   // IELTS Computer Based (admin select)

// course meta (NOTE: IELTS-CD => testSystem should be "")
const COURSE_META: Record<
  string,
  { name: string; testType: "Paper-Based" | "Computer-Based"; testSystem: string }
> = {
  [IELTS_BASE_ID]: { name: "IELTS",       testType: "Paper-Based",    testSystem: ""      },
  [IELTS_CD_ID]:   { name: "IELTS",       testType: "Computer-Based", testSystem: ""      },
  "67337c880794d577cd982b76": { name: "Pearson PTE", testType: "Computer-Based", testSystem: "PTE"   },
  "67337c880794d577cd982b77": { name: "GRE",         testType: "Computer-Based", testSystem: "GRE"   },
  "67337c880794d577cd982b78": { name: "TOEFL",       testType: "Computer-Based", testSystem: "TOEFL" },
};

// IMPORTANT: always save IELTS (paper or computer) under the base IELTS id
const effectiveCourseId = (selectedId: string) =>
  selectedId === IELTS_CD_ID ? IELTS_BASE_ID : selectedId;

const toHHMMSS = (v: string) => {
  const [h = "00", m = "00"] = String(v || "").split(":");
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
};

export default function CreateSchedulePage() {
  const [formData, setFormData] = useState<FormState>({ courseId: "", dates: [], timeSlots: {} });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!getUserIdFromToken()) router.push("/login");
  }, [router]);

  const addTimeSlot = (dateKey: string) => {
    setFormData(prev => ({
      ...prev,
      timeSlots: {
        ...prev.timeSlots,
        [dateKey]: [
          ...(prev.timeSlots[dateKey] || []),
          { startTime: "09:00", endTime: "10:00", slot: 20, totalSlot: 20 },
        ],
      },
    }));
  };

  const handleTimeSlotChange = (
    dateKey: string,
    index: number,
    field: keyof TimeSlot,
    value: string
  ) => {
    setFormData(prev => {
      const list = [...(prev.timeSlots[dateKey] || [])];
      const curr = { ...list[index] } as any;
      if (field === "slot" || field === "totalSlot") {
        const n = Number(value);
        curr[field] = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
      } else {
        curr[field] = value;
      }
      list[index] = curr;
      return { ...prev, timeSlots: { ...prev.timeSlots, [dateKey]: list } };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.courseId) return toast.error("Please select a course.");
    if (!formData.dates.length) return toast.error("Please pick at least one date.");

    const chosenMeta = COURSE_META[formData.courseId] ?? {
      name: "Unknown",
      testType: "Computer-Based" as const,
      testSystem: "",
    };

    // ⚠️ Save IELTS-CD with the base IELTS id so the user page can fetch it
    const courseIdForDB = effectiveCourseId(formData.courseId);

    // one payload item PER time range (backend assigns the next slotId = 3,4,…)
    const payload: any[] = [];
    for (const d of formData.dates) {
      const dateKey = d.format("YYYY-MM-DD");
      const slots = formData.timeSlots[dateKey] || [];
      for (const s of slots) {
        payload.push({
          courseId: courseIdForDB,
          startDate: dateKey,
          endDate: dateKey,
          timeSlots: [
            {
              startTime: toHHMMSS(s.startTime),
              endTime: toHHMMSS(s.endTime),
              slot: Number(s.slot),
              totalSlot: Number(s.totalSlot),
            },
          ],
          name: chosenMeta.name,
          testSystem: chosenMeta.testSystem, // "" for IELTS-CD as required
          testType: chosenMeta.testType,     // "Computer-Based" for IELTS-CD
          status: "Scheduled",
        });
      }
    }

    if (!payload.length) return toast.error("Please add at least one time slot.");

    try {
      setIsSubmitting(true);
      const res = await createSchedules(payload as any);
      if (res?.success) {
        toast.success(res?.message || "Schedules created.");
        router.push("/admin/available-schedules");
      } else {
        toast.error(res?.message || "Failed to create schedules.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong while creating schedules.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    console.log(pathname);
  }, [pathname]);

  return (
    <div className="p-1 sm:p-3 w-full sm:max-w-[100%] mx-auto bg-[#ffffff] text-[#00000f] shadow-1xl rounded-2xl border border-[#00000f]/10">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00000f] via-[#3b3b3b] to-[#FACE39]">
            Create Test Schedule
          </span>
        </h1>
        <p className="mt-1 text-sm text-black/60">Choose a course, pick dates, then add one or more time windows per day.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Course */}
        <div className="space-y-2">
          <label className="text-sm font-semibold uppercase tracking-wide text-black/70">Select Course</label>
          <div className="relative">
            <select
              value={formData.courseId}
              onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
              className="w-full appearance-none bg-white/90 backdrop-blur-sm border border-black/10 rounded-2xl px-4 py-3 text-base shadow-inner focus:outline-none focus:ring-2 focus:ring-[#FACE39] focus:border-transparent transition"
              required
            >
              <option value="" disabled>Select a course</option>
              <option value={IELTS_BASE_ID}>IELTS Paper Based</option>
              <option value={IELTS_CD_ID}>IELTS Computer Based</option>
              <option value="67337c880794d577cd982b76">Pearson PTE</option>
              <option value="67337c880794d577cd982b77">GRE</option>
              <option value="67337c880794d577cd982b78">TOEFL</option>
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-black/40">▾</span>
          </div>
        </div>

        {/* Dates */}
        <div className="space-y-2">
          <label className="text-sm font-semibold uppercase tracking-wide text-black/70">📅 Select Dates</label>
          <div className="w-full rounded-2xl ring-1 ring-black/10 bg-white/70 backdrop-blur-sm p-2">
            <MultiDatePicker
              value={formData.dates as any}
              onChange={(dates) =>
                setFormData(prev => ({ ...prev, dates: (dates as unknown as DateObject[]) || [] }))
              }
              className="!w-full !border-0 !rounded-xl !px-2 !py-1 !text-base focus:!outline-none focus:!ring-1 focus:!ring-[#FACE39]"
            />
          </div>
          <p className="text-xs text-black/50">Tip: you can select multiple non-consecutive dates.</p>
        </div>

        {/* Time slots per selected date */}
        {formData.dates.map((date) => {
          const dateKey = date.format("YYYY-MM-DD");
          return (
            <section
              key={dateKey}
              className="p-4 sm:p-6 bg-white/80 backdrop-blur-sm rounded-2xl ring-1 ring-black/5 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">⏰ Time Slots for <span className="font-extrabold">{dateKey}</span></h3>
              </div>

              {(formData.timeSlots[dateKey] || []).map((slot, index) => (
                <div
                  key={index}
                  className="group mb-4 rounded-xl border border-black/10 bg-white/70 backdrop-blur-sm p-3 sm:p-4 transition hover:border-[#FACE39]/50"
                >
                  <div className="grid sm:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block mb-1 text-xs font-semibold uppercase tracking-wide text-black/60">
                        Start Time
                      </label>
                      <input
                        type="time"
                        className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-[#FACE39] bg-white"
                        value={slot.startTime}
                        onChange={(e) => handleTimeSlotChange(dateKey, index, "startTime", e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block mb-1 text-xs font-semibold uppercase tracking-wide text-black/60">
                        End Time
                      </label>
                      <input
                        type="time"
                        className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-[#FACE39] bg-white"
                        value={slot.endTime}
                        onChange={(e) => handleTimeSlotChange(dateKey, index, "endTime", e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block mb-1 text-xs font-semibold uppercase tracking-wide text-black/60">
                        Slot
                      </label>
                      <input
                        type="number"
                        min={0}
                        className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-[#FACE39] bg-white"
                        value={slot.slot}
                        onChange={(e) => handleTimeSlotChange(dateKey, index, "slot", e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block mb-1 text-xs font-semibold uppercase tracking-wide text-black/60">
                        Total Slot
                      </label>
                      <input
                        type="number"
                        min={0}
                        className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-[#FACE39] bg-white"
                        value={slot.totalSlot}
                        onChange={(e) => handleTimeSlotChange(dateKey, index, "totalSlot", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => addTimeSlot(dateKey)}
                className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[#00000f] rounded-xl border border-dashed border-black/20 px-3 py-2 hover:border-[#FACE39] hover:bg-[#fff7d6] transition"
              >
                <span className="text-lg leading-none">➕</span> Add Time Slot
              </button>
            </section>
          );
        })}

        {/* Submit */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold shadow-md bg-[#00000f] text-white hover:bg-[#FACE39] hover:text-[#00000f] active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "➕ Create Schedule"}
          </button>
        </div>
      </form>
    </div>
  );
}

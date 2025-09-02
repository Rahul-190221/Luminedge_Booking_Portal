"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, Loader2, Lock } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "https://luminedge-server.vercel.app";

const segments = [
  { key: "listening", label: "Listening", color: "#2563EB" },
  { key: "reading", label: "Reading", color: "#16A34A" },
  { key: "writing", label: "Writing", color: "#CA8A04" },
  { key: "speaking", label: "Speaking", color: "#DC2626" },
] as const;

type SegmentKey = (typeof segments)[number]["key"];

interface WritingScores {
  task1_overall: string;
  task1_TA: string;
  task1_CC: string;
  task1_LR: string;
  task1_GRA: string;
  task2_overall: string;
  task2_TR: string;
  task2_CC: string;
  task2_LR: string;
  task2_GRA: string;
}

interface FeedbackData {
  writingScores: WritingScores;
  writingTask1: string[];
  writingTask2: string[];
  task1Notes: string[];
  task2Notes: string[];
}

interface FormData {
  // feedback text
  readingFeedback: string;
  writingFeedback: string;
  listeningFeedback: string;
  speakingFeedback: string;

  // marks/bands
  readingMarks: string;
  writingMarks: string; // computed from writingScores
  listeningMarks: string;
  speakingMarks: string;

  // speaking subscores
  speakingFC: string;
  speakingLR: string;
  speakingGRA: string;
  speakingPRO: string;
  speakingTotal?: string;

  // writing breakdown helpers (kept for compatibility if used elsewhere)
  writingTask1TA: string;
  writingTask1CC: string;
  writingTask1LR: string;
  writingTask1GRA: string;
  writingTask1Feedback: string;
  writingTask2TR: string;
  writingTask2CC: string;
  writingTask2LR: string;
  writingTask2GRA: string;
  writingTask2Feedback: string;

  // admin section / candidate meta
  centreName: string;
  testDate: string;
  lastName: string;
  firstName: string;
  dateOfBirth: string;
  sex: string;
  schemeCode: string;
  overall?: string;
  proficiency?: string;
  comments?: string;
  adminSignature?: string;
  resultDate: string;

  // nested feedback data (writing)
  feedback: FeedbackData;

  // allow dynamic fields
  [key: string]: any;
  examinerSignature?: string; // speaking signature
  examinerNotes?: string;     // writing signature
}

const TestReportForm = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = searchParams.get("userId");
  const scheduleId = searchParams.get("scheduleId");

  const [selectedSegment, setSelectedSegment] = useState<SegmentKey>("reading");

  const [formData, setFormData] = useState<FormData>({
    readingFeedback: "",
    writingFeedback: "",
    listeningFeedback: "",
    speakingFeedback: "",
    readingMarks: "",
    writingMarks: "",
    listeningMarks: "",
    speakingMarks: "",
    speakingFC: "",
    speakingLR: "",
    speakingGRA: "",
    speakingPRO: "",
    speakingTotal: "",  
    writingTask1TA: "",
    writingTask1CC: "",
    writingTask1LR: "",
    writingTask1GRA: "",
    writingTask1Feedback: "",
    writingTask2TR: "",
    writingTask2CC: "",
    writingTask2LR: "",
    writingTask2GRA: "",
    writingTask2Feedback: "",
    centreName: "",
    testDate: "",
    lastName: "",
    firstName: "",
    dateOfBirth: "",
    sex: "",
    schemeCode: "",
    resultDate: "",

    // ⬇️ NEW: signatures used by the Speaking/Writing signature inputs
    examinerSignature: "",
    examinerNotes: "",
    adminSignature: "Md. Arifur Rahman", // default
    feedback: {
      writingScores: {
        task1_overall: "",
        task1_TA: "",
        task1_CC: "",
        task1_LR: "",
        task1_GRA: "",
        task2_overall: "",
        task2_TR: "",
        task2_CC: "",
        task2_LR: "",
        task2_GRA: "",
      },
      writingTask1: [],
      writingTask2: [],
      task1Notes: ["", "", "", "", ""],
      task2Notes: ["", "", "", "", ""],
    },
  });

  const [lockedSegments, setLockedSegments] = useState<Record<SegmentKey, boolean>>({
    reading: false,
    writing: false,
    listening: false,
    speaking: false,
  });

  // ⬇️ NEW: per-segment timestamps (ISO strings from backend)
  const [segmentTimestamps, setSegmentTimestamps] = useState<Record<SegmentKey, string>>({
    listening: "",
    reading: "",
    writing: "",
    speaking: "",
  });

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const savedCount = Object.values(lockedSegments).filter(Boolean).length;
  const progressPercent = (savedCount / segments.length) * 100;

  // helper: format ISO → Dhaka local human string
  const formatDhakaDateTime = (iso?: string) => { // ⬅️ NEW
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(+d)) return "";
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  };

  // fetch schedule-scoped feedback status
  useEffect(() => {
    let mounted = true;

    const fetchStatus = async () => {
      if (!userId || !scheduleId) return;
      try {
        const res = await axios.get(
          `${API_BASE}/api/v1/admin/feedback-status/${userId}/${scheduleId}`
        );
        const status = res.data?.status || {};
        if (!mounted) return;
        
        // Coalesce speaking total from multiple possible server fields
        const fetchedSpeakingTotal =
          (typeof status.speakingTotal === "string" && status.speakingTotal) ||
          (typeof status.speakingMarks === "string" && status.speakingMarks) ||
          (status?.marks && typeof status.marks.Total === "string" && status.marks.Total) ||
          "";
        
        setFormData((prev) => ({
          ...prev,
        
          // feedback texts
          listeningFeedback: status.listeningFeedback ?? prev.listeningFeedback ?? "",
          readingFeedback:   status.readingFeedback   ?? prev.readingFeedback   ?? "",
          writingFeedback:   status.writingFeedback   ?? prev.writingFeedback   ?? "",   // ✅ fix
          speakingFeedback:  status.speakingFeedback  ?? prev.speakingFeedback  ?? "",
        
          // marks/bands
          listeningMarks: status.listeningMarks ?? prev.listeningMarks ?? "",
          readingMarks:   status.readingMarks   ?? prev.readingMarks   ?? "",
          // ✅ keep legacy speakingMarks in sync with the exact saved total
          speakingMarks:  fetchedSpeakingTotal || prev.speakingMarks || "",
        
          // speaking subscores
          speakingFC:     status.speakingFC     ?? prev.speakingFC     ?? "",
          speakingLR:     status.speakingLR     ?? prev.speakingLR     ?? "",
          speakingGRA:    status.speakingGRA    ?? prev.speakingGRA    ?? "",
          speakingPRO:    status.speakingPRO    ?? prev.speakingPRO    ?? "",
          // ✅ exact total from server (no auto-calc)
          speakingTotal:  fetchedSpeakingTotal || prev.speakingTotal || "",
        
          // candidate/admin meta
          centreName:  status.centreName  ?? prev.centreName  ?? "",
          testDate:    status.testDate    ?? prev.testDate    ?? "",
          lastName:    status.lastName    ?? prev.lastName    ?? "",
          firstName:   status.firstName   ?? prev.firstName   ?? "",
          dateOfBirth: status.dateOfBirth ?? prev.dateOfBirth ?? "",
          sex:         status.sex         ?? prev.sex         ?? "",
          schemeCode:  status.schemeCode  ?? prev.schemeCode  ?? "",
        
          // signatures
          examinerSignature: status.speakingSign ?? prev.examinerSignature ?? "",
          examinerNotes:     status.writingSign  ?? prev.examinerNotes     ?? "",
        
          // writing nested data
          feedback: {
            writingScores: status.writingScores ?? prev.feedback.writingScores,
            writingTask1:  status.writingTask1  ?? prev.feedback.writingTask1,
            writingTask2:  status.writingTask2  ?? prev.feedback.writingTask2,
            task1Notes:    status.task1Notes    ?? prev.feedback.task1Notes,
            task2Notes:    status.task2Notes    ?? prev.feedback.task2Notes,
          },
        }));
        

        setLockedSegments({
          listening: !!status.listening,
          reading:   !!status.reading,
          writing:   !!status.writing,
          speaking:  !!status.speaking,
        });

        // ⬇️ NEW: timestamps from backend
        const ts = (status.timestamps || {}) as Partial<Record<SegmentKey, string>>;
        setSegmentTimestamps({
          listening: ts.listening || "",
          reading:   ts.reading   || "",
          writing:   ts.writing   || "",
          speaking:  ts.speaking  || "",
        });
      } catch (err) {
        console.error("Error fetching feedback status:", err);
      }
    };

    fetchStatus();
    return () => { mounted = false; };
  }, [userId, scheduleId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };


  
  // set default result date once
  useEffect(() => {
    if (!formData.resultDate) {
      const today = new Date().toISOString().split("T")[0];
      setFormData((prev) => ({ ...prev, resultDate: today }));
    }
  }, [formData.resultDate]);

  // auto calc overall & proficiency from 4 bands
  useEffect(() => {
    const parseScore = (val: any): number | null => {
      const parsed = parseFloat(val);
      return !isNaN(parsed) && parsed >= 0 && parsed <= 9 ? parsed : null;
    };

    const listening = parseScore(formData.listeningMarks);
    const reading = parseScore(formData.readingMarks);
    const writing = parseScore(formData.writingMarks);
    const speaking = parseScore(formData.speakingMarks);

    const scores = [listening, reading, writing, speaking];
    const isComplete = scores.every((s) => s !== null);

    if (isComplete) {
      const average = (scores as number[]).reduce((a, b) => a + b, 0) / 4;
      const overall = Math.round(average * 2) / 2;

      const getCEFR = (score: number): string => {
        if (score >= 8.5) return "C2";
        if (score >= 7.0) return "C1";
        if (score >= 5.5) return "B2";
        if (score >= 4.0) return "B1";
        return "A2";
      };

      setFormData((prev) => ({
        ...prev,
        overall: overall.toFixed(1),
        proficiency: getCEFR(overall),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        overall: "",
        proficiency: "",
      }));
    }
  }, [
    formData.listeningMarks,
    formData.readingMarks,
    formData.writingMarks,
    formData.speakingMarks,
  ]);

  // auto calc writing band (task2 double weight)
  useEffect(() => {
    const { feedback } = formData;

    const task1Scores = [
      feedback.writingScores.task1_TA,
      feedback.writingScores.task1_CC,
      feedback.writingScores.task1_LR,
      feedback.writingScores.task1_GRA,
    ].map(Number);

    const task2Scores = [
      feedback.writingScores.task2_TR,
      feedback.writingScores.task2_CC,
      feedback.writingScores.task2_LR,
      feedback.writingScores.task2_GRA,
    ].map(Number);

    const allValid = [...task1Scores, ...task2Scores].every(
      (v) => !isNaN(v) && v >= 0 && v <= 9
    );

    if (allValid) {
      const total = [...task1Scores, ...task2Scores, ...task2Scores].reduce((a, b) => a + b, 0);
      const average = total / 12;
      const rounded = Math.floor(average * 2) / 2; // round DOWN to .0/.5

      setFormData((prev) => ({
        ...prev,
        writingMarks: rounded.toFixed(1),
      }));
    }
  }, [
    formData.feedback.writingScores.task1_TA,
    formData.feedback.writingScores.task1_CC,
    formData.feedback.writingScores.task1_LR,
    formData.feedback.writingScores.task1_GRA,
    formData.feedback.writingScores.task2_TR,
    formData.feedback.writingScores.task2_CC,
    formData.feedback.writingScores.task2_LR,
    formData.feedback.writingScores.task2_GRA,
  ]);

  // Put this once near the top of the file (module scope)
  const todayDhakaYMD = () =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

  const handleSaveFeedback = async () => {
    const admin = localStorage.getItem("adminName") || "Unknown";

    // decode admin email from JWT (required by backend)
    let adminEmail = "";
    try {
      const token = localStorage.getItem("accessToken");
      if (token) {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        adminEmail = decoded?.email || "";
      }
    } catch (err) {
      console.error("Failed to decode JWT:", err);
    }

    if (!userId || !scheduleId) {
      setSaveStatus("❌ Missing userId or scheduleId.");
      return;
    }

    if (lockedSegments[selectedSegment]) {
      setSaveStatus("⚠️ Already saved.");
      return;
    }

    try {
      setSaving(true);

      let payload: any = {
        userId,
        scheduleId,
        segment: selectedSegment,
        admin,
        adminEmail,
      };

      if (selectedSegment === "speaking") {
        const { speakingFeedback, speakingFC, speakingLR, speakingGRA, speakingPRO, speakingMarks } =
          formData;

        if (!speakingFeedback.trim() || !speakingMarks.trim()) {
          setSaveStatus("❌ Please enter both feedback and total marks.");
          setSaving(false);
          return;
        }

        payload.feedback = speakingFeedback;
        payload.marks = {
          FC: speakingFC,
          LR: speakingLR,
          GRA: speakingGRA,
          PRO: speakingPRO,
          Total: speakingMarks,
        };
      } else if (selectedSegment === "writing") {
        const {
          feedback: { writingScores, writingTask1, writingTask2, task1Notes, task2Notes },
        } = formData;

        const isMarksEmpty = Object.values(writingScores).some((score) => !`${score}`.trim());
        const isFeedbackEmpty =
          writingTask1.join("").trim() === "" && writingTask2.join("").trim() === "";

        if (isMarksEmpty || isFeedbackEmpty) {
          setSaveStatus("❌ Please enter both feedback and all writing scores.");
          setSaving(false);
          return;
        }

        payload.feedback = {
          writingTask1,
          writingTask2,
          task1Notes,
          task2Notes,
        };
        payload.marks = writingScores;
      } else {
        // reading / listening
        const feedbackValue = formData[`${selectedSegment}Feedback`] || "";
        const marksValue = formData[`${selectedSegment}Marks`] || "";

        if (!feedbackValue.trim() || !marksValue.trim()) {
          setSaveStatus("❌ Please enter both feedback and marks.");
          setSaving(false);
          return;
        }

        payload.feedback = feedbackValue;
        payload.marks = marksValue;
      }

      const res = await axios.post(`${API_BASE}/api/v1/admin/save-feedback`, payload);

      if (res.data.success) {
        setLockedSegments((prev) => ({ ...prev, [selectedSegment]: true }));
        setSaveStatus("✅ Feedback saved successfully.");

        // ⬇️ NEW: show a timestamp immediately (optimistic; server is authoritative)
        setSegmentTimestamps((prev) => ({
          ...prev,
          [selectedSegment]: new Date().toISOString(),
        }));
      } else {
        setSaveStatus("⚠️ " + (res.data.message || "Unknown error."));
      }
    } catch (err: any) {
      console.error("Save feedback error:", err);
      const message =
        err?.response?.data?.message ||
        (err?.response?.status === 409
          ? "Feedback already saved for this schedule."
          : "Failed to save feedback.");
      setSaveStatus(`❌ ${message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleSaveAdminSection = async () => {
    if (!userId || !scheduleId) {
      toast.error("❌ Missing userId or scheduleId.");
      return;
    }

    const today = todayDhakaYMD();

    const {
      overall,
      proficiency,
      schemeCode,
      comments,
      adminSignature,
    } = formData;

    const resultDate = formData.resultDate || today; // fallback to today
    const centreName = "LUMINEDGE BD";
    const testDate = today;

    // fallback signature if empty
    const signatureToSave =
      (adminSignature && adminSignature.trim()) || "Md. Arifur Rahman";

    if (!comments?.trim() && !schemeCode?.trim()) {
      toast.error("❌ Please fill in comments or scheme code.");
      return;
    }

    try {
      setSaving(true);

      const response = await axios.put(
        `${API_BASE}/api/v1/admin/save-admin-section`,
        {
          userId,
          scheduleId,
          overall,
          proficiency,
          resultDate,
          schemeCode,
          comments,
          adminSignature: signatureToSave, // ✅ use fallback
          centreName,
          testDate,
        }
      );

      if (response?.data?.success) {
        setFormData((prev) => ({
          ...prev,
          adminSignature: signatureToSave,
          resultDate,
          centreName,
          testDate,
        }));

        toast.success("✅ Admin section saved successfully.");
      } else {
        const msg = response?.data?.message || "Unknown error.";
        toast.warn("⚠️ " + msg);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 404
          ? "User not found."
          : err?.response?.status === 400
          ? "Invalid request."
          : "Error saving admin section.");
      console.error("Save admin section failed:", err);
      toast.error("❌ " + msg);
    } finally {
      setSaving(false);
    }
  };

  // load admin section (schedule-scoped)
  useEffect(() => {
    const fetchAdminSection = async () => {
      if (!userId || !scheduleId) return;
      try {
        const res = await axios.get(
          `${API_BASE}/api/v1/admin/get-admin-section/${userId}/${scheduleId}`
        );
        const data = res.data || {};

        setFormData((prev) => ({
          ...prev,
          comments: data.adminComments || "",
          resultDate: data.resultDate || new Date().toISOString().split("T")[0],
          schemeCode: data.schemeCode || "",
          adminSignature:
            (data.adminSignature ?? localStorage.getItem("adminName")) ?? "Md. Arifur Rahman",
        }));
      } catch (err) {
        console.error("Failed to fetch admin section:", err);
      }
    };

    fetchAdminSection();
  }, [userId, scheduleId]);

  if (!userId || !scheduleId) {
    return (
      <div className="p-6 text-red-600">
        ❌ Missing required URL params (userId & scheduleId).
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Admin Section */}
      <div
        className="p-6 max-w-4xl mx-auto bg-gradient-to-br from-white via-gray-50 to-white border-2  rounded-2xl shadow-xl"
        style={{ fontFamily: "Montserrat", color: "#00000f" }}
      >
        <h2 className="text-xl font-bold mb-4 border-b pb-2 border-gray-400">
          📝 Additional Fields
        </h2>

        <div className="grid grid-cols-2 gap-x-6 gap-y-5 text-sm">
          {/* Overall Band Score */}
          <div className="flex flex-col">
            <label className="font-semibold text-[13px] mb-1 text-gray-800">
              Overall Band Score
            </label>
            <input
              name="overall"
              value={formData.overall || ""}
              readOnly
              className="border border-gray-600 rounded-md px-3 py-2 bg-gray-100 shadow-inner text-red-600 focus:outline-none"
              placeholder="e.g. 7.5"
            />
          </div>

          {/* English Proficiency Level */}
          <div className="flex flex-col">
            <label className="font-semibold text-[13px] mb-1 text-gray-800">
              English Proficiency Level
            </label>
            <input
              name="proficiency"
              value={formData.proficiency || ""}
              readOnly
              className="border border-gray-600 rounded-md px-3 py-2 bg-gray-100 shadow-inner text-red-600 focus:outline-none"
              placeholder="e.g. B2, C1"
            />
          </div>

          {/* Result Date + Scheme Code */}
          <div className="grid grid-cols-2 gap-6 col-span-2">
            <div className="flex flex-col">
              <label className="font-semibold text-[13px] mb-1 text-gray-800">
                Result Publishing Date
              </label>
              <input
                type="date"
                name="resultDate"
                value={formData.resultDate || ""}
                onChange={handleChange}
                className="border border-gray-600 rounded-md px-3 py-2 bg-white shadow-inner text-red-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col">
              <label className="font-semibold text-[13px] mb-1 text-gray-800">
                Scheme Code
              </label>
              <input
                name="schemeCode"
                value={formData.schemeCode}
                onChange={handleChange}
                className="border border-gray-600 rounded-md px-3 py-2 bg-white shadow-inner text-red-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. ABC123"
              />
            </div>
          </div>
        </div>

        {/* Comments + Centre Stamp */}
        <div className="mt-6 flex gap-6 items-stretch">
          <div className="w-2/3">
            <label className="text-sm font-semibold text-gray-800 block mb-0">
              💬 Administrator Comments
            </label>
            <textarea
              name="comments"
              value={formData.comments || ""}
              onChange={(e) => {
                const words = e.target.value.split(/\s+/).filter(Boolean);
                if (words.length <= 300) {
                  handleChange(e);
                }
              }}
              className="w-full border border-gray-600 rounded-md p-2.5 m-2 text-red-600 text-sm bg-white shadow-inner resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={6}
              placeholder="Enter any notes or admin comments here (max 300 words)..."
            />

            <p className="text-sm text-gray-600 mt-0 mb-3">
              {formData.comments?.split(/\s+/).filter(Boolean).length || 0}/300 words
            </p>
          </div>

          <div className="w-1/3 self-stretch h-full flex flex-col items-center justify-center border border-gray-600 rounded-md bg-white shadow-inner p-1">
            <label className="text-sm font-semibold text-gray-800 block mb-0">
              Centre Stamp
            </label>
            <div className="w-[160px] h-[140px]">
              <img
                src="/assets/centre-stamp.png"
                alt="Centre Stamp"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = "none";
                }}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>

        <div className="mt-0">
          <label className="text-sm font-semibold text-gray-800 block mb-2">
            ✍️ Admin Signature
          </label>
          <input
            type="text"
            name="adminSignature"
            value={formData.adminSignature}
            onChange={handleChange}
            className="w-full border border-gray-600 rounded-md px-3 py-2 bg-white shadow-inner text-red-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your name or signature"
          />
        </div>

        <div className="mt-4 flex justify-start items-center gap-4">
          <button
            type="button"
            onClick={handleSaveAdminSection}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition"
            title="Feedback saved"
          >
            💾 Save Admin Section
          </button>

          {/* Toasts */}
          <ToastContainer
            position="top-center"
            autoClose={2500}
            newestOnTop
            closeOnClick
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
          />

          <button
            onClick={() =>
              router.push(`/admin/finaltrf?userId=${userId}&scheduleId=${scheduleId}`)
            }
            className="px-6 py-2 rounded-md text-sm font-semibold bg-[#00000f] text-white shadow-md hover:bg-[#face39] hover:text-[#00000f] hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            📝 View Final TRF
          </button>
        </div>
      </div>

      {/* Feedback & Segments */}
      <div className="p-6 max-w-4xl mx-auto space-y-6 bg-white rounded-xl border shadow-lg">
        <h2 className="text-2xl font-bold mb-0">Feedback & Marks Segments</h2>

        {/* Progress */}
        <div className="w-full space-y-2">
          <div className="text-sm font-medium text-gray-700 text-right">
            {savedCount} of {segments.length} segments saved ({progressPercent.toFixed(0)}%)
          </div>

          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden flex">
            {segments.map((seg) => {
              const isLocked = lockedSegments[seg.key];
              return (
                <div
                  key={seg.key}
                  className="transition-all duration-500 ease-in-out"
                  style={{
                    width: `${100 / segments.length}%`,
                    backgroundColor: isLocked ? seg.color : `${seg.color}33`,
                  }}
                  title={`${seg.label}: ${isLocked ? "Saved ✅" : "Pending ⏳"}`}
                />
              );
            })}
          </div>
        </div>

        {/* Segment selector */}
        <div className="grid grid-cols-4 gap-6">
          {segments.map((seg, index) => {
            const isLocked = lockedSegments[seg.key];
            const isActive = selectedSegment === seg.key;
            const baseColor = seg.color;

            return (
              <div className="flex flex-col items-center" key={seg.key}>
                <button
                  onClick={() => setSelectedSegment(seg.key)}
                  className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-base transition ${
                    isLocked
                      ? "bg-green-600 border-green-700 text-white"
                      : isActive
                      ? "bg-white text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                  style={{
                    borderColor: isLocked ? "#15803D" : baseColor,
                    backgroundColor: isActive ? baseColor : isLocked ? "#15803D" : `${baseColor}20`,
                    color: isActive ? "#fff" : undefined,
                  }}
                >
                  {isLocked ? <CheckCircle size={20} /> : index + 1}
                </button>
                <span className="mt-2 text-sm text-gray-800 font-medium">{seg.label}</span>
              </div>
            );
          })}
        </div>

        {/* Feedback box */}
        <div
          className="rounded-lg p-4 shadow-md border bg-gray-50"
          style={{
            borderLeft: `4px solid ${
              segments.find((s) => s.key === selectedSegment)?.color
            }`,
          }}
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {segments.find((s) => s.key === selectedSegment)?.label} Feedback
          </h3>

          {/* Speaking */}
          {selectedSegment === "speaking" && (
            <>
              <table className="min-w-full text-center border border-gray-300 text-sm mb-4">
                <thead className="bg-gray-100">
                  <tr>
                    {["FC", "LR", "GRA", "PRO", "Total"].map((head) => (
                      <th key={head} className="border px-3 py-1">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-red-600">
                  <tr>
                    {["FC", "LR", "GRA", "PRO", "Total"].map((key) => (
                      <td key={key} className="border px-2 py-1">
                        <input
                          type="number"
                          name={`speaking${key}`}
                          value={formData[`speaking${key}`] || ""}
                          onChange={handleChange}
                          step={0.5}
                          min={0}
                          max={9}
                          disabled={lockedSegments.speaking}
                          className="w-16 px-1 py-0.5 border border-gray-300 text-sm text-center text-red-600"
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
              <textarea
                name="speakingFeedback"
                rows={6}
                value={formData.speakingFeedback || ""}
                onChange={handleChange}
                disabled={lockedSegments.speaking}
                placeholder="Enter speaking feedback..."
                className="w-full bg-white text-sm text-gray-900 rounded-md px-4 py-3 resize-none shadow-inner border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-4">
                  <label className="min-w-[200px] text-sm font-medium text-black">
                    Speaking Examiner’s Signature
                  </label>
                  <input
                    type="text"
                    name="examinerSignature"
                    value={formData.examinerSignature || ""}
                    onChange={handleChange}
                    disabled={lockedSegments.speaking}
                    readOnly={lockedSegments.speaking}
                    className={`border border-black px-3 py-1 text-red-600 text-sm font-semibold rounded w-[220px] text-center ${
                      lockedSegments.speaking ? "bg-gray-100" : "bg-gray-50"
                    }`}
                    placeholder="e.g. Neelima (30.06.25)"
                  />
                </div>
              </div>
            </>
          )}

          {/* Writing */}
          {selectedSegment === "writing" && (
            <>
              <h3 className="font-bold mb-1">Writing</h3>
              <table className="table-fixed w-full border border-black text-center text-[12px] mb-2">
                <thead className="bg-gray-100">
                  <tr className="font-semibold">
                    <th className="border border-black p-1">Task 1</th>
                    <th className="border border-black p-1">TA</th>
                    <th className="border border-black p-1">CC</th>
                    <th className="border border-black p-1">LR</th>
                    <th className="border border-black p-1">GRA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {["task1_overall", "task1_TA", "task1_CC", "task1_LR", "task1_GRA"].map(
                      (key) => (
                        <td key={key} className="border border-black p-1">
                          <input
                            disabled={lockedSegments.writing}
                            className="w-full text-center bg-gray-50 text-red-600 outline-none border-none"
                            value={
                              formData.feedback.writingScores[
                                key as keyof typeof formData.feedback.writingScores
                              ]
                            }
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                feedback: {
                                  ...prev.feedback,
                                  writingScores: {
                                    // @ts-ignore
                                    ...(prev.feedback.writingScores as any),
                                    [key]: e.target.value,
                                  } as WritingScores,
                                },
                              }))
                            }
                          />
                        </td>
                      )
                    )}
                  </tr>

                  <tr className="text-[11px] text-[#00000f]">
                    {["Under length", "No. of words", "Penalty", "Off-topic", "Memorised"].map(
                      (label, idx) => (
                        <td key={idx} className="border border-black p-1">
                          {label}
                        </td>
                      )
                    )}
                  </tr>

                  <tr>
                    {[...Array(5)].map((_, i) => (
                      <td key={i} className="border border-black p-1">
                        <input
                          type="text"
                          disabled={lockedSegments.writing}
                          className="w-full bg-gray-50 text-black text-sm outline-none border-none"
                          value={formData.feedback.task1Notes[i] || ""}
                          onChange={(e) => {
                            const updated = [...formData.feedback.task1Notes];
                            updated[i] = e.target.value;
                            setFormData((prev) => ({
                              ...prev,
                              feedback: {
                                ...prev.feedback,
                                task1Notes: updated,
                              },
                            }));
                          }}
                        />
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td colSpan={5} className="border border-black p-2 text-left">
                      <textarea
                        rows={3}
                        disabled={lockedSegments.writing}
                        className="w-full bg-gray-50 text-red-600 text-sm p-1 outline-none border-none"
                        value={formData.feedback.writingTask1.join("\n")}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            feedback: {
                              ...prev.feedback,
                              writingTask1: e.target.value.split("\n"),
                            },
                          }))
                        }
                      />
                    </td>
                  </tr>

                  <tr className="bg-gray-100 font-semibold text-[#00000f]">
                    <th className="border border-black p-1">Task 2</th>
                    <th className="border border-black p-1">TR</th>
                    <th className="border border-black p-1">CC</th>
                    <th className="border border-black p-1">LR</th>
                    <th className="border border-black p-1">GRA</th>
                  </tr>

                  <tr>
                    {["task2_overall", "task2_TR", "task2_CC", "task2_LR", "task2_GRA"].map(
                      (key) => (
                        <td key={key} className="border border-black p-1">
                          <input
                            disabled={lockedSegments.writing}
                            className="w-full text-center bg-gray-50 text-red-600 outline-none border-none"
                            value={
                              formData.feedback.writingScores[
                                key as keyof typeof formData.feedback.writingScores
                              ]
                            }
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                feedback: {
                                  ...prev.feedback,
                                  writingScores: {
                                    // @ts-ignore
                                    ...(prev.feedback.writingScores as any),
                                    [key]: e.target.value,
                                  } as WritingScores,
                                },
                              }))
                            }
                          />
                        </td>
                      )
                    )}
                  </tr>

                  <tr className="text-[11px] text-[#00000f]">
                    {["Under length", "No. of words", "Penalty", "Off-topic", "Memorised"].map(
                      (label, idx) => (
                        <td key={idx} className="border border-black p-1">
                          {label}
                        </td>
                      )
                    )}
                  </tr>

                  <tr>
                    {[...Array(5)].map((_, i) => (
                      <td key={i} className="border border-black p-1">
                        <input
                          type="text"
                          disabled={lockedSegments.writing}
                          className="w-full bg-gray-50 text-black text-sm outline-none border-none"
                          value={formData.feedback.task2Notes[i] || ""}
                          onChange={(e) => {
                            const updated = [...formData.feedback.task2Notes];
                            updated[i] = e.target.value;
                            setFormData((prev) => ({
                              ...prev,
                              feedback: {
                                ...prev.feedback,
                                task2Notes: updated,
                              },
                            }));
                          }}
                        />
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td colSpan={5} className="border border-black p-2 text-left">
                      <textarea
                        rows={3}
                        disabled={lockedSegments.writing}
                        className="w-full bg-gray-50 text-red-600 text-sm p-1 outline-none border-none"
                        value={formData.feedback.writingTask2.join("\n")}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            feedback: {
                              ...prev.feedback,
                              writingTask2: e.target.value.split("\n"),
                            },
                          }))
                        }
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-4">
                  <label className="min-w-[200px] text-sm font-medium text-black">
                    Writing Examiner’s Signature
                  </label>
                  <input
                    type="text"
                    name="examinerNotes"
                    value={formData.examinerNotes || ""}
                    onChange={handleChange}
                    disabled={lockedSegments.writing}
                    readOnly={lockedSegments.writing}
                    className={`border border-black px-3 py-1 text-red-600 text-sm font-semibold rounded w-[220px] text-center ${
                      lockedSegments.writing ? "bg-gray-100" : "bg-gray-50"
                    }`}
                    placeholder="e.g. Prima (01.07.25)"
                  />
                </div>
              </div>
            </>
          )}

          {/* Reading / Listening */}
          {selectedSegment !== "writing" && selectedSegment !== "speaking" && (
            <>
              <div className="mb-4 flex items-center gap-4">
                <label
                  htmlFor={`${selectedSegment}Marks`}
                  className="text-sm font-medium text-gray-700 min-w-[120px]"
                >
                  Band Score:
                </label>
                <input
                  type="number"
                  id={`${selectedSegment}Marks`}
                  name={`${selectedSegment}Marks`}
                  min={0}
                  max={9}
                  step={0.5}
                  value={formData[`${selectedSegment}Marks`] || ""}
                  onChange={handleChange}
                  disabled={lockedSegments[selectedSegment]}
                  className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-red-600"
                />
              </div>
              <textarea
                name={`${selectedSegment}Feedback`}
                rows={6}
                value={formData[`${selectedSegment}Feedback`] || ""}
                onChange={handleChange}
                disabled={lockedSegments[selectedSegment]}
                placeholder={`Enter feedback for ${selectedSegment}...`}
                className="w-full bg-white text-sm text-gray-900 rounded-md px-4 py-3 resize-none shadow-inner border border-gray-300"
              />
            </>
          )}

          {/* Save button */}
          <div className="flex flex-col items-center mt-4">
            <button
              onClick={handleSaveFeedback}
              disabled={lockedSegments[selectedSegment] || saving}
              className={`inline-flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium text-white ${
                lockedSegments[selectedSegment]
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {lockedSegments[selectedSegment] ? (
                <>
                  <Lock size={16} /> Saved
                </>
              ) : saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving...
                </>
              ) : (
                <>💾 Save Feedback</>
              )}
            </button>

            {/* ⬇️ NEW: show last-saved timestamp for current segment */}
            {segmentTimestamps[selectedSegment] && (
              <p className="mt-2 text-xs text-gray-600">
                Saved on {formatDhakaDateTime(segmentTimestamps[selectedSegment])} (Dhaka)
              </p>
            )}
          </div>

          {saveStatus && (
            <p className="mt-4 text-sm font-medium text-center text-gray-700">
              {saveStatus}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestReportForm;

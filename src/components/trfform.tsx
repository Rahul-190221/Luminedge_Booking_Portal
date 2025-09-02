"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Loader2, Lock } from "lucide-react";
import { ToastContainer } from "react-toastify"; // ✅ toast
import "react-toastify/dist/ReactToastify.css"; // ✅ toast styles

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
  readingFeedback: string;
  writingFeedback: string;
  listeningFeedback: string;
  speakingFeedback: string;

  readingMarks: string;
  writingMarks: string;
  listeningMarks: string;
  speakingMarks: string;

  // Speaking breakdown
  speakingFC: string;
  speakingLR: string;
  speakingGRA: string;
  speakingPRO: string;
  speakingTotal: string; // computed in useEffect

  // Legacy fields (kept if referenced elsewhere)
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

  // Candidate/Test info
  centreName: string;
  testDate: string;
  lastName: string;
  firstName: string;
  dateOfBirth: string;
  sex: string;
  schemeCode: string;

  // Signatures
  examinerSignature: string; // Speaking Examiner’s Signature
  examinerNotes: string;     // Writing Examiner’s Signature

  // Structured writing feedback
  feedback: FeedbackData;

  [key: string]: any;
}

const TestReportForm = () => {
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState<string | null>(null);
  const [scheduleId, setScheduleId] = useState<string | null>(null);

  const [selectedSegment, setSelectedSegment] = useState<SegmentKey>("reading");
  const [assignedTeachers, setAssignedTeachers] = useState<Record<string, string>>({});
  const [lockedSegments, setLockedSegments] = useState<Record<SegmentKey, boolean>>({
    reading: false,
    writing: false,
    listening: false,
    speaking: false,
  });

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [marksError, setMarksError] = useState<string | null>(null); // ⬅️ validation message

  // Asia/Dhaka "D.MM.YY", e.g., 1.07.25 or 30.06.25
  const todayDhakaDMY = (() => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "numeric",    // no leading zero
      month: "2-digit",  // leading zero
      year: "2-digit",
    }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
    return `${get("day")}.${get("month")}.${get("year")}`;
  })();

  const DEFAULT_SPEAKING_SIGN = `Neelima (${todayDhakaDMY})`;
  const DEFAULT_WRITING_SIGN  = `Prima (${todayDhakaDMY})`;

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

    examinerSignature: DEFAULT_SPEAKING_SIGN,
    examinerNotes: DEFAULT_WRITING_SIGN,

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

  // Logged-in email (from JWT)
  const [loggedInEmail, setLoggedInEmail] = useState<string>("");

  useEffect(() => {
    try {
      const token = localStorage.getItem("accessToken");
      if (token) {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        setLoggedInEmail((decoded?.email || "").trim().toLowerCase());
      }
    } catch {
      setLoggedInEmail("");
    }
  }, []);

  const teacherKeyMap: Record<SegmentKey, string> = {
    listening: "teacherL",
    reading: "teacherR",
    writing: "teacherW",
    speaking: "teacherS",
  };

  // pull IDs from URL
  useEffect(() => {
    const uid = searchParams.get("userId");
    const sid = searchParams.get("scheduleId");
    setUserId(uid);
    setScheduleId(sid);
  }, [searchParams]);

 
// fetch status + teachers for this (userId, scheduleId)
useEffect(() => {
  if (!userId || !scheduleId) return;

  const fetchStatus = async () => {
    try {
      const [statusRes, teacherRes] = await Promise.all([
        axios.get(`${API_BASE}/api/v1/admin/feedback-status/${userId}/${scheduleId}`),
        axios.get(`${API_BASE}/api/v1/admin/assigned-teachers/${userId}/${scheduleId}`),
      ]);

      const status = statusRes.data?.status || {};
      const teachers = teacherRes.data || {};
      setAssignedTeachers(teachers);

      // Coalesce exact saved total from any backend shape
      const rawTotal =
        status?.speakingTotal ??
        status?.speakingMarks ??
        status?.marks?.Total;
      const fetchedSpeakingTotal =
        rawTotal === null || rawTotal === undefined ? "" : String(rawTotal).trim();

      setFormData((prev) => ({
        ...prev,
        ...status, // keep spreading status, then override below

        // ✅ ensure Total is set explicitly regardless of status shape
        speakingTotal: fetchedSpeakingTotal || prev.speakingTotal || "",
        speakingMarks: fetchedSpeakingTotal || prev.speakingMarks || prev.speakingTotal || "",

        feedback: {
          writingScores:
            status.writingScores || {
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
          writingTask1: status.writingTask1 || [],
          writingTask2: status.writingTask2 || [],
          task1Notes: status.task1Notes || ["", "", "", "", ""],
          task2Notes: status.task2Notes || ["", "", "", "", ""],
        },
        examinerSignature:
          (typeof status.speakingSign === "string" && status.speakingSign.trim()) ||
          (prev.examinerSignature && prev.examinerSignature.trim()) ||
          DEFAULT_SPEAKING_SIGN,
        examinerNotes:
          (typeof status.writingSign === "string" && status.writingSign.trim()) ||
          (prev.examinerNotes && prev.examinerNotes.trim()) ||
          DEFAULT_WRITING_SIGN,
      }));

      setLockedSegments({
        listening: !!status.listening,
        reading: !!status.reading,
        writing: !!status.writing,
        speaking: !!status.speaking,
      });
    } catch (err) {
      console.error("Error fetching status/teachers:", err);
    }
  };

  fetchStatus();
}, [userId, scheduleId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ----------------------- AUTHORIZATION -----------------------
  const normalize = (s: string) => (s || "").trim().toLowerCase();
  const assignedTeacherEmail = assignedTeachers?.[teacherKeyMap[selectedSegment]] || "";
  const authorized: boolean =
    !!assignedTeacherEmail && normalize(assignedTeacherEmail) === normalize(loggedInEmail);
  // -------------------------------------------------------------
// -------- DECIMAL VALIDATION (0–9, decimals allowed) --------
const isValidMark = (v: string, allowEmpty = true) => {
  if (v === "" || v === null || v === undefined) return allowEmpty;
  const s = String(v).trim();
  if (!/^\d+(\.\d+)?$/.test(s)) return false;        // digits with optional decimal
  const num = Number(s);
  if (!Number.isFinite(num) || num < 0 || num > 9) return false;
  // optional: limit to ONE decimal place (so 6.7 OK, 6.75 NOT OK)
  const parts = s.split(".");
  if (parts[1] && parts[1].length > 1) return false;
  return true;
};

useEffect(() => {
  let invalid = false;

  if (selectedSegment === "speaking") {
    const vals = [formData.speakingFC, formData.speakingLR, formData.speakingGRA, formData.speakingPRO];
    for (const v of vals) {
      if (!isValidMark(v)) {       // empty is allowed while typing; range/format checked
        invalid = true;
        break;
      }
    }
  } else if (selectedSegment === "writing") {
    const ws = formData.feedback.writingScores;
    const vals = [
      ws.task1_overall, ws.task1_TA, ws.task1_CC, ws.task1_LR, ws.task1_GRA,
      ws.task2_overall, ws.task2_TR, ws.task2_CC, ws.task2_LR, ws.task2_GRA,
    ];
    for (const v of vals) {
      if (!isValidMark(v)) {
        invalid = true;
        break;
      }
    }
  } else {
    const mk = formData[`${selectedSegment}Marks`] || "";
    if (!isValidMark(mk)) invalid = true;
  }

  setMarksError(invalid ? "Invalid input for marks (use 0–9; decimals allowed)." : null);
}, [
  selectedSegment,
  formData.speakingFC,
  formData.speakingLR,
  formData.speakingGRA,
  formData.speakingPRO,
  formData.speakingTotal,
  formData.feedback.writingScores,
  formData.listeningMarks,
  formData.readingMarks,
  formData.writingMarks,
]);

  const handleSaveFeedback = async () => {
    if (!userId) {
      setSaveStatus("❌ User ID is missing.");
      return;
    }
    if (!scheduleId) {
      setSaveStatus("❌ Schedule ID is missing.");
      return;
    }

    if (!assignedTeacherEmail) {
      setSaveStatus("❌ Cannot save: No teacher assigned for this segment.");
      return;
    }
    if (!authorized) {
      setSaveStatus(`⛔ You are not authorized. Only ${assignedTeacherEmail} can save this segment.`);
      return;
    }
    if (lockedSegments[selectedSegment]) {
      setSaveStatus("⚠️ This segment has already been saved.");
      return;
    }
    if (marksError) {
      setSaveStatus("❌ Invalid input for marks (use integers 0–9).");
      return;
    }

    let feedbackPayload: any = "";
    let marksPayload: any = "";

    if (selectedSegment === "speaking") {
      const {
        speakingFeedback,
        speakingFC,
        speakingLR,
        speakingGRA,
        speakingPRO,
        speakingTotal, // ✅ manual total field
      } = formData;
    
      // validate subscores: 0–9, one decimal allowed
      const subs = [speakingFC, speakingLR, speakingGRA, speakingPRO];
      if (subs.some((v) => !isValidMark(v, /*allowEmpty*/ false))) {
        setSaveStatus("❌ Invalid input for marks (use 0–9; one decimal allowed).");
        return;
      }
    
      // require feedback + manual total
      if (!speakingFeedback.trim() || !speakingTotal.trim()) {
        setSaveStatus("❌ Please enter both feedback and total marks.");
        return;
      }
      if (!isValidMark(speakingTotal, /*allowEmpty*/ false)) {
        setSaveStatus("❌ Invalid input for total (use 0–9; one decimal allowed).");
        return;
      }
    
      feedbackPayload = speakingFeedback;
      marksPayload = {
        FC: speakingFC,
        LR: speakingLR,
        GRA: speakingGRA,
        PRO: speakingPRO,
        Total: speakingTotal, // ✅ send manual total
      };
    }
     else if (selectedSegment === "writing") {
      const {
        feedback: { writingScores, writingTask1, writingTask2, task1Notes, task2Notes },
      } = formData;

      const wsVals = Object.values(writingScores);
      const isMarksEmpty = wsVals.some((score) => !score.toString().trim());
      const isFeedbackEmpty =
        writingTask1.join("").trim() === "" && writingTask2.join("").trim() === "";

      if (isMarksEmpty || isFeedbackEmpty) {
        setSaveStatus("❌ Please enter both feedback and all writing scores.");
        return;
      }
      if (wsVals.some((v) => !isValidMark(v as string, /*allowEmpty*/ false))) {
        setSaveStatus("❌ Invalid input for marks (use 0–9; decimals allowed).");
        return;
      }
      

      feedbackPayload = { writingTask1, writingTask2, task1Notes, task2Notes };
      marksPayload = writingScores;
    } else {
      const marksValue = formData[`${selectedSegment}Marks`] || "";
      const feedbackValue = formData[`${selectedSegment}Feedback`] || "";

      if (!feedbackValue.trim() || !marksValue.trim()) {
        setSaveStatus("❌ Please enter both feedback and marks.");
        return;
      }
      if (!isValidMark(marksValue, /*allowEmpty*/ false)) {
        setSaveStatus("❌ Invalid input for marks (use 0–9; decimals allowed).");
        return;
      }
      

      feedbackPayload = feedbackValue;
      marksPayload = marksValue;
    }

    // admin holds the signature for speaking/writing; otherwise the admin name
    const admin =
      selectedSegment === "speaking"
        ? (formData.examinerSignature || "").trim() || "Unknown"
        : selectedSegment === "writing"
        ? (formData.examinerNotes || "").trim() || "Unknown"
        : localStorage.getItem("adminName") || "Unknown";

    if ((selectedSegment === "speaking" || selectedSegment === "writing") && admin === "Unknown") {
      setSaveStatus("✍️ Please enter the examiner’s signature.");
      setSaving(false);
      return;
    }

    try {
      setSaving(true);
      const response = await axios.post(`${API_BASE}/api/v1/admin/save-feedback`, {
        userId,
        scheduleId,
        segment: selectedSegment,
        feedback: feedbackPayload,
        marks: marksPayload,
        admin,
        adminEmail: loggedInEmail,
      });

      if (response.data?.success) {
        setLockedSegments((prev) => ({ ...prev, [selectedSegment]: true }));
        setSaveStatus("✅ Feedback saved successfully.");
      } else {
        setSaveStatus("⚠️ " + (response.data?.message || "Unknown error."));
      }
    } catch (err) {
      console.error("❌ Save error:", err);
      setSaveStatus("❌ Failed to save feedback. Please try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const savedCount = Object.values(lockedSegments).filter(Boolean).length;
  const progressPercent = (savedCount / segments.length) * 100;

  return (
    <div className="space-y-8">
      {!userId || !scheduleId ? (
        <div className="max-w-4xl mx-auto p-4 rounded-md border bg-yellow-50 text-yellow-800">
          Provide both <b>userId</b> and <b>scheduleId</b> in the URL query.
        </div>
      ) : null}

      {/* Feedback & Segments Section */}
      <div className="p-6 max-w-4xl mx-auto space-y-6 bg-white rounded-xl border shadow-lg">
        <h2 className="text-2xl font-bold mb-0">Feedback & Marks Segments</h2>

        {/* Progress Bar */}
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

        {/* Segment Selector */}
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

        {/* Feedback Box (hidden when unauthorized) */}
        {authorized ? (
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

            {/* SPEAKING */}
            {selectedSegment === "speaking" && (
              <>
                <table className="min-w-full text-center border border-gray-300 text-sm mb-2">
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
                      {["FC", "LR", "GRA", "PRO"].map((key) => (
                        <td key={key} className="border px-2 py-1">
                          <input
                            type="number"
                            step={1}
                            min={0}
                            max={9}
                            name={`speaking${key}`}
                            value={formData[`speaking${key}`] || ""}
                            onChange={handleChange}
                            disabled={lockedSegments.speaking}
                            className="w-16 px-1 py-0.5 border border-gray-300 text-sm text-center text-red-600"
                          />
                        </td>
                      ))}
                    {/* Total (manual, editable) */}
<td className="border px-2 py-1">
  <input
    type="number"
    step={0.5}          // allow 0.5 increments; use "any" if you want any decimal
    min={0}
    max={9}
    name="speakingTotal"
    value={formData.speakingTotal ?? ""}
    onChange={handleChange}
    disabled={lockedSegments.speaking}
    className="w-16 px-1 py-0.5 border border-gray-300 text-sm text-center text-red-600"
  />
</td>

                    </tr>
                  </tbody>
                </table>

                <textarea
                  name="speakingFeedback"
                  value={formData.speakingFeedback || ""}
                  onChange={(e) => {
                    const words = e.target.value.split(/\s+/).filter(Boolean);
                    if (words.length <= 300) {
                      handleChange(e);
                    }
                  }}
                  className="w-full border border-gray-600 rounded-md p-2 m-2 text-red-600 text-sm bg-white shadow-inner resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={5}
                  disabled={lockedSegments.speaking}
                  placeholder="Enter speaking feedback (max 300 words)..."
                />
                <p className="text-sm text-gray-600 mt-0 mb-3">
                  {(formData.speakingFeedback?.split(/\s+/).filter(Boolean).length || 0)}/300 words
                </p>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-4">
                    <label className="min-w-[200px] text-sm font-medium text-black">
                      Speaking Examiner’s Signature
                    </label>
                    <div className="border border-black px-3 py-1 text-red-600 text-sm font-semibold rounded w-[220px] text-center">
                      <textarea
                        rows={1}
                        disabled={lockedSegments.speaking}
                        readOnly={lockedSegments.speaking}
                        className={`w-full text-red-600 text-sm p-1 outline-none border-none ${
                          lockedSegments.speaking ? "bg-gray-100" : "bg-gray-50"
                        }`}
                        placeholder="Enter examiner's signature..."
                        value={formData.examinerSignature || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            examinerSignature: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* WRITING */}
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
                      {(["task1_overall", "task1_TA", "task1_CC", "task1_LR", "task1_GRA"] as (keyof WritingScores)[])
                        .map((key) => (
                        <td key={key} className="border border-black p-1">
                          <input
                            type="number"
                            step={1}
                            min={0}
                            max={9}
                            disabled={lockedSegments.writing}
                            className={`w-full h-8 text-center text-red-600 rounded border px-2 py-1 shadow-inner
                              focus:outline-none focus:ring-2 focus:ring-blue-500
                              ${lockedSegments.writing ? "bg-gray-100" : "bg-white"}`}
                            value={formData.feedback.writingScores[key]}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                feedback: {
                                  ...prev.feedback,
                                  writingScores: {
                                    ...prev.feedback.writingScores,
                                    [key]: e.target.value,
                                  },
                                },
                              }))
                            }
                          />
                        </td>
                      ))}
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
                            className={`w-full h-8 text-black text-sm rounded border 0 px-2 py-1 shadow-inner
                              focus:outline-none focus:ring-2 focus:ring-blue-500
                              ${lockedSegments.writing ? "bg-gray-100" : "bg-white"}`}
                            value={formData.feedback.task1Notes[i] || ""}
                            onChange={(e) => {
                              const updated = [...formData.feedback.task1Notes];
                              updated[i] = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                feedback: { ...prev.feedback, task1Notes: updated },
                              }));
                            }}
                          />
                        </td>
                      ))}
                    </tr>

                    <tr>
                      <td colSpan={5} className="border border-black p-2 text-left">
                        <textarea
                          rows={4}
                          disabled={lockedSegments.writing}
                          className="w-full border rounded-md p-1 m-0 text-red-600 text-sm bg-white shadow-inner resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={formData.feedback.writingTask1.join("\n")}
                          onChange={(e) => {
                            const words = e.target.value.split(/\s+/).filter(Boolean);
                            if (words.length <= 300) {
                              setFormData((prev) => ({
                                ...prev,
                                feedback: { ...prev.feedback, writingTask1: e.target.value.split("\n") },
                              }));
                            }
                          }}
                          placeholder="Enter Task 1 feedback (max 300 words)..."
                        />
                        <p className="text-sm text-gray-600 mt-0 mb-3 ml-2">
                          {(formData.feedback.writingTask1?.join(" ").split(/\s+/).filter(Boolean).length || 0)}/300 words
                        </p>
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
                      {(["task2_overall", "task2_TR", "task2_CC", "task2_LR", "task2_GRA"] as (keyof WritingScores)[])
                        .map((key) => (
                        <td key={key} className="border border-black p-1">
                          <input
                            type="number"
                            step={1}
                            min={0}
                            max={9}
                            disabled={lockedSegments.writing}
                            className={`w-full h-8 text-center text-red-600 rounded border px-2 py-1 shadow-inner
                              focus:outline-none focus:ring-2 focus:ring-blue-500
                              ${lockedSegments.writing ? "bg-gray-100" : "bg-white"}`}
                            value={formData.feedback.writingScores[key]}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                feedback: {
                                  ...prev.feedback,
                                  writingScores: {
                                    ...prev.feedback.writingScores,
                                    [key]: e.target.value,
                                  },
                                },
                              }))
                            }
                          />
                        </td>
                      ))}
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
                            className={`w-full h-8 text-black text-sm rounded border px-2 py-1 shadow-inner
                              focus:outline-none focus:ring-2 focus:ring-blue-500
                              ${lockedSegments.writing ? "bg-gray-100" : "bg-white"}`}
                            value={formData.feedback.task2Notes[i] || ""}
                            onChange={(e) => {
                              const updated = [...formData.feedback.task2Notes];
                              updated[i] = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                feedback: { ...prev.feedback, task2Notes: updated },
                              }));
                            }}
                          />
                        </td>
                      ))}
                    </tr>

                    <tr>
                      <td colSpan={5} className="border border-black p-2 text-left">
                        <textarea
                          rows={4}
                          disabled={lockedSegments.writing}
                          className="w-full border rounded-md p-1 m-0 text-red-600 text-sm bg-white shadow-inner resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={formData.feedback.writingTask2.join("\n")}
                          onChange={(e) => {
                            const words = e.target.value.split(/\s+/).filter(Boolean);
                            if (words.length <= 300) {
                              setFormData((prev) => ({
                                ...prev,
                                feedback: { ...prev.feedback, writingTask2: e.target.value.split("\n") },
                              }));
                            }
                          }}
                          placeholder="Enter Task 2 feedback (max 300 words)..."
                        />
                        <p className="text-sm text-gray-600 mt-0 mb-3 ml-2">
                          {(formData.feedback.writingTask2?.join(" ").split(/\s+/).filter(Boolean).length || 0)}/300 words
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-4">
                    <label className="min-w-[200px] text-sm font-medium text-black">
                      Writing Examiner’s Signature
                    </label>
                    <div className="border border-black px-3 py-1 text-red-600 text-sm font-semibold rounded w-[220px] text-center">
                      <textarea
                        rows={1}
                        disabled={lockedSegments.writing}
                        readOnly={lockedSegments.writing}
                        className={`w-full text-red-600 text-sm p-1 outline-none border-none ${
                          lockedSegments.writing ? "bg-gray-100" : "bg-gray-50"
                        }`}
                        placeholder="Enter examiner's signature..."
                        value={formData.examinerNotes || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            examinerNotes: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* READING/LISTENING */}
            {selectedSegment !== "writing" && selectedSegment !== "speaking" && (
              <>
                <div className="mb-2 flex items-center gap-2">
                  <label
                    htmlFor={`${selectedSegment}Marks`}
                    className="text-sm font-medium text-gray-700 min-w-[100px]">
                    Band Score:
                  </label>
                  <input
                    type="number"
                    step={1}
                    min={0}
                    max={9}
                    id={`${selectedSegment}Marks`}
                    name={`${selectedSegment}Marks`}
                    value={formData[`${selectedSegment}Marks`] || ""}
                    onChange={handleChange}
                    disabled={lockedSegments[selectedSegment]}
                    className="w-24 border border-gray-300 rounded px-1 py-1 text-sm text-red-600"
                  />
                </div>
                <textarea
                  name={`${selectedSegment}Feedback`}
                  value={formData[`${selectedSegment}Feedback`] || ""}
                  onChange={(e) => {
                    const words = e.target.value.split(/\s+/).filter(Boolean);
                    if (words.length <= 300) {
                      handleChange(e);
                    }
                  }}
                  className="w-full border border-gray-600 rounded-md p-2.5 m-2 text-red-600 text-sm bg-white shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={5}
                  disabled={lockedSegments[selectedSegment]}
                  placeholder={`Enter feedback for ${selectedSegment} (max 300 words)...`}
                />
                <p className="text-sm text-gray-600 mt-0 mb-3">
                  {(formData[`${selectedSegment}Feedback`]?.split(/\s+/).filter(Boolean).length || 0)}/300 words
                </p>
              </>
            )}

            {/* Marks error message (if any) */}
            {marksError && (
              <p className="text-sm font-medium text-red-600">{marksError}</p>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-md border bg-red-50 text-red-700 text-sm">
            You are not authorized.
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end mt-4">
          <button
            onClick={handleSaveFeedback}
            disabled={
              !authorized ||
              !!marksError ||
              lockedSegments[selectedSegment] ||
              saving ||
              !userId ||
              !scheduleId
            }
            title={
              !authorized
                ? "You are not authorized."
                : marksError
                ? "Invalid input for marks (use integers 0–9)."
                : undefined
            }
            className={`inline-flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium text-white ${
              (!authorized || !!marksError || lockedSegments[selectedSegment] || !userId || !scheduleId)
                ? "bg-gray-400 cursor-not-allowed opacity-70"
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
        </div>

        {saveStatus && (
          <p className="mt-4 text-sm font-medium text-center text-gray-700">{saveStatus}</p>
        )}
      </div>

      {userId &&
        scheduleId &&
        Object.keys(assignedTeachers).length > 0 &&
        !assignedTeachers[teacherKeyMap[selectedSegment]] && (
          <p className="text-red-600 text-sm mt-2 text-center">
            ⚠️ Feedback cannot be saved — teacher not assigned for this segment.
          </p>
        )}

      <ToastContainer />
    </div>
  );
};

export default TestReportForm;

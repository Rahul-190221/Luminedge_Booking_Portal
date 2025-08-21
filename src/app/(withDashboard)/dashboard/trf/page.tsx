"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import type { Options as H2COptions } from "html2canvas";

type Html2CanvasFn = (element: HTMLElement, options?: Partial<H2COptions>) => Promise<HTMLCanvasElement>;


import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from "chart.js";
// ⬇️ use the same helper you already use elsewhere
import { getUserIdOnlyFromToken } from "@/app/helpers/jwt";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

declare global {
  interface Window {
    __TRF_READY?: boolean;
  }
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") || "https://luminedge-server.vercel.app";

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

interface FormData {
  readingFeedback: string;
  listeningFeedback: string;
  readingMarks: string;
  writingMarks: string;
  listeningMarks: string;
  speakingMarks: string;
  speakingFC: string;
  speakingLR: string;
  speakingGRA: string;
  speakingPRO: string;
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
  centreName: string;
  testDate: string;
  lastName: string;
  firstName: string;
  dateOfBirth: string;
  sex: string;
  schemeCode: string;
  resultDate: string;
  overall: string;
  proficiency: string;
  comments: string;
  adminSignature: string;
  writingSign: string;
  speakingSign: string;
  feedback: {
    writingScores: WritingScores;
    writingTask1: string[];
    writingTask2: string[];
    task1Notes: string[];
    task2Notes: string[];
    speakingScores: {
      FC: string;
      LR: string;
      GRA: string;
      PRO: string;
      Total: string;
    };
    speakingNotes: string;
  };
}

const FinalTRFPage = () => {
  const searchParams = useSearchParams();
  const isPrint = searchParams.get("print") === "1";

  const trfRootRef = useRef<HTMLDivElement>(null);
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [lockedSegments, setLockedSegments] = useState<Record<SegmentKey, boolean>>({
    reading: false,
    writing: false,
    listening: false,
    speaking: false,
  });

  const [formData, setFormData] = useState<FormData>({
    readingFeedback: "",
    listeningFeedback: "",
    readingMarks: "",
    writingMarks: "",
    listeningMarks: "",
    speakingMarks: "",
    speakingFC: "",
    speakingLR: "",
    speakingGRA: "",
    speakingPRO: "",
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
    overall: "",
    proficiency: "",
    comments: "",
    adminSignature: "",
    writingSign: "",
    speakingSign: "",
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
      speakingScores: { FC: "", LR: "", GRA: "", PRO: "", Total: "" },
      speakingNotes: "",
    },
  });

  // ✅ Resolve user from JWT, not from query
  useEffect(() => {
    const id = getUserIdOnlyFromToken();
    if (!id) {
      toast.error("Please sign in again — no user found in token.");
    }
    setUserId(id || null);
  }, []);

  // fetch data when userId is available
  useEffect(() => {
    if (!userId) return;

    const fetchUserAndStatus = async () => {
      setLoading(true);
      try {
        const [feedbackRes, adminRes] = await Promise.all([
          axios.get(`${API_BASE}/api/v1/admin/feedback-status/${userId}`),
          axios.get(`${API_BASE}/api/v1/admin/get-admin-section/${userId}`),
        ]);

        if (!feedbackRes.data || !feedbackRes.data.success) {
          throw new Error(feedbackRes.data?.message || "Failed to fetch user status.");
        }
        if (!adminRes.data) {
          throw new Error("Failed to fetch admin section.");
        }

        const status = feedbackRes.data.status || {};
        const adminData = adminRes.data || {};

        const writingScores: WritingScores =
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
          };

        const updatedFormData: FormData = {
          firstName: status.firstName || "",
          lastName: status.lastName || "",
          dateOfBirth: status.dateOfBirth || "",
          sex: status.sex || "",
          centreName: status.centreName || adminData.centreName || "",
          testDate: status.testDate || adminData.testDate || "",
          schemeCode: status.schemeCode || adminData.schemeCode || "",
          resultDate: adminData.resultDate || "",
          overall:
            adminData.overallScore ||
            (status.listeningMarks &&
            status.readingMarks &&
            writingScores.task1_overall &&
            writingScores.task2_overall &&
            status.speakingMarks
              ? Math.round(
                  (parseFloat(status.listeningMarks || "0") +
                    parseFloat(status.readingMarks || "0") +
                    (parseFloat(writingScores.task1_overall || "0") +
                      parseFloat(writingScores.task2_overall || "0")) / 2 +
                    parseFloat(status.speakingMarks || "0")) /
                    4 /
                    0.5
                ) * 0.5
              : ""),
          proficiency: adminData.proficiencyLevel || "",
          comments: adminData.adminComments || "",
          adminSignature: adminData.adminSignature || "",
          readingFeedback: status.readingFeedback || "",
          listeningFeedback: status.listeningFeedback || "",
          readingMarks: status.readingMarks || "",
          writingMarks:
            writingScores.task1_overall && writingScores.task2_overall
              ? (
                  (parseFloat(writingScores.task1_overall || "0") +
                    parseFloat(writingScores.task2_overall || "0")) / 2
                ).toFixed(1)
              : writingScores.task1_overall || writingScores.task2_overall || "",
          listeningMarks: status.listeningMarks || "",
          speakingMarks: status.speakingMarks || "",
          speakingFC: status.speakingFC || "",
          speakingLR: status.speakingLR || "",
          speakingGRA: status.speakingGRA || "",
          speakingPRO: status.speakingPRO || "",
          writingTask1TA: writingScores.task1_TA || "",
          writingTask1CC: writingScores.task1_CC || "",
          writingTask1LR: writingScores.task1_LR || "",
          writingTask1GRA: writingScores.task1_GRA || "",
          writingTask1Feedback: status.writingTask1?.join("\n") || "",
          writingTask2TR: writingScores.task2_TR || "",
          writingTask2CC: writingScores.task2_CC || "",
          writingTask2LR: writingScores.task2_LR || "",
          writingTask2GRA: writingScores.task2_GRA || "",
          writingTask2Feedback: status.writingTask2?.join("\n") || "",
          writingSign: status.writingSign || "",
          speakingSign: status.speakingSign || "",
          feedback: {
            writingScores,
            writingTask1: status.writingTask1 || [],
            writingTask2: status.writingTask2 || [],
            task1Notes: status.task1Notes || ["", "", "", "", ""],
            task2Notes: status.task2Notes || ["", "", "", "", ""],
            speakingScores: {
              FC: status.speakingFC || "",
              LR: status.speakingLR || "",
              GRA: status.speakingGRA || "",
              PRO: status.speakingPRO || "",
              Total: status.speakingMarks || "",
            },
            speakingNotes: status.speakingFeedback || "",
          },
        };

        const updatedLocks: Record<SegmentKey, boolean> = {
          listening: !!status.listening,
          reading: !!status.reading,
          writing: !!status.writing,
          speaking: !!status.speaking,
        };

        setFormData(updatedFormData);
        setLockedSegments(updatedLocks);
      } catch (err: any) {
        console.error("Error fetching user and status:", err);
        toast.error(err?.message || "Failed to load user data.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndStatus();
  }, [userId]);

  useEffect(() => {
    if (!isPrint) return;
    const root = trfRootRef.current;
    if (!root) return;

    const waitForImages = () => {
      const imgs = Array.from(root.querySelectorAll("img"));
      return Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((resolve) => {
              if ((img as HTMLImageElement).complete) return resolve();
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            })
        )
      );
    };

    const settle = async () => {
      try {
        await new Promise((r) => setTimeout(r, 0));
        if (loading) {
          while (true) {
            await new Promise((r) => setTimeout(r, 50));
            if (!loading) break;
          }
        }
        await waitForImages();
        if ((document as any).fonts?.ready) {
          await (document as any).fonts.ready;
        }
      } finally {
        window.__TRF_READY = true;
      }
    };

    settle();
  }, [isPrint, loading]);


  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const safeValue = value || "";
    setFormData((prev) => {
      if (name.startsWith("feedback.")) {
        const field = name.split(".")[1];
        if (field === "writingTask1" || field === "writingTask2") {
          return {
            ...prev,
            feedback: { ...prev.feedback, [field]: safeValue.split("\n") },
          };
        }
        if (field === "speakingScores") {
          const subField = name.split(".")[2];
          return {
            ...prev,
            feedback: {
              ...prev.feedback,
              speakingScores: {
                ...prev.feedback.speakingScores,
                [subField]: safeValue,
              },
            },
          };
        }
        if (field === "speakingNotes") {
          return { ...prev, feedback: { ...prev.feedback, speakingNotes: safeValue } };
        }
        return { ...prev, feedback: { ...prev.feedback, [field]: safeValue } };
      } else if (name === "writingTask1Feedback") {
        return { ...prev, feedback: { ...prev.feedback, writingTask1: safeValue.split("\n") } };
      } else if (name === "writingTask2Feedback") {
        return { ...prev, feedback: { ...prev.feedback, writingTask2: safeValue.split("\n") } };
      } else if (name === "task1Notes" || name === "task2Notes") {
        const indexStr = (e.target as any).dataset.index;
        const index = indexStr ? parseInt(indexStr, 10) : -1;
        if (index >= 0 && index < 5) {
          const updatedNotes = [...(prev.feedback as any)[name]];
          updatedNotes[index] = safeValue;
          return { ...prev, feedback: { ...prev.feedback, [name]: updatedNotes } };
        }
        return prev;
      } else {
        return { ...prev, [name]: safeValue };
      }
    });
  };
// ---- constants (safe for SSR)
const PAGE_W = 794;
const PAGE_H = 1123;

// ---- styles (do NOT remove keep-bg/keep-bg-diag backgrounds)
const injectPrintStyles = (root: HTMLElement) => {
  const styleEl = document.createElement("style");
  styleEl.setAttribute("data-pdf-safe", "true");
  styleEl.textContent = `
    *, *::before, *::after {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      box-sizing: border-box;
      color: #000 !important;
      text-shadow: none !important;
      box-shadow: none !important;
    }
/* ---- PDF-only helpers (only exist in the cloned DOM used for PDF/print) ---- */
.pdf-mt-2 { margin-top: 0.5rem !important; } /* ≈ Tailwind mt-2 */

    /* Remove background images everywhere EXCEPT our stripe helpers */
    *:not(.keep-bg):not(.keep-bg-diag) { background-image: none !important; }
    *:not(.keep-bg):not(.keep-bg-diag)::before { background-image: none !important; }
    *:not(.keep-bg):not(.keep-bg-diag)::after  { background-image: none !important; }

    html, body { margin: 0; padding: 0; background: #fff !important; overflow: visible; }

    [data-trf-page] {
      width: ${PAGE_W}px; height: ${PAGE_H}px;
      background: #fff; border: 1px solid #000;
      page-break-after: always; overflow: hidden;
      padding: 20px;
    }

    [data-trf-page] label, [data-trf-page] .field-label { margin-right: 8px !important; }
    [data-trf-page] label + div,
    [data-trf-page] .field-label + div,
    [data-trf-page] label + .pdf-value { margin-left: 8px !important; }

    [data-trf-page] .pdf-field,
    [data-trf-page] .border.bg-gray-50,
    [data-trf-page] .tabular-nums,
    [data-trf-page] td > .bg-gray-50 {
      padding: 6px 10px !important;
      line-height: 1.25 !important;
      min-height: 24px !important;
      display: flex !important;
      align-items: center !important;
    }

    [data-trf-page] input,
    [data-trf-page] textarea,
    [data-trf-page] select {
      padding-left: 6px !important;
      padding-right: 6px !important;
      box-sizing: border-box !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
    }

    img { image-rendering: -webkit-optimize-contrast; max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #000 !important; padding: 4px; }
    hr { border: 0; border-top: 1px solid #000 !important; margin: 0; }

    .bg-gray-50 { background: #fff !important; }
    .text-red-600 { color: #ff0000 !important; }

    /* Ensure our replacement tiles repeat predictably */
    .keep-bg, .keep-bg-diag {
      background-repeat: repeat !important;
      background-size: 8px 8px !important;
      background-position: 0 0 !important;
    }
  `;
  root.prepend(styleEl);
};
const fixImagesForCORS = (root: HTMLElement) => {
  root.querySelectorAll("img").forEach((img) => {
    try {
      const el = img as HTMLImageElement;
      el.crossOrigin = "anonymous";
      el.src = el.src;
    } catch {}
  });
};

const ensureDimensions = (clone: HTMLElement) => {
  clone.style.width = `${PAGE_W}px`;
  clone.style.minWidth = `${PAGE_W}px`;
  clone.style.height = `${PAGE_H}px`;
  clone.style.minHeight = `${PAGE_H}px`;
  clone.style.background = "#fff";
  clone.style.boxSizing = "border-box";
  clone.style.overflow = "hidden";
};

const mountOffscreen = (node: HTMLElement) => {
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-100000px";
  wrapper.style.top = "0";
  wrapper.style.width = `${PAGE_W}px`;
  wrapper.appendChild(node);
  document.body.appendChild(wrapper);
  return wrapper;
};

/** Build a crisp 8x8 diagonal tile (2px black slash over white) */
const buildStripeTile = (reverse = false) => {
  const tile = document.createElement("canvas");
  tile.width = 8;
  tile.height = 8;
  const ctx = tile.getContext("2d")!;
  // white base
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 8, 8);
  // 2px black diagonal: align on pixel grid to avoid blur
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (!reverse) {
    // bottom-left to top-right (≈ -135deg CSS gradient visual)
    ctx.moveTo(-2, 8);
    ctx.lineTo(8, -2);
  } else {
    // top-left to bottom-right (≈ 135deg)
    ctx.moveTo(-2, 0);
    ctx.lineTo(8, 10);
  }
  ctx.stroke();
  return tile.toDataURL("image/png");
};

// ---- capture page (replaces gradients on clone with the tile)
const capturePageForPDF = async (
  source: HTMLElement,
  html2canvas: Html2CanvasFn
): Promise<HTMLCanvasElement> => {
  const CANVAS_SCALE = Math.max(2, Math.floor(window.devicePixelRatio || 2));

  const clone = source.cloneNode(true) as HTMLElement;
  injectPrintStyles(clone);
  fixImagesForCORS(clone);
  ensureDimensions(clone);

  const wrapper = mountOffscreen(clone);

  try {
    if ((document as any).fonts?.ready) await (document as any).fonts.ready;

    const canvas = await html2canvas(clone, {
      scale: CANVAS_SCALE,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: false,
      logging: false,
      width: PAGE_W,
      height: PAGE_H,
      windowWidth: PAGE_W,
      windowHeight: PAGE_H,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      onclone: (doc: Document) => {
        const urlMain = buildStripeTile(false);
        const urlRev  = buildStripeTile(true);

        const applyTile = (el: HTMLElement, url: string) => {
          el.style.setProperty("background-image", `url("${url}")`, "important");
          el.style.setProperty("background-repeat", "repeat", "important");
          el.style.setProperty("background-size", "8px 8px", "important");
          el.style.setProperty("background-position", "0 0", "important");
        };

        // Replace only our marked nodes
        doc.querySelectorAll<HTMLElement>(".keep-bg").forEach((el) => applyTile(el, urlMain));
        doc.querySelectorAll<HTMLElement>(".keep-bg-diag").forEach((el) => applyTile(el, urlRev));
      },
    });

    return canvas;
  } finally {
    document.body.removeChild(wrapper);
  }
};


// ---- wait until images on live DOM are ready (prevents half renders)
const waitForImagesOn = async (nodes: HTMLElement[]) => {
  const imgs = nodes.flatMap((n) => Array.from(n.querySelectorAll("img")));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          const el = img as HTMLImageElement;
          if (el.complete) return resolve();
          el.addEventListener("load", () => resolve(), { once: true });
          el.addEventListener("error", () => resolve(), { once: true });
        })
    )
  );
};

// ---- true A4 constants (millimeters)
const A4_W_MM = 210;
const A4_H_MM = 297;

// ---- export handler (maps your 794x1123 px page to full A4 mm)
const handleDownloadPDFFinalTRF = async () => {
  if (typeof window === "undefined") return;

  const p1 = page1Ref.current;
  const p2 = page2Ref.current;
  if (!p1 || !p2) {
    toast.error("Missing pages to export.");
    return;
  }

  try {
    setLoading(true);

    // Ensure live DOM assets ready before cloning & capture
    await waitForImagesOn([p1, p2]);
    if ((document as any).fonts?.ready) {
      await (document as any).fonts.ready;
    }

    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import("jspdf"),
      import("html2canvas"),
    ]);

    // Real A4 PDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const addCapturedPage = async (el: HTMLElement, isFirst: boolean) => {
      const canvas = await capturePageForPDF(el, html2canvas);
      const img = canvas.toDataURL("image/png");
      if (!isFirst) pdf.addPage("a4", "portrait");
      // Fill entire page; your PAGE_W/H share the A4 aspect closely
      pdf.addImage(img, "PNG", 0, 0, A4_W_MM, A4_H_MM);
    };

    await addCapturedPage(p1, true);
    await addCapturedPage(p2, false);

    pdf.save(`IELTS_TRF_${formData.firstName || "Candidate"}.pdf`);
    toast.success("PDF downloaded successfully");
  } catch (err) {
    console.error(err);
    toast.error("Failed to generate PDF");
  } finally {
    setLoading(false);
  }
};
// Render ISO dates as a single unbreakable token in PDF/output
const renderISO = (s?: string) => {
  if (!s) return "YYYY-MM-DD";                   // non-breaking hyphens in placeholder
  const compact = s.replace(/\s+/g, "");         // guard against stray spaces/newlines
  return compact.replace(/-/g, "\u2011");        // replace "-" with non-breaking hyphen
};
  return (
    <div
      ref={trfRootRef}
      className="p-4 flex flex-col items-center space-y-12"
      data-trf-root
    >
      {isPrint && (
        <style>{`
          @page { size: A4; margin: 0; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          html, body { background: #fff; }
        `}</style>
      )}

      {/* Guard when no token / user */}
      {!userId ? (
        <div className="w-[794px]">
          <p className="text-sm text-gray-600">Sign in to load your TRF.</p>
        </div>
      ) : (
        <>
          {/* Page 1 */}
          <div
            ref={page1Ref}
            data-trf-page="1"
            className="w-[794px] h-[1123px] bg-white border p-10 shadow-md text-sm overflow-hidden"
          >
          <div className="flex justify-between items-start pb-3">
  <div className="flex flex-col">
  <h1 className="text-5xl font-extrabold leading-none mt-4">
  IELTS<span className="align-top text-base">™</span>
</h1>

<h2 className="text-base font-semibold tracking-wide mt-0 pdf-mt-2">
  Test Report Form
</h2>


  </div>
  <div className="border border-black px-8 py-1 font-semibold text-sm tracking-wider mt-12 pdf-academic">
    ACADEMIC
  </div>
</div>


            <div className="text-xs leading-snug">
              <div className="flex">
                <strong className="mr-3 mt-6">NOTE</strong>
                <div className="border border-white p-0">
                  <p className="text-left">
                    Please write candidate details in CAPITAL letters only. Candidate details must exactly match
                    payment proof and mock booking information. Non-compliance may lead to the withholding of
                    mock test results and may also result in not receiving the speaking test schedule. Refer to the
                    reverse side of this TRF form for detailed examiner feedback
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[140px_1fr_100px_1fr] items-start gap-x-2 mt-2 mb-1 text-[11px] leading-tight">
              <label className="col-start-1 col-end-2 font-semibold pt-1 ml-10">Centre Name</label>
              <div className="border bg-gray-50 text-red-600 px-2 py-1 whitespace-pre-wrap pdf-field">
  {formData.centreName}
</div>

              <label className="col-start-3 col-end-4 font-semibold pt-1 text-right pr-0">Test Date</label>
              <div className="col-start-4   ml-4">
              <div
  className="border border-black px-2 py-[1px] text-red-600 text-[11px] h-[20px] w-[70%]
             flex items-center tabular-nums no-wrap pdf-field"
>
  {renderISO(formData.testDate) /* shows “YYYY-MM-DD” if empty */}
</div>




              </div>
            </div>
            <hr className="border-t border-[#00000f] my-4" />

            <div>
              <h2 className="font-bold mb-1">Candidate Details</h2>
              <div className="w-full max-w-[600px] mx-auto">
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-2 mb-3">
                    <label htmlFor="lastName" className="whitespace-nowrap ml-10 w-32">
                      Family Name
                    </label>
                    <div className="flex-1 border border-gray-400 px-2 py-1 text-red-600 text-sm bg-gray-50 w-[60%] whitespace-pre-wrap">
                      {formData.lastName}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <label htmlFor="firstName" className="whitespace-nowrap ml-10 w-32">
                      First Name
                    </label>
                    <div className="flex-1 border border-gray-400 px-2 py-1 text-red-600 text-sm bg-gray-50 w-[60%] whitespace-pre-wrap">
                      {formData.firstName}
                    </div>
                  </div>
                </div>
              </div>
              <hr className="border-t border-[#00000f] my-4" />
              <div className="grid grid-cols-3 gap-4 mt-2">
              <div className="flex items-center gap-2">
  <label className="whitespace-nowrap ml-3 w-28">Date of Birth</label>
  <div
    className="flex-1 border border-gray-400 px-2 py-1 text-red-600 text-sm bg-gray-50
               w-[60%] tabular-nums no-wrap pdf-field"
  >
    {renderISO(formData.dateOfBirth)}
  </div>
</div>

                <div className="flex items-center gap-2">
                  <label className="whitespace-nowrap ml-10 w-25">Sex (M/F)</label>
                  <div className="flex-1 border border-gray-400 px-2 py-1 text-red-600 text-sm bg-gray-50 w-[50%] whitespace-pre-wrap">
                    {formData.sex}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="whitespace-nowrap ml-4 w-25">Scheme Code</label>
                  <div className="flex-1 border border-gray-400 px-2 py-1 text-red-600 text-sm bg-gray-50 w-[60%] whitespace-pre-wrap">
                    {formData.schemeCode}
                  </div>
                </div>
              </div>
            </div>
            <hr className="border-t border-[#00000f] my-4" />

  {/* Test Results */}
  <div>
    <div className="flex justify-between items-center mb-2">
      <h2 className="font-bold text-sm">Test Results</h2>
      <div className="flex items-center gap-3 ml-4">
        <span className="text-xs font-semibold whitespace-nowrap">English Proficiency Level</span>
        <div className="w-20 border border-gray-400 px-1 py-0.5 text-red-600 text-sm bg-gray-50 whitespace-pre-wrap">
          {formData.proficiency || "—"}
        </div>
      </div>
    </div>

    <div className="grid grid-cols-5 gap-1">
      {[
        { label: "Listening", value: formData.listeningMarks },
        { label: "Reading", value: formData.readingMarks },
        { label: "Writing", value: formData.writingMarks },
        { label: "Speaking", value: formData.speakingMarks },
      ].map((item) => (
        <div key={item.label} className="flex items-center gap-1">
          <span className="whitespace-nowrap ml-2 w-14 text-xs font-semibold">{item.label}</span>
          <div className="w-[50%] border border-gray-400 px-2 py-1 text-red-600 text-sm bg-gray-50 whitespace-pre-wrap tabular-nums">
            {item.value || "—"}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-1">
        <span className="whitespace-nowrap ml-4 w-20 text-xs font-semibold leading-tight">
          Overall <br /> Band <br /> Score
        </span>
        <div className="w-[65%] border border-gray-400 px-3 py-1 text-red-600 text-sm bg-gray-50 whitespace-pre-wrap tabular-nums">
          {formData.overall || "—"}
        </div>
      </div>
    </div>

    <hr className="border-t border-[#00000f] my-4" />
  </div>

            <div className="grid grid-cols-10 gap-4 mt-0 mr-4 items-start">
              <div className="col-span-7 flex flex-col">
                <label className="text-sm font-semibold mb-1 ml-1">Administrator Comments</label>
                <div className="border border-gray-400 p-2 text-red-600 text-sm bg-gray-50 h-36 w-full overflow-auto whitespace-pre-wrap">
                  {formData.comments}
                </div>
              </div>
              <div className="col-span-3 flex flex-col">
                <div className="flex flex-col items-center justify-center border border-gray-600 rounded-md bg-white shadow-inner p-0">
                  <label className="text-sm font-semibold text-gray-800 block mb-0">Centre Stamp</label>
                  <div className="w-[160px] h-[145px]">
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
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-6 text-[11px]">
              <div className="flex items-center gap-3">
                <label className="whitespace-nowrap text-[13px] font-semibold w-48">
                  Writing Examiner&apos;s <br />
                  Signature
                </label>
                <div className="border border-gray-400 px-2 py-1 text-red-600 text-sm bg-gray-50 w-[220px] whitespace-pre-wrap">
                  {formData.writingSign}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="whitespace-nowrap text-[13px] font-semibold w-48">
                  Administrator&apos;s <br />
                  Signature
                </label>
                <div className="border border-gray-400 px-2 py-1 text-red-600 text-sm bg-gray-50 w-[220px] whitespace-pre-wrap">
                  {formData.adminSignature}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-2 text-[11px]">
              <div className="flex items-center gap-3">
                <label className="whitespace-nowrap text-[13px] font-semibold w-48">
                  Speaking Examiner&apos;s <br />
                  Signature
                </label>
                <div className="border border-gray-400 px-2 py-1 text-red-600 text-sm bg-gray-50 w-[220px] whitespace-pre-wrap">
                  {formData.speakingSign}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="whitespace-nowrap text-[13px] font-semibold w-48">
                  Result Publishing Date
                </label>
                <div className="border border-gray-400 px-2 py-1 text-red-600 bg-gray-50 text-[11px] h-[24px] w-[220px] flex items-center whitespace-pre-wrap">
                  {formData.resultDate || ""}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-end mt-6 px-10 py-3">
              <img src="/assets/british-council.png" alt="British Council" className="h-10 object-contain" />
              <div className="w-[15%] h-12 bg-white flex items-center justify-start px-2">
  <img
    src="/assets/logo1.png"
    alt="Luminedge"
    crossOrigin="anonymous"
    style={{
      maxHeight: "100%",   // fit inside h-12
      width: "auto",       // keep aspect ratio
      objectFit: "contain",
      display: "block"
    }}
  />
</div>

              <img src="/assets/cambridge.png" alt="Cambridge Assessment" className="h-12 object-contain" />
            </div>

            <hr className="border-t border-[#00000f] my-1" />
            <p className="text-[#00000f] text-[11.5px] pt-0 px-2">
              This IELTS Test Report Form, crafted by Luminedge Bangladesh, offers comprehensive feedback to Mock
              Test takers. It is important to note that this test report cannot be utilized as an Official IELTS Test
              Report.
            </p>
          </div>

          {/* Page 2 */}
          <div
            ref={page2Ref}
            data-trf-page="2"
            className="w-[794px] h-[1123px] bg-white border p-10 shadow-md text-sm overflow-hidden"
          >
         <div className="relative w-full mb-4">
  <div
    className="w-full h-6 keep-bg"
    style={{ backgroundImage: "repeating-linear-gradient(-135deg, #000 0 2px, #fff 2px 8px)" }}
  />
  <div className="absolute top-0 left-1/3 -translate-x-1/2 w-fit h-6 bg-white px-4 pdf-center z-8">
    <h2 className="text-xl font-bold text-[#00000f]">Examiner&apos;s Detailed Feedback</h2>
  </div>
</div>

<div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-2 text-[13px] text-[#00000f] items-stretch">
          <div className="space-y-4 h-full flex flex-col">
            <div>
              <h3 className="font-bold mb-1">Listening</h3>
              <div className="border border-[#00000f] p-2 text-red-600">
                <textarea
                  rows={3}
                  className="w-full bg-gray-50 text-red-600 text-sm p-1"
                  name="listeningFeedback"
                  value={formData.listeningFeedback}
                  onChange={handleChange}
                  placeholder="Enter listening feedback..."
                  disabled={lockedSegments.listening || isPrint}
                />
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-1">Reading</h3>
              <div className="border border-[#00000f] p-2 text-red-600">
                <textarea
                  rows={3}
                  className="w-full bg-gray-50 text-red-600 text-sm p-1"
                  name="readingFeedback"
                  value={formData.readingFeedback}
                  onChange={handleChange}
                  placeholder="Enter reading feedback..."
                  disabled={lockedSegments.reading || isPrint}
                />
              </div>
            </div>

            <div>
              <h3 className="font-bold ">Speaking</h3>
              <table className="table-fixed w-full border border-black text-center text-[12px] mb-0">
                <thead>
                  <tr className="border border-black font-semibold">
                    {["FC", "LR", "GRA", "PRO", "Total"].map((label) => (
                      <th key={label} className="border border-black p-1">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-red-600">
                  <tr>
                    {["FC", "LR", "GRA", "PRO", "Total"].map((field) => (
                      <td key={field} className="border border-black p-1">
                        <input
                          type="text"
                          name={`feedback.speakingScores.${field}`}
                          value={
                            formData.feedback.speakingScores[
                              field as keyof typeof formData.feedback.speakingScores
                            ]
                          }
                          onChange={handleChange}
                          className="w-full bg-gray-50 text-red-600 text-sm p-1 text-center"
                          disabled={lockedSegments.speaking || isPrint}
                        />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td colSpan={5} className="border border-black p-2 text-left">
                      <textarea
                        rows={4}
                        className="w-full bg-gray-50 text-red-600 text-sm p-1"
                        name="feedback.speakingNotes"
                        value={formData.feedback.speakingNotes}
                        onChange={handleChange}
                        placeholder="Enter speaking feedback notes..."
                        disabled={lockedSegments.speaking || isPrint}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="h-full flex flex-col justify-between">
            <div>
              <h3 className="font-bold mb-1">Writing</h3>
              <table className="table-fixed w-full border border-black text-center text-[12px] mb-2">
                <thead>
                  <tr className="border border-black font-semibold bg-gray-100 h-8">
                    <th className="border border-black p-1">Task 1</th>
                    <th className="border border-black p-1">TA</th>
                    <th className="border border-black p-1">CC</th>
                    <th className="border border-black p-1">LR</th>
                    <th className="border border-black p-1">GRA</th>
                  </tr>
                </thead>
                <tbody className="text-red-600">
                  <tr className="h-8">
                    {["task1_overall", "task1_TA", "task1_CC", "task1_LR", "task1_GRA"].map((key) => (
                      <td key={key} className="border border-black p-1">
                        <input
                          type="text"
                          name={`feedback.writingScores.${key}`}
                          value={formData.feedback.writingScores[key as keyof WritingScores]}
                          onChange={handleChange}
                          className="w-full text-center bg-gray-50 text-red-600"
                          disabled={lockedSegments.writing || isPrint}
                        />
                      </td>
                    ))}
                  </tr>
                  <tr className="text-[11px] text-[#00000f] h-8 p-1">
  <td className="border border-black p-1 w-[200px] whitespace-nowrap">Under length</td>
  <td className="border border-black p-1 w-[200px] whitespace-nowrap">No. of words</td>
  <td className="border border-black p-1 w-[180px] whitespace-nowrap">Penalty</td>
  <td className="border border-black p-1 w-[180px] whitespace-nowrap">Off-topic</td>
  <td className="border border-black p-1 w-[180px] whitespace-nowrap">Memorised</td>
</tr>

<tr className="h-7">
                        {[...Array(5)].map((_, i) => (
                          <td key={i} className="border border-black p-1">
                            <div className="w-full bg-gray-50 text-black text-sm whitespace-pre-wrap">
                              {formData.feedback.task1Notes[i]}
                            </div>
                          </td>
                        ))}
                      </tr>
                  <tr className="h-8">
                    <td colSpan={5} className="border border-black p-2 text-left">
                      <textarea
                        rows={3}
                        className="w-full bg-gray-50 text-red-600 text-sm p-1"
                        name="writingTask1Feedback"
                        value={formData.writingTask1Feedback}
                        onChange={handleChange}
                        placeholder="Enter Task 1 feedback notes..."
                        disabled={lockedSegments.writing || isPrint}
                      />
                    </td>
                  </tr>
                  <tr className="text-[#00000f] font-semibold bg-gray-100 h-8">
                    <th className="border border-black p-1">Task 2</th>
                    <th className="border border-black p-1">TA</th>
                    <th className="border border-black p-1">CC</th>
                    <th className="border border-black p-1">LR</th>
                    <th className="border border-black p-1">GRA</th>
                  </tr>
                  <tr className="h-8">
                    {["task2_overall", "task2_TR", "task2_CC", "task2_LR", "task2_GRA"].map((key) => (
                      <td key={key} className="border border-black p-1">
                        <input
                          type="text"
                          name={`feedback.writingScores.${key}`}
                          value={formData.feedback.writingScores[key as keyof WritingScores]}
                          onChange={handleChange}
                          className="w-full text-center bg-gray-50 text-red-600"
                          disabled={lockedSegments.writing || isPrint}
                        />
                      </td>
                    ))}
                  </tr>
                  <tr className="text-[11px] text-[#00000f] h-8">
  <td className="border border-black p-1 w-[200px] whitespace-nowrap">Under length</td>
  <td className="border border-black p-1 w-[200px] whitespace-nowrap">No. of words</td>
  <td className="border border-black p-1 w-[180px] whitespace-nowrap">Penalty</td>
  <td className="border border-black p-1 w-[180px] whitespace-nowrap">Off-topic</td>
  <td className="border border-black p-1 w-[180px] whitespace-nowrap">Memorised</td>
</tr>


<tr className="h-8">
                        {[...Array(5)].map((_, i) => (
                          <td key={i} className="border border-black p-1">
                            <div className="w-full bg-gray-50 text-black text-sm whitespace-pre-wrap">
                              {formData.feedback.task2Notes[i]}
                            </div>
                          </td>
                        ))}
                      </tr>
                  <tr>
                    <td colSpan={5} className="border border-black p-2 text-left">
                      <textarea
                        rows={3}
                        className="w-full bg-gray-50 text-red-600 text-sm p-1"
                        name="writingTask2Feedback"
                        value={formData.writingTask2Feedback}
                        onChange={handleChange}
                        placeholder="Enter Task 2 feedback notes..."
                        disabled={lockedSegments.writing || isPrint}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
            <div className="relative w-full mb-4">
  {/* Stripe background */}
  <div
    className="w-full h-6 keep-bg"
    style={{
      backgroundImage: "repeating-linear-gradient(-135deg, #000 0 2px, #fff 2px 8px)",
    }}
  />
  {/* Centered title over the stripe */}
  <div className="absolute top-0 left-0 w-full h-6 flex items-center justify-center z-8">
    <div className="bg-white px-4 flex items-center justify-center">
      <h2 className="text-xl font-bold text-[#00000f]">
        Services we offer
      </h2>
    </div>
  </div>
</div>


            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 text-[13px] text-[#00000f]">
              <div>
                <h4 className="font-bold">IELTS Premium Course</h4>
                <p>2 Months long</p>
                <p>24 Classes</p>
                <p>5 Mock Tests</p>
                <p>Cambridge IELTS Book Set</p>
              </div>
              <div>
                <h4 className="font-bold">IELTS Crash Course</h4>
                <p>1 Month long</p>
                <p>24 Intensive Classes</p>
                <p>3 Mock Tests</p>
                <p>Cambridge IELTS Book Set</p>
              </div>
              <div>
                <h4 className="font-bold">IELTS Mock Test Packages</h4>
                <p>* Single Mock Test</p>
                <p>* Package of 3 IELTS Mocks</p>
                <p>* Package of 5 IELTS Mocks</p>
                <p>* Result publishes within 48 hours</p>
                <p>* Get FREE after mock counselling from IELTS trainer</p>
              </div>
              <div>
                <h4 className="font-bold">IELTS Ready Course</h4>
                <p>3 Months long</p>
                <p>48 Classes</p>
                <p>5 Mock Tests</p>
                <p>9 Assessment Tests</p>
              </div>
              <div>
                <h4 className="font-bold">IELTS for Elementary</h4>
                <p>4 Months long</p>
                <p>72 Classes</p>
                <p>5 Mock Tests</p>
                <p>13 Assessment Tests</p>
              </div>
            </div>

          {/* This container is 714px wide inside the page (794 - 40 - 40 from p-10).
    Columns: 72px (band) + 108px (logo) + 1fr (text) */}
<div className="w-full grid grid-cols-[72px_108px_1fr] items-center gap-3">
  {/* Left diagonal band with gradient stripes */}
  <div
    className="h-8 keep-bg"
    style={{
      backgroundImage:
        "repeating-linear-gradient(-135deg, #000 0 2px, #fff 2px 8px)",
    }}
    aria-hidden="true"
  />

  {/* Center logo box */}
  <div className="h-[110px] bg-white flex items-center justify-center px-2">
    <img
      src="/assets/logo1.png"
      alt="Luminedge"
      className="max-h-[100px] w-auto object-contain"
      crossOrigin="anonymous"
    />
  </div>

  {/* Right copy */}
  <div className="px-2 text-[13px] text-[#00000f] leading-tight text-justify">
    Luminedge stores mock test copies for one month only. To review, candidates must visit
    the office within this period, and taking mock questions is not permitted.
  </div>
</div>




            <div className="flex justify-center items-end mt-0 px-10 py-0">
              <img src="/assets/ieltslogo.png" alt="British Council" className="h-14 object-contain" />
            </div>
          </div>

          {/* PDF-only view: no score chart */}
          {saveStatus && <p className="text-sm text-green-600">{saveStatus}</p>}
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleDownloadPDFFinalTRF}
              className="mt-6 px-6 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
            >
              Download PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default FinalTRFPage;

"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Bar } from "react-chartjs-2";
import type { Options as H2COptions } from "html2canvas";

type Html2CanvasFn = (
  element: HTMLElement,
  options?: Partial<H2COptions>
) => Promise<HTMLCanvasElement>;

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

declare global {
  interface Window {
    __TRF_READY?: boolean;
  }
}

// ----------------- helpers -----------------
const _toDate = (v: unknown): Date | null => {
  if (v instanceof Date) return isNaN(+v) ? null : v;
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v as any);
    return isNaN(+d) ? null : d;
  }
  if (v && typeof v === "object") {
    const o = v as any;
    if (o.$date != null) {
      const d = new Date(o.$date);
      return isNaN(+d) ? null : d;
    }
    if (typeof o.seconds === "number") {
      const d = new Date(o.seconds * 1000);
      return isNaN(+d) ? null : d;
    }
    if (typeof o.toDate === "function") {
      const d = o.toDate();
      return d instanceof Date && !isNaN(+d) ? d : null;
    }
  }
  return null;
};

// Accepts ISO strings, epoch ms, Date, Mongo {$date}, Firestore {seconds}, or objects with toDate()
type AnyDate =
  | string
  | number
  | Date
  | { $date?: any }
  | { seconds?: number }
  | { toDate?: () => Date };

// Normalize to "YYYY-MM-DD" (or "" if invalid)
const toYMD = (v: AnyDate | undefined | null): string => {
  const d = _toDate(v ?? null);
  return d ? d.toISOString().slice(0, 10) : "";
};

// (Optional) legacy dd-MM-yyyy → ISO
const toYMDLoose = (v: any): string => {
  if (typeof v === "string" && /^\d{2}-\d{2}-\d{4}$/.test(v)) {
    const [dd, mm, yyyy] = v.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }
  return toYMD(v);
};

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://luminedge-server.vercel.app"
).replace(/\/$/, "");

type SegmentKey = "listening" | "reading" | "writing" | "speaking";

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

// ⚠️ Renamed to avoid collision with DOM FormData
interface TRFFormData {
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

// Extract an email address from a string if needed
const extractEmail = (s?: string | null) =>
  typeof s === "string"
    ? s.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null
    : null;

const FinalTRFPage = () => {
  const searchParams = useSearchParams();
  const isPrint = searchParams.get("print") === "1";
  const urlUserId = searchParams.get("userId");
  const urlScheduleId = searchParams.get("scheduleId");

  const trfRootRef = useRef<HTMLDivElement>(null);
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const [lockedSegments, setLockedSegments] = useState<Record<SegmentKey, boolean>>({
    reading: false,
    writing: false,
    listening: false,
    speaking: false,
  });

  const [formData, setFormData] = useState<TRFFormData>({
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

  // ---------- static boxes for screen/print ----------
  const StaticBox: React.FC<{ className?: string; children?: any }> = ({
    className = "",
    children,
  }) => (
    <div
      className={
        "border border-black bg-gray-50 text-red-600 text-sm px-2 py-1 min-h-[24px] flex items-center whitespace-pre-wrap " +
        className
      }
    >
      {children ?? "—"}
    </div>
  );

  const StaticCell: React.FC<{ children?: any }> = ({ children }) => (
    <div className="w-full text-center bg-gray-50 text-red-600 p-1 min-h-[24px] flex items-center justify-center">
      {children ?? "—"}
    </div>
  );

  // ---------- load data ----------
  useEffect(() => {
    if (!urlUserId || !urlScheduleId) {
      toast.error("Missing userId or scheduleId in URL.");
      return;
    }

    const fetchUserAndStatus = async () => {
      setLoading(true);
      try {
        const [feedbackRes, adminRes, bookingsRes, userRes] = await Promise.all([
          axios.get(`${API_BASE}/api/v1/admin/feedback-status/${urlUserId}/${urlScheduleId}`),
          axios.get(`${API_BASE}/api/v1/admin/get-admin-section/${urlUserId}/${urlScheduleId}`),
          axios.get(`${API_BASE}/api/v1/user/bookings/${urlUserId}`),
          axios.get(`${API_BASE}/api/v1/user/status/${urlUserId}`),
        ]);

        if (!feedbackRes.data || !feedbackRes.data.status) {
          throw new Error(feedbackRes.data?.message || "Failed to fetch feedback/status.");
        }

        const status = feedbackRes.data.status || {};
        const adminData = adminRes.data || {};

        const bookings: any[] = bookingsRes.data?.bookings || [];
        const matchedBooking = bookings.find(
          (b) => String(b.scheduleId) === String(urlScheduleId)
        );
        const testDateFromBooking = matchedBooking?.bookingDate;

        const userDoc = userRes.data?.user || {};
        const dobRaw = userDoc.dateOfBirth ?? userDoc.dateofbirth ?? status.dateOfBirth;

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

        // --- FIX: always snap writing marks to half-band ---
        const normalizeHalf = (x: string) => {
          const n = parseFloat(x);
          return Number.isFinite(n) ? (Math.round(n * 2) / 2).toFixed(1) : "";
        };

        // Weighted Writing: (T1 + 2*T2) / 3, rounded to nearest 0.5
        const t1 = parseFloat(writingScores.task1_overall || "0");
        const t2 = parseFloat(writingScores.task2_overall || "0");
        const hasWriting = !!writingScores.task1_overall && !!writingScores.task2_overall;

        const writingWeighted = hasWriting
          ? Math.round(((t1 + 2 * t2) / 3) * 2) / 2
          : NaN;

        // Overall: average of L, R, weighted Writing, S → rounded to nearest 0.5
        const L = parseFloat(status.listeningMarks || "0");
        const R = parseFloat(status.readingMarks || "0");
        const S = parseFloat(status.speakingMarks || "0");

        const overallStr =
          adminData.overallScore ??
          (status.listeningMarks &&
          status.readingMarks &&
          hasWriting &&
          status.speakingMarks
            ? (Math.round(((L + R + writingWeighted + S) / 4) * 2) / 2).toFixed(1)
            : "");

        // keep writingMarks in formData in sync with the weighted result
        const writingAvg = hasWriting
          ? (Math.round(writingWeighted * 2) / 2).toFixed(1)
          : normalizeHalf(writingScores.task1_overall) ||
            normalizeHalf(writingScores.task2_overall);

        setFormData({
          firstName: status.firstName || "",
          lastName: status.lastName || "",
          dateOfBirth: toYMD(dobRaw),
          sex: status.sex || "",
          centreName: status.centreName || adminData.centreName || "",
          testDate: toYMD(testDateFromBooking || status.testDate || adminData.testDate),
          schemeCode: status.schemeCode || adminData.schemeCode || "",
          resultDate: toYMD(adminData.resultDate),
          overall: overallStr || "",
          proficiency: adminData.proficiencyLevel || "",
          comments: adminData.adminComments || "",
          adminSignature: adminData.adminSignature || "",
          readingFeedback: status.readingFeedback || "",
          listeningFeedback: status.listeningFeedback || "",
          readingMarks: status.readingMarks || "",
          writingMarks: writingAvg,
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
        });

        setLockedSegments({
          listening: !!status.listening,
          reading: !!status.reading,
          writing: !!status.writing,
          speaking: !!status.speaking,
        });
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "Failed to load TRF data.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndStatus();
  }, [urlUserId, urlScheduleId]);

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
              const el = img as HTMLImageElement;
              if (el.complete) return resolve();
              el.addEventListener("load", () => resolve(), { once: true });
              el.addEventListener("error", () => resolve(), { once: true });
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
        if ((document as any).fonts?.ready) await (document as any).fonts.ready;
      } finally {
        window.__TRF_READY = true;
      }
    };

    settle();
  }, [isPrint, loading]);

  // ---------- handlers ----------
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const safeValue = value || "";
    setFormData((prev) => {
      if (name.startsWith("feedback.")) {
        const field = name.split(".")[1];
        if (field === "writingTask1" || field === "writingTask2") {
          return { ...prev, feedback: { ...prev.feedback, [field]: safeValue.split("\n") } };
        }
        if (field === "speakingScores") {
          const subField = name.split(".")[2];
          return {
            ...prev,
            feedback: {
              ...prev.feedback,
              speakingScores: { ...prev.feedback.speakingScores, [subField]: safeValue },
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

  // ---- styles for clone (preserve your Tailwind paddings/metrics)
  const injectPrintStyles = (root: HTMLElement) => {
    const styleEl = document.createElement("style");
    styleEl.setAttribute("data-pdf-safe", "true");
    styleEl.textContent = `
      *, *::before, *::after {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        color: #000 !important;
        text-shadow: none !important;
        box-shadow: none !important;
      }
      .pdf-mt-2 { margin-top: 0.5rem !important; }
      /* PDF-only spacing helpers */
      .pdf-mb-1 { margin-bottom: 0.5rem !important; }

      *:not(.keep-bg):not(.keep-bg-diag) { background-image: none !important; }
      *:not(.keep-bg):not(.keep-bg-diag)::before { background-image: none !important; }
      *:not(.keep-bg):not(.keep-bg-diag)::after  { background-image: none !important; }

      html, body { margin: 0; padding: 0; background: #fff !important; overflow: visible; }

      [data-trf-page] {
        width: ${PAGE_W}px; height: ${PAGE_H}px;
        background: #fff; border: 1px solid #000;
        page-break-after: always; overflow: hidden;
      }

      .pdf-field { white-space: pre-wrap !important; }

      img { image-rendering: -webkit-optimize-contrast; max-width: 100%; height: auto; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #000 !important; padding: 4px; }
      hr { border: 0; border-top: 1px solid #000 !important; margin: 0; }

      .bg-gray-50 { background: #fff !important; align-items: flex-start !important; }
      .text-red-600 { color: #ff0000 !important; }

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

  /** 8x8 diagonal tile (2px black slash on white) */
  const buildStripeTile = (reverse = false) => {
    const tile = document.createElement("canvas");
    tile.width = 8;
    tile.height = 8;

    const ctx = tile.getContext(
      "2d",
      { willReadFrequently: true } as CanvasRenderingContext2DSettings
    ) as CanvasRenderingContext2D | null;

    if (!ctx) return tile.toDataURL("image/png");

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 8, 8);

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (!reverse) {
      ctx.moveTo(-2, 8);
      ctx.lineTo(8, -2);
    } else {
      ctx.moveTo(-2, 0);
      ctx.lineTo(8, 10);
    }
    ctx.stroke();

    return tile.toDataURL("image/png");
  };

  // ---- capture page (replace gradients and controls on clone)
  const capturePageForPDF = async (source: HTMLElement, html2canvas: Html2CanvasFn) => {
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
          const urlRev = buildStripeTile(true);
          const applyTile = (el: HTMLElement, url: string) => {
            el.style.setProperty("background-image", `url("${url}")`, "important");
            el.style.setProperty("background-repeat", "repeat", "important");
            el.style.setProperty("background-size", "8px 8px", "important");
            el.style.setProperty("background-position", "0 0", "important");
          };
          doc.querySelectorAll<HTMLElement>(".keep-bg").forEach((el) => applyTile(el, urlMain));
          doc.querySelectorAll<HTMLElement>(".keep-bg-diag").forEach((el) => applyTile(el, urlRev));

          // Replace form controls with static divs that COPY GEOMETRY
          const controls = Array.from(
            doc.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
              "input, textarea, select"
            )
          );

          controls.forEach((el) => {
            if (el.tagName === "INPUT" && (el as HTMLInputElement).type === "hidden") return;

            let text = "";
            if (el.tagName === "SELECT") {
              const sel = el as HTMLSelectElement;
              text = sel.options[sel.selectedIndex]?.text ?? sel.value ?? "";
            } else {
              text = (el as HTMLInputElement | HTMLTextAreaElement).value ?? "";
            }

            const box = doc.createElement("div");
            box.className = "pdf-field bg-gray-50 text-red-600 text-sm";
            box.textContent = text || "—";

            const cs = (doc.defaultView || window).getComputedStyle(el);

            // Copy full box model + text metrics to preserve layout exactly
            box.style.boxSizing     = cs.boxSizing;
            box.style.display       = cs.display;
            box.style.width         = cs.width;
            box.style.height        = cs.height;
            box.style.minHeight     = cs.height;
            box.style.paddingTop    = cs.paddingTop;
            box.style.paddingRight  = cs.paddingRight;
            box.style.paddingBottom = cs.paddingBottom;
            box.style.paddingLeft   = cs.paddingLeft;
            box.style.marginTop     = cs.marginTop;
            box.style.marginRight   = cs.marginRight;
            box.style.marginBottom  = cs.marginBottom;
            box.style.marginLeft    = cs.marginLeft;
            box.style.borderTop     = cs.borderTop;
            box.style.borderRight   = cs.borderRight;
            box.style.borderBottom  = cs.borderBottom;
            box.style.borderLeft    = cs.borderLeft;
            box.style.textAlign     = cs.textAlign;
            box.style.lineHeight    = cs.lineHeight;

            if (el.classList.contains("text-center")) {
              box.style.textAlign = "center";
            }

            el.replaceWith(box);
          });
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

  // ---- A4 millimeters
  const A4_W_MM = 210;
  const A4_H_MM = 297;

  // ---- export handler
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

      await waitForImagesOn([p1, p2]);
      if ((document as any).fonts?.ready) await (document as any).fonts.ready;

      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const addCapturedPage = async (el: HTMLElement, isFirst: boolean) => {
        const canvas = await capturePageForPDF(el, html2canvas as unknown as Html2CanvasFn);
        const img = canvas.toDataURL("image/png");
        if (!isFirst) pdf.addPage("a4", "portrait");
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

  // Render ISO dates with non-breaking hyphens
  const renderISO = (s?: string) => {
    if (!s) return "YYYY-MM-DD";
    const compact = s.replace(/\s+/g, "");
    return compact.replace(/-/g, "\u2011");
  };

  const handleEmailTRF = async () => {
    if (typeof window === "undefined") return;
    if (!urlUserId || !urlScheduleId) {
      toast.error("Missing userId or scheduleId in URL.");
      return;
    }

    const p1 = page1Ref.current;
    const p2 = page2Ref.current;
    if (!p1 || !p2) {
      toast.error("Missing pages to export.");
      return;
    }

    try {
      setSendingEmail(true);

      await waitForImagesOn([p1, p2]);
      if ((document as any).fonts?.ready) await (document as any).fonts.ready;

      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const addCapturedPage = async (el: HTMLElement, isFirst: boolean) => {
        const canvas = await capturePageForPDF(el, html2canvas as unknown as Html2CanvasFn);
        const img = canvas.toDataURL("image/png");
        if (!isFirst) pdf.addPage("a4", "portrait");
        pdf.addImage(img, "PNG", 0, 0, A4_W_MM, A4_H_MM);
      };

      await addCapturedPage(p1, true);
      await addCapturedPage(p2, false);

      const blob = pdf.output("blob");
      const filename = `IELTS_TRF_${formData.firstName || "Candidate"}.pdf`;
      const file = new File([blob], filename, { type: "application/pdf" });

      const form = new FormData();
      form.append("file", file);

      // Let the browser set the correct multipart boundary
      const res = await axios.post(
        `${API_BASE}/api/v1/admin/send-trf-email/${urlUserId}/${urlScheduleId}`,
        form
      );

      const { success, message, to, userEmail, email, user } = (res?.data || {}) as any;
      if (success) {
        const who = to || userEmail || email || user?.email || extractEmail(message);
        toast.success(
          who ? `Email sent successfully to ${who}.` : "Email sent successfully."
        );
      } else {
        throw new Error(message || "Failed to send email.");
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.message || err?.message || "Failed to send email.";
      toast.error(msg);
    } finally {
      setSendingEmail(false);
    }
  };

  const chartData = {
    labels: ["Listening", "Reading", "Writing", "Speaking", "Overall"],
    datasets: [
      {
        label: "IELTS Scores",
        data: [
          parseFloat(formData.listeningMarks) || 0,
          parseFloat(formData.readingMarks) || 0,
          parseFloat(formData.writingMarks) || 0,
          parseFloat(formData.speakingMarks) || 0,
          (() => {
            if (formData.overall) return parseFloat(formData.overall) || 0;
            const l = parseFloat(formData.listeningMarks || "0");
            const r = parseFloat(formData.readingMarks || "0");
            const w = parseFloat(formData.writingMarks || "0");
            const s = parseFloat(formData.speakingMarks || "0");
            const avg = (l + r + w + s) / 4;
            return Math.round(avg * 2) / 2;
          })(),
        ],
        backgroundColor: ["#2563EB", "#16A34A", "#CA8A04", "#DC2626", "#6B7280"],
        borderColor: ["#1E3A8A", "#15803D", "#B45309", "#B91C1C", "#4B5563"],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div ref={trfRootRef} className="p-4 flex flex-col items-center space-y-12" data-trf-root>
      {isPrint && (
        <style>{`
          @page { size: A4; margin: 0; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          html, body { background: #fff; }
        `}</style>
      )}

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
            <h2 className="text-base font-semibold tracking-wide mt-0 pdf-mt-2">Test Report Form</h2>
          </div>

          <div className="border border-black px-8 py-1 font-semibold text-sm tracking-wider mt-12">
            ACADEMIC
          </div>
        </div>

        <div className="text-xs leading-snug">
          <div className="flex">
            <strong className="mr-3 mt-6">NOTE</strong>
            <div className="border border-white p-0">
              <p className="text-left text-sm">
                Please write candidate details in CAPITAL letters only. Candidate details must exactly
                match payment proof and mock booking information. Non-compliance may lead to the
                withholding of mock test results and may also result in not receiving the speaking
                test schedule. Refer to the reverse side of this TRF form for detailed examiner feedback.
              </p>
            </div>
          </div>
        </div>

        {/* Centre/Test Date row — ROOMY */}
        <div className="grid grid-cols-[160px_1fr_120px_1fr] items-center gap-x-0 mt-2 mb-0 leading-tight">
          <label className="col-start-1 col-end-2 tracking-wide text-base pt-1 ml-8">
            Centre Name
          </label>

          <StaticBox className="text-base !min-h-[24px] px-6">{formData.centreName}</StaticBox>

          <label className="col-start-3 col-end-4 tracking-wide text-base pt-1 text-right">
            Test Date
          </label>

          <div className="col-start-4 ml-4">
            <div className="border border-black px-4 py-[2px] text-red-600 text-base h-[28px] w-[75%] flex items-center tabular-nums whitespace-nowrap pdf-field">
              {renderISO(formData.testDate)}
            </div>
          </div>
        </div>

        <hr className="border-t border-[#00000f] my-4" />

        {/* Candidate Details */}
        <div>
          <h2 className="font-bold mb-1">Candidate Details</h2>
          <div className="w-full max-w-[600px] mx-auto">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center gap-2 mb-3">
                <label htmlFor="lastName" className="whitespace-nowrap ml-10 w-32">
                  Family Name
                </label>
                <div className="flex-1">
                  <StaticBox className="w-[60%]">{formData.lastName}</StaticBox>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <label htmlFor="firstName" className="whitespace-nowrap ml-10 w-32">
                  First Name
                </label>
                <div className="flex-1">
                  <StaticBox className="w-[60%]">{formData.firstName}</StaticBox>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-t border-[#00000f] my-4" />

          <div className="grid grid-cols-3 gap-4 mt-2">
            <div className="flex items-center gap-2">
              <label className="whitespace-nowrap ml-3 mr-2 w-20">Date of Birth</label>
              <div className="flex-1 w-[70%]">
                <StaticBox className="tabular-nums whitespace-nowrap">
                  {renderISO(formData.dateOfBirth)}
                </StaticBox>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="whitespace-nowrap ml-10 w-24">Sex (M/F)</label>
              <div className="flex-1 w-[50%]">
                <StaticBox>{formData.sex}</StaticBox>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="whitespace-nowrap ml-4 w-24">Scheme Code</label>
              <div className="flex-1 w-[60%]">
                <StaticBox>{formData.schemeCode}</StaticBox>
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
              <span className="text-xs font-semibold whitespace-nowrap">
                English Proficiency Level
              </span>
              <StaticBox className="w-20">{formData.proficiency || "—"}</StaticBox>
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
                <span className="whitespace-nowrap ml-2 w-14 text-xs font-semibold">
                  {item.label}
                </span>
                <StaticBox className="w-[50%] tabular-nums">{item.value || "—"}</StaticBox>
              </div>
            ))}

            <div className="flex items-center gap-1">
              <span className="whitespace-nowrap ml-4 w-20 text-xs font-semibold leading-tight">
                Overall <br /> Band <br /> Score
              </span>
              <StaticBox className="w-[65%] px-3 tabular-nums">{formData.overall || "—"}</StaticBox>
            </div>
          </div>

          <hr className="border-t border-[#00000f] my-4" />
        </div>

        {/* Comments + Stamp */}
        <div className="grid grid-cols-10 gap-4 mt-0 mr-4 items-start">
          <div className="col-span-7 flex flex-col">
            <span className="text-sm font-semibold mb-1 ml-1">Administrator Comments</span>
            <div className="border border-black p-2 text-red-600 text-sm bg-gray-50 h-36 w-full overflow-auto whitespace-pre-wrap flex items-start">
              {formData.comments || "—"}
            </div>
          </div>

          <div className="col-span-3 flex flex-col">
            <div className="flex flex-col items-center justify-center border border-gray-600 rounded-md bg-white shadow-inner p-0">
              <span className="text-sm font-semibold text-gray-800 block mb-0">Centre Stamp</span>
              <div className="w-[160px] h-[150px]">
                <img
                  src="/assets/centre-stamp.png"
                  alt="Centre Stamp"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Signatures + Result date */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-8 text-[11px]">
          <div className="flex items-center gap-3">
            <span className="whitespace-nowrap text-[13px] font-semibold w-48">
              Writing Examiner&apos;s <br /> Signature
            </span>
            <StaticBox className="w-[220px]">{formData.writingSign || "—"}</StaticBox>
          </div>

          <div className="flex items-center gap-3">
            <span className="whitespace-nowrap text-[13px] font-semibold w-48">
              Administrator&apos;s <br /> Signature
            </span>
            <StaticBox className="w-[220px]">{formData.adminSignature || "—"}</StaticBox>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-2 text-[11px]">
          <div className="flex items-center gap-3">
            <span className="whitespace-nowrap text-[13px] font-semibold w-48">
              Speaking Examiner&apos;s <br /> Signature
            </span>
            <StaticBox className="w-[220px]">{formData.speakingSign || "—"}</StaticBox>
          </div>

          <div className="flex items-center gap-3">
            <span className="whitespace-nowrap text-[13px] font-semibold w-48">
              Result Publishing Date
            </span>
            <StaticBox className="w-[220px] tabular-nums whitespace-nowrap">
              {renderISO(formData.resultDate)}
            </StaticBox>
          </div>
        </div>

        {/* Logos */}
        <div className="flex justify-between items-end mt-4 px-2 py-6">
          <img src="/assets/british-council.png" alt="British Council" className="h-12 object-contain" />
          <div className="w-[15%] h-12 bg-white flex items-center justify-start px-2">
            <img
              src="/assets/logo1.png"
              alt="Luminedge"
              crossOrigin="anonymous"
              style={{ maxHeight: "100%", width: "auto", objectFit: "contain", display: "block" }}
            />
          </div>
          <img src="/assets/cambridge.png" alt="Cambridge Assessment" className="h-14 object-contain" />
        </div>

        <hr className="border-t border-[#00000f] my-0" />
        <p className="text-[#00000f] text-[11.5px] pt-0 px-2 font-montserrat mt-2">
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
        <div className="relative w-full mb-6">
          <div
            className="w-full h-6 keep-bg"
            style={{ backgroundImage: "repeating-linear-gradient(-135deg, #000 0 2px, #fff 2px 8px)" }}
          />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-fit h-6 bg-white px-4 z-10 flex items-center justify-center">
            <h2 className="text-xl font-bold text-[#00000f]">Examiner&apos;s Detailed Feedback</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-2 text-[13px] text-[#00000f] items-stretch">
          {/* Left column */}
          <div className="space-y-4 h-full flex flex-col">
            {/* Listening */}
            <div>
              <h3 className="font-bold mb-1 pdf-mb-1">Listening</h3>
              <div className="border border-[#00000f] p-2 text-red-600">
                {isPrint ? (
                  <div className="w-full bg-gray-50 text-red-600 text-sm p-1 min-h-[72px] whitespace-pre-wrap">
                    {formData.listeningFeedback || "—"}
                  </div>
                ) : (
                  <textarea
                    rows={3}
                    className="w-full bg-gray-50 text-red-600 text-sm p-1"
                    name="listeningFeedback"
                    value={formData.listeningFeedback}
                    onChange={handleChange}
                    placeholder="Enter listening feedback..."
                    disabled={lockedSegments.listening}
                  />
                )}
              </div>
            </div>

            {/* Reading */}
            <div>
              <h3 className="font-bold mb-1 pdf-mb-1">Reading</h3>
              <div className="border border-[#00000f] p-2 text-red-600">
                {isPrint ? (
                  <div className="w-full bg-gray-50 text-red-600 text-sm p-1 min-h-[72px] whitespace-pre-wrap">
                    {formData.readingFeedback || "—"}
                  </div>
                ) : (
                  <textarea
                    rows={3}
                    className="W-full bg-gray-50 text-red-600 text-sm p-1"
                    name="readingFeedback"
                    value={formData.readingFeedback}
                    onChange={handleChange}
                    placeholder="Enter reading feedback..."
                    disabled={lockedSegments.reading}
                  />
                )}
              </div>
            </div>

            {/* Speaking */}
            <div>
              <h3 className="font-bold mb-1 pdf-mb-1">Speaking</h3>
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
                        {isPrint ? (
                          <StaticCell>
                            {
                              formData.feedback.speakingScores[
                                field as keyof typeof formData.feedback.speakingScores
                              ] || "—"
                            }
                          </StaticCell>
                        ) : (
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
                            disabled={lockedSegments.speaking}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td colSpan={5} className="border border-black p-2 text-left">
                      {isPrint ? (
                        <div className="w-full bg-gray-50 text-red-600 text-sm p-1 min-h-[96px] whitespace-pre-wrap">
                          {formData.feedback.speakingNotes || "—"}
                        </div>
                      ) : (
                        <textarea
                          rows={4}
                          className="w-full bg-gray-50 text-red-600 text-sm p-1"
                          name="feedback.speakingNotes"
                          value={formData.feedback.speakingNotes}
                          onChange={handleChange}
                          placeholder="Enter speaking feedback notes..."
                          disabled={lockedSegments.speaking}
                        />
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Right column */}
          <div className="h-full flex flex-col justify-between">
            <div>
              <h3 className="font-bold mb-1 pdf-mb-1">Writing</h3>
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
                        {isPrint ? (
                          <StaticCell>
                            {formData.feedback.writingScores[key as keyof WritingScores] || "—"}
                          </StaticCell>
                        ) : (
                          <input
                            type="text"
                            name={`feedback.writingScores.${key}`}
                            value={formData.feedback.writingScores[key as keyof WritingScores]}
                            onChange={handleChange}
                            className="w-full text-center bg-gray-50 text-red-600"
                            disabled={lockedSegments.writing}
                          />
                        )}
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
                        <div className="w-full bg-gray-50 text-black text-sm whitespace-pre-wrap min-h-[24px] flex items-center">
                          {formData.feedback.task1Notes[i] || "—"}
                        </div>
                      </td>
                    ))}
                  </tr>

                  <tr className="h-8">
                    <td colSpan={5} className="border border-black p-2 text-left">
                      {isPrint ? (
                        <div className="w-full bg-gray-50 text-red-600 text-sm p-1 min-h-[72px] whitespace-pre-wrap">
                          {formData.writingTask1Feedback || "—"}
                        </div>
                      ) : (
                        <textarea
                          rows={3}
                          className="w-full bg-gray-50 text-red-600 text-sm p-1"
                          name="writingTask1Feedback"
                          value={formData.writingTask1Feedback}
                          onChange={handleChange}
                          placeholder="Enter Task 1 feedback notes..."
                          disabled={lockedSegments.writing}
                        />
                      )}
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
                        {isPrint ? (
                          <StaticCell>
                            {formData.feedback.writingScores[key as keyof WritingScores] || "—"}
                          </StaticCell>
                        ) : (
                          <input
                            type="text"
                            name={`feedback.writingScores.${key}`}
                            value={formData.feedback.writingScores[key as keyof WritingScores]}
                            onChange={handleChange}
                            className="w-full text-center bg-gray-50 text-red-600"
                            disabled={lockedSegments.writing}
                          />
                        )}
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
                        <div className="w-full bg-gray-50 text-black text-sm whitespace-pre-wrap min-h-[24px] flex items-center">
                          {formData.feedback.task2Notes[i] || "—"}
                        </div>
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td colSpan={5} className="border border-black p-2 text-left">
                      {isPrint ? (
                        <div className="w-full bg-gray-50 text-red-600 text-sm p-1 min-h-[72px] whitespace-pre-wrap">
                          {formData.writingTask2Feedback || "—"}
                        </div>
                      ) : (
                        <textarea
                          rows={3}
                          className="w-full bg-gray-50 text-red-600 text-sm p-1"
                          name="writingTask2Feedback"
                          value={formData.writingTask2Feedback}
                          onChange={handleChange}
                          placeholder="Enter Task 2 feedback notes..."
                          disabled={lockedSegments.writing}
                        />
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Services stripe + title */}
        <div className="relative w-full mb-6 mt-6">
          <div
            className="w-full h-6 keep-bg"
            style={{
              backgroundImage: "repeating-linear-gradient(-135deg, #000 0 2px, #fff 2px 8px)",
            }}
          />
          <div className="absolute top-0 left-0 w-full h-6 flex items-center justify-center z-10">
            <div className="bg-white px-4 flex items-center justify-center">
              <h2 className="text-xl font-bold text-[#00000f]">Services we offer</h2>
            </div>
          </div>
        </div>

        {/* Services grid */}
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

        {/* Bottom band + logo + note */}
        <div className="w-full grid grid-cols-[72px_108px_1fr] items-center gap-3 mt-2">
          <div
            className="h-8 keep-bg"
            style={{ backgroundImage: "repeating-linear-gradient(-135deg, #000 0 2px, #fff 2px 8px)" }}
            aria-hidden="true"
          />
          <div className="h-[110px] bg-white flex items-center justify-center px-2">
            <img
              src="/assets/logo1.png"
              alt="Luminedge"
              className="max-h-[100px] w-auto object-contain"
              crossOrigin="anonymous"
            />
          </div>
          <div className="px-2 text-[13px] text-[#00000f] leading-tight text-justify">
            Luminedge stores mock test copies for one month only. To review, candidates must visit
            the office within this period, and taking mock questions is not permitted.
          </div>
        </div>

        <div className="flex justify-center items-end mt-0 px-10 py-0">
          <img src="/assets/ieltslogo.png" alt="British Council" className="h-14 object-contain" />
        </div>
      </div>

      {/* Download */}
      <div className="mt-0 flex justify-center">
        <button
          onClick={handleDownloadPDFFinalTRF}
          className="mt-6 px-6 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? "Preparing…" : "Download PDF"}
        </button>
      </div>

      <button
        onClick={handleEmailTRF}
        disabled={sendingEmail || loading}
        className={`mt-6 px-6 py-2 rounded font-semibold text-white ${
          sendingEmail || loading ? "bg-gray-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
        }`}
        title={urlUserId && urlScheduleId ? "" : "Missing userId or scheduleId"}
      >
        {sendingEmail ? "Sending…" : "Email TRF to User"}
      </button>

      {/* Chart (screen-only) */}
      {!isPrint && (
        <div className="w-[794px] mt-0">
          <h3 className="text-lg font-bold">Score Overview</h3>
          <Bar
            data={chartData}
            options={{
              scales: {
                y: { beginAtZero: true, max: 9, title: { display: true, text: "Band Score" } },
              },
              plugins: { legend: { display: false }, title: { display: true, text: "IELTS Test Scores" } },
            }}
          />
        </div>
      )}

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
    </div>
  );
};
export default FinalTRFPage;

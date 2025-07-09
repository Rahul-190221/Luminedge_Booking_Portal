"use client";

import { useRef, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import axios from "axios";

// Define the Booking type
type Booking = {
  id: string;
  name: string;
  testType: string;
  testSystem: string;
  bookingDate: string;
  scheduleId: string;
  slotId: string;
  startTime: string;
  endTime: string;
  userId: string[];
  userCount: number;
  attendance?: string;
};

const TestReportForm = () => {
  const { id: userId } = useParams(); // ✅ gets userId from URL
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [formData, setFormData] = useState({
    centreName: "LUMINEDGE BD",
    testDate: "2025-06-28",
    familyName: "",
    firstName: "",
    dateOfBirth: "",
    sex: "M",
    schemeCode: "",
    listening: "5.5",
    reading: "5",
    writing: "5.5",
    speaking: "6",
    overall: "5.5",
    comments: "",
    proficiency: "B2",
    adminSign: "",
    speakingSign: "Neelima (30.06.25)",
    writingSign: "Prima (1.07.25)",
    resultDate: "",
  });


  useEffect(() => {
    const fetchUserById = async () => {
      try {
        const response = await axios.get(`https://luminedge-server.vercel.app/api/v1/admin/users/${userId}`);
        const user = response.data.user;

        if (!user || !user.booking) {
          console.warn("No booking info found for user.");
          return;
        }

        const booking: Booking = {
          id: user.booking.id,
          name: user.booking.name || "IELTS",
          testType: user.booking.testType,
          testSystem: user.booking.testSystem,
          bookingDate: user.booking.bookingDate,
          scheduleId: user.booking.scheduleId,
          slotId: user.booking.slotId,
          startTime: user.booking.startTime,
          endTime: user.booking.endTime,
          userId: [user._id],
          userCount: 1,
          attendance: user.booking.attendance,
        };

        setBookings([booking]);

        setFormData((prev) => ({
          ...prev,
          testDate: booking.bookingDate?.slice(0, 10) || "",
          firstName: user.firstName || "",
          familyName: user.lastName || "",
          dateOfBirth: user.dateOfBirth?.slice(0, 10) || "",
          sex: user.sex || "M",
        }));
        
      } catch (error) {
        console.error("Failed to fetch user by ID:", error);
      }
    };

    if (userId) fetchUserById();
  }, [userId]);

  const handleDownload = async () => {
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const width = 210;
      const height = 297;
      const pxPerMm = 3.78;

      // Temp style for cleaner PDF
      const styleSheet = document.createElement("style");
      styleSheet.textContent = `
        * {
          color: #000 !important;
          background-color: #fff !important;
          font-family: Arial, sans-serif !important;
        }
        img {
          display: block !important;
          max-width: 100% !important;
          height: auto !important;
          object-fit: contain !important;
          image-rendering: crisp-edges !important;
        }
        .w-[794px] {
          width: 794px !important;
          max-width: 794px !important;
          min-height: ${height * pxPerMm}px !important;
        }
      `;
      document.head.appendChild(styleSheet);

      const preloadImages = async (ref: HTMLDivElement | null) => {
        if (!ref) return;
        const images = ref.getElementsByTagName("img");
        await Promise.all(
          Array.from(images).map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = resolve;
                })
          )
        );
      };

      const renderPage = async (ref: HTMLDivElement | null) => {
        if (!ref) return null;
        return await html2canvas(ref, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#fff",
        });
      };

      await Promise.all([preloadImages(page1Ref.current), preloadImages(page2Ref.current)]);

      // Render Page 1
      if (page1Ref.current) {
        const canvas1 = await renderPage(page1Ref.current);
        if (canvas1) {
          const imgData1 = canvas1.toDataURL("image/png");
          pdf.addImage(imgData1, "PNG", 0, 0, width, height);
        }
      }

      // Render Page 2
      if (page2Ref.current) {
        const canvas2 = await renderPage(page2Ref.current);
        if (canvas2) {
          pdf.addPage();
          const imgData2 = canvas2.toDataURL("image/png");
          pdf.addImage(imgData2, "PNG", 0, 0, width, height);
        }
      }

      document.head.removeChild(styleSheet);
      pdf.save("Ankur.pdf");
    } catch (error: any) {
      console.error("PDF generation error:", error?.message || error);
      alert("Failed to download PDF. Check console for details.");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
  
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };
  

  
  return (
    <div className="p-4 flex flex-col items-center space-y-12">
      {/* ------------------- PAGE 1 ------------------- */}
      <div
        ref={page1Ref}
        className="w-[794px] h-auto bg-white border p-10 shadow-md text-sm"
      >
        <div className="w-full">
          {/* Header */}
          <div className="flex justify-between items-start pb-3">
            <div className="flex flex-col">
              <h1 className="text-5xl font-extrabold leading-none mt-4">
                IELTS<span className="align-top text-base">™</span>
              </h1>
              <h2 className="text-base font-semibold tracking-wide mt-0">Test Report Form</h2>
            </div>
            <div className="border border-black px-8 py-1 font-semibold text-sm tracking-wider mt-14">
              ACADEMIC
            </div>
          </div>

          {/* NOTE Box - matching TRF layout */}
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

          {/* Centre Info Row - EXACTLY like the PDF image */}
          <div className="grid grid-cols-[140px_1fr_100px_1fr] items-start gap-x-2 mt-2 mb-1 text-[11px] leading-tight">
            {/* Centre Name Label */}
            <label className="col-start-1 col-end-2 font-semibold pt-1 ml-10">
              Centre Name
            </label>
            {/* Centre Name Input */}
            <input
              type="text"
              name="centreName"
              value={formData.centreName}
              onChange={handleChange}
              className="col-start-2 col-end-3 border border-black px-2 py-[2px] text-red-600 text-[11px] h-[20px] w-[60%]"
            />
   {/* Test Date Label */}
<label className="col-start-3 col-end-4 font-semibold pt-1 text-right pr-0">
  Test Date
</label>

{/* Test Date Input (right-aligned inside column) */}
<div className="col-start-4 col-end-6 flex justify-center ml-4">
  <input
    type="text"
    name="testDate"
    value={formData.testDate}
    onChange={handleChange}
    className="border border-black px-2 py-[2px] text-red-600 text-[11px] h-[20px] w-[60%]"
    placeholder="DD-MM-YYYY"
  />
</div>


          </div>
        </div>
        <hr className="border-t border-[#00000f] my-4" />

        {/* Candidate Info */}
        <div>
          <h2 className="font-bold mb-1">Candidate Details</h2>
          <div className="w-full max-w-[600px] mx-auto">
            <div className="grid grid-cols-1 gap-4">
              {/* Family Name */}
              <div className="flex items-center gap-2">
                <label className="whitespace-nowrap ml-10 w-32">Family Name</label>
                <input
                  className="flex-1 border border-gray-400 px-2 py-1 text-red-600 text-sm bg-gray-50 w-[60%]"
                  value={formData.familyName}
                  name="familyName"
                  onChange={handleChange}
                />
              </div>
              {/* First Name */}
              <div className="flex items-center gap-2">
                <label className="whitespace-nowrap ml-10 w-32">First Name</label>
                <input
                  className="flex-1 border border-gray-400 px-2 py-1 text-red-600 text-sm bg-gray-50 w-[60%]"
                  value={formData.firstName}
                  name="firstName"
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
          <hr className="border-t border-[#00000f] my-4" />
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div className="flex items-center gap-2">
              <label className="whitespace-nowrap ml-3 w-32">Date of Birth</label>
              <input
                type="date"
                className="flex-1 border border-gray-400 px-2 py-1 text-red-600 text-sm bg-gray-50 w-[60%]"
                name="dateOfBirth"
                onChange={handleChange}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="whitespace-nowrap ml-10 w-25">Sex (M/F)</label>
              <input
                className="flex-1 border border-gray-400 px-2 py-1 text-red-600 text-sm bg-gray-50 w-[50%]"
                value={formData.sex}
                name="sex"
                onChange={handleChange}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="whitespace-nowrap ml-4 w-25">Scheme Code</label>
              <input
                className="flex-1 border border-gray-400 px-2 py-1 text-red-600 text-sm bg-gray-50 w-[60%]"
                name="schemeCode"
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
        <hr className="border-t border-[#00000f] my-4" />

        {/* Test Results */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-bold text-sm">Test Results</h2>
            <div className="flex items-center gap-3 ml-4">
              <label className="text-xs font-semibold whitespace-nowrap">
                English Proficiency Level
              </label>
              <input
                className="w-20 border border-gray-400 px-1 py-0.5 text-red-600 text-sm bg-gray-50"
                value={formData.proficiency}
                name="proficiency"
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {[
              { label: "Listening", name: "listening", value: formData.listening },
              { label: "Reading", name: "reading", value: formData.reading },
              { label: "Writing", name: "writing", value: formData.writing },
              { label: "Speaking", name: "speaking", value: formData.speaking },
            ].map((item, idx) => (
              <div key={item.name} className="flex items-center gap-1">
                <label className="whitespace-nowrap ml-2 w-14 text-xs font-semibold">
                  {item.label}
                </label>
                <input
                  className="w-[50%] border border-gray-400 px-2 py-1 text-red-600 text-sm bg-gray-50"
                  name={item.name}
                  value={item.value}
                  onChange={handleChange}
                />
              </div>
            ))}
            <div className="flex items-center gap-1">
              <label className="whitespace-nowrap ml-4 w-20 text-xs font-semibold leading-tight">
                Overall <br /> Band<br />Score
              </label>
              <input
                className="w-[65%] border border-gray-400 px-3 py-1 text-red-600 text-sm bg-gray-50"
                value={formData.overall}
                name="overall"
                onChange={handleChange}
              />
            </div>
          </div>
          <hr className="border-t border-[#00000f] my-4" />
        </div>

        <div className="grid grid-cols-10 gap-4 mt-0 mr-4 items-start">
          <div className="col-span-7 flex flex-col">
            <label className="text-sm font-semibold mb-1 ml-1">Administrator Comments</label>
            <textarea
              className="border border-gray-400 p-2 text-red-600 text-sm bg-gray-50 h-32 resize-none w-full"
              name="comments"
              onChange={handleChange}
            />
          </div>
          <div className="col-span-3 flex flex-col">
            <div className="border border-gray-400 bg-gray-50 h-[9.5rem] w-full ml-4 flex justify-center text-[#00000f] text-sm">
              <label className="text-sm font-semibold mb-1 ml-1">Centre Stamp</label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-10 text-[11px]">
          <div className="flex items-center gap-3">
            <label className="whitespace-nowrap text-[13px] font-semibold w-48">
              Writing Examiner's <br />Signature
            </label>
            <input
              className="border border-gray-400 px-2 py-1 text-red-600 text-sm bg-gray-50 w-[220px]"
              value={formData.writingSign}
              name="writingSign"
              onChange={handleChange}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="whitespace-nowrap text-[13px] font-semibold w-48">
              Administrator's <br /> Signature
            </label>
            <div className="border-b border-black h-[1px] w-[320px]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-2 text-[11px]">
          <div className="flex items-center gap-3">
            <label className="whitespace-nowrap text-[13px] font-semibold w-48">
              Speaking Examiner's <br /> Signature
            </label>
            <input
              className="border border-gray-400 px-2 py-1 text-red-600 text-sm bg-gray-50 w-[220px]"
              value={formData.speakingSign}
              name="speakingSign"
              onChange={handleChange}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="whitespace-nowrap text-[13px] font-semibold w-48">
              Result Publishing Date
            </label>
            <input
              type="date"
              className="border border-gray-400 px-2 py-1 text-red-600 bg-gray-50 text-[11px] h-[24px] w-[220px]"
              value={formData.resultDate}
              name="resultDate"
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="flex justify-between items-end mt-4 px-10 py-3">
  <img
    src="/assets/british-council.png"
    alt="British Council"
    className="h-14 object-contain"
    crossOrigin="anonymous"
  />
<img
  src="/assets/logo.svg"
  alt="Luminedge"
  crossOrigin="anonymous"
  style={{ height: "56px", objectFit: "contain", maxWidth: "100%" }}
/>


  <img
    src="/assets/cambridge.png"
    alt="Cambridge Assessment"
    className="h-14 object-contain"
    crossOrigin="anonymous"
  />
</div>

        <hr className="border-t border-[#00000f] my-0" />
        <p className="text-[#00000f] text-[11.5px] pt-0 px-2">
          This IELTS Test Report Form, crafted by Luminedge Bangladesh, offers comprehensive feedback to Mock Test takers.
          It is important to note that this test report cannot be utilized as an Official IELTS Test Report.
        </p>
      </div>
 {/* ------------------- PAGE 2 ------------------- */}
 <div
        ref={page2Ref}
        className="w-[794px] h-auto bg-white border p-10 shadow-md text-sm"
      >
<div className="relative w-full mb-4">

<div
  className="w-full h-6"
  style={{
    backgroundImage: 'repeating-linear-gradient(-135deg, #000 0 2px, #fff 2px 8px)',
  }}
></div>

  <div className="absolute top-0 left-1/3 -translate-x-1/2 w-fit h-6 bg-white px-4 flex items-center justify-center  z-8">
    <h2 className="text-xl font-bold text-[#00000f] ">
      Examiner's Detailed Feedback
    </h2>
  </div>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[13px] text-[#00000f] items-stretch">
  {/* LEFT COLUMN */}
  <div className="space-y-4 h-full flex flex-col">
    {/* Listening */}
    <div>
      <h3 className="font-bold mb-1">Listening</h3>
      <div className="border border-[#00000f] p-2 space-y-2 text-red-600">
        <p>Attempt all questions</p>
        <p>Pay attention to stressed words</p>
        <p>Practise gap filling questions more</p>
      </div>
    </div>

    {/* Reading */}
    <div>
      <h3 className="font-bold mb-1">Reading</h3>
      <div className="border border-[#00000f] p-2 space-y-2 text-red-600">
        <p>Practise fill in the gaps, T/F/NG, matching headings, matching info</p>
        <p>Read the questions carefully</p>
        <p>Improve overall reading comprehension skills</p>
      </div>
    </div>

    {/* Speaking */}
    <div>
      <h3 className="font-bold mb-1">Speaking</h3>
      <table className="table-fixed w-full border border-black text-center text-[12px] mb-0">
        <thead>
          <tr className="border border-black font-semibold">
            <th className="border border-black p-1">FC</th>
            <th className="border border-black p-1">LR</th>
            <th className="border border-black p-1">GRA</th>
            <th className="border border-black p-1">PRO</th>
            <th className="border border-black p-1">Total</th>
          </tr>
        </thead>
        <tbody className="text-red-600">
          <tr>
            <td className="border border-black p-1">6</td>
            <td className="border border-black p-1">6</td>
            <td className="border border-black p-1">5.5</td>
            <td className="border border-black p-1">6.5</td>
            <td className="border border-black p-1">6</td>
          </tr>
          <tr>
            <td colSpan={5} className="border border-black p-2 text-left">
              <div className="space-y-1 text-red-600">
                <p>Work on coherence</p>
                <p>Improve word choice, use more contextual words</p>
                <p>Work on grammar</p>
                <p>Improve intonation</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  {/* RIGHT COLUMN */}
  <div className="h-full flex flex-col justify-between">
    <div>
      <h3 className="font-bold mb-1">Writing</h3>

      <table className="table-fixed w-full border border-black text-center text-[12px] mb-2">
  <thead>
    <tr className="border border-black font-semibold bg-gray-100">
      <th className="border border-black p-1">Task1</th>
      <th className="border border-black p-1">TA</th>
      <th className="border border-black p-1">CC</th>
      <th className="border border-black p-1">LR</th>
      <th className="border border-black p-1">GRA</th>
    </tr>
  </thead>
  <tbody className="text-red-600">
    {/* Task 1 */}
    <tr>
      <td className="border border-black p-1">5.5</td>
      <td className="border border-black p-1">6</td>
      <td className="border border-black p-1">5</td>
      <td className="border border-black p-1">5</td>
      <td className="border border-black p-1">5</td>
    </tr>
    <tr className="text-[11px] text-[#00000f]">
  <td className="border border-black p-1">Under length</td>
  <td className="border border-black p-1">No. of words</td>
  <td className="border border-black p-1">Penalty</td>
  <td className="border border-black p-1">Off-topic</td>
  <td className="border border-black p-1">Memorised</td>
</tr>

    <tr className="h-7">
      <td className="border border-black p-1"></td>
      <td className="border border-black p-1"></td>
      <td className="border border-black p-1"></td>
      <td className="border border-black p-1"></td>
      <td className="border border-black p-1"></td>
    </tr>
    <tr>
      <td colSpan={5} className="border border-black p-2 text-left">
        <div className="space-y-1">
          <p>Use correct spelling (always proofread for typos)</p>
          <p>Work on grammar (tense, verb forms, capitalization)</p>
          <p>Improve word choice and vocabulary</p>
        </div>
      </td>
    </tr>

    {/* Task 2 */}
    <tr className="text-[#00000f]">
      <th className="border border-black p-1">Task 2</th>
      <th className="border border-black p-1">TA</th>
      <th className="border border-black p-1">CC</th>
      <th className="border border-black p-1">LR</th>
      <th className="border border-black p-1">GRA</th>
    </tr>
    <tr>
      <td className="border border-black p-1">5.5</td>
      <td className="border border-black p-1">6</td>
      <td className="border border-black p-1">5</td>
      <td className="border border-black p-1">5</td>
      <td className="border border-black p-1">5</td>
    </tr>

    <tr className="text-[11px] text-[#00000f]">
  <td className="border border-black p-1">Under length</td>
  <td className="border border-black p-1">No. of words</td>
  <td className="border border-black p-1">Penalty</td>
  <td className="border border-black p-1">Off-topic</td>
  <td className="border border-black p-1">Memorised</td>
</tr>

    <tr className="h-6">
      <td className="border border-black p-1"></td>
      <td className="border border-black p-1"></td>
      <td className="border border-black p-1"></td>
      <td className="border border-black p-1"></td>
      <td className="border border-black p-1"></td>
    </tr>
    <tr>
      <td colSpan={5} className="border border-black p-2 text-left">
        <div className="space-y-1">
          <p>Use correct spelling: consequences, survival, pressure</p>
          <p>Study sentence structure and grammar (articles, verbs, tense, prepositions)</p>
          <p>Use more synonyms to avoid repetition</p>
        </div>
      </td>
    </tr>
  </tbody>
</table>

    </div>
  </div>
</div>

        <div className="relative w-full mt-2 mb-2">

        <div
  className="w-full h-6"
  style={{
    backgroundImage: 'repeating-linear-gradient(-135deg, #000 0 2px, #fff 2px 8px)',
  }}
></div>

  <div className="absolute top-0 left-1/3 -translate-x-1/2 w-fit h-6 bg-white px-4 flex items-center justify-center  z-8">
    <h2 className="text-xl font-bold text-[#00000f] ">
    Services we offer
    </h2>
  </div>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-0 text-[13px] text-[#00000f]">
  {/* Premium Course */}
  <div>
    <h4 className="font-bold">IELTS Premium Course</h4>
    <p>2 Months long</p>
    <p>24 Classes</p>
    <p>5 Mock Tests</p>
    <p>Cambridge IELTS Book Set</p>
  </div>

  {/* Crash Course */}
  <div>
    <h4 className="font-bold">IELTS Crash Course</h4>
    <p>1 Month long</p>
    <p>24 Intensive Classes</p>
    <p>3 Mock Tests</p>
    <p>Cambridge IELTS Book Set</p>
  </div>

  {/* Mock Test Packages */}
  <div>
    <h4 className="font-bold">IELTS Mock Test Packages</h4>
    <p>* Single Mock Test</p>
    <p>* Package of 3 IELTS Mocks</p>
    <p>* Package of 5 IELTS Mocks</p>
    <p>* Result publishes within 48 hours</p>
    <p>* Get FREE after mock counselling from IELTS trainer</p>
  </div>

  {/* Ready Course */}
  <div>
    <h4 className="font-bold">IELTS Ready Course</h4>
    <p>3 Months long</p>
    <p>48 Classes</p>
    <p>5 Mock Tests</p>
    <p>9 Assessment Tests</p>
  </div>

  {/* Elementary Course */}
  <div>
    <h4 className="font-bold">IELTS for Elementary</h4>
    <p>4 Months long</p>
    <p>72 Classes</p>
    <p>5 Mock Tests</p>
    <p>13 Assessment Tests</p>
  </div>
</div>


<div className="w-full mt-2 mb-4 flex items-center">
  {/* Left stripe section */}
  <div
    className="w-[10%] h-10"
    style={{
      backgroundImage: 'repeating-linear-gradient(-135deg, #000 0 2px, #fff 2px 8px)',
    }}
  ></div>

  {/* Logo section */}
  <div className="w-[15%] h-20 bg-white flex items-center justify-start px-2">
    <img
      src="/assets/logo.svg"
      alt="Luminedge"
      className="h-10 object-contain"
      crossOrigin="anonymous"
    />
  </div>

  {/* Text section */}
  <div className="w-[75%] px-2 text-[13px] text-[#00000f] leading-tight">
    Luminedge stores mock test copies for one month only. To review, candidates must visit the
    office within this period, and taking mock questions is not permitted.
  </div>
</div>

<div className="flex justify-center items-end mt-4 px-10 py-3">
  <img
    src="/assets/ieltslogo.svg"
    alt="British Council"
    className="h-14 object-contain"
    crossOrigin="anonymous"
  />
</div>
      </div>

      <button
  onClick={handleDownload}
  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition"
>
  Download PDF Only
</button>

    </div>
  );
};

export default TestReportForm;
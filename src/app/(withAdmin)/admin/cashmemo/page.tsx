"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";

const CashMemoPage = () => {
  const [memoData, setMemoData] = useState({
    memoNumber: "",
    date: "",
    candidateName: "",
    testType: "",
    amountPaid: "",
    paymentMode: "",
    remarks: "",
    issuedBy: "",
    candidateEmail: "",
  });

  // Auto-generate memo number like CM-2025-0012
  useEffect(() => {
    const generateMemoNumber = async () => {
      const year = new Date().getFullYear();
      try {
        const { data } = await axios.get("https://luminedge-server.vercel.app/api/v1/admin/cash-memos/count");
        const count = data.count || 0;
        const next = (count + 1).toString().padStart(4, "0");
        setMemoData((prev) => ({ ...prev, memoNumber: `CM-${year}-${next}` }));
      } catch (error) {
        console.error("Error generating memo number:", error);
        alert("❌ Failed to generate memo number. Check API server.");
      }
    };
    generateMemoNumber();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setMemoData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!memoData.memoNumber || !memoData.candidateEmail || !memoData.candidateName) {
      alert("❌ Please fill all required fields.");
      return;
    }
  
    try {
      const res = await axios.post("https://luminedge-server.vercel.app/api/v1/admin/save-cash-memo", memoData, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      alert("✅ Memo saved & emailed successfully");
      console.log("Response:", res.data);
    } catch (err: any) {
      console.error("❌ Failed to save memo:", err.response?.data || err.message);
      alert("❌ Failed to save memo. Check input and try again.");
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto mt-10 bg-white p-6 border border-gray-200 shadow-lg rounded-xl">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">🧾 Cash Memo</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block font-medium text-gray-700">Memo Number</label>
            <input
              name="memoNumber"
              value={memoData.memoNumber}
              disabled
              className="w-full border px-2 py-1 bg-gray-100 text-gray-500"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700">Date</label>
            <input
              type="date"
              name="date"
              value={memoData.date}
              onChange={handleChange}
              className="w-full border px-2 py-1"
              required
            />
          </div>

          <div className="col-span-2">
            <label className="block font-medium text-gray-700">Candidate Name</label>
            <input
              name="candidateName"
              value={memoData.candidateName}
              onChange={handleChange}
              className="w-full border px-2 py-1"
              required
            />
          </div>

          <div className="col-span-2">
            <label className="block font-medium text-gray-700">Candidate Email</label>
            <input
              name="candidateEmail"
              value={memoData.candidateEmail}
              onChange={handleChange}
              className="w-full border px-2 py-1"
              type="email"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700">Test Type</label>
            <input
              name="testType"
              value={memoData.testType}
              onChange={handleChange}
              placeholder="IELTS / TOEFL / etc."
              className="w-full border px-2 py-1"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700">Amount Paid (₹)</label>
            <input
              type="number"
              name="amountPaid"
              value={memoData.amountPaid}
              onChange={handleChange}
              className="w-full border px-2 py-1"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700">Payment Mode</label>
            <select
              name="paymentMode"
              value={memoData.paymentMode}
              onChange={handleChange}
              className="w-full border px-2 py-1"
              required
            >
              <option value="">Select</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-gray-700">Issued By</label>
            <input
              name="issuedBy"
              value={memoData.issuedBy}
              onChange={handleChange}
              className="w-full border px-2 py-1"
            />
          </div>

          <div className="col-span-2">
            <label className="block font-medium text-gray-700">Remarks</label>
            <input
              name="remarks"
              value={memoData.remarks}
              onChange={handleChange}
              className="w-full border px-2 py-1"
            />
          </div>
        </div>

        <button
          type="submit"
          className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          💾 Save & Email Memo
        </button>
      </form>
      {memoData.memoNumber && (
  <div className="mt-10">
    <h2 className="text-lg font-semibold mb-2 text-gray-800">📄 Memo Preview</h2>

    <div className="flex justify-between items-center mb-2">
      <span className="text-gray-600">Memo: {memoData.memoNumber}</span>

      <a
        href={`https://luminedge-server.vercel.app/api/v1/admin/cash-memo/${memoData.memoNumber}/pdf`}
        download={`${memoData.memoNumber}.pdf`}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
      >
        ⬇️ Download PDF
      </a>
    </div>

    <iframe
      title="Memo PDF Preview"
      src={`https://luminedge-server.vercel.app/api/v1/admin/cash-memo/${memoData.memoNumber}/pdf`}
      className="w-full h-[500px] border"
    ></iframe>
  </div>
)}

    </div>
  );
};

export default CashMemoPage;

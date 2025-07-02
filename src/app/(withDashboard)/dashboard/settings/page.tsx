"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

interface UserForm {
  transactionId: string;
  name: string;
  email: string;
  phone: string;
  passportId: string;
  createdAt: string;
}

interface User {
  name: string;
  email: string;
  contactNo: string;
  passportNumber: string;
  transactionId: string;
  totalMock?: number;
  mock?: number;
  mockType?: string;
  testType?: string;
  status?: string;
  profileChangeRequestStatus?: string;
  profileEditNote?: string;
}

const getUserIdFromToken = (): string | null => {
  const token = localStorage.getItem("accessToken");
  if (!token) return null;
  try {
    const decoded: any = jwtDecode(token);
    return decoded.userId || decoded._id;
  } catch (err) {
    return null;
  }
};

const SettingsPage = () => {
  const [formData, setFormData] = useState<UserForm>({
    transactionId: "",
    name: "",
    email: "",
    phone: "",
    passportId: "",
    createdAt: "",
  });

  const [editRequested, setEditRequested] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [submittedItems, setSubmittedItems] = useState<any[]>([]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const userId = getUserIdFromToken();
      const profileRes = await axios.get(`https://luminedge-server.vercel.app/api/v1/profile/${userId}`);
      const mockRes = await axios.get(`https://luminedge-server.vercel.app/api/v1/user/${userId}`);

      const user = {
        ...mockRes.data.user,
        ...profileRes.data.user,
      };

      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.contactNo?.toString() || "",
        passportId: user.passportNumber || "",
        transactionId: user.transactionId || "",
        createdAt: user.createdAt || "",
      });

      setEditRequested(user.profileChangeRequestStatus === "requested");
      setRequestNote(user.profileEditNote || ""); // 🔁 also preload note if needed
      
      setSelectedUser(user);
      setSubmittedItems(mockRes.data.mocks || []);
    } catch (err) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const handleRequestEdit = async () => {
    try {
      const userId = getUserIdFromToken();
      if (!requestNote.trim()) {
        toast.error("Please write a reason for requesting changes");
        return;
      }

      const res = await axios.post("https://luminedge-server.vercel.app/api/v1/user/request-profile-edit", {
        userId,
        note: requestNote,
      });

      if (res.data.success) {
        toast.success("Edit request sent");
        setEditRequested(true);
        setRequestNote("");
      }
    } catch (err) {
      toast.error("Failed to request change");
    }
  };

  return (
    <div className="p-1 sm:p-2 w-full sm:max-w-[100%] mx-auto bg-[#ffffff] text-[#00000f] shadow-1xl rounded-2xl h-screen border border-[#00000f]/10">
      {/* Profile Section */}
      <div className="bg-white rounded-2xl p-1  w-full max-w-4xl mb-2">
      <motion.h1
  className="text-2xl font-bold mb-0 text-[#00000f]"
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: "easeOut" }}
>
  Profile Details
</motion.h1>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-2">
          {["name", "email", "phone", "passportId", "transactionId"].map((field) => (
            <div key={field}>
              <label htmlFor={field} className="block text-sm font-medium" style={{ color: "#00000f" }}>
              {field.charAt(0).toUpperCase() + field.slice(1)}
              </label>
              <input
              type="text"
              name={field}
              id={field}
              value={(formData as any)[field] || ""}
              disabled
              className="mt-1 block w-full border rounded-md px-3 py-2 border-gray-300 bg-gray-100 text-gray-600"
              />
            </div>
          ))}

{!editRequested ? (
  <>
    <label htmlFor="requestNote" className="block text-sm font-medium" style={{ color: "#00000f" }}>
      Reason for Profile Change:
    </label>
    <textarea
      id="requestNote"
      value={requestNote}
      onChange={(e) => setRequestNote(e.target.value)}
      className="w-full border border-gray-300 rounded-md px-2 py-2 mb-2 focus:ring-[#face39] focus:border-[#face39]"
      rows={3}
      placeholder="Write your reason for requesting profile changes..."
    />
    <button
      type="button"
      onClick={handleRequestEdit}
      className="w-full px-6 py-3 bg-[#face39] text-black rounded-full font-bold hover:bg-black hover:text-white transition"
    >
      📝 Request for Changes
    </button>
  </>
) : (
  <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-md p-3">
    <p>✅ Your request has been submitted.</p>
    {requestNote && (
      <p className="mt-1"><strong>📝 Reason:</strong> {requestNote}</p>
    )}
  </div>
)}

        </form>
      </div>

      {/* Services Section */}
      <div className="bg-white rounded-2xl p-1  w-full max-w-4xl mt-0 mb-0">
      <motion.h1
  className="text-2xl font-bold mb-0 text-[#00000f]"
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
>
  Services
</motion.h1>



        <div className="flex items-center px-2 mb-4">
          <p className="text-sm text-[#00000f] font-semibold">
            Here you can view your user Services details.
          </p>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="ml-4 px-6 py-3 rounded-full font-semibold text-sm uppercase tracking-wide transition-all duration-300 ease-in-out bg-[#00000f] text-white hover:bg-[#face39] hover:text-[#00000f] shadow-lg hover:shadow-xl ring-2 ring-transparent hover:ring-[#face39]"
          >
            🚀View Details
          </button>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-700 bg-opacity-50 z-50 px-2 sm:px-4">
          <div className="bg-white p-5 rounded-lg w-full max-w-6xl flex flex-col lg:flex-row gap-3 overflow-y-auto max-h-[95vh]">
            {/* User Info */}
            <div className="w-full sm:w-1/3 bg-white rounded-xl shadow-md p-3 border border-gray-300">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">👤User Details</h2>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Name:</strong> {selectedUser?.name || "N/A"}</p>
                <p><strong>Email:</strong> {selectedUser?.email || "N/A"}</p>
                <p><strong>Phone:</strong> {selectedUser?.contactNo || "N/A"}</p>
                <p><strong>Passport No:</strong> {selectedUser?.passportNumber || "N/A"}</p>
                <p><strong>Transaction ID:</strong> {selectedUser?.transactionId || "N/A"}</p>
                {!submittedItems.length && (
                  <>
                    <p><strong>Test Name:</strong> {selectedUser?.mockType || "N/A"}</p>
                    <p><strong>Test Type:</strong> {selectedUser?.testType || "N/A"}</p>
                  </>
                )}
                <p><strong>Purchased:</strong> {selectedUser?.totalMock ?? "N/A"}</p>
                <p><strong>Booked:</strong> {
                  selectedUser?.totalMock != null && selectedUser?.mock != null
                    ? Number(selectedUser?.totalMock) - Number(selectedUser?.mock)
                    : "N/A"
                }</p>
                <p><strong>Remaining:</strong> {selectedUser?.mock ?? "N/A"}</p>
                <p><strong>Status:</strong> <span className={`font-semibold ${selectedUser?.status === 'blocked' ? 'text-red-500' : 'text-green-600'}`}>{selectedUser?.status || "N/A"}</span></p>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px bg-[#00000f]"></div>

            {/* Booking Table */}
            <div className="w-full sm:w-2/3 bg-white rounded-2xl shadow-lg border border-gray-200 p-3 flex flex-col max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">🛠Services Details</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-gray-400 border-collapse rounded-lg overflow-hidden shadow-sm">
                  <thead>
                    <tr className="bg-yellow-300 text-gray-900 font-semibold text-center">
                      <th className="p-3 border border-gray-400">Mock Type</th>
                      <th className="p-3 border border-gray-400">Test Type</th>
                      <th className="p-3 border border-gray-400">Test System</th>
                      <th className="p-3 border border-gray-400">Mock #</th>
                      <th className="p-3 border border-gray-400">MR</th>
                      <th className="p-3 border border-gray-400">MR Validation</th>
                      <th className="p-3 border border-gray-400">Valid Till</th>
                    
                    </tr>
                  </thead>
                  <tbody className="text-center bg-white">
                    {submittedItems.map((item, index) => (
                      <tr key={`submitted-${index}`} className="hover:bg-gray-50">
                        <td className="p-3 border border-gray-300">{item.mockType}</td>
                        <td className="p-3 border border-gray-300">{item.testType}</td>
                        <td className="p-3 border border-gray-300">{item.testSystem}</td>
                        <td className="p-3 border border-gray-300">{item.mock}</td>
                        <td className="p-3 border border-gray-300">{item.transactionId}</td>
                        <td className="p-3 border border-gray-300">{item.mrValidation}</td>
                        <td className={`p-3 border border-gray-300 ${new Date(item.mrValidationExpiry) < new Date() ? "text-red-600 font-semibold" : ""}`}>
  {(() => {
    if (!item.mrValidationExpiry) return "N/A";

    const now = new Date();
    const expiry = new Date(item.mrValidationExpiry);
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return diffDays <= 0 ? "Expired" : `${diffDays} day${diffDays === 1 ? "" : "s"} left`;
  })()}
</td>


                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end items-center mt-6">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg transition"
                >
                  ❌ Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;

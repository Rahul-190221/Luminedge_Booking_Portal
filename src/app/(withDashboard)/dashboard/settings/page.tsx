"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import toast from "react-hot-toast";

interface UserForm {
  transactionId: string;
  name: string;
  email: string;
  phone: string;
  passportId: string;
  createdAt: string;
  password: string;
  confirmPassword: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  profileChangeRequestStatus?: string;
  passportNumber?: string;
  transactionId?: string;
  contactNo?: number;
  mockType?: string;
  testType?: string;
  totalMock?: number;
  mock?: number;
  status?: string;
}

const getUserIdFromToken = (): string | null => {
  const token = localStorage.getItem("accessToken");
  if (!token) return null;

  try {
    const decoded: any = jwtDecode(token);
    return decoded.userId || decoded._id;
  } catch (err) {
    console.error("Invalid token", err);
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
    password: "",
    confirmPassword: "",
  });

  const [editRequested, setEditRequested] = useState(false);
  const [editApproved, setEditApproved] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [submittedItems, setSubmittedItems] = useState<any[]>([]);
  const [lastMock, setLastMock] = useState<any | null>(null);

  const fetchUserProfile = async () => {
    try {
      const userId = getUserIdFromToken();
      const profileRes = await axios.get(`https://luminedge-server.vercel.app/api/v1/profile/${userId}`);
      const mockRes = await axios.get(`https://luminedge-server.vercel.app/api/v1/user/${userId}`);

      const profileUser = profileRes.data.user;
      const mockUser = mockRes.data.user;

      const user = {
        ...mockUser,
        ...profileUser, // Profile data (transactionId etc) overrides if needed
      };

      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.contactNo?.toString() || "",
        passportId: user.passportNumber || "",
        transactionId: profileUser.transactionId || "",
        createdAt: user.createdAt || "",
        password: "",
        confirmPassword: "",
      });

      setEditRequested(user.profileChangeRequestStatus === "requested");
      setEditApproved(user.profileChangeRequestStatus === "approved");
      setSelectedUser(user); // Set user for modal too
      setSubmittedItems(mockRes.data.mocks || []); // Set mocks table
      setLastMock(mockRes.data.lastMock || null);
    } catch (err) {
      toast.error("Failed to load profile");
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUserProfile(); // Fetch once at mount
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRequestEdit = async () => {
    try {
      const userId = getUserIdFromToken();
      const res = await axios.post("https://luminedge-server.vercel.app/api/v1/user/request-profile-edit", { userId });
      if (res.data.success) {
        toast.success("Edit request sent");
        setEditRequested(true);
      }
    } catch (err) {
      toast.error("Failed to request change");
    }
  };

  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      const userId = getUserIdFromToken();
      const updatePayload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        passportId: formData.passportId,
        transactionId: formData.transactionId,
      };
      const res = await axios.put(`https://luminedge-server.vercel.app/api/v1/profile/${userId}`, updatePayload);
      if (res.data.success) {
        toast.success("Profile updated!");
        setEditMode(false);
        fetchUserProfile();
      } else {
        toast.error("Update failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 px-2">
    {/* Profile Settings Section */}
    <div className="bg-white rounded-2xl p-3 shadow-xl w-full max-w-4xl ml-0">
      <h1 className="text-2xl font-bold mb-2">Profile Settings</h1>
  
      {/* form and everything else goes here... */}
  

        <form onSubmit={(e) => e.preventDefault()} className="space-y-2">
          {["name", "email", "phone", "passportId", "transactionId"].map((field) => (
            <div key={field}>
              <label htmlFor={field} className="block text-sm font-medium text-gray-700">
                {field.charAt(0).toUpperCase() + field.slice(1)}
              </label>
              <input
                type="text"
                name={field}
                id={field}
                value={(formData as any)[field] || ""}
                onChange={handleChange}
                disabled={!editApproved || !editMode}
                onFocus={() => {
                  if (editApproved) setEditMode(true);
                }}
                className="mt-1 block w-full border rounded-md px-3 py-2 border-gray-300 focus:ring-[#FACE39] focus:border-[#FACE39] disabled:opacity-60"
              />
            </div>
          ))}

          {/* <div className="mt-4">
            {editApproved && editMode ? (
              <button
                onClick={handleSaveChanges}
                type="button"
                disabled={loading}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-full font-semibold hover:bg-green-700 transition"
              >
                💾 Save Changes
              </button>
            ) : editApproved ? (
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="w-full px-6 py-3 bg-[#face39] text-black rounded-full font-bold hover:bg-black hover:text-white transition"
              >
                ✅ Yes, click For Edit
              </button>
            ) : editRequested ? (
              <p className="text-sm font-semibold text-orange-500">🔄 Request pending approval</p>
            ) : (
              <button
                type="button"
                onClick={handleRequestEdit}
                className="w-full px-6 py-3 bg-[#face39] text-black rounded-full font-bold hover:bg-black hover:text-white transition"
              >
                📝 Request for Changes
              </button>
            )}
          </div> */}
        </form>
      </div>

      {/* Services Section */}
      <div className="bg-white rounded-2xl p-4 shadow-xl w-full max-w-4xl ml-0">
        <h1 className="text-2xl font-bold mb-0">Services</h1>

        <div className="flex items-center px-2 mb-4">
          <p className="text-sm text-[#00000f] font-semibold">
            Here you can view your user Services details.
          </p>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="ml-4 px-6 py-3 rounded-full font-semibold text-sm uppercase tracking-wide transition-all duration-300 ease-in-out bg-[#00000f] text-white hover:bg-[#face39] hover:text-[#00000f] shadow-lg hover:shadow-xl ring-2 ring-transparent hover:ring-[#face39]"
          >
            🚀 View Details
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

              {/* {lastMock && (
                <div className="mt-4 border-t pt-3 text-sm">
                  <h3 className="text-lg font-bold mb-2">📄 Latest Mock</h3>
                  <p><strong>Mock Type:</strong> {lastMock.mockType || "N/A"}</p>
                  <p><strong>Test Type:</strong> {lastMock.testType || "N/A"}</p>
                  <p><strong>System:</strong> {lastMock.testSystem || "N/A"}</p>
                  <p><strong>Mock #:</strong> {lastMock.mock || "N/A"}</p>
                  <p><strong>Txn ID:</strong> {lastMock.transactionId || "N/A"}</p>
                </div>
              )} */}
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
                      <th className="p-3 border border-gray-400">❌</th>
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
                        <td className="p-3 border border-gray-300">—</td>
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

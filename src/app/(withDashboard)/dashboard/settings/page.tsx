"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { FaEye, FaEyeSlash } from "react-icons/fa";
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
  status: string;
  paymentStatus: string;
  createdAt: string;
  mock?: number;
  mockType?: string;
  passportNumber?: string;
  transactionId?: string;
  totalMock?: number;
  contactNo?: number;
  isDeleted: boolean;
  testType?: string;
  testSystem?: string;
}

interface ItemType {
  mockType: string;
  testType: string;
  testSystem: string;
  mock: string;
  transactionId: string;
  mrValidation: string;
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

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [submittedItems, setSubmittedItems] = useState<ItemType[]>([]);
  const [lastMock, setLastMock] = useState<ItemType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fetchUserProfileAndMocks = async () => {
    try {
      setLoading(true);
      const userId = getUserIdFromToken();
      if (!userId) throw new Error("No user ID found in token");

      const profileRes = await axios.get(`https://luminedge-server.vercel.app/api/v1/profile/${userId}`);
      const mockRes = await axios.get(`https://luminedge-server.vercel.app/api/v1/user/${userId}`);

      if (profileRes.data.user && mockRes.data.user) {
        const profileUser = profileRes.data.user;
        const mockUser = mockRes.data.user;

        const mergedUser: User = {
          ...profileUser,
          totalMock: mockUser.totalMock ?? 0,
          mock: mockUser.mock ?? 0,
          status: mockUser.status ?? "active",
          mockType: mockUser.mockType,
          testType: mockUser.testType,
          testSystem: mockUser.testSystem,
          passportNumber: profileUser.passportNumber,
          contactNo: profileUser.contactNo,
          transactionId: mockUser.transactionId,
        };

        setSelectedUser(mergedUser);

        setFormData(prev => ({
          ...prev,
          transactionId: mergedUser.transactionId || "",
          name: mergedUser.name || "",
          email: mergedUser.email || "",
          phone: mergedUser.contactNo?.toString() || "",
          passportId: mergedUser.passportNumber || "",
          createdAt: mergedUser.createdAt || "",
        }));
      }

      if (mockRes.data.success) {
        setSubmittedItems(mockRes.data.mocks);
        setLastMock(mockRes.data.lastMock);
      }
    } catch (err) {
      toast.error("Failed to load user data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfileAndMocks();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userId = getUserIdFromToken();
      if (!userId) throw new Error("No user ID found in token");

      const updatePayload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        passportId: formData.passportId,
        transactionId: formData.transactionId,
      };

      const response = await axios.put(
        `https://luminedge-server.vercel.app/api/v1/profile/${userId}`,
        updatePayload,
        { headers: { "Content-Type": "application/json" } }
      );

      if (!response.data.success) throw new Error("Update failed");

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Error updating profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 px-2">
      <div className="bg-white rounded-2xl p-3 shadow-xl w-full max-w-4xl ml-0">
        <h1 className="text-2xl font-bold mb-1">Profile Settings</h1>

        <form onSubmit={handleSubmit} className="space-y-1">
          {["name", "email", "phone", "passportId"].map((field) => (
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
                className="mt-1 block w-full border rounded-md px-3 py-2 border-gray-300 focus:ring-[#FACE39] focus:border-[#FACE39]"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full border rounded-md px-3 py-2 border-gray-300 focus:ring-[#FACE39] focus:border-[#FACE39]"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3">
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="mt-1 block w-full border rounded-md px-3 py-2 border-gray-300 focus:ring-[#FACE39] focus:border-[#FACE39]"
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3">
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center gap-4">
          <button
  type="submit"
  disabled={loading}
  className="relative inline-flex items-center justify-center mt-4  mb-2 px-8 py-3 rounded-full font-bold text-sm uppercase tracking-wider bg-[#face39] text-black transition-all duration-300 ease-in-out shadow-md hover:shadow-2xl hover:bg-[#00000f] hover:text-white ring-2 ring-transparent hover:ring-[#00000f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00000f] disabled:opacity-60 disabled:cursor-not-allowed group"
>
  {loading ? (
    <>
      <span className="animate-spin inline-block mr-2 w-4 h-3 border-2 border-t-transparent border-black rounded-full" />
      Saving...
    </>
  ) : (
    <>
      💾<span className="ml-1">Save Changes</span>
    </>
  )}
</button>


            
          </div>
        </form>
      </div>
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



{isModalOpen && selectedUser && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-700 bg-opacity-50 z-50 px-2 sm:px-4">
          <div className="bg-white p-5 rounded-lg  w-full max-w-6xl flex flex-col lg:flex-row gap-3 overflow-y-auto max-h-[95vh]">
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

              {lastMock && (
                <div className="mt-4 border-t pt-3 text-sm">
                  <h3 className="text-lg font-bold mb-2">📄 Latest Mock</h3>
                  <p><strong>Mock Type:</strong> {lastMock.mockType || "N/A"}</p>
                  <p><strong>Test Type:</strong> {lastMock.testType || "N/A"}</p>
                  <p><strong>System:</strong> {lastMock.testSystem || "N/A"}</p>
                  <p><strong>Mock #:</strong> {lastMock.mock || "N/A"}</p>
                  <p><strong>Txn ID:</strong> {lastMock.transactionId || "N/A"}</p>
                </div>
              )}
            </div>

            <div className="w-px bg-[#00000f]"></div>

            <div className="w-full sm:w-2/3 bg-white rounded-2xl shadow-lg border border-gray-200 p-3 flex flex-col max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">🛠Booking Details</h2>
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
              <div className="flex-grow"></div>
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

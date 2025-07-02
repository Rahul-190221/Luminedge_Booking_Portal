"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

interface User {
  _id: string;
  name: string;
  email: string;
  profileChangeRequestStatus?: string;
  profileEditNote?: string;
  contactNo?: string;
  passportNumber?: string;
  transactionId?: string;
}

const ProfileEditApprovalPage = () => {
  const [usersWithRequests, setUsersWithRequests] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [editedData, setEditedData] = useState<Record<string, Partial<User>>>({});
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const fetchRequestedUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get("https://luminedge-server.vercel.app/api/v1/users/with-profile-request");
      if (res.data.success) {
        const users = res.data.users;
        setUsersWithRequests(users);

        const initialEdits: Record<string, Partial<User>> = {};
        users.forEach((user: User) => {
          initialEdits[user._id] = {
            name: user.name || "",
            email: user.email || "",
            contactNo: user.contactNo || "",
            passportNumber: user.passportNumber || "",
            transactionId: user.transactionId || "",
          };
        });
        setEditedData(initialEdits);
        
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to fetch requests.");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (userId: string, field: keyof User, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value
      }
    }));
  };

  const handleApprove = async (userId: string) => {
    try {
      const updatePayload = editedData[userId];
      const user = usersWithRequests.find(u => u._id === userId);
      if (!user || !updatePayload) return;

      const res = await axios.put(
        `https://luminedge-server.vercel.app/api/v1/user/approve-profile-edit/${userId}`,
        {
          name: updatePayload.name,
          email: updatePayload.email,
          phone: updatePayload.contactNo,
          passportId: updatePayload.passportNumber,
          transactionId: updatePayload.transactionId,
        }
      );
      
      
      if (res.data.success) {
        toast.success("✅ Profile updated and approved!");
        setUsersWithRequests(prev => prev.filter(u => u._id !== userId));
        const newEdits = { ...editedData };
        delete newEdits[userId];
        setEditedData(newEdits);
        setExpandedUserId(null);
      } else {
        toast.error(res.data.message || "Approval failed");
      }
    } catch (error) {
      console.error("Approval error:", error);
      toast.error("Server error");
    }
  };

  useEffect(() => {
    fetchRequestedUsers();
  }, []);

  return (
    <div className="p-1 sm:p-3 w-full sm:max-w-[100%] mx-auto bg-[#ffffff] text-[#00000f] shadow-1xl rounded-2xl border border-[#00000f]/10">
      <h2 className="text-2xl font-bold text-[#00000f] mb-3">📝 Approve Profile Change Requests</h2>

      {loading ? (
        <p>Loading...</p>
      ) : usersWithRequests.length === 0 ? (
        <p className="text-gray-500">No pending requests.</p>
      ) : (
        <div className="space-y-6">
          {usersWithRequests.map(user => {
            const isExpanded = expandedUserId === user._id;

            return (
              <div key={user._id} className="bg-white border border-gray-300 rounded-lg shadow-md p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-semibold text-[#00000f]">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                  <button
                    onClick={() => setExpandedUserId(isExpanded ? null : user._id)}
                    className="px-4 py-2 rounded-full text-sm font-semibold bg-[#00000f] text-white hover:bg-[#face39] hover:text-[#00000f] transition"
                  >
                    {isExpanded ? "Hide Details" : "View Details"}
                  </button>
                </div>

                {isExpanded && (
  <>
    {/* ✅ Show user's reason */}
    {user.profileEditNote && (
      <div className="bg-yellow-100 border border-yellow-300 p-3 rounded text-yellow-800 text-sm">
        <p className="font-semibold">📝 Reason for Edit:</p>
        <p>{user.profileEditNote}</p>
      </div>
    )}

    {/* Editable Fields */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
    <input
      type="text"
      className="input input-bordered w-full"
      placeholder="Name"
      value={editedData[user._id]?.name || user.name}
      onChange={(e) => handleFieldChange(user._id, "name", e.target.value)}
    />
  </div>

  <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
  <input
    type="email"
    className="input input-bordered w-full"
    placeholder="Email"
    value={editedData[user._id]?.email || ""}
    onChange={(e) => handleFieldChange(user._id, "email", e.target.value)}
  />
</div>


  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
    <input
      type="text"
      className="input input-bordered w-full"
      placeholder="Phone"
      value={editedData[user._id]?.contactNo || ""}
      onChange={(e) => handleFieldChange(user._id, "contactNo", e.target.value)}
    />
  </div>

  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">Passport Number</label>
    <input
      type="text"
      className="input input-bordered w-full"
      placeholder="Passport Number"
      value={editedData[user._id]?.passportNumber || ""}
      onChange={(e) => handleFieldChange(user._id, "passportNumber", e.target.value)}
    />
  </div>

  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID</label>
    <input
      type="text"
      className="input input-bordered w-full"
      placeholder="Transaction ID"
      value={editedData[user._id]?.transactionId || ""}
      onChange={(e) => handleFieldChange(user._id, "transactionId", e.target.value)}
    />
  </div>
</div>


    <div className="text-right mt-2">
      <button
        onClick={() => handleApprove(user._id)}
        className="px-6 py-2 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition"
      >
        ✅ Save & Approve
      </button>
    </div>
  </>
)}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProfileEditApprovalPage;

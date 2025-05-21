"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

interface User {
  _id: string;
  name: string;
  email: string;
  profileChangeRequestStatus?: string;
}

const ProfileEditApprovalPage = () => {
  const [usersWithRequests, setUsersWithRequests] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequestedUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get("https://luminedge-server.vercel.app/api/v1/users/with-profile-request");
      if (res.data.success) {
        setUsersWithRequests(res.data.users);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to fetch requests.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const res = await axios.put(`https://luminedge-server.vercel.app/api/v1/user/approve-profile-edit/${userId}`);
      if (res.data.success) {
        toast.success("Profile edit request approved!");
        setUsersWithRequests(prev => prev.filter(user => user._id !== userId)); // Real-time UI update
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
    <div className="flex flex-col gap-1 w-full">
      <h2 className="text-2xl font-bold text-[#00000f] mb-2">📝Approve Profile Change Requests</h2>

      {loading ? (
        <p>Loading...</p>
      ) : usersWithRequests.length === 0 ? (
        <p className="text-gray-500">No pending requests.</p>
      ) : (
<div className="space-y-3 w-full">
  {usersWithRequests.map(user => (
    <div key={user._id} className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 flex justify-between items-center w-full max-w-4xl ml-0">
      <div>
        <p className="text-lg font-medium">{user.name}</p>
        <p className="text-sm text-gray-600">{user.email}</p>
      </div>
      <button
        onClick={() => handleApprove(user._id)}
        className="px-5 py-2 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-all duration-300"
      >
        ✅ Approve
      </button>
    </div>
  ))}
</div>

      )}
    </div>
  );
};

export default ProfileEditApprovalPage;

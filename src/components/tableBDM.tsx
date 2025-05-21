"use client";
import { updateMockNumber } from "@/app/utils/actions/mockUpdate";
import axios from "axios";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { AiOutlineEye } from "react-icons/ai";
import { FiDownload } from "react-icons/fi";

// ✅ Define User Interface
export interface User {
  _id: string;
  name: string;
  email: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  mock?: string;
  mockType?: string;
  passportNumber?: string;
  transactionId?: string;
  totalMock?: number;
  contactNo?: number;
  isDeleted: boolean;
  testType?: string;
  testSystem?: string;
}

// ✅ Define Table Item Interface
interface ItemType {
  mockType: string;
  testType: string;
  testSystem: string;
  mock: string;
  transactionId: string;
  mrValidation: string;
}

const  TableBDM  = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false); // ✅ Add isLoading state
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [usersPerPage, setUsersPerPage] = useState<number>(20);
  const [mock, setMock] = useState<string>("");
  const [mockType, setMockType] = useState<string>("");
  const [transactionId, setTransactionId] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [testType, setTestType] = useState<string>("");
  const [testSystem, setTestSystem] = useState<string>(""); // ✅ Fixed name
  const [lastMock, setLastMock] = useState<ItemType | null>(null);

  
  const [items, setItems] = useState<ItemType[]>([
    { mockType: "", testType: "", testSystem: "", mock: "", transactionId: "", mrValidation: "" },
  ]);
  const [submittedItems, setSubmittedItems] = useState<ItemType[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(
          `https://luminedge-server.vercel.app/api/v1/admin/users`
        );
        const sortedUsers = response.data.users.sort(
          (a: User, b: User) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setUsers(sortedUsers);
        setFilteredUsers(sortedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  // ✅ Filter users based on status, action, and search
  useEffect(() => {
    let filtered = users;

    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => user.status === statusFilter);
    }
    if (actionFilter === "blocked") {
      filtered = filtered.filter((user) => user.isDeleted);
    } else if (actionFilter === "unblocked") {
      filtered = filtered.filter((user) => !user.isDeleted);
    }
    if (searchTerm) {
      filtered = filtered.filter((user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  }, [statusFilter, actionFilter, users, searchTerm]);

  // ✅ Pagination logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  // ✅ Handle mock number update
  const fetchUserMockData = async (userId: string) => {
    try {
      console.log("Fetching mock data for user ID:", userId);
  
      const response = await axios.get(`https://luminedge-server.vercel.app/api/v1/user/${userId}`);
  
      console.log("API Response:", response.data);
  
      if (response.status === 200 && response.data.success) {
        setSubmittedItems(response.data.mocks); // ✅ Store all mocks for table display
        setLastMock(response.data.lastMock); // ✅ Store only the latest entry for user details
      } else {
        setSubmittedItems([]);
        setLastMock(null);
        toast.error("No mock data found for this user.");
      }
    } catch (error) {
      console.error("Error fetching user mock data:", error);
      toast.error("Failed to load user mock data.");
    }
  };
  
  const onViewDetails = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
    fetchUserMockData(user._id); // ✅ Fetch previous mock data
  };
  

  // ✅ Close Modal
  const closeModal = () => {
    setSelectedUser(null);
    setIsModalOpen(false);
  };
  
  return (
    <>
   <h1 className="text-2xl font-minibold text-[#00000f] mb-2">
      🎓Students Waiting for Approval
    </h1>
    <div className="bg-gray-100 p-4 h-22 mb-3 flex flex-col sm:flex-row gap-4 py-2">
        <div className="flex items-center w-full sm:w-auto">
          <label htmlFor="search" className="mr-2 text-xs sm:text-sm md:text-base font-bold">
            Search by Name:
          </label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-2 py-1 border rounded w-full sm:w-auto text-xs sm:text-sm md:text-base"
          />
        </div>

        <div className="flex items-center w-full sm:w-auto">
          <label htmlFor="statusFilter" className="mr-2 text-xs sm:text-sm md:text-base font-bold">
            Filter by Status:
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 border rounded w-full sm:w-auto text-xs sm:text-sm md:text-base"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="checked">Checked</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {isLoading && <div className="text-center">Loading...</div>}

      <div className="overflow-x-auto">
      <table className="table-auto w-full border-collapse text-[#00000f]">
  <thead>
    <tr className="bg-[#face39] text-[#00000f] text-left">
      <th className="px-4 py-2">Name</th>
      <th className="px-4 py-2">Enrollment Date</th>
      <th className="px-4 py-2">Status</th>
      <th className="px-4 py-2">Action</th>
    </tr>
  </thead>
  <tbody>
    {currentUsers.map((user: User) => (
      <tr key={user._id} className="border-b">
        <td className="px-4 py-2 break-words">{user.name}</td>
        <td className="px-4 py-2 break-words">
          {new Date(user.createdAt).toLocaleDateString("en-US", {
            month: "long",
            day: "2-digit",
            year: "numeric",
          })}
        </td>
        <td className="px-4 py-2 break-words">
  <span
    className={`inline-block px-4 py-1 rounded-full text-base font-semibold 
      ${
        user.status === "active"
          ? "bg-red-200 text-red-800"
          : user.status === "completed"
          ? "bg-green-200 text-green-800"
          : "bg-yellow-100 text-yellow-700"
      }`}
  >
    {user.status}
  </span>
</td>

        <td className="px-4 py-2 break-words">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => onViewDetails(user)}
              className="px-5 py-2 rounded-xl bg-[#00000f] text-white font-semibold shadow-md hover:bg-[#face39] hover:text-[#00000f] hover:shadow-xl hover:scale-105 transition-all duration-300 ease-in-out flex items-center gap-1"
            >
              <AiOutlineEye className="text-xl" />
              View
            </button>
          </div>
        </td>
      </tr>
    ))}
  </tbody>
</table>

      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center mt-4">
        <div className="mb-4 sm:mb-0">
          <label htmlFor="usersPerPage" className="mr-2">
            Users per page:
          </label>
          <select
            id="usersPerPage"
            value={usersPerPage}
            onChange={(e) => setUsersPerPage(Number(e.target.value))}
            className="px-2 py-1 border rounded w-full sm:w-auto"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
          </select>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
          >
            Previous
          </button>
          <span className="mx-2">Page {currentPage} / {Math.ceil(filteredUsers.length / usersPerPage)}</span>
          <button
            onClick={() => setCurrentPage((prev) => prev + 1)}
            disabled={indexOfLastUser >= filteredUsers.length}
            className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
          >
            Next
          </button>
        </div>
      </div>

      {isModalOpen && selectedUser && (
  <div className="fixed inset-0 flex items-center justify-center bg-gray-700 bg-opacity-50 z-50">
    <div className="bg-white p-5 rounded-lg shadow-lg w-full sm:w-3/4 flex flex-col sm:flex-row gap-5">
      
      {/* User Details Section */}
      <div className="w-full sm:w-1/3 bg-white rounded-xl shadow-md p-2 border border-gray-300">
        <h2 className="text-2xl font-semibold text-[##00000f] mb-1">👤User Details</h2>
        <div className="space-y-2 text-sm text-[##00000f]">
          <p><strong>Name:</strong> {selectedUser?.name || "N/A"} </p>
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
          <div className="mt-1 border-t pt-0 text-sm">
            <h3 className="text-lg font-bold mb-1">📄Latest Mock</h3>
            <p><strong>Mock Type:</strong> {lastMock.mockType || "N/A"}</p>
            <p><strong>Test Type:</strong> {lastMock.testType || "N/A"}</p>
            <p><strong>System:</strong> {lastMock.testSystem || "N/A"}</p>
            <p><strong>Mock #:</strong> {lastMock.mock || "N/A"}</p>
            <p><strong>Txn ID:</strong> {lastMock.transactionId || "N/A"}</p>
          </div>
        )}
      </div>

      {/* Vertical Divider */}
      <div className="w-px bg-[#00000f]"></div>

{/* Update User Section */}
<div className="w-full sm:w-2/3 bg-white rounded-2xl shadow-lg border border-gray-200 p-2 flex flex-col max-h-[90vh] overflow-y-auto">
  <h2 className="text-2xl font-semibold text-[##00000f] mb-1">🛠Update User</h2>

  <div className="overflow-x-auto">
    <table className="min-w-full text-sm border border-gray-400 border-collapse rounded-lg overflow-hidden shadow-sm">
      <thead>
        <tr className="bg-yellow-300 text-[##00000f] font-semibold text-center">
          <th className="p-3 border border-gray-400">Mock Type</th>
          <th className="p-3 border border-gray-400">Test Type</th>
          <th className="p-3 border border-gray-400">Test System</th>
          <th className="p-3 border border-gray-400">Mock #</th>
          <th className="p-3 border border-gray-400">MR</th>
          <th className="p-3 border border-gray-400">MR Validation</th>
          <th className="p-3 border border-gray-400">❌</th>
        </tr>
      </thead>
      <tbody className="text-center bg-white text-[##00000f]">
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

  {/* Spacer to push the button to the bottom */}
  <div className="flex-grow"></div>

  <div className="flex justify-end items-center mt-6">
  <button
  onClick={closeModal}
  className="bg-gradient-to-r from-red-600 to-red-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300 ease-in-out flex items-center gap-1"
>
  ❌<span>Close</span>
</button>

  </div>
</div>


       </div>
  </div>
)}
    </>
  );
};

export default TableBDM;


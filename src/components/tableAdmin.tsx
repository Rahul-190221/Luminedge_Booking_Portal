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

const TableAdmin = () => {
  const [users, setUsers] = useState<User[]>([]);
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

  // ✅ Mock System Options
  const mockSystemOptions: Record<string, string[]> = {
    IELTS: ["N/A", "Academic", "General Training"],
    GRE: ["PowerPrep", "TCY"],
    TOEFL: ["TCY"],
    "Pearson PTE": ["AIWAS", "TCY"],
  };
  // const fetchUserMockData = async (userId: string) => {
  //   try {
  //     console.log("Fetching mock data for user ID:", userId);
  
  //     const response = await axios.get(
  //       `https://luminedge-server.vercel.app/api/v1/user/${userId}` // ✅ Fetch full user data
  //     );
  
  //     console.log("API Response:", response.data);
  
  //     if (response.status === 200 && response.data) {
  //       const user = response.data; // ✅ Store user data directly
  
  //       // ✅ Convert single fields into an array for table display
  //       setItems([
  //         {
  //           mockType: user.mockType || "",
  //           testType: user.testType || "",
  //           testSystem: user.testSystem || "",
  //           mock: user.mock?.toString() || "",
  //           transactionId: user.transactionId || "",
  //         },
  //       ]);
  //     } else {
  //       setItems([]); // ✅ Clear table if no data found
  //       toast.error("No mock data found for this user.");
  //     }
  //   } catch (error) {
  //     console.error("Error fetching user mock data:", error);
  //     toast.error("Failed to load user mock data.");
  //   }
  // };
  
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
  const updateItem = (index: number, field: keyof ItemType, value: string) => {
    setItems((prevItems) =>
      prevItems.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };
  
  // ✅ Add New Row
  const addItem = () => {
    setItems([
      ...items,
      { mockType: "", testType: "", testSystem: "", mock: "", transactionId: "", mrValidation: "" },
    ]);
  };

  // ✅ Remove Row
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const onUpdateUser = async () => {
    if (!selectedUser) return toast.error("No user selected.");

    const isValid = items.every(item =>
      item.mockType &&
      item.testType &&
      (item.mockType === "IELTS" || item.testSystem) &&
      item.mock &&
      item.transactionId &&
      item.mrValidation
    );

    if (!isValid) return toast.error("Please fill in all required fields before saving.");

    try {
      const response = await axios.put(
        `https://luminedge-server.vercel.app/api/v1/user/update-multiple/${selectedUser._id}`,
        { mocks: items }
      );

      if (response.data.success) {
        toast.success("All mock data updated successfully.");
        setSubmittedItems([...submittedItems, ...items]);
        setLastMock(items[items.length - 1]);
        setItems([{ mockType: "", testType: "", testSystem: "", mock: "", transactionId: "", mrValidation: "" }]);
      } else {
        toast.error(response.data.message || "Failed to update mock data.");
      }
    } catch (error) {
      console.error("Error updating user data:", error);
      toast.error("Failed to update user mock data.");
    }
  };
  
  // Add a function to block/unblock user
  const onToggleBlockUser = async (userId: string) => {
    const user = users.find((u) => u._id === userId);
    if (!user) return;

    const newStatus = user.isDeleted ? "active" : "blocked"; // Toggle status based on isDeleted
    try {
      await axios.put(
        `https://luminedge-server.vercel.app/api/v1/user/block/${userId}`,
        {
          isDeleted: !user.isDeleted, // Toggle isDeleted status
        }
      );
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u._id === userId ? { ...u, isDeleted: !u.isDeleted } : u
        )
      );
      toast.success(`User ${newStatus} successfully`);
    } catch (error) {
      console.error("Error toggling user block status:", error);
      toast.error("Failed to toggle user block status");
    }
  };

  const onChangeStatus = async (_id: string, value: string) => {
    try {
      console.log(`🔄 Updating user status for ID: ${_id} to ${value}`); // ✅ Debugging Log
  
      const response = await axios.put(`https://luminedge-server.vercel.app/api/v1/user/status/${_id}`, { // ✅ Fixed API URL
        status: value,
      });
  
      if (response.status === 200) {
        // ✅ Update state only if the request is successful
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user._id === _id ? { ...user, status: value } : user
          )
        );
        toast.success("✅ User status updated successfully!");
      } else {
        throw new Error(`Unexpected response: ${response.status}`);
      }
    } catch (error: any) {
      console.error("❌ Error updating user status:", error);
  
      // ✅ Provide a more detailed error message
      const errorMessage =
        error.response?.data?.message || `⚠ Failed to update status (Error: ${error.code})`;
      toast.error(errorMessage);
    }
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

  {/* Filter by Status */}
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

  {/* Filter by Action */}
  <div className="flex items-center w-full sm:w-auto">
  <label htmlFor="statusFilter" className="mr-2 text-xs sm:text-sm md:text-base font-bold">
      Active:
    </label>
    <select
      id="actionFilter"
      value={actionFilter}
      onChange={(e) => setActionFilter(e.target.value)}
      className="px-2 py-1 border rounded w-full sm:w-auto text-xs sm:text-sm md:text-base"
    >
      <option value="all">All</option>
      <option value="blocked">Blocked</option>
      <option value="unblocked">Unblocked</option>
    </select>
  </div>
      </div>
      
      <div className="mb-4"></div>

      <div className="overflow-x-auto">
        <table className="table-auto w-full border-collapse text-[#00000f]">
          {/* Table Head */}
          <thead>
          <tr className="bg-[#face39]">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Enrollment Date</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {/* Row Mapping */}
            {currentUsers.map((user: User) => (
              <tr key={user._id} className="border-b">
                <td className="px-4 py-2 break-words">{user.name}</td>
                <td className="px-4 py-2 break-words">
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "2-digit",
                    year: "numeric",
                  }).replace(/^(\w+) (\d+), (\d+)$/, "$2 $1, $3")}
                </td>
                <td className="px-4 py-3 break-words">
  <select
    value={user.status}
    onChange={(e) => onChangeStatus(user._id, e.target.value)}
    className={`px-2 py-1 border rounded w-full sm:w-auto text-xs sm:text-sm md:text-base font-semibold shadow-sm transition-all duration-300 ease-in-out
      ${
        user.status === 'active'
          ? 'bg-red-100 text-red-700 border-red-300'
          : user.status === 'completed'
          ? 'bg-green-100 text-green-700 border-green-300'
          : 'bg-yellow-100 text-yellow-700 border-yellow-400'
      }
    `}
  >
    <option value="active">Active</option>
    <option value="checked">Checked</option>
    <option value="completed">Completed</option>
  </select>
</td>

                <td className="px-4 py-2 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 break-words">
                <button
  onClick={() => onViewDetails(user)}
  className="px-5 py-2 rounded-xl bg-[#00000f] text-white font-semibold  hover:bg-[#face39] hover:text-[#00000f] hover:shadow-xl hover:scale-105 transition-all duration-300 ease-in-out flex items-center gap-1"
>
  <AiOutlineEye className="text-xl" />
  View
</button>
<button
  onClick={() => onToggleBlockUser(user._id)}
  className={`px-5 py-2 w-full sm:w-28 rounded-lg font-semibold text-sm uppercase tracking-wide transition-all duration-300 ease-in-out  flex items-center justify-center gap-1 
    ${user.isDeleted 
      ? "bg-red-600 text-white hover:bg-red-700" 
      : "bg-yellow-400 text-black hover:bg-yellow-500"
    }`}
>
  {user.isDeleted ? "Unblock" : "Block"}
</button>

                  
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4">
        <div className="mb-4 sm:mb-0 text-[#00000f]">
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
        <div className="flex space-x-2 text-[#00000f]">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400 text-[#00000f]"
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
      {/* Modal for User Details */}
      {isModalOpen && selectedUser && (
  <div className="fixed inset-0 flex items-center justify-center bg-gray-700 bg-opacity-50 z-50">
    <div className="bg-white p-5 rounded-lg shadow-lg w-full sm:w-3/4 flex flex-col sm:flex-row gap-5">
      
      {/* User Details Section */}
      <div className="w-full sm:w-1/3 bg-white rounded-xl shadow-md p-3 border border-gray-300">
        <h2 className="text-2xl font-semibold text-[#00000f] mb-1">👤User Details</h2>
        <div className="space-y-1 text-sm text-[#00000f]">
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
          <div className="mt-0 border-t pt-3 text-sm">
            <h3 className="text-lg font-bold mb-0">📄Latest Mock</h3>
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
      <div className="w-full sm:w-2/3 bg-white rounded-2xl shadow-lg border  p-3">
        <h2 className="text-2xl font-semibold text-[#00000f] mb-2">🛠Update User</h2>

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

              {items.map((item, index) => (
                <tr key={`new-${index}`} className="hover:bg-gray-50">
                  <td className="p-2 border border-gray-300">
                    <select
                      value={item.mockType}
                      onChange={(e) => updateItem(index, "mockType", e.target.value)}
                      className="w-full px-2 py-1 border rounded"
                      required
                    >
                      <option value="">Select</option>
                      <option value="IELTS">IELTS</option>
                      <option value="GRE">GRE</option>
                      <option value="TOEFL">TOEFL</option>
                      <option value="Pearson PTE">Pearson PTE</option>
                    </select>
                  </td>
                  <td className="p-2 border border-gray-300">
                    <select
                      value={item.testType}
                      onChange={(e) => updateItem(index, "testType", e.target.value)}
                      className="w-full px-2 py-1 border rounded"
                      disabled={!item.mockType}
                      required
                    >
                      <option value="">Select</option>
                      {item.mockType === "IELTS" ? (
                        <>
                          <option value="Paper-Based">Paper-Based</option>
                          <option value="Computer-Based">Computer-Based</option>
                        </>
                      ) : (
                        <option value="Computer-Based">Computer-Based</option>
                      )}
                    </select>
                  </td>
                  <td className="p-2 border border-gray-300">
                    <select
                      value={item.testSystem}
                      onChange={(e) => updateItem(index, "testSystem", e.target.value)}
                      className="w-full px-2 py-1 border rounded"
                      disabled={!item.mockType}
                      required={item.mockType !== "IELTS"}
                    >
                      <option value="">Select</option>
                      {mockSystemOptions[item.mockType]?.map((system) => (
                        <option key={system} value={system}>
                          {system}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 border border-gray-300">
                    <input
                      type="text"
                      value={item.mock}
                      onChange={(e) => updateItem(index, "mock", e.target.value)}
                      className="w-full px-2 py-1 border rounded"
                      required
                    />
                  </td>
                  <td className="p-2 border border-gray-300">
                    <input
                      type="text"
                      value={item.transactionId}
                      onChange={(e) => updateItem(index, "transactionId", e.target.value)}
                      className="w-full px-2 py-1 border rounded"
                      required
                    />
                  </td>
                  <td className="p-2 border border-gray-300">
                    <select
                      value={item.mrValidation}
                      onChange={(e) => updateItem(index, "mrValidation", e.target.value)}
                      className="w-full px-2 py-1 border rounded"
                      required
                    >
                      <option value="">Select Duration</option>
                      <option value="5 Minutes">5 Minutes</option>
                      <option value="10 Minutes">10 Minutes</option>
                      <option value="1 Month">1 Month</option>
                      <option value="2 Months">2 Months</option>
                      <option value="3 Months">3 Months</option>
                      <option value="6 Months">6 Months</option>
                    </select>
                  </td>
                  <td className="p-2 border border-gray-300">
                  <button
  onClick={() => removeItem(index)}
  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 ease-in-out text-sm flex items-center justify-center"
>
  ❌
</button>

                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
{/* Spacer to push the button to the bottom */}
<div className="flex-grow"></div>

        <div className="flex justify-between items-center mt-0">
        <div className="flex items-center justify-between mt-6 flex-wrap gap-[23rem]">

  {/* Left-aligned Add More button */}
  <button
  onClick={addItem}
  className="bg-[#00000f] text-white px-4 py-2 rounded-xl font-semibold shadow-sm hover:bg-[#face39] hover:text-[#00000f] hover:shadow-md hover:scale-105 transition-all duration-300 ease-in-out flex items-center gap-2"
>
  ➕ Add More
</button>


  {/* Right-aligned Save and Close buttons */}
  <div className="flex items-center gap-4">
    <button
      onClick={() => {
        const isValid = items.every(
          (item) =>
            item.mockType &&
            item.testType &&
            (item.mockType === "IELTS" || item.testSystem) &&
            item.mock &&
            item.transactionId
        );
        if (isValid) {
          onUpdateUser();
        } else {
          alert("Please fill in all required fields before saving.");
        }
      }}
      className="bg-green-600 text-white px-5 py-2 rounded-xl font-semibold shadow-sm hover:bg-green-700 hover:shadow-md hover:scale-105 transition-all duration-300 ease-in-out flex items-center gap-2"
    >
      ✅ Save
    </button>

    <button
      onClick={closeModal}
      className="bg-red-600 text-white px-5 py-2 rounded-xl font-semibold shadow-sm hover:bg-red-700 hover:shadow-md hover:scale-105 transition-all duration-300 ease-in-out flex items-center gap-2"
    >
      ❌ Close
    </button>
  </div>


          </div>
        </div>
      </div>
    </div>
  </div>
)}


    </>
  );
};


export default TableAdmin;

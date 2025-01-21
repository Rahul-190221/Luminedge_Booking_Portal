"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { AiOutlineEye } from "react-icons/ai";

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
  testSystem?: string; // New field for test type
}

const TableBDM = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all"); // Holds the selected status filter
  const [currentPage, setCurrentPage] = useState<number>(1); // Current page number
  const [usersPerPage, setUsersPerPage] = useState<number>(20); // Users per page
    const [searchTerm, setSearchTerm] = useState<string>(""); // Search term
  const [isLoading, setIsLoading] = useState(false); // Loader state

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`https://luminedge-server.vercel.app/api/v1/admin/users`);
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

  // Filter users by status and search term
  useEffect(() => {
    let filtered = users;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => user.status === statusFilter);
    }

   

    setFilteredUsers(filtered);
  }, [statusFilter, users]);

  // Calculate pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  // Function to view user details (opens modal and sets selected user)
  const onViewDetails = (user: User) => {
    setSelectedUser(user);
    setMock(user.mock || ""); // Initialize mock number
    setMockType(user.mockType || ""); // Initialize mock type with existing value
    setTransactionId(user.transactionId || ""); // Initialize transaction ID with existing value
    setTestType(user.testType || ""); // Initialize test type with existing value
    setIsModalOpen(true);
    settestSystem(user.testSystem || "");
   
    console.log("Selected User Mock Number:", user.mock);
  };

  // Function to close the modal
  const closeModal = () => {
    setSelectedUser(null);
    setIsModalOpen(false);
  };
  const setMock = (mock: string) => {
    setSelectedUser((prevUser) => prevUser ? { ...prevUser, mock } : null);
  };
  
  const setMockType = (mockType: string) => {
    setSelectedUser((prevUser) => prevUser ? { ...prevUser, mockType } : null);
  };
  
  const setTransactionId = (transactionId: string) => {
    setSelectedUser((prevUser) => prevUser ? { ...prevUser, transactionId } : null);
  };
  
  const setTestType = (testType: string) => {
    setSelectedUser((prevUser) => prevUser ? { ...prevUser, testType } : null);
  };
  
  const settestSystem = (testSystem: string) => {
    setSelectedUser((prevUser) => prevUser ? { ...prevUser, testSystem } : null);
  };
  
  return (
    <>
    <h1 className="text-xl md:text-1.5xl font-semibold mb-4">
          Students Waiting for Approval
        </h1>
    <div className="bg-gray-100 p-4 h-22 mb-3 flex flex-col sm:flex-row gap-4 py-4">
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
        <table className="table-auto w-full border-collapse">
          <thead>
          <tr className="bg-[#face39]">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Enrollment Date</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Action</th>
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
                <td className="px-4 py-2 break-words">{user.status}</td>
                <td className="px-4 py-2 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 break-words">
                  <button
                    onClick={() => onViewDetails(user)}
                    className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center"
                  >
                    <AiOutlineEye className="mr-2" /> View
                  </button>
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
          <div className="bg-white p-5 rounded-lg shadow-lg w-full sm:w-1/2">
            <h2 className="text-xl font-bold mb-4">User Details</h2>
            <div className="space-y-2">
              <p><strong>Name:</strong> {selectedUser.name}</p>
              <p><strong>Email:</strong> {selectedUser.email}</p>
              <p><strong>Phone Number:</strong> {selectedUser.contactNo}</p>
              <p><strong>Mock Type:</strong> {selectedUser.mockType || "N/A"}</p>
              <p><strong>Test Type:</strong> {selectedUser.testType || "N/A"}</p>
              <p><strong>Passport Number:</strong> {selectedUser.passportNumber || "N/A"}</p>
              <p><strong>Purchased:</strong> {selectedUser.totalMock || "N/A"}</p>
              <p><strong>Booked:</strong> {Number(selectedUser.totalMock ?? 0) - Number(selectedUser.mock ?? 0) || "N/A"}</p>
              <p><strong>Remaining:</strong> {selectedUser.mock || "N/A"}</p>
              <p><strong>Status:</strong> {selectedUser.status}</p>
              <p><strong>Transaction ID:</strong> {selectedUser.transactionId || "N/A"}</p>
              <p><strong>Created At:</strong> {new Date(selectedUser.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TableBDM;


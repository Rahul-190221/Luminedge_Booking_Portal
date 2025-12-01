"use client";
import axios from "axios";
import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { AiOutlineEye } from "react-icons/ai";

// ✅ Define User Interface
export interface User {
  _id: string;
  name: string;
  email: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  mock?: string | number;
  mockType?: string;
  passportNumber?: string;
  transactionId?: string;
  totalMock?: number;
  contactNo?: number | string;
  isDeleted: boolean;
  testType?: string;
  testSystem?: string;
  // role?: string; // add if your backend returns role
}

// ✅ Define Table Item Interface
interface ItemType {
  mockType: string;
  testType: string;
  testSystem: string;
  mock: string;
  transactionId: string;
  mrValidation: string;
  mrValidationExpiry?: string;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "https://luminedge-server.vercel.app";

const TableBDM = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // UI controls
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [usersPerPage, setUsersPerPage] = useState<number>(20);

  // mocks/details
  const [submittedItems, setSubmittedItems] = useState<ItemType[]>([]);
  const [lastMock, setLastMock] = useState<ItemType | null>(null);

  // ---------- fetch all users (robust, server-paginated) ----------
  useEffect(() => {
    const fetchAllUsers = async () => {
      setIsLoading(true);
      try {
        const acc: User[] = [];
        const seen = new Set<string>();

        const requestedLimit = 500;
        let page = 1;
        let effectiveLimit: number | null = null;
        let totalFromServer: number | null = null;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data } = await axios.get(`${API_BASE}/api/v1/admin/users`, {
            params: { page, limit: requestedLimit, role: "user" },
          });

          const batch: User[] = (data?.users ?? []) as User[];

          // First page: detect real page size & total if provided
          if (page === 1) {
            effectiveLimit = batch.length || requestedLimit;
            if (typeof data?.total === "number") {
              totalFromServer = data.total;
            }
          }

          if (!batch.length) break;

          let newCount = 0;
          for (const u of batch) {
            const id = String(u._id);
            if (!seen.has(id)) {
              seen.add(id);
              acc.push(u);
              newCount++;
            }
          }

          // If nothing new was added, stop (backend may be ignoring page)
          if (newCount === 0) break;

          // If total is known and we already have all, stop
          if (totalFromServer && acc.length >= totalFromServer) break;

          // If this page is shorter than the effective page size, it is the last page
          if (effectiveLimit && batch.length < effectiveLimit) break;

          page += 1;
        }

        // sort by createdAt desc
        acc.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setUsers(acc);
      } catch (err) {
        console.error("Error fetching users:", err);
        toast.error("Failed to load users.");
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllUsers();
  }, []);

  // ---------- filtering (memoized) ----------
  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let list = users;

    if (statusFilter !== "all") {
      list = list.filter(
        (u) =>
          String(u.status).toLowerCase() === statusFilter.toLowerCase()
      );
    }

    if (actionFilter === "blocked") {
      list = list.filter((u) => !!u.isDeleted);
    } else if (actionFilter === "unblocked") {
      list = list.filter((u) => !u.isDeleted);
    }

    if (q) {
      list = list.filter((u) => {
        const name = String(u.name ?? "").toLowerCase();
        const email = String(u.email ?? "").toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }

    return list;
  }, [users, statusFilter, actionFilter, searchTerm]);

  // Reset to page 1 whenever filters/search change to avoid empty pages
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, actionFilter, searchTerm]);

  // ---------- pagination slice ----------
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  // ---------- user mock details ----------
  const fetchUserMockData = async (userId: string) => {
    try {
      const { data, status } = await axios.get(
        `${API_BASE}/api/v1/user/${userId}`
      );
      if (status === 200 && data?.success) {
        setSubmittedItems(data.mocks || []);
        setLastMock(data.lastMock || null);
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
    fetchUserMockData(user._id);
  };

  const closeModal = () => {
    setSelectedUser(null);
    setIsModalOpen(false);
  };

  return (
    <>
      <h1 className="text-2xl font-minibold text-[#00000f] mb-2">
        🎓 Students Waiting for Approval
      </h1>

      {/* Filters */}
      <div className="bg-gray-100 p-4 h-22 mb-3 flex flex-col sm:flex-row gap-4 py-2">
        <div className="flex items-center w-full sm:w-auto">
          <label
            htmlFor="search"
            className="mr-2 text-xs sm:text-sm md:text-base font-bold"
          >
            Search <span className="font-normal">(Name/Email)</span>:
          </label>
          <input
            id="search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-2 py-1 border rounded w-full sm:w-auto text-xs sm:text-sm md:text-base"
            placeholder="Type to search…"
          />
        </div>

        <div className="flex items-center w-full sm:w-auto">
          <label
            htmlFor="statusFilter"
            className="mr-2 text-xs sm:text-sm md:text-base font-bold"
          >
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

        <div className="flex items-center w-full sm:w-auto">
          <label
            htmlFor="actionFilter"
            className="mr-2 text-xs sm:text-sm md:text-base font-bold"
          >
            Action:
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

      {isLoading && <div className="text-center">Loading...</div>}

      {/* Table */}
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
                <td className="px-4 py-2 break-words">{user.name || "N/A"}</td>

                <td className="px-4 py-2 break-words">
                  {new Date(user.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "long",
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

            {!isLoading && currentUsers.length === 0 && (
              <tr>
                {/* 4 columns in thead, so colSpan = 4 */}
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-sm text-gray-600"
                >
                  No users match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4">
        <div className="mb-4 sm:mb-0">
          <label htmlFor="usersPerPage" className="mr-2">
            Users per page:
          </label>
          <select
            id="usersPerPage"
            value={usersPerPage}
            onChange={(e) => {
              setUsersPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 border rounded w-full sm:w-auto"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
          </select>
        </div>

        <div className="flex space-x-2 items-center">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="mx-2">
            Page {currentPage} /{" "}
            {Math.max(1, Math.ceil(filteredUsers.length / usersPerPage))}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => prev + 1)}
            disabled={indexOfLastUser >= filteredUsers.length}
            className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-700 bg-opacity-50 z-50">
          <div className="bg-white p-5 rounded-lg shadow-lg w-full sm:w-3/4 flex flex-col sm:flex-row gap-5">
            {/* User Details */}
            <div className="w-full sm:w-1/3 bg-white rounded-xl shadow-md p-2 border border-gray-300">
              <h2 className="text-2xl font-semibold text-[#00000f] mb-1">
                👤User Details
              </h2>
              <div className="space-y-2 text-sm text-[#00000f]">
                <p>
                  <strong>Name:</strong> {selectedUser?.name || "N/A"}
                </p>
                <p>
                  <strong>Email:</strong> {selectedUser?.email || "N/A"}
                </p>
                <p>
                  <strong>Phone:</strong> {selectedUser?.contactNo || "N/A"}
                </p>
                <p>
                  <strong>Passport No:</strong>{" "}
                  {selectedUser?.passportNumber || "N/A"}
                </p>
                <p>
                  <strong>Transaction ID:</strong>{" "}
                  {selectedUser?.transactionId || "N/A"}
                </p>

                {!submittedItems.length && (
                  <>
                    <p>
                      <strong>Test Name:</strong>{" "}
                      {selectedUser?.mockType || "N/A"}
                    </p>
                    <p>
                      <strong>Test Type:</strong>{" "}
                      {selectedUser?.testType || "N/A"}
                    </p>
                  </>
                )}

                <p>
                  <strong>Purchased:</strong>{" "}
                  {selectedUser?.totalMock ?? "N/A"}
                </p>
                <p>
                  <strong>Booked:</strong>{" "}
                  {selectedUser?.totalMock != null &&
                  selectedUser?.mock != null
                    ? Number(selectedUser?.totalMock) -
                      Number(selectedUser?.mock)
                    : "N/A"}
                </p>
                <p>
                  <strong>Remaining:</strong> {selectedUser?.mock ?? "N/A"}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span
                    className={`font-semibold ${
                      selectedUser?.status === "blocked"
                        ? "text-red-500"
                        : "text-green-600"
                    }`}
                  >
                    {selectedUser?.status || "N/A"}
                  </span>
                </p>
              </div>

              {lastMock && (
                <div className="mt-1 border-t pt-0 text-sm">
                  <h3 className="text-lg font-bold mb-1">📄Latest Mock</h3>
                  <p>
                    <strong>Mock Type:</strong> {lastMock.mockType || "N/A"}
                  </p>
                  <p>
                    <strong>Test Type:</strong> {lastMock.testType || "N/A"}
                  </p>
                  <p>
                    <strong>System:</strong> {lastMock.testSystem || "N/A"}
                  </p>
                  <p>
                    <strong>Mock #:</strong> {lastMock.mock || "N/A"}
                  </p>
                  <p>
                    <strong>Txn ID:</strong>{" "}
                    {lastMock.transactionId || "N/A"}
                  </p>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="w-px bg-[#00000f]" />

            {/* History Table */}
            <div className="w-full sm:w-2/3 bg-white rounded-2xl shadow-lg border border-gray-200 p-2 flex flex-col max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-semibold text-[#00000f] mb-1">
                🛠Update User
              </h2>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-gray-400 border-collapse rounded-lg overflow-hidden shadow-sm">
                  <thead>
                    <tr className="bg-yellow-300 text-[#00000f] font-semibold text-center">
                      <th className="p-3 border border-gray-400">Mock Type</th>
                      <th className="p-3 border border-gray-400">Test Type</th>
                      <th className="p-3 border border-gray-400">
                        Test System
                      </th>
                      <th className="p-3 border border-gray-400">Mock #</th>
                      <th className="p-3 border border-gray-400">MR</th>
                      <th className="p-3 border border-gray-400">
                        MR Validation
                      </th>
                      <th className="w-[20%] p-1 border border-gray-300">
                        Expired Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-center bg-white text-[#00000f]">
                    {submittedItems.map((item, index) => (
                      <tr key={`submitted-${index}`} className="hover:bg-gray-50">
                        <td className="p-3 border border-gray-300">
                          {item.mockType}
                        </td>
                        <td className="p-3 border border-gray-300">
                          {item.testType}
                        </td>
                        <td className="p-3 border border-gray-300">
                          {item.testSystem}
                        </td>
                        <td className="p-3 border border-gray-300">
                          {item.mock}
                        </td>
                        <td className="p-3 border border-gray-300">
                          {item.transactionId}
                        </td>
                        <td className="p-3 border border-gray-300">
                          {item.mrValidation}
                        </td>
                        <td className="p-1 border border-gray-300">
                          {item.mrValidationExpiry
                            ? new Date(
                                item.mrValidationExpiry
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "2-digit",
                              })
                            : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex-grow" />

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

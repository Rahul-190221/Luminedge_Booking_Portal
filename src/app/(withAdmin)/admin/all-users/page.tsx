"use client";
import axios from "axios";
import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { AiOutlineEye } from "react-icons/ai";
import UserTable from "@/components/userTable";

// ✅ Define User Interface
export interface User {
  _id: string;
  name: string;
  email: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  mock?: number | string;
  mockType?: string;
  passportNumber?: string;
  transactionId?: string;
  totalMock?: number | string;
  contactNo?: number | string;
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
  isEditing?: boolean;
}

type ApiUsersResp = { users?: User[]; total?: number };

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "https://luminedge-server.vercel.app";

// ---- helpers -------------------------------------------------------
const tryParseDate = (v: any): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Use createdAt if valid; otherwise fallback to ObjectId timestamp
const createdAtSafe = (u: User): number => {
  const d = tryParseDate(u.createdAt);
  if (d) return d.getTime();
  try {
    const ms = parseInt((u._id || "").slice(0, 8), 16) * 1000;
    return Number.isFinite(ms) ? ms : 0;
  } catch {
    return 0;
  }
};

const toNum = (v: number | string | undefined | null) => {
  if (v === undefined || v === null) return undefined;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
};

const formatDisplayDate = (u: User) => {
  const ms = createdAtSafe(u);
  if (!ms) return "—";
  return new Date(ms)
    .toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" })
    .replace(/^(\w+) (\d+), (\d+)$/, "$2 $1, $3");
};

// 🔁 fetch *all* completed users by paging the API (no backend change needed)
const fetchAllCompletedUsers = async (): Promise<User[]> => {
  const limit = 500; // matches backend default cap
  let page = 1;
  let total = Infinity;
  const all: User[] = [];

  while (all.length < total) {
    const { data } = await axios.get<ApiUsersResp>(`${API_BASE}/api/v1/admin/users`, {
      params: { status: "completed", page, limit },
    });

    const batch = Array.isArray(data?.users) ? data!.users! : [];
    // if server returns total, use it; else stop when a short page arrives
    total = typeof data?.total === "number" ? data.total : all.length + batch.length;

    all.push(...batch);
    if (batch.length < limit) break; // last page reached
    page += 1;
  }

  // newest first using safe timestamp
  return all.sort((a, b) => createdAtSafe(b) - createdAtSafe(a));
};

const BookingsTable = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("completed");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [usersPerPage, setUsersPerPage] = useState<number>(20);
  const [lastMock, setLastMock] = useState<ItemType | null>(null);
  const [submittedItems, setSubmittedItems] = useState<ItemType[]>([]);

  // ✅ Fetch users on load (all completed, across all pages)
  useEffect(() => {
    (async () => {
      try {
        const allCompleted = await fetchAllCompletedUsers();
        setUsers(allCompleted);
        setFilteredUsers(allCompleted);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to load users.");
      }
    })();
  }, []);

  // ✅ Filter logic (robust status matching)
  useEffect(() => {
    let filtered = users;

    if (statusFilter !== "all") {
      const wanted = statusFilter.trim().toLowerCase();
      filtered = filtered.filter(
        (user) => (user.status || "").trim().toLowerCase() === wanted
      );
    }
    if (actionFilter === "blocked") {
      filtered = filtered.filter((user) => !!user.isDeleted);
    } else if (actionFilter === "unblocked") {
      filtered = filtered.filter((user) => !user.isDeleted);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((user) =>
        (user.name || "").toLowerCase().includes(term)
      );
    }

    setFilteredUsers(filtered);
  }, [statusFilter, actionFilter, users, searchTerm]);

  useEffect(() => {
    setCurrentPage(1); // reset pagination on filter change
  }, [statusFilter, actionFilter, searchTerm]);

  // ✅ Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = useMemo(
    () => filteredUsers.slice(indexOfFirstUser, indexOfLastUser),
    [filteredUsers, indexOfFirstUser, indexOfLastUser]
  );

  // ✅ Fetch mocks (work with either of your backend shapes)
  const fetchUserMockData = async (userId: string) => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/v1/user/${userId}`);
      if (data?.success || data?.mocks || data?.lastMock) {
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
    setIsModalOpen(false);
    setSelectedUser(null);
    setSubmittedItems([]);
    setLastMock(null);
  };

  return (
    <>
      <div className="p-1 sm:p-3 w-full sm:max-w-[100%] mx-auto bg-[#ffffff] text-[#00000f] shadow-1xl rounded-2xl border border-[#00000f]/10">
        <h1 className="text-2xl font-minibold text-[#00000f] mb-2">
          🎓 Students Booking Details
        </h1>

        {/* Filters */}
        <div className="bg-gray-100 p-4 h-22 mb-3 flex flex-col sm:flex-row gap-4 py-2">
          {/* Search */}
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

          {/* Status Filter */}
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

          {/* Action Filter */}
          <div className="flex items-center w-full sm:w-auto">
            <label htmlFor="actionFilter" className="mr-2 text-xs sm:text-sm md:text-base font-bold">
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse text-[#00000f]">
            <thead>
              <tr className="bg-[#face39]">
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Enrollment Date</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Purshed</th>
                <th className="px-4 py-2 text-left">Booked</th>
                <th className="px-4 py-2 text-left">Bookings</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.map((user: User) => {
                const totalMock = toNum(user.totalMock);
                const usedMock = toNum(user.mock);
                const booked =
                  totalMock !== undefined && usedMock !== undefined
                    ? totalMock - usedMock
                    : undefined;

                return (
                  <tr key={user._id} className="border-b">
                    <td className="px-4 py-2 break-words">{user.name}</td>
                    <td className="px-4 py-2 break-words">{formatDisplayDate(user)}</td>
                    <td className="px-4 py-2 break-words">{user.email}</td>
                    <td className="px-4 py-2 break-words">{user.status}</td>
                    <td className="px-4 py-2 break-words text-center">
                      {totalMock !== undefined ? totalMock : "N/A"}
                    </td>
                    <td className="px-4 py-2 break-words text-center">
                      {booked !== undefined ? booked : "N/A"}
                    </td>
                    <td className="px-4 py-2 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 break-words">
                      <button
                        onClick={() => onViewDetails(user)}
                        className="px-5 py-2 rounded-xl bg-[#00000f] text-white font-semibold hover:bg-[#face39] hover:text-[#00000f] hover:shadow-xl hover:scale-105 transition-all duration-300 ease-in-out flex items-center gap-1"
                      >
                        <AiOutlineEye className="text-xl" />
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {isModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white w-full max-w-5xl p-2 rounded-2xl shadow-2xl border border-[#face39] relative">
              <h2 className="text-[#00000f]">{selectedUser.name}&rsquo;s Booking Summary</h2>

              <div className="border border-gray-300 rounded-xl p-4 shadow-inner">
                <UserTable userId={selectedUser._id} />
              </div>
              <div className="flex justify-center mt-2 space-x-2">
                <button
                  onClick={closeModal}
                  className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-2.5 rounded-full text-lg font-bold tracking-wide shadow-lg hover:scale-105 hover:from-red-700 hover:to-red-800 transition-all duration-300 ease-in-out"
                >
                  ❌Close
                </button>
              </div>
            </div>
          </div>
        )}

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
              className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="mx-2">
              Page {currentPage} / {Math.max(1, Math.ceil(filteredUsers.length / usersPerPage))}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={currentPage >= Math.ceil(filteredUsers.length / usersPerPage)}
              className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default BookingsTable;

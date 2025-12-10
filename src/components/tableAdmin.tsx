"use client";
import { updateMockNumber } from "@/app/utils/actions/mockUpdate";
import axios from "axios";
import { useState, useEffect, useMemo } from "react";
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
  role?: string; // used for filtering/analytics elsewhere
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
  isEditing?: boolean;
}

// ✅ API base (shared with Dashboard)
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "https://luminedge-server.vercel.app";

// ✅ Props: parent can pass rows + external loading state
interface TableAdminProps {
  rows?: User[];
  externalLoading?: boolean;
}

const TableAdmin = ({ rows, externalLoading }: TableAdminProps) => {
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
  const [testSystem, setTestSystem] = useState<string>("");
  const [lastMock, setLastMock] = useState<ItemType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [items, setItems] = useState<ItemType[]>([
    {
      mockType: "",
      testType: "",
      testSystem: "",
      mock: "",
      transactionId: "",
      mrValidation: "",
    },
  ]);
  const [submittedItems, setSubmittedItems] = useState<ItemType[]>([]);

  const loading = externalLoading ?? isLoading;

  // // 🧲 Fetch ALL users ONLY if parent did not provide rows
  // useEffect(() => {
  //   let cancelled = false;

  //   // If parent passes rows (even an empty array), we treat this as source of truth
  //   if (rows !== undefined) {
  //     if (!cancelled) {
  //       setUsers(rows || []);
  //       setFilteredUsers(rows || []);
  //       setIsLoading(false);
  //     }
  //     return;
  //   }

  //   const fetchAllUsers = async () => {
  //     setIsLoading(true);
  //     try {
  //       const acc: User[] = [];
  //       const seen = new Set<string>();

  //       const requestedLimit = 500;
  //       let page = 1;
  //       let effectiveLimit: number | null = null;
  //       let totalFromServer: number | null = null;

  //       // eslint-disable-next-line no-constant-condition
  //       while (true) {
  //         if (cancelled) break;

  //         const { data } = await axios.get(`${API_BASE}/api/v1/admin/users`, {
  //           params: { page, limit: requestedLimit },
  //         });

  //         const batch: User[] = (data?.users ?? []) as User[];

  //         if (page === 1) {
  //           effectiveLimit = batch.length || requestedLimit;
  //           if (typeof data?.total === "number") {
  //             totalFromServer = data.total;
  //           }
  //         }

  //         if (!batch.length) break;

  //         let newCount = 0;
  //         for (const u of batch) {
  //           const id = String(u._id);
  //           if (!seen.has(id)) {
  //             seen.add(id);
  //             acc.push(u);
  //             newCount++;
  //           }
  //         }

  //         if (newCount === 0) break;
  //         if (totalFromServer && acc.length >= totalFromServer) break;
  //         if (effectiveLimit && batch.length < effectiveLimit) break;

  //         page += 1;
  //       }

  //       if (!cancelled) {
  //         const sorted = acc.sort(
  //           (a, b) =>
  //             new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  //         );
  //         setUsers(sorted);
  //         setFilteredUsers(sorted);
  //       }
  //     } catch (error) {
  //       if (!cancelled) {
  //         console.error("Error fetching users:", error);
  //         setUsers([]);
  //         setFilteredUsers([]);
  //         toast.error("Failed to load users.");
  //       }
  //     } finally {
  //       if (!cancelled) setIsLoading(false);
  //     }
  //   };

  //   // Only run internal fetch when parent does NOT provide rows
  //   if (rows === undefined) {
  //     fetchAllUsers();
  //   }

  //   return () => {
  //     cancelled = true;
  //   };
  // }, [rows]);

  useEffect(() => {
    let cancelled = false;
  
    if (rows !== undefined) {
      const byId = new Map<string, User>();
      (rows || []).forEach((u) => {
        byId.set(String(u._id), u);
      });
      const unique = Array.from(byId.values());
  
      if (!cancelled) {
        setUsers(unique);
        setFilteredUsers(unique);
        setIsLoading(false);
      }
      return () => {
        cancelled = true;
      };
    }
  
    // ... your existing internal fetch for standalone usage
  }, [rows]);
  

  // 🔎 Compute filtered list (status, blocked/unblocked, search)
  useEffect(() => {
    let filtered = users;

    if (statusFilter !== "all") {
      filtered = filtered.filter((u) => String(u.status) === statusFilter);
    }

    if (actionFilter === "blocked") {
      filtered = filtered.filter((u) => !!u.isDeleted);
    } else if (actionFilter === "unblocked") {
      filtered = filtered.filter((u) => !u.isDeleted);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      filtered = filtered.filter((u) => {
        const name = (u.name || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const txn = (u.transactionId || "").toLowerCase();
        const phone = String(u.contactNo || "").toLowerCase();
        return (
          name.includes(q) ||
          email.includes(q) ||
          txn.includes(q) ||
          phone.includes(q)
        );
      });
    }

    setFilteredUsers(filtered);
    setCurrentPage(1); // reset to first page on filter/search change
  }, [statusFilter, actionFilter, searchTerm, users]);

  // 📄 Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = useMemo(
    () => filteredUsers.slice(indexOfFirstUser, indexOfLastUser),
    [filteredUsers, indexOfFirstUser, indexOfLastUser]
  );

  // ✅ Mock System Options (kept as-is)
  const mockSystemOptions: Record<string, string[]> = {
    IELTS: ["N/A", "Academic", "General Training"],
    GRE: ["PowerPrep", "TCY"],
    TOEFL: ["TCY"],
    "Pearson PTE": ["AIWAS", "TCY", "Alfa"],
  };

  const fetchUserMockData = async (userId: string) => {
    try {
      const response = await axios.get(`${API_BASE}/api/v1/user/${userId}`);
      if (response.status === 200 && response.data.success) {
        setSubmittedItems(response.data.mocks || []);
        setLastMock(response.data.lastMock || null);
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
  const updateSubmittedItem = (index: number, field: keyof ItemType, value: string) => {
    setSubmittedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const toggleEditSubmittedItem = (index: number) => {
    setSubmittedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, isEditing: !item.isEditing } : item))
    );
  };

  // ✅ Add/Remove Row
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        mockType: "",
        testType: "",
        testSystem: "",
        mock: "",
        transactionId: "",
        mrValidation: "",
      },
    ]);
  };
  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Block/Unblock
  const onToggleBlockUser = async (userId: string) => {
    const user = users.find((u) => u._id === userId);
    if (!user) return;

    const newStatus = user.isDeleted ? "active" : "blocked";
    try {
      await axios.put(`${API_BASE}/api/v1/user/block/${userId}`, {
        isDeleted: !user.isDeleted,
      });
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
      const response = await axios.put(`${API_BASE}/api/v1/user/status/${_id}`, {
        status: value,
      });

      if (response.status === 200) {
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user._id === _id ? { ...user, status: value } : user
          )
        );
        toast("✅ User status updated successfully!");
      } else {
        throw new Error(`Unexpected response: ${response.status}`);
      }
    } catch (error: any) {
      console.error("❌ Error updating user status:", error);
      const errorMessage =
        error.response?.data?.message ||
        `⚠ Failed to update status (Error: ${error.code})`;
      toast.error(errorMessage);
    }
  };

  // MR expiry helper
  const getFutureISODate = (duration: string): string => {
    if (!duration || typeof duration !== "string") return new Date().toISOString();
    const [valueStr, unit] = duration.trim().split(" ");
    const value = parseInt(valueStr);
    if (isNaN(value) || !unit) return new Date().toISOString();
    const now = new Date();
    switch (unit.toLowerCase()) {
      case "minute":
      case "minutes":
        now.setMinutes(now.getMinutes() + value);
        break;
      case "day":
      case "days":
        now.setDate(now.getDate() + value);
        break;
      case "month":
      case "months":
        now.setMonth(now.getMonth() + value);
        break;
      default:
        return new Date().toISOString();
    }
    return now.toISOString();
  };

  const saveAllData = async () => {
    if (!selectedUser) return;

    const newItems = items.filter(
      (item) =>
        item.mockType &&
        item.testType &&
        item.mock &&
        item.transactionId &&
        item.mrValidation
    );

    if (newItems.length > 0) {
      try {
        const response = await axios.put(
          `${API_BASE}/api/v1/user/update-multiple/${selectedUser._id}`,
          {
            mocks: newItems.map((item) => ({
              ...item,
              mrValidationExpiry: getFutureISODate(item.mrValidation),
              mrValidation: item.mrValidation,
            })),
          }
        );
        if (response.data.success) {
          toast.success("New mock entries saved.");
          setSubmittedItems((prev) => [
            ...prev,
            ...newItems.map((item) => ({ ...item, isEditing: false })),
          ]);
          setItems([
            {
              mockType: "",
              testType: "",
              testSystem: "",
              mock: "",
              transactionId: "",
              mrValidation: "",
            },
          ]);
        }
      } catch (err) {
        toast.error("Failed to save new entries.");
      }
    }

    const editedItems = submittedItems.filter((item) => item.isEditing);

    for (const edited of editedItems) {
      try {
        const payload = {
          updatedMock: {
            mockType: edited.mockType.trim(),
            testType: edited.testType.trim(),
            testSystem: edited.testSystem?.trim() || "",
            mock: String(Math.abs(Number(edited.mock))),
            transactionId: edited.transactionId.trim(),
            mrValidation: edited.mrValidation,
            mrValidationExpiry: getFutureISODate(edited.mrValidation),
          },
          transactionId: edited.transactionId.trim(),
        };

        const res = await axios.put(
          `${API_BASE}/api/v1/user/update-one/${selectedUser._id}`,
          payload
        );

        if (res.data.success) {
          toast.success(`Mock updated: ${edited.transactionId}`);
          setSubmittedItems((prev) =>
            prev.map((item) =>
              item.transactionId === edited.transactionId
                ? { ...res.data.updatedMock, isEditing: false }
                : item
            )
          );
        } else {
          toast.error(`Failed to update mock: ${edited.transactionId}`);
        }
      } catch (err: any) {
        toast.error(
          `Error updating mock: ${edited.transactionId}\n${
            err.response?.data?.message || err.message
          }`
        );
      }
    }
  };

  return (
    <>
      <h1 className="text-2xl font-minibold text-[#00000f] mb-2">
        🎓Students Waiting for Approval
      </h1>

      <div className="bg-gray-100 p-4 h-22 mb-3 flex flex-col sm:flex-row gap-4 py-2">
        <div className="flex items-center w-full sm:w-auto">
          <label
            htmlFor="search"
            className="mr-2 text-xs sm:text-sm md:text-base font-bold"
          >
            Search <span className="font-normal">(Name/Email)</span>:
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

        {/* Filter by Action */}
        <div className="flex items-center w-full sm:w-auto">
          <label
            htmlFor="actionFilter"
            className="mr-2 text-xs sm:text-sm md:text-base font-bold"
          >
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

      {loading && (
        <div className="text-center text-sm text-gray-600 mb-2">
          Loading users…
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table-auto w-full border-collapse text-[#00000f]">
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
                  {new Date(user.createdAt)
                    .toLocaleDateString("en-US", {
                      month: "long",
                      day: "2-digit",
                      year: "numeric",
                    })
                    .replace(/^(\w+) (\d+), (\d+)$/, "$2 $1, $3")}
                </td>
                <td className="px-4 py-3 break-words">
                  <select
                    value={user.status}
                    onChange={(e) => onChangeStatus(user._id, e.target.value)}
                    className={`px-2 py-1 border rounded w-full sm:w-auto text-xs sm:text-sm md:text-base font-semibold shadow-sm transition-all duration-300 ease-in-out
      ${
        user.status === "active"
          ? "bg-red-100 text-red-700 border-red-300"
          : user.status === "completed"
          ? "bg-green-100 text-green-700 border-green-300"
          : "bg-yellow-100 text-yellow-700 border-yellow-400"
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
    ${
      user.isDeleted
        ? "bg-red-600 text-white hover:bg-red-700"
        : "bg-yellow-400 text-black hover:bg-yellow-500"
    }`}
                  >
                    {user.isDeleted ? "Unblock" : "Block"}
                  </button>
                </td>
              </tr>
            ))}
            {currentUsers.length === 0 && !loading && (
              <tr>
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

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4">
        <div className="mb-4 sm:mb-0 text-[#00000f]">
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
        <div className="flex space-x-2 text-[#00000f]">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400 text-[#00000f]"
          >
            Previous
          </button>
          <span className="mx-2">
            Page {currentPage} /{" "}
            {Math.ceil(filteredUsers.length / usersPerPage) || 1}
          </span>
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
            <div className="w-full sm:w-[25%] bg-white rounded-xl shadow-md p-2 border border-gray-300">
              <h2 className="text-2xl font-semibold text-[#00000f] mb-1">
                👤User Details
              </h2>
              <div className="space-y-1 text-sm text-[#00000f]">
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
                  <strong>Passport No:</strong> {selectedUser?.passportNumber || "N/A"}
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
                <div className="mt-0 border-t pt-3 text-sm">
                  <h3 className="text-lg font-bold mb-0">📄Latest Mock</h3>
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

            {/* Vertical Divider */}
            <div className="w-px bg-[#00000f]"></div>

            {/* Update User Section */}
            <div className="w-full sm:w-[78%] bg-white rounded-2xl shadow-lg border  p-2">
              <h2 className="text-2xl font-semibold text-[#00000f] mb-1">
                🛠Update User
              </h2>

              <div className="overflow-x-auto">
                <table className="table-fixed w-full border-collapse text-[#00000f]">
                  <thead>
                    <tr className="bg-yellow-300 text-gray-900 font-semibold text-center">
                      <th className="w-[13%] p-1 border border-gray-300">
                        Mock Type
                      </th>
                      <th className="w-[20%] p-1 border border-gray-300">
                        Test Type
                      </th>
                      <th className="w-[15%] p-1 border border-gray-300">
                        Test System
                      </th>
                      <th className="w-[10%] p-1 border border-gray-300">
                        Mock #
                      </th>
                      <th className="w-[15%] p-1 border border-gray-300">
                        MR Number
                      </th>
                      <th className="w-[15%] p-1 border border-gray-300">
                        MR Validation
                      </th>
                      <th className="w-[20%] p-1 border border-gray-300">
                        Expired Date
                      </th>
                      <th className="w-[6%] p-1 border border-gray-300">
                        ✏️
                      </th>
                    </tr>
                  </thead>

                  <tbody className="text-center bg-white">
                    {submittedItems.map((item, index) => (
                      <tr
                        key={`submitted-${index}`}
                        className="hover:bg-gray-50"
                      >
                        {item.isEditing ? (
                          <>
                            <td className="p-1 border border-gray-300">
                              <select
                                className="w-full px-1 py-1 border rounded"
                                value={item.mockType || ""}
                                onChange={(e) =>
                                  updateSubmittedItem(
                                    index,
                                    "mockType",
                                    e.target.value
                                  )
                                }
                              >
                                <option value="">Select</option>
                                <option value="IELTS">IELTS</option>
                                <option value="GRE">GRE</option>
                                <option value="TOEFL">TOEFL</option>
                                <option value="Pearson PTE">
                                  Pearson PTE
                                </option>
                              </select>
                            </td>
                            <td className="p-1 border border-gray-300">
                              <select
                                className="w-full px-1 py-1 border rounded"
                                value={item.testType || ""}
                                onChange={(e) =>
                                  updateSubmittedItem(
                                    index,
                                    "testType",
                                    e.target.value
                                  )
                                }
                                disabled={!item.mockType}
                              >
                                <option value="">Select</option>
                                {item.mockType === "IELTS" ? (
                                  <>
                                    <option value="Paper-Based">
                                      Paper-Based
                                    </option>
                                    <option value="Computer-Based">
                                      Computer-Based
                                    </option>
                                  </>
                                ) : (
                                  <option value="Computer-Based">
                                    Computer-Based
                                  </option>
                                )}
                              </select>
                            </td>
                            <td className="p-1 border border-gray-300">
                              <select
                                className="w-full px-1 py-1 border rounded"
                                value={item.testSystem || ""}
                                onChange={(e) =>
                                  updateSubmittedItem(
                                    index,
                                    "testSystem",
                                    e.target.value
                                  )
                                }
                                disabled={!item.mockType}
                              >
                                <option value="">Select</option>
                                {mockSystemOptions[item.mockType]?.map(
                                  (system) => (
                                    <option key={system} value={system}>
                                      {system}
                                    </option>
                                  )
                                )}
                              </select>
                            </td>
                            <td className="p-1 border border-gray-300">
                              <input
                                className="w-full px-1 py-1 border rounded"
                                value={item.mock}
                                onChange={(e) =>
                                  updateSubmittedItem(
                                    index,
                                    "mock",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td className="p-1 border border-gray-300">
                              <input
                                className="w-full px-1 py-1 border rounded bg-gray-100"
                                value={item.transactionId}
                                disabled
                              />
                            </td>
                            <td className="p-1 border border-gray-300">
                              <select
                                className="w-full px-1 py-1 border rounded"
                                value={item.mrValidation || ""}
                                onChange={(e) =>
                                  updateSubmittedItem(
                                    index,
                                    "mrValidation",
                                    e.target.value
                                  )
                                }
                              >
                                <option value="">Select Duration</option>
                                <option value="7 Days">7 Days</option>
                                <option value="14 Days">14 Days</option>
                                <option value="1 Month">1 Month</option>
                                <option value="2 Months">2 Months</option>
                                <option value="3 Months">3 Months</option>
                                <option value="6 Months">6 Months</option>
                              </select>
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
                            <td className="p-1 border border-gray-300">
                              <button
                                className="bg-green-600 text-white px-1 py-1 rounded"
                                onClick={() =>
                                  toggleEditSubmittedItem(index)
                                }
                              >
                                ✅
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-1 border border-gray-300">
                              {item.mockType}
                            </td>
                            <td className="p-1 border border-gray-300">
                              {item.testType}
                            </td>
                            <td className="p-1 border border-gray-300">
                              {item.testSystem}
                            </td>
                            <td className="p-1 border border-gray-300">
                              {item.mock}
                            </td>
                            <td className="p-1 border border-gray-300">
                              {item.transactionId}
                            </td>
                            <td className="p-1 border border-gray-300">
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
                            <td className="p-1 border border-gray-300">
                              <button
                                className="bg-blue-600 text-white px-1 py-1 rounded"
                                onClick={() =>
                                  toggleEditSubmittedItem(index)
                                }
                              >
                                ✏️
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}

                    {items.map((item, index) => (
                      <tr key={`new-${index}`} className="hover:bg-gray-50">
                        <td className="p-1 border border-gray-300">
                          <select
                            value={item.mockType}
                            onChange={(e) =>
                              updateItem(index, "mockType", e.target.value)
                            }
                            className="w-full px-1 py-1 border rounded"
                            required
                          >
                            <option value="">Select</option>
                            <option value="IELTS">IELTS</option>
                            <option value="GRE">GRE</option>
                            <option value="TOEFL">TOEFL</option>
                            <option value="Pearson PTE">Pearson PTE</option>
                          </select>
                        </td>
                        <td className="p-1 border border-gray-300">
                          <select
                            value={item.testType}
                            onChange={(e) =>
                              updateItem(index, "testType", e.target.value)
                            }
                            className="w-full px-2 py-1 border rounded"
                            disabled={!item.mockType}
                            required
                          >
                            <option value="">Select</option>
                            {item.mockType === "IELTS" ? (
                              <>
                                <option value="Paper-Based">
                                  Paper-Based
                                </option>
                                <option value="Computer-Based">
                                  Computer-Based
                                </option>
                              </>
                            ) : (
                              <option value="Computer-Based">
                                Computer-Based
                              </option>
                            )}
                          </select>
                        </td>
                        <td className="p-1 border border-gray-300">
                          <select
                            value={item.testSystem}
                            onChange={(e) =>
                              updateItem(index, "testSystem", e.target.value)
                            }
                            className="w-full px-1 py-1 border rounded"
                            disabled={!item.mockType}
                            required={item.mockType !== "IELTS"}
                          >
                            <option value="">Select</option>
                            {mockSystemOptions[item.mockType]?.map(
                              (system) => (
                                <option key={system} value={system}>
                                  {system}
                                </option>
                              )
                            )}
                          </select>
                        </td>
                        <td className="p-1 border border-gray-300">
                          <input
                            type="text"
                            value={item.mock}
                            onChange={(e) =>
                              updateItem(index, "mock", e.target.value)
                            }
                            className="w-full px-1 py-1 border rounded"
                            required
                          />
                        </td>
                        <td className="p-1 border border-gray-300">
                          <input
                            type="text"
                            value={item.transactionId}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "transactionId",
                                e.target.value
                              )
                            }
                            className="w-full px-1 py-1 border rounded"
                            required
                          />
                        </td>
                        <td className="p-1 border border-gray-300">
                          <select
                            value={item.mrValidation}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "mrValidation",
                                e.target.value
                              )
                            }
                            className="w-full px-1 py-1 border rounded"
                            required
                          >
                            <option value="">Select Duration</option>
                            <option value="7 Days">7 Days</option>
                            <option value="14 Days">14 Days</option>
                            <option value="1 Month">1 Month</option>
                            <option value="2 Months">2 Months</option>
                            <option value="3 Months">3 Months</option>
                            <option value="6 Months">6 Months</option>
                          </select>
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
                        <td className="p-1 border border-gray-300">
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

              {/* Actions */}
              <div className="flex justify-between items-center mt-8 flex-wrap gap-4">
                <div>
                  <button
                    onClick={addItem}
                    className="bg-[#00000f] text-white px-4 py-2 rounded-xl font-semibold shadow-sm hover:bg-[#face39] hover:text-[#00000f] hover:shadow-md hover:scale-105 transition-all duration-300 ease-in-out flex items-center gap-2"
                  >
                    ➕ Add More
                  </button>
                </div>

                <div className="ml-auto flex items-center gap-4 mr-4">
                  <button
                    onClick={saveAllData}
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
      )}
    </>
  );
};

export default TableAdmin;

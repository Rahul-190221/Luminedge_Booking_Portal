"use client";

import { useEffect, useMemo, useState, Fragment, type ReactNode } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  RefreshCw,
  Mail,
  User2,
  Phone,
  BadgeCheck,
  Hash,
  FileText,
  Copy,
  CheckCircle2,
  X,
} from "lucide-react";

// ---------- Types ----------
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

type Editable = Pick<
  User,
  "name" | "email" | "contactNo" | "passportNumber" | "transactionId"
>;

// ---------- Config ----------
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "https://luminedge-server.vercel.app";

// ---------- Helpers ----------
const cx = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ");

const labelCls = "text-xs font-semibold text-gray-600";
const inputCls =
  "w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 bg-white/60 shadow-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition";

const badge = (text: string) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-600">
    <BadgeCheck className="size-3" /> {text}
  </span>
);

// ---------- Component ----------
export default function ProfileEditApprovalPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [edited, setEdited] = useState<Record<string, Editable>>({});

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchRequestedUsers = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${API_BASE}/api/v1/users/with-profile-request`,
        { timeout: 15000 }
      );
      if (data?.success && Array.isArray(data.users)) {
        const list: User[] = data.users;
        setUsers(list);
        const init: Record<string, Editable> = {};
        list.forEach((u) => {
          init[u._id] = {
            name: u.name || "",
            email: u.email || "",
            contactNo: u.contactNo || "",
            passportNumber: u.passportNumber || "",
            transactionId: u.transactionId || "",
          };
        });
        setEdited(init);
      } else {
        toast.error(data?.message || "Failed to fetch requests.");
      }
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestedUsers();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.email, u.contactNo, u.transactionId, u.passportNumber]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [users, query]);

  const handleField = (
    id: string,
    field: keyof Editable,
    value: string
  ) => {
    setEdited((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const openEdit = (userId: string) => {
    setSelectedUserId(userId);
    setIsModalOpen(true);
  };

  const closeEdit = () => {
    setIsModalOpen(false);
    setSelectedUserId(null);
  };

  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeEdit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isModalOpen]);

  const handleApprove = async (userId: string) => {
    const payload = edited[userId];
    if (!payload) return;

    const confirmed = window.confirm(
      "Approve and save these profile changes?"
    );
    if (!confirmed) return;

    try {
      setSavingId(userId);
      const { data } = await axios.put(
        `${API_BASE}/api/v1/user/approve-profile-edit/${userId}`,
        {
          name: payload.name?.trim() || "",
          email: payload.email?.trim() || "",
          phone: payload.contactNo?.trim() || "",
          passportId: payload.passportNumber?.trim() || "",
          transactionId: payload.transactionId?.trim() || "",
        },
        { timeout: 20000 }
      );

      if (data?.success) {
        toast.success("Profile updated & approved");
        setUsers((prev) => prev.filter((u) => u._id !== userId));
        setEdited((prev) => {
          const copy = { ...prev };
          delete copy[userId];
          return copy;
        });
        if (selectedUserId === userId) closeEdit();
      } else {
        toast.error(data?.message || "Approval failed");
      }
    } catch {
      toast.error("Server error while approving");
    } finally {
      setSavingId(null);
    }
  };

  const selectedUser = selectedUserId
    ? users.find((u) => u._id === selectedUserId) || null
    : null;
  const e = selectedUserId ? edited[selectedUserId] : undefined;

  return (
    // ⬇️ Full-width, flush to top-left: no mx-auto, no max-w, no outer padding/card
    <div className="w-full min-h-screen bg-[#ffffff] text-[#00000f]">
      {/* Header bar */}
      <div className="relative overflow-hidden border-b rounded-1xl border-gray-200 shadow-[0_4px_20px_rgba(250,206,57,0.25)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
              Approve Profile Changes
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Review, edit, and approve user-submitted profile updates.
            </p>
          </div>

          <div className="flex w-full sm:w-auto items-center gap-2">
            <div className="relative flex-1 sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                className={cx(inputCls, "pl-9 pr-10 bg-white/90")}
                placeholder="Search by name, email, phone, passport, Txn ID…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <button
              onClick={fetchRequestedUsers}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            >
              <RefreshCw className="size-4" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-2 sm:p-4">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-xl border border-gray-200 bg-gray-50/80"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-[#FACE39] text-[#00000f]">
                <tr>
                  <th className="w-12 px-3 py-3 text-left text-xs font-bold">SL</th>
                  <th className="px-3 py-3 text-left text-xs font-bold">User</th>
                  <th className="px-3 py-3 text-left text-xs font-bold">Email</th>
                  <th className="px-3 py-3 text-left text-xs font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((u, idx) => (
                  <Fragment key={u._id}>
                    <tr className="group hover:bg-gray-50/60">
                      <td className="px-3 py-3 font-semibold text-gray-700">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <User2 className="size-4 text-indigo-500" />
                          <span className="font-medium text-gray-900">
                            {u.name || "Unnamed User"}
                          </span>
                          {badge(u.profileChangeRequestStatus || "Pending")}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-700">{u.email}</td>
                      <td className="px-3 py-3">
                        <button
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          onClick={() => openEdit(u._id)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Centered Modal */}
      <AnimatePresence>
        {isModalOpen && selectedUser && e && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeEdit}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              className="fixed z-50 inset-0 flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              onClick={(ev) => ev.stopPropagation()}
            >
              <div className="w-[44rem] max-w-[95vw] rounded-2xl border border-gray-200 bg-white shadow-2xl">
                {/* Modal header */}
                <div className="flex items-start justify-between gap-3 border-b p-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Edit Profile</h3>
                    <p className="text-xs text-gray-600">
                      {selectedUser.name || "Unnamed User"} · {selectedUser.email}
                    </p>
                  </div>
                  <button
                    className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50"
                    onClick={closeEdit}
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Modal body */}
                <div className="p-4">
                  {selectedUser.profileEditNote && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
                      <div className="flex items-start gap-2">
                        <FileText className="mt-0.5 size-4 shrink-0" />
                        <div className="text-sm">
                          <p className="font-semibold">User note</p>
                          <p className="mt-0.5 whitespace-pre-wrap">
                            {selectedUser.profileEditNote}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Name" icon={<User2 className="size-4 text-gray-400" />}>
                      <input
                        className={inputCls}
                        placeholder="Full name"
                        value={e.name ?? ""}
                        onChange={(ev) =>
                          handleField(selectedUser._id, "name", ev.target.value)
                        }
                      />
                    </Field>

                    <Field label="Email" icon={<Mail className="size-4 text-gray-400" />}>
                      <div className="flex items-center gap-2">
                        <input
                          type="email"
                          className={cx(inputCls, "flex-1")}
                          placeholder="name@email.com"
                          value={e.email ?? ""}
                          onChange={(ev) =>
                            handleField(selectedUser._id, "email", ev.target.value)
                          }
                        />
                        <button
                          type="button"
                          onClick={() =>
                            navigator.clipboard
                              .writeText(e.email ?? "")
                              .then(() => toast.success("Copied"))
                          }
                          className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50"
                          title="Copy email"
                        >
                          <Copy className="size-4" />
                        </button>
                      </div>
                    </Field>

                    <Field label="Phone" icon={<Phone className="size-4 text-gray-400" />}>
                      <input
                        className={inputCls}
                        placeholder="e.g. 01xxxxxxxxx"
                        value={e.contactNo ?? ""}
                        onChange={(ev) =>
                          handleField(selectedUser._id, "contactNo", ev.target.value)
                        }
                      />
                    </Field>

                    <Field
                      label="Passport Number"
                      icon={<Hash className="size-4 text-gray-400" />}
                    >
                      <input
                        className={inputCls}
                        placeholder="Passport no."
                        value={e.passportNumber ?? ""}
                        onChange={(ev) =>
                          handleField(selectedUser._id, "passportNumber", ev.target.value)
                        }
                      />
                    </Field>

                    <Field label="Transaction ID" icon={<Hash className="size-4 text-gray-400" />}>
                      <div className="flex items-center gap-2">
                        <input
                          className={cx(inputCls, "flex-1")}
                          placeholder="TXN-…"
                          value={e.transactionId ?? ""}
                          onChange={(ev) =>
                            handleField(selectedUser._id, "transactionId", ev.target.value)
                          }
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!e.transactionId) return;
                            navigator.clipboard
                              .writeText(e.transactionId)
                              .then(() => toast.success("Copied"));
                          }}
                          className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50"
                          title="Copy transaction ID"
                        >
                          <Copy className="size-4" />
                        </button>
                      </div>
                    </Field>
                  </div>
                </div>

                {/* Modal footer */}
                <div className="flex items-center justify-between gap-3 border-t p-4">
                  <button
                    type="button"
                    onClick={() =>
                      setEdited((prev) => ({
                        ...prev,
                        [selectedUser._id]: {
                          name: selectedUser.name || "",
                          email: selectedUser.email || "",
                          contactNo: selectedUser.contactNo || "",
                          passportNumber: selectedUser.passportNumber || "",
                          transactionId: selectedUser.transactionId || "",
                        },
                      }))
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    title="Reset edited values to original"
                  >
                    Reset
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={closeEdit}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => handleApprove(selectedUser._id)}
                      disabled={savingId === selectedUser._id}
                      className={cx(
                        "inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm",
                        "hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100",
                        savingId === selectedUser._id && "cursor-not-allowed opacity-60"
                      )}
                    >
                      <CheckCircle2 className="size-4" />
                      {savingId === selectedUser._id ? "Saving…" : "Save & Approve"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Subcomponents ----------
function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center gap-2">
        {icon}
        <span className={labelCls}>{label}</span>
      </div>
      {children}
    </label>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center">
      <div className="mx-auto mb-4 size-12 rounded-2xl bg-gray-50 p-3">
        <BadgeCheck className="mx-auto size-6 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">No pending requests</h3>
      <p className="mt-1 text-sm text-gray-600">
        When users submit profile edits, they will appear here for your review.
      </p>
    </div>
  );
}

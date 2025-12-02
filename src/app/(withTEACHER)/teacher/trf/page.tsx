"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import TrfForm from "@/components/trfform";
import axios from "axios";

type User = {
  _id: string;
  name: string;
  email?: string;
  [key: string]: any;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "https://luminedge-server.vercel.app";

export default function TRFPage() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // useEffect(() => {
  //   const fetchUsersPaged = async () => {
  //     if (!userId) {
  //       setLoading(false);
  //       return;
  //     }

  //     try {
  //       const limit = 500; // backend default cap is fine
  //       // page 1: get users + total
  //       const first = await axios.get(`${API_BASE}/api/v1/admin/users`, {
  //         params: { page: 1, limit }
  //       });

  //       const total: number =
  //         typeof first.data?.total === "number"
  //           ? first.data.total
  //           : (first.data?.users?.length || 0);
  //       const totalPages = Math.max(1, Math.ceil(total / limit));

  //       // try to find in page 1
  //       let found: User | null =
  //         (first.data?.users || []).find((u: User) => u._id === userId) || null;

  //       // if not found and more pages, scan subsequent pages
  //       for (let page = 2; !found && page <= totalPages; page++) {
  //         const res = await axios.get(`${API_BASE}/api/v1/admin/users`, {
  //           params: { page, limit }
  //         });
  //         const hit =
  //           (res.data?.users || []).find((u: User) => u._id === userId) || null;
  //         if (hit) found = hit;
  //       }

  //       setUser(found);
  //       if (!found) {
  //         console.warn("User ID not found across all pages.");
  //       }
  //     } catch (error) {
  //       console.error("Error fetching users:", error);
  //       setUser(null);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchUsersPaged();
  // }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
  
    let cancelled = false;
  
    const fetchUserAcrossPages = async () => {
      setLoading(true);
      try {
        const requestedLimit = 500;
        const seen = new Set<string>();
  
        let page = 1;
        let effectiveLimit: number | null = null;
        let totalFromServer: number | null = null;
        let found: User | null = null;
  
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data } = await axios.get(`${API_BASE}/api/v1/admin/users`, {
            params: { page, limit: requestedLimit, role: "user" }, // role filter optional
          });
  
          const batch: User[] = (data?.users ?? []) as User[];
  
          // First page: detect actual page size & total if backend provides it
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
  
            // track new ids to detect "backend ignores page" case
            if (!seen.has(id)) {
              seen.add(id);
              newCount++;
            }
  
            // check if this is the user we need
            if (id === userId) {
              found = u;
              break;
            }
          }
  
          // If we have found the user, stop looping
          if (found) break;
  
          // Backend might be ignoring `page` -> no new IDs, stop
          if (newCount === 0) break;
  
          // If total is known and we already saw everything, stop
          if (totalFromServer && seen.size >= totalFromServer) break;
  
          // If this page is shorter than the effective page size, it is the last page
          if (effectiveLimit && batch.length < effectiveLimit) break;
  
          page += 1;
        }
  
        if (!cancelled) {
          if (found) {
            setUser(found);
          } else {
            setUser(null);
            console.warn("User ID not found across all pages:", userId);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching users:", error);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
  
    fetchUserAcrossPages();
  
    return () => {
      cancelled = true;
    };
  }, [userId]);
  
  if (!userId) {
    return <div className="p-6 text-red-600">❌ No user ID in URL.</div>;
  }

  if (loading) {
    return <div className="p-6">Loading user...</div>;
  }

  if (!user) {
    return <div className="p-6 text-red-600">❌ User not found.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Test Report Form</h1>
      <p className="text-lg text-gray-700 mb-4">
        Candidate Name: <strong>{user?.name || "N/A"}</strong>
      </p>

      <TrfForm />
    </div>
  );
}

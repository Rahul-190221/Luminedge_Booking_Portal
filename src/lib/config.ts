export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://luminedge-server.vercel.app"
).replace(/\/$/, "");

// Fallback MUST be the production backend, never localhost: if the build-time
// env var is missing on Vercel/Netlify, prod would otherwise call localhost and
// break every request (plus mixed-content over HTTPS). Override locally via
// NEXT_PUBLIC_API_BASE_URL in .env.local.
export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://luminedge-server.vercel.app"
).replace(/\/$/, "");

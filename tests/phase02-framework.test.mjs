// Phase 02 — Next.js 15.5.28 + React 19.2.9 framework and dependency alignment.
//
// Deterministic, source-level assertions only: no browser, no network, no
// database. These tests pin the upgraded stack, prove the Next.js 15 async
// params migration is complete and correctly scoped, and confirm that the
// security surfaces, the FIX-05 reminder contract and the Phase 04
// configuration boundary all survived the upgrade untouched.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (p) => fs.readFileSync(path.join(root, p), "utf8").replace(/\r\n/g, "\n");
const manifest = JSON.parse(source("package.json"));
const lock = JSON.parse(source("package-lock.json"));
const dep = (name) => manifest.dependencies[name];
const devDep = (name) => manifest.devDependencies[name];
const locked = (name) => lock.packages[`node_modules/${name}`];

// Strip comments (including JSX `{/* ... */}` blocks) so assertions about what
// code *does* never trip over commented-out prose.
const codeOnly = (text) =>
  text
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const allSourceFiles = () => {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
    }
  };
  walk(path.join(root, "src"));
  return files;
};

// The only pages that read route params, and therefore the only ones that need
// the Next.js 15 async params API.
// Pages reading dynamic route params via the Next.js 15 async params Promise API (server components):
const ASYNC_PARAM_PAGES = [];

// Client component dynamic pages that use the supported Next.js client route hook useParams():
const CLIENT_PARAM_PAGES = [
  "src/app/(withDashboard)/dashboard/booking/[bookingId]/page.tsx",
  "src/app/(withDashboard)/dashboard/reschedule/[bookingId]/page.tsx",
  "src/app/(withAdmin)/admin/[id]/page.tsx",
  "src/app/(withAdmin)/admin/TRF/[scheduleId]/page.tsx",
  "src/app/(withBDM)/bdm/[id]/page.tsx",
  "src/app/(withTEACHER)/teacher/[id]/page.tsx",
  "src/app/(withTEACHER)/teacher/teacherTRF/[scheduleId]/page.tsx",
];

test("T01 — the framework is pinned to the security-patched Next.js 15.5.28 / React 19.2.9", () => {
  assert.equal(dep("next"), "15.5.28", "next must be 15.5.28");
  assert.equal(devDep("eslint-config-next"), "15.5.28", "eslint-config-next must track Next");
  assert.equal(dep("react"), "19.2.9", "react must be the patched 19.2.9");
  assert.equal(dep("react-dom"), "19.2.9", "react-dom must be the patched 19.2.9");
  assert.match(devDep("@types/react"), /^~19\./, "@types/react must be React 19");
  assert.match(devDep("@types/react-dom"), /^~19\./, "@types/react-dom must be React 19");
});

test("T02 — the React 19 peer-blocking libraries are upgraded together", () => {
  assert.equal(dep("react-chartjs-2"), "5.3.1");
  assert.equal(dep("react-datepicker"), "7.6.0");
  assert.equal(dep("react-hook-form"), "7.52.2");
  assert.equal(dep("next-auth"), "4.24.15");
  // react-hot-toast 2.4.1 loses its JSX contextual type under React 19 (the
  // global JSX namespace was removed), so it is a fifth peer-blocking library
  // and was upgraded in the same resolution.
  assert.equal(dep("react-hot-toast"), "2.5.2");
});

test("T03 — every other React-dependent dependency keeps a React 19-compatible range", () => {
  // Ranges verified against the npm registry on 2 Nov 2026; none of these
  // needed a version change because their peer ranges already include ^19.
  const expected = {
    "framer-motion": "^12.6.3",
    "react-calendar": "^5.1.0",
    "react-icons": "^5.3.0",
    "react-multi-date-picker": "^4.5.2",
    "recharts": "^2.15.2",
  };
  for (const [name, spec] of Object.entries(expected)) {
    assert.equal(dep(name), spec, `${name} spec must be unchanged`);
  }
  // Phase 03A intentionally moved the PDF group (and declared html2canvas
  // directly); the other non-React libraries must still not have been swept up.
  assert.equal(dep("jspdf"), "4.2.1", "jspdf is upgraded in Phase 03A");
  assert.equal(dep("jspdf-autotable"), "5.0.9", "jspdf-autotable is upgraded in Phase 03A");
  assert.equal(dep("html2canvas"), "1.4.1", "html2canvas is declared directly in Phase 03A");
  assert.equal(dep("axios"), "1.20.0", "axios must stay at the approved Phase 03B pin");
  assert.equal(dep("js-cookie"), "3.0.8", "js-cookie must stay at the approved Phase 03B pin");
});

test("T04 — the lockfile resolves the framework and libraries to those exact versions", () => {
  const expected = {
    next: "15.5.28",
    react: "19.2.9",
    "react-dom": "19.2.9",
    "eslint-config-next": "15.5.28",
    "react-chartjs-2": "5.3.1",
    "react-datepicker": "7.6.0",
    "react-hook-form": "7.52.2",
    "react-hot-toast": "2.5.2",
    "next-auth": "4.24.15",
  };
  for (const [name, version] of Object.entries(expected)) {
    const entry = locked(name);
    assert.ok(entry, `${name} is missing from the lockfile`);
    assert.equal(entry.version, version, `${name} lockfile version drifted`);
  }
  assert.equal(lock.lockfileVersion, 3, "lockfile must be the npm v3 format");
});

test("T05 — the async params migration covers exactly the pages that read route params", () => {
  for (const p of ASYNC_PARAM_PAGES) {
    const page = source(p);
    assert.match(page, /params: paramsPromise/, `${p} must rename params to paramsPromise`);
    assert.match(page, /params: Promise</, `${p} must type params as a Promise`);
    assert.match(page, /const params = use\(paramsPromise\);/, `${p} must unwrap params with use()`);
    assert.match(page, /import \{[^}]*\buse\b[^}]*\} from "react";/, `${p} must import use from react`);
  }
  for (const p of CLIENT_PARAM_PAGES) {
    const page = source(p);
    assert.match(page, /useParams/, `${p} must use the supported Next.js client route hook useParams`);
    assert.doesNotMatch(page, /use\(paramsPromise\)/, `${p} must not use unsupported use(paramsPromise)`);
    assert.doesNotMatch(page, /use\(props\.params\)/, `${p} must not use unsupported use(props.params)`);
  }
});

test("T06 — use(paramsPromise) appears only where the Next.js 15 API requires it", () => {
  const users = allSourceFiles()
    .filter((f) => /const params = use\(paramsPromise\)/.test(fs.readFileSync(f, "utf8")))
    .map((f) => path.relative(root, f).replace(/\\/g, "/"))
    .sort();
  assert.deepEqual(users, [...ASYNC_PARAM_PAGES].sort(), "unexpected use(paramsPromise) sites");
});

test("T07 — routes that do not read params stay free of the params API", () => {
  for (const p of [
    "src/app/(withDashboard)/dashboard/[...contact]/page.tsx",
    "src/app/(withDashboard)/dashboard/contact1/page.tsx",
    "src/app/api/auth/[...nextauth]/route.ts",
  ]) {
    const page = source(p);
    assert.doesNotMatch(page, /use\(paramsPromise\)/, `${p} must not unwrap params`);
    assert.doesNotMatch(page, /\bparams:\s*Promise</, `${p} must not declare promise params`);
  }
});

test("T08 — no source relies on the global JSX namespace removed in React 19", () => {
  for (const f of allSourceFiles()) {
    const text = fs.readFileSync(f, "utf8");
    assert.doesNotMatch(
      text,
      /(?<!React\.)\bJSX\.(Element|IntrinsicElements)/,
      `${path.relative(root, f)} uses the global JSX namespace React 19 removed`
    );
  }
});

test("T09 — preserved security surfaces: middleware guard, reminder contract and Phase 04 boundary", () => {
  const mw = source("src/middleware.ts");
  assert.match(mw, /jwtDecode/, "middleware must keep decoding the JWT");
  assert.match(mw, /ROLE_ROUTES/, "middleware role routing must remain");
  for (const pair of ['"/admin": "admin"', '"/bdm": "bdm"', '"/teacher": "teacher"']) {
    assert.ok(mw.includes(pair), `middleware must keep the ${pair} rule`);
  }
  assert.match(mw, /PROTECTED_ROUTES/, "protected-route list must remain");

  // FIX-05 secure reminder contract must survive the framework upgrade.
  const admin = source("src/app/(withAdmin)/admin/[id]/page.tsx");
  assert.match(admin, /api\/v1\/send-reminder/, "the backend reminder endpoint must remain");
  assert.match(admin, /\{ scheduleId \}/, "the reminder body must remain exactly { scheduleId }");

  // Phase B / Phase 04: The silent production fallback is removed and fail-closed validation is enforced.
  const config = source("src/lib/config.ts");
  assert.doesNotMatch(config, /lumi-booking-backend\.vercel\.app/, "the unsafe production fallback must not be present");
  assert.match(config, /process\.env\.NEXT_PUBLIC_API_BASE_URL/, "config must read NEXT_PUBLIC_API_BASE_URL");
  const nextConfig = source("next.config.js");
  assert.doesNotMatch(
    nextConfig,
    /assertNetlifyApiBase|PHASE_PRODUCTION_BUILD/,
    "the fail-closed API-origin build guard must not be introduced (Phase 04 gate)"
  );
  assert.match(nextConfig, /module\.exports = nextConfig;/, "next.config.js must stay the plain export");
});

test("T10 — tsconfig declares the ES2017 target Next.js 15 requires", () => {
  const tsconfig = JSON.parse(source("tsconfig.json"));
  assert.equal(tsconfig.compilerOptions.target, "ES2017", "Next.js 15 sets a top-level ES2017 target");
  assert.equal(tsconfig.compilerOptions.moduleResolution, "bundler");
  assert.equal(tsconfig.compilerOptions.jsx, "preserve");
});

test("T11 — all four react-hook-form flows keep useForm/register/handleSubmit", () => {
  const forms = [
    "src/app/login/page.tsx",
    "src/app/register/page.tsx",
    "src/app/forget-password/page.tsx",
    "src/app/reset-password/page.tsx",
  ];
  for (const p of forms) {
    const page = source(p);
    assert.match(page, /import \{ useForm \} from "react-hook-form";/, `${p} must import useForm`);
    assert.match(page, /useForm(?:<[^>]+>)?\(/, `${p} must call useForm`);
    assert.match(page, /handleSubmit\(onSubmit\)/, `${p} must submit through handleSubmit`);
    assert.match(page, /\.\.\.register\(/, `${p} must register its fields`);
  }
});

test("T12 — react-chartjs-2 charts keep their imports, registration and wiring", () => {
  const donut = source("src/components/DonutChart.tsx");
  assert.match(donut, /import \{ Doughnut \} from "react-chartjs-2";/);
  assert.match(donut, /<Doughnut data=\{data\} options=\{options\} \/>/);
  const finalTrf = source("src/components/FinalTRFPage.tsx");
  assert.match(finalTrf, /import \{ Bar \} from "react-chartjs-2";/);
  assert.match(finalTrf, /<Bar/);
  const trf = source("src/app/(withDashboard)/dashboard/trf/page.tsx");
  assert.match(trf, /import \{ Bar \} from "react-chartjs-2";/);
  assert.match(trf, /ChartJS\.register\(/);
});

test("T13 — react-datepicker imports and styles are preserved on all five screens", () => {
  for (const p of [
    "src/app/register/page.tsx",
    "src/app/(withAdmin)/admin/analysis/page.tsx",
    "src/app/(withAdmin)/admin/dashboard/page.tsx",
    "src/app/(withBDM)/bdm/dashboard/page.tsx",
    "src/app/(withTEACHER)/teacher/dashboard/page.tsx",
  ]) {
    const page = source(p);
    assert.match(page, /import DatePicker from "react-datepicker";/, `${p} must import DatePicker`);
    assert.match(
      page,
      /import "react-datepicker\/dist\/react-datepicker\.css";/,
      `${p} must import the DatePicker stylesheet`
    );
    assert.match(page, /<DatePicker/, `${p} must render DatePicker`);
  }
});

test("T14 — NextAuth v4 shape is preserved and Google sign-in stays unreachable", () => {
  const route = source("src/app/api/auth/[...nextauth]/route.ts");
  assert.match(route, /import NextAuth from "next-auth"/);
  assert.match(route, /export \{ handler as GET, handler as POST \}/);
  const opts = source("src/app/utils/authOptions.ts");
  assert.match(opts, /NextAuthOptions/, "auth options must stay typed as v4 NextAuthOptions");
  assert.match(opts, /GoogleProvider\(/, "the Google provider config must remain unchanged");
  assert.match(opts, /pages: \{\s*signIn: "\/login"/, "the NextAuth sign-in page must remain /login");

  // Google OAuth is not claimed as verified: the only signIn references are
  // inside commented-out JSX, so no executable path starts a NextAuth sign-in.
  for (const f of allSourceFiles()) {
    const code = codeOnly(fs.readFileSync(f, "utf8"));
    assert.doesNotMatch(
      code,
      /\bsignIn\s*\(/,
      `${path.relative(root, f)} must not start a NextAuth sign-in`
    );
  }
});

test("T15 — the upgrade used no dependency-resolution workarounds", () => {
  assert.equal(manifest.overrides, undefined, "package.json overrides must not bypass peers");
  assert.equal(manifest.resolutions, undefined, "resolutions must not be used");
  assert.equal(manifest.pnpm, undefined, "pnpm overrides must not be used");
  assert.doesNotMatch(source("package.json"), /legacy-peer-deps|--force/, "no peer-bypass flags may be baked in");
  if (fs.existsSync(path.join(root, ".npmrc"))) {
    const npmrc = source(".npmrc");
    assert.doesNotMatch(npmrc, /legacy-peer-deps\s*=\s*true/, ".npmrc must not disable peer enforcement");
    assert.doesNotMatch(npmrc, /force\s*=\s*true/, ".npmrc must not force resolution");
  }
});

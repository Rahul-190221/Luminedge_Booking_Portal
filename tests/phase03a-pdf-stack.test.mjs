// Phase 03A — PDF dependency stack upgrade (jspdf 4.2.1 / jspdf-autotable
// 5.0.9 / html2canvas 1.4.1).
//
// Deterministic, source-level and lockfile-level assertions only: no browser,
// no network, no database. The real-browser PDF behaviour (10 surfaces,
// page breaks, pixel-checked canvas TRFs) is proven separately by the
// Phase 03A CDP harness; these tests pin the dependency and integration
// *contract* so a later install cannot silently drift the stack back or leave
// the sources calling an API the new versions no longer provide.
//
// Nothing here weakens the Phase 02 baseline: that file keeps its own pins
// (T03 already re-pins the PDF group to these approved versions).
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
const locked = (name) => lock.packages[`node_modules/${name}`];

// Strip comments so assertions about behaviour never trip over commented prose.
const codeOnly = (text) =>
  text
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

// The complete PDF surface inventory: 8 jsPDF + jspdf-autotable table reports
// and 2 html2canvas-captured TRF documents.
const TABLE_SURFACES = [
  "src/app/(withAdmin)/admin/[id]/page.tsx",
  "src/app/(withAdmin)/admin/TRF/[scheduleId]/page.tsx",
  "src/app/(withAdmin)/admin/homebased/page.tsx",
  "src/app/(withBDM)/bdm/[id]/page.tsx",
  "src/app/(withBDM)/bdm/homebasedbdm/page.tsx",
  "src/app/(withTEACHER)/teacher/[id]/page.tsx",
  "src/app/(withTEACHER)/teacher/teacherTRF/[scheduleId]/page.tsx",
  "src/app/(withTEACHER)/teacher/homebasedteacher/page.tsx",
];
const CANVAS_SURFACES = [
  "src/app/(withDashboard)/dashboard/trf/page.tsx",
  "src/components/FinalTRFPage.tsx",
];
const ALL_PDF_SURFACES = [...TABLE_SURFACES, ...CANVAS_SURFACES];

test("T01 — the PDF stack is pinned to the exact approved versions", () => {
  assert.equal(dep("jspdf"), "4.2.1", "jspdf must be exactly 4.2.1");
  assert.equal(dep("jspdf-autotable"), "5.0.9", "jspdf-autotable must be exactly 5.0.9");
  assert.equal(dep("html2canvas"), "1.4.1", "html2canvas must be declared directly at 1.4.1");
  // Exact pins (no ranges, no carets) so the verified output cannot drift.
  for (const name of ["jspdf", "jspdf-autotable", "html2canvas"]) {
    assert.doesNotMatch(manifest.dependencies[name], /^[\^~]/, `${name} must be an exact pin`);
  }
  // The type packages are shipped by the libraries themselves; stale @types
  // shadow packages would re-introduce the pre-upgrade API shapes.
  assert.equal(manifest.devDependencies["@types/jspdf"], undefined, "@types/jspdf must not be declared");
  assert.equal(manifest.devDependencies["@types/jspdf-autotable"], undefined, "@types/jspdf-autotable must not be declared");
});

test("T02 — the lockfile resolves the PDF stack coherently, with no duplicates", () => {
  assert.equal(lock.lockfileVersion, 3, "lockfile must be the npm v3 format");
  assert.equal(locked("jspdf").version, "4.2.1");
  assert.equal(locked("jspdf-autotable").version, "5.0.9");
  assert.equal(locked("html2canvas").version, "1.4.1");
  // Exactly one resolved entry per PDF library — no nested older copies.
  const topLevel = Object.keys(lock.packages).filter((k) => /jspdf|html2canvas/.test(k));
  assert.deepEqual(topLevel.sort(), [
    "node_modules/html2canvas",
    "node_modules/jspdf",
    "node_modules/jspdf-autotable",
  ]);
  // Root lock manifest mirrors package.json (npm ci would otherwise fail).
  const rootDeps = lock.packages[""].dependencies;
  assert.equal(rootDeps.jspdf, "4.2.1");
  assert.equal(rootDeps["jspdf-autotable"], "5.0.9");
  assert.equal(rootDeps.html2canvas, "1.4.1");
  // Resolved peer contract: autotable 5.0.9 accepts jspdf ^2 || ^3 || ^4,
  // which the pinned 4.2.1 satisfies (proven by npm ci with exit code 0).
  assert.match(locked("jspdf-autotable").peerDependencies.jspdf, /\^4/, "autotable must accept jspdf 4");
});

test("T03 — all ten PDF surfaces exist and keep their download filenames", () => {
  for (const p of ALL_PDF_SURFACES) {
    assert.ok(fs.existsSync(path.join(root, p)), `${p} is missing`);
  }
  const savedNames = (p) => [...codeOnly(source(p)).matchAll(/\.save\(`([^`]+)`\)/g)].map((m) => m[1]);
  for (const p of TABLE_SURFACES) {
    const s = savedNames(p);
    assert.ok(
      s.some((n) => /^booking_(requests|report)_/.test(n)),
      `${p} must save a booking_* PDF, found ${JSON.stringify(s)}`
    );
  }
  for (const p of CANVAS_SURFACES) {
    const s = savedNames(p);
    assert.ok(
      s.some((n) => n.startsWith("IELTS_TRF_") && n.endsWith(".pdf")),
      `${p} must save an IELTS_TRF_*.pdf, found ${JSON.stringify(s)}`
    );
  }
});

test("T04 — the table reports call autoTable() in the function form jspdf-autotable 5 supports", () => {
  for (const p of TABLE_SURFACES) {
    const text = codeOnly(source(p));
    assert.match(text, /import jsPDF from "jspdf";/, `${p} must default-import jsPDF`);
    assert.match(text, /import autoTable from "jspdf-autotable";/, `${p} must default-import autoTable`);
    assert.match(text, /autoTable\(doc,\s*\{/, `${p} must call autoTable(doc, {...})`);
    // v5 dropped the doc.autoTable(...) prototype extension; calling it would
    // throw at runtime (silently producing an empty PDF).
    assert.doesNotMatch(text, /doc\.autoTable\(/, `${p} must not use the removed doc.autoTable API`);
    assert.match(text, /new jsPDF\(/, `${p} must still construct the jsPDF document`);
  }
});

test("T05 — the canvas TRFs dynamic-import html2canvas/jsPDF with a default export", () => {
  for (const p of CANVAS_SURFACES) {
    const text = codeOnly(source(p));
    assert.match(text, /import type \{ Options as H2COptions \} from "html2canvas";/, `${p} must type-import html2canvas Options`);
    assert.match(text, /\{ default: html2canvas \}/, `${p} must destructure the html2canvas default export`);
    assert.match(text, /\{ default: jsPDF \}/, `${p} must destructure the jsPDF default export`);
    assert.match(text, /import\("html2canvas"\)/, `${p} must lazy-import html2canvas`);
    assert.match(text, /await html2canvas\(/, `${p} must await the canvas capture`);
    assert.match(text, /pdf\.addImage\(/, `${p} must place the captured canvas into the PDF`);
  }
});

test("T06 — html2canvas and jspdf-autotable stay scoped to their own surfaces", () => {
  const importers = (pattern) => {
    const hits = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(entry.name)) {
          const text = fs.readFileSync(full, "utf8");
          if (pattern.test(text)) hits.push(path.relative(root, full).replace(/\\/g, "/"));
        }
      }
    };
    walk(path.join(root, "src"));
    return hits.sort();
  };
  const h2c = importers(/from "html2canvas"|import\("html2canvas"\)/);
  assert.deepEqual(h2c, [...CANVAS_SURFACES].sort(), "html2canvas must only be used by the two TRF surfaces");
  const tableLib = importers(/from "jspdf-autotable"/);
  assert.deepEqual(tableLib, [...TABLE_SURFACES].sort(), "jspdf-autotable must only be used by the eight table reports");
  // No deep imports into library internals (they moved across versions).
  for (const f of importers(/jspdf\/|html2canvas\//)) {
    const text = codeOnly(fs.readFileSync(path.join(root, f), "utf8"));
    assert.doesNotMatch(text, /from\s+"jspdf\//, `${f} deep-imports jspdf internals`);
    assert.doesNotMatch(text, /from\s+"html2canvas\//, `${f} deep-imports html2canvas internals`);
  }
});

test("T07 — the approved Phase 03B pins leave the framework and PDF stack unchanged", () => {
  assert.equal(dep("axios"), "1.20.0", "axios must stay at the approved Phase 03B pin");
  assert.equal(dep("js-cookie"), "3.0.8", "js-cookie must stay at the approved Phase 03B pin");
  assert.equal(dep("next"), "15.5.28", "Next.js must stay at the Phase 02 pin");
  assert.equal(dep("react"), "19.2.9", "React must stay at the Phase 02 pin");
  assert.equal(dep("react-dom"), "19.2.9", "react-dom must stay at the Phase 02 pin");
  assert.equal(dep("next-auth"), "4.24.15", "NextAuth must not move in Phase 03A");
  assert.equal(locked("axios").version, "1.20.0");
  assert.equal(locked("js-cookie").version, "3.0.8");
  assert.equal(locked("next").version, "15.5.28");
  assert.equal(locked("react").version, "19.2.9");
});

test("T08 — the upgrade used no dependency-resolution workarounds", () => {
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

test("T09 — the Phase 04 API-origin configuration boundary is enforced safely", () => {
  const config = source("src/lib/config.ts");
  assert.doesNotMatch(config, /lumi-booking-backend\.vercel\.app/, "the unsafe production fallback must not be present");
  assert.match(config, /process\.env\.NEXT_PUBLIC_API_BASE_URL/, "config must read NEXT_PUBLIC_API_BASE_URL");
  const nextConfig = source("next.config.js");
  assert.match(nextConfig, /module\.exports = nextConfig;/, "next.config.js must stay the plain export");
  assert.doesNotMatch(
    nextConfig,
    /assertNetlifyApiBase|PHASE_PRODUCTION_BUILD/,
    "the fail-closed API-origin build guard must not be introduced before Phase 04"
  );
});

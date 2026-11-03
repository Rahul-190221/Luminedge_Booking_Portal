import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const AFFECTED_ROUTES = [
  {
    name: "Admin View Bookings (/admin/[id])",
    relPath: "src/app/(withAdmin)/admin/[id]/page.tsx",
    expectedParam: "id",
    componentName: "BookingRequestsPage",
  },
  {
    name: "Admin TRF View (/admin/TRF/[scheduleId])",
    relPath: "src/app/(withAdmin)/admin/TRF/[scheduleId]/page.tsx",
    expectedParam: "scheduleId",
    componentName: "TrfBookingRequestsPage",
  },
  {
    name: "BDM View Bookings (/bdm/[id])",
    relPath: "src/app/(withBDM)/bdm/[id]/page.tsx",
    expectedParam: "id",
    componentName: "BookingRequestsPage",
  },
  {
    name: "Teacher View Bookings (/teacher/[id])",
    relPath: "src/app/(withTEACHER)/teacher/[id]/page.tsx",
    expectedParam: "id",
    componentName: "BookingRequestsPage",
  },
  {
    name: "Teacher TRF View (/teacher/teacherTRF/[scheduleId])",
    relPath: "src/app/(withTEACHER)/teacher/teacherTRF/[scheduleId]/page.tsx",
    expectedParam: "scheduleId",
    componentName: "TrfBookingRequestsPage",
  },
];

test("R04 Admin Dynamic Routes: No dynamic route uses React 19 unsupported use(params)", () => {
  for (const route of AFFECTED_ROUTES) {
    const filePath = path.join(repoRoot, route.relPath);
    assert.ok(fs.existsSync(filePath), `File exists: ${route.relPath}`);
    const source = fs.readFileSync(filePath, "utf8");

    // Must not call use(params...)
    assert.strictEqual(
      /use\s*\(\s*params/i.test(source),
      false,
      `Expected no use(params...) in ${route.relPath}`
    );

    // Must not import 'use' hook from 'react'
    const reactImportMatch = source.match(/import\s*\{([^}]+)\}\s*from\s*["']react["']/);
    if (reactImportMatch) {
      const importedMembers = reactImportMatch[1].split(",").map((s) => s.trim());
      assert.strictEqual(
        importedMembers.includes("use"),
        false,
        `Expected 'use' not imported from 'react' in ${route.relPath}`
      );
    }
  }
});

test("R04 Admin Dynamic Routes: All 5 routes correctly import and invoke useParams()", () => {
  for (const route of AFFECTED_ROUTES) {
    const filePath = path.join(repoRoot, route.relPath);
    const source = fs.readFileSync(filePath, "utf8");

    // Must import useParams from next/navigation
    const navImportMatch = source.match(/import\s*\{([^}]+)\}\s*from\s*["']next\/navigation["']/);
    assert.ok(navImportMatch, `Expected import from next/navigation in ${route.relPath}`);
    const navMembers = navImportMatch[1].split(",").map((s) => s.trim());
    assert.ok(
      navMembers.includes("useParams"),
      `Expected useParams in next/navigation import in ${route.relPath}`
    );

    // Must invoke useParams<{ [param]: string }>()
    const expectedParamHookCall = `useParams<{ ${route.expectedParam}: string }>()`;
    assert.ok(
      source.includes(expectedParamHookCall),
      `Expected '${expectedParamHookCall}' call in ${route.relPath}`
    );

    // Must bind the expected scheduleId variable safely
    const expectedBinding = `routeParams?.${route.expectedParam}`;
    assert.ok(
      source.includes(expectedBinding),
      `Expected parameter extraction '${expectedBinding}' in ${route.relPath}`
    );
  }
});

test("R04 Admin Dynamic Routes: admin/[id] preserves reminder email dispatch & scheduleId propagation", () => {
  const filePath = path.join(repoRoot, "src/app/(withAdmin)/admin/[id]/page.tsx");
  const source = fs.readFileSync(filePath, "utf8");

  // Verify fetchBookingsAndUsers depends on scheduleId
  assert.ok(source.includes("if (!scheduleId) return;"), "Guards on missing scheduleId");
  assert.ok(
    source.includes("`${API}/api/v1/admin/bookings/by-schedule/${scheduleId}`"),
    "Fetches bookings for scheduleId"
  );

  // Verify reminder email dispatch retains scheduleId
  assert.ok(
    source.includes("http.post(`${API}/api/v1/send-reminder`, { scheduleId })"),
    "Reminder dispatch uses scheduleId payload"
  );
  assert.ok(source.includes("reminderInFlight.current = true;"), "Reminder concurrency guard intact");
});

test("R04 Admin Dynamic Routes: Zero remaining use(params) across all src/app pages", () => {
  function walkDir(dir, fileList = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath, fileList);
      } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  const allAppFiles = walkDir(path.join(repoRoot, "src/app"));
  const violations = [];

  for (const file of allAppFiles) {
    const content = fs.readFileSync(file, "utf8");
    if (/use\s*\(\s*params/i.test(content)) {
      violations.push(path.relative(repoRoot, file));
    }
  }

  assert.deepStrictEqual(
    violations,
    [],
    `Found unexpected use(params) in: ${violations.join(", ")}`
  );
});

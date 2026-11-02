// Logout redirect regression suite (production frontend).
//
// These are behaviour tests: the real `src/app/utils/actions/logout.ts` is
// loaded (Node's built-in TypeScript type stripping) with the `@/` alias
// resolved by tests/support/logout-loader.mjs, `next-auth/react` swapped for a
// recording stub, and a minimal in-memory browser (location, localStorage,
// sessionStorage, document.cookie) standing in for the page. Source-text
// assertions are used only where the behaviour genuinely lives in React
// components or configuration that this harness cannot mount (T07, T08, T09,
// T13, T14, T16) — never as a substitute for an executable check.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Target files are checked out with CRLF; normalise so multi-line patterns and
// sentence assertions behave the same as on the development checkout.
const source = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

// Assertions about what the code *does* must not trip over prose: drop comments
// (including JSX `{/* ... */}` blocks) before matching.
const codeOnly = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const packageJson = JSON.parse(source("package.json"));

const FRONTEND_ORIGIN = "http://127.0.0.1:3131";
const BACKEND_ORIGIN = "http://127.0.0.1:4998";
const TOKEN = "eyJhbGciOiJIUzI1NiJ9.synthetic-payload.synthetic-signature";

// ---------------------------------------------------------------- browser double
const createStorage = (seed = {}) => {
  const map = new Map(Object.entries(seed));
  const calls = [];
  return {
    calls,
    has: (key) => map.has(key),
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      calls.push(["setItem", key]);
      map.set(key, String(value));
    },
    removeItem: (key) => {
      calls.push(["removeItem", key]);
      map.delete(key);
    },
    clear: () => {
      calls.push(["clear"]);
      map.clear();
    },
    keys: () => [...map.keys()],
  };
};

const createCookieJar = () => {
  const jar = new Map();

  const load = (header) => {
    jar.clear();
    for (const pair of String(header).split(";")) {
      const trimmed = pair.trim();
      if (!trimmed) continue;
      const [name, ...rest] = trimmed.split("=");
      jar.set(name.trim(), rest.join("="));
    }
  };

  return {
    load,
    read: (name) => jar.get(name),
    names: () => [...jar.keys()],
    serialize: () => [...jar].map(([name, value]) => `${name}=${value}`).join("; "),
    // Mirrors a browser writing a Set-Cookie style string: an empty value or an
    // expiry in the past deletes the entry.
    write: (raw) => {
      const [pair, ...attributes] = String(raw).split(";");
      const [name, ...rest] = pair.split("=");
      const value = rest.join("=");
      const expired = attributes.some((attribute) => {
        const [attributeName, attributeValue] = attribute.split("=");
        if (attributeName.trim().toLowerCase() !== "expires") return false;
        const when = Date.parse(attributeValue);
        return Number.isFinite(when) && when <= Date.now();
      });
      if (!value || expired) jar.delete(name.trim());
      else jar.set(name.trim(), value);
    },
  };
};

const navigations = [];
const jar = createCookieJar();
const locationDouble = {
  _origin: FRONTEND_ORIGIN,
  _href: `${FRONTEND_ORIGIN}/dashboard`,
  get href() {
    return this._href;
  },
  set href(value) {
    this._href = String(value);
    navigations.push(String(value));
  },
  get origin() {
    return this._origin;
  },
  get pathname() {
    return new URL(this._href, this._origin).pathname;
  },
  setOrigin(origin) {
    this._origin = origin;
    this._href = `${origin}/dashboard`;
  },
  replace(value) {
    navigations.push(String(value));
  },
  assign(value) {
    navigations.push(String(value));
  },
};

globalThis.document = {
  get cookie() {
    return jar.serialize();
  },
  set cookie(value) {
    jar.write(value);
  },
};
globalThis.window = { location: locationDouble };
globalThis.localStorage = createStorage();
globalThis.sessionStorage = createStorage();

const resetBrowser = ({ cookies = "", storage = {}, session = {}, origin = FRONTEND_ORIGIN } = {}) => {
  navigations.length = 0;
  jar.load(cookies);
  for (const store of [globalThis.localStorage, globalThis.sessionStorage]) {
    store.calls.length = 0;
    store.clear();
    store.calls.length = 0;
  }
  for (const [key, value] of Object.entries(storage)) globalThis.localStorage.setItem(key, value);
  for (const [key, value] of Object.entries(session)) globalThis.sessionStorage.setItem(key, value);
  globalThis.localStorage.calls.length = 0;
  globalThis.sessionStorage.calls.length = 0;
  globalThis.__nextAuthStub = { signOutCalls: [] };
  locationDouble.setOrigin(origin);
  return {
    navigations,
    jar,
    storage: globalThis.localStorage,
    session: globalThis.sessionStorage,
    nextAuth: globalThis.__nextAuthStub,
  };
};

// Load the production module under test.
register(new URL("./support/logout-loader.mjs", import.meta.url).href);
const { logout, LOGIN_PATH } = await import(
  pathToFileURL(path.join(root, "src/app/utils/actions/logout.ts")).href
);

const activeSidebars = [
  "src/components/shared/Sidebar.tsx",
  "src/components/shared/SidebarAdmin.tsx",
  "src/components/shared/SidebarTeacher.tsx",
  "src/components/shared/SidebarBDM.tsx",
];

// ------------------------------------------------------------------------ tests
test("T01 — logout clears the backend JWT from localStorage", async () => {
  const env = resetBrowser({
    storage: { accessToken: TOKEN, adminName: "Synthetic Admin" },
  });

  await logout();

  assert.equal(env.storage.has("accessToken"), false, "accessToken still present");
  assert.ok(
    env.storage.calls.some(([method, key]) => method === "removeItem" && key === "accessToken"),
    "logout did not remove accessToken through the shared auth cleanup"
  );

  // The removal must come from the existing JWT helper, not a second
  // implementation of token removal written inside the logout action.
  const implementation = codeOnly(source("src/app/utils/actions/logout.ts"));
  assert.match(
    implementation,
    /import\s*\{\s*clearAuth\s*\}\s*from\s*["']@\/app\/helpers\/jwt["']/,
    "logout does not reuse clearAuth() from the JWT helper"
  );
  assert.match(implementation, /clearAuth\(\)/, "logout never calls clearAuth()");
  assert.doesNotMatch(
    implementation,
    /localStorage\.removeItem|Cookies\.remove|removeFromLocalStorage/,
    "logout duplicates token-removal logic instead of reusing clearAuth()"
  );
});

test("T02 — logout removes the accessToken cookie and leaves unrelated cookies alone", async () => {
  const env = resetBrowser({
    cookies: `accessToken=${TOKEN}; theme=dark; locale=en`,
  });

  await logout();

  assert.equal(env.jar.read("accessToken"), undefined, "accessToken cookie survived logout");
  assert.equal(env.jar.read("theme"), "dark", "unrelated cookie was cleared");
  assert.equal(env.jar.read("locale"), "en", "unrelated cookie was cleared");
});

test("T03 — logout clears the remaining session-related browser state", async () => {
  const env = resetBrowser({
    storage: {
      accessToken: TOKEN,
      adminName: "Synthetic Admin",
      adminEmail: "admin@example.test",
    },
    session: { "trf-cache:synthetic": "draft" },
  });

  await logout();

  assert.deepEqual(env.storage.keys(), [], "localStorage still holds session state");
  assert.deepEqual(env.session.keys(), [], "sessionStorage still holds session state");
  assert.ok(
    env.storage.calls.some(([method]) => method === "clear"),
    "localStorage was not wiped"
  );
  assert.ok(
    env.session.calls.some(([method]) => method === "clear"),
    "sessionStorage was not wiped"
  );
});

test("T04 — the final navigation is /login on the current frontend origin", async () => {
  const env = resetBrowser({ cookies: `accessToken=${TOKEN}` });

  await logout();

  assert.deepEqual(env.navigations, ["/login"], "logout must perform exactly one navigation");
  assert.equal(
    new URL(env.navigations[0], FRONTEND_ORIGIN).href,
    `${FRONTEND_ORIGIN}/login`,
    "the redirect did not resolve to the frontend login page"
  );
});

test("T05 — logout never navigates to the backend API origin", async () => {
  const env = resetBrowser({ cookies: `accessToken=${TOKEN}` });

  await logout();

  assert.equal(env.navigations.length, 1);
  const target = env.navigations[0];

  assert.ok(!target.startsWith(BACKEND_ORIGIN), `redirect used the backend origin: ${target}`);
  assert.ok(!target.includes(":5000"), `redirect points at the backend port: ${target}`);
  assert.ok(!target.includes("vercel.app"), `redirect points at a deployed backend host: ${target}`);
  assert.ok(!/^[a-z]+:\/\//i.test(target), `redirect is absolute instead of same-origin: ${target}`);
  assert.ok(target.startsWith("/") && !target.startsWith("//"), `not a same-origin path: ${target}`);
});

test("T06 — a JWT-only logout never requires or touches NextAuth", async () => {
  const env = resetBrowser({ cookies: `accessToken=${TOKEN}` });

  await logout();

  assert.deepEqual(
    env.nextAuth.signOutCalls,
    [],
    "NextAuth signOut was called for a JWT-only user"
  );
  assert.deepEqual(env.navigations, ["/login"]);

  // No NextAuth import at all, and none of the unreliable `document.cookie`
  // session detection that the development helper used.
  const implementation = codeOnly(source("src/app/utils/actions/logout.ts"));
  assert.doesNotMatch(implementation, /next-auth/, "logout still imports NextAuth");
  assert.doesNotMatch(implementation, /signOut\s*\(/, "logout still calls NextAuth signOut");
  assert.doesNotMatch(
    implementation,
    /next-auth\.session-token|document\.cookie/,
    "logout guesses at an OAuth session with the untrustworthy cookie heuristic"
  );
});

test("T07 — every active role sidebar uses the shared logout helper", () => {
  for (const file of activeSidebars) {
    const component = source(file);

    assert.match(
      component,
      /import\s*\{\s*logout\s*\}\s*from\s*["']@\/app\/utils\/actions\/logout["']/,
      `${file} does not import the shared logout helper`
    );
    assert.match(
      component,
      /onClick=\{(?:\(\)\s*=>\s*\{?\s*[\s\S]{0,80}?)logout\(\)/,
      `${file} has no Logout button calling logout()`
    );
    assert.doesNotMatch(
      component,
      /next-auth\/react/,
      `${file} imports NextAuth directly instead of the shared helper`
    );
    assert.doesNotMatch(component, /\bsignOut\s*\(/, `${file} calls NextAuth signOut directly`);
  }
});

test("T08 — existing login behaviour is unchanged", () => {
  const loginPage = source("src/app/login/page.tsx");
  assert.match(loginPage, /localStorage\.setItem\("accessToken", response\.accessToken\)/);
  assert.match(loginPage, /Cookies\.set\("accessToken", response\.accessToken/);
  assert.match(loginPage, /const response = await loginUser\(data\)/);
  assert.match(loginPage, /import Cookies from "js-cookie"/);

  const loginAction = source("src/app/utils/actions/loginUser.ts");
  assert.match(loginAction, /\$\{API_BASE\}\/api\/v1\/login/);
});

test("T09 — protected routes still deny access once the token is gone", async () => {
  const env = resetBrowser({ cookies: `accessToken=${TOKEN}`, storage: { accessToken: TOKEN } });

  await logout();

  assert.equal(env.jar.read("accessToken"), undefined);
  assert.equal(env.storage.has("accessToken"), false);

  // The two guards that consume those stores must deny access without them.
  const middleware = source("src/middleware.ts");
  assert.match(middleware, /req\.cookies\.get\("accessToken"\)/);
  assert.match(middleware, /PROTECTED_ROUTES\s*=\s*\[[^\]]*"\/dashboard"/);
  assert.match(middleware, /if \(!payload && isProtectedRoute\) \{\s*return redirect\("\/login"\)/);

  const guard = source("src/components/AuthGuard.tsx");
  assert.match(guard, /if \(!isLoggedIn\(\)\) \{\s*router\.push\("\/login"\)/);
});

test("T10 — logout performs no backend logout request", async () => {
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("logout must not perform network calls");
  };
  try {
    resetBrowser({ cookies: `accessToken=${TOKEN}` });
    await logout();
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(fetchCalls, 0, "logout issued a network request");

  const implementation = codeOnly(source("src/app/utils/actions/logout.ts"));
  assert.doesNotMatch(
    implementation,
    /\bfetch\s*\(|axios|API_BASE|api\/v1/,
    "logout contains a backend call"
  );

  // There is no backend logout endpoint to call in the first place. The backend
  // is a sibling checkout, so this assertion is skipped when it is absent.
  const backendRoutesDir = path.join(root, "..", "Lumi_Booking_Backend", "src", "routes");
  const backendRoutes = fs.existsSync(backendRoutesDir)
    ? fs
        .readdirSync(backendRoutesDir)
        .filter((name) => name.endsWith(".js"))
        .map((name) => fs.readFileSync(path.join(backendRoutesDir, name), "utf8"))
        .join("\n")
    : "";
  if (backendRoutes) {
    assert.doesNotMatch(
      backendRoutes,
      /router\.(post|delete)\(\s*["'`][^"'`]*logout/i,
      "a backend logout endpoint now exists; logout() would need to call it"
    );
  }
});

test("T11 — the redirect is independent of the development or production hostname", async () => {
  const origins = [
    "http://127.0.0.1:3131",
    "https://staging.luminedge.example",
    "https://booking.example.org",
  ];

  for (const origin of origins) {
    const env = resetBrowser({ cookies: `accessToken=${TOKEN}`, origin });

    await logout();

    assert.deepEqual(env.navigations, ["/login"], `logout hardcodes a host for ${origin}`);
    assert.equal(
      new URL(env.navigations[0], origin).href,
      `${origin}/login`,
      `logout did not resolve against the serving origin ${origin}`
    );
  }

  assert.equal(LOGIN_PATH, "/login");
  const implementation = codeOnly(source("src/app/utils/actions/logout.ts"));
  assert.doesNotMatch(
    implementation,
    /localhost|127\.0\.0\.1|:3000|:5000|https?:\/\//,
    "logout hardcodes a host or origin"
  );
  assert.doesNotMatch(
    implementation,
    /NEXTAUTH_URL|NEXT_PUBLIC_API_BASE_URL|API_BASE/,
    "logout reads an origin from runtime configuration"
  );
});

test("T12 — no hardcoded luminedge.io logout callback remains in executable source", async () => {
  const env = resetBrowser({ cookies: `accessToken=${TOKEN}` });
  await logout();
  assert.ok(
    env.navigations.every((target) => !target.includes("luminedge.io")),
    "logout navigated to the public marketing domain"
  );

  const offenders = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) {
        if (codeOnly(fs.readFileSync(full, "utf8")).includes("luminedge.io")) {
          offenders.push(path.relative(root, full).replace(/\\/g, "/"));
        }
      }
    }
  };
  walk(path.join(root, "src"));

  assert.deepEqual(offenders, [], "luminedge.io is still hardcoded in the application source");
});

test("T13 — OAuth sign-out is NOT claimed as verified: the OAuth path must stay unreachable", () => {
  // OAuth is unreachable in this app (both Google buttons are commented out and
  // `signIn` is never imported). This test is a tripwire: the moment a live
  // Google sign-in path appears, there is a real NextAuth session to terminate
  // and its sign-out must be implemented and verified separately before OAuth
  // is enabled. Logout must not silently pretend to handle it.
  const loginPage = source("src/app/login/page.tsx");
  const registerPage = source("src/app/register/page.tsx");

  for (const [label, page] of [
    ["login/page.tsx", loginPage],
    ["register/page.tsx", registerPage],
  ]) {
    const code = codeOnly(page);
    assert.doesNotMatch(
      code,
      /import\s*\{[^}]*\bsignIn\b[^}]*\}\s*from\s*["']next-auth\/react["']/,
      `${label} now imports NextAuth signIn — OAuth is reachable, so OAuth sign-out must be implemented and verified separately before this test is relaxed`
    );
    assert.doesNotMatch(
      code,
      /onClick=\{\(\)\s*=>\s*signIn\(/,
      `${label} now has an active NextAuth signIn handler — OAuth sign-out needs separate verification`
    );
    // The commented-out button is still present, so the path is intentionally
    // parked rather than deleted by accident.
    assert.match(
      page,
      /signIn\("google", \{ callbackUrl: "\/dashboard" \}\)/,
      `${label} lost the parked Google sign-in button`
    );
  }

  // And the logout helper must not claim an OAuth teardown it cannot perform.
  const implementation = codeOnly(source("src/app/utils/actions/logout.ts"));
  assert.doesNotMatch(implementation, /next-auth/, "logout imports NextAuth without a verified OAuth flow");
});

test("T14 — behaviour stays compatible with the pinned Next.js 15 / React 19 stack", async () => {
  assert.equal(packageJson.dependencies.next, "15.5.28", "Next.js version changed");
  assert.equal(packageJson.dependencies.react, "19.2.9", "React major changed");
  assert.equal(packageJson.dependencies["react-dom"], "19.2.9", "React DOM major changed");
  assert.match(packageJson.dependencies["next-auth"], /^4\.24\./, "NextAuth major changed");
  assert.equal(
    packageJson.devDependencies["eslint-config-next"],
    "15.5.28",
    "eslint-config-next must track the pinned Next.js version"
  );

  // The logout path must stay free of React hooks and concurrent-only APIs.
  const implementation = codeOnly(source("src/app/utils/actions/logout.ts"));
  assert.doesNotMatch(implementation, /\buse\(|useActionState|useOptimistic/, "a React-only API leaked into logout");

  const guard = codeOnly(source("src/components/AuthGuard.tsx"));
  assert.match(
    guard,
    /import\s*\{\s*useRouter\s*\}\s*from\s*["']next\/navigation["']/,
    "AuthGuard must keep using the app-router useRouter hook"
  );

  // The helper is a plain async function: no React, no hooks, no JSX, so it
  // behaves identically under React 19 and needs no concurrent-feature shim.
  assert.equal(typeof logout, "function", "logout is not exported as a function");
  const result = await logout();
  assert.equal(result, undefined, "logout must resolve without a value");
  assert.equal(LOGIN_PATH, "/login");
});

test("T15 — logout is safe when there is no browser window (SSR / prerender)", async () => {
  resetBrowser({ cookies: `accessToken=${TOKEN}` });
  const savedWindow = globalThis.window;
  try {
    delete globalThis.window;
    await assert.doesNotReject(() => logout());
  } finally {
    globalThis.window = savedWindow;
  }
  assert.deepEqual(navigations, [], "SSR logout attempted a navigation");
});

test("T16 — there is one shared logout implementation and no reachable duplicate", () => {
  const files = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
    }
  };
  walk(path.join(root, "src"));

  // Only the shared helper navigates to the frontend login page.
  const navigators = files.filter((file) =>
    /window\.location\.(replace|assign)\(\s*(?:["']\/login["']|LOGIN_PATH)\s*\)/.test(
      fs.readFileSync(file, "utf8")
    )
  );
  assert.deepEqual(
    navigators.map((file) => path.relative(root, file).replace(/\\/g, "/")),
    ["src/app/utils/actions/logout.ts"]
  );

  // Navbar.tsx carries a legacy NextAuth-only handler (`signOut` to "/"). It is
  // audited as unreachable: nothing imports it, so it cannot be a second logout
  // path. If it is ever wired up, this fails and it must use the shared helper.
  const importers = files.filter((file) =>
    /from\s+["'][^"']*components\/shared\/Navbar["']/.test(fs.readFileSync(file, "utf8"))
  );
  assert.deepEqual(importers, [], "the legacy NextAuth-only Navbar became reachable");
});

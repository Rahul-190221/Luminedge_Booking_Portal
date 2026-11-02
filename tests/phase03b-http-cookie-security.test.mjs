// Phase 03B — Axios and js-cookie security alignment.
// The shared Axios client and JWT helper are loaded from the real TypeScript
// sources. HTTP is exercised through a local adapter; no network request is
// sent. RootLayout's default Axios interceptors remain a separate path.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "node:http";
import test from "node:test";
import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
const manifest = JSON.parse(source("package.json"));
const lock = JSON.parse(source("package-lock.json"));
const codeOnly = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const API_ORIGIN = "http://127.0.0.1:4998";

process.env.NEXT_PUBLIC_API_BASE_URL = API_ORIGIN;
register(new URL("./support/logout-loader.mjs", import.meta.url));
register(new URL("./support/typescript-source-loader.mjs", import.meta.url));

const storage = () => {
  const values = new Map();
  const calls = [];
  return {
    calls,
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { calls.push(["setItem", key]); values.set(key, String(value)); },
    removeItem(key) { calls.push(["removeItem", key]); values.delete(key); },
    clear() { calls.push(["clear"]); values.clear(); },
    has(key) { return values.has(key); },
    reset(seed = {}) {
      values.clear();
      calls.length = 0;
      for (const [key, value] of Object.entries(seed)) values.set(key, String(value));
    },
  };
};

const localStore = storage();
const cookieJar = new Map();
const cookieWrites = [];
const navigations = [];
let currentHref = API_ORIGIN + "/dashboard";
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: localStore });
Object.defineProperty(globalThis, "document", {
  configurable: true,
  value: {
    get cookie() { return [...cookieJar].map(([name, value]) => name + "=" + value).join("; "); },
    set cookie(raw) {
      cookieWrites.push(String(raw));
      const [pair, ...attributes] = String(raw).split(";");
      const [name, ...valueParts] = pair.split("=");
      const key = name.trim();
      const value = valueParts.join("=");
      const expires = attributes.find((part) => /^\s*expires=/i.test(part));
      const expired = expires && Date.parse(expires.split("=").slice(1).join("=")) <= Date.now();
      if (!value || expired) cookieJar.delete(key);
      else cookieJar.set(key, value);
    },
  },
});
const location = {
  get href() { return currentHref; },
  set href(value) {
    currentHref = new URL(String(value), API_ORIGIN).href;
    navigations.push(currentHref);
  },
  get pathname() { return new URL(currentHref).pathname; },
  get protocol() { return new URL(currentHref).protocol; },
};
Object.defineProperty(globalThis, "window", { configurable: true, value: { location } });

const resetBrowser = ({ token, unrelatedCookie = true } = {}) => {
  localStore.reset(token ? { accessToken: token, unrelatedCache: "keep" } : { unrelatedCache: "keep" });
  cookieJar.clear();
  cookieWrites.length = 0;
  navigations.length = 0;
  currentHref = API_ORIGIN + "/dashboard";
  if (token) cookieJar.set("accessToken", token);
  if (unrelatedCookie) cookieJar.set("preference", "dark");
};
const jwt = (payload) => {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return encode({ alg: "HS256", typ: "JWT" }) + "." + encode(payload) + ".synthetic-signature";
};
const validToken = () => jwt({ userId: "test-user", role: "user", exp: Math.floor(Date.now() / 1000) + 3600 });
const expiredToken = () => jwt({ userId: "test-user", role: "user", exp: Math.floor(Date.now() / 1000) - 3600 });
const importHttp = (caseName) =>
  import(pathToFileURL(path.join(root, "src/lib/http.ts")).href + "?phase03b=" + caseName);
const responseFor = (config, status, data = { ok: true }) => ({
  data, status, statusText: status === 200 ? "OK" : "Error", headers: {}, config,
});

test("T01 — exact direct pins and lock resolutions are limited to the approved dependency pair", () => {
  assert.equal(manifest.dependencies.axios, "1.20.0");
  assert.equal(manifest.dependencies["js-cookie"], "3.0.8");
  assert.equal(lock.packages["node_modules/axios"].version, "1.20.0");
  assert.equal(lock.packages["node_modules/js-cookie"].version, "3.0.8");
  assert.equal(manifest.dependencies.next, "15.5.28");
  assert.equal(manifest.dependencies.react, "19.2.9");
  assert.equal(manifest.dependencies["react-dom"], "19.2.9");
  assert.equal(manifest.dependencies.jspdf, "4.2.1");
  assert.equal(manifest.dependencies["jspdf-autotable"], "5.0.9");
  assert.equal(manifest.dependencies.html2canvas, "1.4.1");
});

test("T02 — shared Axios keeps valid bearer auth on GET, POST, and PUT and preserves absolute URLs", async () => {
  resetBrowser({ token: validToken() });
  const { default: http } = await importHttp("valid-requests");
  const calls = [];
  http.defaults.adapter = async (config) => {
    calls.push(config);
    return responseFor(config, 200);
  };
  await http.get(API_ORIGIN + "/api/v1/user/profile");
  await http.post(API_ORIGIN + "/api/v1/user/book-slot", { slot: "test-slot" });
  await http.put(API_ORIGIN + "/api/v1/admin/save-feedback", { score: 7 });
  assert.equal(http.defaults.baseURL, API_ORIGIN);
  assert.equal(calls.length, 3);
  assert.deepEqual(calls.map((config) => config.method), ["get", "post", "put"]);
  assert.deepEqual(calls.map((config) => config.url), [
    API_ORIGIN + "/api/v1/user/profile",
    API_ORIGIN + "/api/v1/user/book-slot",
    API_ORIGIN + "/api/v1/admin/save-feedback",
  ]);
  assert.ok(calls.every((config) => config.headers.get("Authorization") === "Bearer " + localStore.getItem("accessToken")));
  assert.equal(cookieJar.get("preference"), "dark");
  assert.deepEqual(navigations, []);
});

test("T03 — missing and expired tokens are rejected before the adapter can send a request", async (t) => {
  for (const scenario of [
    { name: "missing", token: undefined },
    { name: "expired", token: expiredToken() },
  ]) {
    await t.test(scenario.name, async () => {
      resetBrowser({ token: scenario.token });
      const { default: http, NO_AUTH_ERROR } = await importHttp("no-token-" + scenario.name);
      let sends = 0;
      http.defaults.adapter = async () => { sends += 1; return responseFor({}, 200); };
      await assert.rejects(http.get(API_ORIGIN + "/api/v1/user/profile"), (error) => {
        assert.equal(error.message, NO_AUTH_ERROR);
        assert.equal(error.code, "ERR_CANCELED");
        return true;
      });
      assert.equal(sends, 0);
      assert.equal(localStore.has("accessToken"), false);
      assert.equal(cookieJar.has("accessToken"), false);
      assert.deepEqual(navigations, [API_ORIGIN + "/login"]);
      assert.equal(cookieJar.get("preference"), "dark");
    });
  }
});

test("T04 — 401 preserves the original Axios response and redirects once to the frontend login path", async () => {
  resetBrowser({ token: validToken() });
  const { default: http } = await importHttp("401");
  const axios = (await import("axios")).default;
  http.defaults.adapter = async (config) => {
    throw new axios.AxiosError("Request failed with status code 401", "ERR_BAD_REQUEST", config, null,
      responseFor(config, 401, { code: "SESSION_EXPIRED" }));
  };
  await assert.rejects(http.get(API_ORIGIN + "/api/v1/user/profile"), (error) => {
    assert.equal(error.response.status, 401);
    assert.deepEqual(error.response.data, { code: "SESSION_EXPIRED" });
    return true;
  });
  assert.equal(localStore.has("accessToken"), false);
  assert.equal(cookieJar.has("accessToken"), false);
  assert.deepEqual(navigations, [API_ORIGIN + "/login"]);
  assert.equal(cookieJar.get("preference"), "dark");
});

test("T05 — non-authentication error responses remain available and leave the session intact", async (t) => {
  for (const status of [400, 403, 409, 423, 500]) {
    await t.test(String(status), async () => {
      const token = validToken();
      resetBrowser({ token });
      const { default: http } = await importHttp("status-" + status);
      const axios = (await import("axios")).default;
      http.defaults.adapter = async (config) => {
        throw new axios.AxiosError("Request failed with status code " + status, "ERR_BAD_REQUEST", config, null,
          responseFor(config, status, { status, detail: "preserved" }));
      };
      await assert.rejects(http.get(API_ORIGIN + "/api/v1/test"), (error) => {
        assert.equal(error.response.status, status);
        assert.deepEqual(error.response.data, { status, detail: "preserved" });
        return true;
      });
      assert.equal(localStore.getItem("accessToken"), token);
      assert.equal(cookieJar.get("accessToken"), token);
      assert.deepEqual(navigations, []);
    });
  }
});

test("T06 — default Axios interceptors stay independent and eject when RootLayout unmounts", () => {
  const layout = codeOnly(source("src/app/layout.tsx"));
  assert.match(layout, /axios\.interceptors\.request\.use\(/);
  assert.match(layout, /axios\.interceptors\.response\.use\(/);
  assert.match(layout, /localStorage\.getItem\("accessToken"\)/);
  assert.match(layout, /localStorage\.removeItem\("accessToken"\)/);
  assert.match(layout, /Cookies\.remove\("accessToken"\)/);
  assert.match(layout, /axios\.interceptors\.request\.eject\(reqId\)/);
  assert.match(layout, /axios\.interceptors\.response\.eject\(resId\)/);
  assert.match(layout, /window\.location\.href\s*=\s*"\/login"/);
  assert.doesNotMatch(layout, /axios\.post\([^\n]*logout|api\/v1\/logout/);
});

test("T07 — login and middleware keep the exp-bound accessToken cookie contract", () => {
  const login = codeOnly(source("src/app/login/page.tsx"));
  const middleware = codeOnly(source("src/middleware.ts"));
  assert.match(login, /Cookies\.set\("accessToken",\s*response\.accessToken/);
  assert.match(login, /new Date\(exp \* 1000\)/);
  assert.match(login, /sameSite:\s*"lax"/);
  assert.match(login, /secure:\s*window\.location\.protocol === "https:"/);
  assert.match(middleware, /accessToken/);
  assert.match(middleware, /jwtDecode/);
});

test("T08 — JWT cleanup removes only accessToken and keeps expiry enforcement", () => {
  const jwtHelper = codeOnly(source("src/app/helpers/jwt.ts"));
  assert.match(jwtHelper, /Cookies\.remove\(authKey\)/);
  assert.match(jwtHelper, /decoded\.exp \* 1000 <= Date\.now\(\)/);
  assert.match(jwtHelper, /removeFromLocalStorage\(authKey\)/);
});

test("T09 — Axios preserves the browser upload FormData boundary and bearer header", async () => {
  resetBrowser({ token: validToken() });
  const { default: http } = await importHttp("multipart-upload");
  const received = new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      const chunks = [];
      request.on("data", (chunk) => chunks.push(chunk));
      request.on("end", () => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ ok: true }));
        resolve({
          contentType: request.headers["content-type"],
          authorization: request.headers.authorization,
          body: Buffer.concat(chunks).toString("utf8"),
        });
        server.close();
      });
      request.on("error", (error) => {
        server.close();
        reject(error);
      });
    });
    server.listen(0, "127.0.0.1");
    server.on("listening", async () => {
      try {
        const form = new FormData();
        form.append("scheduleId", "synthetic-schedule");
        form.append("file", new Blob(["synthetic TRF"]), "synthetic-trf.pdf");
        const address = server.address();
        await http.post("http://127.0.0.1:" + address.port + "/api/v1/upload-trf", form);
      } catch (error) {
        server.close();
        reject(error);
      }
    });
    server.on("error", reject);
  });
  const request = await received;
  const boundary = request.contentType?.match(/boundary=([^;]+)/)?.[1];
  assert.ok(boundary, "Axios must supply a multipart boundary");
  assert.ok(request.body.startsWith("--" + boundary));
  assert.ok(request.body.includes('name="scheduleId"'));
  assert.ok(request.body.includes('filename="synthetic-trf.pdf"'));
  assert.ok(request.body.includes("synthetic TRF"));
  assert.equal(request.authorization, "Bearer " + localStore.getItem("accessToken"));
});

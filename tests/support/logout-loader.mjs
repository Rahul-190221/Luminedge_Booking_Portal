// Module resolution shim for the logout behaviour tests.
//
// The frontend is a Next.js/TypeScript app: it imports through the `@/` alias
// (tsconfig `paths`: "@/*" -> "./src/*") and uses extensionless relative
// imports (bundler resolution). Node's ESM resolver knows neither, so this hook
// fills exactly that gap (plus replacing `next-auth/react` with a recording
// stub so an accidental NextAuth import becomes observable). Node's built-in
// type stripping still compiles the TypeScript itself — the real source is what
// gets tested.
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// tests/support -> frontend root
const root = path.resolve(here, "..", "..");
const stubUrl = new URL("./next-auth-stub.mjs", import.meta.url).href;

const CANDIDATES = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  "/index.ts",
  "/index.tsx",
  "/index.js",
];

const firstExistingFile = (absoluteBase) => {
  for (const suffix of CANDIDATES) {
    const candidate = absoluteBase + suffix;
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return pathToFileURL(candidate).href;
    }
  }
  return null;
};

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next-auth/react") {
    return { url: stubUrl, shortCircuit: true };
  }

  if (specifier.startsWith("@/")) {
    const url = firstExistingFile(path.join(root, "src", specifier.slice(2)));
    if (url) return { url, shortCircuit: true };
  }

  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL?.startsWith("file:")
  ) {
    const parent = path.dirname(fileURLToPath(context.parentURL));
    const url = firstExistingFile(path.resolve(parent, specifier));
    if (url && url !== context.parentURL) return { url, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}

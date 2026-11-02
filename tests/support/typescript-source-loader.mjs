// Transpile the real app TypeScript modules used by the HTTP regression tests.
// Node's built-in stripper keeps value-shaped imports for TypeScript-only
// exports, while TypeScript's normal compiler correctly removes those types.
import typescript from "typescript";

export async function load(url, context, nextLoad) {
  if (!url.startsWith("file:") || !/\.tsx?$/.test(new URL(url).pathname)) {
    return nextLoad(url, context);
  }

  const loaded = await nextLoad(url, { ...context, format: "module" });
  const source = typeof loaded.source === "string" ? loaded.source : Buffer.from(loaded.source).toString("utf8");
  const result = typescript.transpileModule(source, {
    compilerOptions: {
      jsx: typescript.JsxEmit.Preserve,
      module: typescript.ModuleKind.ESNext,
      target: typescript.ScriptTarget.ES2022,
    },
    fileName: new URL(url).pathname,
  });

  return { format: "module", shortCircuit: true, source: result.outputText };
}

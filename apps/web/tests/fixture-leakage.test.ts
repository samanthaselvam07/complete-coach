import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const runtimeRoots = ["app", "components", "lib"].map((directory) => path.join(process.cwd(), directory));
const sourceFileExtensions = new Set([".ts", ".tsx"]);

describe("runtime fixture leakage guard", () => {
  it("keeps app, component, and lib runtime code from importing demo fixtures", () => {
    const offenders = runtimeRoots
      .flatMap((root) => collectSourceFiles(root))
      .filter((filePath) => readFileSync(filePath, "utf8").includes("@/fixtures/"))
      .map((filePath) => path.relative(process.cwd(), filePath));

    expect(offenders).toEqual([]);
  });
});

function collectSourceFiles(root: string): string[] {
  const entries = readdirSync(root);

  return entries.flatMap((entry) => {
    const filePath = path.join(root, entry);
    const stats = statSync(filePath);

    if (stats.isDirectory()) {
      return collectSourceFiles(filePath);
    }

    return sourceFileExtensions.has(path.extname(filePath)) ? [filePath] : [];
  });
}

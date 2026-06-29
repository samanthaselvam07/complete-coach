import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(__dirname, "..");
const scannedRoots = [
  path.join(projectRoot, "app/api/v1"),
  path.join(projectRoot, "lib")
];

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = path.join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      return collectTypeScriptFiles(fullPath);
    }

    return fullPath.endsWith(".ts") ? [fullPath] : [];
  });
}

function isDocumentedBareIdException(line: string) {
  return (
    line.includes("where: { id: string }") ||
    line.includes("where: { id: actor.organizationId }") ||
    line.includes("where: { id: organization.id }")
  );
}

describe("tenant query patterns", () => {
  it("keeps id-based tenant mutations scoped by organizationId", () => {
    const bareTenantMutationLines = scannedRoots
      .flatMap(collectTypeScriptFiles)
      .flatMap((filePath) =>
        readFileSync(filePath, "utf8")
          .split("\n")
          .map((line, index) => ({
            filePath: path.relative(projectRoot, filePath),
            line: line.trim(),
            lineNumber: index + 1
          }))
      )
      .filter(({ line }) => /where:\s*\{\s*id[:}]/.test(line))
      .filter(({ line }) => !line.includes("organizationId"))
      .filter(({ line }) => !isDocumentedBareIdException(line))
      .map(({ filePath, lineNumber, line }) => `${filePath}:${lineNumber} ${line}`);

    expect(bareTenantMutationLines).toEqual([]);
  });
});

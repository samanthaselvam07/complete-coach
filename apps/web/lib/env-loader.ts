import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { config } from "dotenv";

export function getLocalEnvFileCandidates(cwd = process.cwd()) {
  const repositoryRoot = resolve(/* turbopackIgnore: true */ cwd, "../..");
  const candidateRoots = [repositoryRoot];

  if (basename(repositoryRoot) !== "complete-coach") {
    candidateRoots.push(resolve(/* turbopackIgnore: true */ repositoryRoot, "../complete-coach"));
  }

  return Array.from(
    new Set(
      candidateRoots.flatMap((root) => [
        resolve(/* turbopackIgnore: true */ root, ".env"),
        resolve(/* turbopackIgnore: true */ root, "apps/web/.env"),
        resolve(/* turbopackIgnore: true */ root, ".env.local"),
        resolve(/* turbopackIgnore: true */ root, "apps/web/.env.local")
      ])
    )
  );
}

export function loadLocalEnvFiles(cwd = process.cwd()) {
  const loadedPaths: string[] = [];

  for (const envPath of getLocalEnvFileCandidates(cwd)) {
    if (existsSync(envPath)) {
      config({ path: envPath, override: false, quiet: true });
      loadedPaths.push(envPath);
    }
  }

  return loadedPaths;
}

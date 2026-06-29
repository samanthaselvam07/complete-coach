import { defineConfig } from "prisma/config";
import { loadLocalEnvFiles } from "./lib/env-loader";

loadLocalEnvFiles();

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DIRECT_URL or DATABASE_URL is required for Prisma commands. Configure the Neon database URL before running database tooling.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    url: databaseUrl
  }
});

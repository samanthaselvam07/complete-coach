import { withSentryConfig } from "@sentry/nextjs";
import path from "node:path";
import process from "node:process";

const workspaceRoot = path.resolve(process.cwd(), "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: workspaceRoot,
  reactStrictMode: true,
  turbopack: {
    root: workspaceRoot
  },
  typedRoutes: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
        ]
      }
    ];
  }
};

export default withSentryConfig(nextConfig, {
  silent: true,
  widenClientFileUpload: false,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN
  }
});

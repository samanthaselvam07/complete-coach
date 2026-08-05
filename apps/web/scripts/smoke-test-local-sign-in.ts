import { resolve } from "node:path";

import { config } from "dotenv";

const args = parseArgs(process.argv.slice(2));

if (args.envFile) {
  config({ path: resolve(args.envFile), override: true });
} else {
  config();
}

const baseUrl = args.baseUrl ?? process.env.NEXTAUTH_URL ?? "http://localhost:3001";
const email = process.env.DEMO_COACH_EMAIL;
const password = process.env.DEMO_COACH_PASSWORD;

if (!email || !password) {
  throw new Error("DEMO_COACH_EMAIL and DEMO_COACH_PASSWORD are required.");
}

const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
const csrfCookie = csrfResponse.headers.get("set-cookie")?.split(";")[0];
const csrfPayload = (await csrfResponse.json()) as { csrfToken?: string };

if (!csrfPayload.csrfToken || !csrfCookie) {
  throw new Error("Could not get Auth.js CSRF token.");
}

const form = new URLSearchParams({
  csrfToken: csrfPayload.csrfToken,
  email,
  password,
  redirect: "false",
  callbackUrl: `${baseUrl}/dashboard`
});

const signInResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
  method: "POST",
  headers: {
    "content-type": "application/x-www-form-urlencoded",
    cookie: csrfCookie
  },
  body: form,
  redirect: "manual"
});

const signInBody = await signInResponse.text();

console.log(
  JSON.stringify(
    {
      baseUrl,
      status: signInResponse.status,
      ok: signInResponse.ok,
      location: signInResponse.headers.get("location"),
      hasSessionCookie: Boolean(signInResponse.headers.get("set-cookie")?.includes("authjs.session-token")),
      bodyPreview: signInBody.slice(0, 120)
    },
    null,
    2
  )
);

function parseArgs(argv: string[]) {
  const parsed: { envFile?: string; baseUrl?: string } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--env-file") {
      parsed.envFile = argv[index + 1];
      index += 1;
    } else if (arg === "--base-url") {
      parsed.baseUrl = argv[index + 1];
      index += 1;
    }
  }

  return parsed;
}

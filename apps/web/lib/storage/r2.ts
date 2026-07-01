import { createHmac, createHash } from "node:crypto";

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

interface PresignPutInput {
  objectKey: string;
  contentType: string;
  expiresInSeconds?: number;
  now?: Date;
}

interface PresignGetInput {
  objectKey: string;
  expiresInSeconds?: number;
  now?: Date;
}

const service = "s3";
const region = "auto";

export function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accountId && !accessKeyId && !secretAccessKey && !bucketName) {
    return null;
  }

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error("R2 storage is partially configured.");
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName
  };
}

export function createR2PresignedPutUrl(config: R2Config, input: PresignPutInput) {
  const now = input.now ?? new Date();
  const expiresInSeconds = input.expiresInSeconds ?? 300;
  const amzDate = formatAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${encodePathSegment(config.bucketName)}/${encodeObjectKey(input.objectKey)}`;
  const signedHeaders = "content-type;host";
  const queryParams: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${config.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresInSeconds),
    "X-Amz-SignedHeaders": signedHeaders
  };
  const canonicalQueryString = canonicalizeQuery(queryParams);
  const canonicalHeaders = `content-type:${input.contentType}\nhost:${host}\n`;
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD"
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    createHash("sha256").update(canonicalRequest).digest("hex")
  ].join("\n");
  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp);
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

export function createR2PresignedGetUrl(config: R2Config, input: PresignGetInput) {
  const now = input.now ?? new Date();
  const expiresInSeconds = input.expiresInSeconds ?? 300;
  const amzDate = formatAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${encodePathSegment(config.bucketName)}/${encodeObjectKey(input.objectKey)}`;
  const signedHeaders = "host";
  const queryParams: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${config.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresInSeconds),
    "X-Amz-SignedHeaders": signedHeaders
  };
  const canonicalQueryString = canonicalizeQuery(queryParams);
  const canonicalHeaders = `host:${host}\n`;
  const canonicalRequest = [
    "GET",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD"
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    createHash("sha256").update(canonicalRequest).digest("hex")
  ].join("\n");
  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp);
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

function getSignatureKey(secretAccessKey: string, dateStamp: string) {
  const dateKey = createHmac("sha256", `AWS4${secretAccessKey}`).update(dateStamp).digest();
  const regionKey = createHmac("sha256", dateKey).update(region).digest();
  const serviceKey = createHmac("sha256", regionKey).update(service).digest();

  return createHmac("sha256", serviceKey).update("aws4_request").digest();
}

function formatAmzDate(value: Date) {
  return value.toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
}

function canonicalizeQuery(params: Record<string, string>) {
  return Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
    .join("&");
}

function encodeObjectKey(objectKey: string) {
  return objectKey.split("/").map(encodePathSegment).join("/");
}

function encodePathSegment(value: string) {
  return encodeRfc3986(value);
}

function encodeRfc3986(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

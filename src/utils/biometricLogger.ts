import fs from "node:fs";
import path from "node:path";

const LOG_PATH = path.join(process.cwd(), "logs", "biometric.log");

// Ensure logs directory exists
const logsDir = path.dirname(LOG_PATH);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function ts(): string {
  return new Date().toISOString();
}

function append(text: string): void {
  try {
    fs.appendFileSync(LOG_PATH, text, "utf8");
  } catch (err) {
    process.stderr.write(`[biometricLogger] write failed: ${err}\n`);
  }
}

export function logBiometricRequest(opts: {
  method: string;
  path: string;
  query: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}): void {
  const relevantHeaders: Record<string, string> = {};
  const pick = ["content-type", "content-length", "user-agent"];
  for (const h of pick) {
    if (opts.headers[h]) relevantHeaders[h] = String(opts.headers[h]);
  }

  let bodyStr: string;
  if (typeof opts.body === "string") {
    bodyStr = opts.body.length > 0 ? opts.body : "(vacío)";
  } else if (opts.body && typeof opts.body === "object") {
    bodyStr = JSON.stringify(opts.body, null, 2);
  } else {
    bodyStr = "(vacío)";
  }

  const lines = [
    ``,
    `${"─".repeat(72)}`,
    `[${ts()}]`,
    `→ REQUEST  ${opts.method} ${opts.path}`,
    `  Query:   ${JSON.stringify(opts.query)}`,
    `  Headers: ${JSON.stringify(relevantHeaders)}`,
    `  Body:`,
    ...bodyStr.split("\n").map((l) => `    ${l}`),
    ``,
  ].join("\n");

  append(lines);
}

export function logBiometricResponse(opts: {
  method: string;
  path: string;
  status: number;
  body: string;
  durationMs: number;
}): void {
  const lines = [
    `← RESPONSE ${opts.status} (${opts.durationMs}ms)`,
    ...opts.body.split("\n").map((l) => `    ${l}`),
    ``,
  ].join("\n");

  append(lines);
}

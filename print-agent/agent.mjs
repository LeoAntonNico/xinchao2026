import { execFile } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(path.join(__dirname, ".env"));

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Xin Chao print agent

Usage:
  node print-agent/agent.mjs

Config:
  Copy print-agent/.env.example to print-agent/.env and fill:
  XINCHAO_BASE_URL
  XINCHAO_PRINT_SECRET
  XINCHAO_LOCATION
  XINCHAO_TRANSPORT

Install on Windows:
  powershell -ExecutionPolicy Bypass -File print-agent/install-task.ps1
`);
  process.exit(0);
}

const config = {
  baseUrl: required("XINCHAO_BASE_URL").replace(/\/+$/, ""),
  secret: required("XINCHAO_PRINT_SECRET"),
  location: required("XINCHAO_LOCATION").toLowerCase(),
  transport: (process.env.XINCHAO_TRANSPORT || "tcp").toLowerCase(),
  host: process.env.XINCHAO_PRINTER_HOST || "",
  port: Number(process.env.XINCHAO_PRINTER_PORT || 9100),
  share: process.env.XINCHAO_PRINTER_SHARE || "",
  pollMs: Number(process.env.XINCHAO_POLL_MS || 4000),
  maxAttempts: Number(process.env.XINCHAO_MAX_ATTEMPTS || 5),
  logFile: process.env.XINCHAO_LOG_FILE || "logs/print-agent.log",
};

const logPath = path.isAbsolute(config.logFile)
  ? config.logFile
  : path.join(__dirname, config.logFile);

let polling = false;
let stopped = false;

function required(key) {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required config: ${key}`);
  return value;
}

function log(message, meta) {
  const line = `${new Date().toISOString()} ${message}${meta ? ` ${JSON.stringify(meta)}` : ""}`;
  console.log(line);
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${line}${os.EOL}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function api(pathname, options = {}) {
  const response = await fetch(`${config.baseUrl}${pathname}`, {
    ...options,
    headers: {
      "x-agent-secret": config.secret,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  return body;
}

async function fetchJobs() {
  const params = new URLSearchParams({ location: config.location });
  const data = await api(`/api/print-queue?${params.toString()}`);
  return Array.isArray(data.jobs) ? data.jobs : [];
}

async function markJob(job, status, error) {
  await api(`/api/print-queue/${encodeURIComponent(job.id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status, error }),
  });
}

async function printJob(job) {
  if (!job.escposData) throw new Error("Print job has no escposData");
  const buffer = Buffer.from(job.escposData, "base64");

  if (config.transport === "tcp") {
    await printTcp(buffer);
  } else if (config.transport === "share") {
    await printWindowsShare(buffer, job.id);
  } else if (config.transport === "file") {
    await printFile(buffer, job.id);
  } else {
    throw new Error(`Unsupported XINCHAO_TRANSPORT: ${config.transport}`);
  }
}

function printTcp(buffer) {
  if (!config.host) throw new Error("XINCHAO_PRINTER_HOST is required for tcp transport");

  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("Printer TCP timeout"));
    }, 15000);

    socket.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    socket.connect(config.port, config.host, () => {
      socket.write(buffer, (error) => {
        if (error) {
          clearTimeout(timeout);
          socket.destroy();
          reject(error);
          return;
        }
        socket.end();
      });
    });

    socket.once("close", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function printWindowsShare(buffer, jobId) {
  if (!config.share) throw new Error("XINCHAO_PRINTER_SHARE is required for share transport");
  if (config.share.includes('"')) throw new Error("Printer share path may not contain quotes");

  const tmpFile = path.join(os.tmpdir(), `xinchao-${jobId}.bin`);
  fs.writeFileSync(tmpFile, buffer);

  const command = `copy /B "${tmpFile}" "${config.share}"`;
  return new Promise((resolve, reject) => {
    execFile("cmd.exe", ["/d", "/s", "/c", command], { windowsHide: true }, (error, stdout, stderr) => {
      fs.rmSync(tmpFile, { force: true });
      if (error) {
        reject(new Error((stderr || stdout || error.message).trim()));
        return;
      }
      resolve();
    });
  });
}

function printFile(buffer, jobId) {
  const dir = path.join(__dirname, "printed");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${Date.now()}-${jobId}.bin`), buffer);
}

async function processJobs() {
  if (polling) return;
  polling = true;

  try {
    const jobs = await fetchJobs();
    if (jobs.length > 0) log(`Fetched ${jobs.length} job(s)`, { location: config.location });

    for (const job of jobs) {
      try {
        log("Printing job", { id: job.id, orderId: job.orderId, attemptCount: job.attemptCount });
        await printJob(job);
        await markJob(job, "PRINTED");
        log("Printed job", { id: job.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const nextAttempt = Number(job.attemptCount || 0) + 1;
        const status = nextAttempt >= config.maxAttempts ? "FAILED" : "RETRYING";
        await markJob(job, status, message).catch((patchError) => {
          log("Could not update failed job status", {
            id: job.id,
            error: patchError instanceof Error ? patchError.message : String(patchError),
          });
        });
        log("Print job failed", { id: job.id, status, error: message });
      }
    }
  } catch (error) {
    log("Polling failed", { error: error instanceof Error ? error.message : String(error) });
  } finally {
    polling = false;
  }
}

async function main() {
  log("Xin Chao print agent started", {
    baseUrl: config.baseUrl,
    location: config.location,
    transport: config.transport,
    pollMs: config.pollMs,
  });

  while (!stopped) {
    await processJobs();
    await sleep(config.pollMs);
  }
}

process.on("SIGINT", () => {
  stopped = true;
  log("Stopping print agent");
});

process.on("SIGTERM", () => {
  stopped = true;
  log("Stopping print agent");
});

main().catch((error) => {
  log("Fatal error", { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});

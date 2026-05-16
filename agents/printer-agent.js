/**
 * Xin Chao Print Agent — Epson TM-T20III LAN Printer
 *
 * Run this on a mini PC / Raspberry Pi at each branch.
 * It polls the website's print queue and sends ESC/POS
 * data directly to the printer's raw TCP port (9100).
 *
 * Setup:
 *   1. Set printer to STATIC IP (or DHCP reservation)
 *   2. Copy this file + .env-printer to the branch computer
 *   3. npm install dotenv         (if not already)
 *   4. node printer-agent.js
 *
 * For production, run under systemd / pm2.
 */

const net = require('net');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// --- CONFIG ---
const API_BASE = (process.env.PRINT_API_URL || 'http://91.98.224.2:3000').replace(/\/$/, '');
const AGENT_SECRET = process.env.PRINT_AGENT_SECRET || '';
const PRINTER_IP = process.env.PRINTER_IP || '192.168.1.100';
const PRINTER_PORT = Number(process.env.PRINTER_PORT || 9100);
const LOCATION = process.env.LOCATION || 'utrecht';
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL || 5000);
const MAX_RETRIES = 3;

// --- LOGGER ---
function log(label, ...args) {
  const now = new Date().toISOString();
  console.log(`[${now}] [${LOCATION}] [${label}]`, ...args);
}

// --- HTTP REQUEST HELPER ---
function request(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_BASE);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const postData = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-agent-secret': AGENT_SECRET,
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
      },
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

// --- SEND TO PRINTER ---
function sendToPrinter(base64EscPos) {
  return new Promise((resolve, reject) => {
    const buffer = Buffer.from(base64EscPos, 'base64');
    const socket = new net.Socket();

    socket.setTimeout(10000);

    const cleanup = () => {
      socket.destroy();
    };

    socket.on('connect', () => {
      log('PRINTER', `Connected to ${PRINTER_IP}:${PRINTER_PORT}`);
      socket.write(buffer, (err) => {
        if (err) {
          cleanup();
          reject(err);
          return;
        }
        socket.end();
      });
    });

    socket.on('close', (hadError) => {
      if (!hadError) {
        resolve();
      }
    });

    socket.on('error', (err) => {
      cleanup();
      reject(err);
    });

    socket.on('timeout', () => {
      cleanup();
      reject(new Error('Printer connection timeout'));
    });

    socket.connect(PRINTER_PORT, PRINTER_IP);
  });
}

// --- PRINT A SINGLE JOB ---
async function printJob(job) {
  log('PRINT', `Job ${job.id} (order ${job.orderId || '-'})`);

  try {
    if (!job.escposData) {
      throw new Error('No escposData in job payload');
    }

    await sendToPrinter(job.escposData);

    log('PRINT', `Job ${job.id} sent to printer OK`);

    await request('PATCH', `/api/print-queue/${job.id}`, {
      status: 'PRINTED',
    });

    return true;
  } catch (err) {
    log('ERROR', `Job ${job.id} failed:`, err.message);

    await request('PATCH', `/api/print-queue/${job.id}`, {
      status: job.attemptCount >= MAX_RETRIES - 1 ? 'FAILED' : 'RETRYING',
      error: err.message,
    });

    return false;
  }
}

// --- MAIN POLL LOOP ---
async function poll() {
  try {
    const res = await request('GET', `/api/print-queue?location=${LOCATION}`);

    if (res.status !== 200) {
      log('API', `Unexpected status ${res.status}`, res.body);
      return;
    }

    const jobs = res.body.jobs || [];

    if (jobs.length > 0) {
      log('QUEUE', `${jobs.length} pending job(s)`);
    }

    for (const job of jobs) {
      await printJob(job);
      // Small delay between jobs to not overwhelm printer buffer
      await new Promise((r) => setTimeout(r, 500));
    }
  } catch (err) {
    log('NETWORK', `Poll failed: ${err.message}`);
  }
}

// --- STARTUP ---
async function main() {
  log('START', 'Print agent booting...');
  log('CONFIG', `API: ${API_BASE} | Printer: ${PRINTER_IP}:${PRINTER_PORT} | Location: ${LOCATION}`);

  if (!AGENT_SECRET) {
    log('WARN', 'PRINT_AGENT_SECRET not set — queue API will reject requests!');
  }

  // Initial poll, then interval
  await poll();
  setInterval(poll, POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

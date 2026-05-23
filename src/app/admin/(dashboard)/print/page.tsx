"use client";

import { useState, useEffect, useCallback } from "react";
import { getTestReceiptData, formatReceiptText, formatReceiptEscPos } from "@/lib/receipt-formatter";

function PrinterIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

interface PrintJob {
  id: string;
  location: string;
  status: string;
  orderId: string | null;
  orderNumber: string | null;
  attemptCount: number;
  lastError: string | null;
  createdAt: string;
}

export default function PrintTestPage() {
  const [preview, setPreview] = useState<string>("");
  const [location, setLocation] = useState<string>("utrecht");
  const [queue, setQueue] = useState<PrintJob[]>([]);
  const [printingLocation, setPrintingLocation] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const data = getTestReceiptData(location === "utrecht" ? "Utrecht" : "Wageningen");

  useEffect(() => {
    setPreview(formatReceiptText(data));
  }, [location]);

  useEffect(() => {
    setPreview(formatReceiptText(data));
  }, [location, data]);

  const fetchQueue = useCallback(async () => {
    const res = await fetch("/api/admin/print-queue", { credentials: "include" });
    if (res.ok) {
      const d = await res.json();
      setQueue(Array.isArray(d) ? d : []);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  async function handlePrint() {
    setPrintingLocation(location);
    setMessage(null);
    try {
      const res = await fetch("/api/print-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ testData: data, location }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: err.error || `Failed (${res.status})` });
        return;
      }
      const result = await res.json();
      setMessage({ type: "ok", text: `Print job queued: ${result.jobId || "ok"}` });
      fetchQueue();
    } catch (e) {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setPrintingLocation(null);
    }
  }

  const pendingCount = queue.filter((j) => j.status === "PENDING" || j.status === "RETRYING").length;
  const failedCount = queue.filter((j) => j.status === "FAILED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <PrinterIcon />
          Print Test
        </h1>
        <button
          onClick={fetchQueue}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-foreground transition-colors"
        >
          <RefreshIcon />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-border-default bg-white">
          <div className="text-xs text-gray-400 mb-1">Pending</div>
          <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
        </div>
        <div className="p-3 rounded-xl border border-border-default bg-white">
          <div className="text-xs text-gray-400 mb-1">Printed</div>
          <p className="text-2xl font-bold text-emerald-400">{queue.filter((j) => j.status === "PRINTED").length}</p>
        </div>
        <div className="p-3 rounded-xl border border-border-default bg-white">
          <div className="text-xs text-gray-400 mb-1">Failed</div>
          <p className="text-2xl font-bold text-red-400">{failedCount}</p>
        </div>
        <div className="p-3 rounded-xl border border-border-default bg-white">
          <div className="text-xs text-gray-400 mb-1">Total Jobs</div>
          <p className="text-2xl font-bold text-foreground">{queue.length}</p>
        </div>
      </div>

      <div className="bg-white border border-border-default rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Test Receipt Print</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Location:</span>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-black border border-gray-700 text-foreground text-sm focus:outline-none focus:border-brand-gold"
            >
              <option value="utrecht">Utrecht</option>
              <option value="wageningen">Wageningen</option>
            </select>
          </div>
          <button
            onClick={handlePrint}
            disabled={printingLocation !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-red hover:bg-red-700 text-foreground text-sm font-medium transition-colors disabled:opacity-50"
          >
            <PrinterIcon />
            {printingLocation ? "Queuing..." : `Print Test to ${location === "utrecht" ? "Utrecht" : "Wageningen"}`}
          </button>
        </div>
        {message && (
          <div className={`text-sm px-3 py-2 rounded-lg ${message.type === "ok" ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"}`}>
            {message.text}
          </div>
        )}
      </div>

      <div className="bg-white border border-border-default rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-500">Receipt Preview</h2>
          <span className="text-xs text-gray-500">{location === "utrecht" ? "Utrecht" : "Wageningen"}</span>
        </div>
        <pre className="p-4 text-xs text-gray-500 overflow-x-auto whitespace-pre font-mono leading-relaxed">
          {preview}
        </pre>
      </div>

      <div className="bg-white border border-border-default rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border-default">
          <h2 className="text-sm font-medium text-gray-500">Recent Print Jobs</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default text-gray-400 text-left">
              <th className="px-4 py-3 font-medium">Job ID</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Attempts</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {queue.slice(0, 20).map((job) => (
              <tr key={job.id} className="border-b border-border-default last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{job.id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-foreground capitalize">{job.location}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{job.orderNumber || (job.orderId ? job.orderId.slice(0, 8) : "test")}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium border ${
                      job.status === "PRINTED"
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : job.status === "FAILED"
                        ? "text-red-400 bg-red-500/10 border-red-500/20"
                        : job.status === "PENDING"
                        ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
                        : "text-blue-400 bg-blue-500/10 border-blue-500/20"
                    }`}
                  >
                    {job.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">{job.attemptCount}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(job.createdAt).toLocaleTimeString("nl-NL")}
                </td>
                <td className="px-4 py-3 text-right">
                  {job.status === "FAILED" && (
                    <button
                      onClick={async () => {
                        await fetch(`/api/print-queue/${job.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({ status: "PENDING", attemptCount: 0 }),
                        });
                        fetchQueue();
                      }}
                      className="px-2 py-1 rounded text-xs bg-brand-gold/20 text-brand-gold hover:bg-brand-gold/30 transition-colors"
                    >
                      Retry
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {queue.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">No print jobs yet.</div>
        )}
      </div>
    </div>
  );
}

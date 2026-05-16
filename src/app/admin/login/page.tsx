"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="11" width="18" height="11" rx="0" ry="0" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid credentials");
    } else {
      window.location.href = "/admin";
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      {/* Top bar */}
      <header className="w-full border-b border-gray-100">
        <div className="px-6 py-3">
          <span className="text-[13px] tracking-[0.12em] uppercase font-bold text-brand-gold font-mono">
            Xin Chào Admin
          </span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Left spacer */}
        <div className="hidden lg:block lg:w-[45%]" />

        {/* Login form card */}
        <div className="flex-1 flex items-center justify-center lg:justify-start px-6 py-12">
          <div className="w-full max-w-[380px] bg-white border border-white/8 p-8">
            {/* Form header */}
            <div className="flex items-center gap-3 mb-8">
              <LockIcon className="w-7 h-7 text-brand-gold" />
              <h1 className="text-[15px] tracking-[0.1em] uppercase font-bold text-brand-gold font-mono">
                Admin Login
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[12px] text-gray-500 mb-2 tracking-wide uppercase font-mono">
                  Username
                </label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#131313] border border-gray-200 px-3 py-2.5 text-[14px] text-foreground focus:outline-none focus:border-brand-gold transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] text-gray-500 mb-2 tracking-wide uppercase font-mono">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#131313] border border-gray-200 px-3 py-2.5 text-[14px] text-foreground focus:outline-none focus:border-brand-gold transition-colors"
                  required
                />
              </div>

              {error && (
                <p className="text-brand-red text-[13px] font-medium">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-red hover:bg-[#a01830] text-foreground text-[13px] font-bold tracking-[0.08em] uppercase px-4 py-3 transition-colors disabled:opacity-50 font-mono"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

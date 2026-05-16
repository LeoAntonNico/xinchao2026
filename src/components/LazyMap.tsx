"use client";

import { useState } from "react";

interface Props {
  embedUrl: string | null;
  name: string;
  accent: {
    text: string;
    bg: string;
    border: string;
    bar: string;
    hover: string;
    soft: string;
    pin: string;
  };
}

export default function LazyMap({ embedUrl, name, accent }: Props) {
  const [loaded, setLoaded] = useState(false);

  if (!embedUrl) return null;

  if (!loaded) {
    return (
      <button
        onClick={() => setLoaded(true)}
        className="w-full h-[120px] bg-gray-100 border border-gray-200 overflow-hidden relative flex items-center justify-center group cursor-pointer"
      >
        <div className="absolute inset-0 opacity-30">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#DDD6CA" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <circle cx="50%" cy="50%" r="40" fill="#F2EDE3" />
            <circle cx="50%" cy="50%" r="20" fill="#DDD6CA" opacity="0.5" />
          </svg>
        </div>
        <div className="relative z-10 flex flex-col items-center gap-1.5">
          <svg width="28" height="28" viewBox="0 0 24 24" className={accent.pin}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" fill="white" />
          </svg>
          <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${accent.text}`}>
            Load map
          </span>
        </div>
      </button>
    );
  }

  return (
    <div className="w-full h-[120px] bg-gray-100 border border-gray-200 overflow-hidden relative">
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        style={{ border: 0, filter: "grayscale(30%)" }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`Map ${name}`}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg width="32" height="32" viewBox="0 0 24 24" className={accent.pin}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" fill="white" />
        </svg>
      </div>
    </div>
  );
}

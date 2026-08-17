"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AtSign, X } from "lucide-react";

export function UserSearchBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function go(e: React.FormEvent) {
    e.preventDefault();
    const clean = q.trim().replace(/^@+/, "");
    router.push(clean ? `/students?q=${encodeURIComponent(clean)}` : "/students");
  }

  return (
    <form onSubmit={go} className="relative">
      <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search students by @nickname..."
        className="w-full rounded-xl border border-white/10 bg-ink-900 py-2.5 pl-10 pr-9 text-sm outline-none focus:border-accent"
      />
      {q && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => { setQ(""); router.push("/students"); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-dim hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}

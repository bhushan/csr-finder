"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const nav = [
  { href: "/", label: "This week" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/digests", label: "Archive" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/settings", label: "Settings" },
];

export function NavLinks() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      <nav className="ml-auto hidden items-center gap-1 text-sm md:flex" aria-label="Main">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active(n.href) ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 transition-colors ${active(n.href) ? "bg-bg font-medium text-ink" : "text-muted hover:text-ink"}`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <button
        className="ml-auto rounded-md border border-line px-3 py-1.5 text-sm md:hidden"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen(!open)}
      >
        Menu
      </button>
      {open && (
        <nav id="mobile-nav" aria-label="Main" className="absolute inset-x-0 top-14 border-b border-line bg-surface px-4 py-2 shadow-card md:hidden">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              aria-current={active(n.href) ? "page" : undefined}
              className={`block rounded-md px-3 py-2.5 ${active(n.href) ? "bg-bg font-medium" : "text-ink-2"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}

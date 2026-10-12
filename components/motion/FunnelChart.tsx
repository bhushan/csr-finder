"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { countUp, prefersReducedMotion } from "@/lib/motion";

type Step = { n: number; label: string };

/** Funnel from raw news to calls; bars draw and numbers count when it scrolls into view. */
export function FunnelChart({ steps }: { steps: Step[] }) {
  const root = useRef<HTMLElement>(null);
  const max = Math.max(steps[0]?.n ?? 1, 1);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const bars = el.querySelectorAll("[data-funnel-bar]");
    const nums = el.querySelectorAll("[data-count]");
    if (prefersReducedMotion()) return;
    const play = () => {
      gsap.fromTo(bars, { scaleX: 0 }, { scaleX: 1, duration: 1, stagger: 0.12, ease: "power3.out" });
      nums.forEach((n, i) => countUp(n, { duration: 1, delay: i * 0.12 }));
    };
    // Already on screen at load: play now. Otherwise wait until it scrolls into view.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.85) {
      play();
      return;
    }
    gsap.set(bars, { scaleX: 0 });
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        play();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <figure ref={root} className="mt-10 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <figcaption className="text-[15px] font-semibold">The latest run, from raw news to a call list</figcaption>
      <ol className="mt-5 space-y-3">
        {steps.map((s, i) => (
          <li key={s.label} className="grid grid-cols-[4rem_1fr] items-center gap-4 sm:grid-cols-[4.5rem_1fr_16rem]">
            <span data-count={s.n} className="text-right text-[22px] font-semibold tracking-tight tabular-nums">{s.n}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-line">
              <span
                data-funnel-bar
                className={`block h-full origin-left rounded-full ${i === steps.length - 1 ? "bg-hot" : "bg-cold"}`}
                style={{ width: `${Math.max((s.n / max) * 100, 1.5)}%` }}
              />
            </span>
            <span className="col-start-2 text-[13px] text-muted sm:col-start-auto">{s.label}</span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

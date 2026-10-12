"use client";

import gsap from "gsap";
import { useRef, type MouseEvent, type ReactNode } from "react";
import { countUp, prefersReducedMotion } from "@/lib/motion";

/** A <details> that opens and closes with a height animation instead of snapping. */
export function SmoothDetails({
  summary, children, id, className, summaryClassName, countOnOpen = false,
}: {
  summary: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
  summaryClassName?: string;
  /** Count up any [data-count] numbers inside when opened. */
  countOnOpen?: boolean;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  function toggle(e: MouseEvent) {
    e.preventDefault();
    const d = details.current;
    const p = panel.current;
    if (!d || !p || busy.current) return;
    if (prefersReducedMotion()) {
      d.open = !d.open;
      return;
    }
    busy.current = true;
    if (!d.open) {
      d.open = true;
      gsap.fromTo(
        p,
        { height: 0, autoAlpha: 0 },
        {
          height: "auto", autoAlpha: 1, duration: 0.38, ease: "power2.out",
          onComplete: () => {
            busy.current = false;
            gsap.set(p, { clearProps: "height" });
          },
        },
      );
      if (countOnOpen) p.querySelectorAll("[data-count]").forEach((el, i) => countUp(el, { duration: 0.7, delay: 0.1 + i * 0.03 }));
    } else {
      gsap.to(p, {
        height: 0, autoAlpha: 0, duration: 0.26, ease: "power2.in",
        onComplete: () => {
          d.open = false;
          busy.current = false;
          gsap.set(p, { clearProps: "all" });
        },
      });
    }
  }

  return (
    <details ref={details} id={id} className={className}>
      <summary onClick={toggle} className={summaryClassName}>
        {summary}
      </summary>
      <div ref={panel} className="overflow-hidden">
        {children}
      </div>
    </details>
  );
}

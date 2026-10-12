"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { countUp, prefersReducedMotion } from "@/lib/motion";

/**
 * The page's one orchestrated moment: headline settles, the call sheet deals in row by row,
 * warmth bars fill and scores count up. Elements opt in with data-anim / data-bar / data-count.
 */
export function BriefingIntro({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = scope.current;
    if (!root) return;
    let safety = 0;
    const ctx = gsap.context(() => {
      if (prefersReducedMotion()) {
        gsap.set("[data-anim]", { autoAlpha: 1 });
        gsap.set("[data-bar]", { scaleX: 1 });
        return;
      }
      const q = gsap.utils.selector(root);
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(q('[data-anim="eyebrow"]'), { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.4 })
        .fromTo(q('[data-anim="hero"]'), { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.9 }, "-=0.2")
        .fromTo(q('[data-anim="deck"]'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.6 }, "-=0.6")
        .fromTo(q('[data-anim="sheet"]'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.6 }, "-=0.55")
        .fromTo(q('[data-anim="row"]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.07 }, "-=0.3")
        .fromTo(q("[data-bar]"), { scaleX: 0 }, { scaleX: 1, duration: 0.8, stagger: 0.07, ease: "power2.out" }, "<")
        .add(() => q("[data-count]").forEach((el, i) => countUp(el, { delay: i * 0.05 })), "<")
        .fromTo(q('[data-anim="bullets"] li'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.06 }, "-=0.6")
        .fromTo(q('[data-anim="rest"]'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6 }, "-=0.35");
      // bullets' parent was pre-hidden by CSS; reveal it as the items animate
      gsap.set(q('[data-anim="bullets"]'), { autoAlpha: 1 });
      // Safety net: content must never stay hidden, whatever happens to the frame clock.
      safety = window.setTimeout(() => tl.progress(1), 3000);
    }, root);
    return () => {
      window.clearTimeout(safety);
      ctx.revert();
    };
  }, []);

  return <div ref={scope}>{children}</div>;
}

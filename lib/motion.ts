import gsap from "gsap";

// Never stretch animations when frames are late (background tabs, slow devices): finish on time instead.
gsap.ticker.lagSmoothing(0);

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Count an element's number up from 0 to its final value (read from data-count). */
export function countUp(el: Element, opts: { duration?: number; delay?: number } = {}) {
  const to = Number((el as HTMLElement).dataset.count ?? el.textContent ?? 0);
  if (!Number.isFinite(to)) return;
  const state = { v: 0 };
  el.textContent = "0";
  return gsap.to(state, {
    v: to,
    duration: opts.duration ?? 0.9,
    delay: opts.delay ?? 0,
    ease: "power2.out",
    onUpdate: () => {
      el.textContent = String(Math.round(state.v));
    },
  });
}

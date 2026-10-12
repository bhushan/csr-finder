/** Brand mark: concentric range rings with a slow sweep, the one ambient motion on the site. */
export function RadarMark({ size = 22, animated = false }: { size?: number; animated?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="var(--line-strong)" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="var(--line-strong)" strokeWidth="1.2" />
      <g className={animated ? "radar-sweep" : undefined}>
        <path d="M12 12 L12 1.5 A10.5 10.5 0 0 1 21.1 6.75 Z" fill="var(--hot)" opacity="0.22" />
        <line x1="12" y1="12" x2="12" y2="1.5" stroke="var(--hot)" strokeWidth="1.4" strokeLinecap="round" />
      </g>
      <circle cx="16.2" cy="7.4" r="1.6" fill="var(--hot)" />
      <circle cx="12" cy="12" r="1.3" fill="var(--ink)" />
    </svg>
  );
}

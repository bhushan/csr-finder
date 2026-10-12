import { ImageResponse } from "next/og";

export const alt = "CSR Partnership Radar: who to call this week about education and skilling CSR";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const rows = [
  { name: "Partner search, Mumbai", w: 90, c: "#dc4a4a" },
  { name: "New skilling initiative", w: 66, c: "#d98a26" },
  { name: "Digital literacy programme", w: 59, c: "#d98a26" },
  { name: "Bigger CSR allocation", w: 38, c: "#7c9cc6" },
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f5f6f8", padding: 72, fontFamily: "sans-serif", color: "#131a29" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 600 }}>
            <div style={{ width: 34, height: 34, borderRadius: 34, border: "3px solid #d3d8e0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 10, height: 10, borderRadius: 10, background: "#dc4a4a" }} />
            </div>
            CSR Partnership Radar
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2, maxWidth: 560 }}>Who to call this week.</div>
            <div style={{ fontSize: 26, color: "#3a4456", maxWidth: 540, lineHeight: 1.4 }}>
              A Monday briefing on education and skilling CSR, read by Gemini Flash from live Indian news.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 18, width: 440, background: "#fff", borderRadius: 28, padding: 36, border: "1px solid #e4e7ed" }}>
          <div style={{ fontSize: 22, fontWeight: 600 }}>Call sheet</div>
          {rows.map((r) => (
            <div key={r.name} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20 }}>
                <span>{r.name}</span>
                <span style={{ color: r.c, fontWeight: 700 }}>{r.w}</span>
              </div>
              <div style={{ display: "flex", height: 10, background: "#e4e7ed", borderRadius: 10 }}>
                <div style={{ width: `${r.w}%`, background: r.c, borderRadius: 10 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}

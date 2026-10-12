import type { Digest, DigestItem } from "@/lib/types";
import { formatWeek } from "@/lib/week";
import { groupItems, SIGNAL_LABEL } from "@/lib/digest-view";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const C = { ink: "#131a29", muted: "#6b7486", line: "#e4e7ed", accent: "#3f44d6", warm: "#b8701a", bg: "#f5f6f8" };

function itemHtml(item: DigestItem) {
  const meta = [SIGNAL_LABEL[item.signalType], item.geography, item.amount].filter(Boolean).map(esc).join(" · ");
  const sources = item.sources
    .slice(0, 3)
    .map((s) => `<a href="${esc(s.url)}" style="color:${C.accent}">${esc(s.source)}</a>`)
    .join(" · ");
  return `<tr><td style="padding:16px 0;border-top:1px solid ${C.line}">
<div style="font-size:12px;color:${C.muted};text-transform:uppercase;letter-spacing:.04em">${esc(item.company || "")}${item.company ? " · " : ""}warmth ${item.warmth}/100</div>
<div style="font-size:17px;font-weight:600;color:${C.ink};margin:4px 0 6px">${esc(item.headline)}</div>
<div style="font-size:12px;color:${C.muted};margin-bottom:8px">${meta}</div>
<div style="font-size:14px;color:${C.ink};line-height:1.55">${esc(item.whatHappened)}</div>
<div style="font-size:14px;color:${C.ink};line-height:1.55;margin-top:6px"><strong>Why it matters:</strong> ${esc(item.whyItMatters)}</div>
${item.suggestedAngle ? `<div style="font-size:14px;color:${C.ink};line-height:1.55;margin-top:6px"><strong>Opening angle:</strong> ${esc(item.suggestedAngle)}</div>` : ""}
${item.trackRecord ? `<div style="font-size:13px;color:${C.muted};margin-top:6px">CSR track record: ${esc(item.trackRecord)}</div>` : ""}
${item.history?.length ? `<div style="font-size:13px;color:${C.warm};margin-top:6px">Warming up: also in ${item.history.length} earlier briefing${item.history.length === 1 ? "" : "s"}</div>` : ""}
${item.contactHint ? `<div style="font-size:13px;color:${C.muted};margin-top:6px">Who to approach: ${esc(item.contactHint)}</div>` : ""}
<div style="font-size:12px;color:${C.muted};margin-top:8px">${item.verified ? "Web-verified · " : "Headline only, not verified · "}${sources}</div>
</td></tr>`;
}

function section(title: string, note: string, items: DigestItem[], color: string) {
  if (!items.length) return "";
  return `<tr><td style="padding:28px 0 4px"><div style="font-size:13px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.06em">${esc(title)} (${items.length})</div><div style="font-size:13px;color:${C.muted}">${esc(note)}</div></td></tr>${items.map(itemHtml).join("")}`;
}

function itemText(i: DigestItem) {
  return `• ${i.headline}\n  ${i.company} · ${SIGNAL_LABEL[i.signalType]} · ${i.geography}\n  ${i.whatHappened}\n  Why it matters: ${i.whyItMatters}\n  ${i.sources[0]?.url ?? ""}`;
}

export function renderDigestEmail(digest: Digest, appUrl: string) {
  const { calls, watch, policy } = groupItems(digest.items);
  const week = formatWeek(digest.weekOf);
  const link = `${appUrl.replace(/\/$/, "")}/digests/${digest.id}`;
  const subject = `CSR Radar, week of ${week}: ${calls.length} call${calls.length === 1 ? "" : "s"} this week`;
  const c = digest.coverage;

  const html = `<!doctype html><html><body style="margin:0;background:${C.bg};font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border:1px solid ${C.line};border-radius:10px;padding:28px">
<tr><td>
<div style="font-size:12px;color:${C.muted};letter-spacing:.06em;text-transform:uppercase">CSR Partnership Radar · Week of ${esc(week)}</div>
<h1 style="font-size:22px;line-height:1.3;color:${C.ink};margin:8px 0 12px">${esc(digest.summary.headline)}</h1>
<ul style="padding-left:18px;margin:0;color:${C.ink};font-size:14px;line-height:1.6">${digest.summary.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
<p style="margin:18px 0 0"><a href="${esc(link)}" style="display:inline-block;background:${C.accent};color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-size:14px">Open the full digest</a></p>
</td></tr>
${section("Call this week", "Active budget or partner search that fits your programmes.", calls, C.accent)}
${section("Watch", "Relevant, not yet actionable.", watch, C.warm)}
${section("Policy & regulatory", "Changes in how companies can deploy CSR funds.", policy, C.muted)}
<tr><td style="padding-top:24px;border-top:1px solid ${C.line};font-size:12px;color:${C.muted};line-height:1.5">
Coverage: ${c.queries} searches, ${c.unique} unique articles from the last 7 days, ${c.relevant} relevant, ${c.distilled} analysed with ${esc(c.model)}.${c.feedFailures.length ? ` ${c.feedFailures.length} feed requests failed and were skipped.` : ""}
</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    `CSR Partnership Radar, week of ${week}`,
    digest.summary.headline,
    ...digest.summary.bullets.map((b) => `- ${b}`),
    "",
    calls.length ? `CALL THIS WEEK\n${calls.map(itemText).join("\n\n")}` : "",
    watch.length ? `WATCH\n${watch.map(itemText).join("\n\n")}` : "",
    policy.length ? `POLICY & REGULATORY\n${policy.map(itemText).join("\n\n")}` : "",
    `Full digest: ${link}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { subject, html, text };
}

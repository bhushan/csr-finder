"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { groupItems, SIGNAL_LABEL } from "@/lib/digest-view";
import { LEAD_LABEL, LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/leads";
import type { DigestItem, SignalType } from "@/lib/types";
import { formatWeek } from "@/lib/week";
import { TEMP_CLASS, TEMP_LABEL, tempOf } from "@/lib/warmth";

type Tab = "calls" | "watch" | "policy" | "skipped";
type Draft = { subject: string; body: string };

const SIGNAL_STYLE: Record<SignalType, string> = {
  partner_search: "bg-hot-soft text-hot",
  new_initiative: "bg-brand-soft text-brand",
  increased_allocation: "bg-ok-soft text-ok",
  policy_change: "bg-policy-soft text-policy",
  other: "bg-bg text-muted",
};

const STATUS_STYLE: Record<LeadStatus, string> = {
  new: "text-muted",
  to_call: "text-brand",
  contacted: "text-warm",
  meeting: "text-ok",
  not_a_fit: "text-muted line-through",
};

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

function WarmingBadge({ item }: { item: DigestItem }) {
  const history = item.history ?? [];
  if (!history.length) return null;
  const weeks = new Set(history.map((h) => h.weekOf)).size;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-warm-soft px-2 py-0.5 text-xs font-medium text-warm"
      title={history.map((h) => `Week of ${formatWeek(h.weekOf)}: ${h.headline}`).join("\n")}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
        <path d="M1 8 L4 5 L6 6.5 L9 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Warming up, {weeks + 1} weeks in a row
    </span>
  );
}

function Meta({ item }: { item: DigestItem }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px]">
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SIGNAL_STYLE[item.signalType]}`}>{SIGNAL_LABEL[item.signalType]}</span>
      {item.geography && (
        <span className="text-ink-2">
          {item.geography}
          {item.geoTier === 1 && <span className="text-muted"> (home region)</span>}
        </span>
      )}
      <WarmingBadge item={item} />
    </div>
  );
}

function Body({ item }: { item: DigestItem }) {
  return (
    <>
      {(item.amount || item.trackRecord) && (
        <dl className="mt-4 grid gap-3 rounded-xl bg-raised p-4 text-sm sm:grid-cols-2">
          {item.amount && (
            <div>
              <dt className="text-muted">Committed this time</dt>
              <dd className="mt-0.5 font-medium">{item.amount}</dd>
            </div>
          )}
          {item.trackRecord && (
            <div>
              <dt className="text-muted">CSR track record</dt>
              <dd className="mt-0.5 font-medium">{item.trackRecord}</dd>
            </div>
          )}
        </dl>
      )}
      <p className="mt-4 max-w-[70ch] text-[15px] leading-relaxed text-ink-2">{item.whatHappened}</p>
      <div className="mt-4 max-w-[70ch]">
        <h4 className="text-sm font-semibold">Why it matters to you</h4>
        <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{item.whyItMatters}</p>
      </div>
      {item.suggestedAngle && (
        <div className="mt-4 max-w-[70ch] border-l-2 border-brand pl-4">
          <h4 className="text-sm font-semibold">How to open the conversation</h4>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{item.suggestedAngle}</p>
          {item.contactHint && <p className="mt-2 text-sm text-muted">Who to approach: {item.contactHint}</p>}
        </div>
      )}
      <div className="mt-5 text-[13px] text-muted">
        <p className={item.verified ? "text-ok" : ""}>
          {item.verified ? "Checked against Google Search results" : "Summarised from headlines only; open the source before calling"}
        </p>
        <ul className="mt-2 space-y-1">
          {item.sources.slice(0, 4).map((s) => (
            <li key={s.url} className="truncate">
              <a href={s.url} target="_blank" rel="noreferrer" className="text-ink-2 underline decoration-line-strong underline-offset-2 hover:decoration-ink">
                {s.title}
              </a>
              <span>, {s.source}, {shortDate(s.publishedAt)}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function Actions({
  lead, admin, onStatus, onDraft,
}: { lead?: Lead; admin: boolean; onStatus: (s: LeadStatus) => void; onDraft: () => void }) {
  const status = lead?.status ?? "new";
  if (!admin) {
    return status !== "new" ? <p className={`mt-5 text-sm font-medium ${STATUS_STYLE[status]}`}>{LEAD_LABEL[status]}</p> : null;
  }
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-4">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted">Status</span>
        <select
          value={status}
          onChange={(e) => onStatus(e.target.value as LeadStatus)}
          className={`rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm font-medium ${STATUS_STYLE[status]}`}
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>{LEAD_LABEL[s]}</option>
          ))}
        </select>
      </label>
      <button onClick={onDraft} className="rounded-lg bg-brand px-3.5 py-1.5 text-sm font-medium text-brand-ink transition-opacity hover:opacity-90">
        {lead?.draft ? "Open draft email" : "Draft outreach email"}
      </button>
    </div>
  );
}

function WarmthRail({ warmth }: { warmth: number }) {
  const temp = tempOf(warmth);
  const t = TEMP_CLASS[temp];
  return (
    <div className="flex items-center gap-3 px-5 pt-5 sm:flex-col sm:items-center sm:justify-start sm:gap-2 sm:border-r sm:border-line sm:bg-raised sm:px-0 sm:py-6">
      <span className={`text-[28px] font-semibold leading-none tracking-tight tabular-nums ${t.text}`}>{warmth}</span>
      <span className={`text-xs font-medium ${t.text}`}>{TEMP_LABEL[temp]}</span>
      <span className="relative ml-auto h-1.5 w-24 overflow-hidden rounded-full bg-line sm:hidden" aria-hidden>
        <span className={`absolute inset-y-0 left-0 rounded-full ${t.bg}`} style={{ width: `${warmth}%` }} />
      </span>
      <span className="relative mt-2 hidden h-24 w-1.5 overflow-hidden rounded-full bg-line sm:block" aria-hidden>
        <span className={`absolute inset-x-0 bottom-0 rounded-full ${t.bg}`} style={{ height: `${warmth}%` }} />
      </span>
    </div>
  );
}

export function LeadBoard({ digestId, items, initialLeads, admin }: { digestId: string; items: DigestItem[]; initialLeads: Record<string, Lead>; admin: boolean }) {
  const groups = useMemo(() => groupItems(items), [items]);
  const tabs: { id: Tab; label: string; items: DigestItem[] }[] = [
    { id: "calls", label: "Call this week", items: groups.calls },
    { id: "watch", label: "Watch", items: groups.watch },
    { id: "policy", label: "Policy", items: groups.policy },
    { id: "skipped", label: "Skipped", items: groups.skipped },
  ];
  const [tab, setTab] = useState<Tab>(groups.calls.length ? "calls" : "watch");
  const [sector, setSector] = useState<string | null>(null);
  const [leads, setLeads] = useState(initialLeads);
  const [error, setError] = useState<string | null>(null);

  const dialog = useRef<HTMLDialogElement>(null);
  const [draftFor, setDraftFor] = useState<DigestItem | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [copied, setCopied] = useState(false);

  const current = tabs.find((t) => t.id === tab)!;
  const sectors = [...new Set(current.items.flatMap((i) => i.sectors))].sort();
  const visible = sector ? current.items.filter((i) => i.sectors.includes(sector)) : current.items;

  async function setStatus(item: DigestItem, status: LeadStatus) {
    const prev = leads[item.id];
    setLeads({ ...leads, [item.id]: { ...(prev ?? { itemId: item.id, digestId, company: item.company, note: "", draft: null, updatedAt: "" }), status } });
    const res = await fetch(`/api/leads/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ digestId, company: item.company, status }),
    });
    if (!res.ok) {
      setLeads((l) => ({ ...l, [item.id]: prev }));
      setError("That status change didn't save. Your session may have expired; sign in on Settings and try again.");
    }
  }

  async function openDraft(item: DigestItem, regenerate = false) {
    setDraftFor(item);
    setCopied(false);
    setError(null);
    const cached = leads[item.id]?.draft;
    if (cached && !regenerate) {
      setDraft(cached);
    } else {
      setDraft(null);
      setDrafting(true);
    }
    if (!dialog.current?.open) dialog.current?.showModal();
    if (cached && !regenerate) return;
    try {
      const res = await fetch(`/api/leads/${item.id}/draft`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ digestId, regenerate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDraft({ subject: data.subject, body: data.body });
      setLeads((l) => ({ ...l, [item.id]: { ...(l[item.id] ?? { itemId: item.id, digestId, company: item.company, status: "new", note: "", updatedAt: "" }), draft: data } }));
    } catch (err) {
      setError((err as Error).message || "Gemini couldn't draft this one right now. Try again in a moment.");
    } finally {
      setDrafting(false);
    }
  }

  async function copyDraft() {
    if (!draft) return;
    await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
    setCopied(true);
  }

  return (
    <section className="mt-12" aria-label="Developments">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line">
        <div role="tablist" aria-label="Decision" className="-mb-px flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => { setTab(t.id); setSector(null); }}
              className={`whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-[15px] transition-colors ${tab === t.id ? "border-ink font-semibold text-ink" : "border-transparent text-muted hover:text-ink"}`}
            >
              {t.label} <span className={`ml-1 text-sm ${tab === t.id ? "text-ink-2" : "text-muted"}`}>{t.items.length}</span>
            </button>
          ))}
        </div>
        {!admin && (
          <Link href="/settings" className="pb-3 text-sm text-muted hover:text-ink">Sign in to track leads and draft emails</Link>
        )}
      </div>

      {sectors.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter by sector">
          {[null, ...sectors].map((s) => (
            <button
              key={s ?? "all"}
              onClick={() => setSector(s)}
              aria-pressed={sector === s}
              className={`rounded-full border px-3 py-1 text-[13px] transition-colors ${sector === s ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink-2 hover:border-line-strong"}`}
            >
              {s ?? "All sectors"}
            </button>
          ))}
        </div>
      )}

      {error && <p role="alert" className="mt-4 rounded-lg bg-hot-soft px-4 py-3 text-sm text-hot">{error}</p>}

      <div className="mt-6 space-y-4" role="tabpanel">
        {visible.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center text-muted">
            {tab === "calls"
              ? "Nothing urgent this week. Check Watch for early signals worth a note."
              : "Nothing in this group this week."}
          </p>
        )}

        {tab === "calls" &&
          visible.map((item) => (
            <article key={item.id} id={`lead-${item.id}`} className="scroll-mt-20 overflow-hidden rounded-2xl border border-line bg-surface shadow-card sm:grid sm:grid-cols-[88px_1fr]">
              <WarmthRail warmth={item.warmth} />
              <div className="min-w-0 p-5 sm:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="text-[15px] font-semibold">{item.company}</p>
                  <Meta item={item} />
                </div>
                <h3 className="mt-2 text-[20px] font-semibold leading-snug tracking-[-0.01em]">{item.headline}</h3>
                <Body item={item} />
                <Actions lead={leads[item.id]} admin={admin} onStatus={(s) => setStatus(item, s)} onDraft={() => openDraft(item)} />
              </div>
            </article>
          ))}

        {tab !== "calls" &&
          visible.map((item) => {
            const t = TEMP_CLASS[tempOf(item.warmth)];
            return (
              <details
                key={item.id}
                id={`lead-${item.id}`}
                className={`group scroll-mt-20 rounded-xl border border-line bg-surface ${item.signalType === "policy_change" ? "border-l-[3px] border-l-policy" : ""}`}
              >
                <summary className="flex cursor-pointer list-none items-start gap-4 px-5 py-4">
                  <span className={`mt-0.5 w-8 shrink-0 text-right text-[15px] font-semibold tabular-nums ${t.text}`} title="Warmth">{item.warmth}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-muted">
                      {item.company}
                      {item.geography && `, ${item.geography}`}
                    </span>
                    <span className="mt-0.5 block font-medium leading-snug">{item.headline}</span>
                  </span>
                  <span aria-hidden className="mt-1 text-muted transition-transform group-open:rotate-180">
                    <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </summary>
                <div className="border-t border-line px-5 pb-5 pt-4 sm:pl-[4.25rem]">
                  <Meta item={item} />
                  <Body item={item} />
                  <Actions lead={leads[item.id]} admin={admin} onStatus={(s) => setStatus(item, s)} onDraft={() => openDraft(item)} />
                </div>
              </details>
            );
          })}
      </div>

      <dialog
        ref={dialog}
        onClose={() => setDraftFor(null)}
        className="m-auto w-[min(640px,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-card"
      >
        {draftFor && (
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Outreach email to {draftFor.company}</h2>
                <p className="mt-1 text-sm text-muted">Drafted by Gemini from this lead and your profile. Fill the [placeholders] before sending.</p>
              </div>
              <button onClick={() => dialog.current?.close()} className="rounded-md px-2 py-1 text-muted hover:bg-bg hover:text-ink" aria-label="Close">
                Close
              </button>
            </div>
            {drafting && (
              <div className="mt-6 space-y-3" aria-busy>
                <p className="text-sm text-muted">Writing a first draft…</p>
                <div className="h-4 w-2/3 animate-pulse rounded bg-line" />
                <div className="h-24 animate-pulse rounded bg-line" />
              </div>
            )}
            {draft && !drafting && (
              <div className="mt-5 space-y-3">
                <label className="block text-sm">
                  <span className="text-muted">Subject</span>
                  <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} className="mt-1 w-full rounded-lg border border-line bg-raised px-3 py-2 font-medium" />
                </label>
                <label className="block text-sm">
                  <span className="text-muted">Message</span>
                  <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={12} className="mt-1 w-full rounded-lg border border-line bg-raised px-3 py-2 leading-relaxed" />
                </label>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button onClick={copyDraft} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-ink">{copied ? "Copied" : "Copy email"}</button>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`}
                    className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:border-line-strong"
                  >
                    Open in mail app
                  </a>
                  <button onClick={() => openDraft(draftFor, true)} className="text-sm text-muted underline underline-offset-2 hover:text-ink">Write a new version</button>
                </div>
              </div>
            )}
            {error && !drafting && <p role="alert" className="mt-4 text-sm text-hot">{error}</p>}
          </div>
        )}
      </dialog>
    </section>
  );
}

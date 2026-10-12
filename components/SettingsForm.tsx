"use client";

import { useActionState, useState } from "react";
import { updateSettings, type ActionState } from "@/app/settings/actions";
import type { Settings } from "@/lib/settings";

const splitList = (s: string) =>
  s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);

const input = "w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm";
const label = "block text-sm font-medium";

export function SettingsForm({ initial }: { initial: Settings }) {
  const [s, setS] = useState(initial);
  const [sectorText, setSectorText] = useState(initial.sectors.map((x) => x.keywords.join(", ")));
  const [state, action, pending] = useActionState<ActionState, FormData>(updateSettings, {});

  const payload: Settings = {
    ...s,
    sectors: s.sectors.map((x, i) => ({ ...x, keywords: splitList(sectorText[i] ?? "") })),
  };

  return (
    <form action={action} className="space-y-8 rounded-2xl border border-line bg-surface p-6 shadow-card">
      <input type="hidden" name="settings" value={JSON.stringify(payload)} />

      <fieldset className="space-y-3">
        <legend className="text-base font-semibold">Your organisation</legend>
        <div>
          <label className={label} htmlFor="orgName">Name</label>
          <input id="orgName" className={input} value={s.orgName} onChange={(e) => setS({ ...s, orgName: e.target.value })} />
        </div>
        <div>
          <label className={label} htmlFor="orgProfile">Profile</label>
          <p className="text-xs text-muted">Gemini uses this to judge fit and draft the opening angle. Mention programmes, beneficiaries, track record.</p>
          <textarea id="orgProfile" rows={4} className={input} value={s.orgProfile} onChange={(e) => setS({ ...s, orgProfile: e.target.value })} />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-base font-semibold">Focus sectors</legend>
        <p className="text-xs text-muted">Each sector becomes searches for new initiatives, partner calls and bigger CSR allocations. Keywords are comma-separated.</p>
        {s.sectors.map((sector, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
            <input aria-label="Sector name" className={input} value={sector.name}
              onChange={(e) => setS({ ...s, sectors: s.sectors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
            <input aria-label="Keywords" className={input} value={sectorText[i] ?? ""}
              onChange={(e) => setSectorText(sectorText.map((t, j) => (j === i ? e.target.value : t)))} />
            <button type="button" className="text-sm text-muted hover:text-hot" disabled={s.sectors.length <= 1}
              onClick={() => { setS({ ...s, sectors: s.sectors.filter((_, j) => j !== i) }); setSectorText(sectorText.filter((_, j) => j !== i)); }}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="text-sm text-brand" onClick={() => { setS({ ...s, sectors: [...s.sectors, { name: "New sector", keywords: [] }] }); setSectorText([...sectorText, ""]); }}>
          + Add sector
        </button>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-base font-semibold">Geographic priorities</legend>
        <p className="text-xs text-muted">Tier 1 is home turf and ranks highest. Tier 1 and 2 places also get their own searches.</p>
        {s.geographies.map((g, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2">
            <input aria-label="Place" className={input} value={g.name}
              onChange={(e) => setS({ ...s, geographies: s.geographies.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
            <select aria-label="Tier" className={input} value={g.tier}
              onChange={(e) => setS({ ...s, geographies: s.geographies.map((x, j) => (j === i ? { ...x, tier: Number(e.target.value) as 1 | 2 | 3 } : x)) })}>
              <option value={1}>Tier 1 · home</option>
              <option value={2}>Tier 2 · expanding</option>
              <option value={3}>Tier 3 · national</option>
            </select>
            <button type="button" className="text-sm text-muted hover:text-hot" disabled={s.geographies.length <= 1}
              onClick={() => setS({ ...s, geographies: s.geographies.filter((_, j) => j !== i) })}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="text-sm text-brand" onClick={() => setS({ ...s, geographies: [...s.geographies, { name: "", tier: 2 }] })}>
          + Add place
        </button>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-base font-semibold">Delivery and filters</legend>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="recipients">Email recipients</label>
          <p className="text-xs text-muted">Comma or newline separated. The digest goes out every Monday at 7:30 IST.</p>
          <textarea id="recipients" rows={2} className={input} defaultValue={s.recipients.join(", ")}
            onChange={(e) => setS({ ...s, recipients: splitList(e.target.value) })} />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="excluded">Companies to exclude</label>
          <p className="text-xs text-muted">Existing partners or companies you have ruled out.</p>
          <input id="excluded" className={input} defaultValue={s.excludedCompanies.join(", ")}
            onChange={(e) => setS({ ...s, excludedCompanies: splitList(e.target.value) })} />
        </div>
        <div>
          <label className={label} htmlFor="lookback">Look-back window (days)</label>
          <input id="lookback" type="number" min={1} max={14} className={input} value={s.lookbackDays}
            onChange={(e) => setS({ ...s, lookbackDays: Number(e.target.value) })} />
        </div>
        <div>
          <label className={label} htmlFor="maxItems">Max developments per digest</label>
          <input id="maxItems" type="number" min={5} max={40} className={input} value={s.maxItems}
            onChange={(e) => setS({ ...s, maxItems: Number(e.target.value) })} />
        </div>
      </fieldset>

      <div className="flex items-center gap-4">
        <button disabled={pending} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-ink disabled:opacity-60">
          {pending ? "Saving…" : "Save settings"}
        </button>
        {state.ok && !pending && <span role="status" className="text-sm text-brand">Saved. The next run will use these.</span>}
        {state.error && <span role="alert" className="text-sm text-hot">{state.error}</span>}
      </div>
    </form>
  );
}

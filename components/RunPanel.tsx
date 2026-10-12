"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type RunSummary = { id: string; trigger: string; status: string; message: string; startedAt: string; digestId: string | null };
type RunDetail = RunSummary & { step: string; progress: number; error: string | null; log: { at: string; step: string; message: string }[] };

export function RunPanel({ recipients, recent }: { recipients: string[]; recent: RunSummary[] }) {
  const router = useRouter();
  const running = recent.find((r) => r.status === "running");
  const [runId, setRunId] = useState<string | null>(running?.id ?? null);
  const [run, setRun] = useState<RunDetail | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!runId) return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/runs/${runId}`, { cache: "no-store" });
        if (res.ok) {
          const data: RunDetail = await res.json();
          if (stop) return;
          setRun(data);
          if (data.status !== "running") {
            router.refresh();
            return;
          }
        }
      } catch {
        // transient network blip; keep polling
      }
      if (!stop) setTimeout(tick, 2000);
    };
    tick();
    return () => {
      stop = true;
    };
  }, [runId, router]);

  async function start() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sendEmail }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setRun(null);
      setRunId(data.runId);
      if (data.alreadyRunning) setNotice({ tone: "ok", text: "A run was already in progress, showing it below." });
    } catch (err) {
      setNotice({ tone: "error", text: `Couldn't start the run: ${(err as Error).message}. Try again in a minute.` });
    } finally {
      setBusy(false);
    }
  }

  async function testEmail() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/test-email", { method: "POST" });
      const data = await res.json();
      setNotice(res.ok ? { tone: "ok", text: data.message } : { tone: "error", text: data.error });
    } finally {
      setBusy(false);
    }
  }

  const active = run?.status === "running" || (runId && !run);

  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <h2 className="text-base font-semibold">Run the digest now</h2>
      <p className="mt-1 text-sm text-muted">
        Runs automatically every Monday at 7:30 IST. A manual run takes 1 to 3 minutes and replaces this week&apos;s digest.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button onClick={start} disabled={busy || !!active} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {active ? "Running…" : "Run digest now"}
        </button>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
          Email it to {recipients.length ? recipients.join(", ") : "recipients (none set yet)"}
        </label>
        <button onClick={testEmail} disabled={busy} className="text-sm text-accent underline underline-offset-2 disabled:opacity-60">
          Send latest digest as a test email
        </button>
      </div>

      {notice && (
        <p role="status" className={`mt-3 text-sm ${notice.tone === "error" ? "text-danger" : "text-accent"}`}>{notice.text}</p>
      )}

      {run && (
        <div className="mt-5" aria-live="polite">
          <div className="flex justify-between text-sm">
            <span>{run.message}</span>
            <span className="font-mono text-muted">{run.progress}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className={`h-full transition-all ${run.status === "failed" ? "bg-danger" : "bg-accent"}`}
              style={{ width: `${run.status === "failed" ? 100 : run.progress}%` }}
            />
          </div>
          {run.status === "succeeded" && run.digestId && (
            <Link href={`/digests/${run.digestId}`} className="mt-3 inline-block text-sm font-medium text-accent">
              Open the new digest →
            </Link>
          )}
          {run.status === "failed" && (
            <p className="mt-3 text-sm text-danger">
              The run stopped: {run.error}. Nothing was lost; the previous digest is still live. Check the API keys in Vercel and run again.
            </p>
          )}
          <details className="mt-3 text-xs text-muted">
            <summary className="cursor-pointer">Run log ({run.log.length} steps)</summary>
            <ol className="mt-2 space-y-0.5 font-mono">
              {run.log.map((l, i) => (
                <li key={i}>
                  {new Date(l.at).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} {l.step}: {l.message}
                </li>
              ))}
            </ol>
          </details>
        </div>
      )}

      {recent.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <h3 className="text-sm font-medium">Recent runs</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {recent.map((r) => (
              <li key={r.id}>
                {new Date(r.startedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })} ·{" "}
                {r.trigger} · <span className={r.status === "failed" ? "text-danger" : ""}>{r.status}</span> · {r.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

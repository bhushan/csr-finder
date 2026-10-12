import { randomUUID } from "node:crypto";
import { defaultDigestAI } from "@/lib/ai/gemini";
import { sendDigestEmail } from "@/lib/email/send";
import { runDigest } from "@/lib/pipeline/run";
import * as repo from "@/lib/repo";
import { weekOf } from "@/lib/week";

const UA = "Mozilla/5.0 (compatible; CSRPartnershipRadar/1.0; +https://vercel.com)";

export async function fetchText(url: string) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/rss+xml, application/xml, text/xml" }, signal: AbortSignal.timeout(15_000), cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** Start a run row; returns the existing one instead if a run is already in flight. */
export async function startRun(trigger: "cron" | "manual") {
  const active = await repo.activeRun();
  if (active) return { runId: active.id, alreadyRunning: true };
  const runId = randomUUID();
  await repo.createRun(runId, trigger);
  return { runId, alreadyRunning: false };
}

/** Full weekly job: collect → AI → store → email. Records progress on the run row throughout. */
export async function executeRun(runId: string, opts: { sendEmail?: boolean } = {}) {
  const { sendEmail = true } = opts;
  try {
    const settings = await repo.getSettings();
    const now = new Date();
    const week = weekOf(now);

    const digest = await runDigest({
      settings,
      now,
      fetchText,
      ai: defaultDigestAI(),
      filterUnseen: (urls) => repo.filterUnseen(urls, week),
      companyHistory: repo.companyHistory,
      onProgress: (step, progress, message) => repo.updateRun(runId, { step, progress, message }, { step, message }),
    });

    await repo.saveDigest(digest);
    await repo.markSeen(digest.items.flatMap((i) => i.sources.map((s) => s.url)), week);

    let emailNote = "Email not requested for this run";
    if (sendEmail) {
      await repo.updateRun(runId, { step: "deliver", progress: 95, message: "Sending email" });
      const result = await sendDigestEmail(digest, settings.recipients);
      if (result.sent.length) await repo.markEmailed(digest.id, result.sent);
      emailNote = result.sent.length
        ? `Emailed ${result.sent.length} recipient(s)`
        : `Email not sent: ${result.error ?? result.skipped}`;
    }

    const message = `Digest ready: ${digest.items.length} developments. ${emailNote}.`;
    await repo.updateRun(runId, { status: "succeeded", step: "done", progress: 100, message, digestId: digest.id, finishedAt: new Date() }, { step: "done", message });
    return digest;
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error("[run] failed:", err);
    await repo.updateRun(runId, { status: "failed", error: message, message: `Run failed: ${message}`, finishedAt: new Date() }, { step: "error", message });
    return null;
  }
}

/** Generate a past week's digest from dated searches (no email). Run weeks oldest-first. */
export async function backfillWeek(mondayIst: Date, onLog: (msg: string) => void = console.log) {
  const settings = await repo.getSettings();
  // 07:30 IST on that Monday, the same moment the cron would have fired
  const now = new Date(mondayIst.getTime() + 2 * 60 * 60 * 1000);
  const week = weekOf(now);
  const digest = await runDigest({
    settings,
    now,
    historical: true,
    fetchText,
    ai: defaultDigestAI(),
    filterUnseen: (urls) => repo.filterUnseen(urls, week),
    companyHistory: repo.companyHistory,
    onProgress: (step, pct, message) => onLog(`[${week} ${pct}%] ${step}: ${message}`),
  });
  await repo.saveDigest(digest);
  await repo.markSeen(digest.items.flatMap((i) => i.sources.map((s) => s.url)), week);
  return digest;
}

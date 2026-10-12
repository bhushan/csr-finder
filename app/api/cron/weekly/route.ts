import { NextResponse } from "next/server";
import { executeRun, startRun } from "@/lib/digest-service";

export const maxDuration = 300;

/** Vercel Cron calls this every Monday 02:00 UTC (07:30 IST) with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { runId, alreadyRunning } = await startRun("cron");
  if (alreadyRunning) return NextResponse.json({ runId, alreadyRunning });
  const digest = await executeRun(runId);
  return NextResponse.json({ runId, ok: !!digest, items: digest?.items.length ?? 0 }, { status: digest ? 200 : 500 });
}

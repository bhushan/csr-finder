import { after, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { executeRun, startRun } from "@/lib/digest-service";

export const maxDuration = 300;

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in on the Settings page first." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const { runId, alreadyRunning } = await startRun("manual");
  if (!alreadyRunning) after(() => executeRun(runId, { sendEmail: body.sendEmail !== false }));
  return NextResponse.json({ runId, alreadyRunning });
}

import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { sendDigestEmail } from "@/lib/email/send";
import { getSettings, latestDigest } from "@/lib/repo";

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in on the Settings page first." }, { status: 401 });
  const [row, settings] = await Promise.all([latestDigest(), getSettings()]);
  if (!row) return NextResponse.json({ error: "There is no digest yet. Run one first, then send the test." }, { status: 400 });
  const result = await sendDigestEmail(row.data, settings.recipients);
  if (result.sent.length) return NextResponse.json({ message: `Sent to ${result.sent.join(", ")}.` });
  return NextResponse.json({ error: `Not sent: ${result.error ?? result.skipped}.` }, { status: 400 });
}

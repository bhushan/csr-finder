import { NextResponse } from "next/server";
import { defaultDigestAI } from "@/lib/ai/gemini";
import { isAdmin } from "@/lib/admin";
import { getDigest, getSettings, leadsFor, upsertLead } from "@/lib/repo";

export const maxDuration = 60;

/** Gemini drafts a first outreach email for one digest item; cached on the lead. */
export async function POST(request: Request, ctx: RouteContext<"/api/leads/[itemId]/draft">) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to draft emails." }, { status: 401 });
  const { itemId } = await ctx.params;
  const { digestId, regenerate } = (await request.json().catch(() => ({}))) as { digestId?: string; regenerate?: boolean };
  if (!digestId) return NextResponse.json({ error: "digestId is required" }, { status: 400 });

  if (!regenerate) {
    const existing = (await leadsFor([itemId]))[itemId];
    if (existing?.draft) return NextResponse.json(existing.draft);
  }
  const [row, settings] = await Promise.all([getDigest(digestId), getSettings()]);
  const item = row?.data.items.find((i) => i.id === itemId);
  if (!item) return NextResponse.json({ error: "That item is no longer in this digest." }, { status: 404 });

  try {
    const draft = await defaultDigestAI().draftEmail({ ...item, trackRecord: item.trackRecord ?? "" }, settings);
    const saved = { ...draft, createdAt: new Date().toISOString() };
    await upsertLead(itemId, { digestId, company: item.company, draft: saved });
    return NextResponse.json(saved);
  } catch (err) {
    console.error("[draft] failed:", err);
    return NextResponse.json({ error: "Gemini couldn't draft this one right now. Try again in a moment." }, { status: 502 });
  }
}

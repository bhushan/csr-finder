import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { LeadUpdate } from "@/lib/leads";
import { upsertLead } from "@/lib/repo";

export async function PATCH(request: Request, ctx: RouteContext<"/api/leads/[itemId]">) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to update leads." }, { status: 401 });
  const { itemId } = await ctx.params;
  const parsed = LeadUpdate.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid lead update." }, { status: 400 });
  return NextResponse.json(await upsertLead(itemId, parsed.data));
}

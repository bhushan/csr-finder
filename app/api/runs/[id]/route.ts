import { NextResponse } from "next/server";
import { getRun } from "@/lib/repo";

export async function GET(_: Request, ctx: RouteContext<"/api/runs/[id]">) {
  const { id } = await ctx.params;
  const run = await getRun(id);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  return NextResponse.json(run, { headers: { "cache-control": "no-store" } });
}

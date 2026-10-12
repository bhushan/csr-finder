// Local end-to-end check against live feeds and real Gemini. No database, no email.
// Usage: npm run digest:dry -- [outfile]
import { writeFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";
import { defaultDigestAI, GEMINI_MODEL } from "@/lib/ai/gemini";
import { fetchText } from "@/lib/digest-service";
import { runDigest } from "@/lib/pipeline/run";
import { DEFAULT_SETTINGS } from "@/lib/settings";

async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const flash: string[] = [];
  for await (const m of await ai.models.list()) if (m.name?.includes("flash")) flash.push(m.name);
  console.log("Flash models available:", flash.join(", "));
  console.log("Using:", GEMINI_MODEL);

  const started = Date.now();
  const digest = await runDigest({
    settings: DEFAULT_SETTINGS,
    now: new Date(),
    fetchText,
    ai: defaultDigestAI(),
    filterUnseen: async (urls) => urls,
    onProgress: (step, pct, msg) => console.log(`[${pct}%] ${step}: ${msg}`),
  });
  const out = process.argv[2] ?? "digest-dry-run.json";
  writeFileSync(out, JSON.stringify(digest, null, 2));
  console.log(`Done in ${Math.round((Date.now() - started) / 1000)}s →`, out);
  console.log(JSON.stringify(digest.coverage, null, 2));
  for (const i of digest.items) console.log(`${i.score}\t${i.decision}\t${i.signalType}\t${i.company}: ${i.headline}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

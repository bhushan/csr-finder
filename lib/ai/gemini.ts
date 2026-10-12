import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import type { Settings } from "@/lib/settings";
import { DECISIONS, SIGNAL_TYPES, type Article, type Cluster, type Distilled, type DigestItem, type DigestSummary, type Triage } from "@/lib/types";
import { distillPrompt, summaryPrompt, SYSTEM, triagePrompt } from "./prompts";

export type GenerateRequest = {
  prompt: string;
  /** JSON schema for structured output (not combined with grounding). */
  schema?: Record<string, unknown>;
  /** Allow Google Search + URL context tools. */
  grounded: boolean;
};
export type GenerateResult = { text: string; grounding: { title: string; url: string }[] };
export type Generate = (req: GenerateRequest) => Promise<GenerateResult>;

export interface DigestAI {
  model: string;
  triage(articles: Article[], settings: Settings): Promise<Triage[]>;
  distill(cluster: Cluster, settings: Settings): Promise<{ distilled: Distilled; grounding: GenerateResult["grounding"] }>;
  summarize(items: DigestItem[], settings: Settings, weekOf: string): Promise<DigestSummary>;
}

const TriageItem = z.object({
  id: z.string(),
  relevant: z.boolean(),
  signalType: z.enum(SIGNAL_TYPES).catch("other"),
  company: z.string().catch(""),
  sectors: z.array(z.string()).catch([]),
  geography: z.string().catch(""),
  storyKey: z.string().catch(""),
});
const TriageResponse = z.object({ items: z.array(z.unknown()) });

const DistilledResponse = z.object({
  headline: z.string().min(1),
  whatHappened: z.string().catch(""),
  whyItMatters: z.string().catch(""),
  decision: z.enum(DECISIONS).catch("watch"),
  warmth: z.coerce.number().catch(50).transform((n) => Math.max(0, Math.min(100, Math.round(n)))),
  suggestedAngle: z.string().catch(""),
  contactHint: z.string().catch(""),
  amount: z.string().catch(""),
});

const SummaryResponse = z.object({ headline: z.string(), bullets: z.array(z.string()).min(1) });

const jsonSchema = (schema: z.ZodType) => z.toJSONSchema(schema, { target: "openapi-3.0", io: "input" }) as Record<string, unknown>;

const TRIAGE_SCHEMA = jsonSchema(
  z.object({
    items: z.array(
      z.object({
        id: z.string(),
        relevant: z.boolean(),
        signalType: z.enum(SIGNAL_TYPES),
        company: z.string(),
        sectors: z.array(z.string()),
        geography: z.string(),
        storyKey: z.string(),
      }),
    ),
  }),
);
const DISTILL_SCHEMA = jsonSchema(
  z.object({
    headline: z.string(),
    whatHappened: z.string(),
    whyItMatters: z.string(),
    decision: z.enum(DECISIONS),
    warmth: z.number(),
    suggestedAngle: z.string(),
    contactHint: z.string(),
    amount: z.string(),
  }),
);
const SUMMARY_SCHEMA = jsonSchema(SummaryResponse);

/** Models sometimes wrap JSON in fences or prose when tools are on; take the outermost object. */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object in model output");
  return JSON.parse(text.slice(start, end + 1));
}

const isTransient = (err: unknown) => {
  const status = (err as { status?: number })?.status;
  if (status) return status === 429 || status >= 500;
  return /fetch failed|timeout|ECONNRESET|socket/i.test(String((err as Error)?.message));
};

async function withRetry<T>(fn: () => Promise<T>, retries: number): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !isTransient(err)) throw err;
      await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt + Math.random() * 500));
    }
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

const irrelevant = (id: string): Triage => ({
  id, relevant: false, signalType: "other", company: "", sectors: [], geography: "", storyKey: "",
});

export function createDigestAI(
  generate: Generate,
  model: string,
  opts: { triageBatchSize?: number; retries?: number; concurrency?: number } = {},
): DigestAI {
  const { triageBatchSize = 40, retries = 2, concurrency = 4 } = opts;
  const call = (req: GenerateRequest) => withRetry(() => generate(req), retries);

  return {
    model,

    async triage(articles, settings) {
      const batches: Article[][] = [];
      for (let i = 0; i < articles.length; i += triageBatchSize) batches.push(articles.slice(i, i + triageBatchSize));

      const results = await mapLimit(batches, concurrency, async (batch) => {
        const ids = new Set(batch.map((a) => a.id));
        const found = new Map<string, Triage>();
        try {
          const { text } = await call({ prompt: triagePrompt(batch, settings), schema: TRIAGE_SCHEMA, grounded: false });
          for (const raw of TriageResponse.parse(extractJson(text)).items) {
            const parsed = TriageItem.safeParse(raw);
            if (parsed.success && ids.has(parsed.data.id)) found.set(parsed.data.id, parsed.data);
          }
        } catch (err) {
          console.error("[triage] batch failed:", (err as Error).message);
        }
        return batch.map((a) => found.get(a.id) ?? irrelevant(a.id));
      });
      return results.flat();
    },

    async distill(cluster, settings) {
      const prompt = distillPrompt(cluster, settings, new Date().toISOString().slice(0, 10));
      const attempt = async (grounded: boolean) => {
        const res = await call({ prompt, grounded, schema: grounded ? undefined : DISTILL_SCHEMA });
        const distilled = DistilledResponse.parse(extractJson(res.text));
        return { distilled: { ...distilled, verified: res.grounding.length > 0 }, grounding: res.grounding };
      };
      try {
        return await attempt(true);
      } catch (err) {
        console.error("[distill] grounded call failed, retrying plain:", (err as Error).message);
      }
      try {
        return await attempt(false);
      } catch (err) {
        console.error("[distill] plain call failed, using headline only:", (err as Error).message);
      }
      const lead = cluster.articles[0];
      return {
        distilled: {
          headline: lead.title,
          whatHappened: lead.snippet || "Only the headline was available; the AI summary could not be generated this run.",
          whyItMatters: "Not assessed automatically. Open the source to judge fit.",
          decision: "watch",
          warmth: 40,
          suggestedAngle: "",
          contactHint: "",
          amount: "",
          verified: false,
        },
        grounding: [],
      };
    },

    async summarize(items, settings, weekOf) {
      try {
        const { text } = await call({ prompt: summaryPrompt(items, settings, weekOf), schema: SUMMARY_SCHEMA, grounded: false });
        return SummaryResponse.parse(extractJson(text));
      } catch (err) {
        console.error("[summary] failed:", (err as Error).message);
        const calls = items.filter((i) => i.decision === "call_this_week");
        return {
          headline: `${calls.length} development${calls.length === 1 ? "" : "s"} worth a call this week.`,
          bullets: calls.slice(0, 4).map((i) => `${i.company}: ${i.headline}`),
        };
      }
    },
  };
}

/** Real Gemini Flash client. Every AI task in the app goes through here. */
export function createGeminiGenerate(apiKey: string, model: string): Generate {
  const ai = new GoogleGenAI({ apiKey });
  return async ({ prompt, schema, grounded }) => {
    const res = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM,
        temperature: 0.2,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        ...(grounded
          ? { tools: [{ googleSearch: {} }, { urlContext: {} }] }
          : { responseMimeType: "application/json", responseJsonSchema: schema }),
        abortSignal: AbortSignal.timeout(90_000),
      },
    });
    const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const grounding = chunks
      .map((c) => ({ title: c.web?.title ?? "", url: c.web?.uri ?? "" }))
      .filter((g) => g.url);
    return { text: res.text ?? "", grounding };
  };
}

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

export function defaultDigestAI(): DigestAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return createDigestAI(createGeminiGenerate(key, GEMINI_MODEL), GEMINI_MODEL);
}

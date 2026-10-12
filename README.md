# CSR Partnership Radar

**Live:** https://csr-finder.vercel.app · **Components Map:** [COMPONENTS.md](./COMPONENTS.md) (also at [/how-it-works](https://csr-finder.vercel.app/how-it-works))

AI-powered weekly CSR intelligence digest for an education and skilling NGO (MESA C4, Problem Statement 9).
Every Monday at 07:30 IST it scans the last seven days of Indian news for companies announcing CSR initiatives,
signalling bigger CSR allocations, explicitly seeking NGO implementation partners, and policy changes affecting
CSR spend, then distils each into one decision: **is this worth a call this week?**

- **Live data:** Google News RSS + Bing News RSS (India edition), plus Google Search grounding inside Gemini.
- **AI:** Gemini Flash only (`@google/genai`), for triage, analysis and the weekly summary.
- **Delivery:** email via Resend, and a public web view with archive.
- **Configurable:** sectors and keywords, geography tiers, recipients, excluded companies, NGO profile.

## Run locally

```bash
npm install
vercel link && vercel env pull .env.local   # Neon + Resend vars come from the Marketplace integrations
npm run db:push                             # create tables
npm test                                    # unit tests
npm run digest:dry                          # live feeds + Gemini, prints a digest, no DB/email
npm run dev
```

## Environment

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | Google AI Studio key |
| `GEMINI_MODEL` | Optional, defaults to `gemini-3.8-flash` |
| `DATABASE_URL` | Neon Postgres (set by the Vercel Marketplace integration) |
| `RESEND_API_KEY` | Resend (set by the Vercel Marketplace integration) |
| `EMAIL_FROM` | Optional sender, defaults to `onboarding@resend.dev` |
| `ADMIN_PASSCODE` | Unlocks Settings and on-demand runs |
| `CRON_SECRET` | Authenticates the Vercel Cron call |
| `APP_URL` | Optional public URL used in email links |

## Endpoints

- `GET /api/cron/weekly`: weekly job (Vercel Cron, `Authorization: Bearer $CRON_SECRET`)
- `POST /api/run`: start a run now (admin), returns `runId`
- `GET /api/runs/:id`: run progress and log
- `POST /api/test-email`: send the latest digest to recipients (admin)

# CaseBrief

A case dashboard for personal-injury firms, built on Clio Manage. It reads a matter live, read-only, and turns it into:

1. **A firm briefing** for getting up to speed in two minutes or digging into everything. Every number, date and item opens the Clio note, email, task, calendar entry, expense, contact or document it came from.
2. **A providers desk** for medical history, prior treatment, what the patient has sent, who to call to schedule, and liens (when providers get paid from recovery).

Built and demoed on the Sapini matter. Nothing about Sapini is hardcoded: every value comes from the Clio API at import time, and tests use a synthetic fixture.

## What the firm sees

- **Header:** client, age, matter number, stage, status, incident date and the recorded case summary.
- **KPIs:**
  - Recorded case value, coverage and policy limits, and medical specials. Specials are cross-checked against the itemised provider charges.
  - What the firm has spent. Firm-paid costs are kept separate from provider treatment charges.
  - Days since the last client contact, and when the client last reached out.
- **Changed since your last visit:** Clio records updated since you last opened the matter in this browser.
- **Needs attention:** statute of limitations status, overdue tasks, tasks due in the next 30 days, and what is waiting on someone else (a provider or the client).
- **Coming up:** future calendar entries.
- **What happened recently:** the last 45 days across notes, communications, documents and calendar entries.
- **The notes that matter:** the 10 of 42 notes ranked by recency and signals (coverage, surgery, liens, deadlines, negotiation, value, liability, risk and open issues). The tags show why each was picked.
- **Providers:** medical history and prior treatment from notes and records, inbound client messages, open asks still waiting on the patient, scheduling contacts and upcoming appointments, and recorded liens. Provider payment timing is only stated when a settlement or disbursement date is on the matter; otherwise the desk says liens are paid from recovery.
- **Request info from client:** opens an email draft listing open Clio tasks waiting on the patient. Nothing is written back to Clio.
- **Everything mode:** all case facts from the Clio custom fields, firm expenses, a searchable and filterable timeline (160 entries on Sapini) and documents grouped by folder.

## Submission answers

- **Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Node 25 (built-in `node:sqlite`). It runs locally at `http://127.0.0.1:3000`.
- **Where data lives outside Clio:** a local SQLite file (`.data/casebrief.sqlite`, git-ignored). It holds the imported snapshot, sessions and the cached AI brief. Clio OAuth tokens are encrypted with AES-256-GCM using a local key in `.data/encryption.key`.
- **Clio access:** read-only. Case data is fetched only with GET requests; the only POST is the OAuth token exchange. No Clio record is ever created, updated or deleted. Pagination is followed and checked against Clio's own origin, rate limits are respected, and a failure in one collection is reported without discarding the others.
- **AI models and cost per case:** optional Gemini briefing (Google AI Studio free tier) when `GOOGLE_GENERATIVE_AI_API_KEY` is set. The model returns a sourced JSON brief; the server drops any claim whose citation is not on the imported matter. Cached per matter and import. Without a key the dashboard stays deterministic and $0/case. With Gemini, one briefing is typically well under $0.05.
- **Limitations and half-done work:**
  - Document contents are not read: no PDF text extraction or OCR. Documents appear by name and folder, and open from Clio.
  - Matching documents to providers relies on Clio contact names appearing in file names. Matching tasks to providers and the client relies on names appearing in task titles.
  - "Changed since your last visit" is per browser (`localStorage`), not per user.
  - Single firm and single local process. Reconnecting Clio starts a new connection and logs out old sessions.
  - Local prototype: case snapshots are stored unencrypted in the local database, and only the tokens are encrypted.

## Run it

Requires Node >=22.13.

```bash
npm install
cp .env.example .env.local   # fill in the Clio application key and secret
npm run dev
```

Open `http://127.0.0.1:3000` (use `127.0.0.1`, not `localhost`). Register this exact redirect URI in the Clio developer portal:

```text
http://127.0.0.1:3000/api/clio/callback
```

Then click **Connect Clio**, choose the matter and click **Import and brief**.

```bash
npm test          # 27 tests: OAuth state, sessions, origin checks, pagination, rate limits, partial imports, token refresh, digest, share boundary
npm run typecheck
npm run build
```

## Source map

| Path | Responsibility |
| --- | --- |
| `src/lib/clio-client.ts`, `clio.ts` | Read-only Clio HTTP client, pagination, rate limits, token refresh |
| `src/lib/ingestion.ts` | Matter import job and snapshot |
| `src/lib/digest.ts` | Deterministic case digest (KPIs, deadlines, contact, ranking, providers) |
| `src/app/page.tsx` | Connect, matter selection and import flow |
| `src/ui/adapter.ts` | Maps the imported snapshot and digest into the UI's view model and source records |
| `src/ui/AttorneyApp.tsx`, `src/ui/components/` | Firm workspace (overview, timeline, documents, tasks, providers desk), source drawer, search |
| `src/lib/ai.ts`, `src/app/api/ai/brief` | Optional sourced Gemini briefing |
| `src/app/api/**` | Route handlers (OAuth, status, matters, sync, documents) |

`design-prototype/` is a separate, earlier Vite UI mockup from a teammate. It uses illustrative placeholder data, is not connected to Clio, and is not part of the submitted app.

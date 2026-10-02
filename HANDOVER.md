# CaseBrief implementation handover

Date: October 2, 2026
Repository: `/Users/vibhusingh/swans-hackathon`

## Current status

This is a **work-in-progress backend scaffold**, not a finished or verified application.
The code was initially staged under `/tmp/swans-scaffold` and copied into this repository for this handover.

Implemented in source:

- Next.js / TypeScript project configuration, bound to `127.0.0.1:3000`.
- Clio OAuth start and callback routes, state validation, one-time state consumption, and firm-session cookies.
- Local SQLite persistence with AES-256-GCM encryption of access and refresh tokens.
- Token refresh and a read-only Clio API client: case-data requests use GET, OAuth token exchange uses POST.
- Pagination, basic rate-limit handling, request timeouts, and validation of API pagination URLs.
- Matter listing and background import of matter details, contacts, notes, communications, tasks, calendar entries, activities, and document metadata.
- Saved import progress, collection-level failures, and preservation of the previous snapshot when an import fails entirely.
- A firm-session-protected document-download redirect for documents present in the imported case.

Not implemented or verified:

- No root layout, home page, connection screen, or dashboard. **The project is not yet a runnable end-to-end web app.**
- Dependencies have not been installed; no lockfile is present. Declared package versions have not been checked against the package registry.
- No typecheck, build, automated tests, browser verification, or live Clio calls have been run.
- `npm test` is declared, but the `tests/` directory has not been created yet.
- No credentials have been written or committed. The user has the Clio application key and secret.
- No Sapini data has been fetched.
- No document-file ingestion, text extraction, OCR, or AI briefing.
- No attorney approval workflow, provider portal, provider authentication, or deployment.

## Product goal and constraints

Build a source-backed briefing that helps a personal-injury firm understand Sapini quickly, and a separate provider view containing only attorney-approved information.

- Sapini must be read live from the team's populated Clio Manage account.
- Do not create, update, or delete Clio case records.
- Keep summaries, sharing configuration, and other application data outside Clio.
- Do not hardcode Sapini facts. Test fixtures may be synthetic but must remain in tests.
- Keep recorded strategy and unrelated confidential material inside the firm.
- Provider output must be an explicitly approved snapshot, not the full internal summary filtered only in the UI.
- GitHub repository and public Google Drive link to a 90-second demo are required; include stack, AI models, approximate per-case cost, and limitations.
- Submission and committed work are due by 4:00 PM Pacific on October 2, 2026.

Original briefing: `/Users/vibhusingh/Downloads/LDG - 8_30 LDG Hackathon.pdf`.

## Clio setup

The user has created a Clio Manage developer application and obtained its key and secret.

**Registered/planned callback:**

```text
http://127.0.0.1:3000/api/clio/callback
```

Clio's registration form rejects `localhost`. Use `127.0.0.1` consistently when opening the app, initiating authorization, and registering the callback.

Create `.env.local` from `.env.example` locally and fill in:

```dotenv
CLIO_CLIENT_ID=APPLICATION_KEY_NOT_NUMERIC_APP_ID
CLIO_CLIENT_SECRET=APPLICATION_SECRET
CLIO_REDIRECT_URI=http://127.0.0.1:3000/api/clio/callback
CLIO_BASE_URL=https://app.clio.com
```

The regional origin must match the account. Supported origins are US `https://app.clio.com`, EU `https://eu.app.clio.com`, CA `https://ca.app.clio.com`, and AU `https://au.app.clio.com`.

Use read-only permissions covering Matters, Contacts, Notes, Communications, Tasks, Calendars, Documents, Activities, and applicable custom-field access. Verify the actual categories in the portal. Changing permissions requires reauthorization.

Never commit `.env.local`, `.data/`, OAuth codes, tokens, or imported records. `.gitignore` excludes those paths. The local encryption key is automatically created in `.data/encryption.key`; it protects tokens against database-only disclosure, not compromise of the whole local machine.

## Source map

| File | Responsibility |
| --- | --- |
| `src/lib/config.ts` | Validate credentials, callback URI, and regional origin |
| `src/lib/store.ts` | SQLite key/value persistence and token encryption |
| `src/lib/security.ts` | Hashing, constant-time comparison, origin checks |
| `src/lib/auth.ts` | OAuth state, connection storage, sessions, cookie options |
| `src/lib/clio-client.ts` | HTTP GET client, pagination, retries, token exchange |
| `src/lib/clio.ts` | Connection-bound client and token refresh |
| `src/lib/ingestion.ts` | Matter listing, import job, requested fields, saved snapshot |
| `src/lib/types.ts` | Record, snapshot, job, and UI status types |
| `src/lib/http.ts` / `errors.ts` | Sanitized HTTP errors and JSON responses |
| `src/app/api/clio/**/route.ts` | Next.js route handlers |

## API routes currently written

| Route | Purpose / access |
| --- | --- |
| `GET /api/clio/connect` | Start OAuth; credentials required |
| `GET /api/clio/callback` | Validate state, exchange code, establish session |
| `GET /api/clio/status` | Configuration/connection status; case data only for an authorized session |
| `GET /api/clio/matters` | List matters; firm session required |
| `POST /api/clio/sync` | Start import with JSON `{ "matterId": "123" }`; firm session and matching Origin required |
| `GET /api/clio/documents/:id` | Redirect to signed download; firm session and imported-document membership required |

The signed download URL is returned to the authorized browser without forwarding the Clio bearer token. Document bytes are not stored or processed yet.

Import progress and the saved snapshot are available through the status endpoint. Import uses Next.js `after()`; it is intended for a continuously running local Node server, not a durable distributed job queue.

## Resume in this order

1. Install dependencies and verify the declared package versions. Generate and commit a lockfile. Node >=22.13 is required for the built-in SQLite module; Node 25.8.2 was available during scaffolding.
2. Add `src/app/layout.tsx`, `src/app/page.tsx`, and the minimal connection/import interface. Do not expand scope before the OAuth round trip works.
3. Add meaningful tests for OAuth state mismatch, expiry and replay; missing firm session; mismatched POST Origin; pagination; cross-origin pagination rejection; partial imports; and token refresh.
4. Run `npm run typecheck` and `npm run build`, resolving errors. Neither has passed yet.
5. Have the user fill `.env.local`, then start `npm run dev` and open `http://127.0.0.1:3000`.
6. Connect Clio, list matters, select Sapini, and import. Inspect actual counts, field values, and collection errors. Confirm the notes `type` parameter accepted by the live API; the downloaded reference lists `Matter`, while older prose examples vary in casing.
7. Retrieve document contents, extract text/OCR, and retain source IDs, excerpts, and page references.
8. Generate and cache a structured briefing. Calculate task deadlines and expense totals deterministically; do not invent coverage or case value.
9. Build the firm dashboard and evidence drawer.
10. Build attorney review and provider access using separate approved snapshots and backend authorization.
11. Verify the complete workflow, measure AI usage, record the demo, and submit before the deadline.

## Review items before calling this reliable

- The rate limiter belongs to an in-process client. Concurrent requests and multiple workers need stronger coordination.
- Import locking uses a stored job flag rather than a transactional distributed lock. Review competing requests, restarts, and stale jobs.
- A reconnect rotates the connection ID and invalidates previous firm sessions; previous snapshots are not migrated to the new connection.
- Old sessions, pending OAuth states, connection snapshots, and jobs have no cleanup policy yet.
- The OAuth callback reports generic errors; improve actionable diagnostics without logging credentials, codes, or raw confidential responses.
- A callback stores tokens before a real API access check; connection success does not prove all requested collections are accessible.
- Case snapshots are stored as plaintext JSON in a private local database. Only tokens are encrypted. This is a local prototype, not a reviewed production deployment.
- The provider access boundary remains entirely unimplemented. Do not expose the firm endpoints as a provider portal.

## Official references consulted

- [Clio Manage application registration](https://docs.developers.clio.com/api-docs/clio-manage/applications/)
- [Clio authorization](https://docs.developers.clio.com/api-docs/clio-manage/authorization/)
- [Clio permissions](https://docs.developers.clio.com/api-docs/clio-manage/permissions/)
- [Clio fields](https://docs.developers.clio.com/api-docs/clio-manage/fields/)
- [Clio pagination](https://docs.developers.clio.com/api-docs/clio-manage/paging/)
- [Clio rate limits](https://docs.developers.clio.com/api-docs/clio-manage/rate-limits/)
- [Clio Manage API reference](https://docs.developers.clio.com/clio-manage/api-reference/)
- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Next.js after()](https://nextjs.org/docs/app/api-reference/functions/after)
- [Node SQLite](https://nodejs.org/api/sqlite.html)

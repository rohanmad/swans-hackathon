# CaseBrief / Swans Hackathon

Work-in-progress read-only Clio integration for a source-backed Sapini case briefing and attorney-controlled provider updates.

**Status:** backend source scaffold only. No UI, dependency installation, build verification, or live Clio connection yet.

Read [HANDOVER.md](HANDOVER.md) for the implemented routes, setup instructions, limitations, and exact next steps.

## Planned local setup

Requires Node >=22.13.0. Install dependencies, add the missing root layout/page, and configure `.env.local` from `.env.example` before running:

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`. Register this exact Clio redirect URI:

```text
http://127.0.0.1:3000/api/clio/callback
```

Keep credentials and imported case data out of Git. Case-data requests are read-only; the OAuth token exchange is the only external POST currently implemented.

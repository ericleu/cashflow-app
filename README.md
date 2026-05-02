# Cash Flow

A personal expense tracker for small households. Scan receipts with your phone camera, have AI extract the details, and save entries directly to Google Sheets — or enter expenses manually when there's no receipt.

Built as a mobile-optimised web app accessible at `cashflow.yourdomain.com`.

---

## Features

- **Receipt scanning** — take a photo or pick from your library; Gemini Vision extracts merchant, date, amount, and category automatically
- **Manual entry** — full form for digital payments, cash, or anything without a paper receipt
- **Audit screen** — every save shows a confirmation screen with edit and delete options
- **Google Sheets backend** — all data stored in your existing yearly Cash Flow spreadsheets; auditable and editable directly in Sheets
- **Receipt photos** — stored in Google Drive, hyperlinked from the Sheet entry
- **Two-user access** — shared token auth, stored in 1Password, keyed to `cashflow.yourdomain.com`

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Svelte + Vite, hosted on GitHub Pages |
| Backend | Google Apps Script (TypeScript via clasp) |
| OCR | Gemini API — gemini-2.0-flash-lite |
| Data | Google Sheets (one sheet per year) |
| Photos | Google Drive (`receipts/` folder per year) |
| Domain | `cashflow.yourdomain.com` via CNAME |

---

## Repository Structure

```
cash-flow/
├── frontend/                  ← Svelte app deployed to GitHub Pages
│   ├── src/
│   │   ├── routes/
│   │   │   ├── Home.svelte
│   │   │   ├── Scan.svelte
│   │   │   ├── Entry.svelte   ← shared form (manual + scan fallback)
│   │   │   └── Audit.svelte
│   │   ├── lib/
│   │   │   ├── api.ts         ← all Apps Script calls
│   │   │   ├── camera.ts      ← file picker / photo capture
│   │   │   ├── auth.ts        ← token storage / retrieval
│   │   │   └── store.ts       ← Svelte app state
│   │   └── App.svelte
│   ├── public/
│   │   └── CNAME              ← cashflow.yourdomain.com
│   ├── package.json
│   └── vite.config.ts
│
├── apps-script/               ← Google Apps Script backend (clasp)
│   ├── src/
│   │   ├── main.ts            ← doPost router
│   │   ├── sheets.ts          ← read/write Google Sheets
│   │   ├── drive.ts           ← receipt photo storage
│   │   ├── claude.ts          ← Claude Vision API
│   │   ├── dropdowns.ts       ← category / payment / tag lists
│   │   └── config.ts          ← auth, CORS, sheet ID discovery
│   ├── appsscript.json
│   └── tsconfig.json
│
├── .github/
│   └── workflows/
│       ├── deploy-frontend.yml       ← triggers on frontend/** changes
│       └── deploy-apps-script.yml    ← triggers on apps-script/** changes
│
├── README.md
├── ARCHITECTURE.md
├── CONTRIBUTING.md
└── PLAN.md
```

---

## Credentials & Secrets Reference

This project uses credentials across three locations: Google Apps Script Script Properties, GitHub Actions Secrets, and user devices (localStorage + 1Password).

### 1. Google Apps Script — Script Properties

Set these manually in the Apps Script editor under **Project Settings → Script Properties**.

| Property Key | Value | Set By | Notes |
|---|---|---|---|
| `AUTH_TOKEN` | Shared secret string | Manual (once) | Must match what users enter on first login |
| `GEMINI_API_KEY` | Google AI Studio API key | Manual (once) | From AI Studio — cashflow-app GCP project; never exposed to frontend |
| `CASHFLOW_FOLDER_ID` | Google Drive folder ID | Manual (once) | ID of the `Cash flow` parent folder — from its Drive URL |
| `sheetId_{year}` | Google Sheet ID | Auto-populated | Discovered on first request per year, persists forever. e.g. `sheetId_2026` |

**To get `CASHFLOW_FOLDER_ID`:** open the `Cash flow` folder in Google Drive and copy the ID from the URL:
```
https://drive.google.com/drive/folders/[CASHFLOW_FOLDER_ID]
```

**To get your Gemini API key:** go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → create a key under the cashflow-app GCP project. Requires a paid billing account (prepay minimum $10) to avoid free-tier quota limits.

---

### 2. GitHub Actions — Repository Secrets

Set these under **Repo Settings → Secrets and Variables → Actions**.

| Secret Name | Value | Used By | Notes |
|---|---|---|---|
| `APPS_SCRIPT_URL` | `https://script.google.com/macros/s/xxx/exec` | Frontend build | Baked into Svelte bundle at compile time |
| `CLASPRC_JSON` | Contents of `~/.clasprc.json` | Apps Script deploy | OAuth token for `clasp push`; see below for setup |
| `CUSTOM_DOMAIN` | Your custom domain | Frontend build | Written to `CNAME` at build time; keeps domain out of source code |

**To generate `CLASPRC_JSON`:**
```bash
npx @google/clasp login
cat ~/.clasprc.json | pbcopy   # copies to clipboard
```
Paste the copied content as the value of the `CLASPRC_JSON` secret in GitHub.

**If the `CLASPRC_JSON` token expires**, the Apps Script deploy workflow will fail with clear instructions. To fix: re-run `clasp login` locally and update the secret.

---

### 3. User Devices — localStorage + 1Password

| Item | Storage | Notes |
|---|---|---|
| `AUTH_TOKEN` | localStorage (per device) | Entered once on first visit, never re-asked |
| `AUTH_TOKEN` | 1Password | Saved under URL `cashflow.yourdomain.com` for autofill |

**1Password entry setup** (both users):
```
Title:    Cash Flow App
URL:      cashflow.yourdomain.com
Username: (your name or leave blank)
Password: [AUTH_TOKEN value]
```

**AUTH_TOKEN is never stored in the repository or baked into the build.** It is entered by the user on first visit and saved to their device's localStorage.

---

## First-Time Setup

### Apps Script
1. Set all Script Properties listed above
2. Deploy as Web App: **Execute as Me**, **Access: Anyone**
3. Copy the deployment URL → set as `APPS_SCRIPT_URL` in GitHub Secrets

### GitHub
1. Add `APPS_SCRIPT_URL` and `CLASPRC_JSON` to repository secrets
2. Push to `main` — GitHub Actions handles the rest

### DNS (yourdomain.com)
```
Type:  CNAME
Host:  cashflow
Value: [github-username].github.io
TTL:   3600
```

### GitHub Pages
- Repo Settings → Pages → Custom Domain → `cashflow.yourdomain.com`
- ✅ Enforce HTTPS

---

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for local dev setup and workflow.
See [ARCHITECTURE.md](ARCHITECTURE.md) for system design details.
See [PLAN.md](PLAN.md) for full project plan and decision log.

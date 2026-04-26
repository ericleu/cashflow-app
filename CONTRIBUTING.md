# Contributing

This is a private personal project. This document covers local development setup and workflow for the two maintainers.

---

## Prerequisites

- Node.js 20+
- npm
- `clasp` (Google Apps Script CLI)
- A Google account with access to the Cash Flow Drive folder and Sheets
- An Anthropic API key (for Claude Vision)

---

## Repository Layout

```
cash-flow/
├── frontend/        ← Svelte app
├── apps-script/     ← Google Apps Script backend
├── .github/
│   └── workflows/   ← CI/CD
├── README.md
├── ARCHITECTURE.md
├── CONTRIBUTING.md
└── PLAN.md
```

---

## Frontend Setup

```bash
cd frontend
npm install
```

### Environment Variables

Create `frontend/.env.local` (gitignored):

```
VITE_SCRIPT_URL=https://script.google.com/macros/s/xxx/exec
```

Use the deployed Apps Script URL from your own deployment, or a test deployment.

### Dev Server

```bash
cd frontend
npm run dev
```

Opens at `http://localhost:5173`. The app will POST to `VITE_SCRIPT_URL` for all backend calls.

### Build

```bash
cd frontend
npm run build
```

Output goes to `frontend/dist/`. This is what GitHub Actions deploys to GitHub Pages.

### Lint / Type Check

```bash
cd frontend
npm run check     # svelte-check + tsc
```

---

## Apps Script Setup

### First-Time clasp Login

```bash
npm install -g @google/clasp
npx @google/clasp login
```

This opens a browser for Google OAuth. After approving, credentials are saved to `~/.clasprc.json`.

### Linking to the Script Project

The `.clasp.json` file in `apps-script/` contains the script ID. If setting up from scratch:

```bash
cd apps-script
npx @google/clasp clone <SCRIPT_ID>
```

Or create a new project:

```bash
npx @google/clasp create --type standalone --title "Cash Flow API"
```

### Install Dependencies

```bash
cd apps-script
npm install
```

### Compile TypeScript

```bash
cd apps-script
npm run build   # runs tsc
```

Output goes to `apps-script/dist/` — this is what `clasp push` uploads.

### Push to Apps Script

```bash
cd apps-script
npx @google/clasp push --force
```

### Open in Browser

```bash
npx @google/clasp open
```

### Script Properties Setup

After first push, set Script Properties in the Apps Script editor:

**Project Settings → Script Properties → Add property:**

| Property | Value |
|---|---|
| `AUTH_TOKEN` | Your chosen shared secret |
| `CLAUDE_API_KEY` | Your Anthropic API key |
| `CASHFLOW_FOLDER_ID` | Google Drive folder ID of the `Cash flow` parent folder |

`sheetId_{year}` properties are auto-populated on first use — do not set manually.

### Deploy as Web App

In the Apps Script editor:
- **Deploy → New deployment**
- Type: **Web App**
- Execute as: **Me**
- Who has access: **Anyone**
- Copy the deployment URL → set as `VITE_SCRIPT_URL` in your `.env.local` and as `APPS_SCRIPT_URL` in GitHub Secrets

---

## GitHub Secrets

Required for CI/CD. Set under **Repo Settings → Secrets and Variables → Actions**:

| Secret | How to get it |
|---|---|
| `APPS_SCRIPT_URL` | Apps Script deployment URL (from Deploy step above) |
| `CLASPRC_JSON` | Run `cat ~/.clasprc.json` after `clasp login` |

---

## Workflow

### Making Frontend Changes

```bash
cd frontend
# make changes
npm run check     # verify no type errors
git add .
git commit -m "feat: ..."
git push origin main
```

GitHub Actions detects changes under `frontend/` and deploys to GitHub Pages automatically.

### Making Apps Script Changes

```bash
cd apps-script
# make changes to src/
npm run build     # compile TypeScript
npx @google/clasp push --force   # push to Apps Script for testing
# test manually via the deployed web app URL
git add .
git commit -m "feat: ..."
git push origin main
```

GitHub Actions detects changes under `apps-script/` and runs `clasp push` automatically. The workflow validates the clasp OAuth token before pushing — if expired, it fails with fix instructions.

### Testing Apps Script Locally

Apps Script has no local runtime — you must push and test against the live deployment. Use the Apps Script editor's built-in logger (`Logger.log`) for debugging, or add temporary `console.log` calls visible in the Execution log.

For iterating quickly on backend logic, push with `clasp push --force` and test via the web app URL directly from your phone or browser.

---

## Updating clasp Credentials (Token Expired)

If the Apps Script deploy workflow fails with `CLASP CREDENTIALS EXPIRED`:

```bash
# 1. Re-authenticate
npx @google/clasp login

# 2. Copy new credentials
cat ~/.clasprc.json | pbcopy

# 3. Update GitHub secret
# → github.com/[your-repo]/settings/secrets/actions
# → CLASPRC_JSON → Update → paste
```

Then re-run the failed workflow from the GitHub Actions tab.

---

## Branching

This is a personal project — direct pushes to `main` are fine. If working on a larger feature, use a short-lived feature branch:

```bash
git checkout -b feat/receipt-scanning
# work
git push origin feat/receipt-scanning
# open PR → merge → delete branch
```

---

## Adding a New Year

Run `createNewYearSetup(year)` in the Apps Script editor to:
- Create the `{year}/` Drive folder
- Copy the previous year's Sheet
- Clear expense entries (preserves placeholder rows)
- Create the `receipts/` subfolder

The new Sheet ID auto-populates in Script Properties on the first expense entry of the year.

```typescript
// Run once in Apps Script editor console:
createNewYearSetup(2027);
```

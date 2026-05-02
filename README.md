# Cash Flow

A personal expense tracker. Scan receipts with your phone, have AI extract the details, and save directly to Google Sheets — or add entries manually.

---

## Setup

### What you need before starting
- Google account with the Cash Flow Drive folder and yearly Sheets already set up
- Google AI Studio API key with paid billing (cashflow-app GCP project)
- GitHub repo with Actions enabled

---

### Step 1 — Apps Script

1. Open the Apps Script editor → **Project Settings → Script Properties**
2. Add these four properties:

   | Property | Value |
   |---|---|
   | `AUTH_TOKEN` | Any secret string — this is your login password |
   | `GEMINI_API_KEY` | From [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — cashflow-app project |
   | `CASHFLOW_FOLDER_ID` | ID from your Cash Flow Drive folder URL |

   > `sheetId_{year}` properties are set automatically on first use — do not add them manually.

3. **Deploy → New deployment → Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the deployment URL — you'll need it in Step 2

---

### Step 2 — GitHub Secrets

Go to **Repo Settings → Secrets and Variables → Actions** and add:

| Secret | Value |
|---|---|
| `APPS_SCRIPT_URL` | The deployment URL from Step 1 |
| `CUSTOM_DOMAIN` | Your custom domain (e.g. `cashflow.yourdomain.com`) |
| `CLASPRC_JSON` | Run `npx @google/clasp login` then `cat ~/.clasprc.json` |

---

### Step 3 — DNS

Add a CNAME record at your domain registrar:

```
Type:  CNAME
Host:  cashflow
Value: [your-github-username].github.io
TTL:   3600
```

---

### Step 4 — GitHub Pages

Repo Settings → Pages → Custom Domain → enter your domain → **Enforce HTTPS**

---

### Step 5 — Deploy

Push to `main`. GitHub Actions builds and deploys automatically. Done.

---

## Daily Use

1. Open the app on your phone
2. Enter your `AUTH_TOKEN` on first visit — 1Password autofills it on return visits
3. **Take Photo** — opens camera directly, scans receipt automatically
4. **Choose Photo** — pick from your library, scans automatically
5. **Add Manually** — for digital payments or anything without a receipt
6. After scanning: confirm the entry, set payment method, done

---

## Further Reading

- [ARCHITECTURE.md](ARCHITECTURE.md) — system design, data model, CORS strategy, OCR pipeline
- [CONTRIBUTING.md](CONTRIBUTING.md) — local dev setup, clasp workflow, testing

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

## Credentials Reference

### Apps Script — Script Properties

| Property | Set By | Notes |
|---|---|---|
| `AUTH_TOKEN` | Manual (once) | Must match what users enter on first login |
| `GEMINI_API_KEY` | Manual (once) | Google AI Studio — cashflow-app GCP project; never exposed to frontend |
| `CASHFLOW_FOLDER_ID` | Manual (once) | Open Cash Flow folder in Drive, copy ID from URL |
| `sheetId_{year}` | Auto-populated | Discovered on first request per year, persists forever |

**To get `CASHFLOW_FOLDER_ID`:**
```
https://drive.google.com/drive/folders/[CASHFLOW_FOLDER_ID]
```

**To get `GEMINI_API_KEY`:** [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — requires paid billing (prepay minimum $10) to avoid free-tier quota limits.

### GitHub Actions — Repository Secrets

| Secret | Notes |
|---|---|
| `APPS_SCRIPT_URL` | Baked into Svelte bundle at compile time |
| `CLASPRC_JSON` | OAuth token for `clasp push` — re-run `clasp login` if it expires |
| `CUSTOM_DOMAIN` | Written to `CNAME` at build time |

### User Devices — localStorage + 1Password

**1Password entry** (both users):
```
Title:    Cash Flow App
URL:      cashflow.yourdomain.com
Password: [AUTH_TOKEN value]
```

`AUTH_TOKEN` is entered once on first visit and saved to `localStorage`. Never stored in the repo or build.

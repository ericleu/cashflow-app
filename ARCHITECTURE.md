# Architecture

## Overview

Cash Flow is a two-tier personal web app: a static Svelte frontend hosted on GitHub Pages, and a Google Apps Script backend that acts as a JSON API. There is no dedicated server — Apps Script runs on Google's infrastructure for free.

```
cashflow.yourdomain.com
  (GitHub Pages — Svelte)
          │
          │  POST /exec  (text/plain, no CORS preflight)
          │  body: { token, action, ...payload }
          ▼
Google Apps Script Web App
  (TypeScript, deployed via clasp)
          │
    ┌─────┴─────┐
    ▼           ▼
Google       Google
Sheets       Drive
(data)      (photos)
    ▲
Gemini API
(Vision OCR)
```

---

## Frontend

### Hosting
GitHub Pages — free, HTTPS, custom domain via CNAME. Deployed automatically on push to `main` when files under `frontend/` change.

### Framework
Svelte + Vite. Compiles to vanilla JS with no runtime framework overhead. Output is a static bundle suitable for GitHub Pages.

### Key Modules

| File | Responsibility |
|---|---|
| `App.svelte` | Root component, routing |
| `routes/Home.svelte` | Home screen — Take Photo, Choose Photo, Add Manually |
| `routes/Scan.svelte` | Receipt preview, auto-scans on mount, loading state |
| `routes/Entry.svelte` | Shared form — used for manual entry and scan fallback |
| `routes/Audit.svelte` | Confirmation screen with edit / delete |
| `lib/api.ts` | All fetch calls to Apps Script |
| `lib/camera.ts` | File input, base64 encoding |
| `lib/auth.ts` | Token read/write from localStorage |
| `lib/store.ts` | Svelte stores for shared state |

### Environment Variables
Only one variable is baked into the build at compile time:

```
VITE_SCRIPT_URL   ← Apps Script deployment URL
```

Set as a GitHub Actions secret. All other secrets stay out of the build entirely.

### Authentication (Client Side)
- On first visit, user is shown a token entry screen
- 1Password autofills the token (keyed to `cashflow.yourdomain.com`)
- Token saved to `localStorage` — never re-asked on this device
- Every API call includes the token in the POST body
- Token is never baked into the build or stored in the repo

---

## Backend — Google Apps Script

### Role
Acts as a pure JSON API. No HTML is served. All routes go through `doPost(e)`.

### CORS Strategy
Apps Script does not handle `OPTIONS` preflight requests. To avoid this, the frontend sends POST requests without a `Content-Type` header. Browsers treat this as a "simple request" — no preflight is triggered. Apps Script reads the body via `e.postData.contents`.

```typescript
// Frontend — no Content-Type header
fetch(SCRIPT_URL, {
  method: 'POST',
  body: JSON.stringify({ token, action, ...payload })
})

// Apps Script — parses string body
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
}
```

### Request / Response Shape

Every request:
```json
{
  "token": "shared-secret",
  "action": "addEntry | getDropdowns | extractReceipt | updateEntry | deleteEntry",
  "payload": { ... }
}
```

Every response:
```json
{ "ok": true, "data": { ... } }
{ "ok": false, "error": "message" }
```

### Module Structure

| File | Exports |
|---|---|
| `main.ts` | `doPost(e)` — validates auth, routes action |
| `config.ts` | `isAuthorized()`, `corsResponse()`, `getCashSheetID()` |
| `dropdowns.ts` | `getDropdowns()` — reads `drop down list` sheet tab |
| `sheets.ts` | `addEntry()`, `updateEntry()`, `deleteEntry()` |
| `drive.ts` | `addReceipt()` — uploads photo to Drive, returns file ID |
| `claude.ts` | `extractReceiptWithClaude()` — calls Gemini Vision API |

### Deployment
- Deployed via `clasp push` from GitHub Actions
- Execute as: **Me** (owner's Google account)
- Access: **Anyone** (auth token provides the security layer)
- Served at `@HEAD` — always runs the latest pushed code, no versioning required

---

## Data Layer

### Google Sheets
One spreadsheet per year, stored in Google Drive under a consistent folder structure.

**Sheet: `Detail` tab**

| Col | Field | Type | Notes |
|---|---|---|---|
| A | Date | Date | MM/DD/YYYY |
| B | Description | String / Formula | Plain text, or `=HYPERLINK(...)` linking to Drive receipt |
| C | Amount | Number | Dollar amount |
| D | Category | String | From `drop down list` tab e.g. `食 - Groceries` |
| E | Payment | String | From `drop down list` tab e.g. `Apple Card` |
| F | Tag | String | Optional trip/person tag e.g. `User @ Location` |
| G | 待查證 | String | `yes` = needs verification (highlighted yellow) |

**Sheet: `drop down list` tab**

| Col | Content |
|---|---|
| A | All category values (grouped by 食衣住行育樂收入金融無) |
| B | All payment method values |
| C | Tag values (trip/person labels) |

### Row Insertion
New entries are inserted **before** the first row containing a Date value in column A. This keeps the most recent entries at the top while preserving fixed placeholder rows at the top of the sheet.

### Sheet ID Discovery
No Sheet IDs are hardcoded. On first request for a given year, `getCashSheetID()` traverses Drive:

```
CASHFLOW_FOLDER_ID (Script Property)
  → find subfolder named "{year}"
  → find Google Sheet inside it
  → store ID as sheetId_{year} in Script Properties
  → return ID
```

All subsequent requests for that year read from Script Properties — no Drive traversal. IDs persist indefinitely. New year folders auto-populate on first January request.

### Google Drive
Receipt photos are stored in a `receipts/` subfolder alongside each year's spreadsheet. The folder is auto-created on first use if it doesn't exist. The Drive file ID is embedded in the Sheet entry as a hyperlink on the Description field.

---

## OCR Pipeline

```
Frontend
  → base64-encodes photo
  → POSTs to Apps Script (action: extractReceipt)

Apps Script (claude.ts)
  → calls Gemini API (gemini-2.0-flash-lite — lowest cost, sufficient for receipts)
  → sends base64 image + structured prompt
  → prompt includes full category list for accurate matching
  → returns JSON: { date, description, amount, suggestedCategory }

Apps Script (main.ts)
  → if all required fields present (date, amount, category):
      → saves entry to Sheets immediately
      → returns saved entry to frontend
  → if any required field is null:
      → returns partial data to frontend
      → frontend shows form with missing fields highlighted

Frontend
  → if auto-saved: shows Audit screen
  → if fallback:   shows Entry form pre-populated, user completes and saves
```

**Cost**: ~$0.04/month at ~150 receipts/month using gemini-2.0-flash-lite (~$0.075/1M input tokens).

---

## Authentication

### Approach
Shared token — appropriate for two known, trusted users. No Google OAuth required.

### Flow
```
User visits cashflow.yourdomain.com
  → token screen shown (1Password autofills)
  → token stored in localStorage
  → every API call includes token in POST body
  → Apps Script reads token from Script Properties and compares
  → unauthorized requests receive { ok: false, error: "Unauthorized" }
```

### Why Not Google OAuth
- Adds ~200+ lines of boilerplate (token refresh, PKCE, Cloud Project setup)
- Tokens expire hourly and require refresh logic
- For two known users, shared token provides equivalent security with far less complexity

---

## CI/CD

Two independent GitHub Actions workflows:

| Workflow | Trigger | Action |
|---|---|---|
| `deploy-frontend.yml` | Push to `main`, changes in `frontend/` | Build Svelte → deploy to `gh-pages` branch |
| `deploy-apps-script.yml` | Push to `main`, changes in `apps-script/` | Validate clasp token → compile TS → `clasp push` |

### clasp Token Validation
The Apps Script workflow validates the OAuth token **before** any build steps. If expired, the pipeline fails immediately with self-contained fix instructions — no silent failures. GitHub notifies the committer by email on failure.

---

## Year Rollover

`createNewYearSetup(year)` in `config.ts` handles the annual setup:

1. Creates `{year}/` subfolder under the Cash flow parent folder
2. Copies previous year's Sheet (preserves dropdowns, formatting, placeholder rows)
3. Clears `Detail` tab entries — preserves placeholder rows at top
4. Creates `receipts/` subfolder
5. New Sheet ID auto-populates in Script Properties on first expense entry of the year

Can be run manually or triggered via a time-based Apps Script trigger on January 1st.

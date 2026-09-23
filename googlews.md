# Google Workspace-First Quote System — Spec (TAKA Scientific)

**Status:** Spec v1.0 · Aug 2026
**Business:** TAKA Scientific — UAE lab equipment distributor (quote-based, not e-commerce)
**Goal:** A zero-fee, AI-assisted quote pipeline built entirely on the Google Workspace tools TAKA already pays for. WhatsApp stays as a **human-only** channel (no API, no per-message fees). The same "agent brain" can later plug into WhatsApp if automation is ever wanted.

---

## 1. Why Google Workspace-first

| Reason | Detail |
|---|---|
| No platform fees | The WhatsApp API would cost ~$40–85/mo post-Oct 2026 (per-message service pricing). This plan: **$0/mo** |
| LLM already included | Gemini is bundled into most Workspace Business plans (2026); Gemini API also has a generous free tier |
| Fast launch | No Meta verification, webhooks, or template approvals — days, not weeks |
| Team familiarity | Sheets, Gmail, Forms, Chat, Docs are already used by the team |
| Same brain, no waste | The chat agent built here plugs into WhatsApp later if volume justifies it |

---

## 2. Architecture

```
Customer on taka.ae
      │
      ├── AI Chat Widget (on every page) ──► Cloudflare Worker
      │                                      ├── products.json (exact product lookup)
      │                                      ├── brand knowledge docs (unlisted products)
      │                                      └── Gemini API (the LLM)
      │
      ├── Quote Form (Astro form ──POST──► Apps Script Web App)
      │
      └── WhatsApp buttons (human only, click-to-chat, no API)
                          │
                          ▼
              Apps Script Web App (Google)
              ├── Google Sheet "Quote CRM"  (append lead row)
              ├── Gmail                     (email formatted request to info@taka.ae)
              └── Google Chat "Quotes" space (instant alert to sales)
                          │
                          ▼
        Sales team: open row → fill quote from Docs template → send via Gmail
              → update Sheet status: New → Contacted → Quoted → Won/Lost
```

**Cost of the entire architecture: $0/month extra.** Everything runs on free tiers of tools you already have.

---

## 3. Components (detailed)

### 3.1 Google Sheets — the quote CRM (single source of truth)

Sheet name: **`Quote CRM`** (one tab: `Leads`)

Columns (A–N):

| Col | Field | Example |
|---|---|---|
| A | Timestamp | 2026-08-15 10:32 |
| B | Status | New / Contacted / Quoted / Won / Lost / No reply |
| C | Name | Fatima Al Ali |
| D | Company | ADNOC Labs |
| E | Email | f.alali@company.ae |
| F | Phone | +971 50 123 4567 |
| G | Brand | Hach / IKA / Unlisted |
| H | Product / Application | DR3900 spectrophotometer |
| I | Specs / Requirements | COD + ammonia kits, 110V |
| J | Quantity | 2 |
| K | Facility type | Water testing lab |
| L | Timeline | Urgent – 2 weeks |
| M | Source | Web chat / Form / WhatsApp / Call |
| N | Assigned to + Notes | Omar – needs UAE cert |

Rules:
- One lead = one row. No other database needed.
- Sheet keeps full version history automatically.
- Status dropdown (Data validation) for the team.
- Add a `Summary` tab with QUERY()/pivot for weekly numbers if desired.

### 3.2 Google Forms — quote intake (fastest fix, Phase 0)

- Create a **"Request a Quote"** form with fields matching columns C–L (+ name/email required).
- **Responses → create new spreadsheet** → points at the `Quote CRM` sheet directly (or append via Apps Script for the Chat alert).
- Turn on **response email notifications** (Settings → Collect email addresses → notification to info@taka.ae).
- Embed on the site (`<iframe>` or a "Request a quote" button linking to the form).
- **Nicer alternative (recommended):** keep the styled Astro form on `contact.astro` and POST it to the Apps Script Web App (§3.3) — same fields, your branding, and the script controls Sheet + email + Chat in one place.

### 3.3 Apps Script — the bridge (Web App)

One script attached to the Sheet. Deployed as a **Web App** (Execute as: me, Access: Anyone with the link).

**What `doPost(e)` does:**
1. Parse the incoming JSON (from chat agent or site form).
2. Append a row to `Quote CRM`.
3. Email the formatted request to info@taka.ae via `MailApp`.
4. Post an alert to the Google Chat **"Quotes"** space via its webhook URL.

**Code:**

```javascript
const SHEET_NAME = 'Quote CRM';
const SALES_EMAIL = 'info@taka.ae';
const CHAT_WEBHOOK = 'https://chat.googleapis.com/v1/spaces/XXXX/messages?key=...';

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  sheet.appendRow([
    new Date(), 'New', data.name, data.company, data.email, data.phone,
    data.brand, data.product, data.specs, data.quantity,
    data.facility, data.timeline, data.source || 'Form', ''
  ]);

  // 1. Email to sales inbox
  MailApp.sendEmail({
    to: SALES_EMAIL,
    subject: `Quote request: ${data.product || 'No product'} — ${data.name}`,
    body:
`New quote request (${data.source || 'form'})

Name:        ${data.name}
Company:     ${data.company}
Email:       ${data.email}
Phone:       ${data.phone}
Brand:       ${data.brand}
Product:     ${data.product}
Specs:       ${data.specs}
Quantity:    ${data.quantity}
Facility:    ${data.facility}
Timeline:    ${data.timeline}

Row added to Quote CRM.`
  });

  // 2. Google Chat alert
  UrlFetchApp.fetch(CHAT_WEBHOOK, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      text: `📩 New quote: *${data.product || 'No product'}* (${data.brand || 'brand?'}) — ${data.name}, ${data.company}. Timeline: ${data.timeline || 'n/a'}.`
    })
  });

  return ContentService.createTextOutput('OK');
}
```

Deployment notes:
- Script → **Deploy → New deployment → Web app** → Execute as **Me**, Access **Anyone**.
- Keep the URL secret-ish (it's unauthenticated by design); it only appends rows.
- Quotas (free): 20,000 script executions/day, 100 emails/day — far beyond this use case.

### 3.4 Gemini — the LLM (replaces DeepInfra)

- **Check your Workspace admin console** → Billing/Apps: most Business plans bundle Gemini in 2026.
- Even without the bundle, the **Gemini API free tier** is generous (Gemini Flash: ~1,500 requests/day free) — enough for hundreds of chat conversations daily.
- The Cloudflare Worker calls Gemini's API directly (OpenAI-compatible endpoint available, so the Worker code is nearly identical to a DeepInfra/OpenAI call).

**Worker call sketch (Gemini API):**

```javascript
const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + GEMINI_KEY, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: AGENT_SYSTEM_PROMPT }] },
    generationConfig: { temperature: 0.2 }
  })
});
```

- If the free tier ever runs out: Gemini Flash pricing is ~$0.10–0.30 per 1M input tokens — still under $1/mo at your volume.
- **System prompt** enforces: quote-only pricing (never invent prices), only serve TAKA's brands, no hallucinated specs, message economy, escalate to human for pricing/orders.

### 3.5 Cloudflare Worker — the chat agent brain

Same architecture as the WhatsApp plan, minus the webhook:

- Endpoint `POST /chat` served to the site's chat widget.
- Bundles `products.json` (exact lookup — zero hallucination on listed SKUs).
- Brand knowledge docs (markdown/OKF files) → searched via Vectorize or simple fetch for **unlisted products within served brands**.
- Session state in D1/KV (conversation context per visitor).
- On completed lead → `POST` to the Apps Script Web App URL (§3.3).
- Runs on the Cloudflare **free tier** (100k requests/day). No cost.

### 3.6 Gmail

- The bridge emails every lead to info@taka.ae; sales replies with the quotation from the same thread.
- Quotes: use the Docs template (§3.8) → **File → Email as PDF attachment** (or download PDF → attach in Gmail).

### 3.7 Google Chat — internal alerts (optional but recommended)

- Create a **"Quotes"** space with the sales team.
- Add an incoming webhook (Space settings → Apps → Webhooks) → paste the URL into `CHAT_WEBHOOK` in the script.
- Result: every qualified lead pings the team instantly — no one misses a quote request.

### 3.8 Google Docs — quote template

- Create **`Quote Template`**: header (TAKA logo, TRN, contact), customer block, item table (model, description, qty, unit price, total), payment terms, validity (e.g., 30 days), delivery terms.
- Placeholders like `{{Name}}`, `{{Company}}`, `{{Items}}` — sales duplicates the doc, replaces placeholders, exports PDF.

---

## 4. Quote lifecycle (end to end)

1. **Chat**: customer asks about a product (listed or unlisted within TAKA's brands) → agent answers; if they want a quote, agent collects: name, company, email/phone, brand, product, specs, qty, facility, timeline.
2. **Bridge**: agent/form POSTs the lead → Apps Script → Sheet row + Gmail + Chat alert (≈instant).
3. **Sales**: sees Chat alert / email → opens `Quote CRM` row → contacts customer (phone/WhatsApp) → fills quote from Docs template → emails PDF from Gmail.
4. **Tracking**: sales sets row status → New → Contacted → Quoted → Won/Lost. Monthly numbers come straight from the Sheet.

---

## 5. Website changes (`site/`)

| File | Change |
|---|---|
| `src/pages/contact.astro` | Replace dead `action="#"` form: on submit, `fetch(POST)` the fields to the Apps Script Web App URL → show "We'll be in touch" state |
| `src/layouts/Layout.astro` | Add the chat widget script (opens the Worker `/chat` endpoint), styled to match the site |
| WhatsApp buttons (contact page, header) | Keep as human click-to-chat (`wa.me`), labeled "Talk to a specialist" |

**Contact form JS sketch:**

```javascript
document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  await fetch('https://script.google.com/macros/s/APPSCRIPT_ID/exec', {
    method: 'POST',
    body: JSON.stringify({ ...data, source: 'Form' })
  });
  e.target.innerHTML = '<p class="form-success">Thanks — our team will send you a quote shortly.</p>';
});
```

---

## 6. Implementation roadmap

| Phase | What | Effort | Cost |
|---|---|---|---|
| 0 | Google Form → Sheet + email notifications; replace the dead contact form | Hours | $0 |
| 1 | Apps Script Web App bridge (custom form POST → Sheet + email + Chat alert) | Half day | $0 |
| 2 | Worker + Gemini chat widget with `products.json` lookup | 2–3 days | $0 |
| 3 | Brand knowledge docs (OKF-style) for unlisted products | 2–3 days | $0 |
| 4 | Docs quote template, Chat space, CRM status workflow, Sheet dashboard | Day | $0 |
| 5 (optional) | Same brain → WhatsApp API (only if volume justifies the ~$40–85/mo) | Later | — |

---

## 7. Cost summary

| Item | Cost |
|---|---|
| Google Workspace (already paid) | $0 extra |
| Gemini LLM (bundled or free tier) | $0 |
| Sheets / Forms / Apps Script / Gmail / Chat / Docs | $0 |
| Cloudflare Worker + D1 + Vectorize (free tier) | $0 |
| WhatsApp (human click-to-chat, no API) | $0 |
| **Total** | **~$0/month** |

*Comparison: the WhatsApp-API plan (post-Oct 2026) is ~$40–85/mo at typical volume — roughly $500–1,000/year.*

---

## 8. Risks & notes

- **Gemini free-tier limits**: monitor usage; upgrade path (paid API) is still under ~$1/mo at this volume.
- **Apps Script quotas**: 20k executions/day, 100 emails/day — plenty; hard cap only matters if you get thousands of leads/day.
- **Sheet as CRM**: no fancy pipeline UI; fine for a small team. Add filters/pivots; Sheet keeps history.
- **Form styling**: Google Forms look is generic — use the custom Astro form → Apps Script route for brand quality.
- **Customers who never visit the site**: WhatsApp (human) and the existing phone/email channels still cover them — this plan doesn't remove channels, it removes the *automation fees*.
- **Single point of failure**: if Apps Script Web App URL changes (redeploys sometimes create new URLs), update the Worker and form JS. Use "New version" deployments that preserve the URL where possible.

---

## 9. Open questions before build

- [ ] Which Workspace plan is TAKA on — is Gemini bundled? (Admin console → Billing)
- [ ] Who owns the **Quotes** Google Chat space / responds first?
- [ ] Chat widget: every page or catalogue pages only?
- [ ] Do we keep the current WhatsApp numbers for human chat, or add a dedicated one?
- [ ] Quote template: standard payment terms and validity (30 days?) to bake in.

---

## 10. Decision summary

- ✅ **Zero-fee pipeline** — Google Workspace does the work; no Meta per-message costs.
- ✅ **Gemini is the LLM** — bundled with the plan or the free API tier.
- ✅ **Google Sheet is the CRM** — no new software to buy or learn.
- ✅ **WhatsApp is human-only** — kept for reach and trust; automation is a later optional phase.
- ✅ **Same agent brain** — if WhatsApp automation is ever added, the Worker + brand docs + lead bridge already exist.

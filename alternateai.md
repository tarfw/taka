# Zero-Cost AI Quote System — Alternate Plan (TAKA Scientific)

**Status:** Plan v1.0 · Aug 2026
**Business:** TAKA Scientific — UAE lab equipment distributor (quote-based, not e-commerce)
**Goal:** The same AI quote agent as the other plans, but with **no Google Workspace subscription** and **$0/month recurring cost** — built on free tiers of Cloudflare (already in use), Gemini API, and free email/alert services.

---

## 1. Why this plan

| Pain | Solution |
|---|---|
| Google Workspace costs ~$7–22/user/mo (UAE pricing) | This plan needs **no Workspace at all** — $0/month |
| WhatsApp API would cost ~$40–85/mo post-Oct 2026 | WhatsApp stays **human-only** (click-to-chat, no API) |
| Paid LLM (DeepInfra/OpenAI) adds another bill | **Gemini API free tier** (~1,500 requests/day) — free |
| New platforms to learn | Everything reuses Cloudflare (already hosting the site) + free tools |

**Total recurring cost: $0/month** at expected volume.

---

## 2. Architecture

```
Customer on taka.ae
      │
      ├── AI Chat Widget (every page) ──► Cloudflare Worker
      │                                    ├── products.json (exact product lookup)
      │                                    ├── brand knowledge docs (unlisted products)
      │                                    └── Gemini API free tier (the LLM)
      │
      ├── Quote Form (Astro form, styled) ──► same Worker
      │
      └── WhatsApp buttons (human only, click-to-chat, no API)
                          │
                          ▼
                 Cloudflare Worker
                 ├── D1 database  (leads = the CRM)
                 ├── Resend/Brevo free tier (email to sales inbox)
                 └── Telegram bot / WhatsApp group (instant team alert)
                          │
                          ▼
        Sales team: open leads page → send PDF quote from Zoho Mail
              → update lead status in the admin page
```

**Every box is a free tier.** Nothing in this diagram costs money at the expected volume.

---

## 3. Components (detailed)

### 3.1 Cloudflare Worker — the brain (already your stack)

- Endpoint `POST /chat` — served to the site chat widget.
- Endpoint `POST /lead` — accepts the site's quote form submissions (replaces the dead `action="#"` form).
- Bundles `products.json` (~500 products) for exact, hallucination-free lookup.
- Brand knowledge docs (OKF-style markdown, one per served brand) — searched when the product is **unlisted but within TAKA's brands**.
- Session state in D1 (conversation context per visitor).
- System prompt enforces: quote-only pricing (never invent prices), only TAKA's brands, no invented specs, message economy, escalate to human for pricing/orders.
- Runs on the Cloudflare **free tier**: 100,000 requests/day — far beyond usage.

### 3.2 D1 (Cloudflare) — the lead CRM

Simple table, no subscriptions:

```sql
CREATE TABLE leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT DEFAULT (datetime('now')),
  status TEXT DEFAULT 'New',          -- New / Contacted / Quoted / Won / Lost
  name TEXT, company TEXT, email TEXT, phone TEXT,
  brand TEXT, product TEXT, specs TEXT, quantity TEXT,
  facility TEXT, timeline TEXT, source TEXT, notes TEXT
);
```

- Worker `INSERT`s on each completed lead.
- A small admin page on the site (`/leads`, behind a simple password or Cloudflare Access) lists the table with a status dropdown.
- Backup: D1 supports automatic exports; or a nightly export to a free Google Sheet (personal account) if desired.

### 3.3 Gemini API — the LLM (free tier, no Workspace needed)

- The Gemini API free tier is generous for this workload: ~1,500 requests/day (Gemini Flash class model).
- Signup is a **free personal Google account** — no Workspace license involved.
- Worker calls it directly (OpenAI-compatible endpoint available):

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

- If the free tier is ever exceeded: Gemini Flash paid pricing is still under ~$1/month at this volume. No risk.

### 3.4 Email — free custom-domain delivery

| Job | Service | Free tier |
|---|---|---|
| **Mailboxes** (info@taka.ae + 2 team members) | **Zoho Mail** — real @taka.ae inboxes, mobile apps, IMAP | Free, 5 users × 5 GB |
| **Forwarding fallback** | **Cloudflare Email Routing** — info@taka.ae → any inbox | Free, unlimited |
| **Automated sends** (lead notifications from the Worker) | **Resend** (or Brevo) — send from your domain via API with SPF/DKIM | 3,000 emails/mo (100/day) |

DNS is a one-time setup (MX + SPF + DKIM) — Cloudflare's dashboard makes it straightforward.

### 3.5 Alerts — Telegram bot (or WhatsApp group)

- **Telegram**: create a bot via @BotFather (free), get a token + chat ID; the Worker fires a `sendMessage` call on every qualified lead:

```javascript
await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: TG_CHAT_ID,
    text: `📩 New quote: ${product} (${brand}) — ${name}, ${company}. Timeline: ${timeline}`
  })
});
```

- **Alternative:** a WhatsApp group (no API — sales already lives there). Note: automated messages into WhatsApp need the paid API; Telegram is the free automated path. Use both: Telegram for bot alerts, WhatsApp group for human coordination.

### 3.6 Quote sending — human, from Zoho Mail

- Quote template: simple HTML page → **Print/Save as PDF** (or a free Google Doc on a personal account).
- Sales fills it and emails the PDF from info@taka.ae (Zoho Mail). No automation needed for a quote business — humans own pricing.

---

## 4. Website changes (`site/`)

| File | Change |
|---|---|
| `src/pages/contact.astro` | Wire the form: on submit → `fetch POST /lead` to the Worker → success message. No backend form service needed |
| `src/layouts/Layout.astro` | Add the chat widget script (calls `/chat`) |
| WhatsApp buttons (contact/header) | Keep as human click-to-chat (`wa.me`) |
| `src/pages/leads.astro` (new) | Simple admin table over D1, password-protected, with status dropdown |

**Contact form JS sketch:**

```javascript
document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  await fetch('https://worker.taka.workers.dev/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, source: 'Form' })
  });
  e.target.innerHTML = '<p class="form-success">Thanks — our team will send you a quote shortly.</p>';
});
```

---

## 5. Cost summary

| Item | Cost |
|---|---|
| Cloudflare Pages + Worker + D1 (free tiers) | $0 |
| Gemini API free tier | $0 |
| Zoho Mail (5 free mailboxes) | $0 |
| Cloudflare Email Routing | $0 |
| Resend/Brevo free tier | $0 |
| Telegram bot | $0 |
| WhatsApp (human click-to-chat) | $0 |
| **Total** | **$0/month** |

*Versus: WhatsApp API plan ~$40–85/mo (post-Oct 2026) · Workspace-first plan ~$5–21/mo (3 users).*

---

## 6. Implementation roadmap

| Phase | What | Effort | Cost |
|---|---|---|---|
| 0 | Zoho Mail free + DNS (MX/SPF/DKIM) for @taka.ae | Half day | $0 |
| 1 | Worker: `/chat` + `/lead`, D1 table, Resend email, Telegram alert | 2–3 days | $0 |
| 2 | Chat widget + wire the contact form on the site | Day | $0 |
| 3 | Brand knowledge docs (OKF-style) for unlisted products | 2–3 days | $0 |
| 4 | Leads admin page (`/leads`) with status workflow | Day | $0 |
| 5 (optional) | Same brain → WhatsApp API (only if volume justifies it) | Later | — |

---

## 7. Risks & tradeoffs

- **Free-tier limits**: Resend 100 emails/day, Gemini ~1,500 requests/day, D1 writes — all far above expected usage, but not unlimited. Monitor; paid upgrades exist and are cheap.
- **DIY CRM**: D1 + admin page gives a simple table, not Sheets' pivots. Fine for a small team; add filters later.
- **Zoho Mail free**: 5 users × 5 GB, no Google ecosystem. If the team later needs Google apps, the Workspace migration is independent of this system (leads live in D1, not Google).
- **No managed support**: it's your stack — but it's one Worker plus a few free services. Small and boring by design.
- **Data residency**: D1 stores data in Cloudflare's network (regional options exist); fine for quote leads. If strict UAE data-residency requirements appear, review Cloudflare's D1 location settings.

---

## 8. Open questions before build

- [ ] Confirm Zoho Mail free is acceptable for the three team mailboxes (vs forwarding only).
- [ ] Pick Resend vs Brevo (both free) — Resend: 3,000/mo; Brevo: 300/day. Either works.
- [ ] Telegram group vs WhatsApp group for team alerts (or both).
- [ ] Where the `/leads` admin page should live and who gets access (password vs Cloudflare Access).
- [ ] Keep WhatsApp human-only, or plan the optional API phase later.

---

## 9. Decision summary

- ✅ **$0/month** — no Workspace, no WhatsApp API, no paid LLM at expected volume.
- ✅ **Cloudflare-native** — reuses the stack already hosting taka.ae.
- ✅ **Real @taka.ae email** via Zoho Mail free — professional look, zero cost.
- ✅ **WhatsApp stays human** — reach and trust without per-message fees.
- ✅ **Same agent brain** — future WhatsApp API automation can reuse the Worker, brand docs, and lead pipeline unchanged.

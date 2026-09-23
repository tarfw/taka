# WhatsApp AI Agent — Final Plan (TAKA Scientific)

**Status:** Plan v1.0 · Aug 2026
**Business:** TAKA Scientific — UAE lab equipment distributor (quote-based, not e-commerce)
**Goal:** A WhatsApp AI agent that answers product questions (listed + unlisted within served brands), qualifies quote requests, and delivers leads into Google Workspace.

---

## 1. What the agent does

1. Answers questions about the **~500 listed products** (`site/src/data/products.json`) — exact lookup, no hallucinated specs.
2. Answers questions about **unlisted products** within the brands TAKA serves (Jasmea, IKA, Hach, Hanil, ELGA, TOPTION, ETELUX…) using a **brand knowledge base** (markdown docs — the OKF layer) that lists each brand's full product families beyond what's on the site.
3. If a product is outside TAKA's brands, or genuinely unknown: **never invents answers** — offers alternatives and/or hands off.
4. **Qualifies quote requests**: collects name, company, product/application, specs, quantity, facility type, timeline.
5. **Delivers the lead** into Google Workspace (Google Sheet + email to the sales inbox).
6. **Hands off to a human** on demand (pricing, orders, complex needs) — the human continues the same thread.

**Non-negotiable guardrails:**
- No prices, lead times, or availability stated as fact — always "our team will confirm in your quotation."
- Only serve brands TAKA carries.
- Escalate to a human when the customer asks for pricing, an order, or seems unsatisfied.

---

## 2. Architecture (all on your existing Cloudflare stack)

```
Customer (UAE, +971)
      │  wa.me click from site / inbound message
      ▼
WhatsApp Business Cloud API (Meta)
      │  webhook (inbound message JSON)
      ▼
Cloudflare Worker  ──►  D1 / KV (session state, lead storage)
      │                 Vectorize (brand knowledge search)
      │                 products.json (bundled, exact lookup)
      │                 DeepInfra API (DeepSeek V4 Flash)
      ▼
Apps Script Web App (Google Workspace)
      │  appends lead to Google Sheet + emails info@taka.ae
      ▼
Sales team → replies with quotation (human continues thread)
```

**Components:**

| Piece | Choice | Why |
|---|---|---|
| WhatsApp channel | Meta WhatsApp Cloud API (direct, no BSP) | Free to connect, no monthly fee, AED billing |
| Business number | +971 number (reuse existing) | UAE trust; recipients billed at UAE rate |
| Backend | Cloudflare Worker | Already on Cloudflare Pages; free tier |
| State | D1 (or KV) | Sessions + leads; free tier |
| Product lookup | `products.json` bundled in Worker | Exact match, zero hallucination risk |
| Brand knowledge | Markdown docs → Vectorize | Covers unlisted products per brand |
| LLM | **DeepSeek V4 Flash via DeepInfra** | Cheapest provider (~$0.09/M in, ~$0.18/M out) |
| Lead intake | Google Apps Script Web App | Free, lives in existing Google Workspace |

---

## 3. How a conversation flows

1. Customer messages the number (or clicks `wa.me` from the site).
2. Webhook → Worker → session loaded from D1.
3. Agent classifies intent:
   - **Product question** → exact match in `products.json` → reply with name, category, link; "request a quote" prompt.
   - **Unlisted / "do you have X brand?"** → search brand knowledge docs → reply with what the brand offers + "we can source this — request a quote."
   - **Quote request** → structured Q&A (name, company, product, specs, qty, facility, timeline).
   - **Unknown / out-of-scope** → alternatives or human handoff.
4. Lead completed → POST to Apps Script → Google Sheet row + email to sales inbox with the full requirement.
5. Human replies with the quotation in the same thread. Agent stays quiet or assists.

---

## 4. WhatsApp pricing — post-Oct 1, 2026 (UAE)

**Timeline that matters:**
- Until **Sep 30, 2026**: agent replies inside the 24-hour window are **FREE**.
- From **Oct 1, 2026** (global change, UAE included): every business-sent message is charged per message. Official UAE rates publish by **Sep 1, 2026**; benchmarked to UAE utility/auth rate ≈ **$0.0157 (AED 0.058)** per message.
- Customer → business messages: **always free**.
- Replies to customers who click WhatsApp from the website: free for **72 hours** (free entry-point window), even after Oct 1.

**Rates (UAE, current):**

| Category | Rate (USD) | Rate (AED) |
|---|---|---|
| Service reply (from Oct 1) | ~$0.0157 | ~0.058 |
| Utility template | ~$0.0157 | ~0.058 |
| Marketing template | ~$0.0499 | ~0.183 |
| Authentication template | ~$0.0178 | ~0.065 |

**LLM cost:** DeepSeek V4 Flash via DeepInfra ≈ **$0.001 per conversation** — negligible.

**Estimated monthly bill (post-Oct, ~8 agent messages per conversation):**

| Scenario | Conversations/mo | WhatsApp | LLM | Total/mo |
|---|---|---|---|---|
| Light (5/day) | 110 | ~$13.80 | ~$0.11 | **~$14** |
| Typical (15/day) | 330 | ~$41.50 | ~$0.33 | **~$42** |
| Heavy (30/day) | 660 | ~$82.90 | ~$0.66 | **~$84** |

Until Sep 30 the same agent costs **~$1/month**.

---

## 5. Data & content work needed

1. **Brand knowledge base** — new: one markdown doc per served brand covering full product families beyond the site (this is the OKF knowledge layer). Feeds Vectorize.
2. **products.json** — exists; keep as source of truth; Worker bundles it.
3. **System prompt / quote playbook** — the rules in §1 + §3.
4. **Apps Script web app** — new: lead → Sheet + email.
5. **Contact page links** — point existing WhatsApp buttons at the agent number (currently placeholder `javascript:void(0)` links).

---

## 6. Roadmap

| Phase | What | Est. effort |
|---|---|---|
| 0 | Wire the contact form (currently `action="#"` — quotes go nowhere) | Hours |
| 1 | Cloudflare Worker: webhook + session + product lookup + DeepInfra LLM | Days |
| 2 | Brand knowledge base docs + Vectorize search | Days |
| 3 | Apps Script lead bridge → Sheet + email | Hours |
| 4 | Chat widget on the website (same brain) | Days |
| 5 | WhatsApp launch — **before Oct 1, 2026 to bank the free service replies** | — |
| 6 | Handoff queue, analytics, tuning | Ongoing |

---

## 7. Open items / assumptions

- [ ] Confirm official UAE service-message rate (Meta publishes by **Sep 1, 2026**).
- [ ] Decide which +971 number to use for the agent.
- [ ] Meta business verification (free; needs TRN/business docs).
- [ ] Validate DeepInfra vs DeepSeek first-party cache pricing at real traffic.
- [ ] Message-volume assumption: ~8 agent messages per conversation — tune after launch (fewer, fuller replies = cheaper).

---

## 8. Key decisions locked

- ✅ No BSP — direct Meta Cloud API.
- ✅ DeepSeek V4 Flash on DeepInfra (cheapest inference provider).
- ✅ Google Workspace (Apps Script) as the quote inbox, not a paid CRM.
- ✅ JSON for product data; markdown/OKF for brand knowledge; agent is the consumer of both.
- ✅ Launch before Oct 1, 2026 to run service replies free.

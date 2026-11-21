# 🛒 VibeCart — Shop by Talking

> **Track**: Conversational Commerce
> **Event**: Build with Agora – Bengaluru 2026 (Solo Hackathon)
> **Problem Statement**: End-to-End Conversational Shopping

---

## 1. Pitch (One Liner)

**VibeCart is a voice-first shopping agent**: you *talk* to it, it understands your vibe ("something healthy for a keto dinner"), searches the catalog, compares options, checks stock, applies offers, adds to cart, and **actually completes checkout** — all in real time with natural interruptions and follow-ups (order summary, tracking, returns).

---

## 2. Why This Wins the Track

| Track Requirement | How VibeCart Delivers |
|---|---|
| Real-time voice (Agora ConvoAI) | Agora Conversational AI Engine + RTC voice channel, ultra-low latency, interruption handling |
| Murf AI Falcon TTS | Expressive, natural shopping-assistant voice via Falcon TTS |
| Agentic workflows | Tool calls: `search_catalog`, `check_inventory`, `apply_discount`, `add_to_cart`, `checkout`, `get_order_status` |
| Complete user journey | Before (prefs/offers) → During (discover/compare/cart) → After (order ID, tracking, return support) |
| Working demo | Live browser app — talk, hear, see cart update on screen in real time |

---

## 3. Architecture

```
┌─────────────────────────────┐
│   Web App (React / Vite)    │
│  - Agora RTC (mic ↔ agent)  │
│  - Live cart UI + receipts  │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│   Backend (Node/Express)    │
│                             │
│  1. Agora ConvoAI Engine    │
│     - ASR (Agora ARES)      │
│     - LLM (GPT-4o-mini or   │
│       Claude, w/ tools)     │
│     - TTS (Murf Falcon)     │
│  2. Tool Executor           │
│     - Catalog / Inventory   │
│     - Cart / Checkout       │
│     - Discounts / Orders    │
│  3. REST APIs (mock store)  │
└─────────────────────────────┘
```

### Key Components
- **Agora Conversational AI Engine**: orchestrates ASR → LLM → TTS turn loop over Agora RTC.
- **LLM with tool calling**: function definitions for cart/catalog/checkout actions; LLM decides when to call.
- **Murf Falcon TTS**: the agent's voice (natural, expressive).
- **Mock Commerce API** (built by us): products, inventory, cart, coupons, orders, tracking.
- **Live UI**: shows catalog hits, cart mutations, discount applied, order confirmation as the agent acts — proof of action on screen.

---

## 4. Tool Schema (Agentic Actions)

```json
[
  { "name": "get_user_context",       "desc": "Prefs, history, active offers for personalization" },
  { "name": "search_catalog",         "args": { "query", "category?", "budget?" } },
  { "name": "check_inventory",        "args": { "product_ids[]" } },
  { "name": "compare_products",       "args": { "product_ids[]" } },
  { "name": "apply_discount",         "args": { "cart_id", "code" } },
  { "name": "add_to_cart",            "args": { "product_id", "qty" } },
  { "name": "remove_from_cart",       "args": { "item_id" } },
  { "name": "initiate_checkout",      "args": { "cart_id", "payment_method" } },
  { "name": "get_order_status",       "args": { "order_id" } },
  { "name": "initiate_return",        "args": { "order_id", "reason" } }
]
```

---

## 5. Demo Flow (Judging Script ~90 sec)

1. **Initiate** — User opens app, taps *Talk*, greets agent: *"Hey, I need ingredients for a keto dinner tonight, budget around ₹800."*
2. **Discover** — Agent calls `get_user_context` + `search_catalog` → recommends 2–3 options aloud.
3. **Recommend & compare** — User interrupts: *"Wait, does the salmon have the lowest carbs?"* → Agent calls `compare_products`, answers mid-stream.
4. **Execute** — *"Add the salmon and zoodles, use the KETO10 coupon"* → `add_to_cart` ×2, `apply_discount` → UI shows cart updating + discount applied live.
5. **Confirm & follow up** — *"Checkout with saved card"* → `initiate_checkout` → Agent reads order ID & total, UI shows receipt + tracking link. User asks: *"How fast is delivery?"* → `get_order_status` follow-up.

**Wow factors**: live interruption handling, cart updating visually as agent talks, real discount math, real order record.

---

## 6. Tech Stack

| Layer | Choice |
|---|---|
| Voice transport | Agora RTC (Web SDK) |
| Agent runtime | Agora Conversational AI Engine (REST + Agents SDK) |
| ASR | Agora ARES (default) |
| LLM | OpenAI GPT-4o-mini with function calling (fast + cheap) |
| TTS | **Murf AI Falcon** |
| Backend | Node.js + Express |
| Store data | In-memory JSON catalog / SQLite |
| Frontend | React + Vite + Tailwind |
| Deploy | Localhost for demo; ngrok if REST webhooks needed |

---

## 7. Repo & Submission Checklist (due 12:30 PM IST)

- [ ] Public GitHub repo: `VibeCart` with README (name, problem statement, setup steps)
- [ ] Working prototype link / live local demo
- [ ] Agora Conversational AI integration documented (engine config, RTC channel, agent session flow)
- [ ] Murf Falcon TTS integration documented (voice config, TTS provider setup)
- [ ] Agentic workflow doc: tool list, what each tool does, example tool-call trace
- [ ] Demo video (screen recording of the 90-sec flow)
- [ ] Project description + selected problem statement in submission form

---

## 8. Build Timeline (Start 9:15 AM → Submit 12:30 PM)

| Time | Milestone |
|---|---|
| 9:15–9:40 | Scaffold repo, mock catalog API (products/inventory/cart/orders), Agora app keys |
| 9:40–10:30 | Agora ConvoAI agent session: RTC voice loop + LLM wired, basic talk works |
| 10:30–11:15 | Tool calling: catalog search, add to cart, apply discount, checkout |
| 11:15–11:45 | Murf Falcon TTS voice config; tune prompts & interruption behavior |
| 11:45–12:05 | UI: live cart panel, order receipt, tracking view |
| 12:05–12:20 | End-to-end dry run ×3, record demo video, finalize README |
| 12:20–12:30 | **Submit** ✅ |

---

## 9. Risks & Fallbacks

| Risk | Fallback |
|---|---|
| Murf Falcon key/integration slow | Ship with Agora default TTS, swap in Murf when ready (config-only change) |
| ConvoAI setup friction on-site | Use Agora quickstart agent template as base |
| Tool-call latency | Mock APIs in-memory; keep catalog small (~15 products) |
| Network flaky at venue | Local backend, minimal external calls; pre-record video backup |

---

## 10. Future Extensions (mention to judges)

- Multilingual (Hindi/Kannada) shopping assistant
- Voice commerce over PSTN (call-to-shop)
- Vision: "scan this vegetable, add 500g to cart" (multimodal)
- Post-purchase agent: proactive delivery delay calls + returns handling

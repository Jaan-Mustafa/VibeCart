# 🛒 VibeCart — Shop by Talking

> **Build with Agora — Bengaluru 2026 · Solo Hackathon**
> Track: Conversational Commerce · Problem: End-to-End Conversational Shopping

**VibeCart is a voice-first agentic shopping assistant.** You *talk*, and a real-time AI agent discovers products, compares options, applies discounts, completes checkout with a **real Razorpay payment**, tracks your delivery, and takes your review — the complete pre-purchase → post-purchase journey, all by voice.

---

## 🎬 The Journey (6 steps, all agent-driven)

| # | Step | What the agent does (tool calls) |
|---|------|----------------------------------|
| 1 | **Discover** | Understands the ask ("keto dinner under ₹800"), fetches user context, searches the catalog → `get_user_context`, `search_catalog` |
| 2 | **Compare & Choose** | Compares options, checks stock, personalizes → `compare_products`, `check_inventory`, `add_to_cart` |
| 3 | **Pay** | Applies coupons, initiates checkout → real **Razorpay** payment link → `apply_discount`, `initiate_checkout` |
| 4 | **On the way** | Live tracking that advances per request → `get_order_status` |
| 5 | **Delivered** | Agent confirms delivery → `get_order_status` |
| 6 | **Review** | Agent asks for a rating and records it → `submit_review` |

Every step lights up on a **live progress stepper** in the UI as the agent acts.

---

## ✨ Demo Highlights

- **Real-time voice**: ultra-low-latency conversation with smart interruption handling (you can cut the agent off mid-sentence)
- **Expressive voice**: [Murf AI **Falcon** TTS](https://murf.ai/api/docs/integrations/agora) (`en-US-matthew`)
- **True agentic behavior**: the LLM decides *when* to call tools; the Agora engine invokes our HTTPS tool endpoints and feeds results back into the conversation
- **Live transcript** of both sides of the conversation (RTM), streamed word-by-word
- **Visible actions**: cart, discounts, recommendations, and receipts update on screen *as the agent talks*
- **Real payment**: Razorpay test-mode payment link generated mid-conversation; the order auto-confirms when paid
- **Delivery lifecycle**: each tracking request advances the order (preparing → out for delivery → delivered)
- **Returns & reviews** close the loop after delivery

---

## 🏗 Architecture

```
┌────────────────────────────┐        ┌──────────────────────────────────┐
│  Web App (Vanilla JS)      │        │  Backend (Node + Express)        │
│  • Agora RTC (voice)       │◄──────►│  • Agora ConvoAI agent lifecycle │
│  • Agora RTM (transcripts) │  RTC   │    (REST join/leave)             │
│  • Live cart + journey UI  │  RTM   │  • Tool executor (10 tools)      │
│  • Razorpay pay button     │  SSE   │  • Mock commerce store (100 SKUs)│
└────────────────────────────┘        │  • Razorpay payment links        │
                                      └──────────────┬───────────────────┘
                                                     │ HTTPS (ngrok)
                              ┌──────────────────────▼───────────────────┐
                              │ Agora Conversational AI Engine (SDRTN)   │
                              │  ASR (ARES) → LLM (DeepSeek, tools) →    │
                              │  TTS (Murf Falcon)                       │
                              └──────────────────────────────────────────┘
```

### How tool calling works
1. Browser starts a session → backend generates RTC/RTM tokens and calls Agora's
   [`/v2/projects/{appid}/join`](https://docs.agora.io/en/api-reference/api-ref/conversational-ai/join) REST API with the full agent config (LLM, TTS, tools).
2. The LLM (DeepSeek, function-calling) decides to act — e.g. `add_to_cart {productId, qty}`.
3. The Conversational AI Engine validates params and calls **our** endpoint: `POST https://<public-url>/tools/add_to_cart`.
4. The result (cart state, totals) returns to the LLM, which speaks the outcome — while the backend simultaneously broadcasts the state change to the browser over SSE.

---

## 🔧 Tech Stack

| Layer | Tech |
|---|---|
| Real-time voice | [Agora RTC Web SDK](https://docs.agora.io/en/video-calling/overview/product) |
| Agent runtime | [Agora Conversational AI Engine](https://docs.agora.io/en/ai/overview) (REST API) |
| Transcripts / events | Agora RTM 2.x |
| LLM | DeepSeek (`deepseek-chat`, OpenAI-compatible, function calling) |
| TTS | **Murf AI Falcon** (`falcon-2.1`, voice `en-US-matthew`) |
| ASR | Agora ARES (default) |
| Payments | Razorpay Payment Links (test mode) |
| Backend | Node.js + Express, in-memory store |
| Frontend | Vanilla JS + Tailwind |
| Tunnel | ngrok (for engine → tool callbacks) |

---

## 🚀 Run It

```bash
# 1. Install
npm install

# 2. Configure (see .env.example)
cp .env.example .env
#   - Agora: App ID, Certificate, Customer Key/Secret (console.agora.io)
#   - LLM: DeepSeek (or any OpenAI-compatible) key
#   - TTS: Murf API key (murf.ai)
#   - Payments: Razorpay test keys (optional — mock checkout is the fallback)

# 3. Expose tool endpoints publicly (Agora engine calls them)
ngrok http 3000          # put the https URL into .env → PUBLIC_BASE_URL

# 4. Start
npm run dev              # → http://localhost:3000
```

Click **Start Talking**, allow the microphone, and just speak:
> *"I want keto dinner ingredients under ₹800"* → *"add the salmon"* →
> *"apply KETO10"* → *"checkout with saved card"* → pay on the Razorpay page →
> *"where's my order?"* → *"rate it 5 stars, great quality"*

---

## 🧠 Agentic Workflow Summary

**Before** the purchase: user preferences (keto diet, ₹800 budget), purchase history, and active offers are retrieved for personalization.
**During**: natural-language discovery over a ranked multi-field search engine, side-by-side comparison, live inventory checks, cart mutations, and coupon logic — every action a real tool call with real API state.
**After**: payment confirmation, delivery tracking that advances turn-by-turn, returns, and product reviews.

### Tool Catalog (11 tools)
`get_user_context` · `search_catalog` · `check_inventory` · `compare_products` · `add_to_cart` · `remove_from_cart` · `apply_discount` · `initiate_checkout` · `get_order_status` · `initiate_return` · `submit_review`

---

## 🛡 Engineering Notes

- **Echo-loop resilience**: forced AEC/ANS/AGC on the mic + raised interruption thresholds (500/600 ms) so the agent doesn't cut itself off through laptop speakers
- **Fallback-first design**: Razorpay unavailable → checkout degrades to mock confirmation; missing Murf key → config-only swap
- **Every agent action is observable**: ngrok request log, Agora turn metrics API, and live SSE UI events

## 👤 Author

Built solo by **Md Rizabul** for *Build with Agora — Bengaluru 2026*.

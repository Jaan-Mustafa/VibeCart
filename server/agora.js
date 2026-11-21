// VibeCart — Agora Conversational AI agent control
// Starts/stops a ConvoAI agent in the user's RTC channel via the Agora REST API.
// Tools: custom HTTPS tools — the engine calls OUR endpoints when the LLM wants to act.

import pkg from "agora-token";
const { RtcTokenBuilder, RtcRole, RtmTokenBuilder } = pkg;
import { TOOLS, executeTool } from "./tools.js";

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERT = process.env.AGORA_APP_CERTIFICATE;
const BASIC_AUTH = Buffer.from(`${process.env.AGORA_CUSTOMER_KEY}:${process.env.AGORA_CUSTOMER_SECRET}`).toString("base64");
const BASE_URL = process.env.PUBLIC_BASE_URL; // e.g. https://<ngrok-id>.ngrok-free.app
// LLM: OpenAI (OPENAI_API_KEY) or any OpenAI-compatible API like DeepSeek (DEEPSEEK_API_KEY)
const LLM_KEY = process.env.OPENAI_API_KEY;
const LLM_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions";
const LLM_MODEL = process.env.LLM_MODEL || "gpt-4o-mini";
const MURF_KEY = process.env.MURF_API_KEY;

// Interruption strategy: "on" (full voice interruption), "keywords" (interrupt only
// on trigger words — recommended for noisy demo rooms), "off" (never interrupt).
// Default: "keywords" — bystanders won't trigger it, but the user can always
// say "stop" / "wait" to cut the agent off mid-sentence.
const INTERRUPTION = process.env.AGENT_INTERRUPTION || "keywords";

const SYSTEM_PROMPT = `You are VibeCart, a friendly, fast-talking voice shopping assistant that guides the user through a complete shopping journey.
Journey steps you manage: (1) discovery/search, (2) compare & choose, (3) checkout & payment, (4) delivery tracking, (5) delivered, (6) review.
Rules:
- Be extremely concise (1-3 sentences max); you are in a live voice call.
- If the user says "stop" or "wait", end your reply immediately and listen to them.
- Personalize using get_user_context at the start of a shopping request (diet, budget, offers, favorite categories).
- When the user mentions a dietary change, new budget, allergy, or any lasting preference, save it with update_preferences and acknowledge it.
- Recommend products by name and price; use compare_products when the user is unsure.
- Always check inventory via check_inventory before adding to cart.
- When the user wants to buy: add items to cart, ask if they want a discount code applied (mention their active offers), then confirm and initiate_checkout.
- With online payment, tell the user the payment link is on their screen and wait for them to pay; confirm only when get_order_status shows confirmed.
- Ask "want me to track your order?" after payment. Each tracking request advances delivery: preparing → out_for_delivery → delivered.
- After delivery, proactively offer to submit_review (ask how they'd rate it 1-5).
- Handle returns via initiate_return if the user is unhappy.
- After the review is submitted, thank the user, say a warm goodbye, and call end_session. Also call end_session whenever the user says goodbye/that's all.
- Never invent products, prices, or order IDs. Only use tool results.
- If interrupted, stop immediately and address the user's new request.`;

// Convert our OpenAI-style tools to Agora custom tools (engine calls our HTTPS endpoints)
// NOTE: every param is marked required — Agora rejects unresolved {{args.*}} templates,
// so the LLM must always pass a value ("" or 0 when not applicable).
function agoraTools(sessionId) {
  return TOOLS.map(t => {
    const fn = JSON.parse(JSON.stringify(t.function));
    if (fn.parameters?.properties) {
      fn.parameters.required = Object.keys(fn.parameters.properties);
      for (const [k, v] of Object.entries(fn.parameters.properties)) {
        if (v.description) v.description += ` Required. Pass ${v.type === "number" ? "0" : '""'} if not applicable.`;
      }
    }
    // POST for anything with array/object params or mutations; GET only for simple scalar queries
    const isPost = ["add_to_cart", "remove_from_cart", "apply_discount", "initiate_checkout", "initiate_return", "check_inventory", "compare_products", "search_catalog", "submit_review", "update_preferences"].includes(fn.name);
    const server = {
      method: isPost ? "POST" : "GET",
      url: isPost ? `${BASE_URL}/tools/${fn.name}` : `${BASE_URL}/tools/${fn.name}?${paramsToQuery(fn.parameters)}`
    };
    if (isPost) server.body = paramsToBody(fn.parameters);
    // end_session needs to know which agent to stop — inject the session id directly
    if (fn.name === "end_session") server.url = `${BASE_URL}/tools/end_session?session=${sessionId}`;
    return { type: "function", function: { name: fn.name, description: fn.description, parameters: fn.parameters }, server };
  });
}

function paramsToQuery(params) {
  const props = params?.properties || {};
  return Object.keys(props).map(k => `${k}={{args.${k}}}`).join("&");
}

function paramsToBody(params) {
  const props = params?.properties || {};
  return Object.fromEntries(Object.keys(props).map(k => [k, `{{args.${k}}}`]));
}

function rtcToken(channel, uid = 0, expirySeconds = 3600 * 2) {
  return RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERT, channel, uid, RtcRole.PUBLISHER, expirySeconds);
}

// session registry: lets tools (end_session) find the agent to stop
const sessionRegistry = new Map(); // sessionId -> { agentId, channel }

export function listActiveSessions() {
  return [...sessionRegistry.entries()].map(([k, v]) => ({ session: k, ...v }));
}

export function agoraRoutes(app) {
  // Join endpoint for the browser: RTC token + agent session details
  app.post("/api/agent/start", async (req, res) => {
    const { channel, uid } = req.body;
    if (!channel) return res.status(400).json({ error: "channel required" });

    const token = rtcToken(channel, uid);
    const agentUid = 90000 + Math.floor(Math.random() * 9999);
    const sessionId = "s" + Date.now() + Math.floor(Math.random() * 1e4);

    const body = {
      name: `vibecart-${channel}-${Date.now()}`,
      properties: {
        channel,
        token: rtcToken(channel, agentUid),
        agent_rtc_uid: String(agentUid),
        remote_rtc_uids: [String(uid)],
        idle_timeout: 120,
        advanced_features: { enable_tools: true, enable_rtm: true },
        parameters: { data_channel: "rtm", enable_metrics: true, enable_error_message: true },
        // Robust turn-taking: ignore short noises/echo, require ~600ms of clear speech
        // to interrupt while the agent is speaking.
        turn_detection: {
          mode: "default",
          config: {
            speech_threshold: 0.65,
            start_of_speech: {
              mode: "vad",
              vad_config: {
                interrupt_duration_ms: 500,
                speaking_interrupt_duration_ms: 600,
                prefix_padding_ms: 800
              }
            }
          }
        },
        interruption: INTERRUPTION === "on" ? { enable: true }
          : INTERRUPTION === "keywords" ? {
              enable: true,
              mode: "keywords",
              keywords_config: {
                trigger_keywords: [
                  "stop", "stop it", "stop stop", "top", "shop stop", "stock",
                  "wait", "wait wait", "hold on", "hang on", "cancel", "quiet",
                  "excuse me", "hey stop", "no stop"
                ]
              }
            }
          : { enable: false, disabled_config: { strategy: "append" } },
        asr: { language: "en-US" },
        llm: {
          vendor: "openai",
          url: LLM_BASE_URL,
          api_key: LLM_KEY,
          system_messages: [{ role: "system", content: SYSTEM_PROMPT }],
          greeting_message: "Hi! I'm VibeCart. Tell me what you're shopping for and I'll find it, compare, and check out for you.",
          failure_message: "Sorry, one second — let me fix that.",
          max_history: 32,
          params: { model: LLM_MODEL, max_tokens: 160, temperature: 0.7 },
          tools: agoraTools(sessionId)
        },
        tts: {
          vendor: "murf",
          params: {
            api_key: MURF_KEY,
            base_url: "wss://global.api.murf.ai/v1/speech/stream-input",
            voiceId: process.env.MURF_VOICE_ID || "en-US-matthew",
            locale: "en-US",
            rate: 0,
            pitch: 0,
            model: "FALCON",
            sample_rate: 24000
          }
        }
      }
    };

    try {
      const r = await fetch(`https://api.agora.io/api/conversational-ai-agent/v2/projects/${APP_ID}/join`, {
        method: "POST",
        headers: { "Authorization": `Basic ${BASIC_AUTH}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: "agora_join_failed", detail: data });
      sessionRegistry.set(sessionId, { agentId: data.agent_id, channel });
      console.log(`[agent] started ${data.agent_id} channel=${channel} uid=${uid} session=${sessionId}`);
      res.json({ appId: APP_ID, token, rtmToken: RtmTokenBuilder.buildToken(APP_ID, APP_CERT, String(uid), 3600), agentId: data.agent_id, agentUid, sessionId });
    } catch (e) {
      res.status(502).json({ error: "agora_unreachable", detail: e.message });
    }
  });

  app.post("/api/agent/stop", async (req, res) => {
    const { agentId } = req.body;
    try {
      const r = await fetch(
        `https://api.agora.io/api/conversational-ai-agent/v2/projects/${APP_ID}/agents/${agentId}/leave`,
        { method: "POST", headers: { "Authorization": `Basic ${BASIC_AUTH}` } }
      );
      console.log(`[agent] stop requested ${agentId} ok=${r.ok}`);
      res.status(r.ok ? 200 : r.status).json({ ok: r.ok });
    } catch (e) {
      res.status(502).json({ error: e.message });
    }
  });

  // Diagnostics: dump turn metrics (ASR/LLM/TTS latencies, errors) for a session
  app.get("/api/agent/turns/:agentId", async (req, res) => {
    const r = await fetch(
      `https://api.agora.io/api/conversational-ai-agent/v2/projects/${APP_ID}/agents/${req.params.agentId}/turns`,
      { headers: { "Authorization": `Basic ${BASIC_AUTH}` } }
    );
    res.status(r.status).json(await r.json());
  });

  // Browser-side error beacon — lets us diagnose voice session failures from the server log
  app.post("/api/client-error", (req, res) => {
    console.error(`[client-error] ${req.body?.msg}\n${req.body?.stack || ""}`);
    res.json({ ok: true });
  });

  // HTTPS endpoint the ConvoAI engine calls when the LLM invokes a custom tool
  app.post("/tools/:name", async (req, res) => {
    const result = await executeTool(req.params.name, req.body);
    res.json(result);
  });

  app.get("/tools/:name", async (req, res) => {
    if (req.params.name === "end_session") {
      const s = sessionRegistry.get(req.query.session);
      if (!s) return res.json({ ok: false, message: "session not found" });
      // let the agent finish its farewell, then leave the channel
      setTimeout(async () => {
        try {
          const r = await fetch(`https://api.agora.io/api/conversational-ai-agent/v2/projects/${APP_ID}/agents/${s.agentId}/leave`, { method: "POST", headers: { "Authorization": `Basic ${BASIC_AUTH}` } });
          console.log(`[agent] auto-leave (end_session) ${s.agentId} ok=${r.ok}`);
          sessionRegistry.delete(req.query.session);
        } catch {}
      }, 5000);
      return res.json({ ok: true, message: "session closing" });
    }
    const result = await executeTool(req.params.name, req.query);
    res.json(result);
  });
}

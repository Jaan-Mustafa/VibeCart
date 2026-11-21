// VibeCart — local vector memory (sqlite-vec + local MiniLM embeddings)
// Per-user semantic memory: learned facts, preferences, purchase summaries.
// 100% local: no cloud, no API keys, persists to data/memory.db

import Database from "better-sqlite3";
import { getLoadablePath } from "sqlite-vec";
import { pipeline } from "@xenova/transformers";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, "../data/memory.db");

let db = null;
let embedder = null;
let ready = false;

export async function initMemory() {
  db = new Database(DB_FILE);
  db.loadExtension(getLoadablePath());
  db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS memories USING vec0(
    user_id TEXT,
    kind TEXT,
    text TEXT,
    embedding FLOAT[384]
  )`);
  ready = true;
  console.log("[memory] sqlite-vec ready (local embeddings, 384d)");
}

async function getEmbedder() {
  if (!embedder) {
    // 384-dim MiniLM, runs fully on-device
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return embedder;
}

export async function embed(text) {
  const ex = await getEmbedder();
  const out = await ex(text, { pooling: "mean", normalize: true });
  return Array.from(out.data);
}

export async function rememberFact(userId, text, kind = "fact") {
  if (!ready || !userId || !text) return { error: "memory_unavailable" };
  const emb = await embed(text);
  db.prepare("INSERT INTO memories (user_id, kind, text, embedding) VALUES (?, ?, ?, ?)")
    .run(userId, kind, text, JSON.stringify(emb));
  return { ok: true, message: `Remembered: "${text}"` };
}

export async function recallMemory(userId, query, k = 4) {
  if (!ready || !userId) return { error: "memory_unavailable" };
  const emb = await embed(query);
  const rows = db.prepare(`
    SELECT kind, text, distance
    FROM memories
    WHERE user_id = ? AND embedding MATCH ? AND k = ?
  `).all(userId, JSON.stringify(emb), k);
  return { memories: rows.map(r => ({ kind: r.kind, text: r.text })) };
}

export function userMemoryCount(userId) {
  if (!ready || !userId) return 0;
  return db.prepare("SELECT COUNT(*) c FROM memories WHERE user_id = ?").get(userId).c;
}

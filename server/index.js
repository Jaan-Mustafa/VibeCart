import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { store } from "./store.js";
import { TOOLS, onUiEvent } from "./tools.js";
import { agoraRoutes } from "./agora.js";
import { googleAuthRoutes } from "./auth.js";
import { initMemory } from "./memory.js";
initMemory().catch(e => console.warn("memory init failed:", e.message));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// ---- Commerce REST APIs (mock store) ----
const api = express.Router();

api.get("/catalog", (req, res) => {
  res.json(store.searchCatalog(req.query));
});

api.get("/user/context", (req, res) => res.json(store.getUserContext()));

api.post("/inventory/check", (req, res) => res.json(store.checkInventory(req.body.productIds || [])));
api.post("/products/compare", (req, res) => res.json(store.compareProducts(req.body.productIds || [])));

api.post("/cart/items", (req, res) => res.json(store.addToCart(req.body)));
api.delete("/cart/items/:productId", (req, res) => res.json(store.removeFromCart({ ...req.body, productId: req.params.productId })));
api.post("/cart/discount", (req, res) => res.json(store.applyDiscount(req.body)));
api.post("/cart/checkout", (req, res) => res.json(store.initiateCheckout(req.body)));

api.get("/orders/:id", (req, res) => res.json(store.getOrderStatus(req.params.id)));
api.post("/orders/:id/return", (req, res) => res.json(store.initiateReturn({ orderId: req.params.id, reason: req.body.reason })));

// Tool schema for the LLM / debugging
api.get("/tools-schema", (req, res) => res.json(TOOLS));

// Live UI events (cart updates, order placed) via Server-Sent Events
app.get("/api-events", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });
  res.write(`event: connected\ndata: {}\n\n`);
  const send = (e) => res.write(`data: ${JSON.stringify(e)}\n\n`);
  const off = onUiEvent(send);
  req.on("close", off);
});

app.use("/api", api);
agoraRoutes(app);
googleAuthRoutes(app);

// ---- Static frontend (no-cache so UI fixes always reach the browser) ----
app.get("/", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "../public/index.html"));
});
app.use(express.static(path.join(__dirname, "../public"), { setHeaders: (res, p) => { if (p.endsWith(".html")) res.set("Cache-Control", "no-store"); } }));
app.use("/vendor/agora-rtm.js", express.static(path.join(__dirname, "../node_modules/agora-rtm/agora-rtm.js")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`VibeCart running → http://localhost:${PORT}`));

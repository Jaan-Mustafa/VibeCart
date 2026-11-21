// Google Sign-In (ID token verification) + per-user profile registry
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, "../data/users.json");

function loadUsers() {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, "utf8")); } catch { return {}; }
}
function saveUsers(users) {
  fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export function googleAuthRoutes(app) {
  app.post("/api/auth/google", async (req, res) => {
    const { credential } = req.body || {};
    if (!credential) return res.status(400).json({ error: "credential required" });
    try {
      const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      const info = await r.json();
      if (!r.ok || info.error || !info.sub) return res.status(401).json({ error: "invalid_token", detail: info.error });
      // audience check (client id) — must match our OAuth client
      if (process.env.GOOGLE_CLIENT_ID && info.aud !== process.env.GOOGLE_CLIENT_ID) {
        return res.status(401).json({ error: "audience_mismatch" });
      }
      const users = loadUsers();
      const existing = users[info.sub];
      const user = {
        sub: info.sub,
        name: info.name || existing?.name || "Shopper",
        email: info.email || "",
        picture: info.picture || "",
        lastSeen: new Date().toISOString()
      };
      users[info.sub] = user;
      saveUsers(users);
      res.json({ user });
    } catch (e) {
      res.status(502).json({ error: "google_unreachable", detail: e.message });
    }
  });
}

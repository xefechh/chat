import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import express, { Request, Response } from "express";
import path from "node:path";
import { MessageBus } from "./pubsub";
import { MessageStore } from "./store";
import { ChatMessage, PublishMessage } from "./types";

const app = express();
const store = new MessageStore();
const bus = new MessageBus(process.env.REDIS_URL ?? "");
const clients = new Set<Response>();
const sessionSecret = process.env.SESSION_SECRET ?? (() => {
  throw new Error("SESSION_SECRET must be configured");
})();

app.use(express.json({ limit: "8kb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

function anonymousName(): string {
  return `Anonymous-${crypto.randomBytes(3).toString("hex")}`;
}

function signedSession(value: string): string {
  const signature = crypto.createHmac("sha256", sessionSecret).update(value).digest("hex");
  return `${value}.${signature}`;
}

function sessionValue(req: Request, res: Response): string {
  const raw = req.header("cookie")?.match(/(?:^|;\s*)chat_session=([^;]+)/)?.[1];
  if (raw) {
    const [value, signature] = raw.split(".");
    const expected = crypto.createHmac("sha256", sessionSecret).update(value ?? "").digest("hex");
    if (value && signature && signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return value;
  }
  const value = anonymousName();
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `chat_session=${signedSession(value)}; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`);
  return value;
}

function validInput(body: unknown): body is PublishMessage {
  if (!body || typeof body !== "object") return false;
  const input = body as Record<string, unknown>;
  return typeof input.text === "string" && input.text.trim().length > 0 && input.text.length <= 2000 &&
    (input.displayName === undefined || (typeof input.displayName === "string" && input.displayName.length <= 50));
}

function broadcast(message: ChatMessage): void {
  const data = `data: ${JSON.stringify(message)}\n\n`;
  for (const client of clients) {
    try { client.write(data); } catch { clients.delete(client); }
  }
}

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/api/messages", async (req, res) => {
  sessionValue(req, res);
  try { res.json(await store.list()); }
  catch (error) {
    console.error("Firestore read failed:", error);
    res.status(503).json({ error: "Message history is temporarily unavailable" });
  }
});

app.post("/api/messages", async (req: Request, res: Response) => {
  if (!validInput(req.body)) return res.status(400).json({ error: "text is required and must be at most 2000 characters" });
  const input = req.body;
  const message: ChatMessage = {
    id: crypto.randomUUID(), displayName: sessionValue(req, res),
    text: input.text.trim(), createdAt: new Date().toISOString()
  };
  try {
    await store.save(message);
    await bus.publish(message);
    res.status(201).json(message);
  } catch (error) {
    console.error("Message write/publish failed:", error);
    res.status(503).json({ error: "Chat is temporarily unavailable" });
  }
});

app.get("/api/events", (req, res) => {
  sessionValue(req, res);
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  res.flushHeaders();
  clients.add(res);
  req.on("close", () => clients.delete(res));
});

const port = Number(process.env.PORT ?? 3000);
bus.connect(broadcast).catch((error) => console.error("Redis connection failed:", error));
const keyPath = process.env.HTTPS_KEY_PATH;
const certPath = process.env.HTTPS_CERT_PATH;
if (process.env.NODE_ENV === "production" && (!keyPath || !certPath)) {
  throw new Error("HTTPS_KEY_PATH and HTTPS_CERT_PATH must be configured in production");
}
const server = keyPath && certPath
  ? https.createServer({ key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }, app)
  : http.createServer(app);
server.listen(port, () => console.log(`Chat listening on port ${port}`));
async function shutdown() { await bus.close().catch(() => undefined); server.close(() => process.exit(0)); }
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

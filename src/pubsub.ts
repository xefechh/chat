import { createClient, RedisClientType } from "redis";
import { ChatMessage } from "./types";

const CHANNEL = "global-chat:messages";
type Client = ReturnType<typeof createClient>;

export class MessageBus {
  private readonly publisher: Client;
  private readonly subscriber: Client;
  readonly configured: boolean;

  constructor(private readonly redisUrl: string) {
    this.configured = Boolean(redisUrl);
    this.publisher = createClient({ url: redisUrl });
    this.subscriber = createClient({ url: redisUrl });
  }

  async connect(onMessage: (message: ChatMessage) => void): Promise<void> {
    if (!this.configured) throw new Error("Redis is not configured");
    this.publisher.on("error", (error) => console.error("Redis publisher error:", error));
    this.subscriber.on("error", (error) => console.error("Redis subscriber error:", error));
    await Promise.all([this.publisher.connect(), this.subscriber.connect()]);
    await this.subscriber.subscribe(CHANNEL, (payload) => {
      try { onMessage(JSON.parse(payload) as ChatMessage); }
      catch (error) { console.error("Invalid Redis message:", error); }
    });
  }

  async publish(message: ChatMessage): Promise<void> {
    if (!this.publisher.isReady) throw new Error("Redis is unavailable");
    await this.publisher.publish(CHANNEL, JSON.stringify(message));
  }

  async close(): Promise<void> {
    await Promise.all([this.publisher.quit(), this.subscriber.quit()]);
  }
}

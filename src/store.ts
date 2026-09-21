import { Firestore } from "@google-cloud/firestore";
import { ChatMessage } from "./types";

export class MessageStore {
  private readonly db?: Firestore;
  readonly configured: boolean;

  constructor() {
    const projectId = process.env.FIRESTORE_PROJECT_ID;
    this.configured = Boolean(projectId);
    if (projectId) this.db = new Firestore({ projectId });
  }

  async list(limit = 50): Promise<ChatMessage[]> {
    if (!this.db) throw new Error("Firestore is not configured");
    const snapshot = await this.db.collection("chatMessages")
      .orderBy("createdAt", "desc").limit(limit).get();
    return snapshot.docs.map((doc) => doc.data() as ChatMessage).reverse();
  }

  async save(message: ChatMessage): Promise<void> {
    if (!this.db) throw new Error("Firestore is not configured");
    await this.db.collection("chatMessages").doc(message.id).set(message);
  }
}

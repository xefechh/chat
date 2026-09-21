export interface ChatMessage {
  id: string;
  displayName: string;
  text: string;
  createdAt: string;
}

export interface PublishMessage {
  displayName?: string;
  text: string;
}

export function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return typeof message.id === "string" &&
    typeof message.displayName === "string" &&
    typeof message.text === "string" &&
    message.text.length > 0 && message.text.length <= 2000 &&
    typeof message.createdAt === "string" &&
    !Number.isNaN(Date.parse(message.createdAt));
}

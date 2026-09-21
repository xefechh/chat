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

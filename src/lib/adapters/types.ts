import type { BrandId } from "@/lib/brands";

export interface ConversationSummary {
  id: string;
  customerName: string | null;
  phoneNumber: string;
  status: string;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  lastMessageDirection: "inbound" | "outbound" | null;
}

export interface ConversationMessage {
  id: string;
  direction: "inbound" | "outbound";
  body: string | null;
  createdAt: string;
}

export interface ConversationDetail {
  id: string;
  customerName: string | null;
  phoneNumber: string;
  status: string;
  messages: ConversationMessage[];
}

export interface InboxAdapter {
  brand: BrandId;
  isConnected(): boolean;
  listConversations(): Promise<ConversationSummary[]>;
  getConversation(conversationId: string): Promise<ConversationDetail | null>;
}

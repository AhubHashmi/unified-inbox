import type { BrandId } from "@/lib/brands";

/** Who produced an outbound message. Inbound (customer) messages have none. */
export type MessageSender = "ai" | "human" | "template" | "system";

export interface ConversationSummary {
  id: string;
  customerName: string | null;
  phoneNumber: string;
  status: string;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  lastMessageDirection: "inbound" | "outbound" | null;
  /** Only set for brands that support human takeover. */
  aiEnabled?: boolean;
  lastMessageSender?: MessageSender | null;
}

export interface ConversationMessage {
  id: string;
  direction: "inbound" | "outbound";
  /** Null for inbound, and for older outbound rows written before senders were tracked (those were AI replies). */
  sender?: MessageSender | null;
  body: string | null;
  createdAt: string;
}

export interface ConversationDetail {
  id: string;
  customerName: string | null;
  phoneNumber: string;
  status: string;
  messages: ConversationMessage[];
  /** Human-takeover fields, only set for brands that support it. */
  aiEnabled?: boolean;
  aiDisabledReason?: string | null;
  canReply?: boolean;
  /** Ebooks the customer created (Booknality E-book Builder), most recent first. */
  ebooks?: Array<{ title: string; link: string }>;
}

export type AgentActionResult =
  | { ok: true; aiEnabled: boolean }
  | { ok: false; status: number; error: string };

export interface InboxAdapter {
  brand: BrandId;
  isConnected(): boolean;
  listConversations(): Promise<ConversationSummary[]>;
  getConversation(conversationId: string): Promise<ConversationDetail | null>;
  /** Permanently deletes the conversation and its messages. Returns false if it didn't exist. */
  deleteConversation(conversationId: string): Promise<boolean>;
  /** Optional: send a human agent reply (switches the AI off for that chat). */
  sendMessage?(conversationId: string, text: string): Promise<AgentActionResult>;
  /** Optional: switch AI auto-replies on/off for one chat. */
  setAiEnabled?(conversationId: string, enabled: boolean): Promise<AgentActionResult>;
}

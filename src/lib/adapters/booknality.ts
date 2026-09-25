import { getPool } from "@/lib/db-pool";
import {
  deleteWhatsappConversation,
  getContactEbooks,
  getWhatsappConversation,
  listWhatsappConversations,
} from "@/lib/adapters/whatsapp-shared";
import {
  isBooknalityAgentConfigured,
  sendBooknalityAgentMessage,
  setBooknalityAiEnabled,
} from "@/lib/adapters/booknality-agent";
import type { InboxAdapter } from "@/lib/adapters/types";

const ENV_VAR = "BOOKNALITY_DATABASE_URL";

export const booknalityAdapter: InboxAdapter = {
  brand: "booknality",

  isConnected() {
    return Boolean(process.env[ENV_VAR]);
  },

  async listConversations() {
    const pool = getPool(ENV_VAR);
    if (!pool) return [];
    return listWhatsappConversations(pool, { agentColumns: true });
  },

  async getConversation(conversationId: string) {
    const pool = getPool(ENV_VAR);
    if (!pool) return null;
    const conversation = await getWhatsappConversation(pool, conversationId, { agentColumns: true });
    if (!conversation) return null;
    const ebooks = await getContactEbooks(pool, conversationId);
    return { ...conversation, canReply: isBooknalityAgentConfigured(), ebooks };
  },

  async deleteConversation(conversationId: string) {
    const pool = getPool(ENV_VAR);
    if (!pool) return false;
    return deleteWhatsappConversation(pool, conversationId);
  },

  sendMessage(conversationId: string, text: string) {
    return sendBooknalityAgentMessage(conversationId, text);
  },

  setAiEnabled(conversationId: string, enabled: boolean) {
    return setBooknalityAiEnabled(conversationId, enabled);
  },
};

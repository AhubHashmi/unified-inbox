import { getPool } from "@/lib/db-pool";
import {
  getWhatsappConversation,
  listWhatsappConversations,
} from "@/lib/adapters/whatsapp-shared";
import type { InboxAdapter } from "@/lib/adapters/types";

const ENV_VAR = "APPNALITY_DATABASE_URL";

export const appnalityAdapter: InboxAdapter = {
  brand: "appnality",

  isConnected() {
    return Boolean(process.env[ENV_VAR]);
  },

  async listConversations() {
    const pool = getPool(ENV_VAR);
    if (!pool) return [];
    return listWhatsappConversations(pool);
  },

  async getConversation(conversationId: string) {
    const pool = getPool(ENV_VAR);
    if (!pool) return null;
    return getWhatsappConversation(pool, conversationId);
  },
};

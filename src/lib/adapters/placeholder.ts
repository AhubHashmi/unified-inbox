import type { BrandId } from "@/lib/brands";
import type { InboxAdapter } from "@/lib/adapters/types";

export function makePlaceholderAdapter(brand: BrandId): InboxAdapter {
  return {
    brand,
    isConnected() {
      return false;
    },
    async listConversations() {
      return [];
    },
    async getConversation() {
      return null;
    },
    async deleteConversation() {
      return false;
    },
  };
}

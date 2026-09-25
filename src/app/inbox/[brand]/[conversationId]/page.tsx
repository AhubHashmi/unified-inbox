import { notFound } from "next/navigation";
import { getBrand } from "@/lib/brands";
import { getAdapter } from "@/lib/adapters/registry";
import { ConversationThread } from "@/components/ConversationThread";

type ConversationPageProps = {
  params: Promise<{ brand: string; conversationId: string }>;
};

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const { brand: brandId, conversationId } = await params;
  const brand = getBrand(brandId);
  if (!brand) notFound();

  const adapter = getAdapter(brand.id);
  const conversation = adapter.isConnected()
    ? await adapter.getConversation(conversationId)
    : null;

  if (!conversation) notFound();

  return (
    <ConversationThread
      key={conversationId}
      brandId={brand.id}
      conversationId={conversationId}
      initialConversation={conversation}
    />
  );
}

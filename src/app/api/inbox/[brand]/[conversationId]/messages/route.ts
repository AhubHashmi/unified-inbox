import { NextResponse } from "next/server";
import { getBrand } from "@/lib/brands";
import { getAdapter } from "@/lib/adapters/registry";
import { isSameOrigin } from "@/lib/same-origin";

const MAX_LENGTH = 4096;

/** Send a human agent reply. Body: { "text": string }. The brand switches its AI off for this chat. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ brand: string; conversationId: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { brand: brandId, conversationId } = await params;
  const brand = getBrand(brandId);
  if (!brand) {
    return NextResponse.json({ error: "unknown brand" }, { status: 404 });
  }

  const adapter = getAdapter(brand.id);
  if (!adapter.isConnected() || !adapter.sendMessage) {
    return NextResponse.json({ error: "replying is not supported for this brand" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const rawText = (body as { text?: unknown } | null)?.text;
  const text = typeof rawText === "string" ? rawText.trim() : "";
  if (!text || text.length > MAX_LENGTH) {
    return NextResponse.json({ error: `Message must be 1-${MAX_LENGTH} characters.` }, { status: 400 });
  }

  const result = await adapter.sendMessage(conversationId, text);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ aiEnabled: result.aiEnabled });
}

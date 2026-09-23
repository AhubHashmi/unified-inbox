import { NextResponse } from "next/server";
import { getBrand } from "@/lib/brands";
import { getAdapter } from "@/lib/adapters/registry";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ brand: string; conversationId: string }> },
) {
  const { brand: brandId, conversationId } = await params;
  const brand = getBrand(brandId);
  if (!brand) {
    return NextResponse.json({ error: "unknown brand" }, { status: 404 });
  }

  const adapter = getAdapter(brand.id);
  if (!adapter.isConnected()) {
    return NextResponse.json({ error: "not connected" }, { status: 404 });
  }

  const conversation = await adapter.getConversation(conversationId);
  if (!conversation) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}

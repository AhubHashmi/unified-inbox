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

export async function DELETE(
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

  try {
    const deleted = await adapter.deleteConversation(conversationId);
    if (!deleted) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      `[inbox] failed to delete conversation ${conversationId} for ${brandId}:`,
      error,
    );
    return NextResponse.json(
      { error: "delete failed" },
      { status: 500 },
    );
  }
}

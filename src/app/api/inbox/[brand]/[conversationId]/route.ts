import { NextResponse } from "next/server";
import { getBrand } from "@/lib/brands";
import { getAdapter } from "@/lib/adapters/registry";
import { isSameOrigin } from "@/lib/same-origin";

/** Switch AI auto-replies on/off for this chat. Body: { "aiEnabled": boolean } */
export async function PATCH(
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
  if (!adapter.isConnected() || !adapter.setAiEnabled) {
    return NextResponse.json({ error: "not supported for this brand" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const aiEnabled = (body as { aiEnabled?: unknown } | null)?.aiEnabled;
  if (typeof aiEnabled !== "boolean") {
    return NextResponse.json({ error: "aiEnabled must be a boolean" }, { status: 400 });
  }

  const result = await adapter.setAiEnabled(conversationId, aiEnabled);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ aiEnabled: result.aiEnabled });
}

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

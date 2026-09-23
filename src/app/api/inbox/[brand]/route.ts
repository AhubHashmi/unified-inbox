import { NextResponse } from "next/server";
import { getBrand } from "@/lib/brands";
import { getAdapter } from "@/lib/adapters/registry";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ brand: string }> },
) {
  const { brand: brandId } = await params;
  const brand = getBrand(brandId);
  if (!brand) {
    return NextResponse.json({ error: "unknown brand" }, { status: 404 });
  }

  const adapter = getAdapter(brand.id);
  if (!adapter.isConnected()) {
    return NextResponse.json({ conversations: [] });
  }

  const conversations = await adapter.listConversations();
  return NextResponse.json({ conversations });
}

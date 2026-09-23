import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const from = String(form.get("from") ?? "/");

  const ok = await verifyPassword(password);
  if (!ok) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "1");
    url.searchParams.set("from", from);
    return NextResponse.redirect(url, { status: 303 });
  }

  await createSession("team");
  return NextResponse.redirect(new URL(from || "/", request.url), {
    status: 303,
  });
}

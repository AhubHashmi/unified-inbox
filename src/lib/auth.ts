import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "ui_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET env var is required");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Single shared login for the whole team (per spec: "everyone sees
 * everything for now"). Per-user/per-brand access can be layered on top of
 * this session later without reworking the cookie mechanism.
 */
export async function createSession(userLabel: string): Promise<void> {
  const token = await new SignJWT({ sub: userLabel })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<{ sub: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { sub: String(payload.sub) };
  } catch {
    return null;
  }
}

export async function verifyPassword(password: string): Promise<boolean> {
  const expected = process.env.SHARED_LOGIN_PASSWORD;
  if (!expected) {
    throw new Error("SHARED_LOGIN_PASSWORD env var is required");
  }
  return password === expected;
}

export { COOKIE_NAME };

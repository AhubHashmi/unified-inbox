import "server-only";

import type { AgentActionResult } from "@/lib/adapters/types";

/**
 * Human-takeover actions go through the Booknality backend's agent API, so the
 * Meta credentials and the "human replied -> AI off" logic live in one place.
 * The API key stays server-side; the browser only ever talks to this app's own routes.
 */
const BASE_URL_ENV = "BOOKNALITY_API_BASE_URL";
const KEY_ENV = "BOOKNALITY_AGENT_API_KEY";

export function isBooknalityAgentConfigured(): boolean {
  return Boolean(process.env[BASE_URL_ENV] && process.env[KEY_ENV]);
}

async function callAgentApi(path: string, method: "POST" | "PATCH", body: unknown): Promise<AgentActionResult> {
  const baseUrl = process.env[BASE_URL_ENV];
  const key = process.env[KEY_ENV];

  if (!baseUrl || !key) {
    return { ok: false, status: 503, error: "Replying is not configured for Booknality." };
  }

  let response: Response;

  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, "")}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return { ok: false, status: 502, error: "Could not reach the Booknality backend." };
  }

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    aiEnabled?: boolean;
    state?: { aiEnabled?: boolean };
  };

  if (!response.ok) {
    return { ok: false, status: response.status, error: data.error ?? `Request failed (${response.status}).` };
  }

  return { ok: true, aiEnabled: Boolean(data.state?.aiEnabled ?? data.aiEnabled) };
}

export function sendBooknalityAgentMessage(conversationId: string, text: string) {
  return callAgentApi(`/api/agent/conversations/${encodeURIComponent(conversationId)}/messages`, "POST", { text });
}

export function setBooknalityAiEnabled(conversationId: string, enabled: boolean) {
  return callAgentApi(`/api/agent/conversations/${encodeURIComponent(conversationId)}`, "PATCH", {
    aiEnabled: enabled,
  });
}

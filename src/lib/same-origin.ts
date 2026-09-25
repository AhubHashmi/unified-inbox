/**
 * CSRF guard for state-changing inbox routes: browsers always send an Origin
 * header on POST/PATCH, so require it to match the host serving this app.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

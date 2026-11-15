const RESPONSE_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

export function respond(body: string | null, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(body, { status, headers: { ...RESPONSE_HEADERS, ...extra } });
}


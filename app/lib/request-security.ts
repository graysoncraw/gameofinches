function forwardedValue(request: Request, header: string) {
  return request.headers.get(header)?.split(",")[0]?.trim();
}

export function isSecureRequest(request: Request) {
  const protocol =
    forwardedValue(request, "x-forwarded-proto") ??
    new URL(request.url).protocol.replace(":", "");
  return protocol === "https";
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host =
    forwardedValue(request, "x-forwarded-host") ??
    request.headers.get("host") ??
    new URL(request.url).host;
  const protocol = isSecureRequest(request) ? "https" : "http";
  return Boolean(origin && origin === `${protocol}://${host}`);
}

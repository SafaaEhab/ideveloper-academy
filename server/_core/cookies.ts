import type { CookieOptions, Request } from "express";

/**
 * Origins allowed to call this API from another site. Read per call rather than
 * cached at import so a deployment that changes the variable does not keep the
 * old list, and so tests can set it up front.
 */
export function allowedCrossOrigins(): string[] {
  return (process.env.WEB_ORIGIN ?? "")
    .split(",")
    .map(origin => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

/**
 * True only when the browser is on a genuinely different site from this server.
 *
 * `WEB_ORIGIN` lists the origins allowed to call this API cross-origin, and it
 * normally contains this site's own domain — so membership alone would call a
 * same-origin request "cross-origin" and hand out a `SameSite=None` cookie.
 * Comparing against the request's own host is what separates the two.
 */
function isCrossSiteRequest(req: Request): boolean {
  const origin = req.headers.origin;
  if (typeof origin !== "string" || !origin) return false;

  const host = req.headers["x-forwarded-host"] ?? req.headers.host;
  if (typeof host !== "string" || !host) return false;

  const ownOrigin = `${req.protocol}://${host}`;
  if (origin === ownOrigin) return false;

  return allowedCrossOrigins().includes(origin);
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    // `SameSite=None` sends the session on cross-site requests, which is what
    // turns any state-changing endpoint into a CSRF target. It is only needed for
    // the split deployment (client on another origin); same-origin traffic gets
    // `Lax`, and browsers reject `None` without `Secure` anyway so plain-http
    // local development has to use `Lax` to store the cookie at all.
    sameSite: secure && isCrossSiteRequest(req) ? "none" : "lax",
    secure,
  };
}

export { isCrossSiteRequest, isIpAddress, isSecureRequest };
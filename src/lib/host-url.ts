import { headers } from "next/headers";

/**
 * Build an absolute URL rooted at the current request's Host header.
 * Works around Next's internal request.url being "localhost:3000" when we
 * really want pop.lvh.me:3000 (or the partner's actual host).
 */
export async function absoluteUrl(path: string): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.endsWith(".lvh.me") || host === "lvh.me"
      ? "http"
      : "https");
  return `${proto}://${host}${path.startsWith("/") ? path : `/${path}`}`;
}

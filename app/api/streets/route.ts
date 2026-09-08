import { NextResponse } from "next/server";
import {
  parseStreetResponse,
  streetSearchUrl,
  type StreetHighlight,
} from "@/lib/street-search";
import { sharedStreetStore } from "@/lib/street-store";

const cache = new Map<
  string,
  { expires: number; value: StreetHighlight | null }
>();
let busy = false;
let nextRequestAt = 0;
function error(code: string, status: number) {
  return NextResponse.json(
    { code },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(status === 429 ? { "Retry-After": "2" } : {}),
      },
    },
  );
}
function result(value: StreetHighlight | null) {
  return value
    ? NextResponse.json(value, {
        headers: { "Cache-Control": "private, max-age=3600" },
      })
    : error("STREET_NOT_FOUND", 404);
}

export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
  if (
    query.length < 2 ||
    query.length > 80 ||
    !/^[\p{L}\p{N} .,'’()/-]+$/u.test(query)
  )
    return error("STREET_INVALID_QUERY", 400);
  if (request.headers.get("sec-fetch-site") === "cross-site")
    return error("STREET_FORBIDDEN", 403);
  const key = query.toLocaleLowerCase("pl");
  try {
    const shared = sharedStreetStore();
    const baseUrl =
      process.env.STREET_GEOCODER_URL ||
      "https://nominatim.openstreetmap.org/search";
    // The public provider must never rely on a process-local throttle in serverless production.
    if (
      process.env.VERCEL &&
      !shared &&
      new URL(baseUrl).hostname === "nominatim.openstreetmap.org"
    )
      return error("STREET_CONFIGURATION_REQUIRED", 503);
    if (shared) {
      // Vercel supplies this header. Outside Vercel use a shared bucket rather than trusting forwarded headers.
      const ip = process.env.VERCEL
        ? (request.headers.get("x-vercel-forwarded-for") ?? "unknown")
        : "shared";
      if (!(await shared.allowClient(ip)))
        return error("STREET_RATE_LIMITED", 429);
      const cached = await shared.get(key);
      if (cached !== null)
        return result(JSON.parse(cached) as StreetHighlight | null);
    } else {
      const cached = cache.get(key);
      if (cached && cached.expires > Date.now()) return result(cached.value);
    }
    const lease = shared ? await shared.acquire() : null;
    if (shared ? !lease : busy || Date.now() < nextRequestAt)
      return error("STREET_RATE_LIMITED", 429);
    busy = true;
    try {
      const response = await fetch(streetSearchUrl(baseUrl, query), {
        headers: {
          Accept: "application/geo+json",
          "Accept-Language": "pl,en;q=0.8",
          "User-Agent":
            "OpoleCameraMap/0.1 (+https://github.com/Paremik/camera-map)",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) return error("STREET_UNAVAILABLE", 503);
      const value = parseStreetResponse(await response.json());
      if (shared) await shared.put(key, value);
      else {
        if (cache.size >= 100) cache.delete(cache.keys().next().value!);
        cache.set(key, { expires: Date.now() + 86400000, value });
      }
      return result(value);
    } finally {
      busy = false;
      nextRequestAt = Date.now() + 1100;
      if (shared && lease) await shared.release(lease);
    }
  } catch {
    return error("STREET_UNAVAILABLE", 503);
  }
}

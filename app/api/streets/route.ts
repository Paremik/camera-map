import { NextResponse } from "next/server";
import { parseStreetResponse, streetSearchUrl, type StreetHighlight } from "@/lib/street-search";

const cache = new Map<string, { expires: number; value: StreetHighlight | null }>();
let requestQueue = Promise.resolve();
let lastRequestAt = 0;
const maxCacheEntries = 100;

function normalizeQuery(value: string) {
  return value.normalize("NFC").trim().replace(/\s+/g, " ");
}
function wait(milliseconds: number) { return new Promise(resolve => setTimeout(resolve, milliseconds)); }
function limitedFetch(url: URL) {
  const current = requestQueue.then(async () => {
    await wait(Math.max(0, 1100 - (Date.now() - lastRequestAt)));
    lastRequestAt = Date.now();
    return fetch(url, { headers: { Accept: "application/geo+json", "Accept-Language": "pl,en;q=0.8", "User-Agent": "OpoleCameraMap/0.1 (+https://github.com/Paremik/camera-map)" }, cache: "no-store", signal: AbortSignal.timeout(12000) });
  });
  requestQueue = current.then(() => undefined, () => undefined);
  return current;
}

export async function GET(request: Request) {
  const query = normalizeQuery(new URL(request.url).searchParams.get("q") ?? "");
  if (query.length < 2 || query.length > 80 || !/^[\p{L}\p{N} .,'’()/-]+$/u.test(query)) return NextResponse.json({ error: "Введите название улицы — от 2 до 80 символов." }, { status: 400 });
  const key = query.toLocaleLowerCase("pl");
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value
    ? NextResponse.json(cached.value, { headers: { "Cache-Control": "private, max-age=3600", "X-Street-Cache": "HIT" } })
    : NextResponse.json({ error: "Улица не найдена в пределах Opole." }, { status: 404, headers: { "X-Street-Cache": "HIT" } });
  try {
    const baseUrl = process.env.STREET_GEOCODER_URL ?? "https://nominatim.openstreetmap.org/search";
    const response = await limitedFetch(streetSearchUrl(baseUrl, query));
    if (!response.ok) throw new Error("Geocoder returned " + response.status);
    const result = parseStreetResponse(await response.json());
    if (cache.size >= maxCacheEntries) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + 24 * 60 * 60 * 1000, value: result });
    return result ? NextResponse.json(result, { headers: { "Cache-Control": "private, max-age=3600", "X-Street-Cache": "MISS" } })
      : NextResponse.json({ error: "Улица не найдена в пределах Opole." }, { status: 404 });
  } catch {
    if (cached?.value) return NextResponse.json(cached.value, { headers: { "Cache-Control": "private, max-age=60", "X-Street-Cache": "STALE" } });
    return NextResponse.json({ error: "Поиск улиц сейчас недоступен. Повторите попытку позже." }, { status: 503 });
  }
}

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cookieName = "opole-camera-admin";
const maxAge = 60 * 60 * 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

function secret() { return process.env.ADMIN_PANEL_PASSWORD?.trim() ?? ""; }
function token(value: string) { return createHmac("sha256", value).update("opole-camera-admin:v1").digest("base64url"); }
function valid(value: string | undefined, password: string) {
  if (!value || !password) return false;
  const expected = Buffer.from(token(password)); const received = Buffer.from(value);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
function clientKey(request: Request) { return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"; }
function tooManyAttempts(request: Request) {
  const now = Date.now(); const key = clientKey(request); const previous = attempts.get(key);
  if (!previous || previous.resetAt <= now) { attempts.set(key, { count: 1, resetAt: now + 60_000 }); return false; }
  previous.count += 1; return previous.count > 5;
}
function clearAttempts(request: Request) { attempts.delete(clientKey(request)); }

export async function GET() {
  const password = secret(); const store = await cookies();
  return Response.json({ configured: Boolean(password), authorized: valid(store.get(cookieName)?.value, password) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const password = secret();
  if (!password) return Response.json({ error: "Admin access is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  let body: { password?: unknown; logout?: unknown };
  try { body = await request.json() as { password?: unknown; logout?: unknown }; } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const store = await cookies();
  if (body.logout === true) { store.set(cookieName, "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge: 0, path: "/" }); return Response.json({ authorized: false }); }
  if (tooManyAttempts(request)) return Response.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
  if (typeof body.password !== "string" || !valid(token(body.password), password)) return Response.json({ error: "Incorrect password." }, { status: 401 });
  clearAttempts(request);
  store.set(cookieName, token(password), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge, path: "/" });
  return Response.json({ authorized: true }, { headers: { "Cache-Control": "no-store" } });
}

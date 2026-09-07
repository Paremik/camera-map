import { createHash, randomUUID } from "node:crypto";

export function sharedStreetStore() {
  const endpoint = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!endpoint || !token) return null;
  if (new URL(endpoint).protocol !== "https:")
    throw new Error("Redis requires HTTPS");
  async function command(args: (string | number)[]) {
    const response = await fetch(endpoint!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new Error("Shared street store unavailable");
    const body = (await response.json()) as { result: unknown; error?: string };
    if (body.error) throw new Error("Shared street store command failed");
    return body.result;
  }
  const digest = (value: string) =>
    createHash("sha256")
      .update(token + value)
      .digest("hex");
  return {
    async allowClient(ip: string) {
      const count = await command([
        "EVAL",
        "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n",
        1,
        "opole:street:client:" + digest(ip),
      ]);
      return typeof count === "number" && count <= 20;
    },
    async get(query: string): Promise<string | null> {
      const value = await command([
        "GET",
        "opole:street:cache:" + digest(query),
      ]);
      return typeof value === "string" ? value : null;
    },
    async put(query: string, value: unknown) {
      await command([
        "SET",
        "opole:street:cache:" + digest(query),
        JSON.stringify(value),
        "EX",
        86400,
      ]);
    },
    async acquire() {
      const lease = randomUUID();
      const result = await command([
        "SET",
        "opole:street:upstream",
        lease,
        "NX",
        "PX",
        20000,
      ]);
      return result === "OK" ? lease : null;
    },
    async release(lease: string) {
      // Keep a quiet interval after the response, including between different function instances.
      await command([
        "EVAL",
        "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('PEXPIRE',KEYS[1],1100) end; return 0",
        1,
        "opole:street:upstream",
        lease,
      ]);
    },
  };
}

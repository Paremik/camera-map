import { X509Certificate } from "node:crypto";
import { get } from "node:https";
import { Readable } from "node:stream";
import { rootCertificates } from "node:tls";
import { readBounded } from "./its-snapshot.ts";

const roots = rootCertificates.map(pem => new X509Certificate(pem));
let intermediateCache: { expires: number; promise: Promise<string[]> } | null = null;

/** Each additional CA must chain cryptographically to an existing Node trust root. */
export function verifyIntermediateChain(chain: X509Certificate[], trustedRoots: X509Certificate[], now = Date.now()): boolean {
  if (!chain.length || chain.length > 4 || chain.some(cert => !cert.ca || Date.parse(cert.validFrom) > now || Date.parse(cert.validTo) <= now)) return false;
  for (let index = 0; index < chain.length; index++) {
    const cert = chain[index];
    const parent = chain[index + 1];
    if (parent) {
      if (!cert.checkIssued(parent) || !cert.verify(parent.publicKey)) return false;
    } else {
      return trustedRoots.some(root => cert.fingerprint256 === root.fingerprint256 || (cert.checkIssued(root) && cert.verify(root.publicKey)));
    }
  }
  return false;
}

async function loadCertumChain(signal: AbortSignal): Promise<string[]> {
  const chain: X509Certificate[] = [];
  let url = "https://repository.certum.pl/cyberfolks2.cer";
  for (let depth = 0; depth < 4; depth++) {
    // Issuer addresses are public certificate metadata, restricted to the CA's HTTPS repository.
    const address = new URL(url);
    if (address.origin !== "https://repository.certum.pl" || !/^\/[A-Za-z0-9_.-]+\.cer$/.test(address.pathname) || address.search || address.hash || address.username || address.password) throw new Error("Unexpected CA repository");
    const response = await fetch(address, { signal, redirect: "error", credentials: "omit", cache: "no-store" });
    if (!response.ok || Number(response.headers.get("content-length")) > 32768) throw new Error("CA certificate unavailable");
    const bytes = await readBounded(response, 32768);
    if (!bytes.length || bytes.length > 32768) throw new Error("Invalid CA certificate size");
    const certificate = new X509Certificate(bytes);
    chain.push(certificate);
    if (verifyIntermediateChain(chain, roots)) return chain.map(cert => cert.toString());
    const issuer = /CA Issuers - URI:([^\s]+)/.exec(certificate.infoAccess ?? "")?.[1];
    if (!issuer) throw new Error("CA chain does not reach a trusted root");
    const next = new URL(issuer);
    if (next.protocol === "http:") next.protocol = "https:";
    url = next.href;
  }
  throw new Error("CA chain too long");
}

async function intermediates(signal: AbortSignal) {
  if (!intermediateCache || intermediateCache.expires <= Date.now()) {
    const entry = { expires: Date.now() + 60 * 60 * 1000, promise: loadCertumChain(signal) };
    intermediateCache = entry;
    entry.promise.catch(() => { if (intermediateCache === entry) intermediateCache = null; });
  }
  return intermediateCache.promise;
}

/** Only repair the observed missing issuer, preserving hostname, expiry and full-chain validation. */
export const fetchIts: typeof fetch = async (input, options) => {
  const url = new URL(String(input));
  if (url.origin !== "https://its.mzd.opole.pl" || url.username || url.password || url.search || url.hash || !/^\/api\/(?:cameras\/[1-9]\d*\/images|camera\/image\/[1-9]\d*\/[A-Za-z0-9_.-]+\.jpe?g)$/.test(url.pathname) || url.pathname.includes("..")) throw new Error("Unsupported ITS URL");
  try { return await fetch(url, options); } catch (error) {
    const cause = error instanceof Error && error.cause && typeof error.cause === "object" ? error.cause as { code?: unknown } : null;
    if (cause?.code !== "UNABLE_TO_VERIFY_LEAF_SIGNATURE" && cause?.code !== "UNABLE_TO_GET_ISSUER_CERT_LOCALLY") throw error;
  }
  const signal = options?.signal ?? AbortSignal.timeout(15000);
  const chain = await intermediates(signal);
  signal.throwIfAborted();
  return new Promise<Response>((resolve, reject) => {
    const request = get(url, {
      signal, rejectUnauthorized: true, ca: [...rootCertificates, ...chain],
      headers: { Accept: new Headers(options?.headers).get("Accept") ?? "application/json", "Accept-Encoding": "identity" },
    }, response => {
      const headers = new Headers();
      for (const [name, value] of Object.entries(response.headers)) {
        if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
      }
      const status = response.statusCode ?? 502;
      // A redirect is an error, never a new host to follow.
      if (status >= 300 && status < 400) { response.destroy(); reject(new Error("ITS redirect refused")); return; }
      resolve(new Response(Readable.toWeb(response) as ReadableStream<Uint8Array>, { status, headers }));
    });
    request.once("error", reject);
  });
};

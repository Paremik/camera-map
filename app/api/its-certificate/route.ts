import { connect } from "node:tls";

export const runtime = "nodejs";
export const maxDuration = 15;

// Temporary public-certificate diagnostic. TLS verification stays enabled; no application data is sent.
export async function GET() {
  const result = await new Promise(resolve => {
    let peer: Record<string, unknown> = {};
    const socket = connect({ host: "its.mzd.opole.pl", port: 443, servername: "its.mzd.opole.pl", rejectUnauthorized: true });
    socket.prependListener("secure", () => {
      const cert = socket.getPeerCertificate();
      peer = { subject: cert.subject, issuer: cert.issuer, infoAccess: cert.infoAccess, validFrom: cert.valid_from, validTo: cert.valid_to };
    });
    const timeout = setTimeout(() => socket.destroy(new Error("timeout")), 8000);
    socket.once("secureConnect", () => { clearTimeout(timeout); socket.end(); resolve({ verified: true, peer }); });
    socket.once("error", (error: Error & { code?: string }) => { clearTimeout(timeout); resolve({ verified: false, code: error.code ?? "connection_error", peer }); });
  });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}

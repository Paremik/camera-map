import { readFileSync } from "node:fs";
import { get } from "node:https";
import { rootCertificates } from "node:tls";
import { X509Certificate } from "node:crypto";

// ITS currently omits its intermediates. Only supplement certificates whose
// signatures chain to Node's built-in roots; hostname and expiry checks remain on.
export function itsCertificateAuthorities() {
  const pem = readFileSync(
    new URL("./certificates/its-intermediates.pem", import.meta.url),
    "utf8",
  );
  const intermediates = (
    pem.match(
      /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g,
    ) ?? []
  ).map((value) => new X509Certificate(value));
  const roots = rootCertificates.map((value) => new X509Certificate(value));
  if (
    intermediates.length !== 2 ||
    !intermediates[0].verify(intermediates[1].publicKey) ||
    !roots.some(
      (root) =>
        intermediates[1].checkIssued(root) &&
        intermediates[1].verify(root.publicKey),
    )
  ) {
    throw new Error(
      "ITS intermediate certificates do not chain to a trusted root",
    );
  }
  return [...rootCertificates, pem];
}

export function fetchItsCatalogue(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = get(
      "https://its.mzd.opole.pl/api/cameras",
      {
        ca: itsCertificateAuthorities(),
        signal: AbortSignal.timeout(20_000),
        headers: {
          Accept: "application/geo+json",
          "User-Agent":
            "OpoleCameraMap/0.1 (+https://github.com/Paremik/camera-map)",
        },
      },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`ITS returned HTTP ${response.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 2_000_000) {
            response.destroy(new Error("ITS catalogue exceeds size limit"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.on("error", reject);
  });
}

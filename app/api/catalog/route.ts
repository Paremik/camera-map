import { getCameras } from "@/lib/camera-repository";
import { cameraFreshness, catalogApiLicense } from "@/lib/catalog-governance";

export const runtime = "nodejs";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=300, s-maxage=3600",
};

export async function GET(request: Request) {
  const cameras = await getCameras();
  const geojson = new URL(request.url).searchParams.get("format") === "geojson";
  if (geojson) return Response.json({
    type: "FeatureCollection", schemaVersion: "1.0", generatedAt: new Date().toISOString(), license: catalogApiLicense,
    features: cameras.map(camera => ({
      type: "Feature", id: camera.id, geometry: { type: "Point", coordinates: [camera.lng, camera.lat] },
      properties: { ...camera, freshness: cameraFreshness(camera) },
    })),
  }, { headers });
  return Response.json({ schemaVersion: "1.0", generatedAt: new Date().toISOString(), license: catalogApiLicense, cameras: cameras.map(camera => ({ ...camera, freshness: cameraFreshness(camera) })) }, { headers });
}

export function OPTIONS() { return new Response(null, { status: 204, headers }); }

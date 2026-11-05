import { getCameras } from "@/lib/camera-repository";
import { itsSnapshotResponse } from "@/lib/its-snapshot";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[1-9]\d{0,8}$/.test(id)) return Response.json({ error: "camera_not_found" }, { status: 404 });
  const camera = (await getCameras()).find(camera => camera.id === `its:${id}` && camera.category === "its" && camera.snapshotSourceUrl);
  if (!camera) return Response.json({ error: "camera_not_found" }, { status: 404 });
  return itsSnapshotResponse(camera, request.signal);
}

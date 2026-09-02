import CameraMap from "@/components/CameraMap";
import { getCameras } from "@/lib/camera-repository";

export default async function Home() {
  return <CameraMap cameras={await getCameras()} />;
}

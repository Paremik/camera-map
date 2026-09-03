import { cameras } from "../data/cameras.ts";
import importedCameras from "../data/its-cameras.json";
import { reportedCameras } from "../data/reported-cameras.ts";
import { validateCameraDataset } from "./import-cameras.ts";
// Replace this boundary with a database/API without changing map components.
export async function getCameras() {
  return validateCameraDataset([...cameras, ...importedCameras, ...reportedCameras]);
}

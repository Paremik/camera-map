"use client";
import { useState, useMemo, useCallback } from "react";
import { filterCameras, type Camera, type CameraCategory } from "@/lib/camera";
import {
  cameraLayer,
  cameraLayers,
  type CameraLayer,
} from "@/lib/map-features";
export function useMapFilters(cameras: Camera[], favoriteIds: Set<string>) {
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CameraCategory | "all">("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [enabledLayers, setEnabledLayers] = useState<Set<CameraLayer>>(
    () => new Set(cameraLayers),
  );
  const [pageSize, setPageSize] = useState(50);
  const visible = useMemo(
    () =>
      filterCameras(cameras, { query, category, verifiedOnly }).filter(
        (camera) =>
          enabledLayers.has(cameraLayer(camera)) &&
          (!favoritesOnly || favoriteIds.has(camera.id)),
      ),
    [
      cameras,
      query,
      category,
      verifiedOnly,
      enabledLayers,
      favoritesOnly,
      favoriteIds,
    ],
  );
  const resetFilters = useCallback(() => {
    setQuery("");
    setCategory("all");
    setVerifiedOnly(false);
    setFavoritesOnly(false);
    setPageSize(50);
  }, []);
  return {
    favoritesOnly,
    setFavoritesOnly,
    query,
    setQuery,
    category,
    setCategory,
    verifiedOnly,
    setVerifiedOnly,
    enabledLayers,
    setEnabledLayers,
    pageSize,
    setPageSize,
    visible,
    resetFilters,
  };
}

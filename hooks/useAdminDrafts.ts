"use client";
import { useEffect, useState } from "react";
import {
  adminDraftStorageKey,
  parseAdminDrafts,
  type CameraAdminDrafts,
  type CameraAdminPatch,
} from "@/lib/admin-drafts";
export function useAdminDrafts(knownIds: Set<string>) {
  const [adminDrafts, setAdminDrafts] = useState<CameraAdminDrafts>({});
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(adminDraftStorageKey);
    } catch {
      /* Admin drafts remain available for this tab. */
    }
    setAdminDrafts(parseAdminDrafts(saved, knownIds));
  }, [knownIds]);
  function storeAdminDrafts(next: CameraAdminDrafts) {
    setAdminDrafts(next);
    try {
      localStorage.setItem(adminDraftStorageKey, JSON.stringify(next));
    } catch {
      /* Editing still works until reload. */
    }
  }
  function saveAdminDraft(id: string, patch: CameraAdminPatch) {
    storeAdminDrafts({ ...adminDrafts, [id]: patch });
  }
  function deleteAdminDraft(id: string) {
    const next = { ...adminDrafts };
    delete next[id];
    storeAdminDrafts(next);
  }
  function clearAdminDrafts() {
    storeAdminDrafts({});
  }

  return { adminDrafts, saveAdminDraft, deleteAdminDraft, clearAdminDrafts };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FAVORITES_KEY, readFavorites, writeFavorites } from "@/lib/camera-preferences";

export function useFavorites(knownIds: ReadonlySet<string>) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const current = useRef<string[]>([]);

  useEffect(() => {
    function receive(raw: string | null) {
      current.current = readFavorites(raw, knownIds);
      setIds(current.current);
    }
    try {
      receive(window.localStorage.getItem(FAVORITES_KEY));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    setReady(true);
    function sync(event: StorageEvent) {
      try {
        if (event.storageArea === window.localStorage && (event.key === FAVORITES_KEY || event.key === null)) {
          receive(event.newValue);
          setStorageError(false);
        }
      } catch { setStorageError(true); }
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [knownIds]);

  const toggle = useCallback((id: string) => {
    if (!ready || !knownIds.has(id)) return;
    const next = current.current.includes(id) ? current.current.filter((value) => value !== id) : [...current.current, id];
    current.current = next;
    setIds(next);
    try {
      window.localStorage.setItem(FAVORITES_KEY, writeFavorites(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [knownIds, ready]);

  return { ids, ready, storageError, toggle };
}

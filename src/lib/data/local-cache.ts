// ─────────────────────────────────────────────────────────────
// CHRONOS — Cópia local do estado (localStorage), isolada por usuário
// ─────────────────────────────────────────────────────────────
import type { DataState } from "@/lib/data/models";

export const STORAGE_KEY = "chronos:data:v1";

export function getStorageKey(uid?: string): string {
  if (uid && uid !== "local-user-esly" && uid !== "") {
    return `chronos_data_state_${uid}`;
  }
  return STORAGE_KEY;
}

export function loadFromStorage(uid?: string): DataState | null {
  if (typeof window === "undefined") return null;
  try {
    const key = getStorageKey(uid);
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as DataState;
  } catch {
    return null;
  }
}

export function saveToStorage(state: DataState, uid?: string) {
  if (typeof window === "undefined") return;
  try {
    const key = getStorageKey(uid);
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Ignore storage quota or serialization issues
  }
}

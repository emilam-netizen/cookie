import { createInitialState, toSerializableState } from "./logic";
import type { GameState } from "./types";

const STORAGE_KEY = "cookie-kingdom-save-v1";

export function loadGameState(): GameState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialState();
    }

    const parsed = JSON.parse(raw);
    return {
      ...createInitialState(),
      ...toSerializableState(parsed),
    };
  } catch {
    return createInitialState();
  }
}

export function saveGameState(state: GameState): void {
  const serialized = JSON.stringify(toSerializableState(state));
  window.localStorage.setItem(STORAGE_KEY, serialized);
}

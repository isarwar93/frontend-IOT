// useLiveSeries.ts
import { useSyncExternalStore } from "react";
import { subscribeBuffer, getVersionSnapshot, getArrays, getCounters } from "./MedWebSocket";

/** Re-renders when version changes; reads arrays/counters after render */
export function useLiveSeries() {
  // Primitive snapshot avoids infinite loops and works with StrictMode/SSR
  const _version = useSyncExternalStore(
    subscribeBuffer,
    getVersionSnapshot,
    getVersionSnapshot
  );

  // Safe to read on every render; identities are stable
  const arrays = getArrays();
  const counters = getCounters();

  return {
    ...arrays,            // times, values, cap
    ...counters,          // head, len (mutated in place)
    version: _version,    // if -> ever want to display it
  };
}

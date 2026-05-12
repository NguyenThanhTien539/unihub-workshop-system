import { AppState } from "react-native";
import { useEffect, useRef } from "react";
import { countPendingEvents } from "../db/offlineEventDao";
import { useNetworkStore } from "../network/networkStore";
import { syncPendingEvents } from "./syncService";

export function useAutoSync() {
  const isOnline = useNetworkStore((state) => state.isOnline);
  const wasOnline = useRef(isOnline);

  useEffect(() => {
    if (!wasOnline.current && isOnline) {
      void syncIfUseful();
    }
    wasOnline.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && useNetworkStore.getState().isOnline) {
        void syncIfUseful();
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (useNetworkStore.getState().isOnline) {
        void syncIfUseful();
      }
    }, 60000);

    return () => clearInterval(timer);
  }, []);
}

async function syncIfUseful() {
  const pending = await countPendingEvents();
  if (pending > 0) {
    await syncPendingEvents();
  }
}

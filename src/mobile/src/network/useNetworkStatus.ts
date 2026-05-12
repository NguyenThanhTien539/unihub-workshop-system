import NetInfo from "@react-native-community/netinfo";
import { useEffect } from "react";
import { useNetworkStore } from "./networkStore";

export function useNetworkStatus() {
  const setOnline = useNetworkStore((state) => state.setOnline);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const reachable = state.isInternetReachable;
      setOnline(Boolean(state.isConnected && (reachable === null || reachable)));
    });

    return unsubscribe;
  }, [setOnline]);

  return useNetworkStore();
}

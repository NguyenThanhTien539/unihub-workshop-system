import { create } from "zustand";

type NetworkState = {
  isOnline: boolean;
  lastChangedAt: string | null;
  setOnline: (isOnline: boolean) => void;
};

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: true,
  lastChangedAt: null,
  setOnline: (isOnline) =>
    set({
      isOnline,
      lastChangedAt: new Date().toISOString(),
    }),
}));

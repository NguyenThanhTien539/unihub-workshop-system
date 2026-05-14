import { useEffect } from "react";
import { initDatabase } from "../db/database";
import { useAuthStore } from "./authStore";

export function useAuthBootstrap() {
  const loadCurrentUser = useAuthStore((state) => state.loadCurrentUser);
  const finishBootstrap = useAuthStore((state) => state.finishBootstrap);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        await initDatabase();
        if (isMounted) {
          await loadCurrentUser();
        }
      } finally {
        if (isMounted) {
          finishBootstrap();
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [finishBootstrap, loadCurrentUser]);
}

import { ReactNode } from "react";
import { LoginScreen } from "../screens/LoginScreen";
import { LoadingView } from "../components/LoadingView";
import { useAuthBootstrap } from "../auth/useAuthBootstrap";
import { useAuthStore } from "../auth/authStore";
import { useNetworkStatus } from "../network/useNetworkStatus";

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  useNetworkStatus();
  useAuthBootstrap();

  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isBootstrapping) {
    return <LoadingView label="Dang khoi dong..." />;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}

"use client";

import { useRouter } from "next/navigation";
import { logout } from "../lib/adminAuth";

type LogoutButtonProps = {
  children: React.ReactNode;
  className?: string;
  redirectTo?: string;
};

export default function LogoutButton({
  children,
  className,
  redirectTo = "/auth",
}: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <button type="button" onClick={handleLogout} className={className}>
      {children}
    </button>
  );
}

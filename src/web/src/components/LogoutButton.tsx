"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logout } from "../lib/adminAuth";
import Button from "./Button";

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
    toast.success("Đã đăng xuất.");
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <Button type="button" onClick={handleLogout} className={className}>
      {children}
    </Button>
  );
}

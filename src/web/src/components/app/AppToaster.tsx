"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      richColors
      closeButton
      position="top-right"
      toastOptions={{
        style: {
          fontSize: "14px",
          padding: "8px 12px",
          width: "auto",
          minHeight: "50px",
          borderRadius: "8px",
        },
      }}
    />
  );
}

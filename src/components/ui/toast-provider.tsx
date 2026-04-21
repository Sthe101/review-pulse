"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          borderRadius: 10,
          border: "1px solid var(--bd)",
        },
      }}
    />
  );
}

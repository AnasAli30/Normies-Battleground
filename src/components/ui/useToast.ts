"use client";

import { useCallback, useState } from "react";

export type ToastType = "info" | "success" | "error";

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, type: ToastType = "info") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => dismiss(id), 4500);
    return id;
  }, [dismiss]);

  const error = useCallback((message: string) => show(message, "error"), [show]);
  const success = useCallback((message: string) => show(message, "success"), [show]);
  const info = useCallback((message: string) => show(message, "info"), [show]);

  return { toasts, show, error, success, info, dismiss };
}

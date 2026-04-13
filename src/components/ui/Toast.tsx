"use client";

import { useToastStore } from "@/store/toastStore";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

export function ToastContainer() {
  const { toasts, remove } = useToastStore();

  return (
    <div className="fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
      {toasts.map((toast) => {
        const styles =
          toast.type === "success"
            ? "bg-green-50 border-green-300 text-green-900"
            : toast.type === "error"
            ? "bg-red-50 border-red-300 text-red-900"
            : "bg-blue-50 border-blue-300 text-blue-900";
        const Icon =
          toast.type === "success"
            ? CheckCircle
            : toast.type === "error"
            ? AlertCircle
            : Info;
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 shadow-md ${styles}`}
          >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <p className="flex-1 text-sm">{toast.message}</p>
            <button
              onClick={() => remove(toast.id)}
              className="text-current opacity-60 hover:opacity-100"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

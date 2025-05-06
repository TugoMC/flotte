// src/components/ui/toast.jsx
import * as React from "react";
import { X } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const ToastContext = React.createContext({});

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = React.useState([]);

  const toast = React.useCallback(({ title, description, variant = "default", duration = 3000 }) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, variant, duration }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, duration);
  }, []);

  const dismiss = React.useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <Toaster toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
};

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full",
  {
    variants: {
      variant: {
        default: "border bg-white text-gray-950",
        destructive: "destructive group border-red-500 bg-red-500 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Toast({ id, title, description, variant, dismiss }) {
  return (
    <div className={cn(toastVariants({ variant }))}>
      <div className="grid gap-1">
        {title && <div className="text-sm font-semibold">{title}</div>}
        {description && <div className="text-sm opacity-90">{description}</div>}
      </div>
      <button
        className="absolute top-2 right-2 rounded-md p-1 text-gray-950/50 opacity-0 transition-opacity hover:text-gray-950 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600"
        onClick={() => dismiss(id)}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function Toaster({ toasts, dismiss }) {
  return (
    <div className="fixed top-0 right-0 z-50 flex flex-col gap-2 w-full max-w-md p-4">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} dismiss={dismiss} />
      ))}
    </div>
  );
}

export { ToastContext, ToastProvider, Toaster, Toast };
"use client";

import * as React from "react";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastNotificationProps {
  variant: ToastVariant;
  title: string;
  description?: string;
  onClose?: () => void;
  className?: string;
}

const VARIANT_CONFIG = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-emerald-400",
    borderClass: "border-emerald-500/30",
    bgClass: "bg-emerald-500/10",
    glowClass: "shadow-emerald-500/10",
    accentClass: "bg-emerald-400",
  },
  error: {
    icon: XCircle,
    iconClass: "text-red-400",
    borderClass: "border-red-500/30",
    bgClass: "bg-red-500/10",
    glowClass: "shadow-red-500/10",
    accentClass: "bg-red-400",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-400",
    borderClass: "border-amber-500/30",
    bgClass: "bg-amber-500/10",
    glowClass: "shadow-amber-500/10",
    accentClass: "bg-amber-400",
  },
  info: {
    icon: Info,
    iconClass: "text-blue-400",
    borderClass: "border-blue-500/30",
    bgClass: "bg-blue-500/10",
    glowClass: "shadow-blue-500/10",
    accentClass: "bg-blue-400",
  },
} as const;

export function ToastNotification({ variant, title, description, onClose, className }: ToastNotificationProps) {
  const cfg = VARIANT_CONFIG[variant];
  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 rounded-xl border px-4 py-3.5 shadow-xl",
        "backdrop-blur-md bg-card/90",
        cfg.borderClass,
        cfg.glowClass,
        "animate-in slide-in-from-top-3 fade-in duration-300",
        className
      )}
    >
      {/* Left accent bar */}
      <div className={cn("absolute left-0 top-3 bottom-3 w-0.5 rounded-full", cfg.accentClass)} />

      {/* Icon */}
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", cfg.bgClass)}>
        <Icon className={cn("h-4 w-4", cfg.iconClass)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm font-semibold text-foreground leading-snug">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>

      {/* Close */}
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-zinc-500/10 transition-colors mt-0.5"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* ───── Floating Toast Portal ───── */

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-5 right-5 z-[200] flex flex-col gap-2.5 w-full max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastNotification
            variant={t.variant}
            title={t.title}
            description={t.description}
            onClose={() => onDismiss(t.id)}
          />
        </div>
      ))}
    </div>
  );
}

/* ───── useToast hook ───── */

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const addToast = React.useCallback((toast: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const duration = toast.duration ?? 4500;

    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);

    return id;
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, dismiss };
}

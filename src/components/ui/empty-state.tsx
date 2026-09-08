import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  variant?: "card" | "dashed" | "minimal";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  variant = "dashed",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 transition-all rounded-2xl",
        variant === "dashed" && "border-2 border-dashed border-border/70 bg-card/40 hover:border-border",
        variant === "card" && "border border-border/80 bg-card shadow-xs",
        variant === "minimal" && "p-6",
        className
      )}
    >
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 mb-4 ring-8 ring-blue-500/5">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-sm leading-relaxed">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <Button
              onClick={onAction}
              size="sm"
              className="h-9 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 gap-1.5"
            >
              {ActionIcon && <ActionIcon className="h-3.5 w-3.5" />}
              <span>{actionLabel}</span>
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              onClick={onSecondaryAction}
              variant="outline"
              size="sm"
              className="h-9 px-4 text-xs font-semibold border-border/80 hover:bg-muted"
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge Component
 * 
 * A small status indicator
 */

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-accent text-background",
        secondary: "bg-surface-elevated text-text-secondary border border-border",
        outline: "border border-accent text-accent",
        legendary: "bg-tier-legendary/20 text-tier-legendary border border-tier-legendary/50",
        epic: "bg-tier-epic/20 text-tier-epic border border-tier-epic/50",
        rare: "bg-tier-rare/20 text-tier-rare border border-tier-rare/50",
        common: "bg-tier-common/20 text-tier-common border border-tier-common/50",
        success: "bg-success-muted text-success border border-success/50",
        warning: "bg-warning-muted text-warning border border-warning/50",
        error: "bg-error-muted text-error border border-error/50",
        info: "bg-info-muted text-info border border-info/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };





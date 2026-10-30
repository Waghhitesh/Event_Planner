import type { HTMLAttributes, ReactNode } from "react";

export type BadgeVariant = "default" | "violet" | "green" | "yellow" | "red" | "blue";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const BASE_STYLES = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
  violet: "bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300",
  green: "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300",
  yellow: "bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300",
  red: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300",
  blue: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
};

export function Badge({ variant = "default", className = "", children, ...props }: BadgeProps) {
  const classes = `${BASE_STYLES} ${VARIANT_STYLES[variant]} ${className}`.trim();
  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}

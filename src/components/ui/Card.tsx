import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
}

const PADDING_STYLES = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export function Card({ padding = "md", className = "", children, ...props }: CardProps) {
  const classes =
    `rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm ${PADDING_STYLES[padding]} ${className}`.trim();
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

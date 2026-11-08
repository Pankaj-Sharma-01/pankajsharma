import type { ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  className?: string;
  /** "wide" for image-heavy pages; text pages keep a readable measure. */
  size?: "default" | "wide";
};

/** Constrains content to a readable width with consistent horizontal padding. */
export function Container({ children, className = "", size = "default" }: ContainerProps) {
  const maxWidth = size === "wide" ? "max-w-5xl" : "max-w-3xl";
  return (
    <div className={`mx-auto w-full ${maxWidth} px-5 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}

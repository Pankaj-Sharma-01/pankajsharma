import type { ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

/** Constrains content to a readable width with consistent horizontal padding. */
export function Container({ children, className = "" }: ContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-3xl px-5 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}

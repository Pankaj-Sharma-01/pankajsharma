"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { mainNav } from "@/data/navigation";
import { normalizePath } from "@/lib/paths";

/**
 * Primary navigation. Client component only to mark the active route.
 * Hidden on the home page, where the sections are discovered by flying
 * through the city instead.
 */
export function MainNav() {
  const pathname = normalizePath(usePathname());
  const navRef = useRef<HTMLElement>(null);

  // On narrow screens the nav scrolls sideways: keep the active tab in view.
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
  }, [pathname]);

  if (pathname === "/") return null;

  return (
    <nav ref={navRef} aria-label="Main" className="relative -mx-1 overflow-x-auto [scrollbar-width:none]">
      <ul className="flex items-center gap-x-1 px-1 font-mono text-xs tracking-wider uppercase">
        {mainNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                data-text={item.label}
                aria-current={isActive ? "page" : undefined}
                className={`glitch block rounded-sm px-1.5 py-1.5 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  isActive
                    ? "text-glow bg-accent/10 text-accent shadow-[inset_0_-2px_0_var(--hot)]"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

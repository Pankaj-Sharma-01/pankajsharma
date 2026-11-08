"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { mainNav } from "@/data/navigation";
import { normalizePath } from "@/lib/paths";

/** Primary navigation. Client component only to mark the active route. */
export function MainNav() {
  const pathname = normalizePath(usePathname());

  return (
    <nav aria-label="Main">
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        {mainNav.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
                  isActive ? "text-foreground font-medium" : "text-muted"
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

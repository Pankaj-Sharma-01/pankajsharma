import { mainNav } from "@/data/navigation";
import type { NavItem } from "@/types/site";

/** Two-digit position of a section in the main navigation: "/about" → "01". */
export function sectorNumber(href: NavItem["href"]): string {
  const index = mainNav.findIndex((item) => item.href === href);
  return String(index + 1).padStart(2, "0");
}

/** "Sector 03 // Education": the page eyebrow and city gate label. */
export function sectorLabel(href: NavItem["href"]): string {
  const item = mainNav.find((navItem) => navItem.href === href);
  return `Sector ${sectorNumber(href)} // ${item?.label ?? ""}`;
}

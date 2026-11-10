import {
  BookOpen,
  Boxes,
  Briefcase,
  Building2,
  Camera,
  GraduationCap,
  HeartPulse,
  MessageSquareText,
  User,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  "/": Building2,
  "/about": User,
  "/experience": Briefcase,
  "/education": GraduationCap,
  "/projects": Boxes,
  "/books": BookOpen,
  "/thoughts": MessageSquareText,
  "/pictures": Camera,
  "/health": HeartPulse,
};

type SectorIconProps = {
  href: string;
  className?: string;
};

/** Decorative icon for a site section; always paired with a text label. */
export function SectorIcon({ href, className }: SectorIconProps) {
  const Icon = icons[href] ?? Building2;
  return <Icon aria-hidden="true" className={className} />;
}

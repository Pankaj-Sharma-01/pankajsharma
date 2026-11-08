import { ExternalLink } from "@/components/ui/external-link";
import { siteConfig } from "@/data/site";

type SocialLinksProps = {
  className?: string;
};

export function SocialLinks({ className = "" }: SocialLinksProps) {
  const links = [siteConfig.links.github, siteConfig.links.linkedin, siteConfig.links.x];

  return (
    <ul className={`flex flex-wrap gap-x-5 gap-y-2 ${className}`}>
      {links.map((link) => (
        <li key={link.href}>
          <ExternalLink href={link.href}>{link.label}</ExternalLink>
        </li>
      ))}
    </ul>
  );
}

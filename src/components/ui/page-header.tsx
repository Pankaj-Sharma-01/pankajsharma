type PageHeaderProps = {
  title: string;
  description?: string;
  /** Small label above the title, e.g. "Sector 03 // Education". */
  eyebrow?: string;
};

/** Title block shared by top-level pages. Renders the page's single <h1>. */
export function PageHeader({ title, description, eyebrow }: PageHeaderProps) {
  return (
    <header className="space-y-4 border-b border-border pb-8">
      {eyebrow ? (
        <p className="hud-label text-glow-hot text-hot">
          {eyebrow}
          <span aria-hidden="true" className="caret ml-1">
            _
          </span>
        </p>
      ) : null}
      <h1
        data-text={title}
        className="glitch w-fit font-display text-2xl leading-tight uppercase sm:text-4xl"
      >
        {title}
      </h1>
      {description ? <p className="max-w-prose text-lg text-muted">{description}</p> : null}
    </header>
  );
}

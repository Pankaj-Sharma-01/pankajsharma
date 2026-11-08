type PageHeaderProps = {
  title: string;
  description?: string;
};

/** Title block shared by top-level pages. Renders the page's single <h1>. */
export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="space-y-3">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      {description ? <p className="text-lg text-muted">{description}</p> : null}
    </header>
  );
}

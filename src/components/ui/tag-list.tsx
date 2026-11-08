type TagListProps = {
  items: readonly string[];
  /** Accessible name for the list, e.g. "Technologies". */
  label: string;
};

export function TagList({ items, label }: TagListProps) {
  if (items.length === 0) return null;
  return (
    <ul aria-label={label} className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className="border border-border bg-surface px-3 py-1 font-mono text-xs tracking-wide text-muted transition-colors hover:border-hot/60 hover:text-hot"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

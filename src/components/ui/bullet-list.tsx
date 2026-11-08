type BulletListProps = {
  items: readonly string[];
};

export function BulletList({ items }: BulletListProps) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-1.5 text-muted">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span aria-hidden="true" className="font-mono text-hot">
            &gt;
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

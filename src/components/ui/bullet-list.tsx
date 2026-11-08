type BulletListProps = {
  items: readonly string[];
};

export function BulletList({ items }: BulletListProps) {
  if (items.length === 0) return null;
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-muted marker:text-border">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

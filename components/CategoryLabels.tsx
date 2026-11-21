const MAX_VISIBLE_CATEGORIES = 3;

// A card's categories as small muted labels, the first few spelled out and the
// rest folded into a "+N" (full list on hover). Renders a fragment — the labels
// are meant to sit directly in the card's flex-wrap title row.
export function CategoryLabels({ categories }: { categories: string[] }) {
  const visible = categories.slice(0, MAX_VISIBLE_CATEGORIES);
  const hidden = categories.slice(MAX_VISIBLE_CATEGORIES);

  return (
    <>
      {visible.map(category => (
        <span key={category} className="shrink-0 text-xs text-muted-foreground">
          {category}
        </span>
      ))}
      {hidden.length > 0 && (
        <span className="shrink-0 text-xs text-muted-foreground" title={hidden.join(", ")}>
          +{hidden.length}
        </span>
      )}
    </>
  );
}

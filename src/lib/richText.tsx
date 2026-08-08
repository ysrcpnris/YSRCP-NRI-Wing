// Shared by the Welcome Message admin editor's preview and every
// member-facing surface that renders the same body text, so the two can
// never quietly drift apart. Intentionally tiny: blank line = new
// paragraph, **stars** = bold. Nothing else — this isn't a markdown engine.
export function renderParagraphs(body: string, emptyHint?: string) {
  const paragraphs = body.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paragraphs.length === 0 && emptyHint) {
    return [<p key="empty" className="opacity-60">{emptyHint}</p>];
  }
  return paragraphs.map((para, i) => {
    const parts = para.split(/\*\*(.+?)\*\*/g);
    return (
      <p key={i} style={{ marginTop: i === 0 ? 0 : "0.85em" }}>
        {parts.map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>))}
      </p>
    );
  });
}

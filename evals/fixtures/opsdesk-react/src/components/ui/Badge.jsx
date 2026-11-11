/** Status label. Tones map to the semantic colour roles. */
export function Badge({ tone = "neutral", children }) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>;
}

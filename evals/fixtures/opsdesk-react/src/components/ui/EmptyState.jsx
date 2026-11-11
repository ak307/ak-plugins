export function EmptyState({ title, children, action }) {
  return (
    <div className="ui-empty">
      <p className="ui-empty__title">{title}</p>
      {children && <p className="ui-empty__text">{children}</p>}
      {action}
    </div>
  );
}

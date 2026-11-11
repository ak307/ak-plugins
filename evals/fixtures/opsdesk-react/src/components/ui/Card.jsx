export function Card({ title, actions, children, className = "" }) {
  return (
    <section className={`ui-card ${className}`}>
      {(title || actions) && (
        <header className="ui-card__head">
          {title && <h2 className="ui-card__title">{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

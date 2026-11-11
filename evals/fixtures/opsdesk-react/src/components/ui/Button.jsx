/** The one button for the whole app: variants and sizes come from tokens; `busy` holds the width and blocks re-presses. */
export function Button({ variant = "primary", size = "md", busy = false, children, className = "", ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`ui-button ui-button--${variant} ui-button--${size} ${className}`}
      aria-busy={busy || undefined}
      disabled={props.disabled || busy}
    >
      {busy && <span className="ui-spinner" aria-hidden="true" />}
      <span className="ui-button__label">{children}</span>
    </button>
  );
}

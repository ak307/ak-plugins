import { useId } from "react";

/** Label, control, hint and error wired together for screen readers. */
export function Field({ label, hint, error, children }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`ui-field ${error ? "ui-field--error" : ""}`}>
      <label className="ui-field__label" htmlFor={id}>{label}</label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint && <p className="ui-field__hint" id={hintId}>{hint}</p>}
      {error && <p className="ui-field__error" id={errorId} role="alert">{error}</p>}
    </div>
  );
}

export function TextInput(props) {
  return <input className="ui-input" {...props} />;
}

export function TextArea(props) {
  return <textarea className="ui-input ui-input--area" {...props} />;
}

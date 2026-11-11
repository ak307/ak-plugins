import { useEffect, useRef } from "react";

/** A real <dialog>: Escape closes it, focus moves in, and returns to whatever opened it. */
export function Modal({ open, title, onClose, children, footer }) {
  const dialog = useRef(null);
  const opener = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    if (open && !element.open) {
      opener.current = document.activeElement;
      element.showModal();
    } else if (!open && element.open) {
      element.close();
      opener.current?.focus?.();
    }
  }, [open]);
  return (
    <dialog ref={dialog} className="ui-modal" aria-labelledby="ui-modal-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <header className="ui-modal__head">
        <h2 id="ui-modal-title">{title}</h2>
        <button type="button" className="ui-modal__close" aria-label="Close" onClick={onClose}>×</button>
      </header>
      <div className="ui-modal__body">{children}</div>
      {footer && <footer className="ui-modal__foot">{footer}</footer>}
    </dialog>
  );
}

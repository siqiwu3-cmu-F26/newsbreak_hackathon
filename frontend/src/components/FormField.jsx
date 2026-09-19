// Labelled input/select with an optional hint and an error wired up for screen readers.
export default function FormField({ id, label, error, hint, as: Control = 'input', className = '', children, ...controlProps }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">{label}</label>
      <Control
        id={id}
        name={id}
        className="form-input"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...controlProps}
      >
        {children}
      </Control>
      {hint && !error && <p id={`${id}-hint`} className="mt-2 text-sm text-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  );
}

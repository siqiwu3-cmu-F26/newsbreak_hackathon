export default function BudgetInput({ value, onChange, error }) {
  return (
    <div>
      <label htmlFor="budget" className="field-label">Total budget (USD)</label>
      <input id="budget" name="budget" className="form-input" type="number" inputMode="decimal" min="0" step="10" required value={value} onChange={event => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? 'budget-help budget-error' : 'budget-help'} />
      <p id="budget-help" className="mt-2 text-xs text-muted">For the whole group. Time Credits are shown separately.</p>
      {error && <p id="budget-error" className="field-error">{error}</p>}
    </div>
  );
}

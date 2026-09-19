import { GROUPS } from '../lib/planRequest.js';

export default function GroupSelector({ value, onChange, error }) {
  return (
    <fieldset aria-describedby={error ? 'groupType-error' : undefined}>
      <legend className="field-label mb-3">Who's coming?</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {GROUPS.map(group => (
          <label key={group.value} className="choice-card">
            <input className="sr-only peer" type="radio" name="groupType" value={group.value} checked={value === group.value} onChange={() => onChange(group.value)} aria-invalid={Boolean(error)} />
            <span className="choice-card-content">
              <span className="font-semibold">{group.label}</span>
              <span className="mt-1 text-xs leading-relaxed text-muted">{group.description}</span>
            </span>
          </label>
        ))}
      </div>
      {error && <p id="groupType-error" className="field-error">{error}</p>}
    </fieldset>
  );
}

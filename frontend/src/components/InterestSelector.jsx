import { INTERESTS } from '../lib/planRequest.js';

export default function InterestSelector({ value, onChange, error }) {
  function toggle(interest) {
    onChange(value.includes(interest) ? value.filter(item => item !== interest) : [...value, interest]);
  }
  return (
    <fieldset aria-describedby={error ? 'interests-help interests-error' : 'interests-help'}>
      <legend className="field-label">What sounds good?</legend>
      <p id="interests-help" className="mt-1 text-sm text-muted">Choose one or more interests.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {INTERESTS.map(interest => (
          <label key={interest} className="choice-card">
            <input className="sr-only peer" type="checkbox" name="interests" value={interest} checked={value.includes(interest)} onChange={() => toggle(interest)} aria-invalid={Boolean(error)} />
            <span className="interest-choice">{interest[0].toUpperCase() + interest.slice(1)}</span>
          </label>
        ))}
      </div>
      {error && <p id="interests-error" className="field-error">{error}</p>}
    </fieldset>
  );
}

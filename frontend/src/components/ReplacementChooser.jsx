function price(experience) {
  if (experience.cost > 0) return `$${experience.cost}`;
  if (experience.credits > 0) return `${experience.credits} credit${experience.credits === 1 ? '' : 's'}`;
  return 'Free';
}

export default function ReplacementChooser({ target, options, conflict, busy, loading, shorterOnly, onChoose, onCancel, onKeepReplacement, onChooseShorter }) {
  if (!target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="replacement-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-7">
        {conflict ? (
          <>
            <p className="eyebrow">Schedule conflict</p>
            <h2 id="replacement-title" className="mt-3 text-2xl font-semibold">This change needs a decision.</h2>
            <p className="mt-3 leading-relaxed text-muted">
              <strong className="text-ink">{conflict.replacement.name}</strong> is {conflict.extraMinutes} minutes longer. Keeping it would push {conflict.removedNames.join(', ')} past your {conflict.endTime} end time.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <button type="button" disabled={busy} onClick={onKeepReplacement} className="button-primary">
                {busy ? 'Updating…' : `Keep it, drop ${conflict.removedNames.length > 1 ? 'later stops' : 'last stop'}`}
              </button>
              <button type="button" disabled={busy} onClick={onChooseShorter} className="button-secondary">Choose a shorter option</button>
              <button type="button" disabled={busy} onClick={onCancel} className="text-button justify-center">Keep current plan</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="eyebrow">Agent alternatives</p>
                <h2 id="replacement-title" className="mt-3 text-2xl font-semibold">Replace {target.name}</h2>
                <p className="mt-2 text-muted">Pick the tradeoff you prefer. Nothing changes until you choose.</p>
              </div>
              <button type="button" disabled={busy} onClick={onCancel} className="text-button" aria-label="Close replacement choices">Close</button>
            </div>
            {shorterOnly && <p className="mt-5 rounded-xl bg-brand-soft p-3 text-sm text-brand">Showing options that fit without moving later stops.</p>}
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {options.map((option) => {
                const durationDelta = option.duration - target.duration;
                const costDelta = option.cost - target.cost;
                return (
                  <article key={option.id} className="flex flex-col rounded-xl border border-line p-4">
                    <span className="text-xs font-semibold uppercase tracking-wide text-brand">{option.type === 'community' ? 'Meet a local' : option.category}</span>
                    <h3 className="mt-2 text-lg font-semibold">{option.name}</h3>
                    <p className="mt-2 text-sm text-muted">{option.duration} min · {price(option)} · {option.indoor ? 'Indoor' : 'Outdoor'}</p>
                    <div className="mt-4 space-y-2 text-sm leading-relaxed">
                      <p><span className="font-semibold">Time:</span> {durationDelta === 0 ? 'same length' : `${Math.abs(durationDelta)} min ${durationDelta > 0 ? 'longer' : 'shorter'}`}</p>
                      <p><span className="font-semibold">Budget:</span> {costDelta === 0 ? 'same cost' : `$${Math.abs(costDelta)} ${costDelta > 0 ? 'more' : 'less'}`}</p>
                    </div>
                    <button type="button" disabled={busy} onClick={() => onChoose(option)} className="button-secondary mt-5 w-full">Choose this</button>
                  </article>
                );
              })}
            </div>
            {loading && <p role="status" className="mt-6 text-muted">Loading alternatives...</p>}
            {!loading && !options.length && <p className="mt-6 rounded-xl bg-canvas p-4 text-muted">No alternatives are available for this selection. Keep the current activity or adjust the day’s end time.</p>}
          </>
        )}
      </section>
    </div>
  );
}

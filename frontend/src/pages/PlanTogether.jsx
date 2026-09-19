import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { createPlan } from '../services/api.js';

function costLabel(option) {
  if (option.cost > 0 && option.credits > 0) return `$${option.cost} + ${option.credits} credit`;
  if (option.cost > 0) return `$${option.cost}`;
  if (option.credits > 0) return `${option.credits} time credit${option.credits === 1 ? '' : 's'}`;
  return 'Free';
}

export default function PlanTogether({ onPlanReady }) {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const request = state?.request;
  const options = state?.options;

  if (!request || !Array.isArray(options)) {
    return (
      <section className="panel mx-auto max-w-2xl p-7 sm:p-10">
        <p className="eyebrow">Plan together</p>
        <h1 className="mt-3 text-3xl font-semibold">Start with your preferences.</h1>
        <p className="mt-3 text-muted">I need a little context before suggesting the right anchor for your day.</p>
        <Link to="/" className="button-primary mt-6">Choose preferences</Link>
      </section>
    );
  }

  async function choose(option) {
    if (loading) return;
    setSelectedId(option.id);
    setLoading(true);
    setNotice('');
    try {
      const result = await createPlan({
        ...request,
        lockedActivityIds: [option.id],
        rejectedActivityIds: options.filter((item) => item.id !== option.id).map((item) => item.id),
      });
      onPlanReady({ ...result, request, anchor: option, id: crypto.randomUUID() });
      navigate('/itinerary');
    } catch {
      setNotice('I could not finish the plan yet. Your choice is still here—please try again.');
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl">
      <Link to="/" className="text-button">← Edit preferences</Link>
      <div className="mt-5 max-w-3xl">
        <p className="eyebrow">Step 1 · Pick the anchor</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">What should we build the day around?</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">{state.message}</p>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {options.map((option, index) => (
          <article key={option.id} className={`panel flex h-full flex-col overflow-hidden ${selectedId === option.id ? 'ring-2 ring-brand' : ''}`}>
            <div className="h-2 bg-brand" style={{ opacity: 1 - index * 0.18 }} />
            <div className="flex flex-1 flex-col p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">{option.label}</span>
                <span className="text-xs font-medium uppercase tracking-wide text-muted">{option.type === 'community' ? 'Hosted by a local' : 'Local place'}</span>
              </div>
              <h2 className="mt-5 text-xl font-semibold">{option.name}</h2>
              <p className="mt-2 text-sm capitalize text-muted">{option.category} · {option.duration} min · {costLabel(option)}</p>
              <p className="mt-5 leading-relaxed"><span className="font-semibold text-brand">Why it fits:</span> {option.reason}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted"><span className="font-semibold text-ink">Tradeoff:</span> {option.tradeoff}</p>
              <button type="button" disabled={loading} onClick={() => choose(option)} className="button-primary mt-6 w-full">
                {loading && selectedId === option.id ? 'Building around this…' : 'Build around this'}
              </button>
            </div>
          </article>
        ))}
      </div>
      {notice && <p role="alert" className="field-error mt-5">{notice}</p>}
      <p className="mt-6 text-sm text-muted">Next, the agent will fit food, travel, weather, budget, and timing around your choice.</p>
    </section>
  );
}

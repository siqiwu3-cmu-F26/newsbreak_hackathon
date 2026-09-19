import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import GroupSelector from '../components/GroupSelector.jsx';
import InterestSelector from '../components/InterestSelector.jsx';
import BudgetInput from '../components/BudgetInput.jsx';
import { createDraft, DEMO_REQUEST, toPlanRequest, validateDraft } from '../lib/planRequest.js';
import { createPlan } from '../services/api.js';

export default function Home({ draft, onDraftChange, onPlanReady }) {
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const mock = search.get('mock') === '1';
  const [attempted, setAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const requestRef = useRef(null);
  const submittingRef = useRef(false);
  const formRef = useRef(null);
  const errors = attempted ? validateDraft(draft) : {};

  useEffect(() => () => requestRef.current?.abort(), []);

  function update(field, value) {
    const next = { ...draft, [field]: value };
    if (field === 'groupType') {
      if (value === 'solo') next.people = '1';
      else if (draft.groupType === 'solo') next.people = '2';
    }
    setNotice('');
    onDraftChange(next);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) return;
    setAttempted(true);
    const nextErrors = validateDraft(draft);
    if (Object.keys(nextErrors).length) {
      formRef.current.querySelector('[name="' + Object.keys(nextErrors)[0] + '"]')?.focus();
      return;
    }
    submittingRef.current = true;
    setLoading(true);
    setNotice('');
    const controller = new AbortController();
    requestRef.current = controller;
    const request = toPlanRequest(draft);
    try {
      const result = await createPlan(request, { mock, signal: controller.signal });
      if (controller.signal.aborted) return;
      onPlanReady({ ...result, request, id: crypto.randomUUID() });
      navigate(mock ? '/itinerary?mock=1' : '/itinerary');
    } catch {
      if (controller.signal.aborted) setNotice('Planning canceled. Your preferences are saved.');
      else setNotice('Something went wrong. Your preferences are saved; please try again.');
    } finally {
      submittingRef.current = false;
      requestRef.current = null;
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl">
      <p className="eyebrow">Good days start close to home</p>
      <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
        Make a day of it. <span className="text-brand">Together.</span>
      </h1>
      <p className="mt-4 max-w-xl leading-relaxed text-muted">
        Tell us who's coming and what you love. Find local places and community
        experiences for a day around Palo Alto.
      </p>

      <form ref={formRef} noValidate onSubmit={handleSubmit} aria-label="Plan your day" aria-busy={loading} className="panel mt-8 p-5 sm:p-8">
        <fieldset disabled={loading} className="min-w-0 space-y-7 disabled:opacity-60">
          <legend className="sr-only">Your planning preferences</legend>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Your kind of day</h2>
            <button type="button" className="text-button" onClick={() => { onDraftChange(createDraft(DEMO_REQUEST)); setAttempted(false); setNotice('First-date example filled in. You can change any preference.'); }}>
              Fill first-date example
            </button>
          </div>

          <GroupSelector value={draft.groupType} onChange={value => update('groupType', value)} error={errors.groupType} />

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="people" className="field-label">Number of people</label>
              <input id="people" name="people" type="number" min="1" step="1" inputMode="numeric" required readOnly={draft.groupType === 'solo'} value={draft.people} onChange={event => update('people', event.target.value)} className="form-input" aria-invalid={Boolean(errors.people)} aria-describedby={errors.people ? 'people-error' : undefined} />
              {errors.people && <p id="people-error" className="field-error">{errors.people}</p>}
            </div>
            <BudgetInput value={draft.budget} onChange={value => update('budget', value)} error={errors.budget} />
          </div>

          <div>
            <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
              <div className="min-w-0">
                <label htmlFor="date" className="field-label">Date</label>
                <input id="date" name="date" type="date" required value={draft.date} onChange={event => update('date', event.target.value)} className="form-input" aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? 'date-error time-help' : 'time-help'} />
                {errors.date && <p id="date-error" className="field-error">{errors.date}</p>}
              </div>
              {['startTime', 'endTime'].map(field => (
                <div key={field} className="min-w-0">
                  <label htmlFor={field} className="field-label">{field === 'startTime' ? 'Start time' : 'End time'}</label>
                  <input id={field} name={field} type="time" required value={draft[field]} onChange={event => update(field, event.target.value)} className="form-input" aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? field + '-error time-help' : 'time-help'} />
                  {errors[field] && <p id={field + '-error'} className="field-error">{errors[field]}</p>}
                </div>
              ))}
            </div>
            <p id="time-help" className="mt-2 text-xs text-muted">Local time in Palo Alto, within the same day.</p>
          </div>

          <InterestSelector value={draft.interests} onChange={value => update('interests', value)} error={errors.interests} />

          <div>
            <label htmlFor="notes" className="field-label">Anything else? <span className="font-normal text-muted">(optional)</span></label>
            <textarea id="notes" name="notes" rows="3" maxLength="1000" value={draft.notes} onChange={event => update('notes', event.target.value)} className="form-input resize-y" placeholder="A first date, quiet places, activities for kids..." aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes ? 'notes-help notes-error' : 'notes-help'} />
            <p id="notes-help" className="mt-2 text-right text-xs text-muted">{draft.notes.length}/1,000</p>
            {errors.notes && <p id="notes-error" className="field-error">{errors.notes}</p>}
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-canvas p-4">
            <input type="checkbox" name="mock" checked={mock} onChange={event => { const next = new URLSearchParams(search); if (event.target.checked) next.set('mock', '1'); else next.delete('mock'); setSearch(next, { replace: true }); }} className="mt-1 size-4 shrink-0 accent-brand" />
            <span className="text-sm"><span className="font-semibold">Use sample plan</span><span className="mt-1 block leading-relaxed text-muted">Preview a fixed first-date example without connecting. It won't be tailored to your preferences.</span></span>
          </label>
        </fieldset>

        {Object.keys(errors).length > 0 && <p role="alert" className="field-error mt-5">Please check the highlighted fields before planning.</p>}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={loading} className="button-primary w-full sm:w-auto">
            {loading && <span aria-hidden="true" className="mr-2 size-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" />}
            {loading ? 'Planning your day...' : mock ? 'View Sample Plan' : 'Plan My Day'}
          </button>
          {loading && <button type="button" onClick={() => requestRef.current?.abort()} className="text-button">Cancel</button>}
        </div>
        <p role="status" className="mt-3 min-h-5 text-sm leading-relaxed text-muted">
          {loading ? 'Finding local experiences. If planning takes more than 15 seconds, we will show a labelled sample.' : notice || 'Your preferences stay saved in this browser tab.'}
        </p>
      </form>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/itinerary" className="button-secondary">View last itinerary</Link>
        <Link to="/community" className="text-button">Explore community</Link>
      </div>
    </section>
  );
}

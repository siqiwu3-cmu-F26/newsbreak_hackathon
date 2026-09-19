import { Link, useSearchParams } from 'react-router';
import Itinerary from './Itinerary.jsx';
import { getDemoItinerary } from '../data/demoItinerary.js';
import { DEMO_REQUEST } from '../lib/planRequest.js';
import { toDisplayPlan } from '../lib/itinerary.js';

const sourceMessages = {
  demo: 'You are viewing a fixed sample plan.',
  'backend-fallback': 'The planning service returned its backup example.',
  offline: 'We could not reach the planning service. Here is a sample you can explore.',
  timeout: 'Planning took longer than 15 seconds. Here is a sample you can explore.',
  'invalid-response': 'The planning response could not be displayed. Here is a sample you can explore.',
};

export default function PlanResult({ result }) {
  const [search] = useSearchParams();
  const mock = search.get('mock') === '1';
  const current = mock ? { itinerary: getDemoItinerary(), request: DEMO_REQUEST, source: 'demo', id: 'demo-preview' } : result;
  if (!current) {
    return (
      <section className="panel mx-auto max-w-2xl p-6 sm:p-10">
        <p className="eyebrow">Your day starts here</p>
        <h1 className="mt-3 text-3xl font-semibold">Let's plan something good.</h1>
        <p className="mt-4 text-muted">Choose your group, time, budget, and interests to create your first itinerary.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/" className="button-primary">Plan my day</Link>
          <Link to="/itinerary?mock=1" className="button-secondary">View sample plan</Link>
        </div>
      </section>
    );
  }
  const isSample = current.source !== 'api';
  const plan = toDisplayPlan(current.itinerary, isSample ? DEMO_REQUEST : current.request);
  return (
    <div>
      <div className="mx-auto mb-6 max-w-2xl">
        <Link to={mock ? '/?mock=1' : '/'} className="text-button">Edit preferences</Link>
        {isSample && (
          <aside role="status" className="mt-3 rounded-xl border border-line bg-brand-soft p-4 text-sm leading-relaxed">
            <p className="font-semibold">Sample itinerary</p>
            <p className="mt-1">{sourceMessages[current.source]} This example is for 2 people, 3–8 PM, with an $80 budget. It is not tailored to your submitted preferences.</p>
          </aside>
        )}
      </div>
      <Itinerary key={current.id} plan={plan} allowReplace={false} />
    </div>
  );
}

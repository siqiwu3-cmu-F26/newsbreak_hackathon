import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import MapView from '../components/MapView.jsx';
import WeatherContext from '../components/WeatherContext.jsx';
import { getDemoItinerary } from '../data/demoItinerary.js';
import { toDisplayPlan } from '../lib/itinerary.js';
import { DEMO_REQUEST } from '../lib/planRequest.js';
import { getEnvironmentContext, replaceItinerary, replanItinerary } from '../services/api.js';
import Itinerary from './Itinerary.jsx';

const sourceMessages = {
  demo: 'You are viewing a fixed sample plan.',
  'backend-fallback': 'The planning service returned its backup example.',
  offline: 'We could not reach the planning service. Here is a sample you can explore.',
  timeout: 'Planning took longer than 15 seconds. Here is a sample you can explore.',
  'invalid-response': 'The planning response could not be displayed. Here is a sample you can explore.',
};

const FALLBACK_ENVIRONMENT = {
  location: { city: 'Palo Alto' },
  weather: { condition: 'clear', temperature: 72 },
  sunset: '7:09 PM',
};

export default function PlanResult({ result }) {
  const [search] = useSearchParams();
  const mock = search.get('mock') === '1';
  const selected = mock
    ? { itinerary: getDemoItinerary(), request: DEMO_REQUEST, source: 'demo', id: 'demo-preview' }
    : result;
  const [itinerary, setItinerary] = useState(selected?.itinerary ?? null);
  const [environment, setEnvironment] = useState(FALLBACK_ENVIRONMENT);
  const [notice, setNotice] = useState('');
  const [replanning, setReplanning] = useState(false);

  useEffect(() => {
    setItinerary(selected?.itinerary ?? null);
    setNotice('');
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) return undefined;
    const firstStop = selected.itinerary.activities[0];
    let active = true;
    getEnvironmentContext({
      location: 'Palo Alto, CA',
      lat: firstStop?.lat,
      lng: firstStop?.lng,
      date: selected.request?.date,
    })
      .then((context) => {
        if (active) setEnvironment(context);
      })
      .catch(() => {
        if (active) setEnvironment(FALLBACK_ENVIRONMENT);
      });
    return () => { active = false; };
  }, [selected?.id]);

  if (!selected || !itinerary) {
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

  const isSample = selected.source !== 'api';
  const request = isSample ? DEMO_REQUEST : selected.request;
  const plan = toDisplayPlan(itinerary, request);

  async function handleReplace(activity) {
    setNotice('');
    try {
      const updated = await replaceItinerary(itinerary, activity.id || activity.experienceId, request);
      setItinerary(updated);
      setNotice(`${activity.name} was replaced while keeping the rest of your plan.`);
    } catch {
      setNotice('We could not replace that stop. Your current plan is unchanged.');
    }
  }

  async function handleRainReplan() {
    if (replanning) return;
    setReplanning(true);
    setNotice('');
    try {
      const hadOutdoorStop = itinerary.activities.some((activity) => !activity.indoor);
      const updated = await replanItinerary(itinerary, 'rain', request);
      setItinerary(updated);
      setEnvironment((current) => ({
        ...current,
        weather: { ...current.weather, condition: 'rain' },
      }));
      setNotice(hadOutdoorStop
        ? 'Plan updated for rain. Outdoor stops were replaced with indoor options.'
        : 'This plan was already rain-ready, so every stop stayed indoors.');
    } catch {
      setNotice('Weather replan is unavailable. Your current plan is unchanged.');
    } finally {
      setReplanning(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to={mock ? '/?mock=1' : '/'} className="text-button">Edit preferences</Link>
        <span className="text-sm text-muted">Live local context · Palo Alto</span>
      </div>

      {isSample && (
        <aside role="status" className="mb-5 rounded-xl border border-line bg-brand-soft p-4 text-sm leading-relaxed">
          <p className="font-semibold">Sample itinerary</p>
          <p className="mt-1">{sourceMessages[selected.source]} This example is for 2 people, 3–8 PM, with an $80 budget.</p>
        </aside>
      )}

      <WeatherContext
        weather={environment.weather}
        sunset={environment.sunset}
        location={environment.location?.city || 'Palo Alto'}
        onRainReplan={handleRainReplan}
        busy={replanning}
      />

      {notice && <p role="status" className="mt-4 rounded-xl border border-line bg-white p-3 text-sm text-muted">{notice}</p>}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,640px)_minmax(300px,1fr)]">
        <Itinerary key={`${selected.id}-${itinerary.summary}`} plan={plan} onReplace={handleReplace} />
        <div className="lg:sticky lg:top-6">
          <MapView activities={itinerary.activities} />
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import MapView from '../components/MapView.jsx';
import WeatherContext from '../components/WeatherContext.jsx';
import ReplacementChooser from '../components/ReplacementChooser.jsx';
import AgentReceipt from '../components/AgentReceipt.jsx';
import BookingConfirm from '../components/BookingConfirm.jsx';
import { getDemoItinerary } from '../data/demoItinerary.js';
import { toDisplayPlan } from '../lib/itinerary.js';
import { DEMO_REQUEST } from '../lib/planRequest.js';
import { scheduleConflict } from '../lib/replacement.js';
import { getEnvironmentContext, getExperiences, replaceItinerary, replanItinerary } from '../services/api.js';
import { requestExperience } from '../services/auth.js';
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
  const [replacementTarget, setReplacementTarget] = useState(null);
  const [replacementOptions, setReplacementOptions] = useState([]);
  const [replacementConflict, setReplacementConflict] = useState(null);
  const [replacementBusy, setReplacementBusy] = useState(false);
  const [shorterOnly, setShorterOnly] = useState(false);
  const [bookingTarget, setBookingTarget] = useState(null);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingStatuses, setBookingStatuses] = useState({});

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
    setReplacementTarget(activity);
    setReplacementOptions([]);
    setReplacementConflict(null);
    setShorterOnly(false);
    try {
      const catalog = await getExperiences();
      const used = new Set(itinerary.activities.map((item) => item.id));
      const ranked = catalog
        .filter((item) => !used.has(item.id))
        .sort((a, b) => Number(b.category === activity.category) - Number(a.category === activity.category)
          || Math.abs(a.duration - activity.duration) - Math.abs(b.duration - activity.duration)
          || a.cost - b.cost);
      setReplacementOptions(ranked.slice(0, 3));
    } catch {
      setReplacementTarget(null);
      setNotice('We could not load alternatives. Your current plan is unchanged.');
    }
  }

  function closeReplacement() {
    if (replacementBusy) return;
    setReplacementTarget(null);
    setReplacementConflict(null);
    setShorterOnly(false);
  }

  function chooseReplacement(option) {
    const conflict = scheduleConflict(
      itinerary,
      replacementTarget.id || replacementTarget.experienceId,
      replacementTarget.duration,
      option,
      request.endTime,
    );
    if (conflict) {
      setReplacementConflict({
        ...conflict,
        endTime: formatClock(conflict.endTime),
      });
      return;
    }
    applyReplacement(option);
  }

  async function applyReplacement(option = replacementConflict?.replacement) {
    if (!option || replacementBusy) return;
    setReplacementBusy(true);
    try {
      const previousName = replacementTarget.name;
      const updated = await replaceItinerary(itinerary, replacementTarget.id || replacementTarget.experienceId, request, option.id);
      setItinerary(updated);
      setReplacementTarget(null);
      setReplacementConflict(null);
      setShorterOnly(false);
      setNotice(`${previousName} was replaced with ${option.name}. The schedule and totals were updated.`);
    } catch {
      setNotice('We could not apply that replacement. Your current plan is unchanged.');
    } finally {
      setReplacementBusy(false);
    }
  }

  function showShorterOptions() {
    setReplacementConflict(null);
    setShorterOnly(true);
    setReplacementOptions((current) => current.filter((option) => option.duration <= replacementTarget.duration));
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

  async function confirmBooking() {
    if (!bookingTarget || bookingBusy) return;
    setBookingBusy(true);
    setNotice('');
    try {
      const scheduledTime = `${request.date} at ${formatClock(bookingTarget.startTime)}`;
      const response = await requestExperience(bookingTarget.id || bookingTarget.experienceId, scheduledTime);
      setBookingStatuses((current) => ({ ...current, [bookingTarget.id || bookingTarget.experienceId]: response.booking.status }));
      setItinerary((current) => ({
        ...current,
        agentActions: {
          ...current.agentActions,
          latest: `Checked ${bookingTarget.host}'s listed availability and sent a booking request after your confirmation. No credits were charged.`,
        },
      }));
      setNotice(`${response.message} Status: Requested · Awaiting ${bookingTarget.host}.`);
      setBookingTarget(null);
    } catch (error) {
      setNotice(error.message || 'The booking request could not be sent.');
    } finally {
      setBookingBusy(false);
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

      <AgentReceipt actions={itinerary.agentActions} />

      {notice && <p role="status" className="mt-4 rounded-xl border border-line bg-white p-3 text-sm text-muted">{notice}</p>}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,640px)_minmax(300px,1fr)]">
        <Itinerary
          key={`${selected.id}-${itinerary.summary}`}
          plan={plan}
          onReplace={handleReplace}
          onRequest={setBookingTarget}
          bookingStatuses={bookingStatuses}
        />
        <div className="lg:sticky lg:top-6">
          <MapView activities={itinerary.activities} />
        </div>
      </div>
      <ReplacementChooser
        target={replacementTarget}
        options={replacementOptions}
        conflict={replacementConflict}
        busy={replacementBusy}
        shorterOnly={shorterOnly}
        onChoose={chooseReplacement}
        onCancel={closeReplacement}
        onKeepReplacement={() => applyReplacement()}
        onChooseShorter={showShorterOptions}
      />
      <BookingConfirm
        activity={bookingTarget}
        busy={bookingBusy}
        onConfirm={confirmBooking}
        onCancel={() => { if (!bookingBusy) setBookingTarget(null); }}
      />
    </div>
  );
}

function formatClock(time) {
  const [hours, mins] = String(time).split(':').map(Number);
  return `${hours % 12 || 12}:${String(mins).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
}

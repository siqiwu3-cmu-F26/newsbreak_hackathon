import { formatTime } from './ActivityCard.jsx';

export default function BookingConfirm({ activity, busy, onConfirm, onCancel }) {
  if (!activity) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-6" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="booking-title" className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl sm:p-8">
        <p className="eyebrow">Human confirmation required</p>
        <h2 id="booking-title" className="mt-3 text-2xl font-semibold">Request {activity.host}'s session?</h2>
        <p className="mt-3 leading-relaxed text-muted">
          The agent checked the host's listed availability. This will send a request for <strong className="text-ink">{formatTime(activity.startTime)}</strong> and mark it as awaiting the host.
        </p>
        <div className="mt-5 rounded-xl bg-canvas p-4">
          <p className="font-semibold">{activity.name}</p>
          <p className="mt-1 text-sm text-muted">{activity.duration} minutes · {activity.credits} Time Credit{activity.credits === 1 ? '' : 's'} · No credits charged until accepted</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" disabled={busy} onClick={onConfirm} className="button-primary">{busy ? 'Sending request…' : `Confirm request to ${activity.host}`}</button>
          <button type="button" disabled={busy} onClick={onCancel} className="button-secondary">Not now</button>
        </div>
      </section>
    </div>
  );
}

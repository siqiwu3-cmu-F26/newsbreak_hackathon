import { useRef } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import AddressForm from '../components/AddressForm.jsx';
import IdentityForm from '../components/IdentityForm.jsx';
import { isVerified, useAuth } from '../context/AuthContext.jsx';

const STEPS = ['Account', 'Identity', 'Address'];

function Stepper({ current }) {
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="Sign-up progress">
      {STEPS.map((label, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'todo';
        return (
          <li key={label} className="flex items-center gap-2" aria-current={state === 'current' ? 'step' : undefined}>
            <span
              aria-hidden="true"
              className={`grid size-6 place-items-center rounded-full text-xs font-semibold ${
                state === 'todo' ? 'border border-line text-muted' : 'bg-brand text-white'
              }`}
            >
              {state === 'done' ? '✓' : index + 1}
            </span>
            <span className={state === 'current' ? 'font-semibold text-ink' : 'text-muted'}>
              {label}
              {state === 'done' && <span className="sr-only"> (done)</span>}
            </span>
            {index < STEPS.length - 1 && <span aria-hidden="true" className="h-px w-6 bg-line sm:w-10" />}
          </li>
        );
      })}
    </ol>
  );
}

export default function Verify() {
  const { user, balance } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? '/';
  // Remember whether they arrived already verified, so finishing the last step here shows
  // the welcome screen instead of bouncing straight away.
  const alreadyComplete = useRef(isVerified(user)).current;

  if (alreadyComplete) return <Navigate to={from} replace />;

  if (isVerified(user)) {
    return (
      <section className="mx-auto w-full max-w-md text-center">
        <p className="eyebrow">You're verified</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Welcome to LocalConnect, {user.name.split(' ')[0]}</h1>
        {balance > 0 && (
          <p className="mx-auto mt-6 inline-flex rounded-full bg-brand-soft px-4 py-2 font-semibold text-brand">
            ✦ {balance} Time Credits in your wallet
          </p>
        )}
        <p className="mt-6 text-muted">Spend credits on community experiences, and earn more by sharing a skill.</p>
        <Link to={from} replace className="button-primary mt-8">{from === '/' ? 'Start planning' : 'Continue'}</Link>
      </section>
    );
  }

  const identityDone = user.verification.status === 'verified';
  return (
    <section className="mx-auto w-full max-w-lg">
      <Stepper current={identityDone ? 2 : 1} />
      {identityDone ? <AddressForm /> : <IdentityForm />}
    </section>
  );
}

import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';

function Field({ id, label, error, hint, ...inputProps }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <input
        id={id}
        name={id}
        className="form-input"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...inputProps}
      />
      {hint && !error && <p id={`${id}-hint`} className="mt-2 text-sm text-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  );
}

export default function Login({ mode = 'login' }) {
  const isSignup = mode === 'signup';
  const { status, login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? '/';

  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') return <Navigate to={from} replace />;

  const update = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError('');
    try {
      if (isSignup) await signup(values);
      else await login({ email: values.email, password: values.password });
      navigate(from, { replace: true });
    } catch (error) {
      setFieldErrors(error.fields ?? {});
      setFormError(error.fields ? '' : error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-md">
      <p className="eyebrow">{isSignup ? 'Join your neighbors' : 'Welcome back'}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        {isSignup ? 'Create your account' : 'Sign in'}
      </h1>
      <p className="mt-3 text-muted">
        {isSignup
          ? 'Every member is identity- and address-verified, so people can trust who they meet.'
          : 'Sign in to plan your day and see your Time Credits.'}
      </p>

      <form onSubmit={handleSubmit} noValidate className="panel mt-8 space-y-5 p-6">
        {formError && <p role="alert" className="field-error mt-0">{formError}</p>}

        {isSignup && (
          <Field
            id="name" label="Full name" autoComplete="name" required
            value={values.name} onChange={update} error={fieldErrors.name}
            hint="Use your legal name. It has to match your ID in the next step."
          />
        )}
        <Field
          id="email" label="Email" type="email" autoComplete="email" required
          value={values.email} onChange={update} error={fieldErrors.email}
        />
        <Field
          id="password" label="Password" type="password" required
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          value={values.password} onChange={update} error={fieldErrors.password}
          hint={isSignup ? 'At least 8 characters.' : undefined}
        />

        <button type="submit" className="button-primary w-full" disabled={submitting}>
          {submitting ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        {isSignup ? 'Already have an account?' : 'New to LocalConnect?'}{' '}
        <Link to={isSignup ? '/login' : '/signup'} state={location.state} className="font-semibold text-brand underline-offset-4 hover:underline">
          {isSignup ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </section>
  );
}

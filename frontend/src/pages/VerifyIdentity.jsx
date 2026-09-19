import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { isVerified, useAuth } from '../context/AuthContext.jsx';

const ID_TYPES = [
  { value: 'drivers_license', label: "Driver's license" },
  { value: 'state_id', label: 'State ID card' },
  { value: 'passport', label: 'Passport' },
];

const today = () => new Date().toISOString().slice(0, 10);

function Field({ id, label, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      {children({
        id,
        name: id,
        className: 'form-input',
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': error ? `${id}-error` : undefined,
      })}
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  );
}

export default function VerifyIdentity() {
  const { user, verifyIdentity } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? '/';

  const [values, setValues] = useState({
    legalName: user.name, dateOfBirth: '', idType: 'drivers_license', idNumber: '', expiryDate: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(user.verification.status === 'rejected' ? user.verification.reason : '');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // `submitting` keeps us on this page while the success screen is about to appear: the
  // account flips to verified a moment before `result` is set.
  if (isVerified(user) && !result && !submitting) return <Navigate to={from} replace />;

  if (result) {
    return (
      <section className="mx-auto w-full max-w-md text-center">
        <p className="eyebrow">You're verified</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Welcome to LocalConnect, {user.name.split(' ')[0]}</h1>
        {result.welcomeCredits > 0 && (
          <p className="mx-auto mt-6 inline-flex rounded-full bg-brand-soft px-4 py-2 font-semibold text-brand">
            ✦ {result.welcomeCredits} Time Credits added to your wallet
          </p>
        )}
        <p className="mt-6 text-muted">Spend credits on community experiences, and earn more by sharing a skill.</p>
        <Link to={from} replace className="button-primary mt-8">{from === '/' ? 'Start planning' : 'Continue'}</Link>
      </section>
    );
  }

  const update = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError('');
    try {
      setResult(await verifyIdentity(values));
    } catch (error) {
      setFieldErrors(error.fields ?? {});
      setFormError(error.fields ? '' : error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-lg">
      <p className="eyebrow">Step 2 of 2</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Verify your identity</h1>
      <p className="mt-3 text-muted">
        LocalConnect connects you with real people, so we confirm your name and age with a
        government-issued ID before you can plan or book anything.
      </p>

      <p className="mt-6 rounded-xl border border-line bg-white p-4 text-sm text-muted">
        <strong className="text-ink">Demo mode.</strong> This is a simulated check: nothing is sent to a real ID
        service. Use any ID number of 5+ characters, and don't enter a real one. IDs ending in
        <code className="mx-1 font-semibold text-ink">0000</code>are rejected so you can see that path.
      </p>

      <form onSubmit={handleSubmit} noValidate className="panel mt-6 space-y-5 p-6">
        {formError && <p role="alert" className="field-error mt-0">{formError}</p>}

        <Field id="legalName" label="Full legal name (as on your ID)" error={fieldErrors.legalName}>
          {(props) => <input {...props} autoComplete="name" required value={values.legalName} onChange={update} />}
        </Field>
        <Field id="dateOfBirth" label="Date of birth" error={fieldErrors.dateOfBirth}>
          {(props) => (
            <input {...props} type="date" autoComplete="bday" required max={today()} value={values.dateOfBirth} onChange={update} />
          )}
        </Field>
        <Field id="idType" label="ID type" error={fieldErrors.idType}>
          {(props) => (
            <select {...props} value={values.idType} onChange={update}>
              {ID_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          )}
        </Field>
        <Field id="idNumber" label="ID number" error={fieldErrors.idNumber}>
          {(props) => <input {...props} autoComplete="off" required value={values.idNumber} onChange={update} />}
        </Field>
        <Field id="expiryDate" label="Expiry date" error={fieldErrors.expiryDate}>
          {(props) => <input {...props} type="date" autoComplete="off" required value={values.expiryDate} onChange={update} />}
        </Field>

        <button type="submit" className="button-primary w-full" disabled={submitting}>
          {submitting ? 'Verifying…' : 'Verify my identity'}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted">
        We keep only the last 4 characters of your ID number, never the full number.
      </p>
    </section>
  );
}

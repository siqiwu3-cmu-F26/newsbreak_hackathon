import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import FormField from './FormField.jsx';

const ID_TYPES = [
  { value: 'drivers_license', label: "Driver's license" },
  { value: 'state_id', label: 'State ID card' },
  { value: 'passport', label: 'Passport' },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function IdentityForm() {
  const { user, verifyIdentity } = useAuth();
  const [values, setValues] = useState({
    legalName: user.name, dateOfBirth: '', idType: 'drivers_license', idNumber: '', expiryDate: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(user.verification.status === 'rejected' ? user.verification.reason : '');
  const [submitting, setSubmitting] = useState(false);

  const update = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError('');
    try {
      await verifyIdentity(values);
    } catch (error) {
      setFieldErrors(error.fields ?? {});
      setFormError(error.fields ? '' : error.message);
      setSubmitting(false);
    }
  }

  return (
    <>
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

        <FormField
          id="legalName" label="Full legal name (as on your ID)" autoComplete="name" required
          value={values.legalName} onChange={update} error={fieldErrors.legalName}
        />
        <FormField
          id="dateOfBirth" label="Date of birth" type="date" autoComplete="bday" required max={today()}
          value={values.dateOfBirth} onChange={update} error={fieldErrors.dateOfBirth}
        />
        <FormField id="idType" label="ID type" as="select" value={values.idType} onChange={update} error={fieldErrors.idType}>
          {ID_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
        </FormField>
        <FormField
          id="idNumber" label="ID number" autoComplete="off" required
          value={values.idNumber} onChange={update} error={fieldErrors.idNumber}
        />
        <FormField
          id="expiryDate" label="Expiry date" type="date" autoComplete="off" required
          value={values.expiryDate} onChange={update} error={fieldErrors.expiryDate}
        />

        <button type="submit" className="button-primary w-full" disabled={submitting}>
          {submitting ? 'Verifying…' : 'Verify my identity'}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted">
        We keep only the last 4 characters of your ID number, never the full number.
      </p>
    </>
  );
}

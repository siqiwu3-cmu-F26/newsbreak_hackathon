import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import FormField from './FormField.jsx';

export default function AddressForm() {
  const { user, verifyAddress } = useAuth();
  const [values, setValues] = useState({ line1: '', line2: '', city: '', state: '', zip: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(user.address.status === 'rejected' ? user.address.reason : '');
  const [submitting, setSubmitting] = useState(false);

  const update = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError('');
    try {
      await verifyAddress(values);
    } catch (error) {
      setFieldErrors(error.fields ?? {});
      setFormError(error.fields ? '' : error.message);
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Verify your address</h1>
      <p className="mt-3 text-muted">
        Tell us where you live so LocalConnect can connect you with neighbors and experiences close to home.
      </p>

      <p className="mt-6 rounded-xl border border-line bg-white p-4 text-sm text-muted">
        <strong className="text-ink">Demo mode.</strong> This is a simulated check: nothing is sent to a real
        address service. Any well-formed US address works, except P.O. boxes and ZIP{' '}
        <code className="font-semibold text-ink">00000</code>, which are rejected so you can see that path.
      </p>

      <form onSubmit={handleSubmit} noValidate className="panel mt-6 space-y-5 p-6">
        {formError && <p role="alert" className="field-error mt-0">{formError}</p>}

        <FormField
          id="line1" label="Street address" autoComplete="address-line1" required
          value={values.line1} onChange={update} error={fieldErrors.line1}
        />
        <FormField
          id="line2" label="Apartment, suite or unit (optional)" autoComplete="address-line2"
          value={values.line2} onChange={update} error={fieldErrors.line2}
        />
        <div className="grid gap-5 sm:grid-cols-[1fr_6rem_9rem]">
          <FormField
            id="city" label="City" autoComplete="address-level2" required
            value={values.city} onChange={update} error={fieldErrors.city}
          />
          <FormField
            id="state" label="State" autoComplete="address-level1" required maxLength={2} placeholder="CA"
            value={values.state.toUpperCase()} onChange={update} error={fieldErrors.state}
          />
          <FormField
            id="zip" label="ZIP code" autoComplete="postal-code" inputMode="numeric" required
            value={values.zip} onChange={update} error={fieldErrors.zip}
          />
        </div>

        <button type="submit" className="button-primary w-full" disabled={submitting}>
          {submitting ? 'Verifying…' : 'Verify my address'}
        </button>
      </form>
    </>
  );
}

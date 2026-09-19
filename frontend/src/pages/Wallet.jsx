import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchCredits } from '../services/auth.js';

const REASONS = { welcome: 'Welcome bonus', experience: 'Booked experience', hosted: 'Hosted an experience' };

function describe(transaction) {
  if (transaction.experienceName) return transaction.experienceName;
  return REASONS[transaction.reason] ?? transaction.reason;
}

export default function Wallet() {
  const { user, balance, setBalance } = useAuth();
  const [transactions, setTransactions] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchCredits()
      .then((data) => {
        if (cancelled) return;
        setTransactions(data.transactions);
        setBalance(data.balance);
      })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [setBalance]);

  return (
    <section className="mx-auto w-full max-w-2xl">
      <p className="eyebrow">Time Credit wallet</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{user.name}'s credits</h1>

      <div className="panel mt-8 p-6">
        <p className="text-sm text-muted">Current balance</p>
        <p className="mt-1 text-5xl font-semibold tracking-tight text-brand">
          ✦ {balance}
          <span className="ml-2 text-lg font-medium text-muted">Time {balance === 1 ? 'Credit' : 'Credits'}</span>
        </p>
      </div>

      <h2 className="mt-10 text-lg font-semibold">History</h2>
      {error && <p role="alert" className="field-error">{error}</p>}
      {!error && transactions === null && <p role="status" className="mt-3 text-muted">Loading…</p>}
      {transactions?.length === 0 && <p className="mt-3 text-muted">No activity yet.</p>}
      {transactions?.length > 0 && (
        <ul className="panel mt-3 divide-y divide-line">
          {transactions.map((transaction) => (
            <li key={transaction.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">{describe(transaction)}</p>
                <p className="text-sm text-muted">
                  {new Date(transaction.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  {' · '}balance {transaction.balanceAfter}
                </p>
              </div>
              <p className={`font-semibold ${transaction.type === 'earn' ? 'text-brand' : 'text-ink'}`}>
                {transaction.type === 'earn' ? '+' : '−'}{transaction.amount}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import Avatar from '../components/Avatar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchMember } from '../services/profile.js';

const memberSince = (iso) => new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

// What other verified members see of someone: name, photo, introduction, and that they're verified.
export default function Member() {
  const { memberId } = useParams();
  const { user: me } = useAuth();
  const [result, setResult] = useState({ id: null, member: null, error: '' });

  useEffect(() => {
    let cancelled = false;
    fetchMember(memberId)
      .then(({ member }) => { if (!cancelled) setResult({ id: memberId, member, error: '' }); })
      .catch((error) => {
        if (cancelled) return;
        setResult({
          id: memberId,
          member: null,
          error: error.status === 404 ? "This member isn't available." : error.message,
        });
      });
    return () => { cancelled = true; };
  }, [memberId]);

  if (result.id !== memberId) return <p role="status" className="text-muted">Loading profile…</p>;
  if (!result.member) {
    return (
      <section className="mx-auto w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{result.error}</h1>
        <Link to="/community" className="button-primary mt-6">Back to community</Link>
      </section>
    );
  }

  const { member } = result;
  const isMe = member.id === me.id;
  return (
    <section className="mx-auto w-full max-w-2xl">
      {isMe && (
        <p className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-soft p-4 text-sm text-brand">
          <span>This is how other members see your profile.</span>
          <Link to="/profile" className="font-semibold underline underline-offset-4">Edit profile</Link>
        </p>
      )}
      <div className="panel p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar userId={member.id} name={member.name} version={member.avatarVersion} size={112} />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{member.name}</h1>
            <p className="mt-1 text-sm text-muted">Member since {memberSince(member.memberSince)}</p>
            <p className="mt-2 inline-flex rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
              ✓ Verified member
            </p>
          </div>
        </div>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-widest text-muted">About</h2>
        {member.bio
          ? <p className="mt-2 whitespace-pre-line leading-relaxed">{member.bio}</p>
          : <p className="mt-2 text-muted">{isMe ? "You haven't written an introduction yet." : `${member.name.split(' ')[0]} hasn't written an introduction yet.`}</p>}
      </div>
    </section>
  );
}

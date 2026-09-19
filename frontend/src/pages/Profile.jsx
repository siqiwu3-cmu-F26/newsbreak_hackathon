import { useState } from 'react';
import { Link } from 'react-router';
import Avatar from '../components/Avatar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { resizeToAvatarJpeg } from '../lib/image.js';
import { removeAvatar, saveBio, uploadAvatar } from '../services/profile.js';

const BIO_MAX_LENGTH = 500;
const memberSince = (iso) => new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

function Notice({ notice }) {
  if (!notice) return null;
  return (
    <p role={notice.type === 'error' ? 'alert' : 'status'} className={notice.type === 'error' ? 'field-error' : 'mt-2 text-sm text-brand'}>
      {notice.text}
    </p>
  );
}

export default function Profile() {
  const { user, balance, updateUser } = useAuth();
  const [bio, setBio] = useState(user.bio ?? '');
  const [bioNotice, setBioNotice] = useState(null);
  const [savingBio, setSavingBio] = useState(false);
  const [photoNotice, setPhotoNotice] = useState(null);
  const [busyPhoto, setBusyPhoto] = useState(false);
  const [linkNotice, setLinkNotice] = useState(null);

  const profileLink = `${window.location.origin}/members/${user.id}`;
  const bioLength = [...bio].length;
  const overLimit = bioLength > BIO_MAX_LENGTH;
  const unchanged = bio.trim() === (user.bio ?? '');

  async function handleSaveBio(event) {
    event.preventDefault();
    setSavingBio(true);
    setBioNotice(null);
    try {
      const { user: updated } = await saveBio(bio);
      updateUser(updated);
      setBio(updated.bio);
      setBioNotice({ type: 'success', text: 'Saved. Other members can now read your introduction.' });
    } catch (error) {
      setBioNotice({ type: 'error', text: error.fields?.bio ?? error.message });
    } finally {
      setSavingBio(false);
    }
  }

  async function handlePhotoPicked(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    setBusyPhoto(true);
    setPhotoNotice(null);
    try {
      const { user: updated } = await uploadAvatar(await resizeToAvatarJpeg(file));
      updateUser(updated);
      setPhotoNotice({ type: 'success', text: 'Profile photo updated.' });
    } catch (error) {
      setPhotoNotice({ type: 'error', text: error.message });
    } finally {
      input.value = ''; // so picking the same file again still triggers a change
      setBusyPhoto(false);
    }
  }

  async function handleRemovePhoto() {
    setBusyPhoto(true);
    setPhotoNotice(null);
    try {
      updateUser((await removeAvatar()).user);
      setPhotoNotice({ type: 'success', text: 'Profile photo removed.' });
    } catch (error) {
      setPhotoNotice({ type: 'error', text: error.message });
    } finally {
      setBusyPhoto(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(profileLink);
      setLinkNotice({ type: 'success', text: 'Link copied.' });
    } catch {
      setLinkNotice({ type: 'error', text: 'Copy the link from the box above.' });
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl">
      <header className="flex flex-wrap items-center gap-5">
        <Avatar userId={user.id} name={user.name} version={user.avatarVersion} size={96} />
        <div>
          <p className="eyebrow">Your profile</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{user.name}</h1>
          <p className="mt-1 text-sm text-muted">Member since {memberSince(user.createdAt)} · ✦ {balance} Time {balance === 1 ? 'Credit' : 'Credits'}</p>
          <p className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-brand">
            <span className="rounded-full bg-brand-soft px-3 py-1">✓ Identity verified</span>
            <span className="rounded-full bg-brand-soft px-3 py-1">✓ Address verified</span>
          </p>
        </div>
      </header>

      <div className="panel mt-8 p-6">
        <h2 className="text-lg font-semibold">Profile photo</h2>
        <p className="mt-1 text-sm text-muted">
          Shown to other verified members. Your photo is cropped to a square, and any location data in it is removed.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className={`button-secondary cursor-pointer ${busyPhoto ? 'pointer-events-none opacity-50' : ''}`}>
            {busyPhoto ? 'Working…' : user.avatarVersion ? 'Change photo' : 'Upload photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handlePhotoPicked} disabled={busyPhoto} />
          </label>
          {user.avatarVersion && (
            <button type="button" className="text-button" onClick={handleRemovePhoto} disabled={busyPhoto}>Remove photo</button>
          )}
        </div>
        <Notice notice={photoNotice} />
      </div>

      <form onSubmit={handleSaveBio} className="panel mt-6 p-6">
        <h2 className="text-lg font-semibold"><label htmlFor="bio">About me</label></h2>
        <p id="bio-hint" className="mt-1 text-sm text-muted">
          A few words so neighbors know who you are: what you enjoy, what you could teach or would love to learn.
        </p>
        <textarea
          id="bio"
          name="bio"
          rows={6}
          className="form-input"
          value={bio}
          onChange={(event) => { setBio(event.target.value); setBioNotice(null); }}
          aria-describedby="bio-hint bio-count"
          aria-invalid={overLimit ? 'true' : undefined}
          placeholder="Hi, I'm new to Palo Alto and love baking. Happy to swap recipes for a pottery lesson!"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p id="bio-count" className={`text-sm ${overLimit ? 'font-semibold text-red-700' : 'text-muted'}`}>
            {bioLength}/{BIO_MAX_LENGTH}
          </p>
          <button type="submit" className="button-primary" disabled={savingBio || overLimit || unchanged}>
            {savingBio ? 'Saving…' : 'Save introduction'}
          </button>
        </div>
        <Notice notice={bioNotice} />
      </form>

      <div className="panel mt-6 p-6">
        <h2 className="text-lg font-semibold">Share your profile</h2>
        <p className="mt-1 text-sm text-muted">Only signed-in, verified members can open this link.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input readOnly aria-label="Your profile link" className="form-input mt-0 min-w-0 flex-1" value={profileLink} onFocus={(event) => event.target.select()} />
          <button type="button" className="button-secondary" onClick={copyLink}>Copy link</button>
        </div>
        <Notice notice={linkNotice} />
        <Link to={`/members/${user.id}`} className="text-button mt-3">See how others see your profile →</Link>
      </div>
    </section>
  );
}

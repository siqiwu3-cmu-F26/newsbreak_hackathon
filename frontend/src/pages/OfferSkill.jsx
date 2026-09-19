import { useState } from "react";
import { useNavigate } from "react-router";
import CreditBadge from "../components/CreditBadge";
import { generateSkillDraft, publishSkill } from "../services/auth.js";
import "../person5.css";

export default function OfferSkill({ onBack }) {
  const navigate = useNavigate();
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [groupSize, setGroupSize] = useState(4);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function updateDescription(value) {
    setDescription(value);
    setDraft(null);
    setError("");
  }

  async function generate() {
    if (!description.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      setDraft(await generateSkillDraft({ description, duration, capacity: groupSize }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!draft || busy) return;
    setBusy(true);
    setError("");
    try {
      const experience = await publishSkill(draft);
      navigate(`/community?published=${encodeURIComponent(experience.id)}`);
    } catch (requestError) {
      setError(requestError.message);
      setBusy(false);
    }
  }

  return (
    <main className="offer-skill-page">
      <button className="back-link" type="button" onClick={onBack || (() => navigate("/community"))}>← Back</button>
      <div className="offer-skill-layout">
        <section className="offer-skill-intro">
          <span className="section-kicker">Offer a skill</span>
          <h1>What would you like to share?</h1>
          <p>Tell the agent naturally. It will extract the experience details for you to review before anything is published.</p>
          <div className="offer-skill-examples">
            <span>Try the demo story</span>
            <button type="button" onClick={() => updateDescription("I was a florist before I retired, and I can teach two people flower arranging on Saturday afternoon.")}>
              “I was a florist and can teach flower arranging.”
            </button>
            <button type="button" onClick={() => updateDescription("I love gardening and would enjoy helping someone plant or care for a small herb garden.")}>
              “Let's grow a small garden together.”
            </button>
          </div>
        </section>

        <section className="offer-skill-form">
          <label>
            What can you offer?
            <textarea value={description} onChange={(event) => updateDescription(event.target.value)} placeholder="For example: I was a florist before I retired..." rows="7" />
          </label>
          <div className="offer-skill-fields">
            <label>
              Preferred duration
              <select value={duration} onChange={(event) => { setDuration(Number(event.target.value)); setDraft(null); }}>
                <option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option>
              </select>
            </label>
            <label>
              Maximum group
              <select value={groupSize} onChange={(event) => { setGroupSize(Number(event.target.value)); setDraft(null); }}>
                {[1, 2, 3, 4, 5, 6].map((size) => <option value={size} key={size}>{size} {size === 1 ? 'person' : 'people'}</option>)}
              </select>
            </label>
          </div>
          <button className="person5-button person5-button--primary" type="button" disabled={!description.trim() || busy} onClick={generate}>
            {busy && !draft ? "✦ Agent is structuring it…" : "✦ Generate my listing"}
          </button>
          {error && <p className="field-error" role="alert">{error}</p>}
        </section>
      </div>

      {draft && (
        <section className="listing-preview" aria-live="polite">
          <div className="listing-preview__status">✦ AI draft · Review before publishing</div>
          <div>
            <span className="section-kicker">{draft.category} · {draft.indoor ? "Indoor" : "Outdoor"}</span>
            <h2>{draft.name}</h2>
            <p>{draft.description}</p>
            <div className="listing-preview__meta">
              <span>◷ {draft.duration} min</span>
              <span>◎ Up to {draft.capacity}</span>
              <span>◫ {draft.availability}</span>
              <CreditBadge credits={draft.credits} compact />
            </div>
          </div>
          <div className="listing-preview__actions">
            <button className="person5-button person5-button--primary" type="button" disabled={busy} onClick={publish}>
              {busy ? "Publishing…" : "Confirm & publish"}
            </button>
            <button className="text-button" type="button" disabled={busy} onClick={() => setDraft(null)}>Edit my description</button>
          </div>
        </section>
      )}
    </main>
  );
}

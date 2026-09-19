import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import CreditBadge from "../components/CreditBadge";
import { extractSkillListing } from "../services/api.js";
import { publishSkill } from "../services/auth.js";
import "../person5.css";

function titleFromDescription(description) {
  const text = description.trim();
  if (!text) return "Your community experience";
  if (/garden|plant|herb/i.test(text)) return "Garden Help & Growing Together";
  if (/photo|camera/i.test(text)) return "Neighborhood Photography Walk";
  if (/cook|pasta|bake|food/i.test(text)) return "Cook Together: A Local Kitchen Session";
  if (/music|guitar|piano/i.test(text)) return "Make Music Together";
  if (/repair|electric|fix/i.test(text)) return "A Helping Hand with Home Repairs";
  return text.split(/\s+/).slice(0, 8).join(" ");
}

export default function OfferSkill({ onBack }) {
  const navigate = useNavigate();
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [groupSize, setGroupSize] = useState(4);
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [aiListing, setAiListing] = useState(null); // { name, category, categoryLabel, indoor, description }
  const [usedFallback, setUsedFallback] = useState(false);
  const [error, setError] = useState("");
  const fallbackTitle = useMemo(() => titleFromDescription(description), [description]);
  const previewTitle = aiListing?.name || fallbackTitle;
  const previewDescription = aiListing?.description || description;

  function updateDescription(value) {
    setDescription(value);
    setGenerated(false);
    setAiListing(null);
    setUsedFallback(false);
    setError("");
  }

  async function handleGenerate() {
    setGenerating(true);
    setUsedFallback(false);
    setError("");
    try {
      const listing = await extractSkillListing({ description, duration, groupSize });
      setAiListing(listing);
    } catch {
      // Never break the demo over a flaky call — fall back to the
      // deterministic title guess and the poster's own raw text.
      setAiListing(null);
      setUsedFallback(true);
    } finally {
      setGenerated(true);
      setGenerating(false);
    }
  }

  async function handlePublish() {
    if (publishing) return;
    setPublishing(true);
    setError("");
    try {
      const experience = await publishSkill({
        name: previewTitle,
        description: previewDescription,
        duration,
        capacity: groupSize,
        category: aiListing?.category,
        indoor: aiListing?.indoor,
      });
      navigate(`/community?published=${encodeURIComponent(experience.id)}`);
    } catch (requestError) {
      setError(requestError.message);
      setPublishing(false);
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
              <select value={duration} onChange={(event) => { setDuration(Number(event.target.value)); setGenerated(false); }}>
                <option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option>
              </select>
            </label>
            <label>
              Maximum group
              <select value={groupSize} onChange={(event) => { setGroupSize(Number(event.target.value)); setGenerated(false); }}>
                {[1, 2, 3, 4, 5, 6].map((size) => <option value={size} key={size}>{size} {size === 1 ? 'person' : 'people'}</option>)}
              </select>
            </label>
          </div>
          <button
            className="person5-button person5-button--primary"
            type="button"
            disabled={!description.trim() || generating}
            onClick={handleGenerate}
          >
            {generating ? "✦ Agent is structuring it…" : "✦ Generate my listing"}
          </button>
          {error && <p className="field-error" role="alert">{error}</p>}
        </section>
      </div>

      {generated && (
        <section className="listing-preview" aria-live="polite">
          <div className="listing-preview__status">
            {usedFallback ? "✦ Draft ready (offline preview) · Review before publishing" : "✦ AI draft · Review before publishing"}
          </div>
          <div>
            <span className="section-kicker">
              {aiListing?.categoryLabel || "Preview"} · {aiListing?.indoor === false ? "Outdoor" : "Indoor"}
            </span>
            <h2>{previewTitle}</h2>
            <p>{previewDescription}</p>
            <div className="listing-preview__meta">
              <span>◷ {duration} min</span>
              <span>◎ Up to {groupSize}</span>
              <CreditBadge credits={duration > 60 ? 2 : 1} compact />
            </div>
          </div>
          <div className="listing-preview__actions">
            <button className="person5-button person5-button--primary" type="button" disabled={publishing} onClick={handlePublish}>
              {publishing ? "Publishing…" : "Confirm & publish"}
            </button>
            <button className="text-button" type="button" disabled={publishing} onClick={() => setGenerated(false)}>Edit my description</button>
          </div>
        </section>
      )}
    </main>
  );
}

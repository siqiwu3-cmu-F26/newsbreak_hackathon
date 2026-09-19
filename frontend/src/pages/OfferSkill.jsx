import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import CreditBadge from "../components/CreditBadge";
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
export default function OfferSkill({ onBack, onPublish }) {
  const navigate = useNavigate();
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [groupSize, setGroupSize] = useState(4);
  const [generated, setGenerated] = useState(false);
  const [published, setPublished] = useState(false);
  const previewTitle = useMemo(() => titleFromDescription(description), [description]);

  function updateDescription(value) {
    setDescription(value);
    setGenerated(false);
    setPublished(false);
  }

  return (
    <main className="offer-skill-page">
      <button className="back-link" type="button" onClick={onBack || (() => navigate("/community"))}>← Back</button>
      <div className="offer-skill-layout">
        <section className="offer-skill-intro">
          <span className="section-kicker">Offer a skill</span>
          <h1>What would you like to share?</h1>
          <p>
            Practical help, creative talents, local knowledge, or something you enjoy doing together.
            Tell your community what you can offer.
          </p>
          <div className="offer-skill-examples">
            <span>Try saying</span>
            <button type="button" onClick={() => updateDescription("I'm handy with small home repairs and can help a neighbor fix a shelf or assemble furniture.")}>
              “I can lend a hand with small repairs.”
            </button>
            <button type="button" onClick={() => updateDescription("I love gardening and would enjoy helping someone plant or care for a small herb garden.")}>
              “Let's grow a small garden together.”
            </button>
            <button type="button" onClick={() => updateDescription("I enjoy photography and can take portraits for neighbors or capture a local gathering.")}>
              “I can take photos for a local gathering.”
            </button>
          </div>
        </section>

        <section className="offer-skill-form">
          <label>
            What can you offer?
            <textarea
              value={description}
              onChange={(event) => updateDescription(event.target.value)}
              placeholder="For example: I can help set up a new phone, take photos, share local walking routes, or cook a meal together..."
              rows="7"
            />
          </label>
          <div className="offer-skill-fields">
            <label>
              Duration
              <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
              </select>
            </label>
            <label>
              Group size
              <select value={groupSize} onChange={(event) => setGroupSize(Number(event.target.value))}>
                {[1, 2, 3, 4, 5, 6].map((size) => <option value={size} key={size}>{size} {size === 1 ? 'person' : 'people'}</option>)}
              </select>
            </label>
          </div>
          <button
            className="person5-button person5-button--primary"
            type="button"
            disabled={!description.trim()}
            onClick={() => setGenerated(true)}
          >
            ✦ Generate my listing
          </button>
        </section>
      </div>

      {generated && (
        <section className="listing-preview" aria-live="polite">
          <div className="listing-preview__status">✦ Your draft is ready</div>
          <div>
            <span className="section-kicker">Preview</span>
            <h2>{previewTitle}</h2>
            <p>{description}</p>
            <div className="listing-preview__meta">
              <span>◷ {duration} min</span>
              <span>◎ Up to {groupSize}</span>
              <CreditBadge credits={duration > 60 ? 2 : 1} compact />
            </div>
          </div>
          <div className="listing-preview__actions">
            <button
              className="person5-button person5-button--primary"
              type="button"
              onClick={() => {
                onPublish?.({ title: previewTitle, description, duration, capacity: groupSize });
                setPublished(true);
              }}
            >
              {published ? "✓ Published" : "Publish experience"}
            </button>
            {published && <p className="listing-preview__published" role="status">Your demo listing is ready for the community catalog.</p>}
          </div>
        </section>
      )}
    </main>
  );
}

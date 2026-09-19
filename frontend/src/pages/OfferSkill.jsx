import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import CreditBadge from "../components/CreditBadge";
import "../person5.css";

function titleFromDescription(description) {
  const text = description.trim();
  if (!text) return "Your community experience";
  if (/garden|plant|herb/i.test(text)) return "A Friendly Introduction to Gardening";
  if (/photo|camera/i.test(text)) return "Neighborhood Photography Walk";
  if (/cook|pasta|bake|food/i.test(text)) return "Cook Together: A Local Kitchen Session";
  if (/music|guitar|piano/i.test(text)) return "Beginner Music Session";
  if (/repair|electric|fix/i.test(text)) return "Everyday Home Repair Basics";
  return `Learn ${text.split(/\s+/).slice(0, 5).join(" ")}`;
}
export default function OfferSkill({ onBack, onPublish }) {
  const navigate = useNavigate();
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [groupSize, setGroupSize] = useState(4);
  const [generated, setGenerated] = useState(false);
  const [published, setPublished] = useState(false);
  const previewTitle = useMemo(() => titleFromDescription(description), [description]);

  return (
    <main className="offer-skill-page">
      <button className="back-link" type="button" onClick={onBack || (() => navigate("/community"))}>← Back</button>
      <div className="offer-skill-layout">
        <section className="offer-skill-intro">
          <span className="section-kicker">Offer a skill</span>
          <h1>What could you teach a neighbor?</h1>
          <p>
            Describe it naturally. LocalConnect turns your words into a clear experience listing—no long form required.
          </p>
          <div className="offer-skill-examples">
            <span>Try saying</span>
            <button type="button" onClick={() => setDescription("I was an electrician and can teach simple, safe home repair basics.")}>
              “I can teach simple home repairs.”
            </button>
            <button type="button" onClick={() => setDescription("I love gardening and can help beginners plant a small herb garden.")}>
              “I grow herbs in my backyard.”
            </button>
          </div>
        </section>

        <section className="offer-skill-form">
          <label>
            Tell us what you know
            <textarea
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                setGenerated(false);
                setPublished(false);
              }}
              placeholder="For example: I make fresh pasta with my grandmother's recipe and would love to teach small groups..."
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
              Max guests
              <select value={groupSize} onChange={(event) => setGroupSize(Number(event.target.value))}>
                {[2, 3, 4, 5, 6].map((size) => <option value={size} key={size}>{size} people</option>)}
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

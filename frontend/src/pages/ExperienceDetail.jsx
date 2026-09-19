import { useMemo } from "react";
import CreditBadge from "../components/CreditBadge";
import MapView from "../components/MapView";
import communityExperiences from "../data/communityExperiences";
import "../person5.css";

function idFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1];
}
export default function ExperienceDetail({ experienceId, onBack, onAddToPlan }) {
  const experience = useMemo(
    () => communityExperiences.find((item) => item.id === (experienceId || idFromPath())) || communityExperiences[0],
    [experienceId],
  );

  return (
    <main className="experience-detail">
      <button className="back-link" type="button" onClick={onBack || (() => window.history.back())}>
        ← Back to community
      </button>

      <section className={`experience-detail__hero experience-card__art--${experience.accent || experience.category}`}>
        <div>
          <span className="section-kicker section-kicker--light">Community experience</span>
          <h1>{experience.name}</h1>
          <p>Hosted by {experience.host} · ★ {experience.rating} ({experience.reviews} reviews)</p>
        </div>
        <div className="experience-detail__hero-icon" aria-hidden="true">✦</div>
      </section>

      <div className="experience-detail__layout">
        <section className="experience-detail__content">
          <div className="detail-facts">
            <div><small>Duration</small><strong>{experience.duration} minutes</strong></div>
            <div><small>Group size</small><strong>Up to {experience.capacity}</strong></div>
            <div><small>Setting</small><strong>{experience.indoor ? "Indoor" : "Outdoor"}</strong></div>
          </div>

          <div className="detail-copy">
            <span className="section-kicker">What you'll do</span>
            <h2>A small experience with a real local.</h2>
            <p>{experience.description}</p>
            <p>
              Your host will guide the session at a comfortable pace and make room for questions,
              conversation, and a little experimentation. No prior experience is needed.
            </p>
          </div>

          <div className="detail-tags">
            {experience.tags.map((tag) => <span key={tag}>✓ {tag}</span>)}
          </div>

          <div className="detail-host">
            <div className="detail-host__avatar">{experience.host.slice(0, 1)}</div>
            <div>
              <span className="section-kicker">Meet your host</span>
              <h3>{experience.host}</h3>
              <p>Verified community host · Usually responds within a few hours</p>
            </div>
          </div>

          <MapView activities={[experience]} selectedId={experience.id} />
        </section>

        <aside className="experience-booking">
          <small>This experience costs</small>
          <CreditBadge credits={experience.credits} />
          <hr />
          <label>
            Preferred time
            <select defaultValue="saturday-afternoon">
              <option value="saturday-afternoon">Saturday · 3:00 PM</option>
              <option value="sunday-morning">Sunday · 10:30 AM</option>
              <option value="sunday-afternoon">Sunday · 2:00 PM</option>
            </select>
          </label>
          <label>
            Guests
            <select defaultValue="2">
              {Array.from({ length: experience.capacity }, (_, index) => (
                <option value={index + 1} key={index + 1}>{index + 1} {index === 0 ? "guest" : "guests"}</option>
              ))}
            </select>
          </label>
          <button className="person5-button person5-button--primary" type="button" onClick={() => onAddToPlan?.(experience)}>
            Add to my plan
          </button>
          <p className="experience-booking__note">Demo only · No credit will be charged</p>
        </aside>
      </div>
    </main>
  );
}

export function formatTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

function creditLabel(n) {
  return `${n} Time Credit${n === 1 ? "" : "s"}`;
}

export default function ActivityCard({ activity, onReplace, replacing = false }) {
  const {
    name,
    type,
    host,
    location,
    indoor,
    startTime,
    duration,
    cost,
    credits,
    tags = [],
    note,
    reason,
  } = activity;

  const isCommunity = type === "community";
  const isFree = !cost && !credits;

  return (
    <article
      className={[
        "activity-card",
        isCommunity ? "activity-card--community" : "",
        replacing ? "is-replacing" : "",
      ].join(" ")}
    >
      <div className="activity-card__time">{formatTime(startTime)}</div>

      <span className={`badge ${isCommunity ? "badge--community" : "badge--place"}`}>
        {isCommunity ? "Community Experience" : "Local Place"}
      </span>
      <h3 className="activity-card__title">{name}</h3>
      <p className="activity-card__meta">
        {isCommunity && host ? `Hosted by ${host} · ` : ""}
        {location} · {indoor ? "Indoor" : "Outdoor"}
      </p>

      <div className="chips">
        {credits > 0 && <span className="chip chip--credit">{creditLabel(credits)}</span>}
        {cost > 0 && <span className="chip chip--cost">${cost}</span>}
        {isFree && <span className="chip chip--cost">Free</span>}
        <span className="chip">{duration} min</span>
        {tags.map((tag) => (
          <span className="chip chip--tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>

      {note && <p className="activity-card__note">{note}</p>}

      {reason && (
        <p className="activity-card__why">
          <strong>Why this activity?</strong> {reason}
        </p>
      )}

      {onReplace && (
        <button
          type="button"
          className="replace-btn"
          onClick={onReplace}
          disabled={replacing}
        >
          {replacing ? "Replacing…" : "Replace"}
        </button>
      )}
    </article>
  );
}

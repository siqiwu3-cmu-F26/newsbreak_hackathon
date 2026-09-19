import CreditBadge from "./CreditBadge";
import "../person5.css";

const categoryIcons = {
  creative: "✂",
  food: "◒",
  outdoors: "↗",
  relaxing: "☘",
  active: "◉",
  culture: "♫",
};

export default function ExperienceCard({ experience, onSelect }) {
  const handleClick = () => {
    if (onSelect) onSelect(experience);
  };

  return (
    <article
      className="experience-card"
      onClick={handleClick}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && onSelect) handleClick();
      }}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className={`experience-card__art experience-card__art--${experience.accent || experience.category}`}>
        <span aria-hidden="true">{categoryIcons[experience.category] || "✦"}</span>
        <div className="experience-card__availability">
          {experience.indoor ? "Indoor" : "Outdoor"}
        </div>
      </div>

      <div className="experience-card__body">
        <div className="experience-card__eyebrow">
          <span>Hosted by {experience.host}</span>
          <span aria-label={`${experience.rating} out of 5 stars`}>
            ★ {Number(experience.rating || 5).toFixed(1)}
          </span>
        </div>
        <h3>{experience.name}</h3>
        <p>{experience.description}</p>
        <div className="experience-card__meta">
          <span>◷ {experience.duration} min</span>
          <span>◎ Up to {experience.capacity || 4}</span>
          <span>⌖ {experience.location}</span>
        </div>
        <div className="experience-card__footer">
          <CreditBadge credits={experience.credits} compact />
          <span className="experience-card__link">View experience →</span>
        </div>
      </div>
    </article>
  );
}

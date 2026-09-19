import "../person5.css";

export default function CreditBadge({ credits = 1, compact = false }) {
  return (
    <span className={`credit-badge${compact ? " credit-badge--compact" : ""}`}>
      <span className="credit-badge__spark" aria-hidden="true">✦</span>
      {credits} Time {credits === 1 ? "Credit" : "Credits"}
    </span>
  );
}

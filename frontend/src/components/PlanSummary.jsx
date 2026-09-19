const sum = (items, pick) => items.reduce((total, item) => total + (pick(item) || 0), 0);

export default function PlanSummary({ activities, budget, totals }) {
  const totalCost = totals?.cash ?? sum(activities, (a) => a.cost);
  const totalCredits = totals?.credits ?? sum(activities, (a) => a.credits);
  const totalTravel = totals?.travelMinutes ?? sum(activities, (a) => a.travelMinutes);
  const remaining = budget != null ? budget - totalCost : null;

  return (
    <section className="plan-summary" aria-label="Plan summary">
      <div className="plan-summary__stats">
        <div className="stat">
          <span className="stat__label">Total Cost</span>
          <span className="stat__value">${totalCost}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Time Credits</span>
          <span className="stat__value">{totalCredits}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Total Travel</span>
          <span className="stat__value">{totalTravel} min</span>
        </div>
      </div>
      {remaining != null && (
        <p className={`plan-summary__budget ${remaining < 0 ? "is-over" : ""}`}>
          {remaining >= 0
            ? `$${remaining} left of your $${budget} budget`
            : `$${-remaining} over your $${budget} budget`}
        </p>
      )}
    </section>
  );
}

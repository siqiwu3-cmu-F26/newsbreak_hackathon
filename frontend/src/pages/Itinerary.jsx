import { useState } from "react";
import Timeline from "../components/Timeline.jsx";
import PlanSummary from "../components/PlanSummary.jsx";
import { mockPlan, mockAlternatives, mockReplace } from "../data/mockPlan.js";
import "./Itinerary.css";

function weekday(date) {
  if (!date) return "Day";
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });
}

// `plan` is the agent's itinerary; `onReplace(activity, index)` should resolve to the
// replacement activity (wire to POST /api/replace). Both fall back to mock data.
export default function Itinerary({ plan = mockPlan, onReplace, allowReplace = true }) {
  const [activities, setActivities] = useState(plan.activities);
  const [pool, setPool] = useState(mockAlternatives);
  const [replacingId, setReplacingId] = useState(null);

  async function handleReplace(index) {
    const current = activities[index];
    setReplacingId(current.experienceId);
    try {
      let next;
      if (onReplace) {
        next = await onReplace(current, index);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 400));
        const result = mockReplace(current, pool);
        next = result.next;
        setPool(result.rest);
      }
      setActivities((prev) => prev.map((a, i) => (i === index ? next : a)));
    } finally {
      setReplacingId(null);
    }
  }

  return (
    <section className="itinerary">
      <header className="itinerary__header">
        <p className="itinerary__eyebrow">Your AI-planned day</p>
        <h1>Your {weekday(plan.date)} Plan</h1>
        <p className="itinerary__summary">{plan.summary}</p>
      </header>

      <Timeline
        activities={activities}
        onReplace={allowReplace ? handleReplace : undefined}
        replacingId={replacingId}
      />

      <PlanSummary activities={activities} budget={plan.budget} totals={allowReplace ? undefined : plan.totals} />
    </section>
  );
}

import ActivityCard from "./ActivityCard.jsx";

export default function Timeline({ activities, onReplace, replacingId }) {
  return (
    <ol className="timeline">
      {activities.map((activity, index) => (
        <li className="timeline__item" key={activity.experienceId}>
          {index > 0 && activity.travelMinutes > 0 && (
            <div className="timeline__travel">↓ {activity.travelMinutes} min drive</div>
          )}
          <ActivityCard
            activity={activity}
            replacing={replacingId === activity.experienceId}
            onReplace={onReplace ? () => onReplace(index) : undefined}
          />
        </li>
      ))}
    </ol>
  );
}

export default function AgentReceipt({ actions }) {
  if (!actions) return null;
  return (
    <aside className="mt-5 rounded-2xl border border-brand/25 bg-brand-soft p-5" aria-label="Agent action record">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Agent action record</p>
          <p className="mt-2 font-semibold text-ink">
            Checked {actions.checkedExperiences} nearby experiences, {(actions.checks || []).join(', ')}.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{actions.latest}</p>
        </div>
        <div className="flex gap-2 text-xs font-semibold text-brand">
          <span className="rounded-full bg-white px-3 py-2">{actions.resolvedConstraints} constraints resolved</span>
          <span className="rounded-full bg-white px-3 py-2">{actions.communityConnections} community connection{actions.communityConnections === 1 ? '' : 's'}</span>
        </div>
      </div>
    </aside>
  );
}

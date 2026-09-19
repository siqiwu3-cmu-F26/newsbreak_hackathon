import { useEffect, useRef, useState } from 'react';
import ActivityCard from "./ActivityCard.jsx";

export default function Timeline({ activities, onReplace, replacingId, onReorder, busy = false }) {
  const [drag, setDrag] = useState(null);
  const gestureRef = useRef(null);
  const listRef = useRef(null);

  function findTarget(gesture) {
    const target = document.elementFromPoint(gesture.x, gesture.y)?.closest('[data-slot-id]');
    gesture.toId = target && listRef.current?.contains(target) ? target.dataset.slotId : gesture.id;
    setDrag(current => current?.fromId === gesture.id && current?.toId === gesture.toId
      ? current : { fromId: gesture.id, toId: gesture.toId });
  }

  useEffect(() => {
    if (!drag) return;
    let frame;
    const scroll = () => {
      const gesture = gestureRef.current;
      if (!gesture?.started) return;
      const speed = gesture.y < 80 ? -12 : gesture.y > window.innerHeight - 80 ? 12 : 0;
      if (speed) { window.scrollBy(0, speed); findTarget(gesture); }
      frame = requestAnimationFrame(scroll);
    };
    frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [Boolean(drag)]);

  function cancelDrag() { gestureRef.current = null; setDrag(null); }

  function beginDrag(event, id) {
    if (busy || event.button !== 0 || !event.isPrimary) return;
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = { id, toId: id, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, started: false };
  }

  function moveDrag(event) {
    const gesture = gestureRef.current;
    if (!gesture) return;
    gesture.x = event.clientX; gesture.y = event.clientY;
    if (!gesture.started && Math.hypot(gesture.x - gesture.startX, gesture.y - gesture.startY) < 6) return;
    gesture.started = true;
    findTarget(gesture);
  }

  function endDrag(event) {
    const gesture = gestureRef.current;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    cancelDrag();
    if (gesture?.started && gesture.id !== gesture.toId && !busy) onReorder?.(gesture.id, gesture.toId);
  }

  return (
    <ol ref={listRef} className="timeline" aria-label="Activity slots" aria-busy={busy}>
      {activities.map((activity, index) => (
        <li className={['timeline__item', drag?.fromId === activity.experienceId ? 'is-dragging' : '', drag && drag.toId === activity.experienceId && drag.fromId !== drag.toId ? 'is-drop-target' : ''].join(' ')} key={activity.experienceId} data-slot-id={activity.experienceId}>
          {index > 0 && activity.travelMinutes > 0 && (
            <div className="timeline__travel">↓ {activity.travelMinutes} min drive</div>
          )}
          {onReorder && (
            <div className="timeline__controls">
              <span>Slot {index + 1}</span>
              <button type="button" className="timeline__grip" disabled={busy}
                aria-label={`Move ${activity.name}. Drag to a slot or use up and down arrow keys.`}
                onPointerDown={event => beginDrag(event, activity.experienceId)} onPointerMove={moveDrag}
                onPointerUp={endDrag} onPointerCancel={cancelDrag} onLostPointerCapture={cancelDrag}
                onKeyDown={event => {
                  if (event.key === 'Escape') { event.preventDefault(); cancelDrag(); return; }
                  const offset = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
                  if (!offset) return;
                  event.preventDefault();
                  if (!busy && activities[index + offset]) onReorder(activity.experienceId, activities[index + offset].experienceId);
                }}
              >⠿ <span>Drag</span></button>
              <button type="button" disabled={busy || index === 0} aria-label={`Move ${activity.name} earlier`} onClick={() => onReorder(activity.experienceId, activities[index - 1].experienceId)}>↑</button>
              <button type="button" disabled={busy || index === activities.length - 1} aria-label={`Move ${activity.name} later`} onClick={() => onReorder(activity.experienceId, activities[index + 1].experienceId)}>↓</button>
            </div>
          )}
          {drag && drag.toId === activity.experienceId && drag.fromId !== drag.toId && <p className="timeline__drop-label">Release to move to slot {index + 1}</p>}
          <ActivityCard
            activity={activity}
            replacing={replacingId === activity.experienceId}
            onReplace={onReplace ? () => onReplace(index) : undefined}
            disabled={busy}
          />
        </li>
      ))}
    </ol>
  );
}

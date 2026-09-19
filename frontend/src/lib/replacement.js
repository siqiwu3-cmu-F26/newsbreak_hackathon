export function scheduleConflict(itinerary, targetId, targetDuration, replacement, endTime) {
  const activities = Array.isArray(itinerary?.activities) ? itinerary.activities : [];
  const index = activities.findIndex((item) => item.id === targetId);
  const extraMinutes = Math.max(0, Number(replacement?.duration || 0) - Number(targetDuration || 0));
  if (index < 0 || extraMinutes === 0) return null;

  const endLimit = toMinutes(endTime);
  const overflow = activities
    .slice(index + 1)
    .filter((item) => toMinutes(item.endTime) + extraMinutes > endLimit);
  if (!overflow.length) return null;

  return {
    replacement,
    extraMinutes,
    removedNames: overflow.map((item) => item.name),
    endTime,
  };
}

function toMinutes(time) {
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours * 60 + minutes;
}

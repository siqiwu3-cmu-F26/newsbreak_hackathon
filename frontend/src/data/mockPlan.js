// Mock plan in the shape the Itinerary UI renders: each activity is the agent's
// pick (experienceId, startTime, endTime, reason) merged with its experience
// record (name, type, cost, credits, ...) plus travelMinutes from the previous stop.

export function addMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export const mockPlan = {
  summary: "A relaxed and creative first date",
  date: "2026-09-19",
  groupType: "date",
  people: 2,
  budget: 80,
  sunset: "19:32",
  weather: { condition: "sunny", temperature: 72 },
  activities: [
    {
      experienceId: "exp_001",
      name: "Flower Arranging with Linda",
      type: "community",
      category: "creative",
      host: "Linda",
      location: "Palo Alto",
      indoor: true,
      description: "Beginner flower arranging session with a retired florist.",
      startTime: "15:00",
      endTime: "16:00",
      duration: 60,
      cost: 0,
      credits: 1,
      travelMinutes: 0,
      tags: ["Hands-on", "Beginner friendly"],
      reason: "Interactive but low-pressure, suitable for a first date.",
    },
    {
      experienceId: "exp_007",
      name: "Local Café",
      type: "place",
      category: "food",
      location: "Downtown Palo Alto",
      indoor: true,
      description: "Small neighborhood café with window seating.",
      startTime: "16:30",
      endTime: "17:30",
      duration: 60,
      cost: 18,
      credits: 0,
      travelMinutes: 8,
      tags: ["Quiet", "Good for conversation"],
      reason: "A calm place to keep talking after the workshop.",
    },
    {
      experienceId: "exp_009",
      name: "Japanese Dinner",
      type: "place",
      category: "food",
      location: "University Ave",
      indoor: true,
      description: "Cozy izakaya-style restaurant with shared plates.",
      startTime: "18:00",
      endTime: "19:00",
      duration: 60,
      cost: 42,
      credits: 0,
      travelMinutes: 10,
      tags: ["Cozy", "Shared plates"],
      reason: "Sit-down dinner that fits the budget and leaves time for the sunset.",
    },
    {
      experienceId: "exp_012",
      name: "Sunset Walk",
      type: "place",
      category: "nature",
      location: "Baylands Park",
      indoor: false,
      description: "Easy shoreline loop with open views of the bay.",
      startTime: "19:15",
      endTime: "19:45",
      duration: 30,
      cost: 0,
      credits: 0,
      travelMinutes: 6,
      tags: ["Outdoor", "Relaxing"],
      note: "Sunset: 7:32 PM",
      reason: "Timed to end the evening right as the sun sets.",
    },
  ],
};

// Candidates the mock "Replace" button rotates through until /api/replace is wired up.
export const mockAlternatives = [
  {
    experienceId: "exp_002",
    name: "Pottery with Maya",
    type: "community",
    category: "creative",
    host: "Maya",
    location: "Mountain View",
    indoor: true,
    description: "Wheel-throwing basics with a local ceramicist.",
    duration: 60,
    cost: 0,
    credits: 1,
    tags: ["Hands-on", "Beginner friendly"],
    reason: "Another creative, low-pressure activity you can do side by side.",
  },
  {
    experienceId: "exp_003",
    name: "Photography Walk with Alex",
    type: "community",
    category: "creative",
    host: "Alex",
    location: "Palo Alto",
    indoor: false,
    description: "A relaxed stroll practicing composition with your phone camera.",
    duration: 45,
    cost: 0,
    credits: 1,
    tags: ["Outdoor", "Relaxing"],
    reason: "Gets you outside and gives you something to talk about.",
  },
  {
    experienceId: "exp_014",
    name: "Matcha & Dessert Bar",
    type: "place",
    category: "food",
    location: "Downtown Palo Alto",
    indoor: true,
    description: "Quiet dessert spot with matcha drinks and shareable sweets.",
    duration: 45,
    cost: 16,
    credits: 0,
    tags: ["Quiet", "Indoor"],
    reason: "Low-key indoor option that keeps the mood relaxed.",
  },
  {
    experienceId: "exp_015",
    name: "Riverside Gallery",
    type: "place",
    category: "culture",
    location: "Menlo Park",
    indoor: true,
    description: "Small local art gallery with rotating exhibits.",
    duration: 45,
    cost: 12,
    credits: 0,
    tags: ["Quiet", "Indoor"],
    reason: "A calm indoor stop that works whatever the weather does.",
  },
];

// Stand-in for POST /api/replace: swap `current` for the next candidate of the same
// type (falling back to any), keep its time slot and travel, and put `current` back
// in the pool so repeated clicks keep cycling.
export function mockReplace(current, pool) {
  const found = pool.findIndex((a) => a.type === current.type);
  const index = found === -1 ? 0 : found;
  const pick = pool[index];
  const next = {
    ...pick,
    startTime: current.startTime,
    endTime: addMinutes(current.startTime, pick.duration),
    travelMinutes: current.travelMinutes,
  };
  const { startTime, endTime, travelMinutes, note, ...backToPool } = current;
  const rest = [...pool.slice(0, index), ...pool.slice(index + 1), backToPool];
  return { next, rest };
}

export default mockPlan;

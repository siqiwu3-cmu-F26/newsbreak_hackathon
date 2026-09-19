// A fixed, explicitly labelled example. This is not a personalized fallback.
// Keep it independent of member 2's local replacement fixtures.
export function getDemoItinerary() {
  return {
    summary: 'A relaxed and creative first date',
    fallback: true,
    activities: [
      { id: 'community_01', name: 'Flower Arranging with Linda', type: 'community', host: 'Linda', startTime: '15:00', endTime: '16:00', cost: 0, credits: 1, lat: 37.4419, lng: -122.143, indoor: true, travelToNext: 8, reason: 'A hands-on, low-pressure way to get to know each other.' },
      { id: 'business_01', name: 'Local Cafe', type: 'business', startTime: '16:30', endTime: '17:30', cost: 18, credits: 0, lat: 37.445, lng: -122.161, indoor: true, travelToNext: 10, reason: 'A quiet place to continue the conversation.' },
      { id: 'business_02', name: 'Japanese Dinner', type: 'business', startTime: '18:00', endTime: '19:00', cost: 42, credits: 0, lat: 37.446, lng: -122.16, indoor: true, travelToNext: 6, reason: 'Enjoy dinner together with room left in the sample budget.' },
      { id: 'business_03', name: 'Sunset Walk', type: 'business', startTime: '19:15', endTime: '19:45', cost: 0, credits: 0, lat: 37.459, lng: -122.106, indoor: false, travelToNext: 0, reason: 'A relaxed outdoor finish to the example day.' },
    ],
    totals: { cash: 60, credits: 1, travelMinutes: 24 },
  };
}

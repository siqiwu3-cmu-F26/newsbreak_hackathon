import { randomUUID } from "node:crypto";

import { db } from "../lib/db.js";
import { HttpError } from "../lib/httpError.js";

const categories = new Set(["creative", "food", "outdoors", "relaxing", "active", "culture"]);

function rowToExperience(row) {
  return {
    id: row.id,
    name: row.name,
    type: "community",
    category: row.category,
    host: row.host,
    duration: row.duration,
    cost: 0,
    credits: row.credits,
    capacity: row.capacity,
    openFrom: row.open_from,
    openTo: row.open_to,
    lat: row.lat,
    lng: row.lng,
    indoor: Boolean(row.indoor),
    description: row.description,
    availability: row.availability_text,
    location: row.location,
    rating: 5,
    reviews: 0,
    tags: ["New", "Verified host", row.indoor ? "Indoor" : "Outdoor"],
    accent: row.category,
    image: "/img/community-new.jpg",
    published: true,
  };
}

export function listPublishedCommunityExperiences() {
  return db.prepare("SELECT * FROM community_experiences WHERE status = 'published' ORDER BY created_at DESC")
    .all()
    .map(rowToExperience);
}

export function createCommunityExperience(user, input = {}) {
  const category = categories.has(input.category) ? input.category : "creative";
  const duration = boundedInt(input.duration, 60, 30, 180);
  const capacity = boundedInt(input.capacity, 4, 1, 12);
  const credits = boundedInt(input.credits, duration > 60 ? 2 : 1, 1, 4);
  const name = clean(input.name, 80);
  const description = clean(input.description, 500);
  if (!name || !description) throw new HttpError(400, "The AI draft needs a title and description");

  const id = `community_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const address = user.address || {};
  const values = {
    id,
    ownerUserId: user.id,
    name,
    category,
    host: user.name.split(/\s+/)[0],
    duration,
    capacity,
    credits,
    openFrom: validTime(input.openFrom) ? input.openFrom : "14:00",
    openTo: validTime(input.openTo) ? input.openTo : "18:00",
    indoor: input.indoor !== false ? 1 : 0,
    description,
    availability: clean(input.availability, 120) || "Saturday afternoon",
    lat: 37.4419,
    lng: -122.143,
    location: [address.city || "Palo Alto", address.state || "CA"].join(", "),
    createdAt: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO community_experiences
      (id, owner_user_id, name, category, host, duration, capacity, credits, open_from, open_to,
       indoor, description, availability_text, lat, lng, location, created_at)
    VALUES
      (@id, @ownerUserId, @name, @category, @host, @duration, @capacity, @credits, @openFrom, @openTo,
       @indoor, @description, @availability, @lat, @lng, @location, @createdAt)
  `).run(values);

  return rowToExperience(db.prepare("SELECT * FROM community_experiences WHERE id = ?").get(id));
}

export function createBookingRequest(user, experience, scheduledTime) {
  if (!experience || experience.type !== "community") throw new HttpError(404, "Community experience not found");
  const time = clean(scheduledTime, 80);
  if (!time) throw new HttpError(400, "Choose a time before sending the request");
  const booking = {
    id: `booking_${randomUUID().replaceAll("-", "").slice(0, 12)}`,
    requesterUserId: user.id,
    experienceId: experience.id,
    scheduledTime: time,
    status: "awaiting_host",
    createdAt: new Date().toISOString(),
  };
  try {
    db.prepare(`
      INSERT INTO booking_requests
        (id, requester_user_id, experience_id, scheduled_time, status, created_at)
      VALUES (@id, @requesterUserId, @experienceId, @scheduledTime, @status, @createdAt)
    `).run(booking);
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") throw new HttpError(409, "You already requested this time");
    throw error;
  }
  return { id: booking.id, experienceId: booking.experienceId, scheduledTime: time, status: booking.status, host: experience.host };
}

function boundedInt(value, fallback, min, max) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function clean(value, max) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

function validTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

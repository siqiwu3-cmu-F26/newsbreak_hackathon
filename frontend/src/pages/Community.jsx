import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import ExperienceCard from "../components/ExperienceCard";
import CommunityMap from "../components/CommunityMap";
import CreditBadge from "../components/CreditBadge";
import { API_BASE_URL } from "../config.js";
import communityExperiences from "../data/communityExperiences";
import useUserLocation from "../hooks/useUserLocation.js";
import { distanceLabel, distanceMiles, hasCoordinates } from "../lib/geo.js";
import "../person5.css";

const categories = ["all", "creative", "food", "outdoors", "relaxing", "culture"];

export default function Community({ onSelectExperience, onOfferSkill }) {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const publishedId = search.get("published");
  const [experiences, setExperiences] = useState(communityExperiences);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [usingFallback, setUsingFallback] = useState(true);
  const userLocation = useUserLocation();

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3500);

    fetch(`${API_BASE_URL}/experiences`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Experiences API unavailable");
        return response.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : data.experiences;
        const communityOnly = (list || [])
          .filter((item) => item.type === "community")
          .map((item) => ({
            ...communityExperiences.find((fallback) => fallback.id === item.id),
            capacity: item.capacity || 4,
            location: item.location || "Palo Alto, CA",
            rating: item.rating || 5,
            reviews: item.reviews || 0,
            tags: item.tags || ["Verified host"],
            accent: item.accent || item.category,
            ...item,
          }))
          .sort((a, b) => Number(b.id === publishedId) - Number(a.id === publishedId));
        if (communityOnly.length) {
          setExperiences(communityOnly);
          setUsingFallback(false);
        }
      })
      .catch(() => setUsingFallback(true))
      .finally(() => window.clearTimeout(timer));

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const visibleExperiences = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return experiences.filter((experience) => {
      const matchesCategory = category === "all" || experience.category === category;
      const searchText = `${experience.name} ${experience.host} ${experience.description} ${experience.location}`.toLowerCase();
      return matchesCategory && (!normalizedQuery || searchText.includes(normalizedQuery));
    });
  }, [category, experiences, query]);

  // Straight-line distance from the user to each experience, shared by the map and the cards.
  const { position: userPosition } = userLocation;
  const experiencesWithDistance = useMemo(
    () => visibleExperiences.map((experience) => ({
      ...experience,
      distanceMiles: hasCoordinates(experience) ? distanceMiles(userPosition, experience) : null,
    })),
    [visibleExperiences, userPosition],
  );

  const selectExperience = (experience) => {
    if (onSelectExperience) {
      onSelectExperience(experience);
      return;
    }
    navigate(`/experiences/${experience.id}`);
  };

  const offerSkill = () => {
    if (onOfferSkill) {
      onOfferSkill();
      return;
    }
    navigate("/offer-skill");
  };

  return (
    <main className="community-page">
      <section className="community-hero">
        <div className="community-hero__content">
          <span className="section-kicker section-kicker--light">Learn nearby. Connect naturally.</span>
          <h1>Your neighborhood knows<br />more than you think.</h1>
          <p>
            Discover small, welcoming experiences hosted by people nearby—from pasta making
            and pottery to photo walks and gardening.
          </p>
          <div className="community-hero__actions">
            <a className="person5-button person5-button--light" href="#experiences">Explore experiences</a>
            <button className="person5-button person5-button--ghost" type="button" onClick={offerSkill}>
              Offer a skill
            </button>
          </div>
        </div>
        <div className="community-hero__credit-card">
          <span className="community-hero__orb">✦</span>
          <small>Community exchange</small>
          <strong>Share an hour.<br />Gain an experience.</strong>
          <CreditBadge credits={1} />
          <p>One hour of hosting earns one Time Credit to spend with another neighbor.</p>
        </div>
      </section>

      <section className="community-section" id="experiences">
        {publishedId && (
          <div className="mb-6 rounded-2xl border border-brand bg-brand-soft p-4 text-brand" role="status">
            <strong>✓ Published to the community.</strong> Your AI-structured experience is live below and is now available to the planning agent.
          </div>
        )}
        <div className="community-section__heading">
          <div>
            <span className="section-kicker">Near Palo Alto</span>
            <h2>Community experiences</h2>
            <p>Real skills, shared in small groups by local hosts.</p>
          </div>
          <label className="community-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search skills or hosts"
              aria-label="Search community experiences"
            />
          </label>
        </div>

        <div className="community-filters" aria-label="Experience categories">
          {categories.map((item) => (
            <button
              key={item}
              className={category === item ? "is-active" : ""}
              type="button"
              onClick={() => setCategory(item)}
            >
              {item === "all" ? "All experiences" : item}
            </button>
          ))}
        </div>

        {usingFallback && (
          <div className="community-demo-note">
            Demo catalog · Live experiences will appear here when the backend connects.
          </div>
        )}

        <CommunityMap experiences={experiencesWithDistance} location={userLocation} onSelect={selectExperience} />

        {visibleExperiences.length ? (
          <div className="experience-grid">
            {experiencesWithDistance.map((experience) => (
              <ExperienceCard
                key={experience.id}
                experience={experience}
                onSelect={selectExperience}
                distanceLabel={distanceLabel(experience.distanceMiles, userLocation.source)}
              />
            ))}
          </div>
        ) : (
          <div className="community-empty">
            <span>⌕</span>
            <h3>No experiences match that search.</h3>
            <p>Try another category or a broader keyword.</p>
          </div>
        )}
      </section>

      <section className="community-cta">
        <div>
          <span className="section-kicker section-kicker--light">Everyone has something to share</span>
          <h2>Turn what you know into a local experience.</h2>
        </div>
        <button className="person5-button person5-button--light" type="button" onClick={offerSkill}>
          Create your experience →
        </button>
      </section>
    </main>
  );
}

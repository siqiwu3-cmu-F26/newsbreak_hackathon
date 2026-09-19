import { Link, NavLink, Route, Routes } from 'react-router';
import Home from './pages/Home.jsx';
import Itinerary from './pages/Itinerary.jsx';
import PagePlaceholder from './components/PagePlaceholder.jsx';

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="border-b border-line bg-white">
        <div className="page-container flex flex-wrap items-center justify-between gap-5 py-5">
          <Link to="/" className="flex items-center gap-3 font-semibold tracking-tight" aria-label="LocalConnect AI home">
            <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-brand text-sm text-white">LC</span>
            <span>LocalConnect <span className="text-brand">AI</span></span>
          </Link>
          <nav aria-label="Main navigation" className="flex flex-wrap gap-1 text-sm">
            <NavLink to="/" end className="nav-link">Plan a day</NavLink>
            <NavLink to="/community" className="nav-link">Community</NavLink>
            <NavLink to="/offer-skill" className="nav-link">Share a skill</NavLink>
          </nav>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="page-container flex-1 py-12 sm:py-20">
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Replace these placeholders with the feature pages as they are implemented. */}
          <Route path="/itinerary" element={<Itinerary />} />
          <Route path="/community" element={<PagePlaceholder eyebrow="Meet your neighbors" title="Community experiences" description="Discover workshops and experiences shared by people in your neighborhood. Coming soon." />} />
          <Route path="/experiences/:experienceId" element={<PagePlaceholder eyebrow="Local experiences" title="Experience details" description="Host information, location, and experience details are coming soon." />} />
          <Route path="/offer-skill" element={<PagePlaceholder eyebrow="Give something back" title="Share what you love" description="A place to share your skills with your community. Coming soon." />} />
          <Route path="*" element={<PagePlaceholder eyebrow="404" title="This page isn't here" description="Head back to start planning a day close to home." />} />
        </Routes>
      </main>
      <footer className="page-container border-t border-line py-6 text-sm text-muted">
        Local people. Shared experiences. A day well spent.
      </footer>
    </div>
  );
}

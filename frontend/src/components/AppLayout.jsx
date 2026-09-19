import { Link, NavLink, Outlet } from 'react-router';

export default function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="border-b border-line bg-white">
        <div className="page-container flex flex-wrap items-center justify-between gap-4 py-4">
          <Link to="/" className="flex min-h-11 items-center gap-3 font-semibold tracking-tight" aria-label="LocalConnect AI home">
            <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-brand text-sm text-white">LC</span>
            <span>LocalConnect <span className="text-brand">AI</span></span>
          </Link>
          <nav aria-label="Main navigation" className="flex w-full flex-wrap gap-1 text-sm sm:w-auto">
            <NavLink to="/" end className="nav-link">Plan a day</NavLink>
            <NavLink to="/itinerary" className="nav-link">My itinerary</NavLink>
            <NavLink to="/community" className="nav-link">Community</NavLink>
            <NavLink to="/offer-skill" className="nav-link">Share a skill</NavLink>
          </nav>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="page-container flex-1 py-12 sm:py-20">
        <Outlet />
      </main>
      <footer className="page-container border-t border-line py-6 text-sm text-muted">
        Local people. Shared experiences. A day well spent.
      </footer>
    </div>
  );
}

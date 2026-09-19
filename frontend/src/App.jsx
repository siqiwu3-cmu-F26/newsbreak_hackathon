import { Route, Routes } from 'react-router';
import AppLayout from './components/AppLayout.jsx';
import Home from './pages/Home.jsx';
import PagePlaceholder from './components/PagePlaceholder.jsx';
import PlanResult from './pages/PlanResult.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Login from './pages/Login.jsx';
import VerifyIdentity from './pages/VerifyIdentity.jsx';
import Wallet from './pages/Wallet.jsx';
import usePlannerSession from './hooks/usePlannerSession.js';

export default function App() {
  const { draft, result, setDraft, setResult } = usePlannerSession();
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/login" element={<Login mode="login" />} />
        <Route path="/signup" element={<Login mode="signup" />} />
        {/* Signed in, but identity may still be unverified. */}
        <Route element={<RequireAuth />}>
          <Route path="/verify" element={<VerifyIdentity />} />
          {/* Everything below needs a signed-in, identity-verified user. */}
          <Route element={<RequireAuth verified />}>
            <Route index element={<Home draft={draft} onDraftChange={setDraft} onPlanReady={setResult} />} />
            {/* Replace these placeholders with the feature pages as they are implemented. */}
            <Route path="/itinerary" element={<PlanResult result={result} />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/community" element={<PagePlaceholder eyebrow="Meet your neighbors" title="Community experiences" description="Discover workshops and experiences shared by people in your neighborhood. Coming soon." />} />
            <Route path="/experiences/:experienceId" element={<PagePlaceholder eyebrow="Local experiences" title="Experience details" description="Host information, location, and experience details are coming soon." />} />
            <Route path="/offer-skill" element={<PagePlaceholder eyebrow="Give something back" title="Share what you love" description="A place to share your skills with your community. Coming soon." />} />
          </Route>
        </Route>
        <Route path="*" element={<PagePlaceholder eyebrow="404" title="This page isn't here" description="Head back to start planning a day close to home." />} />
      </Route>
    </Routes>
  );
}

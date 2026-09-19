import { Route, Routes } from 'react-router';
import AppLayout from './components/AppLayout.jsx';
import Home from './pages/Home.jsx';
import PagePlaceholder from './components/PagePlaceholder.jsx';
import Community from './pages/Community.jsx';
import ExperienceDetail from './pages/ExperienceDetail.jsx';
import OfferSkill from './pages/OfferSkill.jsx';
import PlanResult from './pages/PlanResult.jsx';
import PlanTogether from './pages/PlanTogether.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Login from './pages/Login.jsx';
import Member from './pages/Member.jsx';
import Profile from './pages/Profile.jsx';
import Verify from './pages/Verify.jsx';
import Wallet from './pages/Wallet.jsx';
import usePlannerSession from './hooks/usePlannerSession.js';

export default function App() {
  const { draft, result, setDraft, setResult } = usePlannerSession();
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/login" element={<Login mode="login" />} />
        <Route path="/signup" element={<Login mode="signup" />} />
        {/* Signed in, but identity or address verification may be incomplete. */}
        <Route element={<RequireAuth />}>
          <Route path="/verify" element={<Verify />} />
          {/* Everything below needs a signed-in user whose identity and address are verified. */}
          <Route element={<RequireAuth verified />}>
            <Route index element={<Home draft={draft} onDraftChange={setDraft} onPlanReady={setResult} />} />
            <Route path="/plan-together" element={<PlanTogether onPlanReady={setResult} />} />
            <Route path="/itinerary" element={<PlanResult result={result} onPlanChange={setResult} />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/members/:memberId" element={<Member />} />
            <Route path="/community" element={<Community />} />
            <Route path="/experiences/:experienceId" element={<ExperienceDetail />} />
            <Route path="/offer-skill" element={<OfferSkill />} />
          </Route>
        </Route>
        <Route path="*" element={<PagePlaceholder eyebrow="404" title="This page isn't here" description="Head back to start planning a day close to home." />} />
      </Route>
    </Routes>
  );
}

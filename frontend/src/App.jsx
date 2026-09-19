import { Route, Routes } from 'react-router';
import AppLayout from './components/AppLayout.jsx';
import Home from './pages/Home.jsx';
import PagePlaceholder from './components/PagePlaceholder.jsx';
import Community from './pages/Community.jsx';
import ExperienceDetail from './pages/ExperienceDetail.jsx';
import OfferSkill from './pages/OfferSkill.jsx';
import PlanResult from './pages/PlanResult.jsx';
import PlanTogether from './pages/PlanTogether.jsx';
import usePlannerSession from './hooks/usePlannerSession.js';

export default function App() {
  const { draft, result, setDraft, setResult } = usePlannerSession();
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Home draft={draft} onDraftChange={setDraft} onPlanReady={setResult} />} />
        <Route path="/plan-together" element={<PlanTogether onPlanReady={setResult} />} />
        <Route path="/itinerary" element={<PlanResult result={result} onPlanChange={setResult} />} />
        <Route path="/community" element={<Community />} />
        <Route path="/experiences/:experienceId" element={<ExperienceDetail />} />
        <Route path="/offer-skill" element={<OfferSkill />} />
        <Route path="*" element={<PagePlaceholder eyebrow="404" title="This page isn't here" description="Head back to start planning a day close to home." />} />
      </Route>
    </Routes>
  );
}

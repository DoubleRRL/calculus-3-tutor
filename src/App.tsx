import { HashRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppProvider } from "@/state/AppContext";
import { AppShell } from "@/components/shell/AppShell";
import { PathPage } from "@/pages/Path";
import { SkillSheetPage } from "@/pages/SkillSheet";
import { ExamPage } from "@/pages/Exam";
import { SettingsPage } from "@/pages/Settings";
import { SessionPage } from "@/session/SessionPage";
import { useApp } from "@/state/AppContext";
import { resumeSkill } from "@/lib/store";
import { LayoutGroup } from "@/lib/motion";

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <LayoutGroup>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<PathPage />} />
            <Route path="path" element={<Navigate to="/" replace />} />
            <Route path="skill/:skillId" element={<SkillSheetPage />} />
            <Route path="exam" element={<ExamPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="map" element={<Navigate to="/" replace />} />
            <Route path="learn/:skillId" element={<LearnRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          <Route path="s/skill/:skillId" element={<SessionPage />} />
          <Route path="s/today" element={<ResumeRedirect />} />
          <Route path="s/review" element={<ResumeRedirect />} />
          <Route path="s/:mode" element={<SessionPage />} />
        </Routes>
        </LayoutGroup>
      </HashRouter>
    </AppProvider>
  );
}

function LearnRedirect() {
  const { skillId } = useParams();
  if (!skillId) return <Navigate to="/" replace />;
  return <Navigate to={`/s/skill/${skillId}`} replace />;
}

/** Old Today/review quiz entry → continue the course instead. */
function ResumeRedirect() {
  const { state } = useApp();
  const skill = resumeSkill(state);
  if (!skill) return <Navigate to="/" replace />;
  return <Navigate to={`/s/skill/${skill.id}`} replace />;
}

import { HashRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppProvider } from "@/state/AppContext";
import { CourseProvider } from "@/state/CourseContext";
import { AppShell } from "@/components/shell/AppShell";
import { PanelViewportSync } from "@/components/PanelFrame";
import { CockpitPage } from "@/pages/Cockpit";
import { TopicSheetPage } from "@/pages/TopicSheet";
import { ChapterPage } from "@/pages/Chapter";
import { ExercisePage } from "@/pages/Exercise";
import { CourseSetupPage } from "@/pages/CourseSetup";
import { PathPage } from "@/pages/Path";
import { PersonalizerPage } from "@/pages/Personalizer";
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
      <CourseProvider>
        <HashRouter>
          <PanelViewportSync />
          <LayoutGroup>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<CockpitPage />} />
                <Route path="chapter/:number" element={<ChapterPage />} />
                <Route path="topic/:topicId" element={<TopicSheetPage />} />
                <Route
                  path="topic/:topicId/exercise/:number"
                  element={<ExercisePage />}
                />
                <Route path="setup" element={<CourseSetupPage />} />
                <Route path="map" element={<Navigate to="/" replace />} />
                <Route path="path" element={<Navigate to="/legacy" replace />} />
                <Route path="legacy" element={<PathPage />} />
                <Route path="personalize" element={<PersonalizerPage />} />
                <Route path="skill/:skillId" element={<SkillSheetPage />} />
                <Route path="exam" element={<ExamPage />} />
                <Route path="settings" element={<SettingsPage />} />
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
      </CourseProvider>
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

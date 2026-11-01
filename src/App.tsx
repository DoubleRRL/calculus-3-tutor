import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "@/state/AppContext";
import { CourseProvider } from "@/state/CourseContext";
import { AppShell } from "@/components/shell/AppShell";
import { CockpitPage } from "@/pages/Cockpit";
import { TopicSheetPage } from "@/pages/TopicSheet";
import { ChapterPage } from "@/pages/Chapter";
import { ExercisePage } from "@/pages/Exercise";
import { CourseSetupPage } from "@/pages/CourseSetup";
import { SettingsPage } from "@/pages/Settings";
import { LayoutGroup } from "@/lib/motion";

export default function App() {
  return (
    <AppProvider>
      <CourseProvider>
        <HashRouter>
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
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </LayoutGroup>
        </HashRouter>
      </CourseProvider>
    </AppProvider>
  );
}

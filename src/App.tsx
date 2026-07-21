import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "@/state/AppContext";
import { Layout } from "@/components/Layout";
import { HomePage } from "@/pages/Home";
import { MapPage } from "@/pages/Map";
import { ExamPage } from "@/pages/Exam";
import { SettingsPage } from "@/pages/Settings";
import { LessonPage } from "@/pages/Lesson";

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="learn/:skillId" element={<LessonPage />} />
            <Route path="exam" element={<ExamPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}

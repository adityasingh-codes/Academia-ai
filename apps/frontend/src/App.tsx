import { useState } from "react";

import StudentDashboard from "./components/dashboard/StudentDashboard";
import KnowledgeGraphVisualizer from "./components/analytics/KnowledgeGraphVisualizer";
import RootCauseDashboard from "./components/analytics/RootCauseDashboard";
import SpacedRepetitionScheduler from "./components/analytics/SpacedRepetitionScheduler";
import VelocityTracking from "./components/analytics/VelocityTracking";
import MistakeLibraryCalibration from "./components/management/MistakeLibraryCalibration";
import SystemSettingsLogs from "./components/management/SystemSettingsLogs";
import TimeAwarePlanner from "./components/management/TimeAwarePlanner";
import InteractiveAssessment from "./components/practice/InteractiveAssessment";
import MockExamArena from "./components/practice/MockExamArena";
import SocraticTutorWorkspace from "./components/practice/SocraticTutorWorkspace";
import { SidebarDrawer } from "./components/navigation/SidebarDrawer";

const views = {
  dashboard: StudentDashboard,
  assessment: InteractiveAssessment,
  tutor: SocraticTutorWorkspace,
  "mock-exam": MockExamArena,
  "root-cause": RootCauseDashboard,
  "knowledge-graph": KnowledgeGraphVisualizer,
  velocity: VelocityTracking,
  "spaced-repetition": SpacedRepetitionScheduler,
  planner: TimeAwarePlanner,
  mistakes: MistakeLibraryCalibration,
  settings: SystemSettingsLogs,
} as const;

export function App() {
  const [activeTab, setActiveTab] = useState<keyof typeof views>("dashboard");
  const ActiveView = views[activeTab] ?? StudentDashboard;

  return <div className="flex min-h-screen bg-[#080c14]">
    <SidebarDrawer activeTab={activeTab} onNavigate={(tab) => { if (tab in views) setActiveTab(tab as keyof typeof views); }} />
    <ActiveView />
  </div>;
}

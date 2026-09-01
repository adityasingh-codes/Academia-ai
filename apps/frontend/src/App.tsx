import { useState } from "react";

import { DailySessionModal } from "../components/features/DailySessionModal";
import { SyllabusRoadmap } from "../components/features/SyllabusRoadmap";
import { TopicNodePath } from "../components/features/TopicNodePath";
import { TopBar } from "../components/navigation/TopBar";
import type { ChapterNode } from "../types/roadmap";
import type { TopicNode } from "../types/topic_path";

const subjects = [{ id: "mathematics", title: "Class 12th Mathematics", overallMasteryPct: 58 }];
const chapters: ChapterNode[] = [
  { id: "relations", chapterNumber: 1, title: "Relations and Functions", totalTopics: 10, masteredTopics: 7, hasRevisionCue: false, isCurrentActive: false, masteryPct: 70 },
  { id: "calculus", chapterNumber: 2, title: "Differentiation", totalTopics: 8, masteredTopics: 4, hasRevisionCue: true, isCurrentActive: true, masteryPct: 48 },
  { id: "integration", chapterNumber: 3, title: "Integrals", totalTopics: 12, masteredTopics: 3, hasRevisionCue: false, isCurrentActive: false, masteryPct: 32 },
];
const topics: TopicNode[] = [
  { id: "limits", title: "Limits and Continuity", state: "MASTERED", sequenceOrder: 1, subtopicCount: 4, lastRevisedText: "Revised 2d ago" },
  { id: "chain-rule", title: "Chain Rule", state: "REVISION_CUE", sequenceOrder: 2, subtopicCount: 3, gapPercentage: 27 },
  { id: "implicit", title: "Implicit Differentiation", state: "ACTIVE", sequenceOrder: 3, subtopicCount: 3, lastRevisedText: "Current focus" },
  { id: "applications", title: "Applications of Derivatives", state: "PENDING", sequenceOrder: 4, subtopicCount: 5 },
];

export function App() {
  const [activeChapterId, setActiveChapterId] = useState<string>();
  const [showTopics, setShowTopics] = useState(false);
  const [showSession, setShowSession] = useState(false);

  return <div className="min-h-screen bg-muted/40">
    <TopBar subjects={subjects} activeSubjectId="mathematics" onSelectSubject={() => undefined} onAddNewSubject={() => undefined} streakDays={5} userEmail="student@example.com" />
    {showTopics ? <TopicNodePath chapterTitle="Chapter 2: Differentiation" topics={topics} onBackToRoadmap={() => setShowTopics(false)} onSelectTopicNode={() => setShowSession(true)} /> : <SyllabusRoadmap chapters={chapters} subjectTitle="Class 12th Mathematics" activeChapterId={activeChapterId} onSelectChapter={(id) => { setActiveChapterId(id); setShowTopics(true); }} onUploadNewPDF={() => undefined} />}
    <DailySessionModal isOpen={showSession} onClose={() => setShowSession(false)} availableTopics={topics.map(({ id, title }) => ({ id, title }))} onSubmitSession={async () => undefined} />
  </div>;
}

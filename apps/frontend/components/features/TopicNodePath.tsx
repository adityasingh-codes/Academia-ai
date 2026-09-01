"use client";

import { AlertTriangle, ArrowLeft, Check, Circle, Target } from "lucide-react";
import type { NodeState, TopicNode, TopicNodePathProps } from "../../types/topic_path";

const nodeStyles: Record<NodeState, string> = {
  MASTERED: "bg-emerald-500/10 text-emerald-500 border-emerald-500 hover:bg-emerald-500/20",
  ACTIVE: "bg-primary/10 text-primary border-primary ring-4 ring-primary/20 hover:bg-primary/20",
  REVISION_CUE: "bg-amber-500/10 text-amber-500 border-amber-500 animate-pulse hover:bg-amber-500/20",
  PENDING: "bg-muted text-muted-foreground border-border hover:border-foreground/50",
};

function StateIcon({ state }: { state: NodeState }) {
  if (state === "MASTERED") return <Check className="size-7 stroke-[3]" />;
  if (state === "ACTIVE") return <Target className="size-6" />;
  if (state === "REVISION_CUE") return <AlertTriangle className="size-6" />;
  return <Circle className="size-6" />;
}

function TopicNodeCard({ topic, index, onSelect }: { topic: TopicNode; index: number; onSelect: () => void }) {
  const metric = topic.state === "REVISION_CUE" && topic.gapPercentage !== undefined ? `Gap Detected: ${topic.gapPercentage}%` : topic.lastRevisedText ?? (topic.state === "PENDING" ? "Not started" : "Learning record available");
  const offset = index % 3 === 0 ? "md:-translate-x-20" : index % 3 === 2 ? "md:translate-x-20" : "";

  return <div className={`relative flex w-full max-w-md items-center gap-4 transition-transform duration-200 ${offset}`}>
    <button type="button" onClick={onSelect} aria-label={`Open ${topic.title}, ${topic.state.replace("_", " ")}`} className={`flex size-16 shrink-0 items-center justify-center rounded-full border-2 shadow-sm transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 ${nodeStyles[topic.state]}`}>
      <StateIcon state={topic.state} />
    </button>
    <button type="button" onClick={onSelect} className="min-w-0 flex-1 rounded-lg border border-border bg-card px-4 py-3 text-left shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="flex items-start justify-between gap-3"><h3 className="truncate text-sm font-semibold text-card-foreground">{topic.title}</h3><span className="shrink-0 text-xs text-muted-foreground">{topic.subtopicCount} subtopics</span></div>
      <p className={`mt-1 truncate text-xs ${topic.state === "REVISION_CUE" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>{metric}</p>
    </button>
  </div>;
}

export function TopicNodePath({ chapterTitle, topics, onBackToRoadmap, onSelectTopicNode }: TopicNodePathProps) {
  const sortedTopics = [...topics].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const mastered = topics.filter((topic) => topic.state === "MASTERED").length;
  const active = topics.filter((topic) => topic.state === "ACTIVE").length;
  const revision = topics.filter((topic) => topic.state === "REVISION_CUE").length;

  return <section className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
    <button type="button" onClick={onBackToRoadmap} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="size-4" />Back to Syllabus</button>
    <header className="mt-5 border-b border-border pb-5"><h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{chapterTitle}</h1><p className="mt-2 text-sm text-muted-foreground">{topics.length} Topics Total · {mastered} Mastered · {active} Active · {revision} Revision Needed</p></header>
    <div className="flex flex-col items-center gap-0 py-8">
      {sortedTopics.map((topic, index) => <div key={topic.id} className="flex w-full flex-col items-center"><TopicNodeCard topic={topic} index={index} onSelect={() => onSelectTopicNode(topic.id, topic.state)} />{index < sortedTopics.length - 1 && <span aria-hidden="true" className="my-3 h-10 w-px bg-border" />}</div>)}
    </div>
  </section>;
}

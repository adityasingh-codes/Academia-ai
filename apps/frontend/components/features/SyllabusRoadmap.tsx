"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, Grid2X2, Map, Upload } from "lucide-react";
import type { ChapterNode, SyllabusRoadmapProps } from "../../types/roadmap";

type View = "grid" | "roadmap";

function ChapterCard({ chapter, active, onSelect }: { chapter: ChapterNode; active: boolean; onSelect: () => void }) {
  const revisionCount = chapter.hasRevisionCue ? 1 : 0;
  return <article className={`rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${active ? "border-primary ring-1 ring-primary/25" : "border-border"}`}>
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chapter {chapter.chapterNumber}</p><h3 className="mt-1 text-base font-semibold leading-snug text-card-foreground">{chapter.title}</h3></div>{chapter.isCurrentActive ? <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">Current Focus</span> : chapter.hasRevisionCue ? <AlertTriangle className="size-5 shrink-0 text-amber-500" aria-label="Revision cue" /> : null}</div>
    <p className="mt-4 text-sm text-muted-foreground">{chapter.totalTopics} Topics · {chapter.masteredTopics} Mastered{revisionCount ? ` · ${revisionCount} Revision Cue` : ""}</p>
    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${Math.min(100, Math.max(0, chapter.masteryPct))}%` }} /></div>
    <div className="mt-2 text-right text-xs tabular-nums text-muted-foreground">{Math.round(chapter.masteryPct)}% mastery</div>
    <button type="button" onClick={onSelect} className="mt-5 inline-flex w-full items-center justify-center gap-1 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Open Chapter Path <ChevronRight className="size-4" /></button>
  </article>;
}

function RoadmapNode({ chapter, active, isLast, onSelect }: { chapter: ChapterNode; active: boolean; isLast: boolean; onSelect: () => void }) {
  const state = chapter.isCurrentActive ? "border-primary bg-primary/[0.04] shadow-[0_0_24px_hsl(var(--primary)/0.14)]" : chapter.hasRevisionCue ? "border-amber-500/60" : "border-border hover:border-primary/50";
  return <div className="relative flex gap-4 pb-8 last:pb-0 sm:gap-6">
    <div className="relative flex w-11 shrink-0 justify-center"><button type="button" onClick={onSelect} aria-label={`Open Chapter ${chapter.chapterNumber}: ${chapter.title}`} className={`grid size-11 place-items-center rounded-full border-2 bg-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${active ? "border-primary text-primary" : chapter.hasRevisionCue ? "border-amber-500 text-amber-600" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}>{chapter.masteryPct >= 100 ? <CheckCircle2 className="size-5" /> : <span className="text-sm font-bold">{chapter.chapterNumber}</span>}</button>{!isLast && <span aria-hidden="true" className="absolute top-11 bottom-0 w-px bg-border" />}</div>
    <button type="button" onClick={onSelect} className={`min-w-0 flex-1 rounded-xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${state}`}>
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-muted-foreground">Chapter {chapter.chapterNumber}</p><h3 className="mt-0.5 font-semibold text-foreground">{chapter.title}</h3></div>{chapter.isCurrentActive && <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">Current Focus</span>}{!chapter.isCurrentActive && chapter.hasRevisionCue && <AlertTriangle className="size-4 shrink-0 text-amber-500" aria-label="Revision cue" />}</div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{chapter.masteredTopics}/{chapter.totalTopics} topics mastered</span><span className="tabular-nums">{Math.round(chapter.masteryPct)}%</span></div>
    </button>
  </div>;
}

export function SyllabusRoadmap({ chapters, subjectTitle = "Current Subject", activeChapterId, onSelectChapter, onUploadNewPDF }: SyllabusRoadmapProps) {
  const [view, setView] = useState<View>("grid");
  const overallMastery = useMemo(() => chapters.length ? chapters.reduce((total, chapter) => total + chapter.masteryPct, 0) / chapters.length : 0, [chapters]);

  return <section className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-muted-foreground">Subject Hub</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{subjectTitle}</h1><div className="mt-4 flex items-center gap-3"><div className="h-2 w-44 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${overallMastery}%` }} /></div><span className="text-sm font-medium tabular-nums text-muted-foreground">{Math.round(overallMastery)}% overall mastery</span></div></div><div className="flex items-center gap-2"><div className="inline-flex rounded-md border border-border bg-card p-1" aria-label="Roadmap view selector"><button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")} className={`inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm transition-colors ${view === "grid" ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}><Grid2X2 className="size-4" />Grid</button><button type="button" aria-pressed={view === "roadmap"} onClick={() => setView("roadmap")} className={`inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm transition-colors ${view === "roadmap" ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}><Map className="size-4" />Roadmap</button></div>{onUploadNewPDF && <button type="button" onClick={onUploadNewPDF} className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"><Upload className="size-4" /><span className="hidden sm:inline">Upload PDF</span></button>}</div></div>
    {chapters.length === 0 ? <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">Upload a syllabus PDF to generate your roadmap.</div> : view === "grid" ? <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">{chapters.map((chapter) => <ChapterCard key={chapter.id} chapter={chapter} active={chapter.id === activeChapterId} onSelect={() => onSelectChapter(chapter.id)} />)}</div> : <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-5 sm:p-7">{chapters.map((chapter, index) => <RoadmapNode key={chapter.id} chapter={chapter} active={chapter.id === activeChapterId} isLast={index === chapters.length - 1} onSelect={() => onSelectChapter(chapter.id)} />)}</div>}
  </section>;
}

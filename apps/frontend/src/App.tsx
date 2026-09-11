import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, BookOpen, CornerDownLeft, Search, X } from "lucide-react";

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

const viewAccents: Record<keyof typeof views, "indigo" | "emerald" | "amber" | "rose" | "cyan"> = {
  dashboard: "indigo", assessment: "indigo", tutor: "cyan", "mock-exam": "amber",
  "root-cause": "rose", "knowledge-graph": "cyan", velocity: "emerald",
  "spaced-repetition": "amber", planner: "indigo", mistakes: "rose", settings: "cyan",
};

const ambientGlow: Record<"indigo" | "emerald" | "amber" | "rose" | "cyan", string> = {
  indigo: "from-indigo-500/35 via-indigo-500/10 to-transparent dark:from-indigo-500/40 dark:via-indigo-500/10 dark:to-transparent",
  emerald: "from-emerald-500/35 via-emerald-500/10 to-transparent dark:from-emerald-500/40 dark:via-emerald-500/10 dark:to-transparent",
  amber: "from-amber-500/35 via-amber-500/10 to-transparent dark:from-amber-500/40 dark:via-amber-500/10 dark:to-transparent",
  rose: "from-rose-500/35 via-rose-500/10 to-transparent dark:from-rose-500/40 dark:via-rose-500/10 dark:to-transparent",
  cyan: "from-cyan-500/35 via-cyan-500/10 to-transparent dark:from-cyan-500/40 dark:via-cyan-500/10 dark:to-transparent",
};

type SearchResult = { id: string; label: string; category: "App Features & Pages" | "Subjects & Chapters"; tab?: keyof typeof views; detail?: string };

const featureResults: SearchResult[] = [
  { id: "dashboard", label: "Dashboard", category: "App Features & Pages", tab: "dashboard" },
  { id: "assessment", label: "Interactive Assessment", category: "App Features & Pages", tab: "assessment" },
  { id: "tutor", label: "Socratic Tutor", category: "App Features & Pages", tab: "tutor" },
  { id: "mock-exam", label: "Mock Exam Arena", category: "App Features & Pages", tab: "mock-exam" },
  { id: "root-cause", label: "Root Cause Analysis", category: "App Features & Pages", tab: "root-cause" },
  { id: "knowledge-graph", label: "Knowledge Graph", category: "App Features & Pages", tab: "knowledge-graph" },
  { id: "settings", label: "Settings & Logs", category: "App Features & Pages", tab: "settings" },
];

function CommandPalette({ onClose, onNavigate }: { onClose: () => void; onNavigate: (tab: keyof typeof views) => void }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [subjects, setSubjects] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const controller = new AbortController();
    fetch("/api/v1/subjects", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : [])
      .then((data: unknown) => {
        const records = Array.isArray(data) ? data : [];
        const results: SearchResult[] = [];
        records.forEach((record, subjectIndex) => {
          if (!record || typeof record !== "object") return;
          const subject = record as Record<string, unknown>;
          const subjectId = String(subject.id ?? `subject-${subjectIndex}`);
          const subjectTitle = String(subject.title ?? subject.name ?? "Untitled subject");
          results.push({ id: subjectId, label: subjectTitle, category: "Subjects & Chapters", detail: "Subject" });
          const nested = [subject.chapters, subject.nodes, subject.syllabus_nodes].find(Array.isArray) as unknown[] | undefined;
          nested?.forEach((child, childIndex) => {
            if (!child || typeof child !== "object") return;
            const node = child as Record<string, unknown>;
            results.push({ id: String(node.id ?? `${subjectId}-node-${childIndex}`), label: String(node.title ?? node.name ?? "Untitled chapter"), category: "Subjects & Chapters", detail: subjectTitle });
          });
        });
        setSubjects(results);
      })
      .catch(() => setSubjects([]));
    return () => controller.abort();
  }, []);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const allResults = [...featureResults, ...subjects];
    return normalizedQuery ? allResults.filter((result) => `${result.label} ${result.detail ?? ""}`.toLowerCase().includes(normalizedQuery)) : allResults;
  }, [query, subjects]);

  useEffect(() => setSelectedIndex((index) => Math.min(index, Math.max(results.length - 1, 0))), [results.length]);

  const selectResult = (result: SearchResult | undefined) => {
    if (!result) return;
    if (result.tab) onNavigate(result.tab);
    onClose();
  };

  return <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-20 backdrop-blur-sm" onMouseDown={onClose}>
    <div className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-400/20 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/50" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800"><Search className="h-5 w-5 text-slate-500 dark:text-slate-400" /><input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setSelectedIndex(0); }} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setSelectedIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0))); } else if (event.key === "ArrowUp") { event.preventDefault(); setSelectedIndex((index) => Math.max(index - 1, 0)); } else if (event.key === "Enter") { event.preventDefault(); selectResult(results[selectedIndex]); } else if (event.key === "Escape") onClose(); }} placeholder="Search features, subjects, and chapters..." className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500 dark:text-slate-100 dark:placeholder:text-slate-600" /><kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 dark:border-slate-700 sm:inline">ESC</kbd><button type="button" onClick={onClose} aria-label="Close search" className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-200"><X className="h-4 w-4" /></button></div>
      <div className="max-h-[min(28rem,60vh)] overflow-y-auto p-2">{results.length === 0 ? <p className="px-3 py-10 text-center text-sm text-slate-500">No matching results</p> : (["App Features & Pages", "Subjects & Chapters"] as const).map((category) => { const categoryResults = results.filter((result) => result.category === category); if (!categoryResults.length) return null; return <section key={category}><h2 className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400">{category}</h2>{categoryResults.map((result) => { const index = results.indexOf(result); return <button key={result.id} type="button" onClick={() => selectResult(result)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${index === selectedIndex ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"}`}><BookOpen className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" /><span className="min-w-0 flex-1 truncate text-sm">{result.label}<span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{result.detail}</span></span>{index === selectedIndex && <CornerDownLeft className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />}</button>; })}</section>; })}</div>
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-[10px] text-slate-500 dark:border-slate-800 dark:text-slate-500"><span>Navigate <ArrowUp className="mx-0.5 inline h-3 w-3" /><ArrowDown className="mx-0.5 inline h-3 w-3" /> Select <CornerDownLeft className="mx-0.5 inline h-3 w-3" /></span><span>Academia.ai search</span></div>
    </div>
  </div>;
}

export function App() {
  const [activeTab, setActiveTab] = useState<keyof typeof views>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => window.localStorage.getItem("theme") !== "light");
  const ActiveView = views[activeTab] ?? StudentDashboard;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    window.localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const currentAccent = viewAccents[activeTab] ?? "indigo";

  return <div className="relative flex min-h-screen w-full overflow-hidden bg-[#F1F5F9] transition-colors duration-500 ease-in-out dark:bg-[#0b0c10]">
    <div className={`pointer-events-none absolute -top-32 -left-32 h-[650px] w-[650px] bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] ${ambientGlow[currentAccent]} blur-3xl transition-all duration-700 z-0`} />
    <SidebarDrawer activeTab={activeTab} accent={currentAccent} collapsed={sidebarCollapsed} darkMode={darkMode} onToggle={() => setSidebarCollapsed((collapsed) => !collapsed)} onSearch={() => setSearchOpen(true)} onThemeToggle={() => setDarkMode((enabled) => !enabled)} onNavigate={(tab) => { if (tab in views) setActiveTab(tab as keyof typeof views); }} />
    <div className="relative z-10 min-w-0 flex-1 transition-all duration-300 ease-in-out"><ActiveView /></div>
    {searchOpen && <CommandPalette onClose={() => setSearchOpen(false)} onNavigate={setActiveTab} />}
  </div>;
}
